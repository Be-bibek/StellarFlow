'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { ArrowUpRight, ArrowDownRight, Activity, Clock, Shield } from 'lucide-react';
import { useTreasuryStore } from '@/lib/stores/treasury-store';
import { useTransactionStore } from '@/lib/stores/transaction-store';

export function DashboardView() {
  const wallets = useTreasuryStore((s) => s.wallets);
  const totalBalance = useTreasuryStore((s) => s.totalBalance);
  const fetchWallets = useTreasuryStore((s) => s.fetchWallets);
  const fetchSummary = useTreasuryStore((s) => s.fetchSummary);
  const summary = useTreasuryStore((s) => s.summary);
  
  const transactions = useTransactionStore((s) => s.transactions);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  useEffect(() => {
    fetchWallets();
    fetchSummary();
    fetchTransactions();
  }, [fetchWallets, fetchSummary, fetchTransactions]);

  const totalEquityString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(summary?.total_equity || totalBalance);

  const availableCashString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(summary?.available_cash || totalBalance);

  const dailyVolumeString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(summary?.daily_volume || 45200);

  const runningLiabilitiesString = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(summary?.running_liabilities || 124000);

  const displayWallets = wallets.slice(0, 4);
  const displayFeed = transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <BentoCard delay={0.05} className="md:col-span-2 relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Shield className="w-24 h-24" />
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Treasury Equity</span>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              {totalEquityString}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +{dailyVolumeString}
              </span>
              <span className="text-slate-500 tracking-tight">24h volume</span>
            </div>
          </div>
        </BentoCard>

        <BentoCard delay={0.1} className="flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Sourced Available Cash</span>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">{availableCashString}</div>
          <div className="mt-4 h-1 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 dark:bg-indigo-500 w-[60%]" />
          </div>
        </BentoCard>

        <BentoCard delay={0.15} className="flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Running Liabilities</span>
          <div className="text-2xl font-bold text-red-500 dark:text-red-400 mt-2">-{runningLiabilitiesString}</div>
          <div className="mt-4 text-[10px] text-slate-500">Escrowed reserves covered</div>
        </BentoCard>
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Managed Sub-Wallets */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-[#F8FAFC]">Managed Sub-Wallets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayWallets.map((wallet, i) => (
              <BentoCard key={wallet.id} delay={0.2 + (i * 0.05)} className="flex flex-col justify-between hover:border-blue-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">{wallet.name}</h3>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded font-bold text-blue-600 dark:text-indigo-300">{wallet.type}</span>
                    </div>
                    <div className="text-xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(wallet.balance)}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${wallet.isActive ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_currentColor]`} />
                </div>
                
                {/* Micro sparkline visualization */}
                <svg className="w-full h-8 mb-4 stroke-slate-300 dark:stroke-white/20" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 L20,15 L40,5 L60,18 L80,8 L100,12" fill="none" strokeWidth="2" strokeLinecap="round" />
                </svg>

                <div className="flex items-center gap-2 mt-auto">
                  <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="flex-1 py-1.5 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-semibold transition text-slate-700 dark:text-[#F8FAFC]">View</motion.button>
                  <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="flex-1 py-1.5 px-3 bg-blue-600/10 dark:bg-indigo-600/20 hover:bg-blue-600/20 dark:hover:bg-blue-600/40 border border-blue-500/30 text-blue-600 dark:text-indigo-300 rounded-md text-[10px] font-semibold transition">Transfer</motion.button>
                  <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="py-1.5 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md text-[10px] font-semibold transition text-slate-700 dark:text-[#F8FAFC]">...</motion.button>
                </div>
              </BentoCard>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-slate-800 dark:text-[#F8FAFC]">
            <Activity className="w-4 h-4 text-blue-500 dark:text-indigo-400" />
            Live Pulse Feed
          </h2>
          <BentoCard delay={0.4} className="flex-1 overflow-hidden p-0" noPadding>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5 h-[400px] overflow-y-auto">
              {displayFeed.map((tx) => {
                const isOutbound = true; // Simplification for now
                const amountStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount);
                const timeStr = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={tx.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-default">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${
                        tx.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                        tx.status === 'FAILED' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 border-red-200 dark:border-red-500/20' :
                        'bg-blue-50 text-blue-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-blue-200 dark:border-indigo-500/20'
                      }`}>
                        {tx.status}
                      </span>
                      <span className="text-[9px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeStr}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-white/80">Transfer: {String(tx.destination || 'Unknown').substring(0, 8)}...</p>
                    <div className={`mt-1 font-bold text-xs ${tx.status === 'SETTLED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {amountStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
