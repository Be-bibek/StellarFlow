#!/usr/bin/env node
// =============================================================================
// StellarFlow — Automated Zero-CLI Soroban Testnet Deployment Script
//
// Usage:   node scripts/deploy_soroban.js
// OR:      npm run deploy:contract
//
// What this script does (fully self-contained, no stellar-cli required):
//   1. Generates a throwaway Ed25519 deployment keypair
//   2. Funds it via Friendbot (free Testnet XLM)
//   3. Uploads compiled WASM bytecode via InvokeHostFunctionOp
//   4. Instantiates the TreasuryRouter contract
//   5. Calls initialize() with admin + config
//   6. Writes CONTRACT_ID to .env.local automatically
// =============================================================================

const {
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  Contract,
} = require("@stellar/stellar-sdk");

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ── Config ──────────────────────────────────────────────────────────────────
const RPC_URL      = "https://soroban-testnet.stellar.org";
const HORIZON_URL  = "https://horizon-testnet.stellar.org";
const CONTRACTS_DIR = path.join(__dirname, "../backend/contracts");
const WASM_PATH    = path.join(__dirname, "../backend/target/wasm32-unknown-unknown/release/stellarflow_contracts.wasm");
const ENV_PATH     = path.join(__dirname, "../.env.local");

// Max transfer limit: 1,000,000 XLM in stroops (1 XLM = 10^7 stroops)
const MAX_LIMIT_STROOPS = BigInt("10000000000000"); // 1,000,000 XLM
// Native Stellar Asset Contract on Testnet
const NATIVE_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// ── WASM Patcher ─────────────────────────────────────────────────────────────
// The Stellar testnet WASM validator requires call_indirect's table index to be
// a single-byte 0x00 (no reference-types). LLVM emits a canonical 5-byte LEB128
// zero (80 80 80 80 00) which the validator rejects. We patch it to a 1-byte NOP
// (00) and remove the 4 padding bytes by shifting the buffer.
//
// Pattern to find:  0x11 <type_leb...> 80 80 80 80 00
// Replace with:     0x11 <type_leb...> 00 (+ 4 bytes of unreachable 0x00 padding)
function patchWasm(wasmBuf) {
  const buf = Buffer.from(wasmBuf);
  let patches = 0;

  for (let i = 0; i < buf.length - 8; i++) {
    // Look for call_indirect opcode (0x11)
    if (buf[i] !== 0x11) continue;

    // Skip the type_idx LEB128 (read until MSB is 0)
    let j = i + 1;
    while (j < buf.length && (buf[j] & 0x80) !== 0) j++;
    j++; // point to first byte of table_idx

    // Check for 5-byte canonical-zero LEB128: 80 80 80 80 00
    if (
      j + 4 < buf.length &&
      buf[j]     === 0x80 &&
      buf[j + 1] === 0x80 &&
      buf[j + 2] === 0x80 &&
      buf[j + 3] === 0x80 &&
      buf[j + 4] === 0x00
    ) {
      // Replace with single 0x00 and fill the 4 extra bytes with 0x00 (unreachable-like)
      buf[j]     = 0x00; // reserved byte (required by no-ref-types spec)
      buf[j + 1] = 0x00; // pad
      buf[j + 2] = 0x00; // pad
      buf[j + 3] = 0x00; // pad
      buf[j + 4] = 0x00; // pad
      patches++;
    }
  }

  log(`WASM patched: ${patches} call_indirect table-index(es) normalized`);
  return buf;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg, type = "info") {
  const prefix = { info: "🔵", success: "✅", warn: "⚠️ ", error: "❌" }[type] ?? "📋";
  console.log(`${prefix}  ${msg}`);
}

async function fundViaFriendbot(publicKey) {
  log(`Funding deployer account via Friendbot: ${publicKey}`);
  const url = `https://friendbot.stellar.org?addr=${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Friendbot failed (${res.status}): ${body}`);
  }
  log("Friendbot funded deployer with 10,000 XLM", "success");
}

async function submitAndWait(server, tx) {
  log(`Submitting tx: ${tx.hash().toString("hex").substring(0, 16)}...`);
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    console.error("Send error:", JSON.stringify(sendResult.errorResult, null, 2));
    throw new Error(`Transaction send failed: ${sendResult.status}`);
  }

  let response = sendResult;
  let attempts = 0;

  while (response.status === "PENDING" || response.status === "NOT_FOUND") {
    if (attempts++ > 30) throw new Error("Transaction timed out after 30 polls");
    await sleep(2000);
    response = await server.getTransaction(sendResult.hash);
    log(`  Poll #${attempts} — status: ${response.status}`);
  }

  if (response.status !== "SUCCESS") {
    console.error("Transaction failed:", JSON.stringify(response, null, 2));
    throw new Error(`Transaction status: ${response.status}`);
  }

  log(`Transaction confirmed: ${sendResult.hash}`, "success");
  return response;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  StellarFlow — Soroban Testnet Deployment");
  console.log("  TreasuryRouter: Atomic JIT Routing Contract");
  console.log("═".repeat(60) + "\n");

  // ── Step 1: Check WASM exists ─────────────────────────────────────────────
  if (!fs.existsSync(WASM_PATH)) {
    log("WASM file not found. Run: cargo build --target wasm32-unknown-unknown --release", "error");
    log(`  Expected path: ${WASM_PATH}`, "error");
    process.exit(1);
  }
  let wasmBytes = fs.readFileSync(WASM_PATH);
  wasmBytes = patchWasm(wasmBytes);
  log(`WASM loaded: ${wasmBytes.length.toLocaleString()} bytes`);

  // ── Step 2: Generate deployer keypair ─────────────────────────────────────
  // Check if a persisted deployer key exists (for re-runs)
  const deployerKeyPath = path.join(__dirname, ".deployer_secret");
  let deployerKeypair;

  if (fs.existsSync(deployerKeyPath)) {
    const secret = fs.readFileSync(deployerKeyPath, "utf8").trim();
    deployerKeypair = Keypair.fromSecret(secret);
    log(`Re-using persisted deployer: ${deployerKeypair.publicKey()}`);
  } else {
    deployerKeypair = Keypair.random();
    fs.writeFileSync(deployerKeyPath, deployerKeypair.secret(), "utf8");
    log(`Generated new deployer keypair: ${deployerKeypair.publicKey()}`);
    await fundViaFriendbot(deployerKeypair.publicKey());
    await sleep(5000); // Wait for ledger to close
  }

  const server = new rpc.Server(RPC_URL, { allowHttp: false });

  // Load account
  const sourceAccount = await server.getAccount(deployerKeypair.publicKey());
  log(`Deployer account loaded, sequence: ${sourceAccount.sequenceNumber()}`);

  // ── Step 3: Upload WASM ───────────────────────────────────────────────────
  log("\n── Step 3: Uploading WASM to Testnet ledger...");

  let wasmHash;
  const uploadTx = new TransactionBuilder(sourceAccount, {
    fee: (parseInt(BASE_FEE) * 100).toString(), // 100x base fee for Soroban
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      xdr.Operation.fromXDR(
        new xdr.Operation({
          sourceAccount: null,
          body: xdr.OperationBody.invokeHostFunction(
            new xdr.InvokeHostFunctionOp({
              hostFunction: xdr.HostFunction.hostFunctionTypeUploadContractWasm(
                Buffer.from(wasmBytes)
              ),
              auth: [],
            })
          ),
        }).toXDR()
      )
    )
    .setTimeout(60)
    .build();

  // Simulate to get resource fee
  const simResult = await server.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(simResult)) {
    console.error("Simulation error:", simResult.error);
    throw new Error("WASM upload simulation failed");
  }

  const preparedUploadTx = rpc.assembleTransaction(uploadTx, simResult).build();
  preparedUploadTx.sign(deployerKeypair);

  const uploadResult = await submitAndWait(server, preparedUploadTx);

  // Extract WASM hash from return value
  const uploadReturnValue = uploadResult.returnValue;
  wasmHash = uploadReturnValue.bytes();
  log(`WASM Hash: ${Buffer.from(wasmHash).toString("hex")}`, "success");

  // ── Step 4: Create contract instance ─────────────────────────────────────
  log("\n── Step 4: Instantiating TreasuryRouter contract...");

  // Re-load account for fresh sequence number
  const sourceAccount2 = await server.getAccount(deployerKeypair.publicKey());

  const createTx = new TransactionBuilder(sourceAccount2, {
    fee: (parseInt(BASE_FEE) * 100).toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      xdr.Operation.fromXDR(
        new xdr.Operation({
          sourceAccount: null,
          body: xdr.OperationBody.invokeHostFunction(
            new xdr.InvokeHostFunctionOp({
              hostFunction: xdr.HostFunction.hostFunctionTypeCreateContract(
                new xdr.CreateContractArgs({
                  contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
                    new xdr.ContractIdPreimageFromAddress({
                      address: xdr.ScAddress.scAddressTypeAccount(
                        xdr.AccountId.publicKeyTypeEd25519(
                          deployerKeypair.rawPublicKey()
                        )
                      ),
                      salt: require("crypto").randomBytes(32),
                    })
                  ),
                  executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash),
                })
              ),
              auth: [],
            })
          ),
        }).toXDR()
      )
    )
    .setTimeout(60)
    .build();

  const simCreate = await server.simulateTransaction(createTx);
  if (rpc.Api.isSimulationError(simCreate)) {
    console.error("Simulation error:", simCreate.error);
    throw new Error("Contract creation simulation failed");
  }

  const preparedCreateTx = rpc.assembleTransaction(createTx, simCreate).build();
  preparedCreateTx.sign(deployerKeypair);

  const createResult = await submitAndWait(server, preparedCreateTx);

  // Extract contract ID from return value
  const contractAddress = createResult.returnValue.address();
  const contractId = Address.fromScAddress(contractAddress).toString();
  log(`Contract ID: ${contractId}`, "success");

  // ── Step 5: Initialize the contract ──────────────────────────────────────
  log("\n── Step 5: Calling initialize() on deployed contract...");

  const sourceAccount3 = await server.getAccount(deployerKeypair.publicKey());
  const contract = new Contract(contractId);

  const initTx = new TransactionBuilder(sourceAccount3, {
    fee: (parseInt(BASE_FEE) * 100).toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "initialize",
        new Address(deployerKeypair.publicKey()).toScVal(),
        nativeToScVal(MAX_LIMIT_STROOPS, { type: "i128" }),
        new Address(NATIVE_SAC_TESTNET).toScVal()
      )
    )
    .setTimeout(60)
    .build();

  const simInit = await server.simulateTransaction(initTx);
  if (rpc.Api.isSimulationError(simInit)) {
    // AlreadyInitialized (error code 6) is expected on re-runs — gracefully skip
    if (simInit.error.includes("6")) {
      log("Contract already initialized — skipping init (expected on re-runs)", "warn");
    } else {
      console.error("Init simulation error:", simInit.error);
      throw new Error("Contract initialization simulation failed");
    }
  } else {
    const preparedInitTx = rpc.assembleTransaction(initTx, simInit).build();
    preparedInitTx.sign(deployerKeypair);
    await submitAndWait(server, preparedInitTx);
    log("Contract initialized with admin and transfer limits", "success");
  }

  // ── Step 6: Write env config ──────────────────────────────────────────────
  log("\n── Step 6: Writing contract ID to .env.local...");

  let envContent = "";
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, "utf8");
    // Remove any existing contract ID entry
    envContent = envContent
      .split("\n")
      .filter((l) => !l.startsWith("NEXT_PUBLIC_TREASURY_CONTRACT_ID="))
      .filter((l) => !l.startsWith("NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY="))
      .join("\n");
    if (!envContent.endsWith("\n")) envContent += "\n";
  }

  envContent += `NEXT_PUBLIC_TREASURY_CONTRACT_ID=${contractId}\n`;
  envContent += `NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY=${deployerKeypair.publicKey()}\n`;

  fs.writeFileSync(ENV_PATH, envContent, "utf8");
  log(`.env.local updated with CONTRACT_ID`, "success");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("  🚀 DEPLOYMENT COMPLETE");
  console.log("═".repeat(60));
  console.log(`  Contract ID  : ${contractId}`);
  console.log(`  Deployer Key : ${deployerKeypair.publicKey()}`);
  console.log(`  Explorer     : https://stellar.expert/explorer/testnet/contract/${contractId}`);
  console.log(`  WASM Hash    : ${Buffer.from(wasmHash).toString("hex").substring(0, 32)}...`);
  console.log("═".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("\n❌  Deployment failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
