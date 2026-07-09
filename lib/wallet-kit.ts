import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { WalletConnectModule } from '@creit.tech/stellar-wallets-kit/modules/wallet-connect';

export const WALLET_CONNECT_PROJECT_ID = 'b7327f1c1f6b3b55ceb96fa1a1170732'; // Generic demo ID

let isInitialized = false;

export function initWalletKit() {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;
  
  try {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new WalletConnectModule({
          projectId: WALLET_CONNECT_PROJECT_ID,
          metadata: {
            name: "StellarFlow",
            description: "Treasury OS",
            url: window.location.origin,
            icons: ["https://stellarflow.app/icon.png"]
          }
        })
      ]
    });
    isInitialized = true;
  } catch (e) {
    console.warn("Wallet kit init warning:", e);
  }
}

export function openWalletModal() {
  initWalletKit();
  return StellarWalletsKit.authModal();
}

export function disconnectWallet() {
  initWalletKit();
  return StellarWalletsKit.disconnect();
}
