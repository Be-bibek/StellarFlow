'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, TrendingUp, Wallet, AlertTriangle, CheckCircle2, RefreshCw, X, Shield, ArrowRight, ShieldAlert, ArrowDownLeft, Clock, Search, Download, ArrowDownToLine, Zap, Activity, PlusCircle, Filter } from 'lucide-react';
import { BentoCard } from '@/components/ui/bento-card';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WalletData {
  id: string;
  name: string;
  public_key: string;
  type: string;
  balance: number;
  is_active: boolean;
  description?: string;
}

interface FundingResult {
  success: boolean;
  wallet_id: string;
  amount_funded: number;
  method: string;
  stellar_tx_hash?: string;
  message: string;
}

interface FundingHistoryItem {
  id: string;
  wallet_id: string;
  wallet_name: string;
  amount: number;
  method: string;
  reason?: string;
  actor_id: string;
  stellar_tx_hash?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWallets(): Promise<WalletData[]> {
  const r = await fetch('/api/wallets');
  if (!r.ok) return [];
  return r.json();
}

async function triggerFriendbot(walletId: string, reason?: string): Promise<FundingResult> {
  const r = await fetch('/api/funding/friendbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_id: walletId, reason }),
  });
  return r.json();
}

async function triggerManualFund(walletId: string, amount: number, reason?: string): Promise<FundingResult> {
  const r = await fetch('/api/funding/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_id: walletId, amount, reason }),
  });
  return r.json();
}

async function fetchFundingHistory(): Promise<FundingHistoryItem[]> {
  const r = await fetch('/api/funding/history?limit=50');
  if (!r.ok) return [];
  const data = await r.json();
  return data.items ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

function liquidityColor(balance: number) {
  if (balance > 5000) return 'text-emerald-400';
  if (balance > 1000) return 'text-amber-400';
  if (balance > 2)    return 'text-orange-400';
  return 'text-red-400';
}

function liquidityLabel(balance: number) {
  if (balance > 5000) return 'Healthy';
  if (balance > 1000) return 'Adequate';
  if (balance > 2)    return 'Low';
  return 'Critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Overview Cards
// ─────────────────────────────────────────────────────────────────────────────

function WalletGrid({ wallets, onFund }: { wallets: WalletData[]; onFund: (w: WalletData) => void }) {
  if (wallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Wallet className="w-10 h-10 text-slate-400/40" />
        <p className="text-sm text-slate-500">No wallets found</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {wallets.map((w, i) => (
        <motion.div
          key={w.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="relative group bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-colors"
        >
          {/* Background glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                    {w.name}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                    {w.public_key.slice(0, 8)}…{w.public_key.slice(-6)}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${liquidityColor(w.balance)} bg-current/10`}>
                {liquidityLabel(w.balance)}
              </span>
            </div>

            <div className="mb-4">
              <p className={`text-2xl font-bold tabular-nums ${liquidityColor(w.balance)}`}>
                {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-normal text-slate-400 ml-1.5">XLM</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{w.description ?? w.type}</p>
            </div>

            <button
              onClick={() => onFund(w)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl text-xs font-semibold transition-all group/btn"
            >
              <PlusCircle className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
              Fund Wallet
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund Modal
// ─────────────────────────────────────────────────────────────────────────────

type FundMethod = 'friendbot' | 'manual';

function FundModal({
  wallet,
  isTestnet,
  onClose,
  onSuccess,
}: {
  wallet: WalletData;
  isTestnet: boolean;
  onClose: () => void;
  onSuccess: (r: FundingResult) => void;
}) {
  const [method, setMethod]   = useState<FundMethod>(isTestnet ? 'friendbot' : 'manual');
  const [amount, setAmount]   = useState('1000');
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let result: FundingResult;
      if (method === 'friendbot') {
        result = await triggerFriendbot(wallet.id, reason || undefined);
      } else {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) { setError('Amount must be > 0'); setLoading(false); return; }
        result = await triggerManualFund(wallet.id, amt, reason || undefined);
      }
      if (result.success === false && (result as any).error) {
        setError((result as any).error?.message ?? 'Unknown error');
      } else {
        onSuccess(result);
      }
    } catch (e: any) {
      setError(e.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#0D0A17] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20">
            <ArrowDownToLine className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Fund Treasury</h2>
            <p className="text-xs text-slate-500 truncate max-w-[260px]">{wallet.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Method selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Funding Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'friendbot' as FundMethod, label: 'Testnet Friendbot', icon: FlaskConical, disabled: !isTestnet },
                { id: 'manual'    as FundMethod, label: 'Manual Credit',     icon: PlusCircle,   disabled: false },
              ]).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => setMethod(opt.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    method === opt.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                      : opt.disabled
                        ? 'border-slate-200 dark:border-white/5 text-slate-400 opacity-40 cursor-not-allowed'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-cyan-500/30'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
            {method === 'friendbot' && (
              <p className="text-[10px] text-amber-400 mt-1.5 flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                Sends 10,000 XLM from Stellar Testnet Friendbot. For demo purposes only.
              </p>
            )}
          </div>

          {/* Amount — only for manual */}
          {method === 'manual' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Amount (XLM)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="1000"
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Reason <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Q2 Payroll top-up"
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              {loading ? 'Funding…' : 'Fund Treasury'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Funding History Table
// ─────────────────────────────────────────────────────────────────────────────

function FundingHistoryTable({ history }: { history: FundingHistoryItem[] }) {
  const [filterMethod, setFilterMethod] = useState('');

  const filtered = history.filter(h => !filterMethod || h.method === filterMethod);

  const exportCsv = () => {
    const header = 'timestamp,wallet,amount,method,reason,actor,tx_hash';
    const rows = filtered.map(h =>
      [h.created_at, h.wallet_name, h.amount, h.method, h.reason ?? '', h.actor_id, h.stellar_tx_hash ?? ''].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'treasury_funding_history.csv'; a.click();
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <Clock className="w-10 h-10 text-slate-400/40" />
        <p className="text-sm text-slate-500">No funding history yet</p>
        <p className="text-xs text-slate-400">Fund a wallet above to see records appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">All methods</option>
            <option value="friendbot">Friendbot</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Wallet</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Method</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {filtered.map((h, i) => (
              <motion.tr
                key={h.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-slate-400">
                  {new Date(h.created_at).toLocaleString()}
                  <span className="ml-1.5 text-slate-500">{timeAgo(h.created_at)}</span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{h.wallet_name}</td>
                <td className="px-4 py-3 font-bold text-cyan-400">
                  +{h.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} XLM
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    h.method === 'friendbot'
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-teal-400 bg-teal-500/10'
                  }`}>
                    {h.method === 'friendbot' ? <FlaskConical className="w-2.5 h-2.5" /> : <PlusCircle className="w-2.5 h-2.5" />}
                    {h.method === 'friendbot' ? 'Friendbot' : 'Manual'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{h.reason ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{h.actor_id}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main FundingView
// ─────────────────────────────────────────────────────────────────────────────

type FundingTab = 'overview' | 'history';

export function FundingView() {
  const [wallets, setWallets]     = useState<WalletData[]>([]);
  const [history, setHistory]     = useState<FundingHistoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<FundingTab>('overview');
  const [modal, setModal]         = useState<WalletData | null>(null);
  const [toast, setToast]         = useState<{ msg: string; success: boolean } | null>(null);
  const [lastResult, setLastResult] = useState<FundingResult | null>(null);

  // Testnet detection from network passphrase
  const isTestnet = true; // Always testnet for this demo

  const load = useCallback(async () => {
    setLoading(true);
    const [w, h] = await Promise.all([fetchWallets(), fetchFundingHistory()]);
    setWallets(w);
    setHistory(h);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, success: boolean) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFundSuccess = async (result: FundingResult) => {
    setModal(null);
    setLastResult(result);
    showToast(result.message, result.success);
    await load(); // Refresh balances + history
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const lowWallets   = wallets.filter(w => w.balance < 100).length;

  const tabs = [
    { id: 'overview' as FundingTab, label: 'Wallet Overview',  icon: Wallet   },
    { id: 'history'  as FundingTab, label: 'Funding History',  icon: Clock    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
              toast.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="max-w-xs">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <FundModal
            wallet={modal}
            isTestnet={isTestnet}
            onClose={() => setModal(null)}
            onSuccess={handleFundSuccess}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20">
              <ArrowDownToLine className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Funding Center</h1>
                {isTestnet && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <FlaskConical className="w-2.5 h-2.5" />
                    TESTNET MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Treasury inflow management · Friendbot · Manual credits</p>
            </div>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Treasury Equity',
            value: `${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} XLM`,
            icon: TrendingUp,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
          },
          {
            label: 'Active Wallets',
            value: wallets.filter(w => w.is_active).length.toString(),
            icon: Wallet,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
          },
          {
            label: 'Low Balance Wallets',
            value: lowWallets.toString(),
            icon: AlertTriangle,
            color: lowWallets > 0 ? 'text-amber-400' : 'text-emerald-400',
            bg: lowWallets > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
          },
        ].map((kpi, i) => (
          <BentoCard
            key={kpi.label}
            delay={i * 0.08}
            className="flex flex-col p-5"
            noPadding
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </BentoCard>
        ))}
      </div>

      {/* Last funding result banner */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-emerald-400 mb-0.5">
                ✅ +{lastResult.amount_funded.toLocaleString()} XLM funded via {lastResult.method}
              </p>
              <p className="text-slate-400">{lastResult.message}</p>
              {lastResult.stellar_tx_hash && (
                <p className="font-mono text-cyan-400 mt-1">TX: {lastResult.stellar_tx_hash}</p>
              )}
            </div>
            <button onClick={() => setLastResult(null)} className="text-slate-400 hover:text-white transition-colors text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'overview' && (
            <BentoCard delay={0.1} className="flex flex-col p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-cyan-500/10">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Treasury Wallets</h3>
                  <p className="text-xs text-slate-500">Live balances from Stellar Horizon · Click "Fund Wallet" to top up</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : (
                <WalletGrid wallets={wallets} onFund={setModal} />
              )}
            </BentoCard>
          )}

          {activeTab === 'history' && (
            <BentoCard delay={0.1} className="flex flex-col p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-indigo-500/10">
                  <Shield className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Funding History</h3>
                  <p className="text-xs text-slate-500">Immutable · Append-only · {history.length} records</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : (
                <FundingHistoryTable history={history} />
              )}
            </BentoCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
