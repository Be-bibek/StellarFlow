# StellarFlow OS Documentation Vault

Welcome to the absolute architectural brain of StellarFlow OS. This knowledge graph maps the exact, granular reality of the codebase, ensuring both current operations and future multi-frontend ecosystems (like Flutter) sync perfectly.

## 1. The Next.js Web Application
Detailed mapping of the exact React frontend structure.
- **[[pages-and-routing]]**: Defines the 13 specific core views (Dashboard, Governance, Routing, Transit, etc.) and what data they render.
- **[[ui-components]]**: The exact UI primitives (Carousel, GooeyNav, SwapWidget) driving the visual aesthetic.

## 2. Stellar & Cryptographic Mechanics
Deep dive into the `lib/stellar.ts` logic mapping how the network operates.
- **[[horizon-and-rpc]]**: The dual-client strategy separating native XLM transfers (Horizon) from smart contract invocations (Soroban RPC).
- **[[transaction-mechanics]]**: The advanced enterprise treasury logic including **Sequence Managed Transactions**, **JIT Aggregation Mod**, and **Streaming Targets**.

## 3. The Backend & Database (Railway / Rust)
Detailed structure of the server-side operations and data caching.
- **[[rust-api-architecture]]**: The Axum/Tokio middleware, mapping the API routes, WebSocket fanouts, and global AppState.
- **[[postgresql-database]]**: The exact SQL schemas hosted on Railway managing off-chain signature collection, historical caching, and audit logs.

## 4. Soroban Smart Contracts
- **[[soroban-smart-contracts]]**: Rust implementation standards and `#![no_std]` rules.
- **[[treasury-vault-contract]]**: Core state variables defining multi-sig thresholds and `require_auth()` loops.
- **[[smart-routing]]**: Configurable percentage-based algorithmic distribution logic.

> **Directive**: When porting to or expanding the Flutter mobile application, engineers MUST reference the structures defined in these nodes. The `[[rust-api-architecture]]` dictates the exact REST calls the Flutter app must make, and `[[transaction-mechanics]]` dictates how the Flutter app must sequence its operations.
