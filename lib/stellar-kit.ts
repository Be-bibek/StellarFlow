import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from '@creit-tech/stellar-wallets-kit/modules/utils';

// Initialize the kit globally with all default wallet modules (Client-side only)
if (typeof window !== "undefined") {
  StellarWalletsKit.init({
    modules: defaultModules()
  });
}

export async function openWalletModal(): Promise<{address: string, name: string}> {
  try {
    const { address } = await StellarWalletsKit.authModal();
    return { address, name: StellarWalletsKit.selectedModule?.productName || "Connected Wallet" };
  } catch (error) {
    console.error("Failed to connect wallet via kit:", error);
    throw error;
  }
}
