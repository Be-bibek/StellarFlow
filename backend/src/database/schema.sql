-- =============================================================================
-- StellarFlow — PostgreSQL Relational Ledger Schema
-- Engine: PostgreSQL 15+
-- Extensions: uuid-ossp (UUID generation), pgcrypto (key hashing)
-- =============================================================================

-- Enable UUID generation extension.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM TYPES
-- Strictly typed status strings that exactly mirror the frontend UI state
-- machine transitions:  AUTHORIZING → ROUTING → STELLAR_LEDGER → SETTLED
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE transaction_status AS ENUM (
    'AUTHORIZING',
    'ROUTING',
    'STELLAR_LEDGER',
    'SETTLED',
    'FAILED'
);

CREATE TYPE wallet_type AS ENUM (
    'MASTER',
    'PAYROLL',
    'OPERATIONS',
    'RESERVE',
    'MARKETING',
    'ESCROW'
);

CREATE TYPE approval_status AS ENUM (
    'PENDING',
    'THRESHOLD_MET',
    'SUBMITTED',
    'CONFIRMED',
    'EXPIRED',
    'REJECTED'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- organizations
-- Root entity. Represents a corporate treasury operator registered in
-- StellarFlow. Each org maps to exactly one Stellar admin key on-chain.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE organizations (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(255)  NOT NULL,
    admin_address     VARCHAR(56)   NOT NULL UNIQUE,   -- Stellar G-address (56 chars)
    contract_address  VARCHAR(56),                     -- Deployed TreasuryRouter contract ID
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS
    'Root entity for each corporate StellarFlow tenant. admin_address is the '
    'on-chain authority used to authenticate contract calls.';

-- ─────────────────────────────────────────────────────────────────────────────
-- wallets
-- All vault wallets registered under an organization. Each wallet maps to
-- one Stellar keypair and is classified by functional role (wallet_type).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE wallets (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    wallet_name     VARCHAR(100)  NOT NULL,
    public_key      VARCHAR(56)   NOT NULL UNIQUE,  -- Stellar G-address
    wallet_type     wallet_type   NOT NULL DEFAULT 'OPERATIONS',
    description     TEXT,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    registered_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_org_id    ON wallets (org_id);
CREATE INDEX idx_wallets_public_key ON wallets (public_key);

COMMENT ON TABLE wallets IS
    'Corporate vault wallets registered under an organization. wallet_type '
    'matches the PAYROLL/OPERATIONS/RESERVE/ESCROW taxonomy used in the UI.';

-- ─────────────────────────────────────────────────────────────────────────────
-- transactions
-- Immutable ledger record for every treasury movement initiated via the
-- StellarFlow batch payment engine. Status column is an enum enforcing the
-- exact UI state machine sequence.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE transactions (
    id                 UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Unique identifier echoed back from the Horizon transaction hash.
    transfer_id        VARCHAR(64)      UNIQUE NOT NULL,

    -- Foreign key to the initiating organization.
    org_id             UUID             NOT NULL REFERENCES organizations(id),

    -- Financial details (stored in stroops; displayed as XLM/USDC in UI).
    amount             NUMERIC(20, 7)   NOT NULL,
    asset_code         VARCHAR(12)      NOT NULL DEFAULT 'native',
    destination        VARCHAR(56)      NOT NULL,

    -- JSONB breakdown of how the amount was split across source vaults.
    -- Schema: { "<wallet_address>": <stroop_amount>, ... }
    source_breakdown   JSONB            NOT NULL DEFAULT '{}',

    -- Lifecycle status — must follow AUTHORIZING→ROUTING→STELLAR_LEDGER→SETTLED.
    status             transaction_status NOT NULL DEFAULT 'AUTHORIZING',

    -- On-chain references (populated as status advances).
    stellar_tx_hash    VARCHAR(64),
    ledger_sequence    BIGINT,
    soroban_event_id   VARCHAR(128),

    -- Batch metadata (for multi-recipient payroll jobs).
    batch_id           UUID,
    recipient_count    INT              NOT NULL DEFAULT 1,

    -- Fee accounting.
    fee_stroops        BIGINT           NOT NULL DEFAULT 100,

    -- Temporal lifecycle columns.
    created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    routing_at         TIMESTAMPTZ,
    submitted_at       TIMESTAMPTZ,
    settled_at         TIMESTAMPTZ,
    failed_at          TIMESTAMPTZ,
    failure_reason     TEXT
);

CREATE INDEX idx_transactions_org_id      ON transactions (org_id);
CREATE INDEX idx_transactions_status      ON transactions (status);
CREATE INDEX idx_transactions_batch_id    ON transactions (batch_id);
CREATE INDEX idx_transactions_created_at  ON transactions (created_at DESC);
CREATE INDEX idx_transactions_destination ON transactions (destination);

COMMENT ON TABLE transactions IS
    'Immutable ledger of all treasury movements. status column strictly follows '
    'the AUTHORIZING → ROUTING → STELLAR_LEDGER → SETTLED / FAILED machine.';

-- ─────────────────────────────────────────────────────────────────────────────
-- approval_requests
-- Stores multi-sig transaction bundles awaiting quorum. The raw XDR is held
-- in Redis for fast write/append; this table acts as the durable audit trail.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE approval_requests (
    id                  UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Opaque identifier matching the Redis key holding the live XDR.
    redis_key           VARCHAR(128)      NOT NULL UNIQUE,

    org_id              UUID              NOT NULL REFERENCES organizations(id),

    -- Human-readable purpose for UI display.
    purpose             TEXT              NOT NULL,

    -- Financial summary.
    amount              NUMERIC(20, 7)    NOT NULL,
    destination         VARCHAR(56)       NOT NULL,

    -- Quorum configuration.
    required_signatures INT               NOT NULL,
    current_signatures  INT               NOT NULL DEFAULT 0,

    -- Current approval workflow state.
    status              approval_status   NOT NULL DEFAULT 'PENDING',

    -- Horizon tx hash after automated submission.
    submitted_tx_hash   VARCHAR(64),

    -- ISO-8601 expiry enforced by the Redis TTL and this column.
    expires_at          TIMESTAMPTZ       NOT NULL,

    created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_requests_org_id  ON approval_requests (org_id);
CREATE INDEX idx_approval_requests_status  ON approval_requests (status);
CREATE INDEX idx_approval_requests_expires ON approval_requests (expires_at);

COMMENT ON TABLE approval_requests IS
    'Durable audit log for multi-sig approval bundles. The live XDR lives in '
    'Redis; this table provides immutable history and quorum tracking.';

-- ─────────────────────────────────────────────────────────────────────────────
-- approval_signatures
-- Individual signer records for each approval request. Enables per-signer
-- audit trails and prevents double-signing at the database layer.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE approval_signatures (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id        UUID         NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    signer_address     VARCHAR(56)  NOT NULL,

    -- Base64-encoded Stellar Ed25519 signature bytes.
    signature_b64      TEXT         NOT NULL,

    -- Derived hint from the public key (first 4 bytes) for XDR injection.
    hint_hex           VARCHAR(8)   NOT NULL,

    signed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Uniqueness: one signature per signer per approval request.
    UNIQUE (approval_id, signer_address)
);

CREATE INDEX idx_approval_signatures_approval_id ON approval_signatures (approval_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- channel_accounts
-- Pool of Stellar "channel accounts" used by the broadcast worker to avoid
-- sequence number collisions during massive payroll batches.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE channel_accounts (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    public_key      VARCHAR(56)   NOT NULL UNIQUE,

    -- Secret key stored AES-256 encrypted (key managed via AWS KMS / Vault).
    encrypted_secret TEXT          NOT NULL,

    -- Tracks whether this channel is currently in use by a worker.
    is_locked       BOOLEAN       NOT NULL DEFAULT FALSE,
    locked_at       TIMESTAMPTZ,
    locked_by_batch UUID,

    last_sequence   BIGINT        NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE channel_accounts IS
    'Pool of fee-bump channel accounts used by the tokio worker pool to '
    'broadcast transaction batches concurrently without sequence lock collisions.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: auto-update updated_at columns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
