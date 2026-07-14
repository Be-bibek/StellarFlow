<h1 align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:08060D,50:6366f1,100:eab308&height=240&section=header&text=StellarFlow&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Web3%20Enterprise%20Treasury%20Operating%20System&descAlignY=65&descSize=20" alt="StellarFlow Banner" />
</h1>

<p align="center">
  <a href="https://web3-private-production.up.railway.app/">
    <img src="./assets/logo-glow.svg" height="120" alt="StellarFlow Logo" />
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://web3-private-production.up.railway.app/">
    <img src="./assets/railway-badge-glow.svg" height="120" alt="Hosted on Railway" />
  </a>
</p>

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

## 🌐 Live Smart Contract Deployment

The core logic of **StellarFlow** is governed completely on-chain via a Soroban Smart Contract. This contract is publicly deployed and verifiable on the Stellar Testnet. 

You can view the exact contract state, executed methods, and real-time ledger events directly on the Stellar Expert Explorer:

<br/>
<p align="center">
  <a href="https://stellar.expert/explorer/testnet/contract/CC7RCRZ3JF3W2YNTQKYTRMVGVIZGLPIX6B2R7Q6HUOWDRK3IQKRQWLKT">
    <img src="./assets/stellar-expert-badge-v2.svg" height="200" alt="View Smart Contract on Stellar Expert" />
  </a>
</p>
<br/>

---

## ⚡ Performance & Efficiency

The following metrics demonstrate StellarFlow's transactional throughput advantages over traditional treasury pipelines:

<p align="center">
  <img src="./assets/latency-chart.svg" alt="Settlement Latency Comparison Chart" />
</p>

| Metric | Traditional Bank | Ethereum (L1) | **StellarFlow** |
|---|---|---|---|
| **Settlement Time** | 2–3 business days | 15–60 seconds | ✅ **~5 seconds** |
| **Batch of 500 payouts** | Manual, days | Serial, minutes | ✅ **Parallel, seconds** |
| **Transaction Fee** | $25–$50 wire fee | $5–$80 gas fee | ✅ **~$0.0001 per tx** |
| **Concurrency Model** | Single-threaded queue | Nonce-serial | ✅ **Channel Account Pool** |
| **Audit Trail** | PDF exports | On-chain only | ✅ **PostgreSQL + On-chain** |
| **Key Control** | Custodial (bank holds) | Self-custody | ✅ **Non-custodial multi-sig** |

---

## 🌟 Core Features

<table>
<tr>
<td width="50%">

### 💸 Batch Transfers
Execute **thousands of disbursements** in a single atomic transaction. Perfect for payroll, dividends, and airdrop distributions at near-zero cost.

- Parallel Channel Account worker pool
- Atomic multi-payment bundles
- CSV / JSON import support
- `FOR UPDATE SKIP LOCKED` concurrency

</td>
<td width="50%">

### 🧭 Smart Routing
AI-assisted pathfinding that automatically discovers the **most capital-efficient route** across Stellar's DEX for any cross-currency settlement.

- Multi-hop path discovery via Soroban
- Slippage protection
- Live price oracle integration
- JIT (Just-In-Time) vault split map

</td>
</tr>
<tr>
<td width="50%">

### 🔐 Multi-Sig Governance
Enforce **threshold-based signing** requirements on every high-value action. No single key can unilaterally move funds.

- N-of-M signature thresholds
- XDR envelopes staged in Redis (24h TTL)
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
<tr>
<td width="50%">

### 🗺️ Real-Time Transit Map
A **live WebSocket-powered transaction visualization** engine. Watch every payment pulse through the network in real time — zero polling, pure push.

- `tokio::sync::broadcast` fan-out to all clients
- Framer Motion animated state transitions
- Org-ID scoped — zero cross-tenant leakage
- Sub-3-second ledger-to-UI latency

</td>
<td width="50%">

### 🏦 Institutional Key Management
Layered **non-custodial security** that mirrors what enterprise platforms like Ledger Enterprise and Fireblocks deploy — without custodial risk.

- On-chain Soroban `AdminArray` enforcement
- Flutter mobile app as hardware secure enclave
- iOS Secure Enclave / Android Keystore signing
- Private keys never leave the hardware chip

</td>
</tr>
</table>

---

## 🏗️ System Architecture

<div align="center">

```mermaid
flowchart TD
    classDef default fill:#1E293B,stroke:#6366f1,stroke-width:2px,color:#fff;
    classDef gold    fill:#1a1400,stroke:#eab308,stroke-width:2px,color:#eab308;
    classDef action  fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#fff;
    classDef rust    fill:#2d1a0e,stroke:#E43716,stroke-width:2px,color:#E43716;
    classDef db      fill:#0a1a0a,stroke:#22c55e,stroke-width:2px,color:#22c55e;
    classDef cache   fill:#1a1000,stroke:#eab308,stroke-width:2px,color:#eab308;
    classDef chain   fill:#0a0a1a,stroke:#6366f1,stroke-width:2px,color:#6366f1;
    classDef mobile  fill:#0a0a2e,stroke:#a855f7,stroke-width:2px,color:#a855f7;

    User(["👤 Treasury Operator"])
    Mobile(["📱 Flutter Mobile Wallet"]):::mobile

    subgraph Frontend ["Next.js 15 — Vercel CDN"]
        UI["🖥️ Treasury Dashboard"]:::gold
        TM["🗺️ Transit Map\nWebSocket Live View"]
        UI --> B["💸 Batch Transfers"]
        UI --> S["🧭 Smart Routing"]
        UI --> M["🔐 Multi-Sig Approvals"]
        UI --> TM
    end

    subgraph Backend ["Rust / Axum — Railway"]
        API["🦀 REST + WebSocket Gateway"]:::rust
        WS["📡 tokio::sync::broadcast\nEvent Fan-out"]
        POOL["⚙️ Channel Account\nWorker Pool"]
        API --> WS
        API --> POOL
    end

    subgraph Storage ["Persistent Storage"]
        PG[("🐘 PostgreSQL\nState & Audit Ledger")]:::db
        RD[("⚡ Redis\nXDR Vault + Cache")]:::cache
    end

    subgraph Blockchain ["Stellar Network"]
        HZ["🌐 Horizon API\nTx Submit & Queries"]:::chain
        RPC["🔭 Soroban RPC\nContract Events"]:::chain
        NET["⛓️ Stellar Ledger\n~5s Finality"]:::chain
    end

    User -->|"HTTPS"| UI
    Mobile -->|"REST / WebSocket"| API
    B & S & M --> API
    TM <-->|"WebSocket"| WS
    API --> PG & RD
    POOL --> HZ
    API --> RPC
    HZ & RPC --> NET
    RPC -->|"Contract Events"| WS
```

</div>

---

## 🏗️ Architecture Deep-Dive

> As the architect of StellarFlow, every infrastructure decision was made with three constraints in mind: **financial safety**, **horizontal scalability**, and **zero single-points of failure**. Below are the five key system diagrams that define how StellarFlow is built.

---

### 1. 🌐 Network & Infrastructure Topology

*The macro-level view — how traffic flows from a browser through the load-balanced cluster and onto the Stellar network.*

<div align="center">

```mermaid
flowchart TB
    classDef cdn    fill:#0c1a2e,stroke:#38BDF8,stroke-width:2px,color:#38BDF8
    classDef lb     fill:#1a0a2e,stroke:#a855f7,stroke-width:2px,color:#a855f7
    classDef rust   fill:#2d1a0e,stroke:#E43716,stroke-width:2px,color:#E43716
    classDef db     fill:#0a1a0a,stroke:#22c55e,stroke-width:2px,color:#22c55e
    classDef cache  fill:#1a1000,stroke:#eab308,stroke-width:2px,color:#eab308
    classDef chain  fill:#0a0a1a,stroke:#6366f1,stroke-width:2px,color:#6366f1

    User(["👤 Treasury Operator\n(Browser / PWA)"])

    subgraph Edge ["Edge — Vercel Global CDN"]
        direction LR
        CDN["⚡ Next.js 15\nSSR + Static Assets"]:::cdn
    end

    subgraph LB ["Load Balancer — Railway Proxy"]
        direction LR
        Proxy["🔀 Reverse Proxy\nRound-Robin + Health Check"]:::lb
    end

    subgraph Cluster ["Rust/Axum Worker Cluster"]
        direction LR
        N1["🦀 Axum Node 1\nPort 8080"]:::rust
        N2["🦀 Axum Node 2\nPort 8081"]:::rust
        N3["🦀 Axum Node N\n(Horizontal Scale)"]:::rust
    end

    subgraph Storage ["Persistent Storage Layer"]
        PG[("🐘 PostgreSQL\nSQLx Pool — 50 Conns\nAudit Ledger & State")]:::db
        RD[("⚡ Redis\nO(1) Multi-Sig XDR\nSession & Event Cache")]:::cache
    end

    subgraph Stellar ["Stellar Blockchain Network"]
        HZ["🌐 Horizon REST API\nAccount Queries / Tx Submit"]:::chain
        RPC["🔭 Soroban RPC\nContract Events / Simulation"]:::chain
        NET["⛓️ Stellar Ledger\n~5s Finality"]:::chain
    end

    User -->|"HTTPS"| CDN
    CDN -->|"WebSocket / REST"| Proxy
    Proxy --> N1 & N2 & N3
    N1 & N2 & N3 --> PG
    N1 & N2 & N3 --> RD
    N1 & N2 & N3 --> HZ
    N1 & N2 & N3 --> RPC
    HZ --> NET
    RPC --> NET
```

</div>

**Why this topology?**
- **Vercel CDN** serves the Next.js frontend at the edge — zero cold-start latency for the treasury dashboard globally.
- **Railway Reverse Proxy** sits in front of the Rust cluster, performing health checks and round-robin routing. If a node dies, traffic is instantly rerouted.
- **Horizontal scaling** is native: because each Axum node is stateless (state lives in PostgreSQL and Redis), adding more nodes requires zero application changes.

---

### 2. ⚡ Real-Time WebSocket Event Pipeline

*How on-chain Soroban events travel from the Stellar ledger to the UI in under 3 seconds.*

<div align="center">

```mermaid
sequenceDiagram
    autonumber
    participant Ledger   as ⛓️ Stellar Ledger
    participant RPC      as 🔭 Soroban RPC Node
    participant Poller   as 🦀 Event Poller<br/>(tokio::spawn)
    participant DB       as 🐘 PostgreSQL
    participant Channel  as 📡 Broadcast Channel<br/>(tokio::sync::broadcast)
    participant WS       as 🔌 WebSocket Gateway<br/>/v1/transit/:org_id
    participant UI       as 🖥️ Treasury Dashboard

    Ledger  ->> RPC     : Emits contract event<br/>("routed", "approved")
    loop Every 3 seconds
        Poller  ->> RPC     : POST getEvents { startLedger: cursor }
        RPC     -->> Poller : Raw SCVal XDR event batch
    end
    Poller  ->> Poller  : Parse XDR → TransitEvent struct
    Poller  ->> DB      : UPDATE transactions SET status = 'STELLAR_LEDGER'
    Poller  ->> Channel : broadcast_tx.send(JSON payload)
    Channel -->> WS     : Fan-out to all subscribers
    WS      -->> UI     : Text frame: { type: "STATUS_CHANGE", status: "SETTLED" }
    UI      ->> UI      : Framer Motion animates state transition
```

</div>

**Key engineering decisions:**
- **Long-polling over subscriptions**: Soroban RPC `getEvents` with a ledger cursor is more reliable than server-sent subscriptions during network partitions — it naturally replays missed events on reconnect.
- **`tokio::sync::broadcast` channel**: One sender, N receivers. Each connected WebSocket client subscribes its own `Receiver` clone. Lagging clients are dropped gracefully — no backpressure on the critical broadcast path.
- **Org-ID filtering at the gateway**: Each enterprise's WebSocket connection only receives events matching its `org_id`, preventing cross-tenant data leakage without per-message encryption overhead.

---

### 3. 💸 Parallel Batch Payment Engine

*How StellarFlow eliminates Stellar sequence number collisions when processing 100+ concurrent payouts.*

<div align="center">

```mermaid
flowchart TD
    classDef gold   fill:#1a1400,stroke:#eab308,stroke-width:2px,color:#eab308
    classDef rust   fill:#2d1a0e,stroke:#E43716,stroke-width:2px,color:#E43716
    classDef db     fill:#0a1a0a,stroke:#22c55e,stroke-width:2px,color:#22c55e
    classDef chain  fill:#0a0a1a,stroke:#6366f1,stroke-width:2px,color:#6366f1
    classDef worker fill:#0f1a2d,stroke:#38BDF8,stroke-width:2px,color:#38BDF8

    FE["📋 Frontend\nPOST /api/v1/payments/batch\n{ recipients: [...500 rows] }"]:::gold

    subgraph Handler ["Axum Request Handler"]
        V["✅ Validate Addresses\n& Amounts"]:::rust
        SIM["🔭 Soroban Simulation\nroute_payout (read-only)\nGet vault split map"]:::rust
        STAGE["📝 Stage All Records\nINSERT INTO transactions\nStatus = AUTHORIZING"]:::rust
    end

    subgraph Pool ["tokio Channel Account Worker Pool"]
        W1["🦀 Worker 1\nChannel Acct #1\nSKIP LOCKED"]:::worker
        W2["🦀 Worker 2\nChannel Acct #2\nSKIP LOCKED"]:::worker
        WN["🦀 Worker N\nChannel Acct #N\nSKIP LOCKED"]:::worker
    end

    subgraph SM ["Per-Worker State Machine"]
        direction LR
        AUTH["AUTHORIZING"] --> ROUTE["ROUTING"] --> LEDGER["STELLAR_LEDGER"] --> SETTLE["SETTLED"]
    end

    PG[("🐘 PostgreSQL\nChannel Account Lock Table\nFOR UPDATE SKIP LOCKED")]:::db
    HZ["🌐 Horizon API\n/transactions"]:::chain
    BC["📡 Broadcast\nWebSocket Events\nAt Each Transition"]

    FE --> V --> SIM --> STAGE
    STAGE -->|"tokio::spawn × N"| W1 & W2 & WN
    W1 & W2 & WN -->|"Acquire exclusive lock"| PG
    PG -->|"Return unlocked channel"| W1 & W2 & WN
    W1 & W2 & WN --> SM
    SM -->|"Submit signed XDR"| HZ
    SM --> BC
```

</div>

**The sequence number problem — and how we solved it:**

On Stellar, every account has a monotonically increasing sequence number. If two transactions from the same account are submitted simultaneously, one will fail with `txBAD_SEQ`. Most platforms serialize payroll, making it slow.

StellarFlow's solution: a **pool of pre-funded Channel Accounts**. Each worker task grabs one with `SELECT ... FOR UPDATE SKIP LOCKED` — a PostgreSQL advisory lock that is atomic and race-condition-proof. Each channel has its own sequence number sequence, so 100 workers can broadcast 100 transactions in true parallel without a single collision.

<p align="center">
  <img src="./assets/batch-engine.svg" alt="Parallel Batch Payment Engine Diagram" width="820" />
</p>

---

### 4. 🔐 Multi-Sig XDR Coordination State Machine

*The lifecycle of a high-value transaction requiring 3-of-5 executive approval, from creation to Horizon submission.*

<div align="center">

```mermaid
stateDiagram-v2
    direction LR

    [*] --> PENDING : POST /api/v1/approvals/pending\nXDR envelope staged in Redis\nTTL = 24h

    PENDING --> PENDING : POST /api/v1/approvals/sign\nSignature injected into XDR\nCounter incremented (1/5, 2/5...)

    PENDING --> THRESHOLD_MET : N-th signature received\ncurrent_signatures == required_signatures

    THRESHOLD_MET --> SUBMITTED : Auto-submit to Horizon\nPOST /transactions\n(no human action required)

    SUBMITTED --> CONFIRMED : Horizon confirms\nledger_sequence recorded\nWebSocket → "SETTLED"

    SUBMITTED --> REJECTED : Horizon returns error\nXDR invalid or network fault

    PENDING --> EXPIRED : Redis TTL exhausted\nOR expires_at timestamp crossed

    CONFIRMED --> [*]
    REJECTED  --> [*]
    EXPIRED   --> [*]
```

</div>

**Why Redis for XDR storage?**
- XDR envelopes are hot data — they are read and mutated on every signature submission. Redis delivers **O(1) GET/SET** with sub-millisecond latency, critical for interactive approval UX.
- `KEEPTTL` on every write preserves the original expiry without needing to recalculate TTL deltas — a Redis 6+ primitive that removes an entire class of race conditions.
- PostgreSQL remains the **durable audit trail**: the `approval_signatures` table enforces `UNIQUE (approval_id, signer_address)` at the database layer, making double-signing physically impossible.

<p align="center">
  <img src="./assets/multisig-lifecycle.svg" alt="Multi-Sig XDR Approval Lifecycle" width="820" />
</p>

---

### 5. 🗄️ Relational Data Model

*The PostgreSQL schema that powers the treasury ledger — designed for auditability, multi-tenancy, and high-concurrency access patterns.*

<div align="center">

```mermaid
erDiagram
    organizations {
        UUID   id               PK
        TEXT   name
        TEXT   admin_address    UK  "Stellar G-address"
        TEXT   contract_address     "Soroban TreasuryRouter"
        TIMESTAMPTZ created_at
    }

    wallets {
        UUID        id           PK
        UUID        org_id       FK
        TEXT        wallet_name
        TEXT        public_key   UK  "Stellar G-address"
        wallet_type wallet_type      "PAYROLL | OPERATIONS | RESERVE"
        BOOL        is_active
    }

    transactions {
        UUID               id           PK
        TEXT               transfer_id  UK
        UUID               org_id       FK
        NUMERIC_20_7       amount
        TEXT               destination
        JSONB              source_breakdown  "Vault split map"
        transaction_status status           "AUTHORIZING→SETTLED"
        TEXT               stellar_tx_hash
        BIGINT             ledger_sequence
        UUID               batch_id
    }

    approval_requests {
        UUID            id                  PK
        TEXT            redis_key           UK  "sf:approval:{id}:xdr"
        UUID            org_id              FK
        NUMERIC_20_7    amount
        INT             required_signatures
        INT             current_signatures
        approval_status status              "PENDING→CONFIRMED"
        TIMESTAMPTZ     expires_at
    }

    approval_signatures {
        UUID id             PK
        UUID approval_id    FK
        TEXT signer_address
        TEXT signature_b64      "Ed25519 64-byte sig"
        TEXT hint_hex           "4-byte key hint"
    }

    channel_accounts {
        UUID id              PK
        TEXT public_key      UK
        TEXT encrypted_secret   "AES-256 / KMS"
        BOOL is_locked          "FOR UPDATE SKIP LOCKED"
        UUID locked_by_batch FK
        INT8 last_sequence
    }

    organizations    ||--o{  wallets            : "owns"
    organizations    ||--o{  transactions        : "initiates"
    organizations    ||--o{  approval_requests   : "manages"
    approval_requests ||--o{ approval_signatures : "collects"
    channel_accounts ||--o{  transactions        : "broadcasts via"
```

</div>

**Schema design principles:**
- **`transaction_status` as a PostgreSQL ENUM** — the database physically enforces the `AUTHORIZING → ROUTING → STELLAR_LEDGER → SETTLED / FAILED` state machine. Invalid transitions are impossible at the storage layer, not just the application layer.
- **`source_breakdown JSONB`** — the per-vault capital split from the Soroban `route_payout` call is stored as structured JSON, queryable with PostgreSQL's `@>` operator for post-hoc analytics without schema migrations.
- **`channel_accounts.is_locked` with `FOR UPDATE SKIP LOCKED`** — pure SQL concurrency control for the worker pool. No distributed lock manager (like Redlock) required.

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

<p align="center">
  <img src="./assets/tech-stack-layers.svg" alt="Tech Stack Layer Diagram" width="820" />
</p>

<table>
<tr><th>Layer</th><th>Technology</th><th>Role</th></tr>
<tr><td>Frontend</td><td>Next.js 15, React 19, TailwindCSS v4</td><td>Treasury Dashboard UI, PWA — 13 live views</td></tr>
<tr><td>Animations</td><td>Framer Motion, GooeyNav, LaserFlow</td><td>Micro-animations, real-time transit map canvas</td></tr>
<tr><td>Backend</td><td>Rust (Axum), Tokio async runtime</td><td>REST + WebSocket API Gateway, batch engine</td></tr>
<tr><td>Smart Contracts</td><td>Soroban (Rust), <code>#![no_std]</code> WASM</td><td>On-chain multi-sig, JIT routing, vault enforcement</td></tr>
<tr><td>Database</td><td>PostgreSQL (SQLx pool, Railway)</td><td>State machine, approvals, idempotent audit ledger</td></tr>
<tr><td>Cache / Broker</td><td>Redis (planned Pub/Sub upgrade)</td><td>Multi-sig XDR vault (O(1)), rate limiting, session cache</td></tr>
<tr><td>Blockchain</td><td>Stellar Network, Horizon API, Soroban RPC</td><td>Dual-client: XLM transfers + smart contract events</td></tr>
<tr><td>Mobile (In Dev)</td><td>Flutter, Dart, Secure Enclave / Keystore</td><td>Hardware wallet enclave, offline TX signing</td></tr>
<tr><td>Deployment</td><td>Railway (Backend + DB), Vercel (Frontend)</td><td>CI/CD, auto-deploy, horizontally scaled Axum cluster</td></tr>
<tr><td>Architecture Docs</td><td>Obsidian Vault + Markdown</td><td>AI-readable monorepo brain — cross-platform spec</td></tr>
<tr><td>Trust (Planned)</td><td>SentinelMark Rust SDK</td><td>Behavioral continuous trust, risk-driven policy engine</td></tr>
<tr><td>Notifications (Planned)</td><td>FCM (Firebase Cloud Messaging)</td><td>Mobile push alerts for multi-sig approval requests</td></tr>
</table>

---

## 📦 Getting Started & Local Development

You can run the entire StellarFlow stack locally. Because the architecture is decoupled into microservices, you only need Node.js for the frontend and Rust for the backend.

### Prerequisites
* **Node.js** 22+ & npm
* **Rust** 1.75+
* **Docker & Docker Compose** (for local PostgreSQL & Redis)

### 1. Clone the Repository
Open a terminal and run:
```bash
git clone https://github.com/Be-bibek/StellarFlow.git
cd StellarFlow
```

### 2. Start the Database & Cache (Docker)
The Rust backend requires PostgreSQL (for the audit ledger) and Redis (for the multi-sig XDR vault). Start them using Docker Compose:
```bash
docker-compose up -d
```
*(This spins up both Postgres and Redis silently in the background).*

### 3. Start the Rust Backend
Open a **new terminal window**, navigate to the backend folder, and run the Rust server:
```bash
cd backend

# Create a basic .env file for local development
echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/stellarflow" > .env
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "PORT=8080" >> .env

# Compile and run the Axum server
cargo run
```
*The backend API and WebSocket gateway will now be running on `http://localhost:8080`.*

### 4. Start the Next.js Frontend
Open a **third terminal window**, stay in the root `StellarFlow` directory, and run the Next.js app:
```bash
# Install dependencies
npm install

# Connect the frontend to your local Rust backend
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
echo "NEXT_PUBLIC_WS_URL=ws://localhost:8080" >> .env.local

# Start the frontend
npm run dev
```
*The Treasury Dashboard will now be live at `http://localhost:3000`.*

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:eab308,50:6366f1,100:08060D&height=180&section=footer&text=Orchestrating%20the%20Future%20of%20Web3%20Finance&fontSize=26&fontColor=ffffff&animation=fadeIn&fontAlignY=65" alt="Footer Wave" />
</div>
