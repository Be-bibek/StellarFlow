// =============================================================================
// StellarFlow Backend — Auth Module
//
// Submodules:
//   crypto    — AES-256-GCM encrypt/decrypt primitives (Risk-5 mitigation)
//   middleware — JWT/Firebase RS256 token validation (Phase P0 — to be built)
//   claims    — JwtClaims struct: org_id, role, exp  (Phase P0 — to be built)
// =============================================================================

pub mod crypto;
// pub mod middleware;  ← P0 follow-up: JWT extractor axum middleware
// pub mod claims;      ← P0 follow-up: typed JWT claims
