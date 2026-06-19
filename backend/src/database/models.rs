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
    PartialFailure,
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

// =============================================================================
// Phase C.5 — Multi-Wallet Execution Models & Queries
// =============================================================================

/// Encrypted signing key record for a treasury wallet.
/// Plaintext secret NEVER exists in this struct — only the AES-GCM blob.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct WalletSecret {
    pub id:               Uuid,
    pub wallet_id:        Uuid,
    pub public_key:       String,
    /// AES-256-GCM ciphertext: base64(nonce[12] || ciphertext+tag)
    pub encrypted_secret: String,
    pub created_at:       DateTime<Utc>,
}

/// Per-wallet child transaction produced by the JIT multi-wallet executor.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChildTransfer {
    pub id:                 Uuid,
    pub parent_transfer_id: String,
    pub wallet_id:          Uuid,
    pub public_key:         String,
    pub amount:             BigDecimal,
    pub status:             TransactionStatus,
    pub stellar_tx_hash:    Option<String>,
    pub ledger_sequence:    Option<i64>,
    pub failure_reason:     Option<String>,
    pub created_at:         DateTime<Utc>,
    pub settled_at:         Option<DateTime<Utc>>,
    pub failed_at:          Option<DateTime<Utc>>,
}

/// Payload for creating a child transfer record.
#[derive(Debug, Clone)]
pub struct NewChildTransfer {
    pub parent_transfer_id: String,
    pub wallet_id:          Uuid,
    pub public_key:         String,
    pub amount:             BigDecimal,
}

/// Insert a child transfer in AUTHORIZING state.
/// Returns the existing row if the UNIQUE(parent_transfer_id, wallet_id)
/// constraint fires — enforcing idempotency at the DB layer.
pub async fn insert_child_transfer(
    pool: &PgPool,
    child: &NewChildTransfer,
) -> Result<ChildTransfer, sqlx::Error> {
    sqlx::query_as::<_, ChildTransfer>(
        r#"
        INSERT INTO child_transfers (
            parent_transfer_id, wallet_id, public_key, amount
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ON CONSTRAINT uq_child_wallet_per_parent
        DO UPDATE SET id = child_transfers.id  -- no-op update to trigger RETURNING
        RETURNING
            id, parent_transfer_id, wallet_id, public_key, amount,
            status, stellar_tx_hash, ledger_sequence, failure_reason,
            created_at, settled_at, failed_at
        "#,
    )
    .bind(&child.parent_transfer_id)
    .bind(child.wallet_id)
    .bind(&child.public_key)
    .bind(&child.amount)
    .fetch_one(pool)
    .await
}

/// Advance a child transfer to SETTLED or FAILED.
pub async fn advance_child_status(
    pool: &PgPool,
    child_id: Uuid,
    new_status: TransactionStatus,
    stellar_tx_hash: Option<&str>,
    ledger_sequence: Option<i64>,
    failure_reason: Option<&str>,
) -> Result<ChildTransfer, sqlx::Error> {
    sqlx::query_as::<_, ChildTransfer>(
        r#"
        UPDATE child_transfers
        SET
            status          = $2,
            stellar_tx_hash = COALESCE($3, stellar_tx_hash),
            ledger_sequence = COALESCE($4, ledger_sequence),
            failure_reason  = COALESCE($5, failure_reason),
            settled_at      = CASE WHEN $2 = 'SETTLED'  THEN NOW() ELSE settled_at END,
            failed_at       = CASE WHEN $2 = 'FAILED'   THEN NOW() ELSE failed_at END
        WHERE id = $1
        RETURNING
            id, parent_transfer_id, wallet_id, public_key, amount,
            status, stellar_tx_hash, ledger_sequence, failure_reason,
            created_at, settled_at, failed_at
        "#,
    )
    .bind(child_id)
    .bind(new_status)
    .bind(stellar_tx_hash)
    .bind(ledger_sequence)
    .bind(failure_reason)
    .fetch_one(pool)
    .await
}

/// Fetch all child transfers for a parent transfer (for idempotency check).
pub async fn get_children_for_parent(
    pool: &PgPool,
    parent_transfer_id: &str,
) -> Result<Vec<ChildTransfer>, sqlx::Error> {
    sqlx::query_as::<_, ChildTransfer>(
        r#"
        SELECT
            id, parent_transfer_id, wallet_id, public_key, amount,
            status, stellar_tx_hash, ledger_sequence, failure_reason,
            created_at, settled_at, failed_at
        FROM child_transfers
        WHERE parent_transfer_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(parent_transfer_id)
    .fetch_all(pool)
    .await
}

/// Load the AES-encrypted secret for a wallet by its Stellar public key.
/// Returns None if no secret is registered for this public key.
pub async fn find_wallet_secret_by_public_key(
    pool: &PgPool,
    public_key: &str,
) -> Result<Option<WalletSecret>, sqlx::Error> {
    sqlx::query_as::<_, WalletSecret>(
        r#"
        SELECT id, wallet_id, public_key, encrypted_secret, created_at
        FROM wallet_secrets
        WHERE public_key = $1
        "#,
    )
    .bind(public_key)
    .fetch_optional(pool)
    .await
}

// =============================================================================
// Phase E — Governance Layer Models & Queries
// =============================================================================

/// RBAC user role.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UserRole {
    Admin,
    TreasuryManager,
    Auditor,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin           => write!(f, "ADMIN"),
            UserRole::TreasuryManager => write!(f, "TREASURY_MANAGER"),
            UserRole::Auditor         => write!(f, "AUDITOR"),
        }
    }
}

/// Approval policy row — maps an amount tier to required_approvals.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalPolicy {
    pub id:                 Uuid,
    pub org_id:             Uuid,
    pub name:               String,
    pub min_amount:         BigDecimal,
    pub max_amount:         Option<BigDecimal>,
    pub required_approvals: i32,
    pub auto_execute:       bool,
    pub created_at:         DateTime<Utc>,
    pub updated_at:         DateTime<Utc>,
}

/// A governance (approval workflow) request — separate from XDR multi-sig.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GovernanceRequest {
    pub id:                 Uuid,
    pub org_id:             Uuid,
    pub transfer_id:        String,
    pub amount:             BigDecimal,
    pub asset_code:         String,
    pub destination:        String,
    pub purpose:            Option<String>,
    pub policy_id:          Option<Uuid>,
    pub required_approvals: i32,
    pub current_approvals:  i32,
    pub status:             String,
    pub requester_id:       String,
    pub expires_at:         DateTime<Utc>,
    pub created_at:         DateTime<Utc>,
    pub updated_at:         DateTime<Utc>,
}

/// Payload for inserting a new governance request.
#[derive(Debug, Clone)]
pub struct NewGovernanceRequest {
    pub org_id:             Uuid,
    pub transfer_id:        String,
    pub amount:             BigDecimal,
    pub asset_code:         String,
    pub destination:        String,
    pub purpose:            Option<String>,
    pub policy_id:          Option<Uuid>,
    pub required_approvals: i32,
    pub requester_id:       String,
}

/// One approval or rejection action recorded against a governance request.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ApprovalAction {
    pub id:                     Uuid,
    pub governance_request_id:  Uuid,
    pub actor_id:               String,
    pub action:                 String,  // APPROVED | REJECTED | COMMENTED
    pub comment:                Option<String>,
    pub created_at:             DateTime<Utc>,
}

/// Payload for inserting an approval action (immutable — INSERT only).
#[derive(Debug, Clone)]
pub struct NewApprovalAction {
    pub governance_request_id: Uuid,
    pub actor_id:              String,
    pub action:                String,
    pub comment:               Option<String>,
}

/// System-wide immutable audit log entry.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id:          Uuid,
    pub org_id:      Uuid,
    pub transfer_id: Option<String>,
    pub actor_id:    String,
    pub action:      String,
    pub metadata:    serde_json::Value,
    pub created_at:  DateTime<Utc>,
}

/// Payload for inserting an audit log entry (immutable — INSERT only).
#[derive(Debug, Clone)]
pub struct NewAuditLog {
    pub org_id:      Uuid,
    pub transfer_id: Option<String>,
    pub actor_id:    String,
    pub action:      String,
    pub metadata:    serde_json::Value,
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Action Constants
// ─────────────────────────────────────────────────────────────────────────────

pub mod audit_action {
    pub const TRANSFER_CREATED:    &str = "TRANSFER_CREATED";
    pub const APPROVAL_REQUESTED:  &str = "APPROVAL_REQUESTED";
    pub const APPROVAL_GRANTED:    &str = "APPROVAL_GRANTED";
    pub const APPROVAL_REJECTED:   &str = "APPROVAL_REJECTED";
    pub const EXECUTION_STARTED:   &str = "EXECUTION_STARTED";
    pub const EXECUTION_SETTLED:   &str = "EXECUTION_SETTLED";
    pub const EXECUTION_FAILED:    &str = "EXECUTION_FAILED";
    pub const AUTO_EXECUTED:       &str = "AUTO_EXECUTED";
}

// ─────────────────────────────────────────────────────────────────────────────
// Governance Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/// Find the matching approval policy for a given amount.
/// Returns the most specific (smallest range) matching policy.
pub async fn find_policy_for_amount(
    pool: &PgPool,
    org_id: Uuid,
    amount: &BigDecimal,
) -> Result<Option<ApprovalPolicy>, sqlx::Error> {
    sqlx::query_as::<_, ApprovalPolicy>(
        r#"
        SELECT id, org_id, name, min_amount, max_amount, required_approvals, auto_execute, created_at, updated_at
        FROM approval_policies
        WHERE org_id = $1
          AND min_amount <= $2
          AND (max_amount IS NULL OR max_amount >= $2)
        ORDER BY min_amount DESC
        LIMIT 1
        "#,
    )
    .bind(org_id)
    .bind(amount)
    .fetch_optional(pool)
    .await
}

/// Insert a new governance request.
pub async fn insert_governance_request(
    pool: &PgPool,
    req: &NewGovernanceRequest,
) -> Result<GovernanceRequest, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        INSERT INTO governance_requests (
            org_id, transfer_id, amount, asset_code, destination,
            purpose, policy_id, required_approvals, requester_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
            id, org_id, transfer_id, amount, asset_code, destination,
            purpose, policy_id, required_approvals, current_approvals,
            status, requester_id, expires_at, created_at, updated_at
        "#,
    )
    .bind(req.org_id)
    .bind(&req.transfer_id)
    .bind(&req.amount)
    .bind(&req.asset_code)
    .bind(&req.destination)
    .bind(&req.purpose)
    .bind(req.policy_id)
    .bind(req.required_approvals)
    .bind(&req.requester_id)
    .fetch_one(pool)
    .await
}

/// Find a governance request by its UUID.
pub async fn find_governance_request(
    pool: &PgPool,
    id: Uuid,
) -> Result<Option<GovernanceRequest>, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        SELECT id, org_id, transfer_id, amount, asset_code, destination,
               purpose, policy_id, required_approvals, current_approvals,
               status, requester_id, expires_at, created_at, updated_at
        FROM governance_requests
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await
}

/// List all pending governance requests for an org (for the approval inbox).
pub async fn list_pending_governance_requests(
    pool: &PgPool,
    org_id: Uuid,
) -> Result<Vec<GovernanceRequest>, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        SELECT id, org_id, transfer_id, amount, asset_code, destination,
               purpose, policy_id, required_approvals, current_approvals,
               status, requester_id, expires_at, created_at, updated_at
        FROM governance_requests
        WHERE org_id = $1
          AND status = 'PENDING_APPROVAL'
          AND expires_at > NOW()
        ORDER BY created_at DESC
        "#,
    )
    .bind(org_id)
    .fetch_all(pool)
    .await
}

/// List governance request history (non-pending).
pub async fn list_governance_history(
    pool: &PgPool,
    org_id: Uuid,
    limit: i64,
) -> Result<Vec<GovernanceRequest>, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        SELECT id, org_id, transfer_id, amount, asset_code, destination,
               purpose, policy_id, required_approvals, current_approvals,
               status, requester_id, expires_at, created_at, updated_at
        FROM governance_requests
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

/// Atomically increment current_approvals and update status if threshold met.
pub async fn record_approval(
    pool: &PgPool,
    id: Uuid,
) -> Result<GovernanceRequest, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        UPDATE governance_requests
        SET
            current_approvals = current_approvals + 1,
            status = CASE
                WHEN (current_approvals + 1) >= required_approvals THEN 'APPROVED'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING
            id, org_id, transfer_id, amount, asset_code, destination,
            purpose, policy_id, required_approvals, current_approvals,
            status, requester_id, expires_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
}

/// Set a governance request status directly (REJECTED, EXECUTING, SETTLED, FAILED).
pub async fn set_governance_status(
    pool: &PgPool,
    id: Uuid,
    status: &str,
) -> Result<GovernanceRequest, sqlx::Error> {
    sqlx::query_as::<_, GovernanceRequest>(
        r#"
        UPDATE governance_requests
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING
            id, org_id, transfer_id, amount, asset_code, destination,
            purpose, policy_id, required_approvals, current_approvals,
            status, requester_id, expires_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(status)
    .fetch_one(pool)
    .await
}

/// Insert an approval action (immutable — only INSERT, never UPDATE/DELETE).
pub async fn insert_approval_action(
    pool: &PgPool,
    action: &NewApprovalAction,
) -> Result<ApprovalAction, sqlx::Error> {
    sqlx::query_as::<_, ApprovalAction>(
        r#"
        INSERT INTO approval_actions (governance_request_id, actor_id, action, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, governance_request_id, actor_id, action, comment, created_at
        "#,
    )
    .bind(action.governance_request_id)
    .bind(&action.actor_id)
    .bind(&action.action)
    .bind(&action.comment)
    .fetch_one(pool)
    .await
}

/// List all approval actions for a governance request.
pub async fn list_approval_actions(
    pool: &PgPool,
    governance_request_id: Uuid,
) -> Result<Vec<ApprovalAction>, sqlx::Error> {
    sqlx::query_as::<_, ApprovalAction>(
        r#"
        SELECT id, governance_request_id, actor_id, action, comment, created_at
        FROM approval_actions
        WHERE governance_request_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(governance_request_id)
    .fetch_all(pool)
    .await
}

/// Append an immutable audit log entry (only INSERT — never UPDATE or DELETE).
pub async fn insert_audit_log(
    pool: &PgPool,
    log: &NewAuditLog,
) -> Result<AuditLog, sqlx::Error> {
    sqlx::query_as::<_, AuditLog>(
        r#"
        INSERT INTO audit_logs (org_id, transfer_id, actor_id, action, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, org_id, transfer_id, actor_id, action, metadata, created_at
        "#,
    )
    .bind(log.org_id)
    .bind(&log.transfer_id)
    .bind(&log.actor_id)
    .bind(&log.action)
    .bind(&log.metadata)
    .fetch_one(pool)
    .await
}

/// List audit logs for an org, optionally filtered by transfer_id.
pub async fn list_audit_logs(
    pool: &PgPool,
    org_id: Uuid,
    transfer_id_filter: Option<&str>,
    limit: i64,
) -> Result<Vec<AuditLog>, sqlx::Error> {
    sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, org_id, transfer_id, actor_id, action, metadata, created_at
        FROM audit_logs
        WHERE org_id = $1
          AND ($2::text IS NULL OR transfer_id = $2)
        ORDER BY created_at DESC
        LIMIT $3
        "#,
    )
    .bind(org_id)
    .bind(transfer_id_filter)
    .bind(limit)
    .fetch_all(pool)
    .await
}

