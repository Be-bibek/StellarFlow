const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgres://postgres:password@localhost:5432/stellarflow' });
  await client.connect();

  console.log("=== PARENT TRANSACTION ===");
  const parent = await client.query(`SELECT transfer_id, status, amount, failure_reason FROM transactions WHERE transfer_id LIKE 'TX-C0E983FA%';`);
  console.log(parent.rows);

  console.log("\n=== CHILD TRANSFERS ===");
  const children = await client.query(`
    SELECT w.wallet_name, c.amount as allocated_amount, c.status, c.failure_reason, c.stellar_tx_hash, c.ledger_sequence
    FROM child_transfers c
    JOIN wallets w ON c.wallet_id = w.id
    WHERE c.parent_transfer_id LIKE 'TX-C0E983FA%';
  `);
  console.log(children.rows);

  console.log("\n=== WALLET DATA AT EXECUTION ===");
  const parentFull = await client.query(`SELECT source_breakdown FROM transactions WHERE transfer_id LIKE 'TX-C0E983FA%';`);
  if (parentFull.rows.length > 0) {
    console.log(JSON.stringify(parentFull.rows[0].source_breakdown, null, 2));
  }

  await client.end();
}

run().catch(console.error);
