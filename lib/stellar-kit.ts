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
    console.error("Failed to connect wallet via kit:", error);
    throw error;
  }
}
