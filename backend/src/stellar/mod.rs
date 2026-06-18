// =============================================================================
// StellarFlow Backend — Stellar Integration Module
//
// Submodules:
//   horizon_client   — reqwest-based Horizon REST API wrapper (replaces stellar-horizon)
//   sequence_manager — Redis INCR atomic sequence counter (Risk-1 mitigation)
//   jit_aggregator   — JIT multi-vault treasury greedy fill engine
// =============================================================================

pub mod horizon_client;
pub mod jit_aggregator;
pub mod sequence_manager;
pub mod transaction_builder;

// Re-export the most commonly used types at the stellar module level
// so route handlers can `use crate::stellar::HorizonClient;`.
pub use horizon_client::HorizonClient;
