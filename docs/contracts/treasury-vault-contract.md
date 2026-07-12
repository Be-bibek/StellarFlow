# Treasury Vault Contract

The Treasury Vault is the foundational smart contract for StellarFlow OS. It manages multi-sig arrays and enforces the `[[decentralized-auth]]` rules.

## Core State Variables
The contract uses Soroban's persistent storage to track:
- `AdminArray`: A `Vec<Address>` storing the immutable list of allowed administrators.
- `Threshold`: A `u32` representing the minimum number of admin signatures required for high-risk operations.
- `VaultBalances`: A mapping of `Address` (Asset ID) to `i128` (Balance).

## Rust Struct Definitions
```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admins,     // Stores Vec<Address>
    Threshold,  // Stores u32
}
```

## Execution Flow
1. **Init**: The contract is initialized once with an array of Admin addresses.
2. **Require Auth**: For functions like `transfer_funds`, the contract iterates through the `AdminArray` and enforces `admin.require_auth()` to verify cryptographic signatures.
3. **Rejection**: Any invocation signed by an address not in the `AdminArray` instantly aborts execution.
