use std::sync::Arc;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::models::{get_wallets_for_org, WalletType},
    errors::AppError,
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct WalletResponse {
    pub id: String,
    pub name: String,
    pub public_key: String,
    #[serde(rename = "type")]
    pub wallet_type: String,
    pub balance: f64, // Floating point for UI simplicity (XLM)
    pub is_active: bool,
    pub description: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

use futures::future::join_all;

/// GET /api/v1/wallets
/// 
/// Retrieves all active wallets for the current organization and fetches their live XLM balances from the Stellar Horizon network concurrently.
pub async fn get_wallets(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<WalletResponse>>, AppError> {
    // TODO: Replace with authenticated org context from JWT/Firebase middleware
    // Using a hardcoded TEST_ORG_ID for now
    let org_id_str = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or_else(|_| Uuid::nil());

    let wallets = get_wallets_for_org(&state.db, org_id_str).await?;

    // Fetch live XLM balances from Horizon concurrently
    let mut balance_futures = Vec::new();
    for w in &wallets {
        let state_clone = Arc::clone(&state);
        let public_key = w.public_key.clone();
        
        let fut = tokio::spawn(async move {
            let balance_result = state_clone.horizon.fetch_balance(&public_key, "native").await;
            match balance_result {
                Ok(balance_str) => balance_str.parse::<f64>().unwrap_or(0.0),
                Err(e) => {
                    tracing::warn!("Failed to fetch balance for wallet {}: {}", public_key, e);
                    0.0 // Default to 0.0 if not found/error (e.g. unfunded)
                }
            }
        });
        balance_futures.push(fut);
    }

    let balances: Vec<f64> = join_all(balance_futures)
        .await
        .into_iter()
        .map(|res| res.unwrap_or(0.0))
        .collect();

    // Map Database Models to API DTOs combining the live balance
    let response: Vec<WalletResponse> = wallets
        .into_iter()
        .zip(balances.into_iter())
        .map(|(w, balance)| {
            WalletResponse {
                id: w.id.to_string(),
                name: w.wallet_name,
                public_key: w.public_key,
                wallet_type: format!("{:?}", w.wallet_type).to_uppercase(),
                balance,
                is_active: w.is_active,
                description: w.description,
            }
        })
        .collect();

    Ok(Json(response))
}
