use std::sync::Arc;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::models::get_recent_transactions,
    errors::AppError,
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: String,
    pub transfer_id: String,
    pub status: String,
    pub amount: f64,
    pub asset_code: String,
    pub created_at: String,
    pub source_breakdown: serde_json::Value,
    pub stellar_tx_hash: Option<String>,
    pub ledger_sequence: Option<i64>,
    pub recipient_count: i32,
    pub settled_at: Option<String>,
    pub failed_at: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /api/v1/transactions
/// 
/// Retrieves recent transactions for the current organization.
pub async fn get_transactions(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<TransactionResponse>>, AppError> {
    // TODO: Replace with authenticated org context from JWT/Firebase middleware
    // Using a hardcoded TEST_ORG_ID for now
    let org_id_str = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_else(|_| Uuid::nil());

    // Fetch 50 most recent transactions
    let transactions = get_recent_transactions(&state.db, org_id_str, 50).await?;

    let response: Vec<TransactionResponse> = transactions
        .into_iter()
        .map(|t| {
            let amount_f64 = format!("{}", t.amount).parse::<f64>().unwrap_or(0.0);
            
            TransactionResponse {
                id: t.id.to_string(),
                transfer_id: t.transfer_id,
                status: format!("{:?}", t.status).to_uppercase(),
                amount: amount_f64,
                asset_code: t.asset_code,
                created_at: t.created_at.to_rfc3339(),
                source_breakdown: t.source_breakdown,
                stellar_tx_hash: t.stellar_tx_hash,
                ledger_sequence: t.ledger_sequence,
                recipient_count: t.recipient_count,
                settled_at: t.settled_at.map(|d| d.to_rfc3339()),
                failed_at: t.failed_at.map(|d| d.to_rfc3339()),
            }
        })
        .collect();

    Ok(Json(response))
}
