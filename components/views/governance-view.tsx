'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionStore } from '@/lib/stores/transaction-store';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, FileText,
  ChevronRight, AlertTriangle, Activity, Eye, Send,
  RefreshCw, Filter, Download, Zap, User, ArrowRight,
  BadgeCheck, Shield, List, ExternalLink, Link2
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GovernanceRequest {
  id: string;
  org_id: string;
  transfer_id: string;
  amount: string;
  asset_code: string;
  destination: string;
  purpose?: string;
  policy_id?: string;
  required_approvals: number;
  current_approvals: number;
  status: string;
  requester_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface ApprovalAction {
  id: string;
  governance_request_id: string;
  actor_id: string;
  action: string;
  comment?: string;
  created_at: string;
}

interface HistoryItem {
  request: GovernanceRequest;
  actions: ApprovalAction[];
}

interface AuditLog {
  id: string;
  org_id: string;
  transfer_id?: string;
  actor_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface ApprovalStepRecord {
  step_number: number;
  signer_address: string;
  tx_hash: string;
  signed_at: string;
}

interface ProposalTimelineRecord {
  proposal_id: number;
  creation_hash: string | null;
  proposer_address: string | null;
  recipient_address: string | null;
  amount_stroops: number | null;
  required_approvals: number;
  executed: boolean;
  execution_hash: string | null;
  vault_breakdown: any[];
  approvals: ApprovalStepRecord[];
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

import {
  fetchAllOnChainProposals,
  contractProposeTransfer,
  contractApproveProposal,
  connectFreighterWallet,
} from '@/lib/stellar';

const STELLAR_EXPLORER = 'https://stellar.expert/explorer/testnet/tx';

// In local dev, Next.js rewrites /api/* -> http://127.0.0.1:8080/api/v1/*
// In production, Vercel routes /api/* to the deployed Render backend URL.
const API = '/api/gov';
const SOROBAN_API = '/api/soroban';

async function fetchProposalTimelines(): Promise<ProposalTimelineRecord[]> {
  try {
    const res = await fetch(`${SOROBAN_API}/proposals`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchPending(): Promise<GovernanceRequest[]> {
  try {
    const rawProposals = await fetchAllOnChainProposals();
    return rawProposals
      .filter(p => !p.executed) // ← Only show proposals that haven't been executed yet
      .map(p => ({
        id: String(p.id),
        org_id: 'org_1',
        transfer_id: `ONCHAIN-PROP-${p.id}`,
        amount: String(Number(p.amount) / 10000000), // Stroops to XLM
        asset_code: 'NATIVE',
        destination: p.recipient,
        purpose: 'Decentralized Multi-Sig Transfer',
        required_approvals: p.required,
        current_approvals: p.approvers ? p.approvers.length : 0,
        status: 'PENDING_APPROVAL',
        requester_id: p.proposer,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
  } catch (error) {
    console.error("Failed to load on-chain proposals:", error);
    return [];
  }
}

async function fetchHistory(onChainProposals: GovernanceRequest[]): Promise<HistoryItem[]> {
  try {
    const r = await fetch(`${API}/approvals/history?limit=50`);
    let dbHistory: HistoryItem[] = [];
    if (r.ok) {
      dbHistory = await r.json();
    }
    
    // Convert on-chain settled proposals into HistoryItem format
    const settledOnChain = onChainProposals
      .filter(p => p.status === 'SETTLED')
      .map(p => ({
        request: p,
        actions: [
          {
            id: `exec-${p.id}`,
            governance_request_id: p.id,
            actor_id: p.requester_id,
            action: 'EXECUTED ON-CHAIN',
            created_at: p.updated_at
          }
        ]
      }));

    return [...settledOnChain, ...dbHistory];
  } catch (e) {
    console.error("Failed to fetch history:", e);
    return onChainProposals
      .filter(p => p.status === 'SETTLED')
      .map(p => ({
        request: p,
        actions: []
      }));
  }
}

async function fetchAuditLogs(transferId?: string): Promise<AuditLog[]> {
  try {
    const url = transferId
      ? `${API}/audit/logs?transfer_id=${encodeURIComponent(transferId)}&limit=200`
      : `${API}/audit/logs?limit=200`;
    const r = await fetch(url);
    if (!r.ok) return [];
    return r.json();
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, icon: any }> = {
  PENDING_APPROVAL: { label: 'Pending',   color: 'text-amber-500',  bg: 'bg-amber-500/10',  icon: Clock },
  APPROVED:         { label: 'Approved',  color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  REJECTED:         { label: 'Rejected',  color: 'text-red-500',    bg: 'bg-red-500/10',    icon: XCircle },
  EXECUTING:        { label: 'Executing', color: 'text-blue-500',   bg: 'bg-blue-500/10',   icon: Activity },
  SETTLED:          { label: 'Settled',   color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: BadgeCheck },
  FAILED:           { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-400/10',    icon: AlertTriangle },
  AUTO_EXECUTING:   { label: 'Auto Exec', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Zap },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Activity };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AUDIT_ACTION_ICON: Record<string, string> = {
  TRANSFER_CREATED:   '📝',
  APPROVAL_REQUESTED: '🔔',
  APPROVAL_GRANTED:   '✅',
  APPROVAL_REJECTED:  '❌',
  EXECUTION_STARTED:  '⚡',
  EXECUTION_SETTLED:  '🏦',
  EXECUTION_FAILED:   '🚫',
  AUTO_EXECUTED:      '🤖',
};

// ─────────────────────────────────────────────────────────────────────────────
// Panel A — Approval Inbox
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalInbox({ onNavigateToAudit, onNavigate }: { onNavigateToAudit: (tid: string) => void; onNavigate?: (view: any) => void }) {
  const [pending, setPending] = useState<GovernanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionStates, setActionStates] = useState<Record<string, 'idle' | 'loading' | 'done'>>({});
  const [toast, setToast] = useState<string | null>(null);


  const load = useCallback(async () => {
    setLoading(true);
    setPending(await fetchPending());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (req: GovernanceRequest) => {
    setActionStates(s => ({ ...s, [`${req.id}_approve`]: 'loading' }));
    try {
      const wallet = await connectFreighterWallet();
      const admin = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY || "GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F";
      const response = await contractApproveProposal(wallet, admin, Number(req.id));
      if (!response.success) throw new Error(response.error);
      
      const currentApprovals = Number(req.current_approvals) || 0;
      const requiredApprovals = Number(req.required_approvals) || 2;
      const isLastApproval = currentApprovals + 1 >= requiredApprovals;
      
      if (isLastApproval) {
        useTransactionStore.getState().updateTransactionStatus(req.transfer_id, "SETTLED", { hash: response.hash });
      }
      
      // ── Record approval hash in DB (fire-and-forget) ──────────────────────
      if (response.hash && req.id) {
        // Log the approval step
        fetch(`${SOROBAN_API}/proposals/${req.id}/approvals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signer_address: wallet.publicKey,
            tx_hash:        response.hash,
          }),
        }).catch(err => console.warn('Failed to record approval hash:', err));

        // If this was the final approval, also mark as executed with vault breakdown
        if (isLastApproval) {
          const vaultBreakdown = (req as any).vault_breakdown || [];
          fetch(`${SOROBAN_API}/proposals/${req.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              execution_hash:  response.hash,
              vault_breakdown: vaultBreakdown,
            }),
          }).catch(err => console.warn('Failed to record execution hash:', err));
        }
      }
      
      showToast('Approved! Waiting for ledger to settle...');
      await new Promise(r => setTimeout(r, 4000));
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message;
      if (errMsg.includes("UnreachableCodeReached") || errMsg.includes("Simulation failed")) {
         errMsg = "You have already approved this proposal, or the transaction was rejected by the smart contract.";
      }
      showToast('Approval failed: ' + errMsg);
    }
    setActionStates(s => ({ ...s, [`${req.id}_approve`]: 'done' }));
    await load();
  };

  const handleReject = async (req: GovernanceRequest) => {
    // Smart contract doesn't have an explicit 'reject', usually it just expires
    showToast('Rejection is not explicitly supported on-chain yet.');
  };


  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Pending Approvals */}
      <BentoCard delay={0.1} className="flex flex-col p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Approval Inbox</h3>
              <p className="text-xs text-slate-500">{pending.length} pending request{pending.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
            <p className="text-sm text-slate-500">No pending approvals</p>
            <p className="text-xs text-slate-400">Submit a transfer above (≥1000 XLM) to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => {
              const progress = req.required_approvals > 0
                ? (req.current_approvals / req.required_approvals) * 100
                : 0;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-3 hover:border-violet-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs font-mono text-slate-400">{req.transfer_id}</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {parseFloat(req.amount).toLocaleString()} <span className="text-sm font-normal text-slate-400">{req.asset_code.toUpperCase() === 'NATIVE' ? 'XLM' : req.asset_code}</span>
                      </p>
                      {req.purpose && <p className="text-xs text-slate-500 mt-0.5">"{req.purpose}"</p>}
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{timeAgo(req.created_at)}</p>
                      <p className="mt-0.5">by {req.requester_id.split('@')[0]}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Approvals</span>
                      <span>{req.current_approvals} / {req.required_approvals}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={actionStates[`${req.id}_approve`] === 'loading'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionStates[`${req.id}_approve`] === 'loading' 
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={actionStates[`${req.id}_reject`] === 'loading'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {actionStates[`${req.id}_reject`] === 'loading'
                        ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => onNavigateToAudit(req.transfer_id)}
                      className="p-2 text-slate-400 hover:text-violet-400 transition-colors"
                      title="View audit trail"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </BentoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel B — Approval Timeline (Blockchain Transaction Links)
// ─────────────────────────────────────────────────────────────────────────────

function TxLink({ hash, label }: { hash: string; label?: string }) {
  const short = `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  return (
    <a
      href={`${STELLAR_EXPLORER}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 hover:underline transition-colors"
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
      {label || short}
    </a>
  );
}

function ApprovalTimeline() {
  const [timelines, setTimelines] = useState<ProposalTimelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProposalTimelineRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchProposalTimelines();
    setTimelines(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Proposal list */}
      <BentoCard delay={0.1} className="xl:col-span-2 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Link2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">On-Chain Proposals</h3>
            <p className="text-xs text-slate-500">{timelines.length} proposal{timelines.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <button onClick={load} className="ml-auto p-1.5 text-slate-400 hover:text-violet-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : timelines.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <FileText className="w-8 h-8 text-slate-400/40" />
            <p className="text-xs text-slate-500">No proposals tracked yet</p>
            <p className="text-xs text-slate-400">Create a transfer to start tracking</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
            {timelines.map(t => (
              <button
                key={t.proposal_id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selected?.proposal_id === t.proposal_id
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-slate-200 dark:border-white/10 hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.executed
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {t.executed ? '✅ Executed' : '⏳ Pending'}
                  </span>
                  <span className="text-xs text-slate-400">#{t.proposal_id}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5">
                  {t.amount_stroops ? (t.amount_stroops / 10000000).toLocaleString() : '—'} XLM
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                  {t.recipient_address ? `→ ${t.recipient_address.slice(0, 12)}...` : 'No recipient'}
                </p>
              </button>
            ))}
          </div>
        )}
      </BentoCard>

      {/* Timeline detail */}
      <BentoCard delay={0.2} className="xl:col-span-3 flex flex-col p-6 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-center">
            <Link2 className="w-8 h-8 text-slate-400/40" />
            <p className="text-sm text-slate-500">Select a proposal to view its blockchain timeline</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-mono text-slate-400">Proposal #{selected.proposal_id}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selected.amount_stroops ? (selected.amount_stroops / 10000000).toLocaleString() : '—'} XLM
                </p>
                {selected.recipient_address && (
                  <p className="text-xs font-mono text-slate-400 mt-0.5">→ {selected.recipient_address}</p>
                )}
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                selected.executed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {selected.executed ? '✅ Executed' : '⏳ Pending'}
              </span>
            </div>

            {/* Blockchain Timeline */}
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Blockchain Timeline</h4>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />

              {/* Step 1: Proposal Created */}
              <div className="relative">
                <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-white dark:bg-[#110E1C] border-2 border-violet-500 top-1" />
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-violet-400">📋 Proposal Created</span>
                    <span className="text-[10px] text-slate-400">{selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}</span>
                  </div>
                  {selected.creation_hash ? (
                    <TxLink hash={selected.creation_hash} label="View creation transaction →" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Hash not yet recorded</span>
                  )}
                  {selected.proposer_address && (
                    <p className="text-xs text-slate-400 mt-1.5">by {selected.proposer_address.slice(0, 12)}...{selected.proposer_address.slice(-6)}</p>
                  )}
                </div>
              </div>

              {/* Approval Steps */}
              {selected.approvals.map(step => (
                <div key={step.step_number} className="relative">
                  <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-white dark:bg-[#110E1C] border-2 border-blue-500 top-1" />
                  <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-blue-400">✅ Approval #{step.step_number}</span>
                      <span className="text-[10px] text-slate-400">{new Date(step.signed_at).toLocaleString()}</span>
                    </div>
                    <TxLink hash={step.tx_hash} label={`View approval #${step.step_number} transaction →`} />
                    <p className="text-xs text-slate-400 mt-1.5">
                      signed by {step.signer_address.slice(0, 12)}...{step.signer_address.slice(-6)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Execution + Vault Breakdown */}
              {selected.executed && selected.execution_hash && (
                <div className="relative">
                  <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-white dark:bg-[#110E1C] border-2 border-emerald-500 top-1" />
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400">🚀 Executed & Payout Complete</span>
                    </div>
                    <TxLink hash={selected.execution_hash} label="View execution transaction →" />

                    {/* Vault Breakdown */}
                    {selected.vault_breakdown && selected.vault_breakdown.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vault Contributions</p>
                        {selected.vault_breakdown.map((v: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-xs text-slate-400">{v.vault_name || `${v.vault_address?.slice(0,8)}...`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-300">
                                {v.amount_stroops ? (v.amount_stroops / 10000000).toLocaleString(undefined, {maximumFractionDigits: 4}) : '—'} XLM
                              </span>
                              <TxLink hash={selected.execution_hash!} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pending indicator */}
              {!selected.executed && (
                <div className="relative">
                  <div className="absolute -left-[18px] w-3.5 h-3.5 rounded-full bg-white dark:bg-[#110E1C] border-2 border-amber-500/50 border-dashed top-1" />
                  <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 border-dashed">
                    <span className="text-xs text-amber-400/70">⏳ Awaiting {selected.required_approvals - selected.approvals.length} more approval(s)...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </BentoCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel C — Audit Log Viewer
// ─────────────────────────────────────────────────────────────────────────────

function AuditLogViewer({ initialTransferId }: { initialTransferId?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTid, setFilterTid] = useState(initialTransferId ?? '');
  const [filterAction, setFilterAction] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLogs(await fetchAuditLogs(filterTid || undefined));
    setLoading(false);
  }, [filterTid]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    !filterAction || l.action === filterAction
  );

  const exportCsv = () => {
    const header = 'timestamp,actor,action,transfer_id,metadata';
    const rows = filtered.map(l =>
      [l.created_at, l.actor_id, l.action, l.transfer_id ?? '', JSON.stringify(l.metadata)].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'stellarflow_audit.csv'; a.click();
  };

  const allActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <BentoCard delay={0.1} className="flex flex-col space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Audit Log</h3>
            <p className="text-xs text-slate-500">Immutable · {filtered.length} entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by transfer ID…"
            value={filterTid}
            onChange={e => setFilterTid(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">All actions</option>
          {allActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <Shield className="w-10 h-10 text-slate-400/40" />
          <p className="text-sm text-slate-500">No audit logs yet</p>
          <p className="text-xs text-slate-400">Submit a transfer to see logs appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Transfer ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filtered.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                      {AUDIT_ACTION_ICON[log.action] ?? '📋'} {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.actor_id}</td>
                  <td className="px-4 py-3 font-mono text-violet-400">{log.transfer_id ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={JSON.stringify(log.metadata)}>
                    {Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata).slice(0, 60) + '…' : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BentoCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GovernanceView
// ─────────────────────────────────────────────────────────────────────────────

type GovernanceTab = 'inbox' | 'timeline' | 'audit';

export function GovernanceView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const [activeTab, setActiveTab] = useState<GovernanceTab>('inbox');
  const [auditTransferId, setAuditTransferId] = useState<string | undefined>();

  const navigateToAudit = (tid: string) => {
    setAuditTransferId(tid);
    setActiveTab('audit');
  };

  const tabs: { id: GovernanceTab; label: string; icon: any; desc: string }[] = [
    { id: 'inbox',    label: 'Approval Inbox',    icon: ShieldCheck,  desc: 'Review & act on pending approvals' },
    { id: 'timeline', label: 'Approval Timeline',  icon: Activity,     desc: 'Lifecycle view for each request' },
    { id: 'audit',    label: 'Audit Log',          icon: FileText,     desc: 'Immutable compliance trail' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Governance Center</h1>
            <p className="text-xs text-slate-500">Treasury approval workflows · Policy engine · Audit trail</p>
          </div>
        </div>

        {/* Policy summary pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: '< 1,000 XLM', badge: 'Auto Execute', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { label: '1,000–9,999 XLM', badge: '1 Approval', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: '10,000+ XLM', badge: '2 Approvals', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${p.color}`}>
              <ArrowRight className="w-3 h-3" />
              <span className="text-slate-400">{p.label}</span>
              <span className="font-bold">{p.badge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'inbox' && <ApprovalInbox onNavigateToAudit={navigateToAudit} onNavigate={onNavigate} />}
          {activeTab === 'timeline' && <ApprovalTimeline />}
          {activeTab === 'audit' && <AuditLogViewer initialTransferId={auditTransferId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
