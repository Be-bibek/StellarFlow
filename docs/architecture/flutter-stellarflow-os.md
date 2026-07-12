# Flutter StellarFlow OS

## Overview
The `flutter-stellarflow` repository is the absolute source of truth for the mobile client architecture of the StellarFlow ecosystem. It acts as a dedicated standalone enclave built in Flutter, executing complex UI physics, secure keystore management, and real-time interaction with the Stellar Testnet.

This document serves as the master index for the Flutter application's internal mechanics and how they bridge to the broader `web-3` infrastructure via shared payload mappings.

## Core Philosophical Tenets
1. **Glassmorphism & Depth Physics**: The UI strictly adheres to a deep hardware-accelerated Z-axis structure. Components like the `StackedCardDeck` and bottom navigation bar utilize `BackdropFilter` frost layers, glowing neon borders, and dynamic multi-layered drop shadows.
2. **Dual Identity Theming**: The app natively toggles between an Obsidian Cyberpunk (Dark) theme and a Frosted Silver (Light) theme in real-time, requiring all textual and graphical assets to use dynamic mapping (`StellarColors` ThemeExtension).
3. **Decentralized Security Enclave**: The mobile app NEVER stores private cryptographic material in shared memory or cloud storage. It exclusively leverages hardware-backed Enclaves (via Android/iOS native secure storage mechanisms) managed through `StellarVault`.

## Key Architectural Nodes

### 1. `lib/core/` (System Foundation)
- **`crypto/stellar_vault.dart`**: The single source of truth for cryptographic material handling. Initializes secure key generation, strict secret seed retrieval logic, and storage bridging.
- **`network/stellar_rpc.dart`**: The singleton orchestrating communication with the Stellar Horizon Testnet, mapping Dart data models directly onto the network specifications defined in `[[rpc-pipeline]]`.
- **`theme/app_theme.dart`**: Defines `StellarColors` and global widget styling, mapping exactly to the `[[ui-deck-spec]]` metrics.
- **`widgets/`**: Reusable structural primitives (e.g., `GlassContainer`) that provide consistent aesthetic baseline.

### 2. `lib/features/` (Domain Logic)
- **`navigation/`**: Manages the persistent app shell. The `MainNavigationScreen` uses an `IndexedStack` to keep all primary feature tabs (Dashboard, Balance, Swap, Market) alive and maintains scrolling state to preserve UX flow.
- **`wallet/`**: The core interactive dashboard. Features the `WalletDashboard` state machine and the `StackedCardDeck` visual physics engine, interpreting local state models into real-time UI.
- ***(Pending)* `home/`, `marketplace/`, `swap/`**: Secondary application layers for asset visualization and decentralized commerce.

## Integration Checkpoints
Whenever modifying this codebase, refer to:
- `[[cross-platform-bridge]]` to ensure any Dart JSON serialization precisely matches the TypeScript schemas on the Web.
- `[[decentralized-auth]]` to guarantee that Soroban invocation payloads triggered from Flutter adhere exactly to the defined security lifecycle.
