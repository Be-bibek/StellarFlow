// =============================================================================
// StellarFlow — Treasury Zustand Store
//
// Manages all state related to multi-wallet treasury:
//   - wallets: list of all org vaults with live (or simulated) balances
//   - totalBalance: aggregate across all active wallets
//   - jitSimulation: result of the greedy fill algorithm for routing preview
//   - JIT split: mirrors the Rust jit_aggregator.rs greedy fill in TypeScript
//     so the RoutingView can animate the breakdown WITHOUT a backend round-trip
//
// This store is consumed by:
//   - RoutingView   — routing simulation + animated breakdown
//   - TreasuryView  — wallet table + balance cards
//   - DashboardView — total balance bento card
//   - BatchView     — pre-flight liquidity check
// =============================================================================

import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WalletType =
  | "MASTER"
  | "PAYROLL"
  | "OPERATIONS"
  | "RESERVE"
  | "MARKETING"
  | "ESCROW";

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  type: WalletType;
  balance: number; // XLM or asset units
  isActive: boolean;
  description?: string;
}

/** A single line in the JIT routing breakdown */
export interface JitAllocation {
  walletId: string;
  walletName: string;
  walletType: WalletType;
  publicKey: string;
  amount: number;        // Amount sourced from this vault
  percentage: number;    // Share of total (0-100)
  available: number;     // Vault balance after 5% reserve
  rawBalance: number;    // Vault raw balance before reserve
}

/** Full result of a JIT simulation */
export interface JitSimulationResult {
  target: number;
  totalCovered: number;
  vaultsUsed: number;
  allocations: JitAllocation[];
  isFullyCovered: boolean;
  shortfall: number;
  timestamp: number;
}

/** Unified treasury KPIs fetched from backend */
export interface TreasurySummary {
  total_equity: number;
  available_cash: number;
  running_liabilities: number;
  wallet_count: number;
  low_balance_wallets: number;
  daily_volume: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority ordering (mirrors Rust jit_aggregator.rs wallet_priority fn)
// ─────────────────────────────────────────────────────────────────────────────

const WALLET_PRIORITY: Record<WalletType, number> = {
  MASTER:     0,
  PAYROLL:    1,
  OPERATIONS: 2,
  RESERVE:    3,
  MARKETING:  4,
  ESCROW:     5,
};

const RESERVE_BUFFER = 0.05; // 5% — must match Rust RESERVE_BUFFER_FRACTION

// ─────────────────────────────────────────────────────────────────────────────
// Mock demo wallets (used when no backend is connected)
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_WALLETS: Wallet[] = [
  {
    id: "w-1",
    name: "Master Treasury",
    publicKey: "GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P",
    type: "MASTER",
    balance: 125000,
    isActive: true,
    description: "Primary operational treasury vault",
  },
  {
    id: "w-2",
    name: "Payroll Reserve",
    publicKey: "GBCP9J1KSIMULATED1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1",
    type: "PAYROLL",
    balance: 50000,
    isActive: true,
    description: "Dedicated monthly payroll reserve",
  },
  {
    id: "w-3",
    name: "Operations Budget",
    publicKey: "GCEZ6JYMQKYDYPYL12345ABCDEFGHIJKLMNOPQRSTUVWXYZABC123",
    type: "OPERATIONS",
    balance: 30000,
    isActive: true,
    description: "Day-to-day operational expenses",
  },
  {
    id: "w-4",
    name: "Emergency Reserve",
    publicKey: "GDKXYEM6SIMULATED12345ABCDEFGHIJKLMNOPQRSTUVWXYZ456789",
    type: "RESERVE",
    balance: 20000,
    isActive: true,
    description: "Emergency liquidity buffer",
  },
  {
    id: "w-5",
    name: "Marketing Vault",
    publicKey: "GBER4SIMULATED1234567890MNOPQRSTUVWXYZABCDEFGHIJK789012",
    type: "MARKETING",
    balance: 8500,
    isActive: true,
    description: "Campaign spend and partnerships",
  },
  {
    id: "w-6",
    name: "Escrow Holding",
    publicKey: "GCZK9SIMULATED1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ345",
    type: "ESCROW",
    balance: 15000,
    isActive: false,
    description: "Locked escrow for pending contracts",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

interface TreasuryState {
  wallets: Wallet[];
  isLoading: boolean;
  lastUpdated: number | null;

  // Derived
  totalBalance: number;
  activeWallets: Wallet[];

  // Global summary KPI data
  summary: TreasurySummary | null;

  // JIT simulation
  jitSimulation: JitSimulationResult | null;
  jitIsRunning: boolean;

  // Actions
  loadWallets: (wallets?: Wallet[]) => void;
  fetchWallets: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  updateBalance: (walletId: string, newBalance: number) => void;
  simulateJitSplit: (targetAmount: number, assetCode?: string) => Promise<JitSimulationResult>;
  clearSimulation: () => void;
  setWalletActive: (walletId: string, active: boolean) => void;
}

const USE_BACKEND_JIT = true;

// ─────────────────────────────────────────────────────────────────────────────
// JIT Greedy Fill (TypeScript mirror of Rust jit_aggregator.rs)
// ─────────────────────────────────────────────────────────────────────────────

function computeJitSplit(
  wallets: Wallet[],
  targetAmount: number
): JitSimulationResult {
  // Sort active wallets by priority
  const active = wallets
    .filter((w) => w.isActive)
    .sort((a, b) => WALLET_PRIORITY[a.type] - WALLET_PRIORITY[b.type]);

  const allocations: JitAllocation[] = [];
  let remaining = targetAmount;

  for (const wallet of active) {
    if (remaining <= 0) break;

    // Apply 5% reserve buffer
    const reserve = wallet.balance * RESERVE_BUFFER;
    const available = Math.max(0, wallet.balance - reserve);

    if (available <= 0) continue;

    const take = Math.min(available, remaining);
    remaining -= take;

    allocations.push({
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: wallet.type,
      publicKey: wallet.publicKey,
      amount: take,
      percentage: 0, // calculated after loop
      available,
      rawBalance: wallet.balance,
    });
  }

  const totalCovered = targetAmount - Math.max(0, remaining);

  // Calculate percentages
  for (const alloc of allocations) {
    alloc.percentage = totalCovered > 0
      ? (alloc.amount / totalCovered) * 100
      : 0;
  }

  return {
    target: targetAmount,
    totalCovered,
    vaultsUsed: allocations.length,
    allocations,
    isFullyCovered: remaining <= 0.0001, // float epsilon
    shortfall: Math.max(0, remaining),
    timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  wallets: DEMO_WALLETS,
  isLoading: false,
  lastUpdated: Date.now(),

  get totalBalance() {
    return get().wallets
      .filter((w) => w.isActive)
      .reduce((sum, w) => sum + w.balance, 0);
  },

  get activeWallets() {
    return get().wallets.filter((w) => w.isActive);
  },

  summary: null,

  jitSimulation: null,
  jitIsRunning: false,

  // ── Actions ───────────────────────────────────────────────────────────────

  loadWallets: (wallets) => {
    const data = wallets ?? DEMO_WALLETS;
    set({
      wallets: data,
      lastUpdated: Date.now(),
    });
  },

  fetchWallets: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/wallets');
      if (!res.ok) throw new Error('Failed to fetch wallets');
      const data = await res.json();
      const mapped = data.map((w: any) => ({
        id: w.id,
        name: w.name,
        publicKey: w.public_key,
        type: w.type,
        balance: w.balance,
        isActive: w.is_active,
        description: w.description
      }));
      set({
        wallets: mapped,
        isLoading: false,
        lastUpdated: Date.now(),
      });
    } catch (e) {
      console.warn("Backend unavailable, keeping demo wallets.", e);
      set({ isLoading: false });
    }
  },

  fetchSummary: async () => {
    try {
      const res = await fetch('/api/treasury/summary');
      if (!res.ok) throw new Error('Failed to fetch treasury summary');
      const summary = await res.json();
      set({ summary });
    } catch (e) {
      console.warn("Failed to fetch treasury summary", e);
    }
  },

  updateBalance: (walletId, newBalance) => {
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, balance: newBalance } : w
      ),
      lastUpdated: Date.now(),
    }));
  },

  simulateJitSplit: async (targetAmount: number) => {
    set({ jitIsRunning: true });

    if (USE_BACKEND_JIT) {
      try {
        const res = await fetch('/api/jit/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_amount: targetAmount, asset_code: 'native' })
        });
        if (!res.ok) throw new Error('JIT backend failed');
        const result = await res.json();
        set({ jitSimulation: result, jitIsRunning: false });
        return result;
      } catch (e) {
        console.warn("Backend JIT failed, falling back to local simulation", e);
      }
    }

    // Simulate async network delay (replace with real API call in production)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = computeJitSplit(get().wallets, targetAmount);

    set({
      jitSimulation: result,
      jitIsRunning: false,
    });

    return result;
  },

  clearSimulation: () => {
    set({ jitSimulation: null });
  },

  setWalletActive: (walletId, active) => {
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === walletId ? { ...w, isActive: active } : w
      ),
    }));
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (memoised — avoids full re-renders)
// ─────────────────────────────────────────────────────────────────────────────

export const selectTotalBalance = (s: TreasuryState) =>
  s.wallets.filter((w) => w.isActive).reduce((sum, w) => sum + w.balance, 0);

export const selectActiveWallets = (s: TreasuryState) =>
  s.wallets.filter((w) => w.isActive);

export const selectWalletByType = (type: WalletType) => (s: TreasuryState) =>
  s.wallets.filter((w) => w.type === type && w.isActive);
