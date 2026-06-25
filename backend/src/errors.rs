// =============================================================================
// StellarFlow Backend — Error Taxonomy
//
// All error variants surface clean JSON bodies through axum's IntoResponse.
// HTTP status codes are mapped explicitly per variant category.
// =============================================================================

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Exhaustive error enum for every failure mode in the StellarFlow backend.
/// Each variant carries a human-readable message and maps to an HTTP status.
#[derive(Debug, Error)]
pub enum AppError {
    // --- Authorization Errors (4xx) -----------------------------------------
    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: caller does not hold required signing authority")]
    Forbidden,

    // --- Validation Errors (4xx) --------------------------------------------
    #[error("LimitExceeded: requested amount {amount} exceeds ceiling {limit}")]
    LimitExceeded { amount: i128, limit: i128 },

    #[error("ValidationError: {0}")]
    Validation(String),

    #[error("NotFound: {0}")]
    NotFound(String),

    // --- Business Logic Errors (4xx / 5xx) ----------------------------------
    #[error("InsufficientTotalFunds: aggregate vault balance {available} < required {required}")]
    InsufficientTotalFunds { available: i128, required: i128 },

    #[error("SignatureThresholdNotMet: {current}/{required} signatures collected")]
    SignatureThresholdNotMet { current: u32, required: u32 },

    #[error("TransactionAlreadySettled: tx_id={0}")]
    TransactionAlreadySettled(String),

    // --- Infrastructure Errors (5xx) ----------------------------------------
    #[error("DatabaseError: {0}")]
    Database(#[from] sqlx::Error),

    #[error("CacheError: {0}")]
    Cache(String),

    #[error("NetworkTimeout: Horizon/RPC did not respond within deadline")]
    NetworkTimeout,

    /// Stellar tx_bad_seq — the sequence number was ahead/behind the ledger.
    /// Callers should reset their Redis counter and retry.
    #[error("BadSequence: tx was rejected by Horizon with tx_bad_seq")]
    BadSequence,

    #[error("StellarHorizonError: {0}")]
    HorizonError(String),

    #[error("SerializationError: {0}")]
    Serialization(String),

    #[error("InternalError: {0}")]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    /// Canonical error code string surfaced in all JSON responses.
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::Unauthorized(_) => "UNAUTHORIZED",
            AppError::Forbidden => "FORBIDDEN",
            AppError::LimitExceeded { .. } => "LIMIT_EXCEEDED",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::InsufficientTotalFunds { .. } => "INSUFFICIENT_TOTAL_FUNDS",
            AppError::SignatureThresholdNotMet { .. } => "SIGNATURE_THRESHOLD_NOT_MET",
            AppError::TransactionAlreadySettled(_) => "TRANSACTION_ALREADY_SETTLED",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Cache(_) => "CACHE_ERROR",
            AppError::NetworkTimeout => "NETWORK_TIMEOUT",
            AppError::BadSequence => "BAD_SEQUENCE",
            AppError::HorizonError(_) => "HORIZON_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::Internal(_) => "INTERNAL_SERVER_ERROR",
        }
    }
}

/// Convert AppError into an HTTP response with a structured JSON body.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::Forbidden => StatusCode::FORBIDDEN,
            AppError::LimitExceeded { .. } => StatusCode::BAD_REQUEST,
            AppError::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::InsufficientTotalFunds { .. } => StatusCode::UNPROCESSABLE_ENTITY,
            AppError::SignatureThresholdNotMet { .. } => StatusCode::ACCEPTED,
            AppError::TransactionAlreadySettled(_) => StatusCode::CONFLICT,
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Cache(_) => StatusCode::SERVICE_UNAVAILABLE,
            AppError::NetworkTimeout => StatusCode::GATEWAY_TIMEOUT,
            AppError::BadSequence => StatusCode::CONFLICT,
            AppError::HorizonError(_) => StatusCode::BAD_GATEWAY,
            AppError::Serialization(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let body = Json(json!({
            "error": {
                "code":    self.error_code(),
                "message": self.to_string(),
            }
        }));

        (status, body).into_response()
    }
}

/// Alias used throughout route handlers for ergonomic Result returns.
pub type ApiResult<T> = Result<T, AppError>;
