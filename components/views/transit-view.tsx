'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useTransactionStore,
  TransactionStatus,
  TransitPipeline,
  StellarTransaction,
  STAGE_ORDER,
} from '@/lib/stores/transaction-store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type FilterTab = 'All Active Transits' | 'Completed Operations' | 'Failed Anomalies';

// ─────────────────────────────────────────────────────────────────────────────
// Stage icons
// ─────────────────────────────────────────────────────────────────────────────
function AuthorizingIcon({ active, past }: { active: boolean; past: boolean }) {
  const isColored = past || active;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isColored ? 'text-purple-500 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`} stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3C8 3 5 6 5 9v2H4a1 1 0 00-1 1v8a1 1 0 001 1h16a1 1 0 001-1v-8a1 1 0 00-1-1h-1V9c0-3-3-6-7-6z" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function RoutingIcon({ active, past }: { active: boolean; past: boolean }) {
  const isColored = past || active;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isColored ? 'text-purple-500 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600'}`} stroke="currentColor" strokeWidth={1.8}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 12h4l4-5" />
      <path d="M11 12l4 5" />
    </svg>
  );
}
function CoreLedgerIcon({ active, past }: { active: boolean; past: boolean }) {
  const isColored = active ? 'text-cyan-500 dark:text-cyan-400' : past ? 'text-purple-500 dark:text-purple-400' : 'text-slate-300 dark:text-slate-600';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isColored}`} stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="17" width="18" height="4" rx="1" />
    </svg>
  );
}
function FinalSettledIcon({ active, past }: { active: boolean; past: boolean }) {
  const isColored = active || past ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 ${isColored}`} stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

const STAGE_META = [
  { key: 'AUTHORIZING' as TransactionStatus, label: 'AUTHORIZING',        Icon: AuthorizingIcon  },
  { key: 'ROUTING'     as TransactionStatus, label: 'ROUTING\nPIPELINE',  Icon: RoutingIcon      },
  { key: 'STELLAR_LEDGER' as TransactionStatus, label: 'CORE LEDGER',     Icon: CoreLedgerIcon   },
  { key: 'SETTLED'     as TransactionStatus, label: 'FINAL SETTLED',       Icon: FinalSettledIcon },
];

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TransactionStatus }) {
  const cfg: Record<string, { label: string; className: string }> = {
    AUTHORIZING:    { label: 'IN PROGRESS', className: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-white dark:bg-white/5 dark:border-white/20' },
    ROUTING:        { label: 'IN PROGRESS', className: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-white dark:bg-white/5 dark:border-white/20' },
    STELLAR_LEDGER: { label: 'CONFIRMING',  className: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/30' },
    SETTLED:        { label: 'SETTLED',     className: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30' },
    FAILED:         { label: 'FAILED',      className: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/30' },
  };
  const c = cfg[status] ?? cfg.AUTHORIZING;
  return (
    <span className={`text-[10px] font-mono tracking-widest px-3 py-1.5 rounded border ${c.className}`}>
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: track mouse position relative to an element
// ─────────────────────────────────────────────────────────────────────────────
function useMousePosition<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, inside: false });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, inside: true });
  }, []);

  const onMouseLeave = useCallback(() => {
    setPos((p) => ({ ...p, inside: false }));
  }, []);

  return { ref, pos, onMouseMove, onMouseLeave };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session card with cursor spotlight + click press animation + rich detail
// ─────────────────────────────────────────────────────────────────────────────
function SessionCard({
  session,
  pipeline,
}: {
  session: {
    id: string;
    amount: number;
    status: TransactionStatus;
    walletCount?: number;
    totalFee?: string;
    elapsedMs?: number;
    blockHeight?: string;
    baseFee?: string;
    createdAt?: string;
    breakdown?: Record<string, string>;
  };
  pipeline?: TransitPipeline | null;
}) {
  const { ref, pos, onMouseMove, onMouseLeave } = useMousePosition<HTMLDivElement>();
  const [isPressed, setIsPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const currentStatus = pipeline?.currentStage ?? session.status;
  const currentIdx = STAGE_ORDER.indexOf(currentStatus);
  const progressFraction =
    currentStatus === 'SETTLED' ? 1 : currentIdx <= 0 ? 0 : currentIdx / (STAGE_ORDER.length - 1);

  // Elapsed seconds
  const elapsedSec = session.createdAt
    ? Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000)
    : null;

  // Breakdown entries
  const breakdownEntries = session.breakdown ? Object.entries(session.breakdown) : null;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.984, transition: { type: 'spring', stiffness: 600, damping: 30 } }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => { setIsPressed(false); setExpanded((p) => !p); }}
      className={`rounded-2xl relative overflow-hidden cursor-pointer select-none transition-all duration-200 border ${
        isPressed
          ? 'border-purple-500/50 shadow-[0_0_0_2px_rgba(124,58,237,0.2),_0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_0_0_2px_rgba(124,58,237,0.2),_0_8px_32px_rgba(0,0,0,0.4)]'
          : 'border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.02) 0%, transparent 100%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="absolute inset-0 bg-white/40 dark:bg-white/5 pointer-events-none" />

      {/* ── Cursor spotlight ─────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: pos.inside ? 1 : 0,
          background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(124,58,237,0.13) 0%, transparent 70%)`,
        }}
      />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: currentStatus === 'SETTLED' ? '#10B981' : currentStatus === 'FAILED' ? '#EF4444' : '#7C3AED',
                  boxShadow: currentStatus === 'SETTLED' ? '0 0 6px #10B981' : currentStatus === 'FAILED' ? '0 0 6px #EF4444' : '0 0 6px #7C3AED',
                  animation: currentStatus !== 'SETTLED' && currentStatus !== 'FAILED' ? 'pulse 2s infinite' : 'none',
                }}
              />
              <span className="text-[11px] font-mono tracking-widest text-slate-500 dark:text-white/45">
                {session.id}
              </span>
            </div>
            <p className="text-3xl font-light tracking-tight text-slate-900 dark:text-slate-50" style={{ fontFamily: 'monospace' }}>
              ${session.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-2 mb-5 flex-wrap">
          {elapsedSec !== null && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
              ⏱ {elapsedSec < 60 ? `${elapsedSec}s elapsed` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s elapsed`}
            </span>
          )}
          {session.walletCount && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
              🔑 {session.walletCount} vault{session.walletCount > 1 ? 's' : ''} sourced
            </span>
          )}
          {session.blockHeight && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
              ⛓ Block #{session.blockHeight}
            </span>
          )}
          {session.baseFee && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-white/40">
              ⚡ Fee {session.baseFee} XLM
            </span>
          )}
          <span className="text-[11px] font-mono ml-auto text-slate-400 dark:text-white/25">
            {expanded ? '▲ collapse' : '▼ details'}
          </span>
        </div>

        {/* Pipeline track */}
        <div className="relative">
          <div className="absolute top-4 left-4 right-4 h-px bg-slate-200 dark:bg-white/10" />
          <motion.div
            className="absolute top-4 left-4 h-px"
            initial={{ width: 0 }}
            animate={{ width: `calc((100% - 2rem) * ${progressFraction})` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              background:
                currentStatus === 'SETTLED'
                  ? 'linear-gradient(90deg, #7C3AED, #06B6D4, #10B981)'
                  : currentStatus === 'STELLAR_LEDGER'
                  ? 'linear-gradient(90deg, #7C3AED, #06B6D4)'
                  : 'linear-gradient(90deg, #7C3AED, #7C3AED)',
              boxShadow: '0 0 8px rgba(124,58,237,0.5)',
            }}
          />

          <div className="relative flex justify-between items-start">
            {STAGE_META.map((stage, i) => {
              const isPast   = i < currentIdx || currentStatus === 'SETTLED';
              const isActive = STAGE_ORDER[i] === currentStatus;
              const isSettled = currentStatus === 'SETTLED' && stage.key === 'SETTLED';

              let ringColor = 'border-slate-200 dark:border-white/10';
              let bgColor   = 'bg-slate-50 dark:bg-white/5';
              let glowColor = 'transparent';
              
              if (isPast)   { ringColor = 'border-purple-400 dark:border-purple-500'; bgColor = 'bg-purple-50 dark:bg-purple-500/15'; }
              if (isActive && stage.key !== 'STELLAR_LEDGER') {
                ringColor = 'border-purple-400 dark:border-purple-500'; bgColor = 'bg-purple-50 dark:bg-purple-500/15'; glowColor = 'rgba(124,58,237,0.5)';
              }
              if (isActive && stage.key === 'STELLAR_LEDGER') {
                ringColor = 'border-cyan-400 dark:border-cyan-500'; bgColor = 'bg-cyan-50 dark:bg-cyan-500/10'; glowColor = 'rgba(6,182,212,0.5)';
              }
              if (isSettled) { ringColor = 'border-emerald-400 dark:border-emerald-500'; bgColor = 'bg-emerald-50 dark:bg-emerald-500/10'; glowColor = 'rgba(16,185,129,0.5)'; }

              return (
                <div key={stage.key} className="flex flex-col items-center gap-2 relative" style={{ width: '25%' }}>
                  <motion.div
                    animate={
                      isActive
                        ? { boxShadow: [`0 0 0px ${glowColor}`, `0 0 18px ${glowColor}`, `0 0 0px ${glowColor}`] }
                        : {}
                    }
                    transition={isActive ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : {}}
                    className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-all duration-500 border-2 ${bgColor} ${ringColor}`}
                  >
                    <stage.Icon active={isActive} past={isPast} />
                  </motion.div>
                  <span
                    className={`text-[9px] uppercase tracking-widest text-center leading-tight ${
                      isActive
                        ? stage.key === 'STELLAR_LEDGER' ? 'text-cyan-600 dark:text-cyan-400' : 'text-purple-600 dark:text-purple-400'
                        : isPast
                        ? 'text-purple-500 dark:text-purple-400'
                        : 'text-slate-400 dark:text-white/30'
                    }`}
                    style={{
                      whiteSpace: 'pre-line',
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Expanded detail panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="mt-5 rounded-xl p-4 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-black/30 border border-slate-200 dark:border-white/10">
                {/* Stage durations from live pipeline */}
                {pipeline?.stages.map((s) => (
                  s.durationMs
                    ? (
                      <div key={s.status} className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">
                          {s.label}
                        </span>
                        <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                          {(s.durationMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                    ) : null
                ))}

                {/* Vault breakdown */}
                {breakdownEntries && breakdownEntries.map(([key, val]) => (
                  <div key={key} className="col-span-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono truncate text-slate-500 dark:text-white/40" style={{ maxWidth: '60%' }}>
                      {key.slice(0, 14)}…
                    </span>
                    <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                      {parseFloat(val).toLocaleString()} XLM
                    </span>
                  </div>
                ))}

                {/* Static detail rows */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">Network</span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Stellar Mainnet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">Asset</span>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-white/70">XLM (native)</span>
                </div>
                {session.blockHeight && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">Block Height</span>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-white/70">#{session.blockHeight}</span>
                  </div>
                )}
                {session.baseFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-slate-500 dark:text-white/40">Base Fee</span>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-white/70">{session.baseFee} XLM</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pressed overlay flash */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            initial={{ opacity: 0.18 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-20 pointer-events-none rounded-2xl"
            style={{ background: 'rgba(167,139,250,0.18)' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive session ID from a transaction
// ─────────────────────────────────────────────────────────────────────────────
function deriveSessionId(tx: StellarTransaction, idx: number): string {
  const match = tx.transferId.match(/\d+/);
  const num = match ? parseInt(match[0]) % 10000 + 9000 : 9000 + idx;
  return `SESSION: SEQ-${num}`;
}

const FILTER_TABS: FilterTab[] = ['All Active Transits', 'Completed Operations', 'Failed Anomalies'];

// ─────────────────────────────────────────────────────────────────────────────
// Main TransitView
// ─────────────────────────────────────────────────────────────────────────────
export function TransitView() {
  const [activeTab, setActiveTab] = useState<FilterTab>('All Active Transits');
  const transactions = useTransactionStore((s) => s.transactions);
  const activePipeline = useTransactionStore((s) => s.activePipeline);
  const pipelineIsRunning = useTransactionStore((s) => s.pipelineIsRunning);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Build session list
  type Session = {
    id: string;
    amount: number;
    status: TransactionStatus;
    walletCount?: number;
    blockHeight?: string;
    baseFee?: string;
    createdAt?: string;
    breakdown?: Record<string, string>;
    pipeline?: TransitPipeline | null;
  };

  const sessions: Session[] = [];

  // Live pipeline session (top)
  if (activePipeline) {
    const matchTx = transactions.find((t) => t.transferId === activePipeline.transferId);
    sessions.push({
      id: `SESSION: SEQ-${Math.floor(Date.now() / 1000) % 10000 + 9040}`,
      amount: matchTx?.amount ?? 0,
      status: activePipeline.currentStage,
      walletCount: matchTx ? Object.keys(matchTx.sourceBreakdown).length : 1,
      blockHeight: '8841829',
      baseFee: '0.00010',
      createdAt: matchTx?.createdAt,
      breakdown: matchTx?.sourceBreakdown,
      pipeline: activePipeline,
    });
  }

  // Historical transactions
  transactions.forEach((tx, i) => {
    sessions.push({
      id: deriveSessionId(tx, i),
      amount: tx.amount,
      status: tx.status,
      walletCount: Object.keys(tx.sourceBreakdown).length,
      blockHeight: '8841829',
      baseFee: '0.00010',
      createdAt: tx.createdAt,
      breakdown: tx.sourceBreakdown,
    });
  });

  // Apply filter
  const filtered = sessions.filter((s) => {
    if (activeTab === 'All Active Transits')
      return ['AUTHORIZING', 'ROUTING', 'STELLAR_LEDGER'].includes(s.status);
    if (activeTab === 'Completed Operations')
      return s.status === 'SETTLED';
    if (activeTab === 'Failed Anomalies')
      return s.status === 'FAILED';
    return true;
  });

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-light tracking-tight text-slate-900 dark:text-white">Real-Time Transit Center</h2>
        <p className="text-sm mt-1 text-slate-500 dark:text-white/50">
          Multi-wallet outbound sequences moving through systemic execution phases.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-200 border ${
              activeTab === tab
                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-500/60 shadow-[0_0_16px_rgba(124,58,237,0.30)]'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 border-slate-200 dark:border-white/10'
            }`}
          >
            {tab}
          </motion.button>
        ))}

        {pipelineIsRunning && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/30 border">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
            LIVE PIPELINE
          </span>
        )}
      </div>

      {/* Session cards */}
      <div className="flex flex-col gap-4 pb-6">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-sm text-slate-400 dark:text-white/30"
            >
              {activeTab === 'All Active Transits'
                ? 'No active transits — execute a route from Smart Routing to launch a live session.'
                : activeTab === 'Completed Operations'
                ? 'No completed operations yet.'
                : 'No failed anomalies detected.'}
            </motion.div>
          ) : (
            filtered.map((session, idx) => (
              <SessionCard
                key={session.id + idx}
                session={session}
                pipeline={session.pipeline}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
