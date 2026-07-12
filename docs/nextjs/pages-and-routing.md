# Next.js Pages and Routing

The StellarFlow web application utilizes a Single Page Application (SPA) architecture wrapped inside a monolithic `AppShell` (`app/page.tsx`). Routing is managed via a state-based view renderer rather than traditional URL paths, ensuring instant, zero-latency transitions between governance and treasury tools.

## The 13 Core Views
Located in `components/views/`, these form the entire surface area of the Next.js application:

1. **Dashboard (`dashboard-view.tsx`)**: The primary landing zone showing aggregate multi-sig wallet balances, quick actions, and recent transaction streams.
2. **Overview (`overview-view.tsx`)**: High-level visual layout combining a total balance chart, a quick Swap Widget, and the stacked Vault Liquidity Table.
3. **Treasury (`treasury-view.tsx`)**: Deep dive into sub-vault balances (Master, Payroll, Operations, Reserve, Marketing).
4. **Direct Transfer (`transfer-view.tsx`)**: Executes direct 1:1 XLM settlements. Uses the overlapping `Carousel` and `LaserFlow` UI components.
5. **Funding (`funding-view.tsx`)**: Tooling for funding testnet wallets automatically via Friendbot or manually, maintaining balances above 10,000 XLM.
6. **Smart Routing (`routing-view.tsx`)**: UI for configuring percentage-based logic that algorithmicly distributes inbound deposits across vaults.
7. **Governance (`governance-view.tsx`)**: Multi-sig proposal execution and approval dashboard. Interacts with the Soroban smart contracts to fulfill authorization thresholds.
8. **Batch Transit (`batch-view.tsx`)**: Tooling for executing massive parallel payroll distributions via Channel Accounts (Sequence Managed Transactions).
9. **Transit Map (`transit-view.tsx`)**: A visual network topology graph (often utilizing WebGL or heavy canvas effects) showing real-time fund movements.
10. **Analytics (`analytics-view.tsx`)**: Charts and historical graphing for vault performance and token velocities.
11. **Multi-Sig Auth (`multisig-view.tsx`)**: Dedicated interface for managing `AdminArray` thresholds and signature collections.
12. **Transaction History (`history-view.tsx`)**: Tabular data feed querying the PostgreSQL caching layer on Railway.
13. **Settings (`settings-view.tsx`)**: Local user preferences, dark/light mode toggles, and RPC configuration management.
