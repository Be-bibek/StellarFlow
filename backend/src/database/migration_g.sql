-- =============================================================================
-- Migration G: Soroban Proposal Timeline Tracking
-- Stores every on-chain transaction hash for multi-sig proposal lifecycle
-- (creation, each approval, final execution) and the vault breakdown.
-- =============================================================================

-- Main proposal tracking table
CREATE TABLE IF NOT EXISTS soroban_proposals (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- The on-chain proposal ID from the smart contract (e.g. 1, 2, 3...)
    proposal_id         INT           NOT NULL UNIQUE,

    -- Transaction hash when the proposal was first created on-chain
    creation_hash       VARCHAR(64),

    -- Proposer's Stellar public key
    proposer_address    VARCHAR(56),

    -- Recipient / vendor Stellar public key
    recipient_address   VARCHAR(56),

    -- Total amount in stroops (7 decimal places)
    amount_stroops      BIGINT,

    -- Number of required approvals
    required_approvals  INT           NOT NULL DEFAULT 2,

    -- Whether payout has been executed
    executed            BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Transaction hash of the final execution step (last approval)
    execution_hash      VARCHAR(64),

    -- JSONB array of vault payouts from the execution tx
    -- Schema: [{ "vault_name": "MASTER", "vault_address": "G...", "amount_stroops": 12345, "tx_hash": "abc..." }]
    vault_breakdown     JSONB         NOT NULL DEFAULT '[]',

    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soroban_proposals_proposal_id ON soroban_proposals (proposal_id);

-- Per-approval signature tracking
CREATE TABLE IF NOT EXISTS soroban_approvals (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id         INT           NOT NULL REFERENCES soroban_proposals(proposal_id) ON DELETE CASCADE,

    -- Which wallet approved it
    signer_address      VARCHAR(56)   NOT NULL,

    -- The Stellar transaction hash for this specific approval click
    tx_hash             VARCHAR(64)   NOT NULL,

    -- Approval step number (1st, 2nd, etc.)
    step_number         INT           NOT NULL DEFAULT 1,

    signed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One signer per proposal
    UNIQUE (proposal_id, signer_address)
);

CREATE INDEX IF NOT EXISTS idx_soroban_approvals_proposal_id ON soroban_approvals (proposal_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER trg_soroban_proposals_updated_at
    BEFORE UPDATE ON soroban_proposals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
