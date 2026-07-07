import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchXlmBalance } from '@/lib/stellar';

export type SavedAccount = {
  id: string; // Unique ID, can just be the public key
  name: string;
  publicKey: string;
  balanceXlm: number;
  balanceUsd: number;
};

interface AccountStoreState {
  accounts: SavedAccount[];
  activeAccountId: string | null;
  xlmPriceUsd: number;
  addAccount: (name: string, publicKey: string) => Promise<void>;
  removeAccount: (id: string) => void;
  setActiveAccount: (id: string) => void;
  refreshBalances: () => Promise<void>;
  fetchXlmPrice: () => Promise<void>;
}

export const useAccountStore = create<AccountStoreState>()(
  persist(
    (set, get) => ({
      accounts: [
        {
          id: 'GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F',
          name: 'Master Wallet',
          publicKey: 'GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F',
          balanceXlm: 0,
          balanceUsd: 0,
        }
      ],
      activeAccountId: 'GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F',
      xlmPriceUsd: 0.12, // Default mock price

      addAccount: async (name, publicKey) => {
        const { accounts, xlmPriceUsd } = get();
        if (accounts.find(a => a.publicKey === publicKey)) return; // Already exists

        // Initial fetch
        const balString = await fetchXlmBalance(publicKey);
        const balanceXlm = parseFloat(balString || '0');
        const balanceUsd = balanceXlm * xlmPriceUsd;

        const newAccount: SavedAccount = {
          id: publicKey,
          name,
          publicKey,
          balanceXlm,
          balanceUsd,
        };

        set({
          accounts: [...accounts, newAccount],
          activeAccountId: get().activeAccountId || publicKey, // Set active if it's the first one
        });
      },

      removeAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== id),
          activeAccountId: state.activeAccountId === id 
            ? (state.accounts.find(a => a.id !== id)?.id || null) 
            : state.activeAccountId
        }));
      },

      setActiveAccount: (id) => {
        set({ activeAccountId: id });
      },

      refreshBalances: async () => {
        const { accounts, xlmPriceUsd } = get();
        const updatedAccounts = await Promise.all(
          accounts.map(async (acc) => {
            const balString = await fetchXlmBalance(acc.publicKey);
            const balanceXlm = parseFloat(balString || '0');
            return {
              ...acc,
              balanceXlm,
              balanceUsd: balanceXlm * xlmPriceUsd,
            };
          })
        );
        set({ accounts: updatedAccounts });
      },

      fetchXlmPrice: async () => {
        // Mock price fetcher
        await new Promise(r => setTimeout(r, 500));
        const price = 0.125; 
        set({ xlmPriceUsd: price });
        get().refreshBalances();
      }
    }),
    {
      name: 'stellarflow-account-storage',
    }
  )
);
