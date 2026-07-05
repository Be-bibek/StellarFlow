'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { Plus, Link as LinkIcon, Download, Search, ChevronRight, Lock, Key } from 'lucide-react';
import { useTreasuryStore } from '@/lib/stores/treasury-store';
import { TreasuryRouter } from '@/components/treasury-router';
import { ContractDesk } from '@/components/contract-desk';

export function TreasuryView() {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  
  const wallets = useTreasuryStore((state) => state.wallets);
  const fetchWallets = useTreasuryStore((state) => state.fetchWallets);
  const isLoading = useTreasuryStore((state) => state.isLoading);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const activeWallet = wallets.find(w => w.id === selectedWallet);

  return (
    <div className="flex flex-col gap-6 h-full relative max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">Master Treasury Center</h2>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Global Asset Ledger and Provision Controls.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg text-sm font-medium transition shadow-[0_0_15px_rgba(197,160,89,0.4)] dark:shadow-[0_0_15px_rgba(79,70,229,0.4)] text-white">
            <Plus className="w-4 h-4" /> Provision New Wallet
          </motion.button>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 py-2 px-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition text-slate-700 dark:text-[#F8FAFC]">
            <LinkIcon className="w-4 h-4" /> Link Hardware Core
          </motion.button>
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 py-2 px-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition text-slate-700 dark:text-[#F8FAFC]">
            <Download className="w-4 h-4" /> Export Ledger Sheet
          </motion.button>
        </div>
      </div>

      <TreasuryRouter />

      {/* On-Chain Contract Interaction Desk */}
      <BentoCard delay={0.05} className="w-full">
        <ContractDesk />
      </BentoCard>

      <div className="flex flex-col md:flex-row gap-6 relative">
        {/* Main Table Container */}
        <BentoCard delay={0.1} className={`transition-all duration-500 flex-1 overflow-hidden ${selectedWallet ? 'md:w-2/3 md:max-w-[66%]' : 'w-full'}`} noPadding>
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
              <input type="text" placeholder="Filter wallets..." className="w-full sm:w-64 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-md pl-9 pr-4 py-1.5 text-sm outline-none focus:border-blue-500/50 transition-colors text-slate-900 dark:text-white shadow-sm dark:shadow-none" />
            </div>
          </div>
          
          {/* Desktop/Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-500 dark:text-white/40">
                  <th className="px-6 py-4 font-medium">Wallet Identity</th>
                  <th className="px-6 py-4 font-medium">Core Asset</th>
                  <th className="px-6 py-4 font-medium text-right">Real-Time Balance</th>
                  <th className="px-6 py-4 font-medium text-center">Rating</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {wallets.map((wallet) => (
                  <tr 
                    key={wallet.id} 
                    onClick={() => setSelectedWallet(wallet.id === selectedWallet ? null : wallet.id)}
                    className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${selectedWallet === wallet.id ? 'bg-blue-50 dark:bg-indigo-500/10' : ''}`}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-[#F8FAFC]">
                       <div className="flex flex-col">
                          <span>{wallet.name}</span>
                          <span className="text-[10px] text-slate-500">{wallet.publicKey.substring(0, 8)}...</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-white/60">XLM</td>
                    <td className="px-6 py-4 font-mono font-bold text-right text-slate-900 dark:text-white">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(wallet.balance)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10 text-xs font-mono text-slate-700 dark:text-white">A+</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 flex items-center w-max gap-1.5 rounded-full text-[10px] uppercase font-bold box-border border ${
                         wallet.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                         'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/30'
                       }`}>
                         {!wallet.isActive && <Lock className="w-3 h-3" />}
                         {wallet.isActive ? 'Active' : 'Locked'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <ChevronRight className={`w-4 h-4 inline-block text-slate-400 dark:text-white/40 transition-transform ${selectedWallet === wallet.id ? 'rotate-90' : ''}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="flex flex-col md:hidden divide-y divide-slate-100 dark:divide-white/5">
                {wallets.map((wallet) => (
                  <div 
                    key={wallet.id} 
                    onClick={() => setSelectedWallet(wallet.id === selectedWallet ? null : wallet.id)}
                    className={`flex flex-col gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${selectedWallet === wallet.id ? 'bg-blue-50 dark:bg-indigo-500/10' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                       <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-[#F8FAFC]">{wallet.name}</span>
                          <span className="text-xs text-slate-500">{wallet.publicKey.substring(0, 8)}... • <span className="font-mono">XLM</span></span>
                       </div>
                       <ChevronRight className={`w-5 h-5 text-slate-400 dark:text-white/40 transition-transform flex-shrink-0 ${selectedWallet === wallet.id ? 'rotate-90' : ''}`} />
                    </div>
                    
                    <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Status</span>
                          <span className={`px-2 py-0.5 flex items-center w-max gap-1 rounded-full text-[10px] uppercase font-bold box-border border ${
                            wallet.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                            'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/30'
                          }`}>
                            {!wallet.isActive && <Lock className="w-3 h-3" />}
                            {wallet.isActive ? 'Active' : 'Locked'}
                          </span>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Balance</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(wallet.balance)}
                          </span>
                       </div>
                    </div>
                  </div>
                ))}
          </div>
        </BentoCard>

        {/* Deep Dive Panel (Conditionally Rendered & Animated) */}
        <AnimatePresence mode="popLayout">
          {selectedWallet && activeWallet && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0.1 }}
              className="flex flex-col gap-4 w-full md:w-1/3 md:min-w-[300px]"
            >
              <BentoCard delay={0} className="flex-1 flex flex-col pt-8 relative">
                <div className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" onClick={() => setSelectedWallet(null)}>
                  <ChevronRight className="w-4 h-4 text-slate-500 dark:text-white/50" />
                </div>
                
                <h3 className="text-xl font-medium mb-1 text-slate-900 dark:text-[#F8FAFC] pr-10">{activeWallet.name}</h3>
                <div className="font-mono text-3xl font-bold mb-8 text-blue-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activeWallet.balance)}
                </div>

                {/* Progress Metric */}
                <div className="mb-8">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-white/60 mb-2 font-medium">
                    <span>Corporate Budget Spent</span>
                    <span>42%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: '42%' }} 
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 dark:from-indigo-500 dark:to-cyan-400"
                    />
                  </div>
                </div>

                {/* Signatory Cluster */}
                <div className="mb-8">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40 mb-3 font-medium">Signatory Cluster (Multi-Sig)</div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                       <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-indigo-600/20 border-2 border-blue-200 dark:border-indigo-500/50 flex items-center justify-center">
                          <span className="font-medium text-blue-700 dark:text-indigo-300 text-xs">A1</span>
                       </div>
                       <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#040208] rounded-full p-0.5">
                         <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                       </div>
                    </div>
                    <div className="relative">
                       <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-600/20 border-2 border-indigo-200 dark:border-indigo-500/50 flex items-center justify-center">
                          <span className="font-medium text-indigo-700 dark:text-indigo-300 text-xs">C2</span>
                       </div>
                       <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#040208] rounded-full p-0.5">
                         <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                       </div>
                    </div>
                    {!activeWallet.isActive && (
                      <div className="relative">
                         <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 border-2 border-slate-300 dark:border-white/20 border-dashed flex items-center justify-center">
                            <Key className="w-4 h-4 text-slate-400 dark:text-white/20" />
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Stream */}
                <div className="flex-1 mt-4">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/40 mb-4 font-medium">Audit Timeline</div>
                  <div className="relative border-l border-slate-200 dark:border-white/10 ml-3 pl-6 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-white dark:ring-[#040208]" />
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Inbound: USDC Top-up</div>
                      <div className="text-xs text-slate-500 dark:text-white/40 font-mono mt-1">2026-06-15 08:30 UTC</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-white dark:ring-[#040208]" />
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Policy rule updated</div>
                      <div className="text-xs text-slate-500 dark:text-white/40 font-mono mt-1">2026-06-14 14:12 UTC</div>
                    </div>
                  </div>
                </div>
              </BentoCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
