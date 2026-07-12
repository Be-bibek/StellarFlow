# Decentralized Authentication Model

## Zero-Backend Architecture
StellarFlow OS operates on a **pure Web3 decentralized security model**. There is no traditional centralized backend for authentication (no JWTs, no email/passwords). Authentication and authorization are handled entirely by cryptographic signatures verified on-chain.

## Soroban `require_auth()` Lifecycle
The Soroban Rust smart contract utilizes the native `require_auth()` function to enforce execution security.

1. **Invocation**: The client (Next.js or Flutter) prepares a transaction payload invoking a smart contract method.
2. **Signature**: The client signs the payload using the user's private key (via a browser extension like Freighter, or a secure hardware enclave in Flutter).
3. **Verification**: The Soroban runtime intercepts the invocation and executes `require_auth()`.
4. **Validation**: The ledger verifies that the cryptographic signature mathematically matches the public key of the invoker and that the payload has not been tampered with.

## Immutable Initialization Arrays (Multi-Sig)
For treasury and governance actions, the smart contract's persistent storage tracks an exclusive, immutable initialization array of authorized account addresses (e.g., Admin 1 and Admin 2).

- **Execution Drop**: Any execution attempt originating from an address not explicitly listed in this on-chain array is automatically dropped at the ledger level, preventing any unauthorized state mutations.
- **Thresholds**: Multi-sig actions require `require_auth()` from a predefined threshold of these authorized addresses before the state transition is finalized.
