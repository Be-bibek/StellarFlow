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
  addTransaction: (tx: StellarTransaction) => void;
  updateTransactionStatus: (
    transferId: string,
    status: TransactionStatus,
    meta?: { hash?: string; ledger?: number }
  ) => void;

  // Pipeline execution
  executeJit: (
    amount: number,
    breakdown: SourceBreakdown
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
      set({
        transactions: data.map((t: any) => ({
          id: t.id,
          transferId: t.transfer_id,
          orgId: "org-1",
          status: t.status,
          amount: t.amount,
          assetCode: t.asset_code,
          destination: t.recipient_count > 1 ? "Multiple" : "Unknown",
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
        })),
        isLoading: false,
      });
    } catch (e) {
      console.warn("Backend unavailable, keeping demo transactions.", e);
      set({ isLoading: false });
    }
  },

  addTransaction: (tx) => {
    set((state) => ({
      transactions: [tx, ...state.transactions],
    }));
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

  executeJit: async (amount, breakdown) => {
    if (get().pipelineIsRunning) return;

    // Call Governance request API instead of JIT direct execution
    const res = await fetch('/api/gov/approvals/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount, asset_code: 'native', destination: 'Multiple', purpose: 'Smart Routing Transfer' })
    });

    if (!res.ok) {
      throw new Error("Failed to request approval");
    }

    const data = await res.json();
    const transferId = data.transfer_id;

    if (data.status === 'PENDING_APPROVAL') {
      return 'PENDING_APPROVAL';
    }

    // Initialise pipeline with all stages pending
    const initialStages: PipelineStage[] = PIPELINE_STAGES.map((s) => ({
      ...s,
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    }));

    const initialPipeline: TransitPipeline = {
      transferId,
      currentStage: "AUTHORIZING",
      stages: initialStages,
      routingBreakdown: breakdown,
    };

    set({ activePipeline: initialPipeline, pipelineIsRunning: true });

    get().addTransaction({
      id: transferId,
      transferId,
      orgId: "org-1",
      amount,
      assetCode: "native",
      destination: "Multiple",
      sourceBreakdown: breakdown,
      status: "AUTHORIZING",
      recipientCount: Object.keys(breakdown).length,
      createdAt: new Date().toISOString(),
    });

    return 'AUTO_EXECUTING';
  },

  connectWebSocket: () => {
    if (get().wsConnected) return;
    
    // In production, NEXT_PUBLIC_API_URL points directly to the deployed backend.
    // In local dev, it falls back to localhost.
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const wsUrl = rawApiUrl.replace(/^http/, 'ws') + '/v1/transit/00000000-0000-0000-0000-000000000001';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => set({ wsConnected: true });
    ws.onclose = () => {
      set({ wsConnected: false });
      setTimeout(() => get().connectWebSocket(), 3000); // Auto-reconnect
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TRANSIT_STATE' || data.type === 'TRANSIT_UPDATE') {
          const transferId = data.transfer_id || data.ref_id;
          const status = data.stage || data.new_status;
          
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
