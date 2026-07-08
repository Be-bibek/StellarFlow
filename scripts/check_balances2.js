require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { Horizon, Contract, nativeToScVal, scValToNative, TransactionBuilder, Networks, Address, BASE_FEE, Keypair } = require("@stellar/stellar-sdk");

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const server = new Horizon.Server(HORIZON_URL);

const ACCOUNTS = [
  { name: "MASTER",     key: process.env.MASTER_SECRET },
  { name: "PAYROLL",    key: process.env.PAYROLL_SECRET },
  { name: "OPERATIONS", key: process.env.OPERATIONS_SECRET },
  { name: "RESERVE",    key: process.env.RESERVE_SECRET },
  { name: "MARKETING",  key: process.env.MARKETING_SECRET },
  { name: "RECIPIENT",  key: null, pub: "GASTVTXW43AN6XY3RHV75U6MYZLGT6ODQFFHJFSXOCUHIPZZ2FE5PRTX" },
];

async function getBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

async function main() {
  console.log("════════════════════════════════════════");
  console.log(" Live Account Balances");
  console.log("════════════════════════════════════════\n");

  for (const acc of ACCOUNTS) {
    const pub = acc.pub || (acc.key ? Keypair.fromSecret(acc.key).publicKey() : null);
    if (!pub) { console.log(`${acc.name}: no key`); continue; }
    const balance = await getBalance(pub);
    console.log(`${acc.name} (${pub.slice(0,6)}...${pub.slice(-4)}): ${balance} XLM`);
  }
}

main().catch(console.error);
