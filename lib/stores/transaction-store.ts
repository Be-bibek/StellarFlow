// =============================================================================
// StellarFlow — Transaction Zustand Store
//
// Manages all state related to transactions and the transit pipeline:
//   - transactions: paginated list of all org transactions
//   - activeTransit: the currently tracked in-flight transaction
//   - pipeline state machine: AUTHORIZING → ROUTING → STELLAR_LEDGER → SETTLED
//   - timer-based simulation: advances pipeline stages with realistic delays
//     so the TransitView animation works without a backend WebSocket
//
// This store is consumed by:
//   - TransitView   — the animated 4-stage pipeline kanban
//   - DashboardView — recent transactions feed + status badges
//   - BatchView     — batch status panel
//   - HistoryView   — paginated transaction history
// =============================================================================

import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionStatus =
  | "AUTHORIZING"
  | "ROUTING"
  | "STELLAR_LEDGER"
  | "SETTLED"
  | "PARTIAL_FAILURE"
  | "FAILED";

export interface SourceBreakdown {
  [publicKey: string]: string; // amount as decimal string
}

export interface ChildTransfer {
  publicKey: string;
  amount: number;
  status: string;
  stellarTxHash: string | null;
  ledgerSequence: number | null;
}

export interface StellarTransaction {
  id: string;
  transferId: string;
  orgId: string;
  amount: number;
  assetCode: string;
  destination: string;
  sourceBreakdown: SourceBreakdown;
  status: TransactionStatus;
  stellarTxHash?: string;
  ledgerSequence?: number;
  batchId?: string;
  recipientCount: number;
  createdAt: string;
  routingAt?: string;
  submittedAt?: string;
  settledAt?: string;
  failedAt?: string;
  failureReason?: string;
  childTransfers?: ChildTransfer[];
}

/** One stage in the transit pipeline animation */
export interface PipelineStage {
  status: TransactionStatus;
  label: string;
  icon: string;
  startedAt?: number; // timestamp ms
  completedAt?: number; // timestamp ms
  durationMs?: number;
}

/** The live transit pipeline for a single tracked transaction */
export interface TransitPipeline {
  transferId: string;
  currentStage: TransactionStatus;
  stages: PipelineStage[];
  completedAt?: number;
  routingBreakdown?: SourceBreakdown;
  stellarHash?: string;
  ledger?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline stage metadata
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: PipelineStage[] = [
  { status: "AUTHORIZING",    label: "Authorizing",    icon: "🔐" },
  { status: "ROUTING",        label: "Routing",        icon: "🔀" },
  { status: "STELLAR_LEDGER", label: "Stellar Ledger", icon: "⛓️" },
  { status: "SETTLED",        label: "Settled",        icon: "✅" },
];

/** Realistic stage durations for demo simulation (milliseconds) */
const STAGE_DURATIONS: Record<TransactionStatus, number> = {
  AUTHORIZING:    1200,
  ROUTING:        1800,
  STELLAR_LEDGER: 2500,
  SETTLED:        0,
  FAILED:         0,
  PARTIAL_FAILURE: 0,
};

const STAGE_ORDER: TransactionStatus[] = [
  "AUTHORIZING",
  "ROUTING",
  "STELLAR_LEDGER",
  "SETTLED",
];

// ─────────────────────────────────────────────────────────────────────────────
// Demo transaction data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_TRANSACTIONS: StellarTransaction[] = [
  {
    id: "t-1",
    transferId: "sf_abc123_EMP001_GAHK7E",
    orgId: "org-1",
    amount: 12500,
    assetCode: "native",
    destination: "GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P",
    sourceBreakdown: { "GAHK7EEU...": "12500.0000000" },
    status: "SETTLED",
    stellarTxHash: "a".repeat(64),
    ledgerSequence: 50001234,
    recipientCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    settledAt:  new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "t-2",
    transferId: "sf_def456_EMP002_GBCP9J",
    orgId: "org-1",
    amount: 8750,
    assetCode: "native",
    destination: "GBCP9J1KSIMULATED1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1",
    sourceBreakdown: {
      "GAHK7EEU...": "5250.0000000",
      "GBCP9J1K...": "3500.0000000",
    },
    status: "SETTLED",
    stellarTxHash: "b".repeat(64),
    ledgerSequence: 50001235,
    recipientCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    settledAt:  new Date(Date.now() - 1000 * 60 * 27).toISOString(),
  },
  {
    id: "t-3",
    transferId: "sf_ghi789_BATCH1_MULTWL",
    orgId: "org-1",
    amount: 50000,
    assetCode: "native",
    destination: "Multiple",
    sourceBreakdown: {
      "GAHK7EEU...": "30000.0000000",
      "GBCP9J1K...": "20000.0000000",
    },
    status: "ROUTING",
    recipientCount: 5,
    batchId: "batch-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    routingAt:  new Date(Date.now() - 1000 * 30).toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

interface TransactionState {
  transactions: StellarTransaction[];
  isLoading: boolean;
  activePipeline: TransitPipeline | null;
  pipelineIsRunning: boolean;
  wsConnected: boolean;

  // Actions
  loadTransactions: (txs?: StellarTransaction[]) => void;
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: StellarTransaction) => Promise<void>;
  updateTransactionStatus: (
    transferId: string,
    status: TransactionStatus,
    meta?: { hash?: string; ledger?: number }
  ) => void;

  // Pipeline execution
  executeJit: (
    amount: number,
    breakdown: SourceBreakdown,
    destination?: string
  ) => Promise<string | void>;
  clearPipeline: () => void;
  setWsConnected: (connected: boolean) => void;
  connectWebSocket: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: DEMO_TRANSACTIONS,
  isLoading: false,
  activePipeline: null,
  pipelineIsRunning: false,
  wsConnected: false,

  // ── Actions ───────────────────────────────────────────────────────────────

  loadTransactions: (txs) => {
    set({ transactions: txs ?? DEMO_TRANSACTIONS });
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      
      // Load client-signed transactions from localStorage
      let clientTxs: StellarTransaction[] = [];
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("client_transactions");
          if (stored) clientTxs = JSON.parse(stored);
        } catch (err) {
          console.error("Failed to parse client transactions", err);
        }
      }

      const fetchedTxs = data.map((t: any) => ({
        id: t.id,
        transferId: t.transfer_id,
        orgId: "org-1",
        status: t.status,
        amount: t.amount,
        assetCode: t.asset_code,
        destination: t.recipient_count > 1 ? "Multiple" : (t.destination || "Unknown"),
        createdAt: t.created_at,
        sourceBreakdown: t.source_breakdown,
        stellarTxHash: t.stellar_tx_hash,
        ledgerSequence: t.ledger_sequence,
        recipientCount: t.recipient_count,
        settledAt: t.settled_at,
        failedAt: t.failed_at,
        childTransfers: t.child_transfers?.map((c: any) => ({
          publicKey: c.public_key,
          amount: c.amount,
          status: c.status,
          stellarTxHash: c.stellar_tx_hash,
          ledgerSequence: c.ledger_sequence,
        })),
      }));

      set({
        transactions: [...clientTxs, ...fetchedTxs],
        isLoading: false,
      });
    } catch (e) {
      console.warn("Backend unavailable, keeping demo transactions.", e);
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transfer_id: tx.transferId,
          amount: tx.amount,
          asset_code: tx.assetCode,
          destination: tx.destination,
          source_breakdown: tx.sourceBreakdown,
          status: tx.status,
          stellar_tx_hash: tx.stellarTxHash || null,
        }),
      });
      if (!res.ok) throw new Error("Database rejected transaction log");
    } catch (err) {
      console.warn("Failed to persist to PostgreSQL, falling back to localStorage", err);
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("client_transactions");
          const clientTxs = stored ? JSON.parse(stored) : [];
          if (!clientTxs.some((t: any) => t.transferId === tx.transferId)) {
            clientTxs.unshift(tx);
            localStorage.setItem("client_transactions", JSON.stringify(clientTxs.slice(0, 50)));
          }
        } catch (localErr) {
          console.error("Failed to save client transaction fallback", localErr);
        }
      }
    }
  },

  updateTransactionStatus: (transferId, status, meta) => {
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.transferId === transferId
          ? {
              ...tx,
              status,
              stellarTxHash: meta?.hash ?? tx.stellarTxHash,
              ledgerSequence: meta?.ledger ?? tx.ledgerSequence,
              settledAt:
                status === "SETTLED" ? new Date().toISOString() : tx.settledAt,
              failedAt:
                status === "FAILED" ? new Date().toISOString() : tx.failedAt,
            }
          : tx
      ),
      // Also update the active pipeline stage if it matches
      activePipeline:
        state.activePipeline?.transferId === transferId
          ? {
              ...state.activePipeline,
              currentStage: status,
              stellarHash: meta?.hash ?? state.activePipeline.stellarHash,
              ledger: meta?.ledger ?? state.activePipeline.ledger,
            }
          : state.activePipeline,
    }));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Real Pipeline Execution via WebSocket
  // ─────────────────────────────────────────────────────────────────────────

  executeJit: async (amount, breakdown, destination) => {
    if (get().pipelineIsRunning) return;

    let data;
    try {
      const res = await fetch('/api/gov/approvals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, asset_code: 'native', destination: destination || undefined, purpose: 'Smart Routing Transfer' })
      });
      if (!res.ok) throw new Error('Backend offline');
      data = await res.json();
    } catch (e) {
      // Recruiter Mode — simulate governance gating locally
      const isLarge = amount > 50000;
      const mockHash = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      data = {
        transfer_id: 'sf_' + mockHash.slice(0, 8) + '_MOCK',
        status: isLarge ? 'PENDING_APPROVAL' : 'AUTO_EXECUTING'
      };
      if (!isLarge) {
        // Auto-advance pipeline stages on timers
        const tid = data.transfer_id;
        const settle = (stage: TransactionStatus, delay: number, meta?: any) =>
          setTimeout(() => get().updateTransactionStatus(tid, stage, meta), delay);
        settle('ROUTING',        1200);
        settle('STELLAR_LEDGER', 3000);
        settle('SETTLED',        5500, { hash: mockHash, ledger: 50001000 + Math.floor(Math.random() * 9000) });
      }
    }

    const transferId = data.transfer_id;
    if (data.status === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';

    const initialStages: PipelineStage[] = PIPELINE_STAGES.map((s) => ({
      ...s,
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    }));

    set({
      activePipeline: {
        transferId,
        currentStage: 'AUTHORIZING',
        stages: initialStages,
        routingBreakdown: breakdown,
      },
      pipelineIsRunning: true
    });

    get().addTransaction({
      id: transferId,
      transferId,
      orgId: 'org-1',
      amount,
      assetCode: 'native',
      destination: destination || 'Multiple',
      sourceBreakdown: breakdown,
      status: 'AUTHORIZING',
      recipientCount: Object.keys(breakdown).length,
      createdAt: new Date().toISOString(),
    });

    return 'AUTO_EXECUTING';
  },

  connectWebSocket: () => {
    if (get().wsConnected) return;
    // Skip in local dev when no explicit backend URL is set — prevents console spam
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!rawApiUrl) return;
    const wsUrl = rawApiUrl.replace(/^http/, 'ws') + '/v1/transit/00000000-0000-0000-0000-000000000001';
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => set({ wsConnected: true });
    ws.onclose = () => {
      set({ wsConnected: false });
      if (get().wsConnected) setTimeout(() => get().connectWebSocket(), 5000);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TRANSIT_STATE' || data.type === 'TRANSIT_UPDATE') {
          const transferId = data.transfer_id || data.ref_id;
          const status = data.stage || data.new_status;

          // ── CHILD_SETTLED: update childTransfers array in real time ────────
          if (data.event_type === 'CHILD_SETTLED' && transferId && data.wallet_id && data.stellar_tx_hash) {
            set((state) => ({
              transactions: state.transactions.map((tx) => {
                if (tx.transferId !== transferId) return tx;
                const existing = tx.childTransfers ?? [];
                const alreadyHas = existing.some((c) => c.stellarTxHash === data.stellar_tx_hash);
                if (alreadyHas) return tx;
                return {
                  ...tx,
                  childTransfers: [
                    ...existing,
                    {
                      publicKey: data.wallet_id,
                      amount: 0,
                      status: 'SETTLED',
                      stellarTxHash: data.stellar_tx_hash,
                      ledgerSequence: data.ledger_sequence ?? null,
                    },
                  ],
                };
              }),
            }));
          }

          if (transferId && status) {
            get().updateTransactionStatus(transferId, status, {
              hash: data.stellar_tx_hash,
              ledger: data.ledger_sequence
            });

            // Update active pipeline stage timings
            set((state) => {
              if (state.activePipeline?.transferId === transferId) {
                const now = Date.now();
                const stages = state.activePipeline!.stages.map(s => {
                  if (s.status === status) {
                    return { ...s, startedAt: now };
                  }
                  // Find previous stage and mark it complete
                  const currentIndex = STAGE_ORDER.indexOf(status as TransactionStatus);
                  const sIndex = STAGE_ORDER.indexOf(s.status);
                  if (sIndex < currentIndex && !s.completedAt) {
                    return { 
                      ...s, 
                      completedAt: now, 
                      durationMs: s.startedAt ? now - s.startedAt : 0 
                    };
                  }
                  return s;
                });
                
                return {
                  activePipeline: {
                    ...(state.activePipeline as TransitPipeline),
                    transferId: state.activePipeline!.transferId,
                    currentStage: status,
                    stages,
                    stellarHash: data.stellar_tx_hash || state.activePipeline!.stellarHash,
                    ledger: data.ledger_sequence || state.activePipeline!.ledger,
                    completedAt: status === 'SETTLED' ? now : undefined
                  },
                  pipelineIsRunning: status !== 'SETTLED' && status !== 'FAILED'
                } as Partial<TransactionState>;
              }
              return state;
            });

            // After parent settles/fails, re-fetch full transactions from DB
            // so child hashes are loaded from the authoritative source
            if (status === 'SETTLED' || status === 'FAILED' || status === 'PARTIAL_FAILURE') {
              setTimeout(() => get().fetchTransactions(), 800);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };
  },

  clearPipeline: () => {
    set({ activePipeline: null, pipelineIsRunning: false });
  },

  setWsConnected: (connected) => {
    set({ wsConnected: connected });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectRecentTransactions = (n: number) => (s: TransactionState) =>
  s.transactions.slice(0, n);

export const selectByStatus =
  (status: TransactionStatus) => (s: TransactionState) =>
    s.transactions.filter((t) => t.status === status);

export const selectSettledVolume = (s: TransactionState) =>
  s.transactions
    .filter((t) => t.status === "SETTLED")
    .reduce((sum, t) => sum + t.amount, 0);

export const selectStageIndex = (stage: TransactionStatus): number =>
  STAGE_ORDER.indexOf(stage);

export { PIPELINE_STAGES, STAGE_ORDER };
