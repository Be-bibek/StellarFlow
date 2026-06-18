// =============================================================================
// StellarFlow Backend — Database Module
//
// models  — SQLx-backed structs + enums mirroring the PostgreSQL schema
// queries — Repository functions (compile-time verified via sqlx::query_as!)
// =============================================================================

pub mod models;
pub mod seed;
pub mod queries;


