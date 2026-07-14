const StellarSdk = require('stellar-sdk');

async function testSubmit() {
  const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  
  // Emergency Reserve Secret
  const sourceSecret = 'SCE3JUQU24VSF2NNLMWBWQPSOPZMQXPLSBSCLNSZAWX5LFSLRHQ2TA7O';
  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  
  console.log("Source public key:", sourceKeypair.publicKey());
  
  // Fetch account to get exact sequence
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  console.log("Account Sequence:", sourceAccount.sequenceNumber());
  console.log("Account Balance:", sourceAccount.balances[0].balance);
  
  // Destination
  const destId = 'GCSANGCZM2L4RRHYNQXTH57Q4NM7NU4SIGOF2TQJQ2HSP73W4KVBYILP';
  
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET
  })
  .addOperation(StellarSdk.Operation.payment({
    destination: destId,
    asset: StellarSdk.Asset.native(),
    amount: '9500.0000626'
  }))
  .setTimeout(30)
  .build();
  
  tx.sign(sourceKeypair);
  
  try {
    const result = await server.submitTransaction(tx);
    console.log("Success! Hash:", result.hash);
  } catch (err) {
    console.log("FAILED!");
    if (err.response && err.response.data && err.response.data.extras) {
      console.log(JSON.stringify(err.response.data.extras.result_codes, null, 2));
    } else {
      console.log(err.message);
      console.log(err.response?.data);
    }
  }
}

testSubmit();
