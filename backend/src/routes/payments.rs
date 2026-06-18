// =============================================================================
// StellarFlow — Bulk Payment & Channel Account Worker Engine
//
// Route:  POST /api/v1/payments/batch
//
// Architecture:
//   1. Parse and validate the multi-recipient payload from the Next.js frontend.
//   2. Stage all recipient records into PostgreSQL as AUTHORIZING.
//   3. Simulate optimized routing splits (Soroban contract simulation call).
//   4. Spawn one tokio task per recipient, each claiming a dedicated
//      Stellar "Channel Account" from the pool to broadcast concurrently,
//      eliminating sequence number collision on 100+ recipient payroll batches.
//   5. Advance transaction status through ROUTING → STELLAR_LEDGER → SETTLED
//      and emit WebSocket broadcast events at each transition.
// =============================================================================

use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures::future::join_all;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use tokio::time::timeout;
use uuid::Uuid;

use crate::{
    database::models::{
        acquire_channel_account, advance_transaction_status, insert_transaction,
        NewTransaction, TransactionStatus,
    },
    errors::{AppError, ApiResult},
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// A single recipient line item within a batch payout request.
/// Mirrors one row of the frontend Recipient Verification Grid.
#[derive(Debug, Clone, Deserialize)]
pub struct BatchRecipient {
    /// Human-readable identifier (e.g., "EMP-001").
    pub recipient_id:  String,

    /// Stellar G-address of the destination wallet (56 chars).
    pub address:       String,

    /// Amount to transfer, expressed as a decimal string (e.g., "12500.0000000").
    pub amount:        String,

    /// Asset code (e.g., "USDC", "native").
    pub asset_code:    Option<String>,
}

/// Top-level batch payout request payload.
#[derive(Debug, Deserialize)]
pub struct BatchPayoutRequest {
    /// UUID of the submitting organization (looked up server-side for auth).
    pub org_id: Uuid,

    /// Stellar G-address of the admin submitting this batch.
    pub admin_address: String,

    /// Optional memo to attach to each transaction.
    pub memo: Option<String>,

    /// One or more recipient line items.
    pub recipients: Vec<BatchRecipient>,
}

/// Per-recipient outcome in the batch response.
#[derive(Debug, Clone, Serialize)]
pub struct RecipientOutcome {
    pub recipient_id:  String,
    pub address:       String,
    pub transfer_id:   String,
    pub status:        String,
    pub amount:        String,
    pub routing_split: serde_json::Value,
}

/// Full batch payout response body.
#[derive(Debug, Serialize)]
pub struct BatchPayoutResponse {
    pub batch_id:         Uuid,
    pub total_recipients: usize,
    pub outcomes:         Vec<RecipientOutcome>,
    pub message:          String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Soroban Simulation Stub
//
// In production this calls the Soroban RPC `simulateTransaction` endpoint,
// invoking `route_payout` in read-only simulation mode to obtain the vault
// breakdown map without any on-chain state change.
// ─────────────────────────────────────────────────────────────────────────────

/// Simulate a payout routing split via the Soroban RPC `simulateTransaction`
/// endpoint. Returns a JSON object mapping vault addresses to stroop amounts.
///
/// In a production deployment, this function:
///   1. Constructs a Soroban `InvokeHostFunctionOp` for `route_payout`.
///   2. POSTs it to `https://soroban-testnet.stellar.org` with method
///      `simulateTransaction` (XDR-encoded).
///   3. Deserialises the `results[0].xdr` return value (a `Map<Address, i128>`).
///   4. Returns the allocation breakdown without committing any state.
async fn simulate_routing_split(
    contract_id: &str,
    destination: &str,
    amount_stroops: i128,
) -> Result<serde_json::Value, AppError> {
    // ── Simulation placeholder (replace with live Soroban RPC call) ──────────
    // In production, build and sign a simulateTransaction XDR payload here.
    // For now, return a deterministic mock split across two vault addresses
    // to demonstrate the interface contract with the frontend.
    let half   = amount_stroops / 2;
    let remain = amount_stroops - half;

    let mock_split = serde_json::json!({
        "GAHX9P2ZSIMULATEDVAULT1": half,
        "GBCP9J1KSIMULATEDVAULT2": remain,
        "_simulated": true,
        "_contract": contract_id,
        "_destination": destination,
    });

    Ok(mock_split)
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Account Broadcast Worker
//
// Spawned as an independent tokio task per recipient. Acquires a free channel
// account from the PostgreSQL pool (with FOR UPDATE SKIP LOCKED), builds the
// Stellar transaction, submits to Horizon, then releases the channel.
// ─────────────────────────────────────────────────────────────────────────────

/// Per-recipient broadcast context passed to each worker task.
struct BroadcastJob {
    transfer_id:   String,
    destination:   String,
    amount_stroops: i128,
    asset_code:    String,
    batch_id:      Uuid,
    org_id:        Uuid,
    memo:          Option<String>,
}

/// Execute one recipient's broadcast on a dedicated channel account.
///
/// Flow:
///   1. Acquire a free channel account (SKIP LOCKED prevents race conditions).
///   2. Advance transaction status → ROUTING.
///   3. Build, sign, and submit the Stellar transaction to Horizon.
///   4. Advance status → STELLAR_LEDGER → SETTLED.
///   5. Release the channel account back to the pool.
async fn broadcast_single_payment(
    state: Arc<AppState>,
    job: BroadcastJob,
) -> Result<String, AppError> {
    // ── 1. Acquire a channel account (exclusive row lock) ───────────────────
    let channel = acquire_channel_account(&state.db, job.batch_id)
        .await?
        .ok_or_else(|| {
            AppError::Internal(anyhow::anyhow!(
                "No free channel accounts available — scale your pool"
            ))
        })?;

    tracing::info!(
        transfer_id = %job.transfer_id,
        channel     = %channel.public_key,
        "Acquired channel account for broadcast"
    );

    // ── 2. Advance status → ROUTING ─────────────────────────────────────────
    advance_transaction_status(
        &state.db,
        &job.transfer_id,
        TransactionStatus::Routing,
        None,
        None,
    )
    .await?;

    // Broadcast WebSocket status change event.
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "STATUS_CHANGE",
        "transfer_id": job.transfer_id,
        "status":      "ROUTING",
        "org_id":      job.org_id,
    }));

    // ── 3. Build & Submit Stellar Transaction to Horizon ────────────────────
    //
    // Production implementation:
    //   a. Fetch the channel account's current sequence number via
    //      Horizon GET /accounts/{channel.public_key}.
    //   b. Decode the channel's `encrypted_secret` via AWS KMS/Vault.
    //   c. Construct a stellar_base::Transaction with:
    //        - source = channel account
    //        - operation = PaymentOp { asset, destination, amount }
    //        - fee_bump outer = org master key
    //        - memo = job.memo
    //   d. Sign with the channel keypair + master keypair.
    //   e. POST XDR to Horizon /transactions.
    //
    // For this skeleton, we simulate a 300ms network round-trip.
    let horizon_result = timeout(
        Duration::from_secs(30),
        simulate_horizon_submit(&job.destination, job.amount_stroops),
    )
    .await
    .map_err(|_| AppError::NetworkTimeout)?;

    let (tx_hash, ledger_seq) = horizon_result?;

    tracing::info!(
        transfer_id  = %job.transfer_id,
        tx_hash      = %tx_hash,
        ledger_seq   = ledger_seq,
        "Horizon submission confirmed"
    );

    // ── 4. Advance status → STELLAR_LEDGER ──────────────────────────────────
    advance_transaction_status(
        &state.db,
        &job.transfer_id,
        TransactionStatus::StellarLedger,
        Some(&tx_hash),
        Some(ledger_seq),
    )
    .await?;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":         "STATUS_CHANGE",
        "transfer_id":  job.transfer_id,
        "status":       "STELLAR_LEDGER",
        "tx_hash":      tx_hash,
        "ledger_seq":   ledger_seq,
        "org_id":       job.org_id,
    }));

    // ── 5. Advance status → SETTLED ─────────────────────────────────────────
    advance_transaction_status(
        &state.db,
        &job.transfer_id,
        TransactionStatus::Settled,
        None,
        None,
    )
    .await?;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "STATUS_CHANGE",
        "transfer_id": job.transfer_id,
        "status":      "SETTLED",
        "org_id":      job.org_id,
    }));

    // ── 6. Release channel account ───────────────────────────────────────────
    crate::database::models::release_channel_account(
        &state.db,
        channel.id,
        ledger_seq,
    )
    .await?;

    Ok(job.transfer_id)
}

/// Simulated Horizon submission. In production, replace with actual HTTP call.
async fn simulate_horizon_submit(
    _destination: &str,
    _amount: i128,
) -> Result<(String, i64), AppError> {
    // Simulate ~300ms network round-trip.
    tokio::time::sleep(Duration::from_millis(300)).await;

    // Return mock transaction hash and ledger sequence.
    let fake_hash = format!("{:0>64}", hex::encode(&Uuid::new_v4().as_bytes()[..]));
    let fake_seq  = 50_000_000_i64 + rand_ledger_offset();

    Ok((fake_hash, fake_seq))
}

/// Deterministic-enough ledger offset for demo purposes.
fn rand_ledger_offset() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    (SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as i64)
        % 10_000
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/batch
// ─────────────────────────────────────────────────────────────────────────────

/// Handle a multi-recipient batch payout request from the StellarFlow frontend.
///
/// This handler is the entry point for the entire payment pipeline:
///   1. Validates input (minimum 1 recipient, valid Stellar address format).
///   2. Calls Soroban simulation for each recipient to get routing splits.
///   3. Stages all records into PostgreSQL as `AUTHORIZING`.
///   4. Spawns one concurrent tokio worker per recipient, each backed by its
///      own channel account — eliminating sequence number lock contention.
///   5. Awaits all workers and returns a detailed outcome array.
pub async fn handle_batch_payout(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BatchPayoutRequest>,
) -> ApiResult<impl IntoResponse> {
    // ── Input Validation ────────────────────────────────────────────────────
    if req.recipients.is_empty() {
        return Err(AppError::Validation(
            "Batch must contain at least one recipient".into(),
        ));
    }

    if req.recipients.len() > 500 {
        return Err(AppError::Validation(
            "Batch size exceeds the maximum of 500 recipients per call".into(),
        ));
    }

    for r in &req.recipients {
        validate_stellar_address(&r.address)?;
        r.amount.parse::<f64>().map_err(|_| {
            AppError::Validation(format!(
                "Invalid amount '{}' for recipient '{}'",
                r.amount, r.recipient_id
            ))
        })?;
    }

    let batch_id = Uuid::new_v4();
    let asset_code_default = "native".to_string();

    tracing::info!(
        batch_id = %batch_id,
        recipient_count = req.recipients.len(),
        org_id = %req.org_id,
        "Processing batch payout"
    );

    // ── Retrieve org contract address for simulation ─────────────────────────
    let contract_id_opt: Option<Option<String>> = sqlx::query_scalar(
        "SELECT contract_address FROM organizations WHERE id = $1"
    )
    .bind(req.org_id)
    .fetch_optional(&state.db)
    .await?;

    let contract_id = contract_id_opt
        .ok_or_else(|| AppError::NotFound(format!("Organization {}", req.org_id)))?
        .unwrap_or_default();

    // ── Stage + Simulate all recipients ─────────────────────────────────────
    let mut jobs: Vec<BroadcastJob>       = Vec::with_capacity(req.recipients.len());
    let mut outcomes: Vec<RecipientOutcome> = Vec::with_capacity(req.recipients.len());

    for recipient in &req.recipients {
        // Parse amount into stroops (i128) for routing simulation.
        let amount_dec: BigDecimal = recipient
            .amount
            .parse()
            .map_err(|_| AppError::Validation(format!("Unparseable amount: {}", recipient.amount)))?;

        let amount_stroops: i128 = (amount_dec.clone()
            * BigDecimal::from(10_000_000_i64))
            .to_string()
            .parse::<f64>()
            .unwrap_or(0.0) as i128;

        // Soroban simulation — get vault routing breakdown.
        let routing_split = simulate_routing_split(
            &contract_id,
            &recipient.address,
            amount_stroops,
        )
        .await?;

        let asset_code = recipient
            .asset_code
            .clone()
            .unwrap_or_else(|| asset_code_default.clone());

        // Build unique transfer ID (deterministic for idempotency).
        let transfer_id = format!(
            "sf_{}_{}_{}",
            batch_id.simple(),
            &recipient.recipient_id,
            &recipient.address[..8]
        );

        // Stage record into PostgreSQL as AUTHORIZING.
        insert_transaction(
            &state.db,
            &NewTransaction {
                transfer_id:      transfer_id.clone(),
                org_id:           req.org_id,
                amount:           amount_dec.clone(),
                asset_code:       asset_code.clone(),
                destination:      recipient.address.clone(),
                source_breakdown: routing_split.clone(),
                batch_id:         Some(batch_id),
                recipient_count:  1,
            },
        )
        .await?;

        outcomes.push(RecipientOutcome {
            recipient_id:  recipient.recipient_id.clone(),
            address:       recipient.address.clone(),
            transfer_id:   transfer_id.clone(),
            status:        "AUTHORIZING".into(),
            amount:        recipient.amount.clone(),
            routing_split,
        });

        jobs.push(BroadcastJob {
            transfer_id,
            destination:    recipient.address.clone(),
            amount_stroops,
            asset_code,
            batch_id,
            org_id:         req.org_id,
            memo:           req.memo.clone(),
        });
    }

    // ── Concurrent Channel Account Broadcast ─────────────────────────────────
    // Each job gets its own tokio task backed by a dedicated channel account.
    // join_all collects all results without short-circuiting on failure,
    // ensuring partial batch success is properly captured and reported.
    let state_arc = Arc::clone(&state);
    let handles: Vec<_> = jobs
        .into_iter()
        .map(|job| {
            let s = Arc::clone(&state_arc);
            tokio::spawn(async move { broadcast_single_payment(s, job).await })
        })
        .collect();

    let results = join_all(handles).await;

    // Merge broadcast results back into outcome records.
    for (outcome, result) in outcomes.iter_mut().zip(results.into_iter()) {
        match result {
            Ok(Ok(_tx_id)) => {
                outcome.status = "SETTLED".into();
            }
            Ok(Err(e)) => {
                tracing::error!(
                    transfer_id = %outcome.transfer_id,
                    error = %e,
                    "Broadcast worker failed"
                );
                outcome.status = "FAILED".into();

                // Mark as FAILED in DB.
                let _ = advance_transaction_status(
                    &state.db,
                    &outcome.transfer_id,
                    TransactionStatus::Failed,
                    None,
                    None,
                )
                .await;
            }
            Err(join_err) => {
                tracing::error!(
                    transfer_id = %outcome.transfer_id,
                    error = %join_err,
                    "tokio task panicked"
                );
                outcome.status = "FAILED".into();
            }
        }
    }

    let total = outcomes.len();
    let response = BatchPayoutResponse {
        batch_id,
        total_recipients: total,
        outcomes,
        message: format!(
            "Batch {batch_id} processed: {total} recipient(s) initiated"
        ),
    };

    Ok((StatusCode::ACCEPTED, Json(response)))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/payments/status/:transfer_id
// ─────────────────────────────────────────────────────────────────────────────

/// Return the current status of a single transaction by its transfer_id.
pub async fn get_payment_status(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(transfer_id): axum::extract::Path<String>,
) -> ApiResult<impl IntoResponse> {
    let tx = sqlx::query_as::<_, crate::database::models::Transaction>(
        r#"
        SELECT
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown, status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        FROM transactions
        WHERE transfer_id = $1
        "#
    )
    .bind(&transfer_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Transaction {transfer_id}")))?;

    Ok(Json(tx))
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/// Validate a Stellar G-address (StrKey-encoded Ed25519 public key).
/// A valid G-address is exactly 56 alphanumeric characters beginning with 'G'.
fn validate_stellar_address(addr: &str) -> ApiResult<()> {
    if addr.len() != 56 || !addr.starts_with('G') || !addr.chars().all(|c| c.is_alphanumeric()) {
        return Err(AppError::Validation(format!(
            "'{addr}' is not a valid Stellar G-address (StrKey Ed25519 public key)"
        )));
    }
    Ok(())
}
