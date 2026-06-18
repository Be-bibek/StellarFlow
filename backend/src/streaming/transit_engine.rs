// =============================================================================
// StellarFlow — Real-Time Transit Streaming Engine
//
// Two subsystems run as concurrent background tokio tasks:
//
// 1. `soroban_event_poller`
//    A long-polling loop that calls the Soroban RPC `getEvents` method at a
//    configurable interval, filtering for events emitted by the treasury
//    contract ID. Parsed events are written into the database and fed into the
//    broadcast channel for distribution to WebSocket clients.
//
// 2. `ws_gateway_handler`
//    WebSocket endpoint at /v1/transit/:enterprise_id.
//    Each connected client receives a Tokio broadcast::Receiver clone.
//    Outbound messages are JSON payloads constructed from contract events and
//    status transitions, driving the frontend Framer Motion pipeline state.
// =============================================================================

use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::time::interval;

use crate::{errors::AppError, AppState};

// ─────────────────────────────────────────────────────────────────────────────
// Soroban Event Models
// ─────────────────────────────────────────────────────────────────────────────

/// Represents one event emitted by the TreasuryRouter Soroban contract,
/// as returned by the `getEvents` RPC method.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SorobanContractEvent {
    /// Unique event identifier from the Soroban ledger.
    pub id: String,

    /// Ledger close sequence at which this event was emitted.
    pub ledger: u32,

    /// ISO-8601 UTC timestamp of the ledger close.
    pub ledger_closed_at: String,

    /// Contract address that emitted the event.
    pub contract_id: String,

    /// Discriminant topic array (e.g., ["routed"], ["approved"]).
    pub topics: Vec<String>,

    /// Event payload — JSON-decoded from Soroban SCVal XDR.
    pub payload: serde_json::Value,
}

/// A parsed, human-readable transit event ready for WebSocket delivery.
/// This is what the frontend Framer Motion pipeline consumes.
#[derive(Debug, Clone, Serialize)]
pub struct TransitEvent {
    /// Event discriminant matching frontend action types.
    pub event_type: TransitEventType,

    /// The on-chain transfer ID or approval ref this event relates to.
    pub ref_id: String,

    /// Owning organization UUID (for client-side filtering).
    pub org_id: Option<String>,

    /// New status in the UI state machine.
    pub new_status: Option<String>,

    /// Full event payload for detailed inspection.
    pub payload: serde_json::Value,

    /// Human-readable timestamp string.
    pub timestamp: String,
}

/// Canonical event type discriminants used by the WebSocket gateway.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TransitEventType {
    /// A payout was routed by the contract (maps to ROUTING → STELLAR_LEDGER).
    PayoutRouted,
    /// A multi-sig approval was granted on-chain.
    ApprovalGranted,
    /// A transaction confirmed as SETTLED on the Stellar ledger.
    TransactionSettled,
    /// A transaction failed.
    TransactionFailed,
    /// Keep-alive ping to prevent WebSocket timeout.
    Heartbeat,
}

// ─────────────────────────────────────────────────────────────────────────────
// Soroban RPC Polling Loop
// ─────────────────────────────────────────────────────────────────────────────

/// Long-polling background task that subscribes to Soroban contract events.
///
/// This function is spawned once at server startup via `tokio::spawn` in main.rs.
///
/// Polling strategy:
///   - Track the `latest_ledger` cursor returned by each `getEvents` call.
///   - On each tick, request events `startLedger = cursor` for the contract.
///   - Parse each raw event into a `TransitEvent` and broadcast to WS clients.
///   - On parse failure or network error, log and continue (never panic).
///
/// Production `getEvents` RPC call structure:
/// ```json
/// {
///   "jsonrpc": "2.0",
///   "id": 1,
///   "method": "getEvents",
///   "params": {
///     "startLedger": <cursor>,
///     "filters": [{
///       "type": "contract",
///       "contractIds": ["<CONTRACT_ID>"],
///       "topics": [["*"]]
///     }],
///     "pagination": { "limit": 100 }
///   }
/// }
/// ```
pub async fn soroban_event_poller(state: Arc<AppState>) {
    let poll_interval_ms = std::env::var("SOROBAN_POLL_INTERVAL_MS")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(3_000);

    let contract_id = std::env::var("TREASURY_CONTRACT_ID")
        .unwrap_or_else(|_| "CONTRACT_ID_NOT_SET".to_string());

    let rpc_url = std::env::var("SOROBAN_RPC_URL")
        .unwrap_or_else(|_| "https://soroban-testnet.stellar.org".to_string());

    tracing::info!(
        contract_id = %contract_id,
        rpc_url     = %rpc_url,
        interval_ms = poll_interval_ms,
        "Soroban event poller starting"
    );

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .expect("Failed to build Soroban RPC HTTP client");

    // Cursor tracks the last processed ledger sequence.
    let mut cursor_ledger: u64 = 0;
    let mut ticker = interval(Duration::from_millis(poll_interval_ms));

    loop {
        ticker.tick().await;

        // Build the getEvents JSON-RPC request body.
        let request_body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getEvents",
            "params": {
                "startLedger": cursor_ledger,
                "filters": [{
                    "type": "contract",
                    "contractIds": [contract_id],
                    "topics": [["*"]]
                }],
                "pagination": {
                    "limit": 100
                }
            }
        });

        // POST to Soroban RPC node.
        let response = match http_client
            .post(&rpc_url)
            .json(&request_body)
            .send()
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::warn!(error = %e, "Soroban RPC request failed; retrying next tick");
                continue;
            }
        };

        let rpc_response: serde_json::Value = match response.json().await {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(error = %e, "Failed to parse Soroban RPC response body");
                continue;
            }
        };

        // Extract the events array from the response.
        let events = match rpc_response
            .get("result")
            .and_then(|r| r.get("events"))
            .and_then(|e| e.as_array())
        {
            Some(arr) => arr.clone(),
            None => {
                // Update cursor even on empty result to advance ledger window.
                if let Some(latest) = rpc_response
                    .get("result")
                    .and_then(|r| r.get("latestLedger"))
                    .and_then(|l| l.as_u64())
                {
                    cursor_ledger = latest;
                }
                continue;
            }
        };

        tracing::debug!(
            event_count = events.len(),
            cursor      = cursor_ledger,
            "Soroban events received"
        );

        for raw_event in &events {
            if let Some(transit_event) = parse_soroban_event(raw_event) {
                // Advance ledger cursor.
                if let Some(ledger) = raw_event.get("ledger").and_then(|l| l.as_u64()) {
                    if ledger + 1 > cursor_ledger {
                        cursor_ledger = ledger + 1;
                    }
                }

                // Persist event reference in database for audit trail.
                persist_event_audit(&state, &transit_event).await;

                // Broadcast to all connected WebSocket clients.
                let payload = match serde_json::to_value(&transit_event) {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!(error = %e, "Event serialization failed");
                        continue;
                    }
                };

                let sent = state.broadcast_tx.send(payload);
                tracing::debug!(result = ?sent, "WebSocket broadcast dispatched");
            }
        }
    }
}

/// Parse one raw Soroban `getEvents` result entry into a `TransitEvent`.
/// Returns `None` if the event cannot be interpreted as a treasury action.
fn parse_soroban_event(raw: &serde_json::Value) -> Option<TransitEvent> {
    // Extract topic discriminant (first element of the topics array).
    let topic = raw
        .get("topic")
        .and_then(|t| t.as_array())
        .and_then(|arr| arr.first())
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();

    let ledger_closed_at = raw
        .get("ledgerClosedAt")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    // Map Soroban event topics to TransitEventType.
    let (event_type, new_status) = match topic.as_str() {
        "routed" => (TransitEventType::PayoutRouted,    Some("STELLAR_LEDGER".into())),
        "approved" => (TransitEventType::ApprovalGranted, Some("ROUTING".into())),
        "settled" => (TransitEventType::TransactionSettled, Some("SETTLED".into())),
        "failed"  => (TransitEventType::TransactionFailed,  Some("FAILED".into())),
        _ => return None, // Unknown event — skip silently.
    };

    // Extract the ref_id (transfer_id or approval ref) from the payload.
    let payload = raw.get("value").cloned().unwrap_or(serde_json::Value::Null);
    let ref_id  = payload
        .get("transfer_id")
        .or_else(|| payload.get("tx_ref"))
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let org_id = payload
        .get("org_id")
        .and_then(|v| v.as_str())
        .map(String::from);

    Some(TransitEvent {
        event_type,
        ref_id,
        org_id,
        new_status,
        payload,
        timestamp: ledger_closed_at,
    })
}

/// Write a summary of the parsed event into PostgreSQL for audit purposes.
async fn persist_event_audit(state: &Arc<AppState>, event: &TransitEvent) {
    if let Err(e) = sqlx::query(
        r#"
        UPDATE transactions
        SET soroban_event_id = $2,
            status           = CASE
                WHEN $3 = 'SETTLED'        THEN 'SETTLED'::transaction_status
                WHEN $3 = 'STELLAR_LEDGER' THEN 'STELLAR_LEDGER'::transaction_status
                WHEN $3 = 'ROUTING'        THEN 'ROUTING'::transaction_status
                WHEN $3 = 'FAILED'         THEN 'FAILED'::transaction_status
                ELSE status
            END
        WHERE transfer_id = $1
        "#
    )
    .bind(&event.ref_id)
    .bind(format!("soroban:{}:{}", event.timestamp, event.ref_id))
    .bind(event.new_status.clone().unwrap_or_default())
    .execute(&state.db)
    .await
    {
        tracing::warn!(
            ref_id = %event.ref_id,
            error  = %e,
            "Failed to persist Soroban event audit record"
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Gateway Handler
// GET /v1/transit/:enterprise_id (upgraded to WebSocket)
// ─────────────────────────────────────────────────────────────────────────────

/// HTTP upgrade handler — promotes the HTTP connection to a WebSocket tunnel.
/// Axum extracts the `WebSocketUpgrade` from the request and calls `handle_ws`.
pub async fn ws_gateway_handler(
    ws: WebSocketUpgrade,
    Path(enterprise_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    tracing::info!(enterprise_id = %enterprise_id, "WebSocket upgrade requested");

    ws.on_upgrade(move |socket| handle_ws(socket, enterprise_id, state))
}

/// Manage a single connected WebSocket client.
///
/// Architecture:
///   - Subscribe to the global `broadcast::Receiver`.
///   - Filter events by `org_id` matching `enterprise_id`.
///   - Forward matching payloads as UTF-8 JSON text frames.
///   - Emit a heartbeat every 30s to prevent proxy timeout disconnects.
///   - Clean up gracefully on client disconnect or send error.
async fn handle_ws(
    socket: WebSocket,
    enterprise_id: String,
    state: Arc<AppState>,
) {
    let (mut sender, mut receiver) = socket.split();

    // Each WS client gets its own broadcast receiver.
    let mut broadcast_rx = state.broadcast_tx.subscribe();

    // Heartbeat interval.
    let mut heartbeat = interval(Duration::from_secs(30));

    // Send connection acknowledgment.
    let ack = serde_json::json!({
        "type":          "CONNECTED",
        "enterprise_id": enterprise_id,
        "message":       "StellarFlow Transit Engine connected. Real-time ledger stream active.",
    });
    if sender
        .send(Message::Text(ack.to_string()))
        .await
        .is_err()
    {
        return;
    }

    loop {
        tokio::select! {
            // ── Handle inbound broadcast events ─────────────────────────────
            Ok(event_payload) = broadcast_rx.recv() => {
                // Filter: only forward events belonging to this enterprise.
                let should_forward = event_payload
                    .get("org_id")
                    .and_then(|v| v.as_str())
                    .map(|id| id == enterprise_id)
                    .unwrap_or(true); // Forward if no org_id (global events).

                if should_forward {
                    let msg = Message::Text(event_payload.to_string());
                    if sender.send(msg).await.is_err() {
                        tracing::debug!(
                            enterprise_id = %enterprise_id,
                            "WebSocket client disconnected during send"
                        );
                        return;
                    }
                }
            }

            // ── Heartbeat to maintain connection ─────────────────────────────
            _ = heartbeat.tick() => {
                let ping = serde_json::json!({
                    "type":      "HEARTBEAT",
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                });
                if sender.send(Message::Text(ping.to_string())).await.is_err() {
                    tracing::debug!(
                        enterprise_id = %enterprise_id,
                        "Heartbeat send failed — client disconnected"
                    );
                    return;
                }
            }

            // ── Handle inbound frames from the client ─────────────────────────
            Some(msg) = receiver.next() => {
                match msg {
                    Ok(Message::Text(text)) => {
                        tracing::debug!(
                            enterprise_id = %enterprise_id,
                            message       = %text,
                            "Client frame received"
                        );
                        // Echo acknowledgment for client-sent messages.
                        let ack = serde_json::json!({
                            "type": "ACK",
                            "echo": text,
                        });
                        let _ = sender.send(Message::Text(ack.to_string())).await;
                    }
                    Ok(Message::Close(_)) | Err(_) => {
                        tracing::info!(
                            enterprise_id = %enterprise_id,
                            "WebSocket client closed connection"
                        );
                        return;
                    }
                    _ => {}
                }
            }

            else => {
                tracing::info!(
                    enterprise_id = %enterprise_id,
                    "WebSocket select! branch exhausted — closing"
                );
                return;
            }
        }
    }
}
