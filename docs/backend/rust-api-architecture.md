# Rust API Architecture (Railway Backend)

The backend (`backend/src/main.rs`) is a high-concurrency Rust API deployed on Railway. It serves as middleware between the Next.js UI, the PostgreSQL database, and the Stellar ledger.

## Core Framework
- **Server**: Axum (`axum::Router`).
- **Concurrency**: Tokio (async runtime).
- **Database**: SQLx (`sqlx::PgPool`) for safe, async PostgreSQL queries.
- **Caching**: Redis (`redis::Client`) for transient session data and rate-limiting.

## Global Application State (`AppState`)
Injected into every Axum route handler concurrently via `Arc`:
- `db`: The Postgres connection pool.
- `redis`: The connection manager.
- `broadcast_tx`: A `tokio::sync::broadcast::Sender` channel responsible for fanning out real-time WebSocket events to the frontend UI (powering the `transit-view.tsx` visualizer).
- `horizon`: A shared, thread-safe reqwest-backed Horizon REST client.

## Routing Modules
The API is divided into explicit sub-modules located in `src/routes/`:
1. `approvals`: `create_pending_approval`, `submit_signature` (Off-chain signature collection).
2. `payments`: `handle_batch_payout` (Sequence Managed parallel execution).
3. `jit`: `simulate_jit`, `execute_jit` (Just-In-Time aggregation mechanics).
4. `governance`: Proposal creation, execution, and audit log generation.
5. `funding`: Friendbot integration and manual testing faucets.
6. `soroban_proposals`: Direct mapping to on-chain Soroban auth thresholds.

## Execution Directives
When connecting the Flutter app, developers must use standard HTTP REST calls targeting `https://stellarflow-backend-production.up.railway.app` matching these Axum route endpoints, and implement a standard WebSocket listener to hook into the `broadcast_tx` fanout.
