const { rpc, Contract, scValToNative, TransactionBuilder, Networks } = require("@stellar/stellar-sdk");

async function main() {
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const contractId = "CC7RCRZ3JF3W2YNTQKYTRMVGVIZGLPIX6B2R7Q6HUOWDRK3IQKRQWLKT";
  const contract = new Contract(contractId);

  // We need a dummy account to run the simulation
  const dummyPublicKey = "GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F";
  const account = await server.getAccount(dummyPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call("get_admin"))
    .setTimeout(15)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    console.error("Simulation error:", sim.error);
    return;
  }

  const admin = scValToNative(sim.result.retval);
  console.log("ACTUAL CONTRACT ADMIN ADDRESS:", admin);
}

main().catch(console.error);
