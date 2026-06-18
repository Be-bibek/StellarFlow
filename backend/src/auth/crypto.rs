// =============================================================================
// StellarFlow Backend — AES-256-GCM Cryptographic Primitives
//
// RISK-5 Mitigation (from architecture blueprint):
//   AES-256-GCM is catastrophically broken under nonce reuse with the same key.
//   This module enforces the nonce-prepend pattern: every encryption call
//   generates a fresh cryptographically secure 12-byte random nonce from OsRng,
//   prepends the raw nonce bytes to the ciphertext, then Base64-encodes the
//   concatenated payload for storage.
//
// Storage format (Base64-decoded):
//   [ nonce (12 bytes) || GCM ciphertext + authentication tag ]
//
// Decryption extracts the first 12 bytes as the nonce and decrypts the rest.
// =============================================================================

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use thiserror::Error;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/// AES-256-GCM requires a 96-bit (12-byte) nonce.
pub const NONCE_SIZE: usize = 12;

/// AES-256 key size in bytes.
pub const KEY_SIZE: usize = 32;

/// Convenience type alias for the raw 256-bit key array.
pub type AesKey = [u8; KEY_SIZE];

// ─────────────────────────────────────────────────────────────────────────────
// Error type
// ─────────────────────────────────────────────────────────────────────────────

/// All failure modes that can occur during encrypt / decrypt operations.
#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("AES-GCM encryption failed")]
    EncryptionFailed,

    #[error("AES-GCM decryption failed — ciphertext is corrupt or key is wrong")]
    DecryptionFailed,

    #[error("Stored payload is not valid Base64: {0}")]
    InvalidBase64(#[from] base64::DecodeError),

    #[error(
        "Stored payload is too short to contain a nonce: expected at least {NONCE_SIZE} bytes, \
         got {0}"
    )]
    PayloadTooShort(usize),
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/// Encrypt `plaintext` under `key` using AES-256-GCM.
///
/// # Nonce strategy (Risk-5 mitigation)
/// A fresh 12-byte nonce is generated from `OsRng` on every call. The raw nonce
/// bytes are prepended to the GCM ciphertext before Base64 encoding so that
/// decryption can always extract the correct nonce without any separate storage.
///
/// # Returns
/// A Base64-encoded string in the format `base64(nonce || ciphertext_and_tag)`.
/// This value is safe to store directly in a PostgreSQL `TEXT` column.
///
/// # Example
/// ```rust
/// let key: AesKey = [0u8; 32]; // use a real key in production
/// let ciphertext = encrypt(&key, b"stellar-secret-key").unwrap();
/// let recovered  = decrypt(&key, &ciphertext).unwrap();
/// assert_eq!(recovered, b"stellar-secret-key");
/// ```
pub fn encrypt(key: &AesKey, plaintext: &[u8]) -> Result<String, CryptoError> {
    // Initialise the AES-256-GCM cipher with the provided 256-bit key.
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));

    // Generate a fresh random nonce from the OS entropy source.
    // OsRng is cryptographically secure (uses getrandom() under the hood).
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    // Encrypt. Returns ciphertext || 128-bit GCM authentication tag.
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|_| CryptoError::EncryptionFailed)?;

    // Build the storage payload: [ nonce (12 bytes) || ciphertext+tag ]
    let mut payload = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    payload.extend_from_slice(nonce.as_slice());
    payload.extend_from_slice(&ciphertext);

    // Base64-encode for PostgreSQL TEXT column storage.
    Ok(STANDARD.encode(&payload))
}

/// Decrypt a ciphertext that was produced by [`encrypt`].
///
/// # Nonce extraction
/// Splits the first 12 bytes of the decoded payload as the nonce and decrypts
/// the remainder. The GCM authentication tag is automatically verified —
/// any tampering with the ciphertext will cause an explicit `DecryptionFailed`
/// error rather than silently returning corrupt data.
///
/// # Returns
/// The original plaintext bytes, or a [`CryptoError`] if the key is wrong,
/// the payload is truncated, or the authentication tag fails.
pub fn decrypt(key: &AesKey, encoded: &str) -> Result<Vec<u8>, CryptoError> {
    // Decode Base64 back to raw bytes.
    let payload = STANDARD.decode(encoded)?;

    // Guard: payload must contain at least a full nonce.
    if payload.len() < NONCE_SIZE {
        return Err(CryptoError::PayloadTooShort(payload.len()));
    }

    // Extract nonce from the first 12 bytes.
    let nonce = Nonce::from_slice(&payload[..NONCE_SIZE]);

    // Remaining bytes are the GCM ciphertext + authentication tag.
    let ciphertext = &payload[NONCE_SIZE..];

    // Initialise cipher and decrypt. Tag verification is implicit.
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::DecryptionFailed)
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrappers for Stellar secret keys (UTF-8 strings)
// ─────────────────────────────────────────────────────────────────────────────

/// Encrypt a Stellar secret key (StrKey-encoded, starts with 'S').
///
/// Internally converts the string to bytes and calls [`encrypt`].
pub fn encrypt_secret(key: &AesKey, secret: &str) -> Result<String, CryptoError> {
    encrypt(key, secret.as_bytes())
}

/// Decrypt a Stellar secret key previously encrypted with [`encrypt_secret`].
///
/// Returns the StrKey string (e.g. "SCZANGBA...") or a [`CryptoError`].
pub fn decrypt_secret(key: &AesKey, encoded: &str) -> Result<String, CryptoError> {
    let bytes = decrypt(key, encoded)?;
    String::from_utf8(bytes).map_err(|_| CryptoError::DecryptionFailed)
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> AesKey {
        // Deterministic test key — NEVER use in production.
        let mut k = [0u8; 32];
        for (i, b) in k.iter_mut().enumerate() {
            *b = i as u8;
        }
        k
    }

    #[test]
    fn round_trip_bytes() {
        let key = test_key();
        let plain = b"channel-account-secret-SCZANGBA";
        let enc = encrypt(&key, plain).expect("encrypt failed");
        let dec = decrypt(&key, &enc).expect("decrypt failed");
        assert_eq!(dec, plain);
    }

    #[test]
    fn nonce_is_unique_per_call() {
        // Encrypting the same plaintext twice must produce different ciphertexts
        // (different nonces), preventing key-stream recovery attacks.
        let key  = test_key();
        let plain = b"test-plaintext";
        let ct1 = encrypt(&key, plain).unwrap();
        let ct2 = encrypt(&key, plain).unwrap();
        assert_ne!(ct1, ct2, "two encryptions must produce distinct ciphertexts");
    }

    #[test]
    fn wrong_key_returns_error() {
        let key1 = test_key();
        let mut key2 = test_key();
        key2[0] ^= 0xFF; // flip one bit

        let enc = encrypt(&key1, b"secret").unwrap();
        let result = decrypt(&key2, &enc);
        assert!(
            matches!(result, Err(CryptoError::DecryptionFailed)),
            "Expected DecryptionFailed for wrong key"
        );
    }

    #[test]
    fn truncated_payload_returns_error() {
        let enc    = "dG9vc2hvcnQ="; // Base64("tooshort") — 7 bytes, < NONCE_SIZE
        let result = decrypt(&test_key(), enc);
        assert!(matches!(result, Err(CryptoError::PayloadTooShort(_))));
    }

    #[test]
    fn secret_string_round_trip() {
        let key    = test_key();
        let secret = "SCZANGBA12345FAKESECRETKEYFORTESTING";
        let enc    = encrypt_secret(&key, secret).unwrap();
        let dec    = decrypt_secret(&key, &enc).unwrap();
        assert_eq!(dec, secret);
    }
}
