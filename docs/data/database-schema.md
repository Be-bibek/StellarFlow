# Database Schema

StellarFlow OS utilizes an off-chain PostgreSQL database (hosted on Railway) for caching, user preferences, and rapid transaction history queries. This supplements the `[[on-chain-state]]` to provide a snappy user experience for both web and mobile frontends.

## Core Entities

### `users` Table
Stores non-custodial metadata and application preferences.
- `id` (UUID, Primary Key)
- `public_key` (String, Unique) - The Stellar Ed25519 public key.
- `theme_preference` (String) - Dark/Light mode derived from `[[ui-deck-spec]]`.
- `created_at` (Timestamp)

### `transaction_cache` Table
Caches on-chain transactions to prevent rate-limiting against the Stellar RPC.
- `tx_hash` (String, Primary Key)
- `source_account` (String)
- `destination_account` (String)
- `amount` (Decimal)
- `status` (Enum: PENDING, SUCCESS, FAILED)
- `timestamp` (Timestamp)

### `vault_metadata` Table
Maps human-readable names to on-chain `[[treasury-vault-contract]]` addresses.
- `vault_address` (String, Primary Key)
- `vault_name` (String) - e.g., "Marketing Vault", "Payroll Reserve".
- `color_theme` (String) - UI color code for the stacked card.

## Backend APIs
The Railway backend exposes a REST/GraphQL API for frontends to securely read from this database, enforcing standard rate limiting and API key authentication.
