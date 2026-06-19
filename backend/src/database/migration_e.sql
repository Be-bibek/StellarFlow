-- =============================================================================
-- StellarFlow — Phase E Migration: Governance Layer
--
-- Creates:
--   - user_roles              (RBAC: ADMIN / TREASURY_MANAGER / AUDITOR)
--   - approval_policies       (policy engine: amount tiers → required_approvals)
--   - governance_requests     (approval workflow, separate from old approval_requests)
--   - approval_actions        (immutable append-only action log per request)
--   - audit_logs              (immutable append-only audit trail for entire system)
--
-- Adds new transaction_status values:
--   DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, EXECUTING
--
-- All statements are idempotent. Safe to run on every startup.
-- =============================================================================

-- ── Add new transaction_status enum values ────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAFT'
        AND enumtypid = 'transaction_status'::regtype) THEN
        ALTER TYPE transaction_status ADD VALUE 'DRAFT';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_APPROVAL'
        AND enumtypid = 'transaction_status'::regtype) THEN
        ALTER TYPE transaction_status ADD VALUE 'PENDING_APPROVAL';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVED'
        AND enumtypid = 'transaction_status'::regtype) THEN
        ALTER TYPE transaction_status ADD VALUE 'APPROVED';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REJECTED'
        AND enumtypid = 'transaction_status'::regtype) THEN
        ALTER TYPE transaction_status ADD VALUE 'REJECTED';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EXECUTING'
        AND enumtypid = 'transaction_status'::regtype) THEN
        ALTER TYPE transaction_status ADD VALUE 'EXECUTING';
    END IF;
END $$;

-- ── user_roles ────────────────────────────────────────────────────────────────
-- RBAC roles assigned to user identities (currently Firebase UID / mock user).
-- role: ADMIN | TREASURY_MANAGER | AUDITOR
-- Permissions are enforced in route handlers, not at the DB layer.
-- Schema intentionally supports requester_id != approver_id for future Phase F.
CREATE TABLE IF NOT EXISTS user_roles (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id     TEXT        NOT NULL,   -- Firebase UID or mock-user-123
    role        TEXT        NOT NULL CHECK (role IN ('ADMIN', 'TREASURY_MANAGER', 'AUDITOR')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON user_roles (org_id, user_id);

COMMENT ON TABLE user_roles IS
    'RBAC role assignments. role IN (ADMIN, TREASURY_MANAGER, AUDITOR). '
    'One user may hold multiple roles. Enforced in route handlers, not DB constraints.';

-- ── approval_policies ─────────────────────────────────────────────────────────
-- Defines amount tiers and required approval counts.
-- auto_execute = TRUE means the governance layer skips approval and goes direct to JIT.
CREATE TABLE IF NOT EXISTS approval_policies (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              UUID            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(100)    NOT NULL,
    min_amount          NUMERIC(20, 7)  NOT NULL DEFAULT 0,
    max_amount          NUMERIC(20, 7),               -- NULL = no upper bound
    required_approvals  INT             NOT NULL DEFAULT 1,
    auto_execute        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_policies_org ON approval_policies (org_id);

CREATE OR REPLACE TRIGGER trg_approval_policies_updated_at
    BEFORE UPDATE ON approval_policies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE approval_policies IS
    'Policy tiers controlling whether a transfer auto-executes or requires '
    'N approvals before the JIT engine is triggered. '
    'max_amount NULL = applies to all amounts above min_amount.';

-- ── governance_requests ───────────────────────────────────────────────────────
-- One row per transfer that enters the governance workflow.
-- Intentionally separate from the old `approval_requests` table (XDR multi-sig)
-- to avoid any backward-compatibility breakage.
--
-- requester_id and approver schema deliberately supports four-eyes separation
-- for Phase F hardening, but it is NOT enforced in the MVP.
CREATE TABLE IF NOT EXISTS governance_requests (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              UUID            NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transfer_id         VARCHAR(64)     NOT NULL UNIQUE,   -- mirrors transactions.transfer_id
    amount              NUMERIC(20, 7)  NOT NULL,
    asset_code          VARCHAR(12)     NOT NULL DEFAULT 'native',
    destination         VARCHAR(56)     NOT NULL,
    purpose             TEXT,
    policy_id           UUID            REFERENCES approval_policies(id),
    required_approvals  INT             NOT NULL DEFAULT 1,
    current_approvals   INT             NOT NULL DEFAULT 0,
    status              TEXT            NOT NULL DEFAULT 'PENDING_APPROVAL'
                        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'SETTLED', 'FAILED')),
    -- requester_id stored as TEXT (Firebase UID / mock-user-123)
    -- Future Phase F: enforce requester_id != each approver's actor_id
    requester_id        TEXT            NOT NULL DEFAULT 'mock-user-123',
    expires_at          TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_requests_org    ON governance_requests (org_id);
CREATE INDEX IF NOT EXISTS idx_governance_requests_status ON governance_requests (status);
CREATE INDEX IF NOT EXISTS idx_governance_requests_expiry ON governance_requests (expires_at);

CREATE OR REPLACE TRIGGER trg_governance_requests_updated_at
    BEFORE UPDATE ON governance_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE governance_requests IS
    'Governance approval requests — separate from old XDR multi-sig approval_requests. '
    'Each row is a transfer awaiting human approval before JIT execution is triggered. '
    'requester_id supports future four-eyes enforcement (Phase F).';

-- ── approval_actions ──────────────────────────────────────────────────────────
-- Immutable append-only log: every APPROVED/REJECTED/COMMENTED action.
-- Never UPDATE or DELETE rows from this table.
CREATE TABLE IF NOT EXISTS approval_actions (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    governance_request_id UUID      NOT NULL REFERENCES governance_requests(id) ON DELETE CASCADE,
    actor_id            TEXT        NOT NULL,   -- Firebase UID / mock-user-123
    action              TEXT        NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'COMMENTED')),
    comment             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at — this table is append-only by design
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions (governance_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_actor   ON approval_actions (actor_id);

COMMENT ON TABLE approval_actions IS
    'Immutable per-action log for governance requests. '
    'Only INSERT is ever issued — no UPDATE, no DELETE. '
    'Required for compliance audit trails.';

-- ── audit_logs ────────────────────────────────────────────────────────────────
-- System-wide immutable audit trail. Written at every governance state transition.
-- No UPDATE, no DELETE — ever. No updated_at column by design.
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transfer_id VARCHAR(64),                -- NULL for non-transfer events
    actor_id    TEXT        NOT NULL DEFAULT 'system',
    action      TEXT        NOT NULL,       -- See AuditAction constants below
    metadata    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- No updated_at — this table is structurally immutable
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org         ON audit_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_transfer    ON audit_logs (transfer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs (created_at DESC);

COMMENT ON TABLE audit_logs IS
    'Immutable system-wide audit trail. '
    'Actions: TRANSFER_CREATED, APPROVAL_REQUESTED, APPROVAL_GRANTED, '
    'APPROVAL_REJECTED, EXECUTION_STARTED, EXECUTION_SETTLED, EXECUTION_FAILED. '
    'Only INSERT — no UPDATE or DELETE ever issued against this table.';

-- =============================================================================
-- Seed default approval policies for org 00000000-0000-0000-0000-000000000001
-- (Idempotent: only inserts if the org has no policies yet)
-- =============================================================================
INSERT INTO approval_policies (org_id, name, min_amount, max_amount, required_approvals, auto_execute)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Auto Execute (< 1000 XLM)',
    0,
    999.9999999,
    0,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM approval_policies
    WHERE org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND name = 'Auto Execute (< 1000 XLM)'
);

INSERT INTO approval_policies (org_id, name, min_amount, max_amount, required_approvals, auto_execute)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Single Approval (1000–9999 XLM)',
    1000,
    9999.9999999,
    1,
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM approval_policies
    WHERE org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND name = 'Single Approval (1000–9999 XLM)'
);

INSERT INTO approval_policies (org_id, name, min_amount, max_amount, required_approvals, auto_execute)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Dual Approval (10000+ XLM)',
    10000,
    NULL,
    2,
    FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM approval_policies
    WHERE org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND name = 'Dual Approval (10000+ XLM)'
);

-- Seed the demo admin role for mock user
INSERT INTO user_roles (org_id, user_id, role)
SELECT
    '00000000-0000-0000-0000-000000000001'::uuid,
    'mock-user-123',
    'ADMIN'
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND user_id = 'mock-user-123'
      AND role = 'ADMIN'
);
