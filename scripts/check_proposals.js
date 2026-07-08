require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { 
  rpc, Contract, xdr, scValToNative, nativeToScVal, 
  TransactionBuilder, Networks, Address, Keypair, BASE_FEE 
} = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.TREASURY_CONTRACT_ID;
const server = new rpc.Server(RPC_URL);

async function getProposal(id) {
  const sourceAccount = await server.getAccount("GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F");
  const tx = new TransactionBuilder(sourceAccount, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(CONTRACT_ID).call("get_proposal", nativeToScVal(id, { type: "u32" })))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return null;
  return scValToNative(sim.result.retval);
}

async function main() {
  console.log(`Contract: ${CONTRACT_ID}\n`);
  
  for (let id = 1; id <= 5; id++) {
    const proposal = await getProposal(id);
    if (!proposal) { console.log(`Proposal #${id}: Not found`); break; }
    console.log(`Proposal #${id}:`);
    console.log(`  Proposer:  ${proposal.proposer}`);
    console.log(`  Recipient: ${proposal.recipient}`);
    console.log(`  Amount:    ${Number(proposal.amount) / 10_000_000} XLM`);
    console.log(`  Required:  ${proposal.required} approvals`);
    console.log(`  Approvers: [${(proposal.approvers || []).join(", ")}]`);
    console.log(`  Executed:  ${proposal.executed}`);
    console.log(`  Status:    ${proposal.executed ? "✅ DONE" : (proposal.approvers?.length >= proposal.required ? "⚡ READY TO EXECUTE" : "⏳ PENDING")}`);
    console.log();
  }
}

main().catch(console.error);
