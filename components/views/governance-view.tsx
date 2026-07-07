'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, FileText,
  ChevronRight, AlertTriangle, Activity, Eye, Send,
  RefreshCw, Filter, Download, Zap, User, ArrowRight,
  BadgeCheck, Shield, List
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

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

import {
  fetchAllOnChainProposals,
  contractProposeTransfer,
  contractApproveProposal,
  connectFreighterWallet,
} from '@/lib/stellar';

// In local dev, Next.js rewrites /api/* -> http://127.0.0.1:8080/api/v1/*
// In production, Vercel routes /api/* to the deployed Render backend URL.
const API = '/api/gov';

async function fetchPending(): Promise<GovernanceRequest[]> {
  try {
    const rawProposals = await fetchAllOnChainProposals();
    return rawProposals.map(p => ({
      id: String(p.id),
      org_id: 'org_1',
      transfer_id: `ONCHAIN-PROP-${p.id}`,
      amount: String(Number(p.amount) / 10000000), // Stroops to XLM
      asset_code: 'NATIVE',
      destination: p.recipient,
      purpose: 'Decentralized Multi-Sig Transfer',
      required_approvals: p.required,
      current_approvals: p.approvers ? p.approvers.length : 0,
      status: p.executed ? 'SETTLED' : 'PENDING_APPROVAL',
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

async function fetchHistory(): Promise<HistoryItem[]> {
  const r = await fetch(`${API}/approvals/history?limit=50`);
  if (!r.ok) return [];
  return r.json();
}

async function fetchAuditLogs(transferId?: string): Promise<AuditLog[]> {
  const url = transferId
    ? `${API}/audit/logs?transfer_id=${encodeURIComponent(transferId)}&limit=200`
    : `${API}/audit/logs?limit=200`;
  const r = await fetch(url);
  if (!r.ok) return [];
  return r.json();
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
  const [newAmount, setNewAmount] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

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
      await contractApproveProposal(wallet, admin, Number(req.id));
      showToast('Approved! Waiting for ledger to settle...');
      await new Promise(r => setTimeout(r, 4000));
    } catch (e: any) {
      console.error(e);
      showToast('Approval failed: ' + e.message);
    }
    setActionStates(s => ({ ...s, [`${req.id}_approve`]: 'done' }));
    await load();
    if (onNavigate) {
      setTimeout(() => onNavigate('transit'), 1500);
    }
  };

  const handleReject = async (req: GovernanceRequest) => {
    // Smart contract doesn't have an explicit 'reject', usually it just expires
    showToast('Rejection is not explicitly supported on-chain yet.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const wallet = await connectFreighterWallet();
      const admin = process.env.NEXT_PUBLIC_DEPLOYER_PUBLIC_KEY || "GAICQ6KXUWZPJFWDWECQWNQTMDHHZKOEBI7PJ4FUJS6HG6K5FDFD5S6F";
      const destination = 'GATWXA5AROAPLEYNWFN6COAI4AK7NIQZAWA2FQMOO56IMJAQZEEWGZNA';
      const reqApprovals = amount < 1000 ? 0 : amount < 10000 ? 1 : 2;
      
      await contractProposeTransfer(
        admin, 
        destination, 
        BigInt(Math.floor(amount * 10000000)), // XLM to stroops as BigInt
        reqApprovals
      );
      
      setSubmitResult({
        status: reqApprovals === 0 ? 'SETTLED' : 'PENDING_APPROVAL',
        transfer_id: 'ONCHAIN-TX',
        message: 'Successfully submitted to Soroban Smart Contract',
        auto_executed: reqApprovals === 0
      });
      showToast('Transfer submitted! Waiting for ledger...');
      
      // Wait for the Stellar ledger to close (~3-5 seconds) before reloading
      await new Promise(r => setTimeout(r, 4000));
    } catch (e: any) {
      console.error(e);
      showToast('Submit failed: ' + e.message);
    }
    setSubmitting(false);
    setNewAmount('');
    setNewPurpose('');
    await load();
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

      {/* Submit Transfer for Approval */}
      <BentoCard className="flex flex-col p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <Send className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Submit Transfer for Governance</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Policy: &lt;1000 XLM = auto-execute · 1000–9999 = 1 approval · 10000+ = 2 approvals
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Amount (XLM)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              required
              placeholder="e.g. 500 or 1500 or 12000"
              className="w-48 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Purpose (optional)</label>
            <input
              type="text"
              value={newPurpose}
              onChange={e => setNewPurpose(e.target.value)}
              placeholder="e.g. Q2 Payroll"
              className="w-44 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={load}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>

        {/* Submit Result */}
        <AnimatePresence>
          {submitResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 overflow-auto max-h-32"
            >
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={submitResult.status ?? 'PENDING_APPROVAL'} />
                <span className="text-slate-400">{submitResult.transfer_id}</span>
              </div>
              <p>{submitResult.message}</p>
              {submitResult.auto_executed && (
                <p className="text-purple-400 mt-1">🤖 Auto-executed via JIT engine — no approval needed.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </BentoCard>

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
// Panel B — Approval Timeline
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalTimeline() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const STAGES = ['PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'SETTLED'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setHistory(await fetchHistory());
      setLoading(false);
    })();
  }, []);

  const stageIndex = (status: string) => {
    const s = STAGES.indexOf(status);
    return s < 0 ? (status === 'REJECTED' || status === 'FAILED' ? -1 : 0) : s;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Request list */}
      <BentoCard delay={0.1} className="xl:col-span-2 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <List className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Requests</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <FileText className="w-8 h-8 text-slate-400/40" />
            <p className="text-xs text-slate-500">No requests yet</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
            {history.map(item => (
              <button
                key={item.request.id}
                onClick={() => setSelected(item)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selected?.request.id === item.request.id
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-slate-200 dark:border-white/10 hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={item.request.status} />
                  <span className="text-xs text-slate-400">{timeAgo(item.request.created_at)}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5">
                  {parseFloat(item.request.amount).toLocaleString()} XLM
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">{item.request.transfer_id}</p>
              </button>
            ))}
          </div>
        )}
      </BentoCard>

      {/* Timeline detail */}
      <BentoCard delay={0.2} className="xl:col-span-3 flex flex-col p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-center">
            <ChevronRight className="w-8 h-8 text-slate-400/40" />
            <p className="text-sm text-slate-500">Select a request to view its timeline</p>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-mono text-slate-400">{selected.request.transfer_id}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {parseFloat(selected.request.amount).toLocaleString()} XLM
                </p>
                {selected.request.purpose && (
                  <p className="text-xs text-slate-500 mt-0.5">"{selected.request.purpose}"</p>
                )}
              </div>
              <StatusBadge status={selected.request.status} />
            </div>

            {/* Stage pipeline */}
            <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
              {(selected.request.status === 'REJECTED' || selected.request.status === 'FAILED')
                ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">{selected.request.status}</span>
                  </div>
                )
                : STAGES.map((stage, idx) => {
                  const current = stageIndex(selected.request.status);
                  const done = idx <= current;
                  const active = idx === current;
                  return (
                    <React.Fragment key={stage}>
                      <div className={`flex flex-col items-center gap-1.5 min-w-[70px] ${done ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? 'border-violet-500 bg-violet-500/20 animate-pulse' :
                          done  ? 'border-emerald-500 bg-emerald-500/20' :
                          'border-slate-300 dark:border-slate-600'
                        }`}>
                          {done && !active ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-violet-400' : 'bg-slate-400'}`} />
                          )}
                        </div>
                        <span className="text-[10px] text-center leading-tight text-slate-500 font-medium">
                          {stage.replace('_', ' ')}
                        </span>
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className={`flex-1 h-0.5 rounded-full min-w-[16px] ${idx < current ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                      )}
                    </React.Fragment>
                  );
                })
              }
            </div>

            {/* Action log */}
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Action Log</h4>
            {selected.actions.length === 0 ? (
              <p className="text-xs text-slate-400">No actions recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-3">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />
                {selected.actions.map(action => (
                  <div key={action.id} className="relative">
                    <div className="absolute -left-[18px] w-3 h-3 rounded-full bg-white dark:bg-[#110E1C] border-2 border-violet-500 top-1" />
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${action.action === 'APPROVED' ? 'text-emerald-400' : action.action === 'REJECTED' ? 'text-red-400' : 'text-slate-400'}`}>
                          {action.action === 'APPROVED' ? '✅' : action.action === 'REJECTED' ? '❌' : '💬'} {action.action}
                        </span>
                        <span className="text-[10px] text-slate-400">{timeAgo(action.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">by {action.actor_id}</p>
                      {action.comment && <p className="text-xs text-slate-400 mt-1 italic">"{action.comment}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
