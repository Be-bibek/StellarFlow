-- =============================================================================
-- StellarFlow — Phase C.5 Migration
-- Adds wallet_secrets and child_transfers tables.
-- Adds PARTIAL_FAILURE to transaction_status enum.
-- All statements are idempotent (IF NOT EXISTS / DO $$ checks).
-- Safe to run on every startup — will no-op if already applied.
-- =============================================================================

-- ── Add PARTIAL_FAILURE to transaction_status enum ───────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PARTIAL_FAILURE'
          AND enumtypid = 'transaction_status'::regtype
    ) THEN
        ALTER TYPE transaction_status ADD VALUE 'PARTIAL_FAILURE';
    END IF;
END
$$;

-- ── wallet_secrets ────────────────────────────────────────────────────────────
-- Stores AES-256-GCM encrypted Stellar signing keys for each registered wallet.
-- The plaintext secret NEVER exists in this table — only the encrypted blob.
-- Encryption uses auth/crypto.rs (nonce-prepend, fresh OsRng nonce per call).
CREATE TABLE IF NOT EXISTS wallet_secrets (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id        UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    public_key       VARCHAR(56) NOT NULL UNIQUE,
    -- AES-256-GCM ciphertext: base64(nonce[12] || ciphertext+tag)
    encrypted_secret TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_secrets_wallet_id  ON wallet_secrets (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_secrets_public_key ON wallet_secrets (public_key);

COMMENT ON TABLE wallet_secrets IS
    'AES-256-GCM encrypted Stellar signing keys. '
    'Plaintext secrets NEVER stored here — only encrypted blobs. '
    'Decryption happens inside tokio::spawn scope and key material '
    'is dropped immediately after signing completes.';

-- ── child_transfers ───────────────────────────────────────────────────────────
-- One row per contributing wallet per JIT execution.
-- Linked to parent transactions via parent_transfer_id.
-- Enables per-vault settlement tracking and partial failure handling.
--
-- UNIQUE(parent_transfer_id, wallet_id) enforces idempotency:
--   the same wallet cannot be charged twice for the same parent transfer.
CREATE TABLE IF NOT EXISTS child_transfers (
    id                  UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_transfer_id  VARCHAR(64)        NOT NULL REFERENCES transactions(transfer_id) ON DELETE CASCADE,
    wallet_id           UUID               NOT NULL REFERENCES wallets(id),
    public_key          VARCHAR(56)        NOT NULL,
    amount              NUMERIC(20, 7)     NOT NULL,
    status              transaction_status NOT NULL DEFAULT 'AUTHORIZING',
    stellar_tx_hash     VARCHAR(64),
    ledger_sequence     BIGINT,
    failure_reason      TEXT,
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    settled_at          TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,

    -- Idempotency: one child record per wallet per parent transfer.
    CONSTRAINT uq_child_wallet_per_parent UNIQUE (parent_transfer_id, wallet_id)
);

CREATE INDEX IF NOT EXISTS idx_child_transfers_parent  ON child_transfers (parent_transfer_id);
CREATE INDEX IF NOT EXISTS idx_child_transfers_wallet  ON child_transfers (wallet_id);
CREATE INDEX IF NOT EXISTS idx_child_transfers_status  ON child_transfers (status);

COMMENT ON TABLE child_transfers IS
    'Per-wallet sub-transactions spawned by the JIT multi-wallet executor. '
    'Each row is one real Stellar transaction from one treasury vault. '
    'Parent status = SETTLED if all children settle, '
    'PARTIAL_FAILURE if some fail, FAILED if all fail. '
    'UNIQUE(parent_transfer_id, wallet_id) prevents duplicate on-chain payments.';
