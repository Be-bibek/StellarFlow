use chrono::{Utc, Duration};
use sqlx::PgPool;
use sqlx::types::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::database::models::{
    ApprovalStatus, TransactionStatus, WalletType,
};

/// Ensure the demo organization and initial seed data exist in the database.
pub async fn seed_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Check if the demo org exists
    let org_exists: Option<sqlx::postgres::PgRow> = sqlx::query(
        "SELECT id FROM organizations WHERE name = 'Demo Treasury Corp' LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    if org_exists.is_some() {
        tracing::info!("Seed data already exists, skipping seed.");
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
    let wallets = vec![
        ("Master Treasury", "GCSANGCZM2L4RRHYNQXTH57Q4NM7NU4SIGOF2TQJQ2HSP73W4KVBYILP", WalletType::Master),
        ("Payroll Reserve", "GBNY5IURZN5PEAVUKW6E4XIGVNDRKZFXOUUQEDZVIDN2XTFUWOBQCJFX", WalletType::Payroll),
        ("Operations Budget", "GAFZERMSJ6HZMWLU6ES434QY4RR76NVDK3E5LZUDSHLPCKCYXJWQDBZI", WalletType::Operations),
        ("Emergency Reserve", "GD234Y6KAO4JDEYJUTGEDXXNOCAC6EKGJY7SSXODIQCTLER4CKD7SGES", WalletType::Reserve),
        ("Marketing Vault", "GCU25EALXORTONN2B2UEIEAM4JLLU46KA3EBAX2D4RJOIWRZKZNWHMHM", WalletType::Marketing),
    ];

    for (name, pk, wtype) in wallets {
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

    tracing::info!("Seed data generated successfully.");
    Ok(())
}
