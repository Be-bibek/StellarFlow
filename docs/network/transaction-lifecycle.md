# Transaction Lifecycle Flowchart

This node details the exact step-by-step lifecycle of a transaction within StellarFlow OS, from a user click to final on-chain settlement, tying together the `[[ui-deck-spec]]`, `[[cross-platform-bridge]]`, and `[[rpc-pipeline]]`.

## The 6-Step Lifecycle

1. **Action Initiation (UI Layer)**
   - The user swipes or taps "Execute Transfer" on the `[[flutter-wallet-structure]]` or Next.js dashboard.
   
2. **Payload Construction (Client SDK)**
   - The frontend generates the specific Smart Contract invocation parameters (e.g., targeting `[[smart-routing]]`).
   
3. **RPC Simulation**
   - The client sends the unsigned payload to the `simulateTransaction` RPC endpoint.
   - The RPC returns the estimated resource consumption (CPU instructions, ledger read/writes) and the required fee.
   
4. **Local Cryptographic Signing**
   - The client attaches the fee to the transaction envelope.
   - **Flutter**: Signs using native Secure Enclave / Keystore (`[[decentralized-auth]]`).
   - **Next.js**: Prompts Freighter/browser wallet to sign.
   
5. **RPC Submission**
   - The fully signed XDR envelope is submitted via `sendTransaction`.
   - The client begins polling `getTransaction` for consensus status.
   
6. **Settlement and Cache Update**
   - Once confirmed on the ledger, the `[[database-schema]]` on Railway is updated via webhooks or chron jobs to reflect the new state, updating the UI charts immediately.
