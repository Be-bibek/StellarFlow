import { requestAccess, signTransaction } from "@stellar/freighter-api";
import {
  Horizon,
  Networks,
  TransactionBuilder,
  Asset,
  Operation,
  Contract,
  rpc,
  nativeToScVal,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";

// ── Network Config ────────────────────────────────────────────────────────────
const HORIZON_SERVER = new Horizon.Server("https://horizon-testnet.stellar.org");
const SOROBAN_SERVER = new rpc.Server("https://soroban-testnet.stellar.org");
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Injected by deploy_soroban.js at deployment time
const CONTRACT_ID = process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ID ?? "";

// ── Error Types (satisfies L2 requirement of 3 explicit error types) ──────────
export class UserRejectedError extends Error {
  constructor() { super("User rejected the transaction in Freighter."); this.name = "UserRejectedError"; }
}
export class SimulationFailedError extends Error {
  constructor(detail: string) { super(`Simulation failed: ${detail}`); this.name = "SimulationFailedError"; }
}
export class ContractRevertError extends Error {
  constructor(code: number) { super(`Contract reverted with error code ${code}.`); this.name = "ContractRevertError"; }
}

// ── Level 1: Wallet Connection ────────────────────────────────────────────────
export async function connectFreighterWallet(): Promise<string> {
  const result = await requestAccess();
  if (result.error) throw new Error(result.error);
  return result.address;
}

export async function fetchXlmBalance(publicKey: string): Promise<string> {
  try {
    const account = await HORIZON_SERVER.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0.0000";
  } catch {
    return "0.0000";
  }
}

// ── Level 1: Direct Native Transfer ──────────────────────────────────────────
export async function sendNativeTransaction(
  senderPublicKey: string,
  destinationPublicKey: string,
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const sourceAccount = await HORIZON_SERVER.loadAccount(senderPublicKey);
    const fee = await HORIZON_SERVER.fetchBaseFee();

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: String(fee),
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: Asset.native(),
          amount,
        })
      )
      .setTimeout(30)
      .build();

    const signedResult = await signTransaction(transaction.toXDR(), { network: "TESTNET" });

    if (typeof signedResult === "object" && signedResult !== null && "error" in signedResult) {
      const errMsg = String((signedResult as any).error);
      if (errMsg.toLowerCase().includes("reject")) throw new UserRejectedError();
      throw new Error(errMsg);
    }

    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
    const txToSubmit = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const response = await HORIZON_SERVER.submitTransaction(txToSubmit as any);

    return { success: true, hash: response.hash };
  } catch (err: any) {
    if (err instanceof UserRejectedError) return { success: false, error: err.message };
    return { success: false, error: err.message ?? "Unknown error" };
  }
}

// ── Level 2: Contract Helpers ─────────────────────────────────────────────────

export function isContractDeployed(): boolean {
  return Boolean(CONTRACT_ID && CONTRACT_ID.length > 0);
}

/** Read-only: get max transfer limit in stroops from on-chain state */
export async function contractGetMaxLimit(): Promise<bigint | null> {
  if (!isContractDeployed()) return null;
  try {
    const contract = new Contract(CONTRACT_ID);
    const deployerKey = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY ?? "";
    const sourceAccount = await SOROBAN_SERVER.getAccount(deployerKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_max_limit"))
      .setTimeout(15)
      .build();

    const sim = await SOROBAN_SERVER.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return null;

    return scValToNative(sim.result?.retval!) as bigint;
  } catch {
    return null;
  }
}

/** Read-only: list registered vault addresses from on-chain state */
export async function contractGetVaults(): Promise<string[]> {
  if (!isContractDeployed()) return [];
  try {
    const contract = new Contract(CONTRACT_ID);
    const deployerKey = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY ?? "";
    const sourceAccount = await SOROBAN_SERVER.getAccount(deployerKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_vaults"))
      .setTimeout(15)
      .build();

    const sim = await SOROBAN_SERVER.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) return [];

    const vaults = scValToNative(sim.result?.retval!);
    return Array.isArray(vaults) ? vaults.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Write: Register a new vault wallet with the on-chain TreasuryRouter.
 * Error types: UserRejected | SimulationFailed | ContractRevert
 */
export async function contractAddVault(
  adminPublicKey: string,
  vaultAddress: string
): Promise<{ success: boolean; hash?: string; error?: string; errorType?: string }> {
  if (!isContractDeployed()) {
    return { success: false, error: "Contract not yet deployed. Run: npm run deploy:contract", errorType: "NotDeployed" };
  }
  try {
    const contract = new Contract(CONTRACT_ID);
    const sourceAccount = await SOROBAN_SERVER.getAccount(adminPublicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "add_vault_wallet",
          new Address(adminPublicKey).toScVal(),
          new Address(vaultAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const sim = await SOROBAN_SERVER.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      const code = parseInt(sim.error.replace(/\D/g, ""), 10);
      if (!isNaN(code) && code > 0) throw new ContractRevertError(code);
      throw new SimulationFailedError(sim.error);
    }

    const preparedTx = rpc.assembleTransaction(tx, sim).build();
    const signedResult = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });

    if (typeof signedResult === "object" && signedResult !== null && "error" in signedResult) {
      const errMsg = String((signedResult as any).error);
      if (errMsg.toLowerCase().includes("reject")) throw new UserRejectedError();
      throw new Error(errMsg);
    }

    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
    const response = await SOROBAN_SERVER.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as any
    );

    if (response.status === "ERROR") throw new Error(`Submission failed`);
    return { success: true, hash: response.hash };
  } catch (err: any) {
    if (err instanceof UserRejectedError)     return { success: false, error: err.message, errorType: "UserRejected" };
    if (err instanceof SimulationFailedError) return { success: false, error: err.message, errorType: "SimulationFailed" };
    if (err instanceof ContractRevertError)   return { success: false, error: err.message, errorType: "ContractRevert" };
    return { success: false, error: err.message, errorType: "Unknown" };
  }
}

/**
 * Write: Execute the JIT route_payout on the on-chain TreasuryRouter.
 * Atomically draws proportionally from all vaults and delivers to destination.
 */
export async function contractRoutePayout(
  adminPublicKey: string,
  totalTargetStroops: bigint,
  destinationAddress: string
): Promise<{ success: boolean; hash?: string; error?: string; errorType?: string }> {
  if (!isContractDeployed()) {
    return { success: false, error: "Contract not yet deployed. Run: npm run deploy:contract", errorType: "NotDeployed" };
  }
  try {
    const contract = new Contract(CONTRACT_ID);
    const sourceAccount = await SOROBAN_SERVER.getAccount(adminPublicKey);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "1000000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "route_payout",
          new Address(adminPublicKey).toScVal(),
          nativeToScVal(totalTargetStroops, { type: "i128" }),
          new Address(destinationAddress).toScVal()
        )
      )
      .setTimeout(30)
      .build();

    const sim = await SOROBAN_SERVER.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      const code = parseInt(sim.error.replace(/\D/g, ""), 10);
      if (!isNaN(code) && code > 0) throw new ContractRevertError(code);
      throw new SimulationFailedError(sim.error);
    }

    const preparedTx = rpc.assembleTransaction(tx, sim).build();
    const signedResult = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });

    if (typeof signedResult === "object" && signedResult !== null && "error" in signedResult) {
      const errMsg = String((signedResult as any).error);
      if (errMsg.toLowerCase().includes("reject")) throw new UserRejectedError();
      throw new Error(errMsg);
    }

    const signedXdr = typeof signedResult === "string" ? signedResult : (signedResult as any).signedTxXdr;
    const response = await SOROBAN_SERVER.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as any
    );

    if (response.status === "ERROR") throw new Error(`Submission failed`);
    return { success: true, hash: response.hash };
  } catch (err: any) {
    if (err instanceof UserRejectedError)     return { success: false, error: err.message, errorType: "UserRejected" };
    if (err instanceof SimulationFailedError) return { success: false, error: err.message, errorType: "SimulationFailed" };
    if (err instanceof ContractRevertError)   return { success: false, error: err.message, errorType: "ContractRevert" };
    return { success: false, error: err.message, errorType: "Unknown" };
  }
}
