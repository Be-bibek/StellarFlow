# StellarFlow

**StellarFlow** is an enterprise-grade treasury routing and Just-In-Time (JIT) liquidity management application built on the Stellar blockchain. It is designed to automate complex, multi-wallet payment routing securely and concurrently.

This project showcases a full-stack implementation with a **Next.js** frontend, a **Rust (Axum)** backend, and integrations with **PostgreSQL**, **Redis**, and the **Stellar Horizon / Soroban** networks.

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Current Implementation Status](#current-implementation-status)
- [How to Run Locally](#how-to-run-locally)

---

## Project Overview

Organizations operating at scale on Stellar often face the challenge of fragmented liquidity across multiple channel accounts or functional vaults (e.g., Payroll, Operations, Marketing). **StellarFlow** solves this by offering a JIT routing engine that aggregates available balances across various vaults and intelligently splits a large payment request so that it is seamlessly fulfilled without manual intervention.

To handle high-throughput, concurrent executions without sequence number collisions (`tx_bad_seq`), StellarFlow utilizes a Redis-backed atomic sequence manager. Furthermore, the application provides a highly responsive UI powered by WebSockets to stream real-time pipeline execution states directly to the user.

---

## Key Features

- **JIT Allocation Engine:** Dynamically queries live balances from Stellar Horizon and automatically computes payment splits across multiple internal treasury wallets to cover a single large outbound transaction.
- **Real-Time Execution Pipeline:** A WebSocket-based transit engine streams live transaction status updates (`AUTHORIZING`, `ROUTING`, `STELLAR_LEDGER`, `SETTLED`, `FAILED`) to the UI, providing a seamless visual experience.
- **Robust Transaction Building:** Uses `stellar-xdr` and `ed25519-dalek` in Rust to safely construct, serialize, and sign XDR transaction envelopes entirely in the backend without relying on deprecated SDKs.
- **High-Concurrency Sequence Management:** Integrates Redis atomic increments (`INCR`) to manage Stellar account sequence numbers, completely eliminating sequence collision risks across concurrent background workers.
- **Premium UI / UX:** A visually stunning, dark-mode focused interface built with Next.js, TailwindCSS, and Zustand for state management, featuring micro-animations, glassmorphism, and live data visualizations.

---

## Architecture & Tech Stack

### Frontend
- **Framework:** Next.js (App Router), React 18
- **Styling:** TailwindCSS, Lucide Icons, Custom Animations
- **State Management:** Zustand (for reactive, un-drilled state management)
- **Real-Time Integration:** Native WebSockets connected to the Rust Gateway

### Backend
- **Framework:** Rust, Axum (high-performance async web framework)
- **Database:** PostgreSQL (managed via SQLx for compile-time verified queries)
- **Caching & Locking:** Redis (used for Sequence Number management and distributed locking)
- **Stellar Integration:** `stellar-xdr` (for protocol-level XDR encoding), direct HTTP client to Horizon, and `ed25519-dalek` for cryptographic signatures.

---

## Current Implementation Status

This repository is currently up-to-date with the completion of **Phase C** of the architectural roadmap. The following core milestones have been achieved:

### ✅ Completed Deliverables

1. **Phase P0 (Foundation):** 
   - Initialized the Rust Axum backend with Postgres/Redis connections and error handling layers.
   - Built the Next.js frontend shell, implementing a beautiful Glassmorphic dark mode dashboard with Zustand state management.
   
2. **Phase P1 (JIT Engine):**
   - Implemented the `jit_aggregator` in Rust which fetches real live wallet balances from Horizon and runs the algorithmic split computation.
   - Wired the Next.js UI to simulate routing, showing the allocation breakdown across active wallets before execution.

3. **Phase C (Real Stellar Transaction Execution):**
   - **Replaced mocks with real execution:** The backend now constructs actual Stellar transaction XDRs, signs them, and submits them to the live Horizon testnet.
   - **Sequence Number Management:** Completed the Redis integration (`get_and_increment` atomic operations) to handle concurrent sequence number generation flawlessly.
   - **Database State Synchronization:** The Postgres `transactions` table correctly reflects the live settlement status and stores real `stellar_tx_hash` values.
   - **Live WebSocket Transit:** The frontend perfectly animates the pipeline flow from `Staged` all the way to `Settled` using real-time WebSocket events fired by the Rust backend after actual Horizon settlement.

> **Note on Phase C Multi-Wallet Execution:** 
> While the JIT algorithm correctly computes allocations across *all* active vaults (Payroll, Marketing, etc.), the physical XDR execution layer is currently configured to broadcast relying exclusively on the Master Treasury `.env` signer. Full multi-wallet cryptographic execution requires integrating the AES decryption layer to unlock individual channel account secrets, which is slated for the upcoming Phase D.

---

## How to Run Locally

### Prerequisites
- Node.js (v18+)
- Rust (1.75+)
- PostgreSQL (running locally on port 5432)
- Redis (running locally on port 6379)

### Setup the Backend
1. Navigate to the `backend` directory.
2. Copy `.env.example` to `.env` and fill in your PostgreSQL, Redis, and Stellar Signer details.
3. Apply database migrations: `cargo run --bin stellarflow-backend` (Seed data will automatically populate).
4. Start the backend: `cargo run`
   *(Backend runs on `http://localhost:8080`)*

### Setup the Frontend
1. Navigate to the project root (where `package.json` is located).
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open `http://localhost:3000` in your browser.

---

*This application was engineered with a focus on addressing the highest-risk architectural components of distributed Stellar application design, particularly concurrency control, cryptographic safety, and responsive real-time feedback.*
