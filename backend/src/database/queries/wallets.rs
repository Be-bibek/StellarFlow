// =============================================================================
// StellarFlow Backend — Wallet Repository Queries
//
// All queries in this module use `sqlx::query_as!` for compile-time SQL
// verification. They are designed to be called from:
//   - jit_aggregator.rs  (list_active for balance aggregation)
//   - routes/treasury.rs (CRUD for the Wallet Management dashboard panel)
//
// These functions wrap sqlx errors as `AppError::Database` via the From impl
// in errors.rs so route handlers receive a consistent error type.
// =============================================================================

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    database::models::{NewWallet, Wallet, WalletType},
    errors::AppError,
};

// ─────────────────────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────────────────────

/// Return all ACTIVE wallets for an organisation, ordered by wallet_type priority
/// (MASTER first). This ordering is critical for the JIT greedy fill algorithm.
///
/// PostgreSQL CASE ordering matches the priority matrix in `jit_aggregator.rs`:
///   MASTER(0) → PAYROLL(1) → OPERATIONS(2) → RESERVE(3) → MARKETING(4) → ESCROW(5)
pub async fn list_active(pool: &PgPool, org_id: Uuid) -> Result<Vec<Wallet>, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        SELECT
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        FROM wallets
        WHERE org_id = $1
          AND is_active = TRUE
        ORDER BY
            CASE wallet_type
                WHEN 'MASTER'     THEN 0
                WHEN 'PAYROLL'    THEN 1
                WHEN 'OPERATIONS' THEN 2
                WHEN 'RESERVE'    THEN 3
                WHEN 'MARKETING'  THEN 4
                WHEN 'ESCROW'     THEN 5
                ELSE 99
            END ASC,
            registered_at ASC
        "#
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

/// Return all wallets for an organisation (including inactive), for admin view.
pub async fn list_all(pool: &PgPool, org_id: Uuid) -> Result<Vec<Wallet>, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        SELECT
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        FROM wallets
        WHERE org_id = $1
        ORDER BY registered_at ASC
        "#
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

/// Fetch a single wallet by its internal UUID.
pub async fn find_by_id(pool: &PgPool, wallet_id: Uuid) -> Result<Option<Wallet>, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        SELECT
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        FROM wallets
        WHERE id = $1
        "#
    )
    .bind(wallet_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

/// Fetch a wallet by its Stellar public key (G-address).
/// Used to look up wallet metadata after a Horizon balance fetch.
pub async fn find_by_public_key(
    pool: &PgPool,
    public_key: &str,
) -> Result<Option<Wallet>, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        SELECT
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        FROM wallets
        WHERE public_key = $1
        "#
    )
    .bind(public_key)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

// ─────────────────────────────────────────────────────────────────────────────
// Write queries
// ─────────────────────────────────────────────────────────────────────────────

/// Insert a new wallet record into the `wallets` table.
///
/// Returns the fully-populated `Wallet` row (including the generated UUID
/// and `registered_at` timestamp from PostgreSQL's `DEFAULT` clause).
pub async fn insert(pool: &PgPool, new_wallet: &NewWallet) -> Result<Wallet, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        INSERT INTO wallets (org_id, wallet_name, public_key, wallet_type, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        "#
    )
    .bind(new_wallet.org_id)
    .bind(&new_wallet.wallet_name)
    .bind(&new_wallet.public_key)
    .bind(new_wallet.wallet_type.clone() as WalletType)
    .bind(&new_wallet.description)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

/// Toggle the `is_active` flag on a wallet.
///
/// Deactivating a wallet excludes it from JIT splits and analytics.
/// It is NOT deleted — its transaction history is preserved.
pub async fn set_active(
    pool: &PgPool,
    wallet_id: Uuid,
    active: bool,
) -> Result<Wallet, AppError> {
    sqlx::query_as::<_, Wallet>(
        r#"
        UPDATE wallets
        SET is_active  = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            id, org_id, wallet_name, public_key,
            wallet_type,
            description, is_active,
            registered_at, updated_at
        "#
    )
    .bind(wallet_id)
    .bind(active)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate / analytics queries
// ─────────────────────────────────────────────────────────────────────────────

/// A lightweight balance snapshot row for dashboard display.
/// Populated by joining wallet metadata with recent transaction aggregates.
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct WalletSnapshot {
    pub wallet_id:    Uuid,
    pub wallet_name:  String,
    pub public_key:   String,
    pub wallet_type:  WalletType,
    /// Total amount settled through this wallet (as source) in last 30 days.
    pub volume_30d:   Option<bigdecimal::BigDecimal>,
    /// Count of transactions where this wallet was the primary source.
    pub tx_count_30d: Option<i64>,
    pub registered_at: DateTime<Utc>,
}

/// Return a 30-day volume snapshot for all active wallets of an organisation.
///
/// Joins `wallets` with `transactions` using the JSONB `source_breakdown` field
/// to aggregate volume per-vault. Returns rows sorted by volume descending.
///
/// NOTE: This query uses `source_breakdown` JSONB containment — ensure the
/// GIN index on `source_breakdown` in schema.sql is present for performance.
pub async fn volume_snapshot(
    pool: &PgPool,
    org_id: Uuid,
) -> Result<Vec<WalletSnapshot>, AppError> {
    sqlx::query_as::<_, WalletSnapshot>(
        r#"
        SELECT
            w.id           AS wallet_id,
            w.wallet_name,
            w.public_key,
            w.wallet_type,
            w.registered_at,
            SUM(
                CASE
                    WHEN t.source_breakdown ? w.public_key
                    THEN (t.source_breakdown ->> w.public_key)::NUMERIC
                    ELSE 0
                END
            )              AS volume_30d,
            COUNT(DISTINCT t.id) FILTER (
                WHERE t.source_breakdown ? w.public_key
                  AND t.status = 'SETTLED'
            )               AS tx_count_30d
        FROM wallets w
        LEFT JOIN transactions t
               ON t.org_id = w.org_id
              AND t.created_at >= NOW() - INTERVAL '30 days'
              AND t.status = 'SETTLED'
        WHERE w.org_id = $1
          AND w.is_active = TRUE
        GROUP BY w.id, w.wallet_name, w.public_key, w.wallet_type, w.registered_at
        ORDER BY volume_30d DESC NULLS LAST
        "#
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}
