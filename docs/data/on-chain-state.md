# On-Chain State

While the `[[database-schema]]` handles off-chain caching and UI metadata, the **On-Chain State** is the absolute financial and cryptographic truth residing on the Stellar ledger via Soroban smart contracts.

## Soroban Ledger Storage Types
Soroban contracts use three distinct types of storage to maintain state:

1. **Persistent Storage (`env.storage().persistent()`)**:
   - Used for data that must not expire or be easily evicted.
   - Example: The `AdminArray` list of authorized multi-sig signers in the `[[treasury-vault-contract]]`.
   
2. **Temporary Storage (`env.storage().temporary()`)**:
   - Used for data that is only needed for a short period (e.g., allowances, time-bound execution flags).
   
3. **Instance Storage (`env.storage().instance()`)**:
   - Stores global configuration variables related to the contract instance (e.g., the contract's initialization flag, admin thresholds).

## Best Practices for Frontend Integrations
Whenever the Flutter wallet or Next.js web app needs the verifiable balance or the *current* active list of multi-sig admins, it MUST query the `[[rpc-pipeline]]` for the on-chain state, rather than relying on the off-chain database cache.
