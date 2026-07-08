require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { Keypair, rpc, Networks, Contract, TransactionBuilder, Address } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;

const secrets = [
    { name: "MASTER_SECRET", secret: process.env.MASTER_SECRET },
    { name: "PAYROLL_SECRET", secret: process.env.PAYROLL_SECRET },
    { name: "OPERATIONS_SECRET", secret: process.env.OPERATIONS_SECRET },
    { name: "RESERVE_SECRET", secret: process.env.RESERVE_SECRET },
    { name: "MARKETING_SECRET", secret: process.env.MARKETING_SECRET },
];

async function main() {
    const server = new rpc.Server(RPC_URL, { allowHttp: true });

    for (const vault of secrets) {
        if (!vault.secret) continue;
        const keypair = Keypair.fromSecret(vault.secret);
        const pubkey = keypair.publicKey();
        try {
            const tx = new TransactionBuilder(await server.getAccount(pubkey), { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
                .addOperation(
                    new Contract("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC").call(
                        "balance",
                        new Address(pubkey).toScVal()
                    )
                )
                .setTimeout(30)
                .build();
            const sim = await server.simulateTransaction(tx);
            if (!rpc.Api.isSimulationError(sim)) {
                const balanceStroops = sim.returnValue.value().toString();
                console.log(`${vault.name} (${pubkey}): ${balanceStroops} stroops`);
            } else {
                console.log(`${vault.name} (${pubkey}): SIM ERROR`);
            }
        } catch (e) {
            console.log(`${vault.name} (${pubkey}): ERROR: ${e.message}`);
        }
    }
}
main().catch(console.error);
