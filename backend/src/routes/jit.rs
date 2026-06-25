// =============================================================================
// StellarFlow Backend — JIT Routing API (Phase C.5: Real Multi-Wallet Execution)
//
// Key changes from Phase C:
//   - execute_jit now spawns one real Stellar transaction per contributing wallet.
//   - Each wallet's encrypted secret is loaded from PostgreSQL, decrypted in-scope
//     using AES-256-GCM (auth/crypto.rs), and dropped immediately after signing.
//   - child_transfers table tracks per-wallet settlement independently.
//   - Parent status = SETTLED | PARTIAL_FAILURE | FAILED based on child outcomes.
//   - Idempotency: UNIQUE(parent_transfer_id, wallet_id) prevents duplicate payments.
//   - Secrets are NEVER logged, NEVER returned in API responses, NEVER in WS events.
// =============================================================================

use std::sync::Arc;
use axum::{extract::State, Json};
use bigdecimal::{BigDecimal, ToPrimitive};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::crypto::decrypt_secret,
    database::models::{
        advance_child_status, advance_transaction_status, find_wallet_secret_by_public_key,
        get_children_for_parent, insert_child_transfer, NewChildTransfer, NewTransaction,
        TransactionStatus,
    },
    database::queries::transactions as tx_queries,
    errors::AppError,
    stellar::{
        jit_aggregator::{self, bigdecimal_to_stroops, JitAllocation},
        sequence_manager,
        transaction_builder::build_and_sign_payment,
    },
    AppState,
};
use redis::aio::ConnectionManager;

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SimulateJitRequest {
    pub target_amount: f64,
    pub asset_code: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
pub struct JitAllocationDto {
    pub walletId:           String,
    pub walletName:         String,
    pub walletType:         String,
    pub publicKey:          String,
    pub amount:             f64,
    pub percentage:         f64,
    // ── Liquidity breakdown (new in v2) ──────────────────────────────────
    pub rawBalance:         f64,
    pub stellarBaseReserve: f64,
    pub feeBuffer:          f64,
    pub reserveBuffer:      f64,
    pub usableLiquidity:    f64,
    pub liquidityState:     String,
    pub exclusionReason:    Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
pub struct SimulateJitResponse {
    pub target:         f64,
    pub totalCovered:   f64,
    pub vaultsUsed:     usize,
    pub allocations:    Vec<JitAllocationDto>,
    pub isFullyCovered: bool,
    pub shortfall:      f64,
    pub timestamp:      i64,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteJitRequest {
    pub target_amount: f64,
    pub asset_code: Option<String>,
    pub destination: Option<String>,
    pub transfer_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExecuteJitResponse {
    pub transfer_id: String,
    pub status: String,
    pub message: String,
    /// Number of child transactions that will execute (one per contributing wallet).
    pub child_count: usize,
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulate JIT (unchanged from Phase C)
// ─────────────────────────────────────────────────────────────────────────────

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
            walletId:           alloc.walletId,
            walletName:         alloc.walletName,
            walletType:         alloc.walletType,
            publicKey:          alloc.publicKey,
            amount:             alloc.amount,
            percentage:         alloc.percentage,
            rawBalance:         alloc.rawBalance,
            stellarBaseReserve: alloc.stellarBaseReserve,
            feeBuffer:          alloc.feeBuffer,
            reserveBuffer:      alloc.reserveBuffer,
            usableLiquidity:    alloc.usableLiquidity,
            liquidityState:     alloc.liquidityState.to_string(),
            exclusionReason:    alloc.exclusionReason,
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

// ─────────────────────────────────────────────────────────────────────────────
// Execute JIT — Phase C.5: Real Multi-Wallet Execution
// ─────────────────────────────────────────────────────────────────────────────

pub async fn execute_jit_internal(
    state: Arc<AppState>,
    payload: ExecuteJitRequest,
) -> Result<ExecuteJitResponse, AppError> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .unwrap_or_else(|_| Uuid::nil());

    let amount_str = format!("{:.7}", payload.target_amount);
    let amount_bd = amount_str.parse::<BigDecimal>().unwrap_or_default();
    let asset_code = payload.asset_code.unwrap_or_else(|| "native".to_string());
    let destination = payload.destination.unwrap_or_else(|| {
        std::env::var("STELLAR_ADMIN_PUBLIC_KEY").unwrap_or_default()
    });

    // ── 1. Compute JIT split ───────────────────────────────────────────────────
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

    let child_count = split_result.allocations.len();

    // ── 2. Stage parent transaction ────────────────────────────────────────────
    let transfer_id = payload.transfer_id.unwrap_or_else(|| {
        format!("TX-{}", &Uuid::new_v4().simple().to_string().to_uppercase()[..8])
    });

    // Idempotency check: if children already exist for this transfer_id,
    // return the existing execution state without re-triggering Horizon.
    // First, check if the transaction exists
    let existing_tx = tx_queries::find_by_transfer_id(&state.db, &transfer_id).await.ok().flatten();
    
    let tx = if let Some(existing) = existing_tx {
        existing
    } else {
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
        tx_queries::insert(&state.db, &new_tx).await?
    };

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "TRANSIT_STATE",
        "event_type":  "TRANSACTION_STAGED",
        "ref_id":      tx.transfer_id,
        "new_status":  tx.status,
        "org_id":      org_id,
        "child_count": child_count,
        "timestamp":   chrono::Utc::now().to_rfc3339(),
    }));

    // ── 3. Spawn background multi-wallet executor ──────────────────────────────
    let bg_state     = Arc::clone(&state);
    let bg_tx_id     = tx.transfer_id.clone();
    let bg_allocs    = split_result.allocations.clone();
    let bg_dest      = destination.clone();
    let bg_aes_key   = state.config.aes_encryption_key;

    tokio::spawn(async move {
        execute_multi_wallet(
            bg_state,
            bg_tx_id,
            org_id,
            bg_allocs,
            bg_dest,
            bg_aes_key,
        ).await;
    });

    Ok(ExecuteJitResponse {
        transfer_id: tx.transfer_id,
        status: "AUTHORIZING".to_string(),
        message: format!(
            "Multi-wallet execution staged. {} child transaction(s) running.",
            child_count
        ),
        child_count,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// execute_multi_wallet — background worker
//
// Executes one real Stellar payment per contributing wallet allocation.
// Each wallet's secret is loaded from PostgreSQL, decrypted in a contained
// scope, used to sign, then dropped immediately. Never logged or broadcast.
// ─────────────────────────────────────────────────────────────────────────────

async fn execute_multi_wallet(
    state: Arc<AppState>,
    parent_tx_id: String,
    org_id: Uuid,
    allocations: Vec<JitAllocation>,
    destination: String,
    aes_key: [u8; 32],
) {
    // Brief pause for UI animation to begin
    tokio::time::sleep(std::time::Duration::from_millis(400)).await;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":       "TRANSIT_STATE",
        "event_type": "PAYOUT_ROUTED",
        "ref_id":     parent_tx_id,
        "new_status": "ROUTING",
        "org_id":     org_id,
        "timestamp":  chrono::Utc::now().to_rfc3339(),
    }));

    // ── Idempotency guard ──────────────────────────────────────────────────────
    // If children already exist (e.g. retry after crash), check their status.
    // Only execute wallets whose child record is still in AUTHORIZING state.
    let existing_children = match get_children_for_parent(&state.db, &parent_tx_id).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!(parent = %parent_tx_id, error = %e, "Failed to check existing children");
            vec![]
        }
    };

    // Track results for parent status resolution
    let mut settled_count: usize = 0;
    let mut failed_count: usize = 0;

    for alloc in &allocations {
        // ── Check for existing child (idempotency) ─────────────────────────────
        let already_exists = existing_children.iter().find(|c| {
            c.public_key == alloc.publicKey
        });

        if let Some(existing) = already_exists {
            // Child already exists — count its status and skip re-execution
            match existing.status {
                TransactionStatus::Settled => { settled_count += 1; continue; }
                TransactionStatus::Failed  => { failed_count  += 1; continue; }
                _ => {
                    // In-progress — will be executed below (AUTHORIZING state)
                }
            }
        }

        // ── Insert child transfer record ───────────────────────────────────────
        let amount_str = format!("{:.7}", alloc.amount);
        let alloc_bd = amount_str.parse::<BigDecimal>().unwrap_or_default();

        let wallet_id = match Uuid::parse_str(&alloc.walletId) {
            Ok(id) => id,
            Err(_) => {
                tracing::error!(wallet = %alloc.walletName, "Invalid wallet UUID in allocation");
                failed_count += 1;
                continue;
            }
        };

        let child = match insert_child_transfer(&state.db, &NewChildTransfer {
            parent_transfer_id: parent_tx_id.clone(),
            wallet_id,
            public_key: alloc.publicKey.clone(),
            amount: alloc_bd.clone(),
        }).await {
            Ok(c) => c,
            Err(e) => {
                tracing::error!(
                    parent = %parent_tx_id,
                    wallet = %alloc.walletName,
                    error = %e,
                    "Failed to insert child transfer"
                );
                failed_count += 1;
                continue;
            }
        };

        // Broadcast per-child AUTHORIZING event (wallet_id only — no secret)
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":        "TRANSIT_STATE",
            "event_type":  "CHILD_AUTHORIZING",
            "ref_id":      parent_tx_id,
            "child_id":    child.id,
            "wallet_id":   alloc.walletId,
            "wallet_name": alloc.walletName,
            "amount":      alloc.amount,
            "org_id":      org_id,
            "timestamp":   chrono::Utc::now().to_rfc3339(),
        }));

        // ── Load and decrypt wallet secret ─────────────────────────────────────
        // Secret exists only inside this block. It is dropped when the block ends.
        let signing_result = {
            let wallet_secret = match find_wallet_secret_by_public_key(
                &state.db,
                &alloc.publicKey,
            ).await {
                Ok(Some(ws)) => ws,
                Ok(None) => {
                    tracing::error!(
                        wallet = %alloc.walletName,
                        public_key = %alloc.publicKey,
                        // SECURITY: public key is safe to log. Never log the secret.
                        "No wallet secret registered for this public key — cannot sign."
                    );
                    drop(None::<(String, String)>); // type hint — secret not loaded
                    // Record child failure
                    let _ = advance_child_status(
                        &state.db, child.id, TransactionStatus::Failed,
                        None, None, Some("No signing secret registered"),
                    ).await;
                    failed_count += 1;

                    let _ = state.broadcast_tx.send(serde_json::json!({
                        "type":           "TRANSIT_STATE",
                        "event_type":     "CHILD_FAILED",
                        "ref_id":         parent_tx_id,
                        "child_id":       child.id,
                        "wallet_id":      alloc.walletId,
                        "wallet_name":    alloc.walletName,
                        "failure_reason": "No signing secret registered",
                        "org_id":         org_id,
                        "timestamp":      chrono::Utc::now().to_rfc3339(),
                    }));
                    continue;
                }
                Err(e) => {
                    tracing::error!(
                        wallet = %alloc.walletName,
                        error = %e,
                        "DB error loading wallet secret"
                    );
                    let _ = advance_child_status(
                        &state.db, child.id, TransactionStatus::Failed,
                        None, None, Some("DB error loading secret"),
                    ).await;
                    failed_count += 1;
                    continue;
                }
            };

            // Decrypt. Plaintext secret lives only in this inner block.
            let plaintext_secret = match decrypt_secret(&aes_key, &wallet_secret.encrypted_secret) {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!(
                        wallet = %alloc.walletName,
                        error = %e,
                        // SECURITY: error message only. Never log the secret.
                        "AES-GCM decryption failed for wallet secret"
                    );
                    let _ = advance_child_status(
                        &state.db, child.id, TransactionStatus::Failed,
                        None, None, Some("Secret decryption failed"),
                    ).await;
                    failed_count += 1;

                    let _ = state.broadcast_tx.send(serde_json::json!({
                        "type":           "TRANSIT_STATE",
                        "event_type":     "CHILD_FAILED",
                        "ref_id":         parent_tx_id,
                        "child_id":       child.id,
                        "wallet_id":      alloc.walletId,
                        "wallet_name":    alloc.walletName,
                        "failure_reason": "Secret decryption failed",
                        "org_id":         org_id,
                        "timestamp":      chrono::Utc::now().to_rfc3339(),
                    }));
                    continue;
                }
            };

            // ── Sequence management ────────────────────────────────────────────
            let mut redis_conn = match ConnectionManager::new(state.redis.clone()).await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!(wallet = %alloc.walletName, error = %e, "Redis connection failed");
                    // plaintext_secret dropped here
                    let _ = advance_child_status(
                        &state.db, child.id, TransactionStatus::Failed,
                        None, None, Some("Redis connection failed"),
                    ).await;
                    failed_count += 1;
                    continue;
                }
            };

            if let Ok(horizon_seq) = state.horizon.fetch_sequence(&alloc.publicKey).await {
                let _ = sequence_manager::seed_from_horizon(
                    &mut redis_conn, &alloc.publicKey, horizon_seq,
                ).await;
            }

            let seq = match sequence_manager::get_and_increment(
                &mut redis_conn, &alloc.publicKey,
            ).await {
                Ok(s) => s,
                Err(_) => {
                    state.horizon.fetch_sequence(&alloc.publicKey).await.unwrap_or(0) + 1
                }
            };

            let amount_stroops = bigdecimal_to_stroops(&alloc_bd);

            // ── Build and sign XDR ─────────────────────────────────────────────
            // `plaintext_secret` is consumed by build_and_sign_payment.
            // It is dropped at the end of this block regardless of outcome.
            let build_result = build_and_sign_payment(
                &plaintext_secret,
                &destination,
                amount_stroops as i64,
                seq,
            );

            // plaintext_secret is dropped here — no longer in scope
            build_result
        };
        // Secret is now fully out of scope.

        // ── Submit to Horizon ──────────────────────────────────────────────────
        let (hash_hex, xdr_base64) = match signing_result {
            Ok(pair) => pair,
            Err(e) => {
                tracing::error!(
                    wallet = %alloc.walletName,
                    error = %e,
                    "Transaction build/sign failed"
                );
                let _ = advance_child_status(
                    &state.db, child.id, TransactionStatus::Failed,
                    None, None, Some(&format!("Build failed: {e}")),
                ).await;
                failed_count += 1;

                let _ = state.broadcast_tx.send(serde_json::json!({
                    "type":           "TRANSIT_STATE",
                    "event_type":     "CHILD_FAILED",
                    "ref_id":         parent_tx_id,
                    "child_id":       child.id,
                    "wallet_id":      alloc.walletId,
                    "wallet_name":    alloc.walletName,
                    "failure_reason": format!("Transaction build failed: {e}"),
                    "org_id":         org_id,
                    "timestamp":      chrono::Utc::now().to_rfc3339(),
                }));
                continue;
            }
        };

        // Broadcast STELLAR_LEDGER event before submission
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":              "TRANSIT_STATE",
            "event_type":        "CHILD_SUBMITTED",
            "ref_id":            parent_tx_id,
            "new_status":        "STELLAR_LEDGER",
            "child_id":          child.id,
            "wallet_id":         alloc.walletId,
            "wallet_name":       alloc.walletName,
            "stellar_tx_hash":   hash_hex,
            "org_id":            org_id,
            "timestamp":         chrono::Utc::now().to_rfc3339(),
        }));

        match state.horizon.submit_transaction(&xdr_base64).await {
            Ok(result) => {
                tracing::info!(
                    wallet = %alloc.walletName,
                    wallet_id = %alloc.walletId,
                    tx_hash = %result.hash,
                    ledger = result.ledger,
                    // SECURITY: tx_hash and ledger are safe to log. Secret never logged.
                    "Child transfer settled on Horizon"
                );

                let _ = advance_child_status(
                    &state.db,
                    child.id,
                    TransactionStatus::Settled,
                    Some(&result.hash),
                    Some(result.ledger),
                    None,
                ).await;

                let _ = state.broadcast_tx.send(serde_json::json!({
                    "type":             "TRANSIT_STATE",
                    "event_type":       "CHILD_SETTLED",
                    "ref_id":           parent_tx_id,
                    "child_id":         child.id,
                    "wallet_id":        alloc.walletId,
                    "wallet_name":      alloc.walletName,
                    "stellar_tx_hash":  result.hash,
                    "ledger_sequence":  result.ledger,
                    "org_id":           org_id,
                    "timestamp":        chrono::Utc::now().to_rfc3339(),
                }));

                settled_count += 1;
            }
            Err(e) => {
                let reason = format!("Horizon submission failed: {e}");
                tracing::error!(
                    wallet = %alloc.walletName,
                    wallet_id = %alloc.walletId,
                    error = %e,
                    "Child transfer rejected by Horizon"
                );

                // --- NEW CODE: Sequence Recovery ---
                if let Ok(correct_seq) = state.horizon.fetch_sequence(&alloc.publicKey).await {
                    if let Ok(mut redis_conn) = redis::aio::ConnectionManager::new(state.redis.clone()).await {
                        let _ = crate::stellar::sequence_manager::reset_to(&mut redis_conn, &alloc.publicKey, correct_seq).await;
                        
                        let _ = sqlx::query(
                            "INSERT INTO audit_logs (org_id, transfer_id, actor_id, action, metadata) VALUES ($1, $2, 'system', 'SEQUENCE_RECOVERY', $3)"
                        )
                        .bind(org_id)
                        .bind(&parent_tx_id)
                        .bind(serde_json::json!({
                            "wallet_id": alloc.walletId,
                            "wallet_name": alloc.walletName,
                            "public_key": alloc.publicKey,
                            "recovered_sequence": correct_seq,
                            "error": e.to_string()
                        }))
                        .execute(&state.db).await;
                    }
                }
                // --- END NEW CODE ---

                let _ = advance_child_status(
                    &state.db,
                    child.id,
                    TransactionStatus::Failed,
                    Some(&hash_hex),
                    None,
                    Some(&reason),
                ).await;

                let _ = state.broadcast_tx.send(serde_json::json!({
                    "type":           "TRANSIT_STATE",
                    "event_type":     "CHILD_FAILED",
                    "ref_id":         parent_tx_id,
                    "child_id":       child.id,
                    "wallet_id":      alloc.walletId,
                    "wallet_name":    alloc.walletName,
                    "stellar_tx_hash": hash_hex,
                    "failure_reason": reason,
                    "org_id":         org_id,
                    "timestamp":      chrono::Utc::now().to_rfc3339(),
                }));

                failed_count += 1;
            }
        }
    }

    // ── Resolve parent transaction status ──────────────────────────────────────
    let (parent_status, event_type) = if failed_count == 0 {
        (TransactionStatus::Settled, "TRANSACTION_SETTLED")
    } else if settled_count == 0 {
        (TransactionStatus::Failed, "TRANSACTION_FAILED")
    } else {
        (TransactionStatus::PartialFailure, "TRANSACTION_PARTIAL")
    };

    let _ = advance_transaction_status(
        &state.db,
        &parent_tx_id,
        parent_status,
        None,
        None,
    ).await;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":          "TRANSIT_STATE",
        "event_type":    event_type,
        "ref_id":        parent_tx_id,
        "new_status":    if failed_count == 0 { "SETTLED" } else if settled_count == 0 { "FAILED" } else { "PARTIAL_FAILURE" },
        "org_id":        org_id,
        "settled_count": settled_count,
        "failed_count":  failed_count,
        "timestamp":     chrono::Utc::now().to_rfc3339(),
    }));

    tracing::info!(
        parent = %parent_tx_id,
        settled = settled_count,
        failed = failed_count,
        "Multi-wallet JIT execution complete"
    );
}
