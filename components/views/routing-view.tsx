'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { Zap, GitMerge, Lock, Send, Target, ArrowRight, CheckCircle2, AlertTriangle, Loader2, Wallet } from 'lucide-react';
import { useTreasuryStore, selectTotalBalance, JitAllocation } from '@/lib/stores/treasury-store';
import { useTransactionStore } from '@/lib/stores/transaction-store';

// ─────────────────────────────────────────────────────────────────────────────
// Wallet type colour system (matches WalletType enum in treasury-store.ts)
// ─────────────────────────────────────────────────────────────────────────────
const WALLET_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  MASTER:     { bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/40',   text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500' },
  PAYROLL:    { bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200 dark:border-blue-500/40',     text: 'text-blue-700 dark:text-blue-400',     dot: 'bg-blue-500' },
  OPERATIONS: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/40', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  RESERVE:    { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/40', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  MARKETING:  { bg: 'bg-pink-50 dark:bg-pink-500/10',    border: 'border-pink-200 dark:border-pink-500/40',    text: 'text-pink-700 dark:text-pink-400',    dot: 'bg-pink-500' },
  ESCROW:     { bg: 'bg-slate-50 dark:bg-slate-500/10',  border: 'border-slate-200 dark:border-slate-500/40',  text: 'text-slate-600 dark:text-slate-400',  dot: 'bg-slate-500' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Animated allocation node
// ─────────────────────────────────────────────────────────────────────────────
function AllocationNode({ alloc, index, total }: { alloc: JitAllocation; index: number; total: number }) {
  const colors = WALLET_TYPE_COLORS[alloc.walletType] ?? WALLET_TYPE_COLORS.ESCROW;

  return (
    <motion.div
      initial={{ x: -32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.12, type: 'spring', stiffness: 200 }}
      className={`relative flex items-center justify-between rounded-xl p-3.5 border ${colors.bg} ${colors.border} backdrop-blur-md shadow-sm w-full`}
    >
      {/* Left: wallet info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{alloc.walletName}</p>
          <p className={`text-xs font-medium ${colors.text}`}>{alloc.walletType}</p>
        </div>
      </div>

      {/* Right: amount + percentage */}
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
          {alloc.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM
        </p>
        <p className={`text-xs font-mono ${colors.text}`}>
          {alloc.percentage.toFixed(1)}%
        </p>
      </div>

      {/* Animated fill bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: index * 0.12 + 0.2, duration: 0.6, ease: 'easeOut' }}
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-xl origin-left ${colors.dot}`}
        style={{ width: `${alloc.percentage}%` }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function RoutingView({ onNavigate }: { onNavigate?: (view: 'dashboard' | 'history' | 'treasury' | 'routing' | 'batch' | 'transit' | 'multisig' | 'analytics' | 'settings') => void } = {}) {
  const [targetInput, setTargetInput] = useState('');
  const [urgency, setUrgency] = useState<'Economy' | 'Balanced' | 'Instant'>('Balanced');
  const [destination, setDestination] = useState('');

  const { jitSimulation, jitIsRunning, simulateJitSplit, clearSimulation } = useTreasuryStore();
  const totalBalance = useTreasuryStore(selectTotalBalance);
  const { executeJit, pipelineIsRunning } = useTransactionStore();

  const handleSimulate = useCallback(async () => {
    const amount = parseFloat(targetInput.replace(/,/g, ''));
    if (!amount || amount <= 0) return;
    clearSimulation();
    await simulateJitSplit(amount);
  }, [targetInput, simulateJitSplit, clearSimulation]);

  const isValidDestination = destination.trim().startsWith('G') && destination.trim().length === 56;

  const handleExecute = useCallback(async () => {
    if (!jitSimulation || pipelineIsRunning) return;
    if (!isValidDestination) return;

    // Convert array of allocations to SourceBreakdown object
    const breakdown = jitSimulation.allocations.reduce((acc, alloc) => {
      acc[alloc.publicKey] = alloc.amount.toString();
      return acc;
    }, {} as Record<string, string>);

    // We don't need to generate a transferId locally anymore, the backend does it
    const status = await executeJit(jitSimulation.target, breakdown, destination.trim());
    
    // Auto-navigate based on Governance gatekeeper outcome
    if (onNavigate) {
      if (status === 'PENDING_APPROVAL') {
        onNavigate('multisig');
      } else {
        onNavigate('transit');
      }
    }
  }, [jitSimulation, pipelineIsRunning, executeJit, onNavigate]);

  const parsedAmount = parseFloat(targetInput.replace(/,/g, '')) || 0;
  const isOverLimit = parsedAmount > totalBalance;

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">
          Smart Routing Center
        </h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
          JIT multi-vault treasury aggregation simulator — mirrors the Rust backend greedy fill engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">

        {/* ── Left: Configuration ────────────────────────────────────────── */}
        <BentoCard delay={0.1} className="flex flex-col h-fit gap-5">

          {/* Destination */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-500 dark:text-white/50 tracking-wider">
              Recipient Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Target className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="GAHK7EEU... (Stellar G-address)"
                className={`w-full bg-slate-50 dark:bg-white/5 border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none font-mono text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-white/20 transition ${
                  destination && !isValidDestination
                    ? 'border-red-400 dark:border-red-500/60 focus:border-red-500'
                    : 'border-slate-200 dark:border-white/10 focus:border-blue-500/50'
                }`}
              />
            </div>
            {destination && !isValidDestination && (
              <p className="text-xs text-red-400">Must be a valid 56-character Stellar address starting with G</p>
            )}
            {!destination && (
              <p className="text-xs text-amber-400/80">Enter the recipient&apos;s Stellar public key to execute the route</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-500 dark:text-white/50 tracking-wider">
              Target Amount (XLM)
            </label>
            <input
              type="text"
              value={targetInput}
              onChange={(e) => {
                setTargetInput(e.target.value);
                clearSimulation();
              }}
              placeholder="e.g. 50000"
              className={`w-full text-right bg-slate-50 dark:bg-white/5 border rounded-lg px-4 py-3 text-xl focus:outline-none font-mono tracking-tight text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-300 dark:placeholder:text-white/20 transition ${
                isOverLimit
                  ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
                  : 'border-slate-200 dark:border-white/10 focus:border-blue-500/50'
              }`}
            />
            {/* Balance context bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/40">
              <span>Treasury liquidity</span>
              <span className={`font-mono font-semibold ${isOverLimit ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM available
              </span>
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-slate-500 dark:text-white/50 tracking-wider">
              Transaction Urgency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Economy', 'Balanced', 'Instant'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setUrgency(opt)}
                  className={`py-2 rounded-lg text-sm font-medium border transition ${
                    urgency === opt
                      ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-[#08060D] shadow-lg'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-white/10" />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSimulate}
              disabled={jitIsRunning || !parsedAmount}
              className="w-full py-3 bg-slate-900 text-white dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 dark:text-[#08060D] rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {jitIsRunning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Zap className="w-4 h-4" /> Simulate Optimal Path</>
              )}
            </motion.button>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 text-slate-700 dark:text-[#F8FAFC]"
              >
                <Lock className="w-4 h-4" /> Lock Sources
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExecute}
                disabled={!jitSimulation?.isFullyCovered || pipelineIsRunning || !isValidDestination}
                className="py-2.5 bg-white dark:bg-[#08060D] hover:bg-slate-50 dark:hover:bg-[#0f0b1a] border border-blue-200 dark:border-indigo-500/30 text-blue-600 dark:text-indigo-400 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pipelineIsRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Send className="w-4 h-4" /> Execute Route</>
                )}
              </motion.button>
            </div>
          </div>
        </BentoCard>

        {/* ── Right: Allocation Tree ─────────────────────────────────────── */}
        <BentoCard delay={0.2} className="relative flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <GitMerge className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-lg text-slate-900 dark:text-[#F8FAFC]">
              JIT Allocation Breakdown
            </h3>
          </div>

          <AnimatePresence mode="wait">
            {jitIsRunning ? (
              /* Loading state */
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[360px]"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-slate-200 dark:border-white/10" />
                  <div className="w-16 h-16 rounded-full border-2 border-t-blue-600 dark:border-t-indigo-400 absolute inset-0 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600 dark:text-white/70">Computing greedy fill...</p>
                  <p className="text-xs text-slate-400 dark:text-white/30 mt-1">Fetching live vault balances via Horizon</p>
                </div>
              </motion.div>

            ) : jitSimulation ? (
              /* Results state */
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col gap-4"
              >
                {/* Summary bar */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  jitSimulation.isFullyCovered
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                }`}>
                  {jitSimulation.isFullyCovered ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${jitSimulation.isFullyCovered ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                      {jitSimulation.isFullyCovered
                        ? `✓ ${jitSimulation.vaultsUsed} vault${jitSimulation.vaultsUsed > 1 ? 's' : ''} cover full amount`
                        : `⚠ Shortfall: ${jitSimulation.shortfall.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/40">
                      {jitSimulation.totalCovered.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {jitSimulation.target.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM covered · 5% reserve applied per vault
                    </p>
                  </div>
                </div>

                {/* Allocation flow */}
                <div className="flex-1 relative">
                  {/* Source nodes */}
                  <div className="flex flex-col gap-3">
                    {jitSimulation.allocations.map((alloc, i) => (
                      <div key={alloc.walletId} className="flex items-center gap-3">
                        <div className="flex-1">
                          <AllocationNode alloc={alloc} index={i} total={jitSimulation.allocations.length} />
                        </div>
                        {/* Arrow */}
                        <motion.div
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12 + 0.3 }}
                        >
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-white/20 flex-shrink-0" />
                        </motion.div>
                        {/* Destination mini */}
                        <motion.div
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12 + 0.4 }}
                          className="flex-shrink-0 w-24 text-right"
                        >
                          <p className="text-xs font-mono text-slate-400 dark:text-white/30 truncate">
                            {destination ? destination.slice(0, 8) + '...' : 'DEST...'}
                          </p>
                        </motion.div>
                      </div>
                    ))}
                  </div>

                  {/* Execute reminder */}
                  {jitSimulation.isFullyCovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-white/30"
                    >
                      <Send className="w-3 h-3" />
                      <span>Click <strong>Execute Route</strong> to launch the transit pipeline</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

            ) : (
              /* Empty state */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[360px] opacity-40 dark:opacity-20 text-center px-8"
              >
                <Wallet className="w-12 h-12 text-slate-400 dark:text-white/50" />
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-white">Enter an amount and click Simulate</p>
                  <p className="text-xs text-slate-400 dark:text-white/60 mt-1">
                    The JIT engine will compute the optimal vault split using a priority-ordered greedy fill with 5% reserve per vault.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </BentoCard>
      </div>
    </div>
  );
}
