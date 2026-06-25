// =============================================================================
// StellarFlow — Phase E: Governance Layer Route Handlers
//
// Routes (all under /api/v1):
//   POST /gov/approvals/request        — Submit a transfer for governance evaluation
//   POST /gov/approvals/:id/approve    — Record an approval action
//   POST /gov/approvals/:id/reject     — Record a rejection action
//   GET  /gov/approvals/pending        — Approval inbox (PENDING_APPROVAL requests)
//   GET  /gov/approvals/history        — Approval history (all statuses)
//   GET  /gov/audit/logs               — Immutable audit log viewer
//
// Architecture:
//   - Policy engine evaluates amount and selects the matching approval_policy tier.
//   - < 1000 XLM (auto_execute=true): creates governance record + immediately
//     triggers the existing JIT execution engine (no approval gate).
//   - >= 1000 XLM: creates PENDING_APPROVAL record, broadcasts WS event, waits.
//   - approve_request: increments current_approvals; if threshold met, triggers JIT.
//   - reject_request: sets REJECTED status, broadcasts WS event.
//   - JIT execution always happens through the existing routes/jit.rs logic —
//     governance is a thin orchestration layer, not a second execution path.
//   - Audit logs are INSERT-only throughout. No UPDATE, no DELETE ever issued.
// =============================================================================

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    Json,
};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    database::models::{
        audit_action,
        find_governance_request, find_policy_for_amount,
        insert_approval_action, insert_audit_log, insert_governance_request,
        list_approval_actions, list_audit_logs, list_governance_history,
        list_pending_governance_requests, record_approval, set_governance_status,
        AuditLog, ApprovalAction, GovernanceRequest, NewApprovalAction,
        NewAuditLog, NewGovernanceRequest,
    },
    errors::{AppError, ApiResult},
    AppState,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: emit audit log entry (INSERT only — never UPDATE or DELETE)
// ─────────────────────────────────────────────────────────────────────────────

async fn audit(
    pool: &sqlx::PgPool,
    org_id: Uuid,
    transfer_id: Option<&str>,
    actor_id: &str,
    action: &str,
    metadata: serde_json::Value,
) {
    let log = NewAuditLog {
        org_id,
        transfer_id: transfer_id.map(String::from),
        actor_id:    actor_id.to_string(),
        action:      action.to_string(),
        metadata,
    };
    if let Err(e) = insert_audit_log(pool, &log).await {
        tracing::error!(error = %e, action = action, "Failed to write audit log");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: trigger JIT execution for an approved governance request
//
// Calls the existing /api/v1/jit/execute logic by making an internal HTTP
// call (or reusing the in-process reqwest client). This is the ONLY execution
// path — routes/jit.rs remains the single source of truth for settlement.
// ─────────────────────────────────────────────────────────────────────────────

async fn trigger_jit_execution(
    state: &Arc<AppState>,
    org_id: Uuid,
    gov_req_id: Uuid,
    transfer_id: &str,
    amount: &BigDecimal,
    asset_code: &str,
    destination: &str,
    actor_id: &str,
) {
    // Mark the governance request as EXECUTING
    if let Err(e) = set_governance_status(&state.db, gov_req_id, "EXECUTING").await {
        tracing::error!(error = %e, "Failed to set governance status to EXECUTING");
    }

    // Broadcast EXECUTION_STARTED WebSocket event
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":        "EXECUTION_STARTED",
        "transfer_id": transfer_id,
        "amount":      amount.to_string(),
        "actor_id":    actor_id,
    }));

    // Write audit log — EXECUTION_STARTED
    audit(
        &state.db, org_id, Some(transfer_id), "system",
        audit_action::EXECUTION_STARTED,
        serde_json::json!({ "triggered_by": actor_id }),
    ).await;

    // Call the existing JIT execution engine via internal HTTP
    // The backend's own port is known from the config bind_addr.
    let jit_url = format!(
        "http://127.0.0.1:{}/api/v1/jit/execute",
        state.config.bind_addr.split(':').last().unwrap_or("8080")
    );

    let body = serde_json::json!({
        "target_amount": amount.to_string().parse::<f64>().unwrap_or(0.0),
        "asset_code":    asset_code,
        "destination":   destination,
        "transfer_id":   transfer_id,
    });

    let client = reqwest::Client::new();
    match client.post(&jit_url).json(&body).send().await {
        Ok(resp) if resp.status().is_success() => {
            tracing::info!(
                transfer_id = transfer_id,
                "JIT execution triggered successfully from governance layer"
            );
        }
        Ok(resp) => {
            let status = resp.status();
            tracing::error!(
                transfer_id = transfer_id,
                http_status = %status,
                "JIT execution returned non-success from governance layer"
            );
            let _ = set_governance_status(&state.db, gov_req_id, "FAILED").await;
            audit(
                &state.db, org_id, Some(transfer_id), "system",
                audit_action::EXECUTION_FAILED,
                serde_json::json!({ "reason": format!("JIT returned HTTP {}", status) }),
            ).await;
        }
        Err(e) => {
            tracing::error!(
                transfer_id = transfer_id,
                error = %e,
                "Failed to call JIT execution from governance layer"
            );
            let _ = set_governance_status(&state.db, gov_req_id, "FAILED").await;
            audit(
                &state.db, org_id, Some(transfer_id), "system",
                audit_action::EXECUTION_FAILED,
                serde_json::json!({ "reason": e.to_string() }),
            ).await;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RequestApprovalBody {
    pub amount:      f64,
    pub asset_code:  Option<String>,
    pub destination: Option<String>,
    pub purpose:     Option<String>,
    /// Optional: caller may supply a pre-generated transfer_id for idempotency.
    pub transfer_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RequestApprovalResponse {
    pub governance_id:      String,
    pub transfer_id:        String,
    pub status:             String,
    pub required_approvals: i32,
    pub current_approvals:  i32,
    pub policy_name:        String,
    pub auto_executed:      bool,
    pub message:            String,
}

#[derive(Debug, Deserialize)]
pub struct ApproveBody {
    pub actor_id: Option<String>,
    pub comment:  Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApproveResponse {
    pub governance_id:      String,
    pub transfer_id:        String,
    pub status:             String,
    pub current_approvals:  i32,
    pub required_approvals: i32,
    pub threshold_met:      bool,
    pub message:            String,
}

#[derive(Debug, Deserialize)]
pub struct RejectBody {
    pub actor_id: Option<String>,
    pub comment:  Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RejectResponse {
    pub governance_id: String,
    pub transfer_id:   String,
    pub status:        String,
    pub message:       String,
}

#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    pub transfer_id: Option<String>,
    pub limit:       Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /gov/approvals/request
// ─────────────────────────────────────────────────────────────────────────────

pub async fn request_approval(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RequestApprovalBody>,
) -> ApiResult<Json<RequestApprovalResponse>> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let requester_id = "mock-user-123".to_string();
    let asset_code = payload.asset_code.unwrap_or_else(|| "native".to_string());
    let destination = payload.destination.unwrap_or_else(|| {
        std::env::var("STELLAR_ADMIN_PUBLIC_KEY").unwrap_or_default()
    });

    let amount_str = format!("{:.7}", payload.amount);
    let amount: BigDecimal = amount_str.parse().map_err(|_| {
        AppError::Validation(format!("Invalid amount: {}", payload.amount))
    })?;

    // ── 1. Evaluate policy ────────────────────────────────────────────────────
    let policy = find_policy_for_amount(&state.db, org_id, &amount)
        .await
        .map_err(AppError::Database)?;

    let (required_approvals, auto_execute, policy_id, policy_name) = match policy {
        Some(ref p) => (p.required_approvals, p.auto_execute, Some(p.id), p.name.clone()),
        None => (1, false, None, "Default (1 approval)".to_string()),
    };

    // ── 2. Generate transfer_id ───────────────────────────────────────────────
    let transfer_id = payload.transfer_id.unwrap_or_else(|| {
        format!("GOV-{}", &Uuid::new_v4().simple().to_string().to_uppercase()[..8])
    });

    // ── 3. Insert governance request ──────────────────────────────────────────
    let new_req = NewGovernanceRequest {
        org_id,
        transfer_id:        transfer_id.clone(),
        amount:             amount.clone(),
        asset_code:         asset_code.clone(),
        destination:        destination.clone(),
        purpose:            payload.purpose.clone(),
        policy_id,
        required_approvals,
        requester_id:       requester_id.clone(),
    };
    let gov_req = insert_governance_request(&state.db, &new_req)
        .await
        .map_err(AppError::Database)?;

    // ── 4. Write initial audit log — TRANSFER_CREATED ─────────────────────────
    audit(
        &state.db, org_id, Some(&transfer_id), &requester_id,
        audit_action::TRANSFER_CREATED,
        serde_json::json!({
            "amount":      payload.amount,
            "asset_code":  asset_code,
            "destination": destination,
            "purpose":     payload.purpose,
        }),
    ).await;

    // ── 5. Auto-execute or request approval ───────────────────────────────────
    if auto_execute {
        // Audit — AUTO_EXECUTED
        audit(
            &state.db, org_id, Some(&transfer_id), "system",
            audit_action::AUTO_EXECUTED,
            serde_json::json!({ "policy": policy_name, "reason": "amount below auto-execute threshold" }),
        ).await;

        // Broadcast auto-execute event
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":           "AUTO_EXECUTE",
            "transfer_id":    transfer_id,
            "governance_id":  gov_req.id.to_string(),
            "amount":         payload.amount,
        }));

        // Spawn JIT execution in background — non-blocking
        let state_clone = Arc::clone(&state);
        let tid = transfer_id.clone();
        let gid = gov_req.id;
        let amt = amount.clone();
        let ac  = asset_code.clone();
        let dst = destination.clone();
        let aid = requester_id.clone();
        tokio::spawn(async move {
            trigger_jit_execution(&state_clone, org_id, gid, &tid, &amt, &ac, &dst, &aid).await;
        });

        return Ok(Json(RequestApprovalResponse {
            governance_id:      gov_req.id.to_string(),
            transfer_id:        gov_req.transfer_id,
            status:             "AUTO_EXECUTING".to_string(),
            required_approvals: 0,
            current_approvals:  0,
            policy_name,
            auto_executed:      true,
            message:            "Amount is below the approval threshold — auto-executing via JIT engine.".to_string(),
        }));
    }

    // Requires approval — broadcast APPROVAL_REQUESTED
    audit(
        &state.db, org_id, Some(&transfer_id), &requester_id,
        audit_action::APPROVAL_REQUESTED,
        serde_json::json!({ "required_approvals": required_approvals, "policy": policy_name }),
    ).await;

    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":              "APPROVAL_REQUESTED",
        "governance_id":     gov_req.id.to_string(),
        "transfer_id":       transfer_id,
        "amount":            payload.amount,
        "required_approvals": required_approvals,
        "requester_id":      requester_id,
    }));

    Ok(Json(RequestApprovalResponse {
        governance_id:      gov_req.id.to_string(),
        transfer_id:        gov_req.transfer_id,
        status:             gov_req.status,
        required_approvals,
        current_approvals:  0,
        policy_name,
        auto_executed:      false,
        message:            format!(
            "Transfer is pending approval. {} of {} approvals required.",
            0, required_approvals
        ),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /gov/approvals/:id/approve
// ─────────────────────────────────────────────────────────────────────────────

pub async fn approve_request(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApproveBody>,
) -> ApiResult<Json<ApproveResponse>> {
    let actor_id = payload.actor_id.unwrap_or_else(|| "mock-user-123".to_string());
    let org_id   = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();

    // Fetch current state
    let gov_req = find_governance_request(&state.db, id)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Governance request {} not found", id)))?;

    if gov_req.status != "PENDING_APPROVAL" {
        return Err(AppError::Validation(format!(
            "Cannot approve a request in status '{}'. Must be PENDING_APPROVAL.",
            gov_req.status
        )));
    }

    // Insert approval action (immutable)
    insert_approval_action(&state.db, &NewApprovalAction {
        governance_request_id: id,
        actor_id:              actor_id.clone(),
        action:                "APPROVED".to_string(),
        comment:               payload.comment.clone(),
    }).await.map_err(AppError::Database)?;

    // Atomically increment + possibly transition status
    let updated = record_approval(&state.db, id)
        .await
        .map_err(AppError::Database)?;

    let threshold_met = updated.status == "APPROVED";

    // Write audit log
    audit(
        &state.db, org_id, Some(&updated.transfer_id), &actor_id,
        audit_action::APPROVAL_GRANTED,
        serde_json::json!({
            "approvals_so_far": updated.current_approvals,
            "required":         updated.required_approvals,
            "threshold_met":    threshold_met,
            "comment":          payload.comment,
        }),
    ).await;

    // Broadcast APPROVAL_GRANTED
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":             "APPROVAL_GRANTED",
        "governance_id":    id.to_string(),
        "transfer_id":      updated.transfer_id,
        "approver":         actor_id,
        "approvals_so_far": updated.current_approvals,
        "required":         updated.required_approvals,
        "threshold_met":    threshold_met,
    }));

    // If threshold met, trigger JIT execution
    if threshold_met {
        // Broadcast READY_FOR_EXECUTION
        let _ = state.broadcast_tx.send(serde_json::json!({
            "type":          "READY_FOR_EXECUTION",
            "governance_id": id.to_string(),
            "transfer_id":   updated.transfer_id,
        }));

        // Spawn execution in background
        let state_clone = Arc::clone(&state);
        let tid  = updated.transfer_id.clone();
        let gid  = id;
        let amt  = updated.amount.clone();
        let ac   = updated.asset_code.clone();
        let dst  = updated.destination.clone();
        let aid  = actor_id.clone();
        tokio::spawn(async move {
            trigger_jit_execution(&state_clone, org_id, gid, &tid, &amt, &ac, &dst, &aid).await;
        });
    }

    Ok(Json(ApproveResponse {
        governance_id:      id.to_string(),
        transfer_id:        updated.transfer_id,
        status:             updated.status,
        current_approvals:  updated.current_approvals,
        required_approvals: updated.required_approvals,
        threshold_met,
        message: if threshold_met {
            "Approval threshold met. JIT execution triggered.".to_string()
        } else {
            format!(
                "Approval recorded. {}/{} approvals collected.",
                updated.current_approvals, updated.required_approvals
            )
        },
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /gov/approvals/:id/reject
// ─────────────────────────────────────────────────────────────────────────────

pub async fn reject_request(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectBody>,
) -> ApiResult<Json<RejectResponse>> {
    let actor_id = payload.actor_id.unwrap_or_else(|| "mock-user-123".to_string());
    let org_id   = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();

    let gov_req = find_governance_request(&state.db, id)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound(format!("Governance request {} not found", id)))?;

    if gov_req.status != "PENDING_APPROVAL" {
        return Err(AppError::Validation(format!(
            "Cannot reject a request in status '{}'. Must be PENDING_APPROVAL.",
            gov_req.status
        )));
    }

    // Insert rejection action (immutable)
    insert_approval_action(&state.db, &NewApprovalAction {
        governance_request_id: id,
        actor_id:              actor_id.clone(),
        action:                "REJECTED".to_string(),
        comment:               payload.comment.clone(),
    }).await.map_err(AppError::Database)?;

    // Update status to REJECTED
    let updated = set_governance_status(&state.db, id, "REJECTED")
        .await
        .map_err(AppError::Database)?;

    // Write audit log (immutable)
    audit(
        &state.db, org_id, Some(&updated.transfer_id), &actor_id,
        audit_action::APPROVAL_REJECTED,
        serde_json::json!({ "comment": payload.comment }),
    ).await;

    // Broadcast APPROVAL_REJECTED
    let _ = state.broadcast_tx.send(serde_json::json!({
        "type":          "APPROVAL_REJECTED",
        "governance_id": id.to_string(),
        "transfer_id":   updated.transfer_id,
        "rejector":      actor_id,
        "comment":       payload.comment,
    }));

    Ok(Json(RejectResponse {
        governance_id: id.to_string(),
        transfer_id:   updated.transfer_id,
        status:        updated.status,
        message:       "Transfer request has been rejected.".to_string(),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /gov/approvals/pending
// ─────────────────────────────────────────────────────────────────────────────

pub async fn list_pending(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<Vec<GovernanceRequest>>> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let items = list_pending_governance_requests(&state.db, org_id)
        .await
        .map_err(AppError::Database)?;
    Ok(Json(items))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /gov/approvals/history
// ─────────────────────────────────────────────────────────────────────────────

pub async fn list_history(
    State(state): State<Arc<AppState>>,
    Query(q): Query<HistoryQuery>,
) -> ApiResult<Json<serde_json::Value>> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let limit  = q.limit.unwrap_or(50).min(200);
    let items  = list_governance_history(&state.db, org_id, limit)
        .await
        .map_err(AppError::Database)?;

    // For each request also include its actions
    let mut enriched = Vec::with_capacity(items.len());
    for req in items {
        let actions = list_approval_actions(&state.db, req.id)
            .await
            .unwrap_or_default();
        enriched.push(serde_json::json!({
            "request": req,
            "actions": actions,
        }));
    }
    Ok(Json(serde_json::json!(enriched)))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /gov/audit/logs
// ─────────────────────────────────────────────────────────────────────────────

pub async fn get_audit_logs(
    State(state): State<Arc<AppState>>,
    Query(q): Query<AuditLogQuery>,
) -> ApiResult<Json<Vec<AuditLog>>> {
    let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    let limit  = q.limit.unwrap_or(100).min(500);
    let logs   = list_audit_logs(
        &state.db,
        org_id,
        q.transfer_id.as_deref(),
        limit,
    ).await.map_err(AppError::Database)?;
    Ok(Json(logs))
}
