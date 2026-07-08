const fs = require("fs");
require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { Keypair, rpc, TransactionBuilder, Networks, Contract, Address } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = process.env.TREASURY_CONTRACT_ID;

// Deployer key (admin) - used to call add_vault_wallet
const DEPLOYER_SECRET = fs.readFileSync(require("path").join(__dirname, ".deployer_secret"), "utf8").trim();

const secrets = [
    { name: "MASTER_SECRET", secret: process.env.MASTER_SECRET },
    { name: "PAYROLL_SECRET", secret: process.env.PAYROLL_SECRET },
    { name: "OPERATIONS_SECRET", secret: process.env.OPERATIONS_SECRET },
    { name: "RESERVE_SECRET", secret: process.env.RESERVE_SECRET },
    { name: "MARKETING_SECRET", secret: process.env.MARKETING_SECRET },
];

async function main() {
    if (!CONTRACT_ID) throw new Error("TREASURY_CONTRACT_ID is missing");
    
    console.log("════════════════════════════════════════════");
    console.log(` Registering Vaults in ${CONTRACT_ID}`);
    console.log("════════════════════════════════════════════\n");

    const server = new rpc.Server(RPC_URL, { allowHttp: true });
    const contract = new Contract(CONTRACT_ID);
    const adminKeypair = Keypair.fromSecret(DEPLOYER_SECRET);

    for (const vault of secrets) {
        if (!vault.secret) continue;

        const vaultKeypair = Keypair.fromSecret(vault.secret);
        const vaultAddress = vaultKeypair.publicKey();
        console.log(`⏳ Registering ${vault.name} (${vaultAddress})...`);
        
        try {
            const sourceAccount = await server.getAccount(adminKeypair.publicKey());
            
            const tx = new TransactionBuilder(sourceAccount, {
                fee: "1000000",
                networkPassphrase: NETWORK_PASSPHRASE,
            })
            .addOperation(
                contract.call(
                    "add_vault_wallet",
                    new Address(adminKeypair.publicKey()).toScVal(),
                    new Address(vaultAddress).toScVal()
                )
            )
            .setTimeout(30)
            .build();

            // Simulate
            const sim = await server.simulateTransaction(tx);
            if (rpc.Api.isSimulationError(sim)) {
                console.error(`❌ Simulation failed for ${vault.name}:`, sim.error);
                continue;
            }

            // Assemble and sign
            const preparedTx = rpc.assembleTransaction(tx, sim).build();
            preparedTx.sign(adminKeypair);

            // Submit
            const response = await server.sendTransaction(preparedTx);
            if (response.status === "ERROR") {
                throw new Error("Submission failed");
            }

            // Wait for confirmation
            let txStatus = await server.getTransaction(response.hash);
            while (txStatus.status === "NOT_FOUND") {
                await new Promise(r => setTimeout(r, 2000));
                txStatus = await server.getTransaction(response.hash);
            }

            if (txStatus.status === "SUCCESS") {
                console.log(`✅ Registered ${vault.name} successfully!`);
            } else {
                console.error(`❌ Transaction failed for ${vault.name}:`, txStatus.resultMetaXdr);
            }
        } catch (e) {
            console.error(`❌ Error on ${vault.name}:`, e.message);
        }
        console.log("--------------------------------------------");
    }
    console.log("🎉 All vaults registered!");
}

main().catch(console.error);
