const { rpc, Contract, xdr, scValToNative, nativeToScVal, TransactionBuilder, Networks, Address } = require("@stellar/stellar-sdk");

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CC62AOPT3QPI2F6FQLX4ETZ6PZIJRCMVHKKIOZRV3GETJNSDBUAPWBAL";
const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

async function main() {
    const server = new rpc.Server(RPC_URL, { allowHttp: true });

    try {
        const sourceAccount = await server.getAccount("GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F"); // Random public key just for sim
        const tx = new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: Networks.TESTNET })
            .addOperation(new Contract(CONTRACT_ID).call("get_vaults"))
            .setTimeout(30)
            .build();
        
        const sim = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
            console.log("Error getting vaults:", sim.error);
            return;
        }
        const vaults = scValToNative(sim.result.retval);
        console.log("Registered Vaults:", vaults);
        
        const key2 = xdr.ScVal.scvSymbol("NativeSac");
        const ledgerEntries2 = await server.getLedgerEntries(
            xdr.LedgerKey.contractData(
                new xdr.LedgerKeyContractData({
                    contract: new Contract(CONTRACT_ID).address().toScAddress(),
                    key: key2,
                    durability: xdr.ContractDataDurability.persistent(),
                })
            )
        );
        if (ledgerEntries2.entries && ledgerEntries2.entries.length > 0) {
            const scVal2 = ledgerEntries2.entries[0].val.contractData().val();
            console.log("NativeSac in storage:", scValToNative(scVal2));
        }

        // Query balance for each vault using Soroban Native SAC directly
        let aggregate_balance = 0n;
        const vault_balances = [];

        for (let i = 0; i < vaults.length; i++) {
            const vault = vaults[i];
            
            const balTx = new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: Networks.TESTNET })
                .addOperation(new Contract(NATIVE_SAC).call("balance", new Address(vault).toScVal()))
                .setTimeout(30)
                .build();
            const balSim = await server.simulateTransaction(balTx);
            
            if (rpc.Api.isSimulationError(balSim)) {
                console.log(`Vault ${vault} balance simulation error:`, balSim.error);
                continue;
            }
            
            const balanceStr = scValToNative(balSim.result.retval).toString();
            const balance = BigInt(balanceStr);
            console.log(`Vault ${vault} balance: ${balance} stroops`);
            
            if (balance > 0n) {
                aggregate_balance += balance;
                vault_balances.push({ vault, balance });
            }
        }
        
        console.log(`Aggregate Balance: ${aggregate_balance}`);
        const total_target = 250000000000n; // 25,000 XLM
        let distributed = 0n;
        const last_idx = vault_balances.length - 1;
        
        for (let idx = 0; idx < vault_balances.length; idx++) {
            const { vault, balance } = vault_balances[idx];
            let alloc = 0n;
            if (idx === last_idx) {
                alloc = total_target - distributed;
            } else {
                alloc = (total_target * balance) / aggregate_balance;
            }
            console.log(`Vault ${idx} (${vault}) alloc: ${alloc}`);
            distributed += alloc;
        }

    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error);
