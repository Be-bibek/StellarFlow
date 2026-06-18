// =============================================================================
// StellarFlow Backend — JIT Routing API
// =============================================================================

use std::sync::Arc;
use axum::{extract::State, Json};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::{
        models::{NewTransaction, TransactionStatus, advance_transaction_status},
        queries::transactions as tx_queries,
    },
    errors::AppError,
    stellar::{
        jit_aggregator::{self, bigdecimal_to_stroops},
        sequence_manager,
        transaction_builder::build_and_sign_payment,
    },
    AppState,
};
use redis::aio::ConnectionManager;

// ... keep DTOs ...
#[derive(Debug, Deserialize)]
pub struct SimulateJitRequest {
    pub target_amount: f64,
    pub asset_code: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
pub struct JitAllocationDto {
    pub walletId: String,
    pub walletName: String,
    pub walletType: String,
    pub publicKey: String,
    pub amount: f64,
    pub percentage: f64,
    pub available: f64,
    pub rawBalance: f64,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
pub struct SimulateJitResponse {
    pub target: f64,
    pub totalCovered: f64,
    pub vaultsUsed: usize,
    pub allocations: Vec<JitAllocationDto>,
    pub isFullyCovered: bool,
    pub shortfall: f64,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteJitRequest {
    pub target_amount: f64,
    pub asset_code: Option<String>,
    pub destination: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
pub struct ExecuteJitResponse {
    pub transfer_id: String,
    pub status: String,
    pub stellar_tx_hash: Option<String>,
    pub message: String,
}

pub async fn simulate_jit(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SimulateJitRequest>,
) -> Result<Json<SimulateJitResponse>, AppError> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::nil());

    let target_amount_str = format!("{:.7}", payload.target_amount);
    let target_bd = target_amount_str.parse::<BigDecimal>().unwrap_or_default();
    let asset_code = payload.asset_code.unwrap_or_else(|| "native".to_string());

    let split_result = jit_aggregator::compute_jit_split(
        &state.db,
        &state.horizon,
        org_id,
        target_bd.clone(),
        &asset_code,
    ).await?;

    let allocations = split_result.allocations
        .into_iter()
        .map(|alloc| JitAllocationDto {
            walletId: alloc.walletId,
            walletName: alloc.walletName,
            walletType: alloc.walletType,
            publicKey: alloc.publicKey,
            amount: alloc.amount,
            percentage: alloc.percentage,
            available: alloc.available,
            rawBalance: alloc.rawBalance,
        })
        .collect();

    Ok(Json(SimulateJitResponse {
        target: payload.target_amount,
        totalCovered: split_result.total_covered.to_f64().unwrap_or(0.0),
        vaultsUsed: split_result.vaults_used,
        allocations,
        isFullyCovered: split_result.is_fully_covered,
        shortfall: split_result.shortfall.to_f64().unwrap_or(0.0),
        timestamp: chrono::Utc::now().timestamp_millis(),
    }))
}

pub async fn execute_jit(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ExecuteJitRequest>,
) -> Result<Json<ExecuteJitResponse>, AppError> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::nil());

    let amount_str = format!("{:.7}", payload.target_amount);
    let amount_bd  = amount_str.parse::<BigDecimal>().unwrap_or_default();
    let asset_code = payload.asset_code.unwrap_or_else(|| "native".to_string());

    let split_result = jit_aggregator::compute_jit_split(
        &state.db,
        &state.horizon,
        org_id,
        amount_bd.clone(),
        &asset_code,
    ).await?;

    if !split_result.is_fully_covered {
        return Err(AppError::InsufficientTotalFunds {
            available: bigdecimal_to_stroops(&split_result.total_covered),
            required: bigdecimal_to_stroops(&amount_bd),
        });
    }

    let transfer_id = format!(
        "TX-{}",
        &Uuid::new_v4().simple().to_string().to_uppercase()[..8]
    );

    let destination = payload.destination.unwrap_or_else(|| {
        "GDEMVLMGIBOS3SMUYOU4EFMSA2PCUDHPKSBZEXAMPLE1234567XYZABC".to_string()
    });

    let new_tx = NewTransaction {
        transfer_id:      transfer_id.clone(),
        org_id,
        amount:           amount_bd.clone(),
        asset_code:       asset_code.clone(),
        destination:      destination.clone(),
        source_breakdown: split_result.source_breakdown.clone(),
        batch_id:         None,
        recipient_count:  1,
    };

    let tx = tx_queries::insert(&state.db, &new_tx).await?;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "TRANSIT_STATE",
        "event_type":  "TRANSACTION_STAGED",
        "ref_id":      tx.transfer_id,
        "new_status":  "AUTHORIZING",
        "org_id":      org_id,
        "timestamp":   chrono::Utc::now().to_rfc3339(),
    }));

    let bg_state = Arc::clone(&state);
    let bg_tx_id = tx.transfer_id.clone();
    
    let master_secret = std::env::var("STELLAR_SIGNER_SECRET").unwrap_or_default();
    let master_pub = std::env::var("STELLAR_ADMIN_PUBLIC_KEY").unwrap_or_default();
    let amount_stroops = bigdecimal_to_stroops(&amount_bd);

    tokio::spawn(async move {
        // Wait briefly for UI animation to start
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        
        let _ = bg_state.broadcast_tx.send(serde_json::json!({
            "type":        "TRANSIT_STATE",
            "event_type":  "PAYOUT_ROUTED",
            "ref_id":      bg_tx_id,
            "new_status":  "ROUTING",
            "org_id":      org_id,
            "timestamp":   chrono::Utc::now().to_rfc3339(),
        }));

        let mut redis_conn = match ConnectionManager::new(bg_state.redis.clone()).await {
            Ok(conn) => conn,
            Err(e) => {
                tracing::error!("Failed to get redis connection manager: {}", e);
                let _ = advance_transaction_status(&bg_state.db, &bg_tx_id, TransactionStatus::Failed, None, None).await;
                return;
            }
        };
        
        // Sequence Management
        if let Ok(horizon_seq) = bg_state.horizon.fetch_sequence(&master_pub).await {
            let _ = sequence_manager::seed_from_horizon(&mut redis_conn, &master_pub, horizon_seq).await;
        }

        let seq = match sequence_manager::get_and_increment(&mut redis_conn, &master_pub).await {
            Ok(s) => s,
            Err(_) => {
                bg_state.horizon.fetch_sequence(&master_pub).await.unwrap_or(0) + 1
            }
        };

        // Build and Sign Real XDR
        match build_and_sign_payment(&master_secret, &destination, amount_stroops as i64, seq) {
            Ok((hash_hex, xdr_base64)) => {
                let _ = bg_state.broadcast_tx.send(serde_json::json!({
                    "type":        "TRANSIT_STATE",
                    "event_type":  "SUBMITTED",
                    "ref_id":      bg_tx_id,
                    "new_status":  "STELLAR_LEDGER",
                    "org_id":      org_id,
                    "timestamp":   chrono::Utc::now().to_rfc3339(),
                    "stellar_tx_hash": hash_hex,
                }));

                // Submit to Horizon
                match bg_state.horizon.submit_transaction(&xdr_base64).await {
                    Ok(result) => {
                        let _ = advance_transaction_status(
                            &bg_state.db,
                            &bg_tx_id,
                            TransactionStatus::Settled,
                            Some(&result.hash),
                            Some(result.ledger),
                        ).await;

                        let _ = bg_state.broadcast_tx.send(serde_json::json!({
                            "type":        "TRANSIT_STATE",
                            "event_type":  "TRANSACTION_SETTLED",
                            "ref_id":      bg_tx_id,
                            "new_status":  "SETTLED",
                            "org_id":      org_id,
                            "timestamp":   chrono::Utc::now().to_rfc3339(),
                            "stellar_tx_hash": result.hash,
                            "ledger_sequence": result.ledger,
                        }));
                    }
                    Err(e) => {
                        tracing::error!("Horizon submission failed: {}", e);
                        let _ = advance_transaction_status(
                            &bg_state.db,
                            &bg_tx_id,
                            TransactionStatus::Failed,
                            Some(&hash_hex),
                            None,
                        ).await;

                        let _ = bg_state.broadcast_tx.send(serde_json::json!({
                            "type":        "TRANSIT_STATE",
                            "event_type":  "TRANSACTION_FAILED",
                            "ref_id":      bg_tx_id,
                            "new_status":  "FAILED",
                            "org_id":      org_id,
                            "timestamp":   chrono::Utc::now().to_rfc3339(),
                            "stellar_tx_hash": hash_hex,
                        }));
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to build transaction: {:?}", e);
                let _ = advance_transaction_status(&bg_state.db, &bg_tx_id, TransactionStatus::Failed, None, None).await;
                let _ = bg_state.broadcast_tx.send(serde_json::json!({
                    "type":        "TRANSIT_STATE",
                    "event_type":  "TRANSACTION_FAILED",
                    "ref_id":      bg_tx_id,
                    "new_status":  "FAILED",
                    "org_id":      org_id,
                    "timestamp":   chrono::Utc::now().to_rfc3339(),
                }));
            }
        }
    });

    Ok(Json(ExecuteJitResponse {
        transfer_id: tx.transfer_id,
        status:      format!("{:?}", tx.status).to_uppercase(),
        stellar_tx_hash: tx.stellar_tx_hash,
        message: "Transaction staged. Real Stellar execution running.".to_string(),
    }))
}
