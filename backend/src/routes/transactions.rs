use std::sync::Arc;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::models::{get_recent_transactions, get_children_for_parent},
    errors::AppError,
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ChildTransferResponse {
    pub public_key:        String,
    pub amount:            f64,
    pub status:            String,
    pub stellar_tx_hash:   Option<String>,
    pub ledger_sequence:   Option<i64>,
    pub failure_reason:    Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id:               String,
    pub transfer_id:      String,
    pub status:           String,
    pub amount:           f64,
    pub asset_code:       String,
    pub created_at:       String,
    pub source_breakdown: serde_json::Value,
    pub stellar_tx_hash:  Option<String>,
    pub ledger_sequence:  Option<i64>,
    pub recipient_count:  i32,
    pub settled_at:       Option<String>,
    pub failed_at:        Option<String>,
    /// Per-wallet child transactions — each has its own real Stellar tx hash
    pub child_transfers:  Vec<ChildTransferResponse>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /api/v1/transactions
///
/// Retrieves recent transactions for the current organization,
/// including per-wallet child_transfers with real Stellar tx hashes.
pub async fn get_transactions(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<TransactionResponse>>, AppError> {
    let org_id_str = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_else(|_| Uuid::nil());

    // Fetch 50 most recent transactions
    let transactions = get_recent_transactions(&state.db, org_id_str, 50).await?;

    let mut response: Vec<TransactionResponse> = Vec::with_capacity(transactions.len());

    for t in transactions {
        let amount_f64 = format!("{}", t.amount).parse::<f64>().unwrap_or(0.0);

        // Fetch child transfers (per-wallet Stellar txs) for this parent
        let children = get_children_for_parent(&state.db, &t.transfer_id)
            .await
            .unwrap_or_default();

        let child_responses: Vec<ChildTransferResponse> = children
            .into_iter()
            .map(|c| ChildTransferResponse {
                public_key:      c.public_key,
                amount:          format!("{}", c.amount).parse::<f64>().unwrap_or(0.0),
                status:          format!("{:?}", c.status).to_uppercase(),
                stellar_tx_hash: c.stellar_tx_hash,
                ledger_sequence: c.ledger_sequence,
                failure_reason:  c.failure_reason,
            })
            .collect();

        response.push(TransactionResponse {
            id:               t.id.to_string(),
            transfer_id:      t.transfer_id,
            status:           format!("{:?}", t.status).to_uppercase(),
            amount:           amount_f64,
            asset_code:       t.asset_code,
            created_at:       t.created_at.to_rfc3339(),
            source_breakdown: t.source_breakdown,
            stellar_tx_hash:  t.stellar_tx_hash,
            ledger_sequence:  t.ledger_sequence,
            recipient_count:  t.recipient_count,
            settled_at:       t.settled_at.map(|d| d.to_rfc3339()),
            failed_at:        t.failed_at.map(|d| d.to_rfc3339()),
            child_transfers:  child_responses,
        });
    }

    Ok(Json(response))
}
