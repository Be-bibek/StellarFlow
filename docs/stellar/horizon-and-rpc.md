# Horizon and RPC Architecture

StellarFlow utilizes a dual-pipeline architecture to communicate with the Stellar network, found entirely within `lib/stellar.ts`.

## Dual-Client Strategy

### 1. Horizon Client (`@stellar/stellar-sdk` Horizon)
- **Endpoint**: `https://horizon-testnet.stellar.org`
- **Purpose**: Used exclusively for legacy Stellar operations, specifically `Asset.native()` XLM transfers and basic account balance fetching (`fetchXlmBalance`).
- **Limitation**: Cannot interact with Soroban WebAssembly smart contracts.

### 2. Soroban RPC Client (`@stellar/stellar-sdk` rpc)
- **Endpoint**: `https://soroban-testnet.stellar.org`
- **Purpose**: Used for all complex Web3 architecture, specifically invoking the Treasury Vault and Smart Routing smart contracts.
- **Simulation**: Enforces a strict two-step execution process:
  1. `simulateTransaction()`: Calculates exactly how many CPU instructions and ledger reads the contract will cost.
  2. `assembleTransaction()`: Attaches the calculated fee footprint to the XDR payload before passing it to Freighter for signature.

## Integration Hook
Any future Flutter application must implement this exact same Dual-Client split in its `lib/core/network` folder, ensuring native asset transfers utilize Horizon, while smart contract invocations simulate via Soroban RPC.
