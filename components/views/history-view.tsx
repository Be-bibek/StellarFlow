'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Download, ArrowUpRight, ArrowDownRight, RefreshCw, Layers,
  Clock, CheckCircle2, AlertTriangle, Zap, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import {
  useTransactionStore,
  StellarTransaction,
  TransactionStatus,
} from '@/lib/stores/transaction-store';
import { BentoCard } from '@/components/ui/bento-card';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type FilterPill = 'All' | 'Live' | 'Settled' | 'Failed';

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TransactionStatus, {
  label: string; textClass: string; bgClass: string; borderClass: string; pulseClass: string; pulse: boolean;
}> = {
  AUTHORIZING:    { label: 'AUTHORIZING',    textClass: 'text-purple-700 dark:text-purple-300', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/30', pulseClass: 'bg-purple-500', pulse: true  },
  ROUTING:        { label: 'ROUTING',        textClass: 'text-amber-700 dark:text-amber-300', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', pulseClass: 'bg-amber-500', pulse: true  },
  STELLAR_LEDGER: { label: 'CONFIRMING',     textClass: 'text-cyan-700 dark:text-cyan-300', bgClass: 'bg-cyan-500/10',  borderClass: 'border-cyan-500/30', pulseClass: 'bg-cyan-500', pulse: true  },
  SETTLED:        { label: 'SETTLED',        textClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', pulseClass: 'bg-emerald-500', pulse: false },
  PARTIAL_FAILURE:{ label: 'PARTIAL',        textClass: 'text-orange-700 dark:text-orange-400', bgClass: 'bg-orange-500/10',  borderClass: 'border-orange-500/30', pulseClass: 'bg-orange-500', pulse: false },
  FAILED:         { label: 'FAILED',         textClass: 'text-red-700 dark:text-red-400',  bgClass: 'bg-red-500/10',  borderClass: 'border-red-500/30', pulseClass: 'bg-red-500', pulse: false },
};

// ─────────────────────────────────────────────────────────────────────────────
// Type icon
// ─────────────────────────────────────────────────────────────────────────────
function TxTypeIcon({ tx }: { tx: StellarTransaction }) {
  const isMulti = tx.recipientCount > 1;
  const isSettled = tx.status === 'SETTLED';
  const isFailed = tx.status === 'FAILED';

  const iconClass = isSettled ? 'text-emerald-600 dark:text-emerald-400' : isFailed ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400';
  const bgClass   = isSettled ? 'bg-emerald-500/10' : isFailed ? 'bg-red-500/10' : 'bg-purple-500/10';
  const borderClass = isSettled ? 'border-emerald-500/25' : isFailed ? 'border-red-500/25' : 'border-purple-500/25';

  const Icon = isMulti ? Layers : tx.destination.toLowerCase().includes('multiple') ? Layers : ArrowUpRight;
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${bgClass} ${borderClass}`}
    >
      <Icon className={`w-4 h-4 ${iconClass}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: track mouse position for spotlight
// ─────────────────────────────────────────────────────────────────────────────
// Removed useSpotlight as BentoCard provides it natively

// ─────────────────────────────────────────────────────────────────────────────
// Transaction row card — premium interactive
// ─────────────────────────────────────────────────────────────────────────────
function TxRowCard({ tx, index }: { tx: StellarTransaction; index: number }) {
  const [isPressed, setIsPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cfg = STATUS_CFG[tx.status] || {
    label: tx.status || 'UNKNOWN',
    textClass: 'text-slate-500 dark:text-slate-400',
    bgClass: 'bg-slate-500/10',
    borderClass: 'border-slate-500/30',
    pulseClass: 'bg-slate-500',
    pulse: false
  };
  const isLive = tx.status === 'AUTHORIZING' || tx.status === 'ROUTING' || tx.status === 'STELLAR_LEDGER';
  const isMulti = tx.recipientCount > 1;

  const elapsedSec = Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 1000);
  const elapsedLabel = elapsedSec < 60
    ? `${elapsedSec}s ago`
    : elapsedSec < 3600
    ? `${Math.floor(elapsedSec / 60)}m ago`
    : `${Math.floor(elapsedSec / 3600)}h ago`;

  const breakdownEntries = Object.entries(tx.sourceBreakdown || {});

  return (
    <BentoCard
      layout
      noPadding
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileTap={{ scale: 0.992, transition: { type: 'spring', stiffness: 600, damping: 30 } }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => { setIsPressed(false); setExpanded((p) => !p); }}
      className={`relative rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-150 border ${
        isPressed 
          ? 'border-purple-500/40 shadow-[0_0_0_2px_rgba(124,58,237,0.2),_0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_0_2px_rgba(124,58,237,0.2),_0_4px_20px_rgba(0,0,0,0.35)]' 
          : 'border-slate-200 dark:border-white/5 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.25)]'
      }`}
    >

      {/* Main row */}
      <div className="relative z-10 px-5 py-4">
        <div className="flex items-center gap-4">

          {/* Type icon */}
          <TxTypeIcon tx={tx} />

          {/* Transfer ID + destination */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isLive && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${cfg.pulseClass}`}
                  style={{ boxShadow: '0 0 5px currentColor' }}
                />
              )}
              <p className="text-sm font-mono truncate text-slate-800 dark:text-white/80">
                {tx.transferId.slice(0, 26)}…
              </p>
            </div>
            <p className="text-[11px] font-mono mt-0.5 truncate text-slate-500 dark:text-white/30">
              {isMulti
                ? `${tx.recipientCount} recipients · batch`
                : tx.destination.slice(0, 18) + '…'}
              {' · '}
              {elapsedLabel}
            </p>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-50">
              {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              <span className="text-[10px] ml-1 text-slate-400 dark:text-white/35">XLM</span>
            </p>
            {tx.assetCode !== 'native' && (
              <p className="text-[10px] font-mono mt-0.5 text-slate-500 dark:text-white/30">
                {tx.assetCode}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0 ml-2">
            <span
              className={`text-[9px] font-mono tracking-widest px-2.5 py-1 rounded flex items-center gap-1.5 border ${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`}
            >
              {cfg.pulse && (
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.pulseClass}`}
                />
              )}
              {cfg.label}
            </span>
          </div>

          {/* Expand chevron */}
          <div className="flex-shrink-0 ml-1 text-slate-400 dark:text-white/25">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden relative z-10"
          >
            <div className="mx-5 mb-4 rounded-xl p-4 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
              {/* Source vault breakdown */}
              {breakdownEntries.length > 0 && (
                <div className="col-span-2 mb-1">
                  <p className="text-[9px] uppercase tracking-widest font-mono mb-2 text-slate-500 dark:text-white/30">
                    Source Vault Breakdown
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {breakdownEntries.map(([key, val]) => {
                      const child = (tx as any).childTransfers?.find((c: any) => c.publicKey === key);
                      return (
                        <div key={key} className="flex flex-col gap-1 mb-1.5 p-2 bg-slate-100/50 dark:bg-white/[0.02] rounded-md border border-slate-200 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-600 dark:text-white/40">
                              {key.slice(0, 14)}…
                            </span>
                            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                              {parseFloat(val).toLocaleString()} XLM
                            </span>
                          </div>
                          {child?.stellarTxHash && (
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200 dark:border-white/5">
                              <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                #{child.ledgerSequence} · {child.stellarTxHash.slice(0, 12)}…
                              </span>
                              <a 
                                href={`https://stellar.expert/explorer/testnet/tx/${child.stellarTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                              >
                                View Explorer <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detail cells */}
              {[
                { label: 'Network',      value: 'Stellar Mainnet',                    color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Asset',        value: tx.assetCode === 'native' ? 'XLM (native)' : tx.assetCode, color: 'text-slate-600 dark:text-white/65' },
                { label: 'Recipients',   value: (tx.recipientCount || 1).toString(),          color: 'text-slate-600 dark:text-white/65' },
                { label: 'Block Height', value: tx.ledgerSequence ? `#${tx.ledgerSequence.toLocaleString()}` : '—', color: 'text-slate-600 dark:text-white/65' },
                { label: 'Tx Hash',      value: tx.stellarTxHash ? tx.stellarTxHash.slice(0, 12) + '…' : '—', color: 'text-purple-600 dark:text-purple-400' },
                { label: 'Settled',      value: tx.settledAt ? new Date(tx.settledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', color: 'text-slate-600 dark:text-white/65' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/30">
                    {label}
                  </span>
                  <span className={`text-[11px] font-mono ${color}`}>
                    {value}
                  </span>
                </div>
              ))}

              {/* View on Stellar Expert — shows whenever backend returns a real tx hash */}
              {tx.stellarTxHash && (
                <div className="col-span-2 pt-2 mt-1 border-t border-slate-200 dark:border-white/10">
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${tx.stellarTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Stellar Expert (Testnet)
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Press flash overlay */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            initial={{ opacity: 0.16 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-20 pointer-events-none rounded-xl"
            style={{ background: 'rgba(167,139,250,0.16)' }}
          />
        )}
      </AnimatePresence>
    </BentoCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats strip
// ─────────────────────────────────────────────────────────────────────────────
function StatsStrip({ txs }: { txs: StellarTransaction[] }) {
  const total   = txs.length;
  const live    = txs.filter((t) => ['AUTHORIZING','ROUTING','STELLAR_LEDGER'].includes(t.status)).length;
  const settled = txs.filter((t) => t.status === 'SETTLED').length;
  const volume  = txs.reduce((s, t) => s + t.amount, 0);

  const stats = [
    { label: 'Total',     value: total.toString(),                       color: 'text-slate-700 dark:text-white/75' },
    { label: 'Live',      value: live.toString(),                        color: 'text-purple-600 dark:text-purple-300', pulse: live > 0 },
    { label: 'Settled',   value: settled.toString(),                     color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Volume',    value: volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' XLM', color: 'text-cyan-600 dark:text-cyan-400' },
  ];

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map(({ label, value, color, pulse }) => (
        <div key={label} className="flex items-center gap-2">
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />}
          <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">
            {label}
          </span>
          <span className={`text-sm font-mono font-semibold ${color}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main HistoryView
// ─────────────────────────────────────────────────────────────────────────────
export function HistoryView() {
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterPill>('All');
  const transactions            = useTransactionStore((s) => s.transactions);
  const activePipeline          = useTransactionStore((s) => s.activePipeline);
  const pipelineIsRunning       = useTransactionStore((s) => s.pipelineIsRunning);

  // If there's a live pipeline, prepend its transaction to the list
  const allTxs = useMemo(() => {
    if (!activePipeline) return transactions;
    const already = transactions.find((t) => t.transferId === activePipeline.transferId);
    if (already) return transactions;
    const liveTx: StellarTransaction = {
      id: `live-${activePipeline.transferId}`,
      transferId: activePipeline.transferId,
      orgId: 'org-1',
      amount: 0,
      assetCode: 'native',
      destination: activePipeline.routingBreakdown
        ? Object.keys(activePipeline.routingBreakdown)[0] ?? 'Multiple'
        : 'Multiple',
      sourceBreakdown: activePipeline.routingBreakdown ?? {},
      status: activePipeline.currentStage,
      recipientCount: 1,
      createdAt: new Date().toISOString(),
    };
    return [liveTx, ...transactions];
  }, [transactions, activePipeline]);

  const filtered = useMemo(() => {
    return allTxs.filter((tx) => {
      const matchFilter =
        filter === 'All'     ? true :
        filter === 'Live'    ? ['AUTHORIZING','ROUTING','STELLAR_LEDGER'].includes(tx.status) :
        filter === 'Settled' ? tx.status === 'SETTLED' :
        filter === 'Failed'  ? tx.status === 'FAILED' :
        true;

      const matchSearch = !search || (
        tx.transferId.toLowerCase().includes(search.toLowerCase()) ||
        tx.destination.toLowerCase().includes(search.toLowerCase()) ||
        tx.id.toLowerCase().includes(search.toLowerCase())
      );

      return matchFilter && matchSearch;
    });
  }, [allTxs, filter, search]);

  const PILLS: FilterPill[] = ['All', 'Live', 'Settled', 'Failed'];
  const PILL_COLOR: Record<FilterPill, string> = {
    All: '#A78BFA', Live: '#C4B5FD', Settled: '#34D399', Failed: '#F87171',
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full h-full">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 dark:text-white">Transaction History</h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-white/50">
            Ledger of all network activity and on-chain settlements
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/65 hover:bg-slate-200 dark:hover:bg-white/10"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </motion.button>
      </div>

      {/* Stats strip */}
      <StatsStrip txs={allTxs} />

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer ID or destination…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none font-mono bg-white dark:bg-black/25 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white/80 focus:border-purple-500/50"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {PILLS.map((pill) => (
            <motion.button
              key={pill}
              whileTap={{ scale: 0.94 }}
              onClick={() => setFilter(pill)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium tracking-wide transition-all"
              style={{
                background: filter === pill ? `${PILL_COLOR[pill]}18` : 'transparent',
                border:     filter === pill ? `1px solid ${PILL_COLOR[pill]}50` : '1px solid transparent',
                color:      filter === pill ? PILL_COLOR[pill] : 'inherit',
                boxShadow:  filter === pill ? `0 0 12px ${PILL_COLOR[pill]}20` : 'none',
              }}
            >
              <span className={filter !== pill ? 'text-slate-500 dark:text-white/40' : ''}>{pill}</span>
            </motion.button>
          ))}
        </div>

        {pipelineIsRunning && (
          <span
            className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-2 rounded-xl flex-shrink-0 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2 pb-6">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <Clock className="w-5 h-5 text-slate-400 dark:text-white/30" />
              </div>
              <p className="text-sm text-center text-slate-500 dark:text-white/40">
                {filter === 'Live'
                  ? 'No live transactions — execute a route from Smart Routing.'
                  : filter === 'Failed'
                  ? 'No failed anomalies on this ledger.'
                  : 'No transactions match your search.'}
              </p>
            </motion.div>
          ) : (
            filtered.map((tx, i) => (
              <TxRowCard key={tx.id} tx={tx} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
