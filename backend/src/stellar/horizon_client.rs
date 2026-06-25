// =============================================================================
// StellarFlow Backend — Stellar Horizon REST Client
//
// Replaces the removed `stellar-horizon` crate (Risk-2 mitigation).
// This is a thin, strongly-typed reqwest wrapper around the Horizon REST API.
//
// Horizon docs: https://developers.stellar.org/api/horizon
// Testnet base: https://horizon-testnet.stellar.org
// =============================================================================

use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::errors::AppError;

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

/// A single balance entry from the Horizon `/accounts/{id}` response.
#[derive(Debug, Clone, Deserialize)]
pub struct HorizonBalance {
    /// XLM: "native" | USDC: "credit_alphanum4" | etc.
    pub asset_type: String,

    /// Asset code (e.g., "USDC", "BTC"). Absent for native XLM.
    #[serde(default)]
    pub asset_code: Option<String>,

    /// Stellar account address of the asset issuer. Absent for native XLM.
    #[serde(default)]
    pub asset_issuer: Option<String>,

    /// String-formatted decimal balance (e.g., "12345.6789012").
    pub balance: String,

    /// Minimum balance the account must maintain (trustline reserve).
    #[serde(default)]
    pub buying_liabilities: String,

    #[serde(default)]
    pub selling_liabilities: String,
}

/// Minimal Horizon account response (only fields we use).
#[derive(Debug, Clone, Deserialize)]
pub struct HorizonAccount {
    /// Stellar G-address of the account.
    pub id: String,

    /// Current sequence number for transaction building.
    pub sequence: String,

    /// All asset balances held by this account.
    pub balances: Vec<HorizonBalance>,
}

/// Result from submitting a transaction to Horizon.
#[derive(Debug, Clone, Deserialize)]
pub struct SubmitTransactionResult {
    /// Whether Horizon accepted the transaction.
    pub successful: bool,

    /// 64-character hex hash of the submitted transaction.
    pub hash: String,

    /// The ledger sequence where the transaction was included.
    pub ledger: i64,

    /// Envelope XDR (the submitted transaction).
    #[serde(default)]
    pub envelope_xdr: Option<String>,
}

/// Horizon error response body.
#[derive(Debug, Deserialize)]
struct HorizonError {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub status: u16,
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

/// Shared, clone-safe HTTP client for all Stellar Horizon API interactions.
///
/// Internally wraps a `reqwest::Client` which is already `Arc`-backed and safe
/// to clone across Tokio tasks. Add this to `AppState` and clone as needed.
#[derive(Debug, Clone)]
pub struct HorizonClient {
    /// The underlying async HTTP client with pre-configured timeouts.
    client: Client,

    /// Base URL of the Horizon endpoint (without trailing slash).
    /// e.g., "https://horizon-testnet.stellar.org"
    pub base_url: String,
}

impl HorizonClient {
    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /// Create a new `HorizonClient` pointing at `base_url`.
    ///
    /// Configures conservative timeouts:
    /// - connect: 5 seconds
    /// - overall: 30 seconds (covers slow Testnet responses under load)
    ///
    /// Panics if the underlying `reqwest::Client` cannot be built
    /// (only possible with misconfigured TLS — should not happen in practice).
    pub fn new(base_url: impl Into<String>) -> Self {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(30))
            .gzip(true)
            .https_only(true)
            .user_agent(concat!("stellarflow-backend/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("Failed to build Horizon reqwest client");

        Self {
            client,
            base_url: base_url.into().trim_end_matches('/').to_string(),
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Account endpoint
    // ─────────────────────────────────────────────────────────────────────────

    /// Fetch account details including all balances and the current sequence.
    ///
    /// `GET {base_url}/accounts/{account_id}`
    ///
    /// Returns `AppError::NotFound` if the account does not exist on this network.
    /// Returns `AppError::NetworkTimeout` if Horizon does not respond within 30s.
    pub async fn fetch_account(&self, account_id: &str) -> Result<HorizonAccount, AppError> {
        let url = format!("{}/accounts/{}", self.base_url, account_id);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AppError::NetworkTimeout
                } else {
                    AppError::HorizonError(format!("Network error fetching account: {e}"))
                }
            })?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::NotFound(format!(
                "Stellar account '{account_id}' not found on Horizon — is it funded?"
            )));
        }

        if !response.status().is_success() {
            let status = response.status();
            let body: HorizonError = response
                .json()
                .await
                .unwrap_or(HorizonError { title: "Unknown".into(), detail: "".into(), status: 0 });
            return Err(AppError::HorizonError(format!(
                "Horizon returned HTTP {status} for account {account_id}: {}",
                body.detail
            )));
        }

        response
            .json::<HorizonAccount>()
            .await
            .map_err(|e| AppError::Serialization(format!("Failed to parse Horizon account: {e}")))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Balance helper
    // ─────────────────────────────────────────────────────────────────────────

    /// Fetch the balance of a specific asset for an account.
    ///
    /// - `asset_code = "native"` → returns the XLM balance.
    /// - Any other code → looks for a matching `asset_code` in the trustlines.
    ///
    /// Returns `"0.0000000"` if the account holds no trustline for the asset.
    pub async fn fetch_balance(
        &self,
        account_id: &str,
        asset_code: &str,
    ) -> Result<String, AppError> {
        let account = self.fetch_account(account_id).await?;

        for balance in &account.balances {
            let is_target = if asset_code == "native" {
                balance.asset_type == "native"
            } else {
                balance
                    .asset_code
                    .as_deref()
                    .map(|c| c == asset_code)
                    .unwrap_or(false)
            };

            if is_target {
                return Ok(balance.balance.clone());
            }
        }

        // Asset not held — return zero balance string in Stellar decimal format.
        Ok("0.0000000".to_string())
    }

    /// Fetch the current sequence number for an account.
    ///
    /// The sequence number is returned as a `String` from Horizon.
    /// Parse with `str::parse::<i64>()` before use in transaction building.
    pub async fn fetch_sequence(&self, account_id: &str) -> Result<i64, AppError> {
        let account = self.fetch_account(account_id).await?;
        account.sequence.parse::<i64>().map_err(|_| {
            AppError::Serialization(format!(
                "Failed to parse sequence number '{}' for account '{account_id}'",
                account.sequence
            ))
        })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Transaction submission
    // ─────────────────────────────────────────────────────────────────────────

    /// Submit a Base64-encoded XDR transaction envelope to Horizon.
    ///
    /// `POST {base_url}/transactions` with `tx=<xdr_b64>`
    ///
    /// On success returns a [`SubmitTransactionResult`] with the tx hash and
    /// ledger sequence. On Horizon-level failure (e.g., `tx_bad_seq`, `tx_failed`),
    /// the error detail is propagated as `AppError::HorizonError`.
    pub async fn submit_transaction(
        &self,
        xdr_b64: &str,
    ) -> Result<SubmitTransactionResult, AppError> {
        let url = format!("{}/transactions", self.base_url);

        let response = self
            .client
            .post(&url)
            .form(&[("tx", xdr_b64)])
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    AppError::NetworkTimeout
                } else {
                    AppError::HorizonError(format!("Network error submitting transaction: {e}"))
                }
            })?;

        if response.status().is_success() {
            return response
                .json::<SubmitTransactionResult>()
                .await
                .map_err(|e| {
                    AppError::Serialization(format!("Failed to parse Horizon submit response: {e}"))
                });
        }

        // Horizon returns detailed error bodies for failed transactions.
        let status = response.status();
        let err_body: serde_json::Value = response
            .json()
            .await
            .unwrap_or(serde_json::json!({"detail": "Unknown Horizon error"}));

        // Detect tx_bad_seq — Redis counter is out of sync with the ledger.
        // Return a distinct variant so callers can reset & retry.
        let tx_code = err_body
            .pointer("/extras/result_codes/transaction")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        // Log the full error body for debugging
        tracing::warn!(
            horizon_status = %status,
            tx_result_code = %tx_code,
            full_error = %err_body,
            "Horizon transaction submission failed"
        );

        if tx_code == "tx_bad_seq" {
            return Err(AppError::BadSequence);
        }

        Err(AppError::HorizonError(format!(
            "Horizon HTTP {status}: {}",
            err_body
                .get("detail")
                .and_then(|v| v.as_str())
                .unwrap_or("no detail")
        )))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_url_strips_trailing_slash() {
        let client = HorizonClient::new("https://horizon-testnet.stellar.org/");
        assert_eq!(
            client.base_url,
            "https://horizon-testnet.stellar.org"
        );
    }
}
