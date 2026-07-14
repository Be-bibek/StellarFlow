const { Keypair } = require("@stellar/stellar-sdk");

try {
  const kp = Keypair.fromSecret("SD4UBD4AES72PZC2O6UVKLW5AWSK2XQYZNCKKY7FRLV4SOCU4ORCXRJ5");
  console.log("PUBLIC KEY FOR STELLAR_SIGNER_SECRET:", kp.publicKey());
} catch (e) {
  console.error(e);
}
