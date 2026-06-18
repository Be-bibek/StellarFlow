// =============================================================================
// StellarFlow Backend — Transaction Repository Queries
//
// All queries use `sqlx::query_as!` for compile-time SQL verification.
//
// State machine enforced by the schema:
//   AUTHORIZING → ROUTING → STELLAR_LEDGER → SETTLED
//                                          ↘ FAILED
//
// The `advance_status` function here is an augmented version of the one in
// models.rs that also returns structured errors instead of raw sqlx::Error.
// =============================================================================

use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    database::models::{NewTransaction, Transaction, TransactionStatus},
    errors::AppError,
};

// ─────────────────────────────────────────────────────────────────────────────
// Write operations
// ─────────────────────────────────────────────────────────────────────────────

/// Stage a new transaction record at `AUTHORIZING` status.
///
/// This is the first call in the payment pipeline — it records the intent
/// and the computed JIT routing breakdown before any Stellar transaction
/// is submitted. Idempotency is handled at the service layer via `transfer_id`.
pub async fn insert(pool: &PgPool, tx: &NewTransaction) -> Result<Transaction, AppError> {
    sqlx::query_as::<_, Transaction>(
        r#"
        INSERT INTO transactions (
            transfer_id, org_id, amount, asset_code,
            destination, source_breakdown, batch_id, recipient_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        "#
    )
    .bind(&tx.transfer_id)
    .bind(tx.org_id)
    .bind(&tx.amount)
    .bind(&tx.asset_code)
    .bind(&tx.destination)
    .bind(&tx.source_breakdown)
    .bind(tx.batch_id)
    .bind(tx.recipient_count)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

/// Advance a transaction through the state machine.
///
/// Updates the appropriate timestamp column (`routing_at`, `submitted_at`,
/// `settled_at`, `failed_at`) based on the new status, and optionally records
/// the Stellar transaction hash and ledger sequence.
///
/// Returns the updated `Transaction` row for WebSocket broadcast or audit logging.
pub async fn advance_status(
    pool: &PgPool,
    transfer_id: &str,
    new_status: TransactionStatus,
    stellar_tx_hash: Option<&str>,
    ledger_sequence: Option<i64>,
) -> Result<Transaction, AppError> {
    sqlx::query_as::<_, Transaction>(
        r#"
        UPDATE transactions
        SET
            status          = $2,
            stellar_tx_hash = COALESCE($3, stellar_tx_hash),
            ledger_sequence = COALESCE($4, ledger_sequence),
            routing_at      = CASE WHEN $2 = 'ROUTING'        THEN NOW() ELSE routing_at  END,
            submitted_at    = CASE WHEN $2 = 'STELLAR_LEDGER' THEN NOW() ELSE submitted_at END,
            settled_at      = CASE WHEN $2 = 'SETTLED'        THEN NOW() ELSE settled_at  END,
            failed_at       = CASE WHEN $2 = 'FAILED'         THEN NOW() ELSE failed_at   END
        WHERE transfer_id = $1
        RETURNING
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        "#
    )
    .bind(transfer_id)
    .bind(new_status.clone() as TransactionStatus)
    .bind(stellar_tx_hash)
    .bind(ledger_sequence)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

/// Mark a transaction as FAILED and record the failure reason.
pub async fn mark_failed(
    pool: &PgPool,
    transfer_id: &str,
    reason: &str,
) -> Result<Transaction, AppError> {
    sqlx::query_as::<_, Transaction>(
        r#"
        UPDATE transactions
        SET
            status         = 'FAILED',
            failed_at      = NOW(),
            failure_reason = $2
        WHERE transfer_id = $1
        RETURNING
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        "#
    )
    .bind(transfer_id)
    .bind(reason)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)
}

// ─────────────────────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────────────────────

/// Fetch a single transaction by its `transfer_id` string.
pub async fn find_by_transfer_id(
    pool: &PgPool,
    transfer_id: &str,
) -> Result<Option<Transaction>, AppError> {
    sqlx::query_as::<_, Transaction>(
        r#"
        SELECT
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        FROM transactions
        WHERE transfer_id = $1
        "#
    )
    .bind(transfer_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::Database)
}

/// List transactions for an organisation, paginated.
///
/// `limit` max is enforced at 100 to prevent runaway queries.
/// Ordered by `created_at DESC` so the most recent appear first.
pub async fn list_by_org(
    pool: &PgPool,
    org_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<Transaction>, AppError> {
    let safe_limit = limit.min(100).max(1);
    sqlx::query_as::<_, Transaction>(
        r#"
        SELECT
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        FROM transactions
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
        "#
    )
    .bind(org_id)
    .bind(safe_limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

/// List all transactions belonging to a batch.
///
/// Used by the Batch Payroll dashboard panel to show per-recipient status.
pub async fn list_by_batch(
    pool: &PgPool,
    batch_id: Uuid,
) -> Result<Vec<Transaction>, AppError> {
    sqlx::query_as::<_, Transaction>(
        r#"
        SELECT
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown,
            status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        FROM transactions
        WHERE batch_id = $1
        ORDER BY created_at ASC
        "#
    )
    .bind(batch_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

/// Return the most recent N transactions for the dashboard activity feed.
pub async fn recent(pool: &PgPool, org_id: Uuid, n: i64) -> Result<Vec<Transaction>, AppError> {
    list_by_org(pool, org_id, n, 0).await
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics aggregates
// ─────────────────────────────────────────────────────────────────────────────

/// Per-day transaction volume row for the analytics heat-map and sparkline.
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct DailyVolume {
    /// Calendar date (truncated to day).
    pub day:        DateTime<Utc>,
    /// Total XLM/asset volume settled that day.
    pub volume:     Option<BigDecimal>,
    /// Number of SETTLED transactions that day.
    pub tx_count:   Option<i64>,
    /// Number of FAILED transactions that day.
    pub fail_count: Option<i64>,
}

/// Return per-day volume for the past `days` calendar days.
pub async fn volume_by_day(
    pool: &PgPool,
    org_id: Uuid,
    days: i64,
) -> Result<Vec<DailyVolume>, AppError> {
    sqlx::query_as::<_, DailyVolume>(
        r#"
        SELECT
            DATE_TRUNC('day', created_at)   AS day,
            SUM(amount) FILTER (WHERE status = 'SETTLED')   AS volume,
            COUNT(*) FILTER    (WHERE status = 'SETTLED')   AS tx_count,
            COUNT(*) FILTER    (WHERE status = 'FAILED')    AS fail_count
        FROM transactions
        WHERE org_id    = $1
          AND created_at >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day ASC
        "#
    )
    .bind(org_id)
    .bind(days.to_string())
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}

/// A summary count row for the status badge strip on the dashboard.
#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct StatusSummary {
    pub status:       TransactionStatus,
    pub count:        i64,
    pub total_amount: Option<BigDecimal>,
}

/// Return status-grouped counts and volumes for an organisation.
pub async fn status_summary(
    pool: &PgPool,
    org_id: Uuid,
) -> Result<Vec<StatusSummary>, AppError> {
    sqlx::query_as::<_, StatusSummary>(
        r#"
        SELECT
            status,
            COUNT(*)    AS count,
            SUM(amount) AS total_amount
        FROM transactions
        WHERE org_id = $1
        GROUP BY status
        ORDER BY status
        "#
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)
}
