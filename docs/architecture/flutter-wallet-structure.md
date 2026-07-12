# Flutter Wallet Structure

The Flutter application within StellarFlow OS acts as a **standalone cryptographic wallet provider** and routing enclave, strictly following a clean, feature-based architecture.

## Clean Architecture Mapping
The `lib/` directory is structured to enforce separation of concerns, directly mapped to the requirements in `[[decentralized-auth]]` and `[[ui-deck-spec]]`.

```text
mobile/lib/
├── core/                  # Core logic and shared utilities
│   ├── crypto/            # Hardware enclave bridges (Keystore/Secure Enclave)
│   ├── network/           # API and Stellar RPC clients (see [[rpc-pipeline]])
│   └── theme/             # Styling logic derived from [[ui-deck-spec]]
├── features/              # Feature-based modular structure
│   ├── wallet/            # Stacked card deck UI and balance rendering
│   ├── swap/              # Local asset swapping and pricing data
│   └── auth/              # Biometric unlocking and local key management
└── main.dart              # Application entry point
```

## Hardware Enclave Role
Unlike the web app, the Flutter mobile app holds private keys securely within the device hardware. When constructing a transaction envelope (as defined in `[[cross-platform-bridge]]`), the Flutter app signs the payload in-memory without relying on external browser extensions.
