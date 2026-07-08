require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const { rpc, Contract, nativeToScVal, scValToNative, TransactionBuilder, Networks, Address, BASE_FEE, Keypair } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);

async function sendTx(tx, signerKeypair) {
    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(signerKeypair);
    const result = await server.sendTransaction(preparedTx);
    if (result.status === "ERROR") throw new Error(`Tx Error: ${JSON.stringify(result.errorResult)}`);
    
    // Wait for inclusion
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const status = await server.getTransaction(result.hash);
        if (status.status === "SUCCESS") return status;
        if (status.status === "FAILED") throw new Error(`Tx Failed: ${status.resultMetaXdr}`);
    }
    throw new Error("Timeout waiting for tx");
}

async function main() {
    const deployer = Keypair.fromSecret(process.env.STELLAR_SIGNER_SECRET);
    const contractId = process.env.TREASURY_CONTRACT_ID;
    const recipient = "GASTVTXW43AN6XY3RHV75U6MYZLGT6ODQFFHJFSXOCUHIPZZ2FE5PRTX";
    
    console.log(`Using Contract: ${contractId}`);
    const contract = new Contract(contractId);

    // 0. Check Vaults
    console.log("Checking vaults...");
    const adminAcc = await server.getAccount(process.env.STELLAR_ADMIN_PUBLIC_KEY);
    const tx0 = new TransactionBuilder(adminAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call("get_vaults"))
        .setTimeout(30)
        .build();
    const sim0 = await server.simulateTransaction(tx0);
    console.log("Vaults:", scValToNative(sim0.result.retval));

    const nativeSac = new Contract("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
    const vault1 = scValToNative(sim0.result.retval)[0];
    const txBal = new TransactionBuilder(adminAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(nativeSac.call("balance", nativeToScVal(vault1, { type: 'address' })))
        .setTimeout(30)
        .build();
    const simBal = await server.simulateTransaction(txBal);
    console.log(`Balance of ${vault1} via SAC:`, scValToNative(simBal.result.retval));

    // 1. Propose
    const proposer = Keypair.fromSecret(process.env.OPERATIONS_SECRET);
    console.log("Proposing transfer of 5000 XLM...");
    const account = await server.getAccount(proposer.publicKey());
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call("propose_transfer",
            nativeToScVal(proposer.publicKey(), { type: 'address' }),
            nativeToScVal(recipient, { type: 'address' }),
            nativeToScVal("50000000000", { type: 'i128' }), // 5000 XLM
            nativeToScVal(2, { type: 'u32' })
        ))
        .setTimeout(30)
        .build();
        
    const res1 = await sendTx(tx, proposer);
    console.log("Proposal submitted.");

    // 2. Approve 1 (Deployer)
    const proposerAcc = await server.getAccount(proposer.publicKey());
    const txCounter = new TransactionBuilder(proposerAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call("get_proposal_counter"))
        .setTimeout(30)
        .build();
    const simCounter = await server.simulateTransaction(txCounter);
    const pid = scValToNative(simCounter.result.retval);
    console.log(`Approving Proposal ID ${pid}...`);

    // 2. Approve 1 (Deployer)
    console.log("Approving with Deployer...");
    const deployerAcc = await server.getAccount(deployer.publicKey());
    const tx2 = new TransactionBuilder(deployerAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call("approve_proposal",
            nativeToScVal(deployer.publicKey(), { type: 'address' }),
            nativeToScVal(pid, { type: 'u32' })
        ))
        .setTimeout(30)
        .build();
    await sendTx(tx2, deployer);
    console.log("Approval 1 successful.");

    // 3. Approve 2 (Master Secret)
    const master = Keypair.fromSecret(process.env.MASTER_SECRET);
    console.log("Approving with Master (should execute)...");
    const masterAcc = await server.getAccount(master.publicKey());
    const tx3 = new TransactionBuilder(masterAcc, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call("approve_proposal",
            nativeToScVal(master.publicKey(), { type: 'address' }),
            nativeToScVal(pid, { type: 'u32' })
        ))
        .setTimeout(30)
        .build();
    await sendTx(tx3, master);
    console.log("Approval 2 successful. Check balances now!");
}

main().catch(console.error);
