# PostgreSQL Database Architecture (Railway)

The StellarFlow backend interfaces with a robust PostgreSQL database hosted on Railway, managed entirely via the `sqlx` Rust crate for safe, asynchronous querying.

## Core Purpose
The database is explicitly **not** the source of truth for balances or auth (which live on-chain). Instead, it serves as a high-performance **Caching and Governance Log**. It stores things that are too expensive or slow to query directly from the Soroban RPC at runtime.

## Schema Definitions

### 1. `approvals` Table
Used for off-chain threshold signature collection before submitting to Soroban.
- `id`: UUID (Primary Key)
- `proposal_id`: String (Maps to on-chain Soroban Proposal ID)
- `admin_address`: String (The pubkey of the signer)
- `signature_xdr`: Text (The cryptographic proof)
- `created_at`: Timestamp

### 2. `transactions` Table
Caches historical data so `[[history-view]]` and `[[analytics-view]]` load instantly.
- `tx_hash`: String (Primary Key, unique Stellar hash)
- `source`: String
- `destination`: String
- `amount_stroops`: BigInt
- `status`: Enum (PENDING, SUCCESS, FAILED)
- `timestamp`: Timestamp

### 3. `audit_logs` Table
Tracks user and system actions for compliance.
- `log_id`: UUID
- `action_type`: String (e.g., 'FUND_MANUAL', 'EXECUTE_JIT')
- `actor_address`: String
- `metadata`: JSONB

## Integration Rules for Flutter
When the Flutter app needs transaction history, it MUST query the `[[rust-api-architecture]]` endpoints (e.g., `GET /api/transactions`), which reads from this PostgreSQL database. It should **not** hit the Horizon `/payments` endpoint directly to save client-side bandwidth and ensure JIT operations are properly tagged.
