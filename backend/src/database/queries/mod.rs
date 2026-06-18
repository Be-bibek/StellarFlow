// =============================================================================
// StellarFlow Backend — Database Query Sub-Modules
//
// This directory replaces the monolithic repository layer that was embedded
// in `database/models.rs`. Query functions are now organised by entity:
//
//   wallets.rs       — wallet CRUD + JIT-optimised list_active + volume snapshot
//   transactions.rs  — transaction state machine + pagination + analytics
//
// Future additions (P2+):
//   approvals.rs         — multi-sig approval CRUD + signature counting
//   channel_accounts.rs  — acquire/release/heartbeat (SKIP LOCKED)
//   copilot.rs           — burn-rate and runway aggregate SQL queries
// =============================================================================

pub mod wallets;
pub mod transactions;

// P2+ placeholders (uncomment when implementing):
// pub mod approvals;
// pub mod channel_accounts;
// pub mod copilot;
