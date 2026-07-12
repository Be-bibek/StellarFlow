# Cross-Platform Bridge Integration

## Unified Payload Standard
StellarFlow OS requires both the TypeScript/Next.js client and the Dart/Flutter mobile client to map identical payload parameters when interacting with the underlying WebAssembly (`.wasm`) smart contracts on the Stellar network.

### TypeScript / Next.js Client
- **Environment**: Web Browser.
- **Key Management**: Relies on browser wallet extensions (e.g., Freighter, Albedo).
- **Payload Construction**: Uses the `@stellar/stellar-sdk` to build transaction envelopes and XDR payloads matching the exact types defined in the Soroban contract.

### Dart / Flutter Mobile Client
- **Environment**: iOS / Android native.
- **Key Management**: Uses native hardware secure key enclaves (Secure Enclave on iOS, Titan/Keystore on Android) to manage private keys without browser extensions.
- **Payload Construction**: Uses the Flutter Stellar SDK to build the exact same XDR payloads and transaction envelopes.

## Integration Protocol
Regardless of the client, the sequence to invoke a smart contract must be uniform:

1. **Parameter Serialization**: Arguments mapped to the exact Soroban Rust primitive types (e.g., `ScVal`).
2. **Transaction Building**: Envelope creation targeting the correct Contract ID and function name.
3. **Local Signing**: 
   - Web: Forwarded to Freighter for signature.
   - Mobile: Signed directly in-memory using the secure hardware enclave.
4. **Network Submission**: Submitted to the Stellar RPC node.

This parity ensures that a transaction built on the web can be seamlessly decoded and approved on mobile, and vice versa.
