<h1 align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:08060D,50:6366f1,100:eab308&height=240&section=header&text=StellarFlow&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Web3%20Enterprise%20Treasury%20Operating%20System&descAlignY=65&descSize=20" alt="StellarFlow Banner" />
</h1>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=JetBrains+Mono&size=22&duration=3000&pause=1000&color=EAB308&center=true&vCenter=true&width=900&lines=Enterprise-Grade+Treasury+OS;Batch+Transfers+%26+Smart+Routing;Multi-Sig+Governance+%26+Approvals;Built+on+the+Stellar+Network" alt="Typing SVG" />
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15+-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/Rust-Backend-E43716.svg?style=flat-square&logo=rust" alt="Rust" /></a>
  <a href="https://stellar.org/"><img src="https://img.shields.io/badge/Stellar-Network-000000.svg?style=flat-square&logo=stellar" alt="Stellar" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-DB-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <img src="https://img.shields.io/badge/PWA-Installable-4f46e5.svg?style=flat-square&logo=pwa" alt="PWA" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-eab308.svg?style=flat-square" alt="License" />
  <a href="https://web3-private-production.up.railway.app/"><img src="https://img.shields.io/badge/🚀%20Live%20Demo-StellarFlow-eab308?style=flat-square" alt="Live Demo" /></a>
</p>

<p align="center">
  <a href="https://web3-private-production.up.railway.app/">
    <img src="https://img.shields.io/badge/%F0%9F%9A%80%20LAUNCH%20APP-web3--private--production.up.railway.app-eab308?style=for-the-badge" alt="Launch StellarFlow" />
  </a>
</p>

---

## 📌 What is StellarFlow?

Managing a corporate treasury on a traditional bank dashboard is like piloting a jumbo jet with a bicycle bell. It was never designed for the speed, transparency, or programmability that Web3 demands.

**StellarFlow** was built to close that gap.

It is a **full-stack, enterprise-grade Treasury Operating System** that lives natively on the Stellar blockchain. StellarFlow unifies every treasury workflow — from single-click batch payouts to threshold-based multi-sig governance — into a single, beautifully designed operations center.

> The goal is simple: give treasury teams the clarity of a Bloomberg terminal, the control of a smart contract, and the mobility of a mobile banking app — all in one place.

---

## ⚡ Performance & Efficiency

The following metrics demonstrate StellarFlow's transactional throughput advantages over traditional treasury pipelines:

<p align="center">
  <img src="./assets/latency-chart.svg" alt="Settlement Latency Comparison Chart" />
</p>


---

## 🌟 Core Features

<table>
<tr>
<td width="50%">

### 💸 Batch Transfers
Execute **thousands of disbursements** in a single atomic transaction. Perfect for payroll, dividends, and airdrop distributions at near-zero cost.

- Parallel transaction construction
- Atomic multi-payment bundles
- CSV / JSON import support
- Real-time status monitoring

</td>
<td width="50%">

### 🧭 Smart Routing
AI-assisted pathfinding that automatically discovers the **most capital-efficient route** across Stellar's DEX for any cross-currency settlement.

- Multi-hop path discovery
- Slippage protection
- Live price oracle integration
- Admin-key copy for demos

</td>
</tr>
<tr>
<td width="50%">

### 🔐 Multi-Sig Governance
Enforce **threshold-based signing** requirements on every high-value action. No single key can unilaterally move funds.

- N-of-M signature thresholds
- Approval queues with TTLs
- On-chain quorum verification
- Full audit trail per proposal

</td>
<td width="50%">

### 📊 Intelligence Analytics
Live treasury dashboards delivering **institutional-grade visibility** into cash positions, velocity, and network health.

- Rolling P&L and cash flow
- Asset concentration metrics
- Horizon event stream feed
- Exportable compliance reports

</td>
</tr>
</table>

---

## 🏗️ System Architecture

<div align="center">

```mermaid
flowchart TD
    classDef default fill:#1E293B,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef gold fill:#1a1400,stroke:#eab308,stroke-width:2px,color:#eab308;
    classDef action fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#fff;
    classDef rust fill:#2d1a0e,stroke:#E43716,stroke-width:2px,color:#E43716;

    subgraph Frontend ["Next.js 15 Frontend (Vercel)"]
        UI[Treasury Dashboard]:::gold
        UI --> B[Batch Transfer Center]
        UI --> S[Smart Routing]
        UI --> M[Multi-Sig Approvals]
        UI --> A[Analytics Engine]
    end

    subgraph Backend ["Rust Backend (Railway)"]
        API[REST API Gateway]:::rust
        B --> API
        S --> API
        M --> API
    end

    subgraph Blockchain ["Stellar Testnet / Mainnet"]
        API --> H[Horizon API]:::action
        H --> TX[Transaction Submission]
        H --> SS[Stellar Streaming Events]
    end

    subgraph DB ["PostgreSQL"]
        API --> PG[(State & Audit Log)]
    end
```

</div>

---

## 🔮 Future Roadmap: SentinelMark SDK Integration

The next evolution of StellarFlow will integrate **[SentinelMark](https://github.com/Be-bibek/sentinelmark)** — a **Behavior-Aware Continuous Trust Infrastructure Platform** built in Rust.

Traditional multi-sig says: *"Was the right key used?"*  
SentinelMark asks: **"Can this treasury operator still be trusted right now?"**

By embedding the `sentinelmark-rs` SDK into StellarFlow's Rust backend, every high-value treasury action will pass through a 7-engine deterministic trust evaluation pipeline before being authorized on-chain.

### The Integration Flow

<div align="center">

```mermaid
flowchart LR
    classDef default fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#fff;
    classDef highlight fill:#0F172A,stroke:#F43F5E,stroke-width:3px,color:#fff;
    classDef action fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#fff;
    classDef stellar fill:#1a1400,stroke:#eab308,stroke-width:2px,color:#eab308;

    SF[StellarFlow Treasury Action]:::stellar
    SF --> SDK[SentinelMark SDK]

    SDK --> IE[Identity Engine\nDevice + Geo Anomaly]
    SDK --> WE[Workflow Engine\nAction Sequence Profiling]
    IE --> BE[Behavior Engine]
    WE --> BE

    BE --> RE[Risk Engine\n0.0 – 1.0 Score]
    RE --> PE[Policy Engine]

    PE --> A[✅ Allow Transfer]:::action
    PE --> AP[⚠️ Escalate Multi-Sig]:::highlight
    PE --> BL[🚫 Block Transaction]:::highlight
```

</div>

### What Each Engine Does for StellarFlow

| SentinelMark Engine | StellarFlow Use Case |
|---|---|
| **Identity Engine** | Detects if the treasury manager signs from a new device or impossible-travel location. |
| **Workflow Engine** | Flags if batch exports are submitted outside normal operational hours or approval flow. |
| **Behavior Engine** | Builds a rolling profile of typical transaction volumes, currencies, and counterparties. |
| **Risk Engine** | Converts behavioral deviations into a deterministic `0.0–1.0` risk score. |
| **Trust Engine** | Inverts risk into an actionable Trust Score driving policy enforcement. |
| **Policy Engine** | Enforces: `Allow`, `RequireMFA`, `RequireApproval`, or `Block` on the treasury action. |
| **Explainability Engine** | Generates compliance-ready narratives: *"Transfer blocked: 3.2σ geo anomaly detected."* |

### Future SDK Usage Preview

```rust
use sentinelmark_rs::SentinelMark;
use telemetry_engine::{TelemetryEvent, ActionType};

// Initialize the continuous trust SDK inside StellarFlow's Rust backend
let engine = SentinelMark::new();

// A treasury operator attempts a $500,000 batch payout from an unknown region
let event = TelemetryEvent {
    user_id: UserId("treasury-admin-001".to_string()),
    action_type: ActionType::BatchTransfer,
    transaction_amount: Some(500_000.0),
    geo_region: "RU-Moscow".to_string(), // Unusual region for this operator
    // ... timestamps, device_id, IP fingerprint
};

// SentinelMark evaluates trust deterministically against historical profile
let result = engine.evaluate(&event, &historical_profile);

println!("Decision: {:?}", result.decision);
// → RequireApproval  (Auto-escalated to Multi-Sig threshold)

println!("Explanation: {}", result.explanation);
// → "Risk score: 0.72. Geo anomaly (4.1σ deviation). Unusual transaction volume."
```

This integration turns StellarFlow's multi-sig approvals from a **static rule** into a **dynamic, behavior-aware shield**.

---

## 🛠️ Tech Stack

<table>
<tr><th>Layer</th><th>Technology</th><th>Role</th></tr>
<tr><td>Frontend</td><td>Next.js 15, React 19, TailwindCSS v4</td><td>Treasury Dashboard UI, PWA</td></tr>
<tr><td>Animations</td><td>Framer Motion, GooeyNav</td><td>Micro-animations, mobile nav</td></tr>
<tr><td>Backend</td><td>Rust (Axum), Tokio async runtime</td><td>API Gateway, transaction orchestration</td></tr>
<tr><td>Database</td><td>PostgreSQL (SQLx pool)</td><td>State, approvals, audit ledger</td></tr>
<tr><td>Blockchain</td><td>Stellar SDK, Horizon API</td><td>Signing, pathfinding, streaming</td></tr>
<tr><td>Deployment</td><td>Railway (Backend), Vercel (Frontend)</td><td>CI/CD, auto-deploy on push</td></tr>
<tr><td>Trust (Future)</td><td>SentinelMark Rust SDK</td><td>Behavioral continuous trust</td></tr>
</table>

---

## 📦 Getting Started

### Prerequisites
* **Node.js** 22+ & npm
* **Rust** 1.75+
* **Docker & Docker Compose** (for local PostgreSQL)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Be-bibek/web3-private.git
cd web3-private

# 2. Install frontend dependencies and start dev server
npm install
npm run dev
# → App live at http://localhost:3000

# 3. Start the Rust backend (separate terminal)
cd backend
cargo run
# → API listening at http://localhost:8080

# 4. (Optional) Start PostgreSQL via Docker
docker-compose up -d
```

---

## 🎓 Author

**Bibek Das**  
* B.Tech Scholar, **Electronics and Communication Engineering (ECE)**  
* **Guru Nanak Institute of Technology**
* Email: [bibekdas1055@gmail.com](mailto:bibekdas1055@gmail.com)  
* GitHub: [@Be-bibek](https://github.com/Be-bibek)  

* 🌐 Live App: [web3-private-production.up.railway.app](https://web3-private-production.up.railway.app/)

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:eab308,50:6366f1,100:08060D&height=180&section=footer&text=Orchestrating%20the%20Future%20of%20Web3%20Finance&fontSize=26&fontColor=ffffff&animation=fadeIn&fontAlignY=65" alt="Footer Wave" />
</div>
