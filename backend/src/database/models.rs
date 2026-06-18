// =============================================================================
// StellarFlow — SQLx Compile-Time Query Models
//
// All structs in this module are backed by `sqlx::FromRow` and correspond
// directly to the relational tables in `schema.sql`. Queries use `sqlx::query_as!`
// macros for full compile-time SQL verification against the running Postgres
// instance (via `DATABASE_URL` in `.env`).
// =============================================================================

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
// Enums (must exactly match the PostgreSQL TYPE definitions in schema.sql)
// ─────────────────────────────────────────────────────────────────────────────

/// Maps to the `transaction_status` PostgreSQL ENUM.
/// Variants are ordered to match the UI state machine progression.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "transaction_status", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransactionStatus {
    Authorizing,
    Routing,
    StellarLedger,
    Settled,
    Failed,
}

/// Maps to the `wallet_type` PostgreSQL ENUM.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "wallet_type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WalletType {
    Master,
    Payroll,
    Operations,
    Reserve,
    Marketing,
    Escrow,
}

/// Maps to the `approval_status` PostgreSQL ENUM.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "approval_status", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ApprovalStatus {
    Pending,
    ThresholdMet,
    Submitted,
    Confirmed,
    Expired,
    Rejected,
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `organizations` table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Organization {
    pub id:               Uuid,
    pub name:             String,
    pub admin_address:    String,
    pub contract_address: Option<String>,
    pub created_at:       DateTime<Utc>,
    pub updated_at:       DateTime<Utc>,
}

/// Payload for creating a new organization record.
#[derive(Debug, Clone, Deserialize)]
pub struct NewOrganization {
    pub name:             String,
    pub admin_address:    String,
    pub contract_address: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `wallets` table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Wallet {
    pub id:            Uuid,
    pub org_id:        Uuid,
    pub wallet_name:   String,
    pub public_key:    String,
    pub wallet_type:   WalletType,
    pub description:   Option<String>,
    pub is_active:     bool,
    pub registered_at: DateTime<Utc>,
    pub updated_at:    DateTime<Utc>,
}

/// Payload for registering a new vault wallet.
#[derive(Debug, Clone, Deserialize)]
pub struct NewWallet {
    pub org_id:       Uuid,
    pub wallet_name:  String,
    pub public_key:   String,
    pub wallet_type:  WalletType,
    pub description:  Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `transactions` table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Transaction {
    pub id:                Uuid,
    pub transfer_id:       String,
    pub org_id:            Uuid,
    pub amount:            BigDecimal,
    pub asset_code:        String,
    pub destination:       String,
    pub source_breakdown:  serde_json::Value,
    pub status:            TransactionStatus,
    pub stellar_tx_hash:   Option<String>,
    pub ledger_sequence:   Option<i64>,
    pub soroban_event_id:  Option<String>,
    pub batch_id:          Option<Uuid>,
    pub recipient_count:   i32,
    pub fee_stroops:       i64,
    pub created_at:        DateTime<Utc>,
    pub routing_at:        Option<DateTime<Utc>>,
    pub submitted_at:      Option<DateTime<Utc>>,
    pub settled_at:        Option<DateTime<Utc>>,
    pub failed_at:         Option<DateTime<Utc>>,
    pub failure_reason:    Option<String>,
}

/// Payload for inserting a new transaction record (staging phase).
#[derive(Debug, Clone)]
pub struct NewTransaction {
    pub transfer_id:      String,
    pub org_id:           Uuid,
    pub amount:           BigDecimal,
    pub asset_code:       String,
    pub destination:      String,
    pub source_breakdown: serde_json::Value,
    pub batch_id:         Option<Uuid>,
    pub recipient_count:  i32,
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalRequest
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `approval_requests` table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalRequest {
    pub id:                  Uuid,
    pub redis_key:           String,
    pub org_id:              Uuid,
    pub purpose:             String,
    pub amount:              BigDecimal,
    pub destination:         String,
    pub required_signatures: i32,
    pub current_signatures:  i32,
    pub status:              ApprovalStatus,
    pub submitted_tx_hash:   Option<String>,
    pub expires_at:          DateTime<Utc>,
    pub created_at:          DateTime<Utc>,
    pub updated_at:          DateTime<Utc>,
}

/// Payload for creating a new pending approval request.
#[derive(Debug, Clone, Deserialize)]
pub struct NewApprovalRequest {
    pub org_id:              Uuid,
    pub purpose:             String,
    pub amount:              BigDecimal,
    pub destination:         String,
    pub required_signatures: i32,
    pub expires_at:          DateTime<Utc>,
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalSignature
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `approval_signatures` table.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalSignature {
    pub id:             Uuid,
    pub approval_id:    Uuid,
    pub signer_address: String,
    pub signature_b64:  String,
    pub hint_hex:       String,
    pub signed_at:      DateTime<Utc>,
}

// ─────────────────────────────────────────────────────────────────────────────
// ChannelAccount
// ─────────────────────────────────────────────────────────────────────────────

/// Full row representation of the `channel_accounts` table.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ChannelAccount {
    pub id:               Uuid,
    pub public_key:       String,
    pub encrypted_secret: String,
    pub is_locked:        bool,
    pub locked_at:        Option<DateTime<Utc>>,
    pub locked_by_batch:  Option<Uuid>,
    pub last_sequence:    i64,
    pub created_at:       DateTime<Utc>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Layer — reusable async query functions
// ─────────────────────────────────────────────────────────────────────────────

use sqlx::PgPool;

/// Insert a new transaction record in AUTHORIZING state.
pub async fn insert_transaction(
    pool: &PgPool,
    tx: &NewTransaction,
) -> Result<Transaction, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        r#"
        INSERT INTO transactions (
            transfer_id, org_id, amount, asset_code,
            destination, source_breakdown, batch_id, recipient_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown, status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        "#,
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
}

/// Advance a transaction's status and set the corresponding timestamp column.
pub async fn advance_transaction_status(
    pool: &PgPool,
    transfer_id: &str,
    new_status: TransactionStatus,
    stellar_tx_hash: Option<&str>,
    ledger_sequence: Option<i64>,
) -> Result<Transaction, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        r#"
        UPDATE transactions
        SET
            status           = $2,
            stellar_tx_hash  = COALESCE($3, stellar_tx_hash),
            ledger_sequence  = COALESCE($4, ledger_sequence),
            routing_at       = CASE WHEN $2 = 'ROUTING'         THEN NOW() ELSE routing_at END,
            submitted_at     = CASE WHEN $2 = 'STELLAR_LEDGER'  THEN NOW() ELSE submitted_at END,
            settled_at       = CASE WHEN $2 = 'SETTLED'         THEN NOW() ELSE settled_at END,
            failed_at        = CASE WHEN $2 = 'FAILED'          THEN NOW() ELSE failed_at END
        WHERE transfer_id = $1
        RETURNING
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown, status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        "#,
    )
    .bind(transfer_id)
    .bind(new_status as TransactionStatus)
    .bind(stellar_tx_hash)
    .bind(ledger_sequence)
    .fetch_one(pool)
    .await
}

/// Acquire a free channel account with a row-level lock, marking it as locked.
pub async fn acquire_channel_account(
    pool: &PgPool,
    batch_id: Uuid,
) -> Result<Option<ChannelAccount>, sqlx::Error> {
    sqlx::query_as::<_, ChannelAccount>(
        r#"
        UPDATE channel_accounts
        SET
            is_locked       = TRUE,
            locked_at       = NOW(),
            locked_by_batch = $1
        WHERE id = (
            SELECT id FROM channel_accounts
            WHERE is_locked = FALSE
            ORDER BY last_sequence ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, public_key, encrypted_secret, is_locked,
                  locked_at, locked_by_batch, last_sequence, created_at
        "#,
    )
    .bind(batch_id)
    .fetch_optional(pool)
    .await
}

/// Release a channel account back to the pool after broadcast completes.
pub async fn release_channel_account(
    pool: &PgPool,
    channel_id: Uuid,
    new_sequence: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE channel_accounts
        SET
            is_locked       = FALSE,
            locked_at       = NULL,
            locked_by_batch = NULL,
            last_sequence   = $2
        WHERE id = $1
        "#,
    )
    .bind(channel_id)
    .bind(new_sequence)
    .execute(pool)
    .await
    .map(|_| ())
}

/// Get all active wallets for an organization.
pub async fn get_wallets_for_org(
    pool: &PgPool,
    org_id: Uuid,
) -> Result<Vec<Wallet>, sqlx::Error> {
    sqlx::query_as::<_, Wallet>(
        r#"
        SELECT id, org_id, wallet_name, public_key, 
               wallet_type, 
               description, is_active, registered_at, updated_at
        FROM wallets
        WHERE org_id = $1 AND is_active = TRUE
        ORDER BY registered_at ASC
        "#,
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
}

/// Get recent transactions for an organization.
pub async fn get_recent_transactions(
    pool: &PgPool,
    org_id: Uuid,
    limit: i64,
) -> Result<Vec<Transaction>, sqlx::Error> {
    sqlx::query_as::<_, Transaction>(
        r#"
        SELECT 
            id, transfer_id, org_id, amount, asset_code, destination,
            source_breakdown, status,
            stellar_tx_hash, ledger_sequence, soroban_event_id,
            batch_id, recipient_count, fee_stroops,
            created_at, routing_at, submitted_at, settled_at,
            failed_at, failure_reason
        FROM transactions
        WHERE org_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
    )
    .bind(org_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

