use std::sync::Arc;
use axum::{extract::State, Json};
use serde::Serialize;
use uuid::Uuid;
use sqlx::Row;
use futures::future::join_all;

use crate::{
    database::models::get_wallets_for_org,
    errors::AppError,
    AppState,
    stellar::jit_aggregator::{STELLAR_BASE_RESERVE, FEE_BUFFER, TREASURY_BUFFER_PCT},
};

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TreasurySummary {
    pub total_equity: f64,
    pub available_cash: f64,
    pub running_liabilities: f64,
    pub wallet_count: i64,
    pub low_balance_wallets: i64,
    pub daily_volume: f64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /api/v1/treasury/summary
/// 
/// Computes the unified treasury summary by pulling live balances from Horizon
/// and querying PostgreSQL for liabilities and daily volume.
pub async fn get_treasury_summary(
    State(state): State<Arc<AppState>>,
) -> Result<Json<TreasurySummary>, AppError> {
    // Hardcoded organization for single-tenant mode
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::nil());

    // 1. Fetch all active wallets from DB
    let wallets = get_wallets_for_org(&state.db, org_id).await?;
    let wallet_count = wallets.len() as i64;

    // 2. Concurrently fetch live XLM balances from Horizon
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
                    0.0
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

    // 3. Compute `total_equity`, `available_cash`, and `low_balance_wallets`
    let mut total_equity = 0.0;
    let mut available_cash = 0.0;
    let mut low_balance_wallets = 0;

    for &balance in &balances {
        total_equity += balance;

        let reserve_buffer = balance * TREASURY_BUFFER_PCT;
        let usable = balance - STELLAR_BASE_RESERVE - FEE_BUFFER - reserve_buffer;
        
        if usable <= 0.0 {
            low_balance_wallets += 1;
        } else {
            available_cash += usable;
        }
    }

    // 4. Query `running_liabilities`: sum of `approval_requests` in PENDING, THRESHOLD_MET, SUBMITTED
    let running_liabilities_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount), 0) as total
        FROM approval_requests
        WHERE org_id = $1
        AND status IN ('PENDING', 'THRESHOLD_MET', 'SUBMITTED')
        "#
    )
    .bind(org_id)
    .fetch_one(&state.db)
    .await?;

    let running_liabilities: bigdecimal::BigDecimal = running_liabilities_row.get("total");
    use bigdecimal::ToPrimitive;
    let running_liabilities_f64 = running_liabilities.to_f64().unwrap_or(0.0);

    // 5. Query `daily_volume`: sum of `transactions` SETTLED in the last 24 hours
    let daily_volume_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE org_id = $1
        AND status = 'SETTLED'
        AND settled_at >= NOW() - INTERVAL '24 hours'
        "#
    )
    .bind(org_id)
    .fetch_one(&state.db)
    .await?;

    let daily_volume: bigdecimal::BigDecimal = daily_volume_row.get("total");
    let daily_volume_f64 = daily_volume.to_f64().unwrap_or(0.0);

    let summary = TreasurySummary {
        total_equity,
        available_cash,
        running_liabilities: running_liabilities_f64,
        wallet_count,
        low_balance_wallets,
        daily_volume: daily_volume_f64,
    };

    Ok(Json(summary))
}
