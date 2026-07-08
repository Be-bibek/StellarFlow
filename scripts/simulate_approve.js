const { rpc, Contract, xdr, scValToNative, nativeToScVal, TransactionBuilder, Networks, Address } = require('@stellar/stellar-sdk');
const server = new rpc.Server('https://soroban-testnet.stellar.org');
const CONTRACT_ID = 'CB53JS7DM5F4JD5FYRXEXUXBPBAIAP3ROUSUNM56KQ667NWDPLVDQRYE';
const contract = new Contract(CONTRACT_ID);

async function main() {
    const sourceAccount = await server.getAccount('GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F');
    const proposer = new Address('GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F').toScVal();
    const recipient = new Address('GASTVTXW43AN6XY3RHV75U6MYZLGT6ODQFFHJFSXOCUHIPZZ2FE5PRTX').toScVal();
    const amount = nativeToScVal(BigInt("250000000000"), { type: 'i128' });
    const required = nativeToScVal(1, { type: 'u32' });
    const approver = new Address('GDCC2RXUUP5OEKAUDZBID2ZZQ3XLLEL2PTLK4QFITPFSYK7VGAOIXYDO').toScVal();
    const proposalId = nativeToScVal(1, {type: 'u32'});

    const tx = new TransactionBuilder(sourceAccount, { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(contract.call('propose_transfer', proposer, recipient, amount, required))
        .addOperation(contract.call('approve_proposal', approver, proposalId))
        .setTimeout(30)
        .build();
    
    const sim = await server.simulateTransaction(tx);
    console.log('Events length:', sim.events?.length);
    if (sim.events) {
        sim.events.forEach((e, idx) => {
            if (e.event().type().name === 'diagnostic') {
                const body = e.event().body().v0();
                const topics = body.topics();
                const topic0 = topics.length > 0 ? topics[0].value().toString() : '';
                console.log(`Event ${idx}: topic0=${topic0}`);
                if (topics.length > 1 && topics[0].sym()?.toString() === 'fn_call') {
                    console.log(`  fn_call: ${topics[2].sym()?.toString()}`);
                }
            }
        });
    }
    console.log("Error:");
    console.log(sim.error);
}

main();
