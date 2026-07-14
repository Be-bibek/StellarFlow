const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgres://postgres:password@localhost:5432/stellarflow' });
  await client.connect();

  const res = await client.query(`SELECT destination FROM transactions WHERE transfer_id LIKE 'TX-C0E983FA%';`);
  console.log(res.rows[0]);

  await client.end();
}

run().catch(console.error);
