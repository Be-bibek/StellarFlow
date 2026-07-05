#!/usr/bin/env node
// Build script: compiles the Soroban contract with -reference-types disabled
// Run: node scripts/build_contract.js
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const contractsDir = path.join(__dirname, "../backend/contracts");
const outWasm = path.join(__dirname, "../backend/target/wasm32-unknown-unknown/release/stellarflow_contracts.wasm");

console.log("🔨 Building Soroban contract (Protocol 21, ref-types off)...");

// Remove old artifact to force recompile
if (fs.existsSync(outWasm)) {
  fs.unlinkSync(outWasm);
  console.log("   Removed old WASM artifact.");
}

try {
  execSync(
    "cargo build --target wasm32-unknown-unknown --release",
    {
      cwd: contractsDir,
      stdio: "inherit",
      env: {
        ...process.env,
        RUSTFLAGS: "-C target-feature=-reference-types",
      },
    }
  );
  console.log("✅ Build complete:", outWasm);
} catch (e) {
  console.error("❌ Build failed:", e.message);
  process.exit(1);
}
