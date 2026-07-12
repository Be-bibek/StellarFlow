# Advanced Transaction Mechanics

The `lib/stellar.ts` file houses highly specialized cryptographic logic designed to handle enterprise-grade treasury operations.

## 1. Sequence Managed Transactions (rs_sequence)
When executing batch operations (like Payroll distributions via `batch-view.tsx`), StellarFlow does not rely on the master wallet's singular sequence number, which would cause `tx_bad_seq` errors under high concurrency.
- **Implementation**: The backend (`backend/src/main.rs`) manages a pool of "Channel Accounts". 
- **Mechanic**: Each concurrent transaction uses a unique Channel Account as the `source`, allowing 100+ transactions to execute in parallel (streaming) targeting the main ledger simultaneously.

## 2. JIT (Just-In-Time) Aggregation Mod
Handled primarily via the `contractRoutePayout` function.
- **Mechanic**: Instead of holding all funds in a hot master wallet, funds are stored across isolated sub-vaults (Operations, Payroll, Reserve).
- **Execution**: When a massive payment is requested, the Soroban `route_payout` contract is invoked. It atomically pulls specific percentages from the sub-vaults *Just In Time* to aggregate the requested total, and forwards it to the target in a single atomic transaction. 
- **Security**: If any sub-vault lacks funds, the entire transaction reverts automatically, guaranteeing mathematical solvency.

## 3. Streaming and Targets
- Handled by `streaming::transit_engine` in the Rust backend.
- **Mechanic**: WebSockets (using `tokio::sync::broadcast`) pipe real-time Soroban ledger events directly into the `transit-view.tsx` visual map, showing live transit streams to targets globally without HTTP polling.
