// =============================================================================
// StellarFlow Backend — System Diagnostic Routes
// =============================================================================

use std::sync::Arc;
use axum::{extract::State, response::IntoResponse, Json};
use redis::aio::ConnectionManager;

use crate::{
    errors::AppError,
    AppState,
    stellar::sequence_manager,
};

#[derive(serde::Serialize)]
pub struct SequenceHealthResponse {
    pub wallets: Vec<WalletHealth>,
}

#[derive(serde::Serialize)]
pub struct WalletHealth {
    pub wallet: String,
    pub redis_sequence: i64,
    pub horizon_sequence: i64,
    pub healthy: bool,
}

pub async fn sequence_health(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let mut redis_conn = ConnectionManager::new(state.redis.clone()).await.map_err(|e| {
        AppError::Cache(format!("Redis connection failed: {e}"))
    })?;

    use sqlx::Row;
    let wallets_db = sqlx::query(
        "SELECT public_key, wallet_name FROM wallets WHERE is_active = true"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    let mut wallets_health = Vec::new();

    for row in wallets_db {
        let public_key: String = row.get("public_key");
        let wallet_name: String = row.get("wallet_name");

        let redis_seq = sequence_manager::peek(&mut redis_conn, &public_key).await?.unwrap_or(0);
        let horizon_seq = state.horizon.fetch_sequence(&public_key).await.unwrap_or(0);
        
        let healthy = (redis_seq == horizon_seq) || (redis_seq == 0 && horizon_seq == 0);

        wallets_health.push(WalletHealth {
            wallet: wallet_name,
            redis_sequence: redis_seq,
            horizon_sequence: horizon_seq,
            healthy,
        });
    }

    Ok(Json(SequenceHealthResponse {
        wallets: wallets_health,
    }))
}
