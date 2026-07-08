// =============================================================================
// StellarFlow — Soroban Proposal Timeline Routes
//
// Routes (all under /api/v1/soroban):
//   POST /soroban/proposals                  — Record a new on-chain proposal + creation hash
//   POST /soroban/proposals/:id/approvals    — Append an approval hash
//   POST /soroban/proposals/:id/execute      — Mark proposal as executed with vault breakdown
//   GET  /soroban/proposals                  — List all proposals with full timeline
//   GET  /soroban/proposals/:id              — Get a single proposal timeline
// =============================================================================

use std::sync::Arc;
use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use crate::{errors::AppError, AppState};

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateProposalRequest {
    pub proposal_id:        u32,
    pub creation_hash:      String,
    pub proposer_address:   String,
    pub recipient_address:  String,
    pub amount_stroops:     i64,
    pub required_approvals: i32,
}

#[derive(Debug, Deserialize)]
pub struct AddApprovalRequest {
    pub signer_address: String,
    pub tx_hash:        String,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteProposalRequest {
    pub execution_hash:  String,
    pub vault_breakdown: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct ApprovalStep {
    pub step_number:    i32,
    pub signer_address: String,
    pub tx_hash:        String,
    pub signed_at:      String,
}

#[derive(Debug, Serialize)]
pub struct VaultPayout {
    pub vault_name:     String,
    pub vault_address:  String,
    pub amount_stroops: i64,
}

#[derive(Debug, Serialize)]
pub struct ProposalTimeline {
    pub proposal_id:        i32,
    pub creation_hash:      Option<String>,
    pub proposer_address:   Option<String>,
    pub recipient_address:  Option<String>,
    pub amount_stroops:     Option<i64>,
    pub required_approvals: i32,
    pub executed:           bool,
    pub execution_hash:     Option<String>,
    pub vault_breakdown:    serde_json::Value,
    pub approvals:          Vec<ApprovalStep>,
    pub created_at:         String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /api/v1/soroban/proposals
/// Called by the frontend immediately after contractProposeTransfer succeeds.
pub async fn create_proposal(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateProposalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query(
        r#"
        INSERT INTO soroban_proposals
            (proposal_id, creation_hash, proposer_address, recipient_address, amount_stroops, required_approvals)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (proposal_id) DO UPDATE SET
            creation_hash      = EXCLUDED.creation_hash,
            proposer_address   = EXCLUDED.proposer_address,
            recipient_address  = EXCLUDED.recipient_address,
            amount_stroops     = EXCLUDED.amount_stroops,
            required_approvals = EXCLUDED.required_approvals,
            updated_at         = NOW()
        "#,
    )
    .bind(body.proposal_id as i32)
    .bind(&body.creation_hash)
    .bind(&body.proposer_address)
    .bind(&body.recipient_address)
    .bind(body.amount_stroops)
    .bind(body.required_approvals)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    tracing::info!(
        proposal_id = body.proposal_id,
        hash = %body.creation_hash,
        "Soroban proposal creation hash recorded"
    );

    Ok(Json(serde_json::json!({
        "ok": true,
        "proposal_id": body.proposal_id,
        "creation_hash": body.creation_hash,
    })))
}

/// POST /api/v1/soroban/proposals/:id/approvals
/// Called by the frontend immediately after contractApproveProposal succeeds.
pub async fn add_approval(
    State(state): State<Arc<AppState>>,
    Path(proposal_id): Path<i32>,
    Json(body): Json<AddApprovalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Ensure the parent proposal row exists (auto-create if missing)
    sqlx::query(
        r#"
        INSERT INTO soroban_proposals (proposal_id)
        VALUES ($1)
        ON CONFLICT (proposal_id) DO NOTHING
        "#,
    )
    .bind(proposal_id)
    .execute(&state.db)
    .await
    .ok();

    // Determine step number = current count + 1
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM soroban_approvals WHERE proposal_id = $1",
    )
    .bind(proposal_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0_i64);

    let step_number = (count + 1) as i32;

    sqlx::query(
        r#"
        INSERT INTO soroban_approvals (proposal_id, signer_address, tx_hash, step_number)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (proposal_id, signer_address) DO UPDATE SET
            tx_hash     = EXCLUDED.tx_hash,
            step_number = EXCLUDED.step_number
        "#,
    )
    .bind(proposal_id)
    .bind(&body.signer_address)
    .bind(&body.tx_hash)
    .bind(step_number)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    // Touch parent updated_at
    sqlx::query(
        "UPDATE soroban_proposals SET updated_at = NOW() WHERE proposal_id = $1",
    )
    .bind(proposal_id)
    .execute(&state.db)
    .await
    .ok();

    tracing::info!(
        proposal_id,
        step = step_number,
        signer = %body.signer_address,
        "Approval step hash recorded"
    );

    Ok(Json(serde_json::json!({
        "ok": true,
        "proposal_id": proposal_id,
        "step_number": step_number,
        "tx_hash": body.tx_hash,
    })))
}

/// POST /api/v1/soroban/proposals/:id/execute
/// Called by the frontend when the final approval triggers execution.
pub async fn mark_executed(
    State(state): State<Arc<AppState>>,
    Path(proposal_id): Path<i32>,
    Json(body): Json<ExecuteProposalRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    sqlx::query(
        r#"
        UPDATE soroban_proposals
        SET executed       = TRUE,
            execution_hash = $1,
            vault_breakdown = $2,
            updated_at     = NOW()
        WHERE proposal_id  = $3
        "#,
    )
    .bind(&body.execution_hash)
    .bind(&body.vault_breakdown)
    .bind(proposal_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    // Also update the global transactions table so the history view instantly shows it as SETTLED
    let transfer_id = format!("ONCHAIN-PROP-{}", proposal_id);
    sqlx::query(
        r#"
        UPDATE transactions
        SET status = 'SETTLED',
            stellar_tx_hash = $1,
            settled_at = NOW()
        WHERE transfer_id = $2
        "#,
    )
    .bind(&body.execution_hash)
    .bind(&transfer_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::Database(e))?;

    tracing::info!(
        proposal_id,
        execution_hash = %body.execution_hash,
        "Proposal marked as executed with vault breakdown"
    );

    Ok(Json(serde_json::json!({
        "ok": true,
        "proposal_id": proposal_id,
        "executed": true,
    })))
}

/// GET /api/v1/soroban/proposals
/// Returns all proposals ordered by newest first, each with full approval timeline.
pub async fn list_proposals(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProposalTimeline>>, AppError> {
    // Fetch all proposals
    let rows: Vec<(i32, Option<String>, Option<String>, Option<String>, Option<i64>, i32, bool, Option<String>, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>)> =
        sqlx::query_as(
            r#"
            SELECT proposal_id, creation_hash, proposer_address, recipient_address,
                   amount_stroops, required_approvals, executed, execution_hash,
                   vault_breakdown, created_at
            FROM soroban_proposals
            ORDER BY proposal_id DESC
            "#,
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;

    let mut timelines = Vec::new();

    for (proposal_id, creation_hash, proposer_address, recipient_address,
         amount_stroops, required_approvals, executed, execution_hash,
         vault_breakdown, created_at) in rows
    {
        let approval_rows: Vec<(String, String, i32, chrono::DateTime<chrono::Utc>)> =
            sqlx::query_as(
                r#"
                SELECT signer_address, tx_hash, step_number, signed_at
                FROM soroban_approvals
                WHERE proposal_id = $1
                ORDER BY step_number ASC
                "#,
            )
            .bind(proposal_id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

        let approvals = approval_rows
            .into_iter()
            .map(|(signer_address, tx_hash, step_number, signed_at)| ApprovalStep {
                step_number,
                signer_address,
                tx_hash,
                signed_at: signed_at.to_rfc3339(),
            })
            .collect();

        timelines.push(ProposalTimeline {
            proposal_id,
            creation_hash,
            proposer_address,
            recipient_address,
            amount_stroops,
            required_approvals,
            executed,
            execution_hash,
            vault_breakdown: vault_breakdown.unwrap_or(serde_json::Value::Array(vec![])),
            approvals,
            created_at: created_at.to_rfc3339(),
        });
    }

    Ok(Json(timelines))
}

/// GET /api/v1/soroban/proposals/:id
/// Returns the full timeline for a single proposal.
pub async fn get_proposal(
    State(state): State<Arc<AppState>>,
    Path(proposal_id): Path<i32>,
) -> Result<Json<ProposalTimeline>, AppError> {
    let row: Option<(i32, Option<String>, Option<String>, Option<String>, Option<i64>, i32, bool, Option<String>, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>)> =
        sqlx::query_as(
            r#"
            SELECT proposal_id, creation_hash, proposer_address, recipient_address,
                   amount_stroops, required_approvals, executed, execution_hash,
                   vault_breakdown, created_at
            FROM soroban_proposals
            WHERE proposal_id = $1
            "#,
        )
        .bind(proposal_id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::Database(e))?;

    let (pid, creation_hash, proposer_address, recipient_address,
         amount_stroops, required_approvals, executed, execution_hash,
         vault_breakdown, created_at) = row.ok_or_else(|| {
        AppError::NotFound(format!("Proposal {} not found", proposal_id))
    })?;

    let approval_rows: Vec<(String, String, i32, chrono::DateTime<chrono::Utc>)> =
        sqlx::query_as(
            r#"
            SELECT signer_address, tx_hash, step_number, signed_at
            FROM soroban_approvals
            WHERE proposal_id = $1
            ORDER BY step_number ASC
            "#,
        )
        .bind(pid)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let approvals = approval_rows
        .into_iter()
        .map(|(signer_address, tx_hash, step_number, signed_at)| ApprovalStep {
            step_number,
            signer_address,
            tx_hash,
            signed_at: signed_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(ProposalTimeline {
        proposal_id: pid,
        creation_hash,
        proposer_address,
        recipient_address,
        amount_stroops,
        required_approvals,
        executed,
        execution_hash,
        vault_breakdown: vault_breakdown.unwrap_or(serde_json::Value::Array(vec![])),
        approvals,
        created_at: created_at.to_rfc3339(),
    }))
}
