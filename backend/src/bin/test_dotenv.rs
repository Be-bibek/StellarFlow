fn main() {
    println!("Loading dotenv...");
    match dotenvy::dotenv() {
        Ok(path) => println!("Loaded from: {:?}", path),
        Err(e) => println!("Error loading: {:?}", e),
    }
    println!("MASTER_SECRET = {:?}", std::env::var("MASTER_SECRET"));
}
