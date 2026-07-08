const { rpc, Contract, xdr, scValToNative, nativeToScVal, TransactionBuilder, Networks, Address } = require('@stellar/stellar-sdk');
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const CONTRACT_ID = 'CB53JS7DM5F4JD5FYRXEXUXBPBAIAP3ROUSUNM56KQ667NWDPLVDQRYE';

async function main() {
    const sourceAccount = await server.getAccount('GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F');
    const contract = new Contract(CONTRACT_ID);
    
    // propose_transfer(proposer, recipient, amount, approvers, required)
    const proposer = new Address('GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F').toScVal();
    const recipient = new Address('GASTVTXW43AN6XY3RHV75U6MYZLGT6ODQFFHJFSXOCUHIPZZ2FE5PRTX').toScVal();
    
    const amount = nativeToScVal(BigInt("250000000000"), { type: 'i128' });

    const required = nativeToScVal(1, { type: 'u32' });

    const tx = new TransactionBuilder(sourceAccount, { fee: '1000', networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call('propose_transfer', proposer, recipient, amount, required))
        .setTimeout(30)
        .build();
    
    // Sign and submit
    const { Keypair } = require('@stellar/stellar-sdk');
    const secret = process.env.STELLAR_SIGNER_SECRET || 'SD4UBD4AES72PZC2O6UVKLW5AWSK2XQYZNCKKY7FRLV4SOCU4ORCXRJ5';
    const kp = Keypair.fromSecret(secret);
    
    try {
        const preparedTx = await server.prepareTransaction(tx);
        preparedTx.sign(kp);
        
        console.log("Submitting tx...");
        const sendResponse = await server.sendTransaction(preparedTx);
        console.log("Tx hash:", sendResponse.hash);

        let status = 'PENDING';
        while (status === 'PENDING' || status === 'NOT_FOUND') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const getTxResponse = await server.getTransaction(sendResponse.hash);
            status = getTxResponse.status;
            console.log("Current status:", status);
        }

        console.log("Final status:", status);
    } catch (e) {
        console.error(e);
    }
}
main();
