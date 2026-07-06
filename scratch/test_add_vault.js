const { rpc, Contract, Address, TransactionBuilder, Networks } = require("@stellar/stellar-sdk");

async function main() {
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  const contractId = "CC7RCRZ3JF3W2YNTQKYTRMVGVIZGLPIX6B2R7Q6HUOWDRK3IQKRQWLKT";
  const contract = new Contract(contractId);

  const adminPublicKey = "GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F";
  const vaultAddress = "GATWXA5AROAPLEYNWFN6COAI4AK7NIQZAWA2FQMOO56IMJAQZEEWGZNA";

  const account = await server.getAccount(adminPublicKey);

  const tx = new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "add_vault_wallet",
        new Address(adminPublicKey).toScVal(),
        new Address(vaultAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  console.log("SIMULATION RESULT:", JSON.stringify(sim, null, 2));
}

main().catch(console.error);
