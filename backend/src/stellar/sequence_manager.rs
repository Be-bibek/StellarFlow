// =============================================================================
// StellarFlow Backend — Stellar Sequence Number Manager
//
// RISK-1 Mitigation (from architecture blueprint):
//   Stellar sequence numbers are per-account monotonic counters. If two
//   concurrent tokio workers both query Horizon for the same channel account's
//   sequence, both build a tx at seq N+1 → one succeeds, the other fails with
//   `tx_bad_seq`.
//
//   The `FOR UPDATE SKIP LOCKED` pattern in acquire_channel_account() prevents
//   the *database-layer* collision — each worker gets a different channel row.
//   But if sequence fetches go directly to Horizon (which can lag 5-10 seconds),
//   a race is still possible.
//
//   This module uses Redis INCR as the AUTHORITATIVE sequence counter.
//   Redis processes commands single-threaded, making INCR atomically safe
//   across any number of concurrent Tokio workers.
//
// Workflow:
//   1. `seed_from_horizon()` — called once when a channel account is first
//      acquired from the pool. Fetches the real sequence from Horizon and
//      stores it in Redis with SET NX (only if not already present).
//   2. `get_and_increment()` — called by each worker before building a tx.
//      Returns the next sequence number atomically (Redis INCR).
//   3. `reset_to()` — called when a transaction fails with `tx_bad_seq` to
//      resynchronise the counter with Horizon's authoritative value.
// =============================================================================

use redis::aio::ConnectionManager;

use crate::errors::AppError;

// ─────────────────────────────────────────────────────────────────────────────
// Redis key namespace
// ─────────────────────────────────────────────────────────────────────────────

/// Returns the Redis key for a channel account's sequence counter.
///
/// Namespace: `sf:seq:{stellar_public_key}`
///
/// Example: `sf:seq:GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P`
fn seq_key(public_key: &str) -> String {
    format!("sf:seq:{public_key}")
}

// ─────────────────────────────────────────────────────────────────────────────
// Core API
// ─────────────────────────────────────────────────────────────────────────────

/// Atomically increment and return the next sequence number for `public_key`.
///
/// This is the ONLY function that should be called when building a Stellar
/// transaction. The Redis INCR operation is single-threaded on the Redis server,
/// guaranteeing that no two concurrent callers can receive the same value.
///
/// # Parameters
/// - `redis`      — A mutable reference to the async Redis `ConnectionManager`.
/// - `public_key` — The Stellar G-address of the channel account.
///
/// # Returns
/// The *next* sequence number that should be used in the transaction envelope.
/// Stellar transactions must use sequence = account_sequence + 1, so this
/// counter must be seeded via [`seed_from_horizon`] at the correct base value.
pub async fn get_and_increment(
    redis: &mut ConnectionManager,
    public_key: &str,
) -> Result<i64, AppError> {
    let key = seq_key(public_key);

    let seq: i64 = redis::cmd("INCR")
        .arg(&key)
        .query_async(redis)
        .await
        .map_err(|e| {
            AppError::Cache(format!(
                "Redis INCR failed for sequence key '{key}': {e}"
            ))
        })?;

    tracing::debug!(
        channel = %public_key,
        sequence = seq,
        "Sequence number issued"
    );

    Ok(seq)
}

/// Seed the Redis sequence counter for `public_key` from Horizon's value.
///
/// Uses Redis `SET key value NX` — the counter is only set if the key does
/// not already exist in Redis. This prevents overwriting a valid counter on
/// a server restart or pool re-acquisition.
///
/// Call this ONCE immediately after `acquire_channel_account()` returns, before
/// the first call to `get_and_increment()`.
///
/// # Parameters
/// - `redis`         — Mutable reference to the Redis `ConnectionManager`.
/// - `public_key`    — The Stellar G-address of the channel account.
/// - `horizon_seq`   — The account's current sequence as returned by Horizon
///                     (`GET /accounts/{public_key}` → `.sequence`).
///
/// # Returns
/// `true`  → counter was seeded (first time this key has been set).
/// `false` → counter already existed in Redis (no change made).
pub async fn seed_from_horizon(
    redis: &mut ConnectionManager,
    public_key: &str,
    horizon_seq: i64,
) -> Result<bool, AppError> {
    let key = seq_key(public_key);

    // SET key value NX — only sets if the key does Not eXist.
    // Returns Some("OK") if the key was set, None if it already existed.
    let result: Option<String> = redis::cmd("SET")
        .arg(&key)
        .arg(horizon_seq)
        .arg("NX")
        .query_async(redis)
        .await
        .map_err(|e| {
            AppError::Cache(format!(
                "Redis SET NX failed for sequence key '{key}': {e}"
            ))
        })?;

    let was_seeded = result.is_some();

    tracing::info!(
        channel  = %public_key,
        sequence = horizon_seq,
        seeded   = was_seeded,
        "Sequence counter seed attempt"
    );

    Ok(was_seeded)
}

/// Forcibly reset the Redis sequence counter to `correct_sequence`.
///
/// Call this when Horizon returns `tx_bad_seq` to re-sync the counter with
/// the authoritative ledger value. Uses SET (unconditional overwrite).
///
/// # Parameters
/// - `redis`            — Mutable reference to the Redis `ConnectionManager`.
/// - `public_key`       — The Stellar G-address of the channel account.
/// - `correct_sequence` — The verified correct sequence from Horizon.
pub async fn reset_to(
    redis: &mut ConnectionManager,
    public_key: &str,
    correct_sequence: i64,
) -> Result<(), AppError> {
    let key = seq_key(public_key);

    redis::cmd("SET")
        .arg(&key)
        .arg(correct_sequence)
        .query_async::<_, String>(redis)
        .await
        .map_err(|e| {
            AppError::Cache(format!(
                "Redis SET failed for sequence reset '{key}': {e}"
            ))
        })?;

    tracing::warn!(
        channel          = %public_key,
        correct_sequence = correct_sequence,
        "Sequence counter forcibly reset (tx_bad_seq recovery)"
    );

    Ok(())
}

/// Read the current value of the sequence counter without incrementing it.
///
/// Useful for debugging, health checks, and integration tests. Not used in the
/// hot payment path (always use `get_and_increment` there).
pub async fn peek(
    redis: &mut ConnectionManager,
    public_key: &str,
) -> Result<Option<i64>, AppError> {
    let key = seq_key(public_key);

    let val: Option<i64> = redis::cmd("GET")
        .arg(&key)
        .query_async(redis)
        .await
        .map_err(|e| AppError::Cache(format!("Redis GET failed for '{key}': {e}")))?;

    Ok(val)
}

/// Delete the sequence counter for `public_key`.
///
/// Call this when a channel account is de-provisioned from the pool so its
/// stale Redis key doesn't interfere with a future account at the same address.
pub async fn delete(
    redis: &mut ConnectionManager,
    public_key: &str,
) -> Result<(), AppError> {
    let key = seq_key(public_key);

    redis::cmd("DEL")
        .arg(&key)
        .query_async::<_, ()>(redis)
        .await
        .map_err(|e| AppError::Cache(format!("Redis DEL failed for '{key}': {e}")))?;

    tracing::info!(channel = %public_key, "Sequence counter deleted");
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Startup Self-Healing
// ─────────────────────────────────────────────────────────────────────────────

use crate::stellar::HorizonClient;
use sqlx::PgPool;

/// Verify and heal sequence numbers for all active treasury wallets on startup.
pub async fn verify_and_heal_all(
    pool: &PgPool,
    mut redis: ConnectionManager,
    horizon: &HorizonClient,
) -> Result<(), AppError> {
    use sqlx::Row;
    let wallets = sqlx::query(
        "SELECT public_key, wallet_name, id FROM wallets WHERE is_active = true"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(e))?;

    for row in wallets {
        let public_key: String = row.get("public_key");
        let wallet_name: String = row.get("wallet_name");
        let id: uuid::Uuid = row.get("id");

        let redis_seq = peek(&mut redis, &public_key).await?.unwrap_or(0);
        let horizon_seq = horizon.fetch_sequence(&public_key).await.unwrap_or(0);

        if redis_seq != horizon_seq && horizon_seq > 0 {
            reset_to(&mut redis, &public_key, horizon_seq).await?;
            
            let _ = sqlx::query(
                "INSERT INTO audit_logs (org_id, actor_id, action, metadata) VALUES ((SELECT org_id FROM wallets WHERE id = $1), 'system', 'SEQUENCE_RESYNC_ON_STARTUP', $2)"
            )
            .bind(id)
            .bind(serde_json::json!({
                "wallet_id": id,
                "wallet_name": wallet_name,
                "public_key": public_key,
                "old_redis_sequence": redis_seq,
                "new_horizon_sequence": horizon_seq
            }))
            .execute(pool).await;
            
            tracing::warn!(
                wallet = %wallet_name,
                redis_seq = redis_seq,
                horizon_seq = horizon_seq,
                "Sequence resync on startup"
            );
        }
    }
    
    Ok(())
}
