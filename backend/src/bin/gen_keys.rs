use ed25519_dalek::{SigningKey};
use rand::rngs::OsRng;
use stellar_strkey::ed25519::{PrivateKey, PublicKey};

fn main() {
    for name in ["MASTER", "PAYROLL", "OPERATIONS", "RESERVE", "MARKETING"] {
        let secret = SigningKey::generate(&mut OsRng);
        let secret_bytes = secret.to_bytes();
        let pub_bytes = secret.verifying_key().to_bytes();
        
        let priv_key = PrivateKey(secret_bytes);
        let pub_key = PublicKey(pub_bytes);
        
        println!("{}_SECRET={}", name, priv_key.to_string());
        println!("{}_PUB={}", name, pub_key.to_string());
    }
}
