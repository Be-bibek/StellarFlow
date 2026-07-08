'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { ArrowUpRight, ArrowDownRight, Activity, Shield, MoreHorizontal, ExternalLink, ArrowRightLeft, QrCode, Copy, Share2, Clock, Wallet, Landmark, Users, Briefcase, Lock, Megaphone } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useTreasuryStore } from '@/lib/stores/treasury-store';
import { useTransactionStore } from '@/lib/stores/transaction-store';
import { useAccountStore } from '@/lib/stores/account-store';

const getWalletIcon = (type: string) => {
  switch (type) {
    case 'MASTER': return <Landmark className="w-5 h-5 text-indigo-400" />;
    case 'PAYROLL': return <Users className="w-5 h-5 text-blue-400" />;
    case 'OPERATIONS': return <Briefcase className="w-5 h-5 text-emerald-400" />;
    case 'RESERVE': return <Lock className="w-5 h-5 text-amber-400" />;
    case 'MARKETING': return <Megaphone className="w-5 h-5 text-pink-400" />;
    default: return <Wallet className="w-5 h-5 text-slate-400" />;
  }
};

interface DashboardViewProps {
  onNavigate?: (view: any) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [qrModalWallet, setQrModalWallet] = useState<any | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  
  const xlmPriceUsd = useAccountStore((s) => s.xlmPriceUsd);
  
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
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2 text-slate-800 dark:text-[#F8FAFC]">
            <Wallet className="w-4 h-4 text-blue-500 dark:text-indigo-400" />
            Managed Sub-Wallets
          </h2>
          <BentoCard delay={0.2} className="flex-1 overflow-hidden p-0" noPadding>
            <div className="flex flex-col divide-y divide-slate-200 dark:divide-white/5 h-[400px] overflow-y-auto">
              {wallets.map((wallet, i) => (
                <div key={wallet.id} className="flex flex-col flex-shrink-0 overflow-hidden hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex justify-between items-center p-4 bg-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 flex-shrink-0">
                        {getWalletIcon(wallet.type)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] uppercase">{wallet.name}</h3>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/5 rounded font-bold text-blue-600 dark:text-indigo-300">{wallet.type}</span>
                        </div>
                        <div className="text-sm font-mono mt-1 text-slate-500 dark:text-white/40">
                          xlm:{wallet.publicKey?.slice(0, 4)}...{wallet.publicKey?.slice(-4)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] flex items-baseline gap-1">
                          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(wallet.balance)} <span className="text-xs text-slate-500 font-medium">XLM</span>
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(wallet.balance * (xlmPriceUsd || 0.125))}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wallet.isActive ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_currentColor]`} />
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <button 
                      onClick={() => {
                        if (wallet.publicKey) window.open(`https://stellar.expert/explorer/testnet/account/${wallet.publicKey}`, '_blank');
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </button>
                    
                    <button 
                      onClick={() => {
                        onNavigate?.('transfer');
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-blue-600/10 dark:bg-indigo-600/20 hover:bg-blue-600/20 dark:hover:bg-blue-600/40 border border-blue-500/30 text-blue-600 dark:text-indigo-300 rounded-lg text-xs font-semibold transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
                    </button>
                    
                    <button 
                      onClick={() => {
                        setQrModalWallet(wallet);
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] transition"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Receive
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (wallet.publicKey) {
                          navigator.clipboard.writeText(wallet.publicKey);
                          setCopyToast(true);
                          setTimeout(() => setCopyToast(false), 2000);
                        }
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] transition"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if (wallet.publicKey && navigator.share) {
                          try {
                            await navigator.share({
                              title: `My Stellar Address (${wallet.name})`,
                              text: `Send XLM to my address: ${wallet.publicKey}`,
                            });
                          } catch (err) {
                            console.log('Share canceled or failed');
                          }
                        } else {
                          alert('Web Share API not supported on this browser.');
                        }
                      }}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] transition"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
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

      {/* QR Code Modal for Wallets */}
      <AnimatePresence>
        {qrModalWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setQrModalWallet(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center flex flex-col items-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  Receive Funds
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Scan this QR code to send assets to {qrModalWallet.name}
                </p>
                
                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 dark:border-slate-800 mb-6">
                  <QRCode 
                    value={qrModalWallet.publicKey || 'invalid'} 
                    size={200}
                    level="H"
                    includeMargin={false}
                    fgColor="#0F172A"
                  />
                </div>

                <div className="w-full bg-slate-50 dark:bg-white/5 rounded-lg p-3 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate mr-3">
                    {qrModalWallet.publicKey}
                  </span>
                  <button
                    onClick={() => {
                      if (qrModalWallet.publicKey) {
                        navigator.clipboard.writeText(qrModalWallet.publicKey);
                        setCopyToast(true);
                        setTimeout(() => setCopyToast(false), 2000);
                      }
                    }}
                    className="p-1.5 bg-white dark:bg-white/10 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-white/5 p-4 bg-slate-50 dark:bg-white/[0.02]">
                <button
                  onClick={() => setQrModalWallet(null)}
                  className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Copy className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Address Copied</p>
              <p className="text-xs text-slate-400">Ready to paste into destination</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
