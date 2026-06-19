-- =============================================================================
-- StellarFlow — Migration F: Treasury Funding Center
-- Idempotent: safe to run on every startup (IF NOT EXISTS throughout)
-- =============================================================================

-- Treasury funding history table
CREATE TABLE IF NOT EXISTS treasury_funding_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    wallet_id   UUID NOT NULL,
    amount      NUMERIC(20, 7) NOT NULL,
    method      VARCHAR(50) NOT NULL,    -- 'friendbot' | 'manual'
    reason      TEXT,
    actor_id    VARCHAR(255) NOT NULL DEFAULT 'system',
    stellar_tx_hash VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_wallet    ON treasury_funding_history(wallet_id);
CREATE INDEX IF NOT EXISTS idx_funding_created   ON treasury_funding_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funding_org       ON treasury_funding_history(org_id);
