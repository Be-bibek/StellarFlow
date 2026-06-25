// =============================================================================
// StellarFlow Backend — Global Configuration Layer
//
// Responsibilities:
//   - Read and validate all environment variables exactly ONCE at startup.
//   - Expose a fully-typed `Config` struct that is injected into `AppState`.
//   - Eliminate all `std::env::var()` calls from route handlers and workers,
//     making the codebase unit-testable and removing runtime panics.
//
// Usage:
//   let config = Config::from_env().expect("Invalid configuration");
//   // Config is then cloned into Arc<AppState> and shared across handlers.
// =============================================================================

use std::str::FromStr;

use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};

// ─────────────────────────────────────────────────────────────────────────────
// Config struct
// ─────────────────────────────────────────────────────────────────────────────

/// Fully-typed, validated application configuration.
///
/// All fields are populated from environment variables by [`Config::from_env`].
/// The struct is `Clone` so it can be cheaply shared via `Arc<AppState>`.
#[derive(Debug, Clone)]
pub struct Config {
    // ── Server ────────────────────────────────────────────────────────────────
    /// TCP bind address for the Axum server (e.g., "0.0.0.0:8080").
    pub bind_addr: String,

    // ── PostgreSQL ────────────────────────────────────────────────────────────
    /// Full connection string: `postgres://user:pass@host/db`.
    pub database_url: String,

    /// Maximum connections in the `PgPool` (default: 50).
    pub db_max_connections: u32,

    /// Timeout in seconds to acquire a pool connection before failing (default: 10).
    pub db_acquire_timeout_secs: u64,

    // ── Redis ─────────────────────────────────────────────────────────────────
    /// Redis connection URL (e.g., "redis://127.0.0.1:6379").
    pub redis_url: String,

    // ── Stellar Network ───────────────────────────────────────────────────────
    /// Stellar network passphrase.
    /// Testnet: "Test SDF Network ; September 2015"
    /// Mainnet: "Public Global Stellar Network ; September 2015"
    pub stellar_network_passphrase: String,

    /// Base URL of the Horizon REST API (e.g., "https://horizon-testnet.stellar.org").
    pub stellar_horizon_url: String,

    /// Base URL of the Soroban JSON-RPC endpoint (e.g., "https://soroban-testnet.stellar.org").
    pub stellar_soroban_rpc_url: String,

    /// Deployed TreasuryRouter contract ID (Stellar address format, 56 chars).
    pub treasury_contract_id: String,

    // ── Cryptography ──────────────────────────────────────────────────────────
    /// AES-256 encryption key for channel account secrets.
    /// Must be exactly 32 bytes, supplied as a Base64-encoded string in env.
    ///
    /// RISK-5 mitigation: this key is NEVER reused as a nonce source;
    /// every encrypt() call generates a fresh 12-byte random nonce.
    pub aes_encryption_key: [u8; 32],

    // ── Authentication ────────────────────────────────────────────────────────
    /// Firebase project ID used to construct the JWKS endpoint URL.
    /// JWKS URL: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
    pub firebase_project_id: String,

    /// Expected JWT audience claim (must match your Firebase project ID).
    pub jwt_audience: String,

    // ── WebSocket ─────────────────────────────────────────────────────────────
    /// Capacity of the `tokio::sync::broadcast` channel for WebSocket fanout.
    /// Events beyond this capacity cause `RecvError::Lagged` for slow clients.
    /// Default: 1024
    pub broadcast_channel_capacity: usize,

    // ── Deployment ────────────────────────────────────────────────────────────
    /// Allowed origin for strict CORS in production.
    pub frontend_url: String,

    // ── Background Workers ────────────────────────────────────────────────────
    /// How often (in seconds) the channel heartbeat task sweeps stale locks.
    /// Default: 60 (sweep every minute — RISK-7 mitigation)
    pub channel_heartbeat_interval_secs: u64,

    /// How often (in seconds) the Soroban event poller polls for ledger events.
    /// Default: 5
    pub soroban_poll_interval_secs: u64,

    /// How often (in seconds) the approval expiry sweeper runs.
    /// Default: 120
    pub approval_expiry_sweep_secs: u64,
}

impl Config {
    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// Load and validate the full application configuration from the environment.
    ///
    /// Calls `dotenvy::dotenv().ok()` internally — no need to call it again in
    /// `main()`. Returns an error if any required variable is missing or malformed.
    pub fn from_env() -> Result<Self> {
        // Load .env file (silently ignore if not present — production uses real env vars)
        dotenvy::dotenv().ok();

        Ok(Config {
            // ── Server ────────────────────────────────────────────────────────
            bind_addr: env_str("BIND_ADDR", &format!("0.0.0.0:{}", env_str("PORT", "8080"))),

            // ── PostgreSQL ────────────────────────────────────────────────────
            database_url: require_str("DATABASE_URL")
                .context("DATABASE_URL is required (e.g. postgres://user:pass@localhost/stellarflow)")?,

            db_max_connections: env_parse("DB_MAX_CONNECTIONS", 50u32)?,
            db_acquire_timeout_secs: env_parse("DB_ACQUIRE_TIMEOUT_SECS", 10u64)?,

            // ── Redis ─────────────────────────────────────────────────────────
            redis_url: env_str("REDIS_URL", "redis://127.0.0.1:6379"),

            // ── Stellar Network ───────────────────────────────────────────────
            stellar_network_passphrase: env_str(
                "STELLAR_NETWORK_PASSPHRASE",
                "Test SDF Network ; September 2015",
            ),
            stellar_horizon_url: env_str(
                "STELLAR_HORIZON_URL",
                "https://horizon-testnet.stellar.org",
            ),
            stellar_soroban_rpc_url: env_str(
                "STELLAR_SOROBAN_RPC_URL",
                "https://soroban-testnet.stellar.org",
            ),
            treasury_contract_id: env_str("TREASURY_CONTRACT_ID", ""),

            // ── Cryptography ──────────────────────────────────────────────────
            aes_encryption_key: parse_aes_key()
                .context("AES_ENCRYPTION_KEY must be a Base64-encoded 32-byte value")?,

            // ── Authentication ────────────────────────────────────────────────
            firebase_project_id: env_str("FIREBASE_PROJECT_ID", ""),
            jwt_audience: env_str("JWT_AUDIENCE", ""),

            // ── WebSocket ─────────────────────────────────────────────────────
            broadcast_channel_capacity: env_parse("BROADCAST_CHANNEL_CAPACITY", 1024usize)?,

            // ── Deployment ────────────────────────────────────────────────────
            frontend_url: env_str("FRONTEND_URL", "http://localhost:3000"),

            // ── Background Workers ────────────────────────────────────────────
            channel_heartbeat_interval_secs: env_parse("CHANNEL_HEARTBEAT_INTERVAL_SECS", 60u64)?,
            soroban_poll_interval_secs: env_parse("SOROBAN_POLL_INTERVAL_SECS", 5u64)?,
            approval_expiry_sweep_secs: env_parse("APPROVAL_EXPIRY_SWEEP_SECS", 120u64)?,
        })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Derived helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// Returns `true` if the backend is configured for Stellar Testnet.
    pub fn is_testnet(&self) -> bool {
        self.stellar_network_passphrase.contains("Test SDF")
    }

    /// Returns the JWKS endpoint URL derived from the Firebase project ID.
    pub fn firebase_jwks_url(&self) -> String {
        format!(
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Read a required environment variable; fail if missing.
fn require_str(key: &str) -> Result<String> {
    std::env::var(key).with_context(|| format!("Missing required environment variable: {key}"))
}

/// Read an optional environment variable; return the default if absent.
fn env_str(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

/// Read an optional environment variable and parse it to type `T`.
/// Returns the default value if the variable is absent.
fn env_parse<T>(key: &str, default: T) -> Result<T>
where
    T: FromStr + std::fmt::Debug,
    T::Err: std::error::Error + Send + Sync + 'static,
{
    match std::env::var(key) {
        Ok(val) => val
            .parse::<T>()
            .with_context(|| format!("Failed to parse environment variable {key}={val}")),
        Err(_) => Ok(default),
    }
}

/// Parse the `AES_ENCRYPTION_KEY` environment variable.
///
/// The value must be a Base64-encoded representation of exactly 32 bytes.
/// If the variable is absent, a DEVELOPMENT-ONLY ephemeral key is generated.
/// Production deployments must always set this via a secrets manager.
fn parse_aes_key() -> Result<[u8; 32]> {
    match std::env::var("AES_ENCRYPTION_KEY") {
        Ok(encoded) => {
            let bytes = STANDARD
                .decode(&encoded)
                .context("AES_ENCRYPTION_KEY is not valid Base64")?;

            if bytes.len() != 32 {
                anyhow::bail!(
                    "AES_ENCRYPTION_KEY must decode to exactly 32 bytes, got {} bytes",
                    bytes.len()
                );
            }

            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            Ok(key)
        }
        Err(_) => {
            // Development fallback: generate an ephemeral key for this process.
            // WARNING: Any secrets encrypted with this key are NOT recoverable
            // after a server restart. NEVER use in production.
            tracing::warn!(
                "AES_ENCRYPTION_KEY not set — using ephemeral development key. \
                 Channel account secrets will NOT survive server restart."
            );
            let mut key = [0u8; 32];
            // Fill with pseudo-random bytes using the system RNG.
            use rand::RngCore;
            rand::thread_rng().fill_bytes(&mut key);
            Ok(key)
        }
    }
}
