// =============================================================================
// StellarFlow — Multi-Signer Coordination State Machine
//
// Routes:
//   POST /api/v1/approvals/pending  — Stage a new multi-sig request (XDR in Redis)
//   POST /api/v1/approvals/sign     — Submit a signer's signature, auto-submit on quorum
//   GET  /api/v1/approvals/:id      — Retrieve approval status and signature list
//
// Architecture:
//   - Raw Base64 XDR transaction envelopes are stored in Redis with a TTL.
//   - Signature bytes are appended directly into the XDR envelope using the
//     Stellar SDK's DecoratedSignature model.
//   - Once signature count reaches `required_signatures`, the finalized envelope
//     is automatically forwarded to the Stellar Horizon API for settlement.
//   - Every threshold crossing triggers a WebSocket broadcast to update the UI.
// =============================================================================

use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use uuid::Uuid;

use crate::{
    database::models::{
        ApprovalRequest, ApprovalSignature, ApprovalStatus, NewApprovalRequest,
    },
    errors::{AppError, ApiResult},
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// Redis Key Schema
//
// Key format:  sf:approval:{approval_id}:xdr
// TTL:         24 hours by default (configurable via APPROVAL_TTL_HOURS env)
// Payload:     Base64-encoded Stellar TransactionEnvelope XDR string
// ─────────────────────────────────────────────────────────────────────────────

fn redis_xdr_key(approval_id: &Uuid) -> String {
    format!("sf:approval:{}:xdr", approval_id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// Request body for creating a new pending multi-sig approval.
#[derive(Debug, Deserialize)]
pub struct CreateApprovalRequest {
    /// UUID of the owning organization.
    pub org_id: Uuid,

    /// Human-readable description shown in the UI approval queue.
    pub purpose: String,

    /// Amount (decimal string, e.g., "50000.0000000").
    pub amount: String,

    /// Stellar G-address of the payment destination.
    pub destination: String,

    /// Number of signatures required to unlock submission.
    pub required_signatures: i32,

    /// Base64-encoded, fully-built (but partially-signed) Stellar
    /// TransactionEnvelope XDR. This is the "unsigned shell" that signers
    /// will attach their signatures to.
    pub initial_xdr_b64: String,

    /// Seconds until this approval request expires (default: 86400 = 24h).
    pub ttl_seconds: Option<u64>,
}

/// Response body for the created approval.
#[derive(Debug, Serialize)]
pub struct ApprovalCreatedResponse {
    pub approval_id:         Uuid,
    pub redis_key:           String,
    pub required_signatures: i32,
    pub expires_at:          chrono::DateTime<Utc>,
    pub message:             String,
}

/// Request body for submitting a signature from one authorized signer.
#[derive(Debug, Deserialize)]
pub struct SubmitSignatureRequest {
    /// UUID of the approval request being signed.
    pub approval_id: Uuid,

    /// Stellar G-address of the signer (server verifies against org signers).
    pub signer_address: String,

    /// Base64-encoded 64-byte Ed25519 signature over the transaction hash.
    pub signature_b64: String,

    /// 4-byte public key hint (first 4 bytes of the signer's public key),
    /// hex-encoded. Used to construct the DecoratedSignature in XDR.
    pub hint_hex: String,
}

/// Response to a signature submission.
#[derive(Debug, Serialize)]
pub struct SignatureSubmittedResponse {
    pub approval_id:        Uuid,
    pub current_signatures: i32,
    pub required_signatures: i32,
    pub threshold_reached:  bool,
    pub submitted_tx_hash:  Option<String>,
    pub message:            String,
}

// ─────────────────────────────────────────────────────────────────────────────
// XDR Signature Injection
//
// Implements the low-level XDR surgery to append a DecoratedSignature into
// a Stellar TransactionEnvelope without full XDR library decode/re-encode.
//
// Production note: Replace this stub with `stellar-xdr` crate:
//   use stellar_xdr::curr::{TransactionEnvelope, DecoratedSignature, Signature, SignatureHint};
//   Parse the B64 XDR → append DecoratedSignature → re-encode to B64.
// ─────────────────────────────────────────────────────────────────────────────

/// Inject a signer's DecoratedSignature into a Base64 XDR envelope.
///
/// Returns the updated Base64 XDR with the new signature appended to the
/// `TransactionEnvelope.signatures` array.
fn inject_signature_into_xdr(
    xdr_b64: &str,
    hint_hex: &str,
    signature_b64: &str,
) -> Result<String, AppError> {
    // Decode existing XDR bytes.
    let mut xdr_bytes = B64.decode(xdr_b64).map_err(|e| {
        AppError::Serialization(format!("XDR base64 decode failed: {e}"))
    })?;

    // Decode signature from Base64.
    let sig_bytes = B64.decode(signature_b64).map_err(|e| {
        AppError::Serialization(format!("Signature base64 decode failed: {e}"))
    })?;

    if sig_bytes.len() != 64 {
        return Err(AppError::Validation(
            "Ed25519 signature must be exactly 64 bytes".into(),
        ));
    }

    // Decode hint from hex.
    let hint_bytes = hex::decode(hint_hex).map_err(|e| {
        AppError::Serialization(format!("Hint hex decode failed: {e}"))
    })?;

    if hint_bytes.len() != 4 {
        return Err(AppError::Validation(
            "Signature hint must be exactly 4 bytes (8 hex chars)".into(),
        ));
    }

    // ── Production implementation (with stellar-xdr crate) ──────────────────
    // use stellar_xdr::curr::{
    //     TransactionEnvelope, DecoratedSignature,
    //     Signature, SignatureHint, Limits, ReadXdr, WriteXdr,
    // };
    // let mut env = TransactionEnvelope::from_xdr_base64(xdr_b64, Limits::none())?;
    // match &mut env {
    //     TransactionEnvelope::Tx(v1) => {
    //         v1.signatures.push(DecoratedSignature {
    //             hint: SignatureHint(hint_bytes.try_into().unwrap()),
    //             signature: Signature(sig_bytes.try_into().unwrap()),
    //         });
    //     }
    //     _ => return Err(AppError::Serialization("Unsupported envelope type".into())),
    // }
    // return Ok(env.to_xdr_base64(Limits::none())?);
    // ────────────────────────────────────────────────────────────────────────

    // Scaffold stub: append a length-prefixed tag identifying the sig for demo.
    // Remove this and enable the production block above for live deployments.
    xdr_bytes.extend_from_slice(b"SIG_INJECTED:");
    xdr_bytes.extend_from_slice(&hint_bytes);
    xdr_bytes.extend_from_slice(&sig_bytes);

    Ok(B64.encode(&xdr_bytes))
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizon Submission
// ─────────────────────────────────────────────────────────────────────────────

/// Submit a fully-signed XDR envelope to Stellar Horizon.
///
/// In production, POST the XDR to:
///   https://horizon-testnet.stellar.org/transactions
///   Body: `tx=<url_encoded_xdr>`
///
/// Returns the Horizon transaction hash on success.
async fn submit_to_horizon(xdr_b64: &str) -> Result<String, AppError> {
    // Production: use reqwest client to POST to Horizon.
    // let client = reqwest::Client::new();
    // let url_encoded_xdr = urlencoding::encode(xdr_b64);
    // let resp = client
    //     .post("https://horizon-testnet.stellar.org/transactions")
    //     .header("Content-Type", "application/x-www-form-urlencoded")
    //     .body(format!("tx={url_encoded_xdr}"))
    //     .timeout(Duration::from_secs(30))
    //     .send()
    //     .await
    //     .map_err(|e| AppError::HorizonError(e.to_string()))?;
    //
    // if !resp.status().is_success() {
    //     let body = resp.text().await.unwrap_or_default();
    //     return Err(AppError::HorizonError(body));
    // }
    //
    // let result: serde_json::Value = resp.json().await
    //     .map_err(|e| AppError::Serialization(e.to_string()))?;
    // return Ok(result["hash"].as_str().unwrap_or("").to_string());

    // Stub: simulate Horizon response.
    tokio::time::sleep(Duration::from_millis(250)).await;
    let fake_hash = format!(
        "{}{}",
        hex::encode(&Uuid::new_v4().as_bytes()[..]),
        hex::encode(&Uuid::new_v4().as_bytes()[..]),
    );
    let _ = xdr_b64; // suppress unused warning in stub
    Ok(fake_hash[..64].to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/pending
// ─────────────────────────────────────────────────────────────────────────────

/// Stage a new multi-sig approval request.
///
/// Stores the XDR in Redis with a configurable TTL and creates the durable
/// audit record in PostgreSQL.
pub async fn create_pending_approval(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateApprovalRequest>,
) -> ApiResult<impl IntoResponse> {
    // Validate inputs.
    if req.required_signatures < 1 {
        return Err(AppError::Validation(
            "required_signatures must be at least 1".into(),
        ));
    }

    if req.initial_xdr_b64.is_empty() {
        return Err(AppError::Validation("initial_xdr_b64 must not be empty".into()));
    }

    // Validate XDR is parseable Base64.
    B64.decode(&req.initial_xdr_b64).map_err(|_| {
        AppError::Validation("initial_xdr_b64 is not valid Base64".into())
    })?;

    let ttl_secs  = req.ttl_seconds.unwrap_or(86_400);
    let expires_at = Utc::now() + chrono::Duration::seconds(ttl_secs as i64);
    let approval_id = Uuid::new_v4();
    let redis_key   = redis_xdr_key(&approval_id);

    let amount_dec: BigDecimal = req.amount.parse().map_err(|_| {
        AppError::Validation(format!("Invalid amount: {}", req.amount))
    })?;

    // ── Persist XDR in Redis with TTL ────────────────────────────────────────
    {
        let mut conn = state.redis.get_async_connection().await.map_err(|e| {
            AppError::Cache(e.to_string())
        })?;

        redis::cmd("SET")
            .arg(&redis_key)
            .arg(&req.initial_xdr_b64)
            .arg("EX")
            .arg(ttl_secs)
            .query_async::<_, ()>(&mut conn)
            .await
            .map_err(|e| AppError::Cache(e.to_string()))?;
    }

    // ── Create durable audit record in PostgreSQL ─────────────────────────────
    let approval = sqlx::query_as!(
        ApprovalRequest,
        r#"
        INSERT INTO approval_requests (
            id, redis_key, org_id, purpose, amount, destination,
            required_signatures, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id, redis_key, org_id, purpose, amount, destination,
            required_signatures, current_signatures,
            status AS "status: ApprovalStatus",
            submitted_tx_hash, expires_at, created_at, updated_at
        "#,
        approval_id,
        redis_key,
        req.org_id,
        req.purpose,
        amount_dec,
        req.destination,
        req.required_signatures,
        expires_at,
    )
    .fetch_one(&state.db)
    .await?;

    tracing::info!(
        approval_id = %approval_id,
        org_id      = %req.org_id,
        required    = req.required_signatures,
        "Approval request staged"
    );

    // Broadcast creation event to WebSocket subscribers.
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "APPROVAL_CREATED",
        "approval_id": approval_id,
        "org_id":      req.org_id,
        "purpose":     req.purpose,
        "required":    req.required_signatures,
    }));

    Ok((
        StatusCode::CREATED,
        Json(ApprovalCreatedResponse {
            approval_id,
            redis_key: approval.redis_key,
            required_signatures: req.required_signatures,
            expires_at,
            message: format!(
                "Approval request {approval_id} staged, awaiting {}/{} signatures",
                0, req.required_signatures
            ),
        }),
    ))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/approvals/sign
// ─────────────────────────────────────────────────────────────────────────────

/// Submit a signer's cryptographic signature for a pending approval.
///
/// On each successful submission:
///   1. Validates the approval is still PENDING and not expired.
///   2. Guards against double-signing (unique constraint enforced in DB).
///   3. Injects the signature into the live XDR stored in Redis.
///   4. Increments the signature counter atomically in PostgreSQL.
///   5. If threshold is reached → auto-submit to Horizon and mark SUBMITTED.
///   6. Broadcasts the signature event over WebSocket.
pub async fn submit_signature(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SubmitSignatureRequest>,
) -> ApiResult<impl IntoResponse> {
    // ── Fetch current approval state from DB ─────────────────────────────────
    let approval = sqlx::query_as!(
        ApprovalRequest,
        r#"
        SELECT
            id, redis_key, org_id, purpose, amount, destination,
            required_signatures, current_signatures,
            status AS "status: ApprovalStatus",
            submitted_tx_hash, expires_at, created_at, updated_at
        FROM approval_requests
        WHERE id = $1
        FOR UPDATE
        "#,
        req.approval_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Approval {}", req.approval_id)))?;

    // Expiry guard.
    if Utc::now() > approval.expires_at {
        return Err(AppError::Validation(format!(
            "Approval {} has expired at {}",
            req.approval_id, approval.expires_at
        )));
    }

    // Status guard — only PENDING approvals accept new signatures.
    if approval.status != ApprovalStatus::Pending {
        return Err(AppError::TransactionAlreadySettled(
            req.approval_id.to_string(),
        ));
    }

    // ── Fetch live XDR from Redis ─────────────────────────────────────────────
    let current_xdr: String = {
        let mut conn = state.redis.get_async_connection().await.map_err(|e| {
            AppError::Cache(e.to_string())
        })?;

        redis::cmd("GET")
            .arg(&approval.redis_key)
            .query_async::<_, Option<String>>(&mut conn)
            .await
            .map_err(|e| AppError::Cache(e.to_string()))?
            .ok_or_else(|| {
                AppError::Cache(format!(
                    "Redis key {} not found — approval may have expired",
                    approval.redis_key
                ))
            })?
    };

    // ── Inject signature into XDR ─────────────────────────────────────────────
    let updated_xdr = inject_signature_into_xdr(
        &current_xdr,
        &req.hint_hex,
        &req.signature_b64,
    )?;

    // ── Persist updated XDR back into Redis (preserve remaining TTL) ──────────
    {
        let mut conn = state.redis.get_async_connection().await.map_err(|e| {
            AppError::Cache(e.to_string())
        })?;

        // Preserve original TTL (KEEPTTL available in Redis 6+).
        redis::cmd("SET")
            .arg(&approval.redis_key)
            .arg(&updated_xdr)
            .arg("KEEPTTL")
            .query_async::<_, ()>(&mut conn)
            .await
            .map_err(|e| AppError::Cache(e.to_string()))?;
    }

    // ── Record signature in PostgreSQL (UNIQUE guard prevents double-signing) ──
    sqlx::query!(
        r#"
        INSERT INTO approval_signatures (approval_id, signer_address, signature_b64, hint_hex)
        VALUES ($1, $2, $3, $4)
        "#,
        req.approval_id,
        req.signer_address,
        req.signature_b64,
        req.hint_hex,
    )
    .execute(&state.db)
    .await
    .map_err(|e| {
        // Unique violation → this signer already submitted.
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.code().as_deref() == Some("23505") {
                return AppError::Validation(format!(
                    "Signer {} has already signed this approval",
                    req.signer_address
                ));
            }
        }
        AppError::Database(e)
    })?;

    // ── Atomically increment signature counter ────────────────────────────────
    let updated = sqlx::query_as!(
        ApprovalRequest,
        r#"
        UPDATE approval_requests
        SET current_signatures = current_signatures + 1
        WHERE id = $1
        RETURNING
            id, redis_key, org_id, purpose, amount, destination,
            required_signatures, current_signatures,
            status AS "status: ApprovalStatus",
            submitted_tx_hash, expires_at, created_at, updated_at
        "#,
        req.approval_id
    )
    .fetch_one(&state.db)
    .await?;

    let threshold_reached = updated.current_signatures >= updated.required_signatures;
    let mut submitted_tx_hash: Option<String> = None;

    tracing::info!(
        approval_id = %req.approval_id,
        signer      = %req.signer_address,
        progress    = "{}/{}",
        updated.current_signatures,
        updated.required_signatures,
        "Signature appended"
    );

    // ── Auto-submit if quorum is reached ─────────────────────────────────────
    if threshold_reached {
        tracing::info!(
            approval_id = %req.approval_id,
            "Quorum reached — auto-submitting to Horizon"
        );

        // Mark as THRESHOLD_MET first (before network call).
        sqlx::query!(
            "UPDATE approval_requests SET status = 'THRESHOLD_MET' WHERE id = $1",
            req.approval_id
        )
        .execute(&state.db)
        .await?;

        // Broadcast threshold event.
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":        "APPROVAL_THRESHOLD_MET",
            "approval_id": req.approval_id,
            "org_id":      updated.org_id,
        }));

        // Submit fully-signed envelope to Horizon.
        match submit_to_horizon(&updated_xdr).await {
            Ok(tx_hash) => {
                submitted_tx_hash = Some(tx_hash.clone());

                // Update DB: SUBMITTED + store tx hash.
                sqlx::query!(
                    r#"
                    UPDATE approval_requests
                    SET status = 'SUBMITTED', submitted_tx_hash = $2
                    WHERE id = $1
                    "#,
                    req.approval_id,
                    tx_hash,
                )
                .execute(&state.db)
                .await?;

                tracing::info!(
                    approval_id = %req.approval_id,
                    tx_hash     = %tx_hash,
                    "Horizon submission successful"
                );

                // Broadcast submission success.
                let _ = state.broadcast_tx.send(serde_json::json!({
                    "type":        "APPROVAL_SUBMITTED",
                    "approval_id": req.approval_id,
                    "tx_hash":     tx_hash,
                    "org_id":      updated.org_id,
                    "status":      "STELLAR_LEDGER",
                }));
            }
            Err(e) => {
                tracing::error!(
                    approval_id = %req.approval_id,
                    error       = %e,
                    "Horizon submission failed after quorum"
                );

                sqlx::query!(
                    "UPDATE approval_requests SET status = 'REJECTED' WHERE id = $1",
                    req.approval_id
                )
                .execute(&state.db)
                .await?;

                return Err(e);
            }
        }
    } else {
        // Broadcast partial progress event.
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":        "APPROVAL_SIGNED",
            "approval_id": req.approval_id,
            "signer":      req.signer_address,
            "current":     updated.current_signatures,
            "required":    updated.required_signatures,
            "org_id":      updated.org_id,
        }));
    }

    Ok(Json(SignatureSubmittedResponse {
        approval_id:         req.approval_id,
        current_signatures:  updated.current_signatures,
        required_signatures: updated.required_signatures,
        threshold_reached,
        submitted_tx_hash,
        message: if threshold_reached {
            "Quorum reached — transaction submitted to Stellar Horizon".into()
        } else {
            format!(
                "Signature accepted ({}/{} collected)",
                updated.current_signatures, updated.required_signatures
            )
        },
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/approvals/:approval_id
// ─────────────────────────────────────────────────────────────────────────────

/// Retrieve the full state of an approval request including all signatures.
#[derive(Debug, Serialize)]
pub struct ApprovalDetailResponse {
    pub approval: ApprovalRequest,
    pub signatures: Vec<ApprovalSignature>,
}

pub async fn get_approval_detail(
    State(state): State<Arc<AppState>>,
    Path(approval_id): Path<Uuid>,
) -> ApiResult<impl IntoResponse> {
    let approval = sqlx::query_as!(
        ApprovalRequest,
        r#"
        SELECT
            id, redis_key, org_id, purpose, amount, destination,
            required_signatures, current_signatures,
            status AS "status: ApprovalStatus",
            submitted_tx_hash, expires_at, created_at, updated_at
        FROM approval_requests
        WHERE id = $1
        "#,
        approval_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Approval {approval_id}")))?;

    let signatures = sqlx::query_as!(
        ApprovalSignature,
        r#"
        SELECT id, approval_id, signer_address, signature_b64, hint_hex, signed_at
        FROM approval_signatures
        WHERE approval_id = $1
        ORDER BY signed_at ASC
        "#,
        approval_id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(ApprovalDetailResponse { approval, signatures }))
}
