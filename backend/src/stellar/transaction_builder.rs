use anyhow::{Context, Result};
use ed25519_dalek::{Signer, SigningKey};
use stellar_strkey::ed25519::{PrivateKey, PublicKey};
use stellar_xdr::{
    Asset, DecoratedSignature, Int64, Memo, MuxedAccount, Operation, OperationBody,
    PaymentOp, Preconditions, SequenceNumber, Signature, SignatureHint, Transaction,
    TransactionEnvelope, TransactionExt, TransactionV1Envelope, Uint256, WriteXdr,
    EnvelopeType, Limits
};
use sha2::{Digest, Sha256};
use hex;
use base64::Engine;

pub fn build_and_sign_payment(
    source_secret: &str,
    destination: &str,
    amount_stroops: i64,
    sequence: i64,
) -> Result<(String, String)> {
    let source_key = PrivateKey::from_string(source_secret).context("Invalid source secret")?;
    let dest_key = PublicKey::from_string(destination).context("Invalid destination pubkey")?;

    let signing_key = SigningKey::from_bytes(&source_key.0);
    let verifying_key = signing_key.verifying_key();
    let source_pub_bytes = verifying_key.to_bytes();

    let source_account = MuxedAccount::Ed25519(Uint256(source_pub_bytes));
    let dest_account = MuxedAccount::Ed25519(Uint256(dest_key.0));

    let payment_op = PaymentOp {
        destination: dest_account,
        asset: Asset::Native,
        amount: amount_stroops,
    };

    let operation = Operation {
        source_account: None,
        body: OperationBody::Payment(payment_op),
    };

    let tx = Transaction {
        source_account: source_account.clone(),
        fee: 10_000,
        seq_num: SequenceNumber(sequence),
        cond: Preconditions::None,
        memo: Memo::None,
        operations: vec![operation].try_into().context("Invalid ops count")?,
        ext: TransactionExt::V0,
    };

    let network_passphrase = b"Test SDF Network ; September 2015";
    let network_id = Sha256::digest(network_passphrase);

    let tx_xdr = tx.to_xdr(Limits::none()).context("Failed to serialize tx")?;

    let mut signature_payload = Vec::new();
    signature_payload.extend_from_slice(&network_id);
    signature_payload.extend_from_slice(&(EnvelopeType::Tx as u32).to_be_bytes());
    signature_payload.extend_from_slice(&tx_xdr);

    let tx_hash = Sha256::digest(&signature_payload);
    let signature = signing_key.sign(&tx_hash);

    let mut hint = [0u8; 4];
    hint.copy_from_slice(&source_pub_bytes[28..32]);

    let decorated_sig = DecoratedSignature {
        hint: SignatureHint(hint),
        signature: Signature(signature.to_bytes().to_vec().try_into().unwrap()),
    };

    let envelope = TransactionEnvelope::Tx(TransactionV1Envelope {
        tx,
        signatures: vec![decorated_sig].try_into().unwrap(),
    });

    let envelope_xdr = envelope.to_xdr(Limits::none()).context("Failed to serialize envelope")?;

    let xdr_base64 = base64::engine::general_purpose::STANDARD.encode(&envelope_xdr);
    let hash_hex = hex::encode(tx_hash);

    Ok((hash_hex, xdr_base64))
}
