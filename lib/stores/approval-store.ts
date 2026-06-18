// =============================================================================
// StellarFlow — Approval Zustand Store
//
// Manages multi-signature approval request state:
//   - approvals: list of pending/submitted approval requests
//   - addSignature: simulates the Redis WATCH + EXEC optimistic lock pattern
//   - threshold tracking: fires threshold-met event when required sigs collected
//
// This store is consumed by:
//   - MultiSigView   — the approval signing interface
//   - DashboardView  — pending approvals badge/count
// =============================================================================

import { create } from "zustand";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus =
  | "PENDING"
  | "THRESHOLD_MET"
  | "SUBMITTED"
  | "CONFIRMED"
  | "EXPIRED"
  | "REJECTED";

export interface ApprovalSignature {
  id: string;
  approvalId: string;
  signerAddress: string;
  signerName: string;
  signedAt: string;
}

export interface ApprovalRequest {
  id: string;
  redisKey: string;
  orgId: string;
  purpose: string;
  amount: number;
  assetCode: string;
  destination: string;
  requiredSignatures: number;
  currentSignatures: number;
  signatures: ApprovalSignature[];
  status: ApprovalStatus;
  submittedTxHash?: string;
  expiresAt: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo approvals
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_APPROVALS: ApprovalRequest[] = [
  {
    id: "apr-1",
    redisKey: "multisig:apr-1",
    orgId: "org-1",
    purpose: "Q3 Contractor Payroll — 15 recipients",
    amount: 37500,
    assetCode: "native",
    destination: "Multiple",
    requiredSignatures: 3,
    currentSignatures: 1,
    signatures: [
      {
        id: "sig-1",
        approvalId: "apr-1",
        signerAddress: "GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P",
        signerName: "Alice (CFO)",
        signedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
    ],
    status: "PENDING",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "apr-2",
    redisKey: "multisig:apr-2",
    orgId: "org-1",
    purpose: "Vendor Settlement — TechCorp Ltd",
    amount: 12000,
    assetCode: "native",
    destination: "GBCP9J1KSIMULATED1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1",
    requiredSignatures: 2,
    currentSignatures: 2,
    signatures: [
      {
        id: "sig-2",
        approvalId: "apr-2",
        signerAddress: "GAHK7EEU2SDBCJVMXOO2EDBPT5LMI35OAGB38ANBWUAXOBPQKJDNP8P",
        signerName: "Alice (CFO)",
        signedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: "sig-3",
        approvalId: "apr-2",
        signerAddress: "GCEZ6JYMQKYDYPYL12345ABCDEFGHIJKLMNOPQRSTUVWXYZABC123",
        signerName: "Bob (CEO)",
        signedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
    ],
    status: "THRESHOLD_MET",
    submittedTxHash: "c".repeat(64),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 47).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

interface ApprovalState {
  approvals: ApprovalRequest[];
  isLoading: boolean;
  selectedApprovalId: string | null;

  // Actions
  loadApprovals: (approvals?: ApprovalRequest[]) => void;
  selectApproval: (id: string | null) => void;
  addApproval: (approval: ApprovalRequest) => void;

  // Signing flow (mirrors Redis WATCH + EXEC optimistic locking pattern)
  addSignature: (
    approvalId: string,
    signer: { address: string; name: string }
  ) => Promise<{ thresholdMet: boolean; approval: ApprovalRequest }>;

  updateApprovalStatus: (
    approvalId: string,
    status: ApprovalStatus,
    txHash?: string
  ) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: DEMO_APPROVALS,
  isLoading: false,
  selectedApprovalId: null,

  loadApprovals: (approvals) => {
    set({ approvals: approvals ?? DEMO_APPROVALS });
  },

  selectApproval: (id) => {
    set({ selectedApprovalId: id });
  },

  addApproval: (approval) => {
    set((state) => ({
      approvals: [approval, ...state.approvals],
    }));
  },

  // ─────────────────────────────────────────────────────────────────────────
  // addSignature — Optimistic lock simulation
  //
  // Mirrors the backend Redis WATCH + EXEC pattern:
  //   1. Read current signer list.
  //   2. Guard: reject if signer already signed (prevents duplicate signatures).
  //   3. Append new signature.
  //   4. If new count >= required → mark THRESHOLD_MET.
  //   5. Return { thresholdMet, updated approval }.
  // ─────────────────────────────────────────────────────────────────────────

  addSignature: async (approvalId, signer) => {
    // Simulate network delay for realism
    await new Promise((r) => setTimeout(r, 600));

    const current = get().approvals.find((a) => a.id === approvalId);
    if (!current) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    // Duplicate guard (mirrors Redis HGET + check in backend)
    const alreadySigned = current.signatures.some(
      (s) => s.signerAddress === signer.address
    );
    if (alreadySigned) {
      throw new Error(`${signer.name} has already signed this approval`);
    }

    const newSig: ApprovalSignature = {
      id: `sig-${Date.now()}`,
      approvalId,
      signerAddress: signer.address,
      signerName: signer.name,
      signedAt: new Date().toISOString(),
    };

    const newCount = current.currentSignatures + 1;
    const thresholdMet = newCount >= current.requiredSignatures;
    const newStatus: ApprovalStatus = thresholdMet ? "THRESHOLD_MET" : "PENDING";
    const mockHash = thresholdMet ? "d".repeat(64) : undefined;

    const updated: ApprovalRequest = {
      ...current,
      currentSignatures: newCount,
      signatures: [...current.signatures, newSig],
      status: newStatus,
      submittedTxHash: mockHash,
    };

    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === approvalId ? updated : a
      ),
    }));

    return { thresholdMet, approval: updated };
  },

  updateApprovalStatus: (approvalId, status, txHash) => {
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === approvalId
          ? { ...a, status, submittedTxHash: txHash ?? a.submittedTxHash }
          : a
      ),
    }));
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectPendingApprovals = (s: ApprovalState) =>
  s.approvals.filter((a) => a.status === "PENDING");

export const selectPendingCount = (s: ApprovalState) =>
  s.approvals.filter((a) => a.status === "PENDING").length;

export const selectApprovalById =
  (id: string) => (s: ApprovalState) =>
    s.approvals.find((a) => a.id === id);
