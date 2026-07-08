const { rpc, Contract, nativeToScVal, scValToNative } = require("@stellar/stellar-sdk");

async function checkProposal() {
  const contractId = "CCKRPL3VC2V2COK63LB4K4TCINYOOU54A6DGBD4QAWAU6CQVDEPWBOOI";
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const contract = new Contract(contractId);

  console.log("Fetching Proposal #1...");
  try {
    const tx = await server.simulateTransaction({
      source: "GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F",
      fee: 100,
      networkPassphrase: "Test SDF Network ; September 2015",
      sequence: "0",
      operations: [
        contract.call("get_proposal", nativeToScVal(1, { type: "u32" }))
      ]
    });
    
    if (tx.result && tx.result.retval) {
      console.log("Proposal Data:", scValToNative(tx.result.retval));
    } else {
      console.log("Error or Not Found:", tx.error || tx);
    }
  } catch (e) {
    console.error(e);
  }
}

checkProposal();
