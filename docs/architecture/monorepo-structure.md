# Monorepo Structure Architecture

StellarFlow OS is organized as a unified monorepo. This allows multiple frontends (e.g., Next.js web apps and Flutter mobile wallets) to share the same overarching architectural principles, backends, and smart contract definitions documented in this `/docs` vault.

## Root Directory Mapping
```text
StellarFlow-OS/
├── .cursorrules           # Absolute AI system directives pointing to /docs
├── docs/                  # Obsidian Vault: The Master Blueprint (You are here)
├── contracts/             # Soroban Rust smart contracts
│   ├── src/               # Rust source code
│   └── Cargo.toml         # Contract dependencies
├── backend/               # Railway Backend (Node.js/Rust) & DB Services
│   ├── src/               # Backend API routes and database schemas
│   └── Dockerfile         # Deployment configurations for Railway
├── web/                   # Next.js Web App (Dashboard & Governance)
│   ├── app/               # Next.js App Router (pages)
│   └── components/        # React UI elements
└── mobile/                # Flutter Native App (Hardware Wallet & Routing)
    ├── lib/               # Dart source code
    └── pubspec.yaml       # Flutter dependencies
```

## AI Agent Integration
Any AI agent building a new project inside this monorepo MUST:
1. Parse the `[[database-schema]]` before creating data models.
2. Read `[[soroban-smart-contracts]]` before invoking blockchain functions.
3. Align frontend layouts with `[[ui-deck-spec]]`.
