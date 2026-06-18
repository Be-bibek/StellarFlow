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

mod auth;
mod config;
mod database;
mod errors;
mod routes;
mod stellar;
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
        wallets::get_wallets,
        transactions::get_transactions,
        jit::{simulate_jit, execute_jit},
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
///
/// All fields are `Clone` (backed by `Arc` or `Clone`-safe wrappers) so Axum
/// can hand a cheap clone to every concurrent request handler.
#[derive(Clone)]
pub struct AppState {
    /// SQLx async connection pool — max `config.db_max_connections` connections.
    pub db: sqlx::PgPool,

    /// Redis connection manager (auto-reconnects on network partition).
    /// Wraps the client — callers must call `.get_connection_manager()` to obtain
    /// an async connection.
    pub redis: redis::Client,

    /// Global broadcast channel for WebSocket event fanout.
    /// Sender is held in AppState; each WS handler subscribes a fresh Receiver.
    pub broadcast_tx: broadcast::Sender<serde_json::Value>,

    /// Shared Horizon REST client — reqwest-backed, clone-safe (Arc inside).
    /// Replaces the removed stellar-horizon crate (Risk-2 mitigation).
    pub horizon: stellar::HorizonClient,

    /// Fully-typed application configuration loaded from environment.
    pub config: config::Config,
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// ─────────────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ── 1. Load typed configuration from environment ───────────────────────────
    // Config::from_env() calls dotenvy::dotenv() internally — no need to call
    // it again. All env var access for the lifetime of the process goes through
    // this single Config value.
    let cfg = config::Config::from_env()
        .expect("Failed to load application configuration — check .env or environment");

    // ── 2. Initialise structured tracing ─────────────────────────────────────
    // RUST_LOG controls the log level filter. Defaults to `info`.
    // In production, set RUST_LOG=stellarflow_backend=info,tower_http=warn.
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "stellarflow_backend=debug,tower_http=debug,axum=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer().pretty())
        .init();

    tracing::info!(
        version     = env!("CARGO_PKG_VERSION"),
        network     = if cfg.is_testnet() { "TESTNET" } else { "MAINNET" },
        horizon_url = %cfg.stellar_horizon_url,
        "StellarFlow Backend starting up"
    );

    // ── 3. PostgreSQL connection pool ─────────────────────────────────────────
    let db_pool = PgPoolOptions::new()
        .max_connections(cfg.db_max_connections)
        .acquire_timeout(std::time::Duration::from_secs(cfg.db_acquire_timeout_secs))
        .connect(&cfg.database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    tracing::info!(max_connections = cfg.db_max_connections, "PostgreSQL pool established");

    // ── Phase C.5: Run idempotent migration before seeding ───────────────────
    // This adds wallet_secrets, child_transfers tables and PARTIAL_FAILURE enum
    // if they don't already exist. Safe to run on every startup.
    let migration_sql = include_str!("database/migration_c5.sql");
    if let Err(e) = sqlx::raw_sql(migration_sql).execute(&db_pool).await {
        tracing::warn!(error = %e, "Phase C.5 migration warning (may already be applied)");
    } else {
        tracing::info!("Phase C.5 migration applied successfully.");
    }

    crate::database::seed::seed_database(&db_pool, &cfg.aes_encryption_key)
        .await
        .expect("Failed to seed database");


    // ── 4. Redis connection manager ───────────────────────────────────────────
    let redis_client = redis::Client::open(cfg.redis_url.as_str())
        .expect("Failed to create Redis client");

    // Validate Redis connection at startup — fail fast if Redis is unreachable.
    {
        let mut conn = redis_client
            .get_multiplexed_async_connection()
            .await
            .expect("Cannot connect to Redis — is it running?");
        let _pong: String = redis::cmd("PING")
            .query_async(&mut conn)
            .await
            .expect("Redis PING failed");
    }

    tracing::info!(redis_url = %cfg.redis_url, "Redis connection established");

    // ── 5. Horizon REST client ────────────────────────────────────────────────
    // Replaces the removed stellar-horizon crate (Risk-2 mitigation).
    let horizon = stellar::HorizonClient::new(cfg.stellar_horizon_url.clone());
    tracing::info!(horizon_url = %cfg.stellar_horizon_url, "Horizon client initialised");

    // ── 6. Broadcast channel ──────────────────────────────────────────────────
    // Capacity set from config (default: 1024). Slow consumers receive
    // RecvError::Lagged(n) — handled in ws_gateway_handler with RESYNC event.
    let (broadcast_tx, _) =
        broadcast::channel::<serde_json::Value>(cfg.broadcast_channel_capacity);

    // ── 7. Build shared state ─────────────────────────────────────────────────
    let state = Arc::new(AppState {
        db:           db_pool,
        redis:        redis_client,
        broadcast_tx: broadcast_tx.clone(),
        horizon,
        config:       cfg.clone(),
    });

    // ── 8. Spawn background workers ────────────────────────────────────────────
    {
        // Soroban ledger event poller (polls every `soroban_poll_interval_secs`).
        let poller_state = Arc::clone(&state);
        tokio::spawn(async move {
            soroban_event_poller(poller_state).await;
        });
        tracing::info!("Soroban event poller spawned");

        // TODO (P2): Spawn channel_heartbeat::sweep_stale_locks worker.
        // TODO (P2): Spawn approval expiry sweeper worker.
    }

    // ── 9. Build Axum router ──────────────────────────────────────────────────
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
        .route("/approvals/:approval_id",       get(get_approval_detail))
        // Wallets
        .route("/wallets",                      get(get_wallets))
        // Transactions
        .route("/transactions",                 get(get_transactions))
        // JIT
        .route("/jit/simulate",                 post(simulate_jit))
        .route("/jit/execute",                  post(execute_jit));

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

    // ── 10. Bind and serve ────────────────────────────────────────────────────
    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;

    tracing::info!(
        addr = %cfg.bind_addr,
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
