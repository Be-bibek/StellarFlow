# RPC Pipeline and Network Architecture

The StellarFlow OS relies on a robust network pipeline to bridge the frontends (`[[monorepo-structure]]`) with the blockchain (`[[soroban-smart-contracts]]`) and the caching layer (`[[database-schema]]`).

## Architecture Flow

1. **Client Layer (Flutter / Next.js)**
   - Constructs XDR payloads locally.
   - Uses `stellar-sdk` (JS) or `stellar_flutter_sdk` (Dart).
   
2. **RPC Node (Soroban RPC)**
   - The primary gateway to the Stellar Network.
   - Endpoints used: `simulateTransaction`, `sendTransaction`, `getTransaction`.
   - **Simulation**: Every Soroban transaction MUST be simulated via the RPC before submission to calculate exact resource fees and CPU footprints.

3. **Backend Middleware (Railway)**
   - Acts as a caching proxy to prevent direct spam to the Stellar RPC.
   - Indexes historical transactions into the PostgreSQL database.
   - Serves UI metadata (vault colors, names) alongside real-time balance queries.

## Endpoint Configurations
- **Testnet RPC**: `https://soroban-testnet.stellar.org`
- **Mainnet RPC**: `https://soroban-mainnet.stellar.org`
- **Railway API**: `https://stellarflow-backend-production.up.railway.app`

By isolating the RPC pipeline logic into its own network abstraction layer, both the Flutter and Web frontends can swap network environments instantly.
