// =============================================================================
// StellarFlow Backend — Just-In-Time Multi-Wallet Treasury Aggregation Engine
//
// This module implements the core JIT splitting algorithm described in the
// architecture blueprint (§3a). It answers the question:
//
//   "Given a target payment amount, which of our vaults should contribute
//    how much, preserving a 5% liquid reserve in each, and prioritising
//    higher-rank wallets first?"
//
// Algorithm overview:
//   1. Load all active wallets for the organisation from PostgreSQL.
//   2. Concurrently fetch live XLM/asset balances from the Stellar Horizon API
//      (parallel reqwest calls via `futures::future::join_all`).
//   3. Sort wallets by the priority ranking defined in `WalletType`.
//   4. Greedy fill loop:
//        available = raw_balance × (1 - 0.05)   ← 5% reserve buffer untouched
//        take      = min(available, remaining)
//        append to source_breakdown map
//        remaining -= take
//   5. Return `JitSplitResult` containing the breakdown JSONB, allocations, and shortfall info.
// =============================================================================

use std::str::FromStr;

use bigdecimal::{BigDecimal, ToPrimitive};
use futures::future;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    database::{
        models::WalletType,
        queries::wallets as wallet_queries,
    },
    errors::AppError,
    stellar::horizon_client::HorizonClient,
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/// The fraction of each vault's balance that must remain untouched as a liquid
/// reserve to cover operational float and Stellar minimum balance requirements.
const RESERVE_BUFFER_FRACTION: f64 = 0.05; // 5%

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[derive(Debug, Clone)]
pub struct JitAllocation {
    pub walletId: String,
    pub walletName: String,
    pub walletType: String,
    pub publicKey: String,
    pub amount: f64,
    pub percentage: f64,
    pub available: f64,
    pub rawBalance: f64,
}

/// Output of a successful JIT split computation.
#[derive(Debug, Clone)]
pub struct JitSplitResult {
    /// A JSON object mapping each contributing vault's public key to its
    /// allocated amount (as a decimal string). Suitable for direct storage
    /// in the `source_breakdown` JSONB column.
    pub source_breakdown: serde_json::Value,

    /// Total amount covered by the available vaults.
    pub total_covered: BigDecimal,

    /// How much was still needed but unavailable.
    pub shortfall: BigDecimal,

    /// Whether the target amount was fully satisfied.
    pub is_fully_covered: bool,

    /// Number of distinct vaults that contributed to the split.
    pub vaults_used: usize,

    /// Detailed breakdown for the frontend UI.
    pub allocations: Vec<JitAllocation>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority ordering
// ─────────────────────────────────────────────────────────────────────────────

fn wallet_priority(wallet_type: &WalletType) -> u8 {
    match wallet_type {
        WalletType::Master    => 0,
        WalletType::Payroll   => 1,
        WalletType::Operations => 2,
        WalletType::Reserve   => 3,
        WalletType::Marketing => 4,
        WalletType::Escrow    => 5,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core split function
// ─────────────────────────────────────────────────────────────────────────────

pub async fn compute_jit_split(
    pool: &PgPool,
    horizon: &HorizonClient,
    org_id: Uuid,
    target_amount: BigDecimal,
    asset_code: &str,
) -> Result<JitSplitResult, AppError> {
    // ── 1. Load all active wallets for this organisation ──────────────────────
    let wallets: Vec<crate::database::models::Wallet> = wallet_queries::list_active(pool, org_id).await?;

    if wallets.is_empty() {
        return Err(AppError::NotFound(format!(
            "Organisation {org_id} has no active wallets registered"
        )));
    }

    // ── 2. Concurrently fetch live balances from Horizon ─────────────────────
    let balance_futures: Vec<_> = wallets
        .iter()
        .map(|w| horizon.fetch_balance(&w.public_key, asset_code))
        .collect();

    let raw_results: Vec<Result<String, AppError>> = future::join_all(balance_futures).await;

    // ── 3. Pair wallets with their balances ────────────────────────────
    let mut wallet_balances: Vec<(&crate::database::models::Wallet, BigDecimal)> = wallets
        .iter()
        .zip(raw_results.into_iter())
        .filter_map(|(wallet, result)| match result {
            Ok(ref bal_str) => {
                match BigDecimal::from_str(bal_str) {
                    Ok(bal) => Some((wallet, bal)),
                    Err(_) => None,
                }
            }
            Err(_) => None,
        })
        .collect();

    if wallet_balances.is_empty() {
        return Err(AppError::HorizonError(
            "All Horizon balance fetches failed — cannot compute JIT split".into(),
        ));
    }

    // ── 4. Sort wallets by priority ──────────────────────────────────────────
    wallet_balances.sort_by_key(|(wallet, _)| wallet_priority(&wallet.wallet_type));

    // ── 5. Greedy fill loop with 5% reserve buffer ───────────────────────────
    let zero = BigDecimal::from(0);
    let reserve_fraction = BigDecimal::from_str(&RESERVE_BUFFER_FRACTION.to_string())
        .unwrap_or(BigDecimal::from(5) / BigDecimal::from(100));

    let mut breakdown: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let mut remaining = target_amount.clone();
    let mut allocations = Vec::new();

    for (wallet, raw_balance) in &wallet_balances {
        if remaining <= zero {
            break; 
        }

        let reserve_amount = raw_balance * &reserve_fraction;
        let available: BigDecimal = (raw_balance - reserve_amount).max(zero.clone());

        if available <= zero {
            continue;
        }

        let take = available.clone().min(remaining.clone());
        remaining -= &take;

        breakdown.insert(
            wallet.public_key.clone(),
            serde_json::json!(take.to_string()),
        );

        allocations.push(JitAllocation {
            walletId: wallet.id.to_string(),
            walletName: wallet.wallet_name.clone(),
            walletType: format!("{:?}", wallet.wallet_type).to_uppercase(),
            publicKey: wallet.public_key.clone(),
            amount: take.to_f64().unwrap_or(0.0),
            percentage: 0.0,
            available: available.to_f64().unwrap_or(0.0),
            rawBalance: raw_balance.to_f64().unwrap_or(0.0),
        });
    }

    let is_fully_covered = remaining <= zero;
    let shortfall = remaining.max(zero.clone());
    let total_covered = target_amount.clone() - shortfall.clone();
    
    // Calculate percentage covered for each allocation
    let total_covered_f64 = total_covered.to_f64().unwrap_or(0.0);
    for alloc in &mut allocations {
        if total_covered_f64 > 0.0 {
            alloc.percentage = (alloc.amount / total_covered_f64) * 100.0;
        }
    }

    let vaults_used = breakdown.len();

    Ok(JitSplitResult {
        source_breakdown: serde_json::Value::Object(breakdown),
        total_covered,
        shortfall,
        is_fully_covered,
        vaults_used,
        allocations,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

pub fn bigdecimal_to_stroops(amount: &BigDecimal) -> i128 {
    let stroops = amount * BigDecimal::from(10_000_000i64);
    stroops
        .to_string()
        .split('.')
        .next()
        .and_then(|s| s.parse::<i128>().ok())
        .unwrap_or(0)
}
