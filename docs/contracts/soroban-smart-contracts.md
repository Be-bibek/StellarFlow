# Soroban Smart Contracts Master Node

The core decentralized logic of StellarFlow OS is powered by Rust-based Soroban smart contracts. This node maps the overarching structure of the on-chain programs.

## Contract Architecture
The StellarFlow contracts are divided into modular programs:

1. **Treasury Vault Contract** (`[[treasury-vault-contract]]`):
   - Manages the multi-sig governance arrays.
   - Enforces the `[[decentralized-auth]]` rules (dropping unauthorized executions).
   - Holds the primary XLM and token balances securely on-chain.

2. **Smart Routing Contract** (`[[smart-routing]]`):
   - Handles the algorithmic distribution of inbound funds (e.g., routing percentages to Master, Payroll, and Marketing vaults).

## Rust Implementation Standards
All contracts MUST adhere to the following best practices:
- **No STD**: Compile with `#![no_std]` to ensure compatibility with the Soroban WASM runtime.
- **Symbol Optimization**: Use short `Symbol` names for storage keys to minimize ledger space costs.
- **Explicit Auth**: Every state-mutating function must explicitly call `env.auth()` (or `require_auth()` in SDK wrappers) referencing the `[[on-chain-state]]` allowlists.
