import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils';

let isInitialized = false;

export async function openWalletModal(): Promise<{address: string, name: string}> {
  try {
    if (!isInitialized && typeof window !== "undefined") {
      StellarWalletsKit.init({
        modules: defaultModules()
      });
      isInitialized = true;
    }
    const { address } = await StellarWalletsKit.authModal();
    return { address, name: StellarWalletsKit.selectedModule?.productName || "Connected Wallet" };
  } catch (error) {
    // Usually means the user closed the modal or rejected the connection request
    console.warn("Wallet connection cancelled or failed:", error);
    return { address: "", name: "" };
  }
}
