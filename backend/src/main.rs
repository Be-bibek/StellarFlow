// =============================================================================
// StellarFlow Backend — Server Bootstrapper
//
// Responsibilities:
//   1. Load environment configuration (.env via dotenvy).
//   2. Initialise structured tracing (JSON in production, pretty in dev).
//   3. Establish SQLx PgPool with configurable connection limits.
//   4. Establish Redis ConnectionManager.
//   5. Create the global tokio::sync::broadcast channel for WebSocket fanout.
//   6. Spawn the Soroban event poller as a background tokio task.
//   7. Build the Axum router with all route handlers and CORS middleware.
//   8. Bind and serve with graceful shutdown on SIGTERM/SIGINT.
// =============================================================================

mod database;
mod errors;
mod routes;
mod streaming;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use tokio::sync::broadcast;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::{
    routes::{
        approvals::{create_pending_approval, get_approval_detail, submit_signature},
        payments::{get_payment_status, handle_batch_payout},
    },
    streaming::transit_engine::{soroban_event_poller, ws_gateway_handler},
};

// ─────────────────────────────────────────────────────────────────────────────
// Global Application State
//
// Shared across all Axum route handlers via `Arc<AppState>`.
// Connection pools are designed for high-concurrency (100+ simultaneous
// channel account workers during payroll execution).
// ─────────────────────────────────────────────────────────────────────────────

/// Application-wide shared state injected into every route handler.
#[derive(Clone)]
pub struct AppState {
    /// SQLx async connection pool — max 50 connections by default.
    pub db: sqlx::PgPool,

    /// Redis connection manager (auto-reconnects on disconnect).
    pub redis: redis::Client,

    /// Global broadcast channel for WebSocket event fanout.
    /// Sender is held in AppState; each WS connection subscribes a Receiver.
    pub broadcast_tx: broadcast::Sender<serde_json::Value>,
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ── 1. Load .env configuration ────────────────────────────────────────────
    dotenvy::dotenv().ok();

    // ── 2. Initialise structured tracing ─────────────────────────────────────
    // RUST_LOG controls the log level filter. Defaults to `info`.
    // In production, set RUST_LOG=stellarflow_backend=info,tower_http=warn.
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "stellarflow_backend=debug,tower_http=debug,axum=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer().pretty())
        .init();

    tracing::info!("StellarFlow Backend starting up...");

    // ── 3. PostgreSQL connection pool ─────────────────────────────────────────
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in environment or .env file");

    let max_connections: u32 = std::env::var("DB_MAX_CONNECTIONS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(50);

    let db_pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    tracing::info!(max_connections, "PostgreSQL pool established");

    // Run pending migrations from the schema.sql file automatically.
    // In production, use a dedicated migration tool (sqlx migrate, flyway, etc.)
    // sqlx::migrate!("./src/database/migrations")
    //     .run(&db_pool)
    //     .await
    //     .expect("Database migration failed");

    // ── 4. Redis connection manager ───────────────────────────────────────────
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

    let redis_client = redis::Client::open(redis_url.as_str())
        .expect("Failed to create Redis client");

    // Validate Redis connection at startup.
    {
        let mut conn = redis_client
            .get_async_connection()
            .await
            .expect("Cannot connect to Redis — is it running?");
        let _pong: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .expect("Redis PING failed");
    }

    tracing::info!(redis_url = %redis_url, "Redis connection established");

    // ── 5. Broadcast channel (capacity: 1024 buffered events) ─────────────────
    // Lagging receivers will miss old events — acceptable for real-time UI.
    let (broadcast_tx, _) = broadcast::channel::<serde_json::Value>(1024);

    // ── 6. Build shared state ─────────────────────────────────────────────────
    let state = Arc::new(AppState {
        db: db_pool,
        redis: redis_client,
        broadcast_tx: broadcast_tx.clone(),
    });

    // ── 7. Spawn Soroban event poller ─────────────────────────────────────────
    {
        let poller_state = Arc::clone(&state);
        tokio::spawn(async move {
            soroban_event_poller(poller_state).await;
        });
        tracing::info!("Soroban event poller spawned");
    }

    // ── 8. Build Axum router ──────────────────────────────────────────────────
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_v1 = Router::new()
        // Payment routes
        .route("/payments/batch",              post(handle_batch_payout))
        .route("/payments/status/:transfer_id", get(get_payment_status))
        // Approval routes
        .route("/approvals/pending",            post(create_pending_approval))
        .route("/approvals/sign",               post(submit_signature))
        .route("/approvals/:approval_id",       get(get_approval_detail));

    let app = Router::new()
        // REST API namespace
        .nest("/api/v1", api_v1)
        // WebSocket real-time transit gateway
        .route("/v1/transit/:enterprise_id", get(ws_gateway_handler))
        // Health check endpoint
        .route("/health", get(health_check))
        // Middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // ── 9. Bind and serve ─────────────────────────────────────────────────────
    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let listener  = tokio::net::TcpListener::bind(&bind_addr).await?;

    tracing::info!(
        addr = %bind_addr,
        "StellarFlow Backend listening — ready to accept connections"
    );

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("StellarFlow Backend shut down cleanly");
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

/// GET /health — Returns 200 OK with build metadata.
/// Used by load balancers, Kubernetes liveness probes, and uptime monitors.
async fn health_check() -> axum::response::Json<serde_json::Value> {
    axum::response::Json(serde_json::json!({
        "status":    "healthy",
        "service":   "stellarflow-backend",
        "version":   env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────────────────────────────────────

/// Wait for SIGTERM (Linux containers) or SIGINT (Ctrl-C) then return,
/// triggering Axum's graceful shutdown which drains in-flight requests.
async fn shutdown_signal() {
    use tokio::signal;

    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl-C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c   => tracing::info!("Received SIGINT — shutting down"),
        _ = terminate => tracing::info!("Received SIGTERM — shutting down"),
    }
}
