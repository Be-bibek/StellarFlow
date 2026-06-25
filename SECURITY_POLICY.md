# SECURITY_POLICY.md
**StellarFlow Absolute System Rulebook**

This file serves as the absolute system prompt and rulebook for all AI interactions and manual modifications within this repository. 

### Rule 1 (Next.js Env)
Never use the `NEXT_PUBLIC_` prefix for secrets, database URLs, AES keys, or Stellar Seed phrases. `NEXT_PUBLIC_` is strictly reserved for safe endpoints like `NEXT_PUBLIC_API_URL`.

### Rule 2 (Backend Authority)
The Next.js frontend must never hold cryptographic keys. All Stellar signing and AES decryption must remain strictly isolated inside the Rust backend runtime.

### Rule 3 (CORS Strictness)
The Rust Axum API must enforce strict CORS policies in production, rejecting any origin that is not the official deployed Vercel domain.

### Rule 4 (No Hardcoding)
Never hardcode connection strings or secrets in any `.rs` or `.ts` file. Always use the `config.rs` initialization pipeline.
