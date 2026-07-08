require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { Keypair, rpc, TransactionBuilder, Networks, Contract, nativeToScVal, Address, BASE_FEE } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const CONTRACT_ID = process.env.TREASURY_CONTRACT_ID;

const secrets = [
    { name: "MASTER_SECRET", secret: process.env.MASTER_SECRET },
    { name: "PAYROLL_SECRET", secret: process.env.PAYROLL_SECRET },
    { name: "OPERATIONS_SECRET", secret: process.env.OPERATIONS_SECRET },
    { name: "RESERVE_SECRET", secret: process.env.RESERVE_SECRET },
    { name: "MARKETING_SECRET", secret: process.env.MARKETING_SECRET },
];

async function main() {
    if (!CONTRACT_ID) throw new Error("TREASURY_CONTRACT_ID is missing in backend/.env");
    
    console.log("════════════════════════════════════════════");
    console.log(` Granting XLM Allowance to ${CONTRACT_ID}`);
    console.log("════════════════════════════════════════════\n");

    const server = new rpc.Server(RPC_URL, { allowHttp: true });
    const tokenContract = new Contract(NATIVE_SAC);
    
    const latestLedger = await server.getLatestLedger();
    // Grant 1,000,000 XLM allowance (in stroops)
    const ALLOWANCE_STROOPS = "10000000000000"; 
    // Expiration ledger (current + 1,000,000 ledgers ~ 2 months)
    const EXPIRATION_LEDGER = latestLedger.sequence + 1000000;

    for (const vault of secrets) {
        if (!vault.secret) {
            console.log(`⏭️  Skipping ${vault.name} (no secret found in .env)`);
            continue;
        }

        const keypair = Keypair.fromSecret(vault.secret);
        console.log(`⏳ Processing ${vault.name} (${keypair.publicKey()})...`);
        
        try {
            const sourceAccount = await server.getAccount(keypair.publicKey());
            
            const tx = new TransactionBuilder(sourceAccount, {
                fee: "1000000",
                networkPassphrase: NETWORK_PASSPHRASE,
            })
            .addOperation(
                tokenContract.call(
                    "approve",
                    new Address(keypair.publicKey()).toScVal(),
                    new Address(CONTRACT_ID).toScVal(),
                    nativeToScVal(ALLOWANCE_STROOPS, { type: "i128" }),
                    nativeToScVal(EXPIRATION_LEDGER, { type: "u32" })
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
            preparedTx.sign(keypair);

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
                console.log(`✅ Granted 1,000,000 XLM allowance successfully!`);
            } else {
                console.error(`❌ Transaction failed for ${vault.name}:`, txStatus.resultMetaXdr);
            }
        } catch (e) {
            console.error(`❌ Error on ${vault.name}:`, e.message);
        }
        console.log("--------------------------------------------");
    }
    console.log("🎉 All done!");
}

main().catch(console.error);
