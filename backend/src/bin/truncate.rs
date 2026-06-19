use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() {
    let db_pool = PgPoolOptions::new()
        .connect("postgres://postgres:password@localhost:5432/stellarflow")
        .await
        .unwrap();

    sqlx::query("TRUNCATE organizations CASCADE;")
        .execute(&db_pool)
        .await
        .unwrap();

    println!("Truncated organizations CASCADE.");
}
