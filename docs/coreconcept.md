# Core Concept & Internship Guidelines
*(Confidential - Not tracked in Git)*

## Overview
This document contains the core guidelines and requirements for the internship. It tracks the progress of the SentinelMark project against the specific Level 1 (L1), Level 2 (L2), and Level 3 (L3) requirements.

---

## 📝 Level 1 (L1) Requirements
**Status: 🔴 Not Started**

Your project must include all items below to successfully complete Level 1.
1. **Wallet Setup**
   * Set up the Freighter wallet
   * Use Stellar Testnet
2. **Wallet Connection**
   * Implement wallet connect functionality
   * Implement wallet disconnect functionality
3. **Balance Handling**
   * Fetch the connected wallet’s XLM balance
   * Display the balance clearly in the UI
4. **Transaction Flow**
   * Send an XLM transaction on the Stellar testnet
   * Show transaction feedback to the user: Success or failure state, Transaction hash or confirmation message
5. **Development Standards**
   * Examples: UI setup, wallet integration, balance fetch, transaction logic, error handling

> **SentinelMark Progress for L1:**
> Currently, SentinelMark is built as an Enterprise Trust Platform focusing on behavioral risk scoring and policy evaluation. The Stellar blockchain and Freighter wallet integration have **not** been started yet. To complete L1, SentinelMark needs a frontend integration (likely on the Dashboard) to allow a user to connect a Freighter wallet, view their XLM balance, and execute a testnet transaction.

---

## 📝 Level 2 (L2) Requirements
**Status: 🔴 Not Started**

Your project must include all items below to successfully complete Level 2.
1. 3 error types handled
2. Contract deployed on testnet
3. Contract called from the frontend
4. Transaction status visible
5. Minimum 2+ meaningful commits
6. Deliverable: Multi-wallet app with deployed contract and real-time event integration

> **SentinelMark Progress for L2:**
> Smart contracts on the Stellar network (Soroban) have not been developed or deployed yet for SentinelMark. To complete L2, we need to write a Soroban smart contract, deploy it to the testnet, and call it from the Next.js frontend, ensuring proper error handling and real-time transaction status visibility.

---

## 📝 Level 3 (L3) Requirements
**Status: 🟡 Partially Completed**

1. **Advanced smart contract development** (🔴 Not Started)
2. **Inter-contract communication** (🔴 Not Started)
3. **Event streaming & real-time updates** (🟡 Partially Completed - We have WebSockets for Policy Engine, but not for blockchain events)
4. **CI/CD pipeline setup** (🟡 Partially Completed - Basic GitHub Actions exist but need refinement)
5. **Smart contract deployment workflow** (🔴 Not Started)
6. **Mobile responsive frontend development** (🟢 Completed - Next.js Enterprise Dashboard)
7. **Error handling & loading states** (🟢 Completed - Comprehensive UI/UX handled)
8. **Writing tests for contracts and frontend** (🟡 Partially Completed - Rust backend is tested, but smart contract tests are missing)
9. **Production-ready architecture practices** (🟢 Completed - O(1) hashing, WebSockets, Load Balancing structure)
10. **Documentation & demo presentation** (🟢 Completed - Extensive README, Architecture diagrams, and video scripts prepared)

> **SentinelMark Progress for L3:**
> SentinelMark already meets many of the L3 architectural and frontend requirements. It features a highly responsive frontend, production-ready architecture (Rust + Next.js + WebSockets), and excellent documentation. However, the blockchain-specific L3 requirements (advanced smart contracts, inter-contract communication, smart contract CI/CD) are entirely missing and must be built next.

---

## 🚀 Next Steps Summary
To align SentinelMark with these internship requirements, the project must pivot (or expand) into the Web3/Stellar ecosystem. 
**Immediate priorities:**
1. Integrate the **Freighter Wallet** into the Next.js frontend.
2. Allow fetching and displaying **XLM Balances**.
3. Develop a **Soroban Smart Contract** that perhaps ties into SentinelMark's Trust Scores (e.g., a smart contract that only allows a transaction to process if SentinelMark signs off with a high Trust Score).
4. Deploy the contract to the **Stellar Testnet** and call it from the frontend.
