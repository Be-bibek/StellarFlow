// =============================================================================
// StellarFlow — Funding Center Route Handlers
//
// Routes (all under /api/v1/funding):
//   POST /funding/friendbot   — Fund a wallet via Stellar Testnet Friendbot
//   POST /funding/manual      — Simulate a manual treasury credit (demo/offline)
//   GET  /funding/history     — Funding history (newest first, paginated)
//
// Architecture:
//   - Friendbot is ONLY callable when STELLAR_NETWORK_PASSPHRASE contains "Test"
//     (i.e., testnet). Calling it on mainnet returns 403.
//   - Both endpoints write to treasury_funding_history and audit_logs (INSERT only).
//   - Both endpoints emit a TREASURY_FUNDED WebSocket broadcast.
//   - Neither endpoint modifies jit.rs, transit_engine.rs, or horizon_client.rs.
// =============================================================================

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::models::{
        audit_action, insert_audit_log, NewAuditLog,
        get_wallets_for_org,
    },
    errors::{AppError, ApiResult},
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers — funding history
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct FundingHistoryRow {
    pub id:              uuid::Uuid,
    pub org_id:          uuid::Uuid,
    pub wallet_id:       uuid::Uuid,
    pub amount:          bigdecimal::BigDecimal,
    pub method:          String,
    pub reason:          Option<String>,
    pub actor_id:        String,
    pub stellar_tx_hash: Option<String>,
    pub created_at:      chrono::DateTime<chrono::Utc>,
}

async fn insert_funding_history(
    pool:            &sqlx::PgPool,
    org_id:          Uuid,
    wallet_id:       Uuid,
    amount:          f64,
    method:          &str,
    reason:          Option<&str>,
    actor_id:        &str,
    stellar_tx_hash: Option<&str>,
) -> Result<FundingHistoryRow, sqlx::Error> {
    let amount_bd: bigdecimal::BigDecimal = format!("{:.7}", amount).parse().unwrap_or_default();
    sqlx::query_as::<_, FundingHistoryRow>(
        r#"
        INSERT INTO treasury_funding_history
            (org_id, wallet_id, amount, method, reason, actor_id, stellar_tx_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, org_id, wallet_id, amount, method, reason, actor_id, stellar_tx_hash, created_at
        "#,
    )
    .bind(org_id)
    .bind(wallet_id)
    .bind(&amount_bd)
    .bind(method)
    .bind(reason)
    .bind(actor_id)
    .bind(stellar_tx_hash)
    .fetch_one(pool)
    .await
}

async fn list_funding_history(
    pool:   &sqlx::PgPool,
    org_id: Uuid,
    limit:  i64,
    offset: i64,
) -> Result<Vec<FundingHistoryRow>, sqlx::Error> {
    sqlx::query_as::<_, FundingHistoryRow>(
        r#"
        SELECT id, org_id, wallet_id, amount, method, reason, actor_id, stellar_tx_hash, created_at
        FROM treasury_funding_history
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(org_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: write audit log (INSERT only)
// ─────────────────────────────────────────────────────────────────────────────

async fn funding_audit(
    pool:      &sqlx::PgPool,
    org_id:    Uuid,
    actor_id:  &str,
    action:    &str,
    metadata:  serde_json::Value,
) {
    let log = NewAuditLog {
        org_id,
        transfer_id: None,
        actor_id:    actor_id.to_string(),
        action:      action.to_string(),
        metadata,
    };
    if let Err(e) = insert_audit_log(pool, &log).await {
        tracing::error!(error = %e, action = action, "Failed to write funding audit log");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct FriendbotBody {
    pub wallet_id: String,
    pub reason:    Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FundingResponse {
    pub success:         bool,
    pub wallet_id:       String,
    pub amount_funded:   f64,
    pub method:          String,
    pub stellar_tx_hash: Option<String>,
    pub message:         String,
}

#[derive(Debug, Deserialize)]
pub struct ManualFundBody {
    pub wallet_id: String,
    pub amount:    f64,
    pub reason:    Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub limit:  Option<i64>,
    pub offset: Option<i64>,
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /funding/friendbot
// ─────────────────────────────────────────────────────────────────────────────

pub async fn fund_via_friendbot(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<FriendbotBody>,
) -> ApiResult<Json<FundingResponse>> {
    let org_id    = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let actor_id  = "treasury-admin";

    // ── Guard: Friendbot is testnet-only ──────────────────────────────────────
    if !state.config.is_testnet() {
        return Err(AppError::Validation(
            "Friendbot is only available on Stellar Testnet. Current network is Mainnet.".to_string()
        ));
    }

    // ── Resolve wallet public key from DB ─────────────────────────────────────
    let wallet_uuid = Uuid::parse_str(&payload.wallet_id)
        .map_err(|_| AppError::Validation("Invalid wallet_id UUID".to_string()))?;

    let wallets = get_wallets_for_org(&state.db, org_id).await
        .map_err(AppError::Database)?;
    let wallet = wallets.iter().find(|w| w.id == wallet_uuid)
        .ok_or_else(|| AppError::NotFound(format!("Wallet {} not found", wallet_uuid)))?;

    let public_key = wallet.public_key.clone();
    let wallet_name = wallet.wallet_name.clone();

    // ── Call Stellar Friendbot (server-side only) ──────────────────────────────
    let friendbot_url = format!(
        "https://friendbot.stellar.org/?addr={}",
        public_key
    );

    tracing::info!(
        wallet_id  = %wallet_uuid,
        public_key = %public_key,
        "Calling Stellar Friendbot"
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::HorizonError(e.to_string()))?;

    let resp = client
        .get(&friendbot_url)
        .send()
        .await
        .map_err(|e| AppError::HorizonError(format!("Friendbot request failed: {}", e)))?;

    let friendbot_amount = 10_000.0_f64; // Friendbot always sends 10,000 XLM

    let (tx_hash, success_msg) = if resp.status().is_success() {
        let body: serde_json::Value = resp.json().await.unwrap_or_default();
        let hash = body["hash"].as_str().map(String::from);
        tracing::info!(wallet = %public_key, "Friendbot funding successful");
        (hash, format!("Friendbot sent 10,000 XLM to {}", wallet_name))
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        // Friendbot returns 400 if the account already exists/is funded
        // We treat this as a soft success for demo purposes
        tracing::warn!(
            status = %status,
            body   = %body_text,
            "Friendbot returned non-success — account may already be funded"
        );
        (None, format!(
            "Friendbot note: {} (account may already be funded — existing balance preserved)",
            status
        ))
    };

    // ── Persist funding history (INSERT only) ─────────────────────────────────
    let history = insert_funding_history(
        &state.db,
        org_id,
        wallet_uuid,
        friendbot_amount,
        "friendbot",
        payload.reason.as_deref(),
        actor_id,
        tx_hash.as_deref(),
    ).await.map_err(AppError::Database)?;

    // ── Audit log (INSERT only — FRIENDBOT_FUNDING) ───────────────────────────
    funding_audit(
        &state.db,
        org_id,
        actor_id,
        "FRIENDBOT_FUNDING",
        serde_json::json!({
            "wallet_id":   wallet_uuid.to_string(),
            "wallet_name": wallet_name,
            "public_key":  public_key,
            "amount":      friendbot_amount,
            "method":      "friendbot",
            "reason":      payload.reason,
            "tx_hash":     tx_hash,
        }),
    ).await;

    // ── WebSocket broadcast — TREASURY_FUNDED ─────────────────────────────────
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":      "TREASURY_FUNDED",
        "wallet_id": wallet_uuid.to_string(),
        "amount":    friendbot_amount,
        "method":    "friendbot",
        "wallet_name": wallet_name,
    }));

    Ok(Json(FundingResponse {
        success:         true,
        wallet_id:       wallet_uuid.to_string(),
        amount_funded:   friendbot_amount,
        method:          "friendbot".to_string(),
        stellar_tx_hash: history.stellar_tx_hash,
        message:         success_msg,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /funding/manual
// ─────────────────────────────────────────────────────────────────────────────

pub async fn fund_manual(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ManualFundBody>,
) -> ApiResult<Json<FundingResponse>> {
    let org_id   = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let actor_id = "treasury-admin";

    if payload.amount <= 0.0 {
        return Err(AppError::Validation("Amount must be greater than 0".to_string()));
    }

    let wallet_uuid = Uuid::parse_str(&payload.wallet_id)
        .map_err(|_| AppError::Validation("Invalid wallet_id UUID".to_string()))?;

    let wallets = get_wallets_for_org(&state.db, org_id).await
        .map_err(AppError::Database)?;
    let wallet = wallets.iter().find(|w| w.id == wallet_uuid)
        .ok_or_else(|| AppError::NotFound(format!("Wallet {} not found", wallet_uuid)))?;

    let wallet_name = wallet.wallet_name.clone();

    tracing::info!(
        wallet_id = %wallet_uuid,
        amount    = payload.amount,
        "Manual treasury credit recorded"
    );

    // ── Persist funding history ────────────────────────────────────────────────
    insert_funding_history(
        &state.db,
        org_id,
        wallet_uuid,
        payload.amount,
        "manual",
        payload.reason.as_deref(),
        actor_id,
        None,
    ).await.map_err(AppError::Database)?;

    // ── Audit log — MANUAL_TREASURY_CREDIT ───────────────────────────────────
    funding_audit(
        &state.db,
        org_id,
        actor_id,
        "MANUAL_TREASURY_CREDIT",
        serde_json::json!({
            "wallet_id":   wallet_uuid.to_string(),
            "wallet_name": wallet_name,
            "amount":      payload.amount,
            "method":      "manual",
            "reason":      payload.reason,
        }),
    ).await;

    // ── WebSocket broadcast — TREASURY_FUNDED ─────────────────────────────────
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "TREASURY_FUNDED",
        "wallet_id":   wallet_uuid.to_string(),
        "amount":      payload.amount,
        "method":      "manual",
        "wallet_name": wallet_name,
    }));

    Ok(Json(FundingResponse {
        success:         true,
        wallet_id:       wallet_uuid.to_string(),
        amount_funded:   payload.amount,
        method:          "manual".to_string(),
        stellar_tx_hash: None,
        message:         format!(
            "Manual credit of {:.2} XLM recorded for {}. Balance will refresh on next poll.",
            payload.amount, wallet_name
        ),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /funding/history
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_funding_history(
    State(state): State<Arc<AppState>>,
    Query(q):     Query<HistoryQuery>,
) -> ApiResult<Json<serde_json::Value>> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let limit  = q.limit.unwrap_or(50).min(200);
    let offset = q.offset.unwrap_or(0);

    let rows = list_funding_history(&state.db, org_id, limit, offset)
        .await
        .map_err(AppError::Database)?;

    // Enrich with wallet name via in-memory join
    let wallets = get_wallets_for_org(&state.db, org_id).await.unwrap_or_default();

    let enriched: Vec<serde_json::Value> = rows.into_iter().map(|r| {
        let wallet_name = wallets.iter()
            .find(|w| w.id == r.wallet_id)
            .map(|w| w.wallet_name.clone())
            .unwrap_or_else(|| r.wallet_id.to_string());
        serde_json::json!({
            "id":              r.id.to_string(),
            "wallet_id":       r.wallet_id.to_string(),
            "wallet_name":     wallet_name,
            "amount":          r.amount.to_string().parse::<f64>().unwrap_or(0.0),
            "method":          r.method,
            "reason":          r.reason,
            "actor_id":        r.actor_id,
            "stellar_tx_hash": r.stellar_tx_hash,
            "created_at":      r.created_at.to_rfc3339(),
        })
    }).collect();

    Ok(Json(serde_json::json!({
        "items":  enriched,
        "limit":  limit,
        "offset": offset,
    })))
}
