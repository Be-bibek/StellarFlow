// =============================================================================
// StellarFlow Backend — Just-In-Time Multi-Wallet Treasury Aggregation Engine
//
// This module implements the core JIT splitting algorithm described in the
// architecture blueprint (§3a). It answers the question:
//
//   "Given a target payment amount, which of our vaults should contribute
//    how much, preserving a safe liquidity floor in each, and prioritising
//    higher-rank wallets first?"
//
// Liquidity floor model (v2 — Base Reserve Aware):
//
//   For each wallet, the *usable* (spendable) balance is:
//
//     usable = raw_balance
//              - STELLAR_BASE_RESERVE      (Stellar network minimum: 1.0 XLM)
//              - FEE_BUFFER                (covers Stellar tx fee: 0.01 XLM)
//              - (raw_balance × TREASURY_BUFFER_PCT)  (org policy: 5%)
//
//   If usable ≤ 0, the wallet is RESERVE_LOCKED and is excluded from
//   allocation. This prevents Horizon op_underfunded errors on small wallets.
//
// Algorithm overview:
//   1. Load all active wallets for the organisation from PostgreSQL.
//   2. Concurrently fetch live XLM/asset balances from the Stellar Horizon API.
//   3. Compute WalletLiquidityState for each wallet.
//   4. Sort eligible wallets by priority ranking (`WalletType`).
//   5. Greedy fill loop over eligible wallets only.
//   6. Return `JitSplitResult` with full per-wallet diagnostics.
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
// Network & Policy Constants
// ─────────────────────────────────────────────────────────────────────────────

/// Stellar protocol minimum balance per account.
/// Every account must always retain at least this many XLM.
/// Source: https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#base-reserves
/// Testnet and Mainnet both use 1.0 XLM (0.5 XLM base + 0.5 XLM per subentry minimum).
/// We use 1.0 as the safe floor.
pub const STELLAR_BASE_RESERVE: f64 = 1.0;

/// Extra XLM reserved per transaction to cover Stellar network fees.
/// Current default fee is 100 stroops = 0.00001 XLM per op.
/// We reserve 0.01 XLM (1000 stroops) per wallet to safely cover surge pricing.
pub const FEE_BUFFER: f64 = 0.01;

/// Organisation policy: retain this fraction of each wallet's raw balance
/// untouched as operational float, on top of the Stellar base reserve.
pub const TREASURY_BUFFER_PCT: f64 = 0.05; // 5%

// ─────────────────────────────────────────────────────────────────────────────
// Liquidity State Classification
// ─────────────────────────────────────────────────────────────────────────────

/// Describes why a wallet was or was not eligible for JIT allocation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WalletLiquidityState {
    /// Wallet has sufficient usable balance to contribute to the allocation.
    Healthy,
    /// Wallet has some balance but not enough to contribute after all deductions.
    /// It exists but is near the reserve floor.
    LowLiquidity,
    /// Wallet's entire balance is consumed by base reserve + fee buffer alone —
    /// any send would be rejected by Horizon with op_underfunded.
    ReserveLocked,
}

impl std::fmt::Display for WalletLiquidityState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WalletLiquidityState::Healthy      => write!(f, "HEALTHY"),
            WalletLiquidityState::LowLiquidity => write!(f, "LOW_LIQUIDITY"),
            WalletLiquidityState::ReserveLocked=> write!(f, "RESERVE_LOCKED"),
        }
    }
}

use serde::Serialize;

// ─────────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────────

/// Full diagnostic breakdown for a single wallet evaluated during JIT planning.
#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize)]
pub struct JitAllocation {
    pub walletId:           String,
    pub walletName:         String,
    pub walletType:         String,
    pub publicKey:          String,

    /// The amount this wallet will actually send.
    pub amount:             f64,
    pub percentage:         f64,

    // ── Liquidity breakdown ──────────────────────────────────────────────────
    /// Live balance fetched from Horizon.
    pub rawBalance:         f64,
    /// Amount withheld as Stellar Base Reserve (network rule).
    pub stellarBaseReserve: f64,
    /// Amount withheld as transaction fee buffer.
    pub feeBuffer:          f64,
    /// Amount withheld as org treasury buffer (5% policy).
    pub reserveBuffer:      f64,
    /// Spendable balance = rawBalance - stellarBaseReserve - feeBuffer - reserveBuffer.
    pub usableLiquidity:    f64,

    /// Current classification of this wallet's liquidity health.
    pub liquidityState:     WalletLiquidityState,
    /// Human-readable explanation if the wallet was excluded.
    pub exclusionReason:    Option<String>,
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

    /// Number of distinct vaults that will send funds.
    pub vaults_used: usize,

    /// Full per-wallet breakdown (eligible AND excluded wallets).
    pub allocations: Vec<JitAllocation>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority ordering
// ─────────────────────────────────────────────────────────────────────────────

fn wallet_priority(wallet_type: &WalletType) -> u8 {
    match wallet_type {
        WalletType::Master     => 0,
        WalletType::Payroll    => 1,
        WalletType::Operations => 2,
        WalletType::Reserve    => 3,
        WalletType::Marketing  => 4,
        WalletType::Escrow     => 5,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core liquidity computation
// ─────────────────────────────────────────────────────────────────────────────

/// Compute the spendable amount for a wallet given its raw balance.
///
/// Returns `(usable, stellar_base_reserve_deducted, fee_buffer_deducted, treasury_buffer_deducted)`.
pub fn compute_usable_liquidity(raw: f64) -> (f64, f64, f64, f64) {
    let treasury_buffer = raw * TREASURY_BUFFER_PCT;
    let usable = raw - STELLAR_BASE_RESERVE - FEE_BUFFER - treasury_buffer;
    let usable = if usable < 0.0 { 0.0 } else { usable };
    (usable, STELLAR_BASE_RESERVE, FEE_BUFFER, treasury_buffer)
}

/// Classify a wallet's liquidity state from its usable balance and raw balance.
pub fn classify_liquidity(raw: f64, usable: f64) -> (WalletLiquidityState, Option<String>) {
    // Threshold below which sending is impossible: base reserve + fee buffer alone consume the whole balance
    let locked_floor = STELLAR_BASE_RESERVE + FEE_BUFFER;

    if raw <= locked_floor {
        (
            WalletLiquidityState::ReserveLocked,
            Some(format!(
                "Raw balance {:.4} XLM is entirely consumed by Stellar base reserve ({:.2} XLM) and fee buffer ({:.4} XLM). No spendable balance.",
                raw, STELLAR_BASE_RESERVE, FEE_BUFFER
            )),
        )
    } else if usable <= 0.0 {
        (
            WalletLiquidityState::LowLiquidity,
            Some(format!(
                "Usable liquidity is 0 after deducting base reserve, fee buffer, and 5% treasury buffer from {:.4} XLM.",
                raw
            )),
        )
    } else {
        (WalletLiquidityState::Healthy, None)
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

    // ── 3. Pair wallets with their raw balances ───────────────────────────────
    let wallet_balances: Vec<(&crate::database::models::Wallet, f64)> = wallets
        .iter()
        .zip(raw_results.into_iter())
        .filter_map(|(wallet, result)| match result {
            Ok(ref bal_str) => bal_str.parse::<f64>().ok().map(|b| (wallet, b)),
            Err(_) => None,
        })
        .collect();

    if wallet_balances.is_empty() {
        return Err(AppError::HorizonError(
            "All Horizon balance fetches failed — cannot compute JIT split".into(),
        ));
    }

    // ── 4. Sort by priority ───────────────────────────────────────────────────
    let mut wallet_balances = wallet_balances;
    wallet_balances.sort_by_key(|(wallet, _)| wallet_priority(&wallet.wallet_type));

    // ── 5. Compute usable liquidity for each wallet ───────────────────────────
    let zero_bd = BigDecimal::from(0);
    let mut breakdown: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();
    let mut remaining = target_amount.clone();
    let mut all_allocations: Vec<JitAllocation> = Vec::new();

    for (wallet, raw_balance) in &wallet_balances {
        let (usable, stellar_base_reserve, fee_buf, treasury_buf) =
            compute_usable_liquidity(*raw_balance);
        let (liquidity_state, exclusion_reason) = classify_liquidity(*raw_balance, usable);

        // Skip wallets that are reserve-locked or have zero usable liquidity
        if liquidity_state != WalletLiquidityState::Healthy || remaining <= zero_bd {
            all_allocations.push(JitAllocation {
                walletId:           wallet.id.to_string(),
                walletName:         wallet.wallet_name.clone(),
                walletType:         format!("{:?}", wallet.wallet_type).to_uppercase(),
                publicKey:          wallet.public_key.clone(),
                amount:             0.0,
                percentage:         0.0,
                rawBalance:         *raw_balance,
                stellarBaseReserve: stellar_base_reserve,
                feeBuffer:          fee_buf,
                reserveBuffer:      treasury_buf,
                usableLiquidity:    usable,
                liquidityState:     if liquidity_state != WalletLiquidityState::Healthy {
                    liquidity_state
                } else {
                    WalletLiquidityState::Healthy // remaining == 0, allocation satisfied
                },
                exclusionReason: if remaining <= zero_bd {
                    None // Not excluded, just not needed
                } else {
                    exclusion_reason
                },
            });
            continue;
        }

        // Safe to allocate from this wallet
        let usable_bd = BigDecimal::from_str(&format!("{:.7}", usable)).unwrap_or_default();
        let take = usable_bd.clone().min(remaining.clone());
        remaining -= &take;

        let take_f64 = take.to_f64().unwrap_or(0.0);

        breakdown.insert(
            wallet.public_key.clone(),
            serde_json::json!(take.to_string()),
        );

        all_allocations.push(JitAllocation {
            walletId:           wallet.id.to_string(),
            walletName:         wallet.wallet_name.clone(),
            walletType:         format!("{:?}", wallet.wallet_type).to_uppercase(),
            publicKey:          wallet.public_key.clone(),
            amount:             take_f64,
            percentage:         0.0, // filled in below
            rawBalance:         *raw_balance,
            stellarBaseReserve: stellar_base_reserve,
            feeBuffer:          fee_buf,
            reserveBuffer:      treasury_buf,
            usableLiquidity:    usable,
            liquidityState:     WalletLiquidityState::Healthy,
            exclusionReason:    None,
        });
    }

    let is_fully_covered = remaining <= zero_bd;
    let shortfall = remaining.max(zero_bd.clone());
    let total_covered = target_amount.clone() - shortfall.clone();
    let total_covered_f64 = total_covered.to_f64().unwrap_or(0.0);

    // Fill in percentages for contributing wallets
    for alloc in &mut all_allocations {
        if alloc.amount > 0.0 && total_covered_f64 > 0.0 {
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
        allocations: all_allocations,
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

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: assert that the usable liquidity calculation is correct
    /// and matches the expected classification.
    fn check(
        raw: f64,
        expected_usable: f64,
        expected_state: WalletLiquidityState,
    ) {
        let (usable, base_res, fee_buf, treas_buf) = compute_usable_liquidity(raw);
        let (state, reason) = classify_liquidity(raw, usable);

        // Verify individual deductions
        assert_eq!(base_res, STELLAR_BASE_RESERVE, "base reserve mismatch");
        assert_eq!(fee_buf, FEE_BUFFER, "fee buffer mismatch");
        let expected_treas = raw * TREASURY_BUFFER_PCT;
        assert!(
            (treas_buf - expected_treas).abs() < 1e-9,
            "treasury buffer mismatch: got {treas_buf}, expected {expected_treas}"
        );

        // Usable must never be negative
        assert!(usable >= 0.0, "usable balance must be >= 0, got {usable}");

        // Approximate match (floating point)
        assert!(
            (usable - expected_usable).abs() < 1e-6,
            "usable liquidity: expected {expected_usable:.6}, got {usable:.6}"
        );

        assert_eq!(
            state, expected_state,
            "liquidity state mismatch for raw={raw}: reason={:?}", reason
        );
    }

    /// A 1.25 XLM wallet — only 0.24 XLM above base reserve.
    /// After fee buffer (0.01) and 5% buffer (0.0625) the usable drops to 0.1775.
    /// But wait: 1.25 - 1.0 - 0.01 - (1.25*0.05) = 1.25 - 1.0 - 0.01 - 0.0625 = 0.1775
    /// Classified HEALTHY (has > 0 usable).
    #[test]
    fn test_wallet_1_25_xlm() {
        // usable = 1.25 - 1.0 - 0.01 - (1.25 * 0.05)
        //        = 1.25 - 1.0 - 0.01 - 0.0625
        //        = 0.1775
        check(1.25, 0.1775, WalletLiquidityState::Healthy);
    }

    /// A 2 XLM wallet.
    /// usable = 2.0 - 1.0 - 0.01 - (2.0 * 0.05) = 2.0 - 1.0 - 0.01 - 0.10 = 0.89
    #[test]
    fn test_wallet_2_xlm() {
        check(2.0, 0.89, WalletLiquidityState::Healthy);
    }

    /// A 10 XLM wallet.
    /// usable = 10.0 - 1.0 - 0.01 - (10.0 * 0.05) = 10.0 - 1.0 - 0.01 - 0.50 = 8.49
    #[test]
    fn test_wallet_10_xlm() {
        check(10.0, 8.49, WalletLiquidityState::Healthy);
    }

    /// A 10,000 XLM wallet (large treasury vault like Marketing).
    /// usable = 10000.0 - 1.0 - 0.01 - (10000.0 * 0.05)
    ///        = 10000.0 - 1.0 - 0.01 - 500.0
    ///        = 9498.99
    #[test]
    fn test_wallet_10000_xlm() {
        check(10000.0, 9498.99, WalletLiquidityState::Healthy);
    }

    /// An account that is exactly at or below the locked floor (base_reserve + fee).
    /// E.g. 1.005 XLM — balance is ≤ 1.01 floor.
    #[test]
    fn test_wallet_reserve_locked() {
        // 1.005 XLM — locked floor is 1.01 XLM, so raw <= locked_floor
        let (usable, _, _, _) = compute_usable_liquidity(1.005);
        let (state, reason) = classify_liquidity(1.005, usable);
        assert_eq!(usable, 0.0, "usable must be 0 for reserve-locked wallet");
        assert_eq!(state, WalletLiquidityState::ReserveLocked);
        assert!(reason.is_some(), "must have an exclusion reason");
    }

    /// Sanity: usable is always >= 0, never negative, even for tiny balances.
    #[test]
    fn test_usable_never_negative() {
        for raw in [0.0_f64, 0.01, 0.5, 0.99, 1.0, 1.01, 1.1] {
            let (usable, _, _, _) = compute_usable_liquidity(raw);
            assert!(usable >= 0.0, "usable negative for raw={raw}: got {usable}");
        }
    }

    /// Before fix: a 1.25 XLM wallet with only 5% buffer would be allocated
    /// 1.1875 XLM, leaving 0.0625 XLM in the account — below base reserve!
    /// After fix: usable is 0.1775 XLM, leaving safe residual.
    #[test]
    fn test_before_vs_after_fix() {
        let raw = 1.2499;

        // Before (broken): 5% buffer only
        let broken_available = raw - (raw * 0.05);
        let broken_residual = raw - broken_available;
        assert!(
            broken_residual < STELLAR_BASE_RESERVE,
            "BEFORE fix: residual {broken_residual:.4} < base reserve {STELLAR_BASE_RESERVE} — confirms op_underfunded"
        );

        // After (fixed): base reserve + fee buffer + 5% buffer
        let (usable, _, _, _) = compute_usable_liquidity(raw);
        let safe_residual = raw - usable;
        assert!(
            safe_residual >= STELLAR_BASE_RESERVE,
            "AFTER fix: residual {safe_residual:.4} must be >= base reserve {STELLAR_BASE_RESERVE}"
        );
    }
}
