use chrono::{Utc, Duration};
use sqlx::PgPool;
use sqlx::types::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::auth::crypto::encrypt_secret;
use crate::database::models::{
    ApprovalStatus, TransactionStatus, WalletType,
};

// Map of (wallet_name, public_key, wallet_type, env_var_name_for_secret)
// env_var_name is read at seed time to load the signing secret.
const WALLET_DEFS: &[(&str, &str, &str)] = &[
    ("Master Treasury",  "GATWXA5AROAPLEYNWFN6COAI4AK7NIQZAWA2FQMOO56IMJAQZEEWGZNA", "MASTER_SECRET"),
    ("Payroll Reserve",  "GBDD4REIM3C4KJIPEVGQPKG6ZKYQDL26OICXPLHKLRTJOUUCTRMCROHL", "PAYROLL_SECRET"),
    ("Operations Budget","GCD5N7VAHZPKWU3IDWJMA7AS2QWHBIYUSBVMKDB7WCRHXNBYOWPXDW3A", "OPERATIONS_SECRET"),
    ("Emergency Reserve", "GDGQQFNBNBICF2NJQDZ6ZSBZ2NBWGBSDMERSUNMWMPV3B5773VMKAKTH", "RESERVE_SECRET"),
    ("Marketing Vault",  "GB3QQEJPNHAL7ITZAN7DCOXBBM5Q7Q7SWJVFNUDYJTX7DLAAX5CITMRU", "MARKETING_SECRET"),
];

const WALLET_TYPES: &[WalletType] = &[
    WalletType::Master,
    WalletType::Payroll,
    WalletType::Operations,
    WalletType::Reserve,
    WalletType::Marketing,
];

/// Ensure the demo organization and initial seed data exist in the database.
pub async fn seed_database(pool: &PgPool, aes_key: &[u8; 32]) -> Result<(), sqlx::Error> {
    // Check if the demo org exists
    let org_exists: Option<sqlx::postgres::PgRow> = sqlx::query(
        "SELECT id FROM organizations WHERE name = 'Demo Treasury Corp' LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    if org_exists.is_some() {
        tracing::info!("Seed data already exists, skipping seed.");
        // Still try to seed wallet_secrets idempotently (might be first run
        // after C.5 migration on existing deployment).
        seed_wallet_secrets(pool, aes_key).await?;
        return Ok(());
    }

    tracing::info!("Seeding initial data for Demo Treasury Corp...");

    // 1. Create Organization
    let org_id: Uuid = sqlx::query_scalar(
        r#"
        INSERT INTO organizations (id, name, admin_address)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Treasury Corp', 'GCSANGCZM2L4RRHYNQXTH57Q4NM7NU4SIGOF2TQJQ2HSP73W4KVBYILP')
        RETURNING id
        "#
    )
    .fetch_one(pool)
    .await?;

    // 2. Create Wallets (5 wallets as per spec)
    for (i, (name, pk, _env_var)) in WALLET_DEFS.iter().enumerate() {
        let wtype = WALLET_TYPES[i].clone();
        sqlx::query(
            r#"
            INSERT INTO wallets (org_id, wallet_name, public_key, wallet_type)
            VALUES ($1, $2, $3, $4)
            "#
        )
        .bind(org_id)
        .bind(name)
        .bind(pk)
        .bind(wtype as WalletType)
        .execute(pool)
        .await?;
    }

    // 3. Create Transactions (100 demo txs)
    for i in 1..=100 {
        let amount_str = format!("{}.0000000", 1000 + i * 10);
        let amount = BigDecimal::from_str(&amount_str).unwrap_or_default();
        let status = if i < 90 { TransactionStatus::Settled } else if i < 95 { TransactionStatus::StellarLedger } else { TransactionStatus::Failed };
        let created = Utc::now() - Duration::hours(i as i64 * 3);
        
        let breakdown = serde_json::json!({
            "GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P": amount_str
        });

        sqlx::query(
            r#"
            INSERT INTO transactions (
                transfer_id, org_id, amount, asset_code, destination,
                source_breakdown, status, created_at, settled_at
            )
            VALUES ($1, $2, $3, 'native', 'GBRANDOMDESTINATION1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', $4, $5, $6, $7)
            "#
        )
        .bind(format!("TX-SEED-{i:04}"))
        .bind(org_id)
        .bind(amount)
        .bind(breakdown)
        .bind(status.clone() as TransactionStatus)
        .bind(created)
        .bind(if status == TransactionStatus::Settled { Some(created + Duration::seconds(30)) } else { None })
        .execute(pool)
        .await?;
    }

    // 4. Create Approval Requests (20 requests)
    for i in 1..=20 {
        let amount_str = format!("{}.0000000", 50000 + i * 1000);
        let amount = BigDecimal::from_str(&amount_str).unwrap_or_default();
        let status = if i <= 5 { ApprovalStatus::Pending } else if i <= 15 { ApprovalStatus::Confirmed } else { ApprovalStatus::Rejected };
        let created = Utc::now() - Duration::days(i as i64);

        sqlx::query(
            r#"
            INSERT INTO approval_requests (
                redis_key, org_id, purpose, amount, destination,
                required_signatures, current_signatures, status, expires_at, created_at
            )
            VALUES ($1, $2, $3, $4, 'GBRANDOMDESTINATION1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 3, $5, $6, $7, $8)
            "#
        )
        .bind(format!("approval:seed:{i}"))
        .bind(org_id)
        .bind(format!("Seed Bulk Payment Batch #{i}"))
        .bind(amount)
        .bind(if status == ApprovalStatus::Pending { 1 } else { 3 })
        .bind(status as ApprovalStatus)
        .bind(created + Duration::days(7))
        .bind(created)
        .execute(pool)
        .await?;
    }

    // 5. Seed wallet secrets (idempotent)
    seed_wallet_secrets(pool, aes_key).await?;

    tracing::info!("Seed data generated successfully.");
    Ok(())
}

/// Seed encrypted wallet secrets from environment variables.
///
/// Security contract:
///   - Reads plaintext secrets from env vars at call time only.
///   - Immediately encrypts with AES-256-GCM via `auth/crypto.rs`.
///   - Stores ONLY the encrypted blob in PostgreSQL.
///   - Plaintext string is dropped at the end of each iteration scope.
///   - NEVER logs the plaintext secret or any intermediate form.
///   - Idempotent: skips silently if wallet_secrets already has records.
pub async fn seed_wallet_secrets(pool: &PgPool, aes_key: &[u8; 32]) -> Result<(), sqlx::Error> {
    // Idempotency guard: if secrets already exist, do nothing.
    let existing_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM wallet_secrets"
    )
    .fetch_one(pool)
    .await?;

    if existing_count > 0 {
        tracing::info!(
            "Wallet secrets already seeded ({} records), skipping.",
            existing_count
        );
        return Ok(());
    }

    let mut seeded = 0usize;
    let mut skipped = 0usize;

    for (name, public_key, env_var) in WALLET_DEFS {
        // Read plaintext secret from environment variable.
        let secret = match std::env::var(env_var) {
            Ok(s) if !s.is_empty() && s.starts_with('S') => s,
            Ok(s) => {
                tracing::warn!("Secret for {} does not start with S: {}", name, s);
                continue;
            }
            Err(e) => {
                tracing::warn!(
                    wallet = %name,
                    env_var = %env_var,
                    error = %e,
                    "Wallet secret env var not set or invalid — skipping secret seed for this wallet."
                );
                skipped += 1;
                continue;
            }
        };

        // Encrypt immediately. Plaintext `secret` is dropped at end of this block.
        let encrypted = {
            match encrypt_secret(aes_key, &secret) {
                Ok(enc) => enc,
                Err(e) => {
                    tracing::error!(
                        wallet = %name,
                        error = %e,
                        "AES-GCM encryption failed for wallet secret — skipping."
                    );
                    skipped += 1;
                    continue;
                    // `secret` dropped here — plaintext never stored
                }
            }
            // `secret` dropped here in success path too
        };
        // `secret` is now out of scope. Only `encrypted` (ciphertext) continues.

        // Look up wallet_id by public_key.
        let wallet_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM wallets WHERE public_key = $1"
        )
        .bind(public_key)
        .fetch_optional(pool)
        .await?;

        let wallet_id = match wallet_id {
            Some(id) => id,
            None => {
                tracing::warn!(
                    wallet = %name,
                    public_key = %public_key,
                    "Wallet not found in DB — skipping secret seed."
                );
                skipped += 1;
                continue;
            }
        };

        // Insert encrypted secret — audit log records wallet_id only, never the secret.
        sqlx::query(
            r#"
            INSERT INTO wallet_secrets (wallet_id, public_key, encrypted_secret)
            VALUES ($1, $2, $3)
            ON CONFLICT (public_key) DO NOTHING
            "#
        )
        .bind(wallet_id)
        .bind(public_key)
        .bind(&encrypted)
        .execute(pool)
        .await?;

        tracing::info!(
            wallet = %name,
            wallet_id = %wallet_id,
            "Wallet secret encrypted and stored successfully."
        );
        seeded += 1;
    }

    tracing::info!(
        seeded = seeded,
        skipped = skipped,
        "Wallet secret seeding complete."
    );

    Ok(())
}
