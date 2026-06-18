'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { UserCircle, Users, Link as LinkIcon, Shield, FileSignature, SlidersHorizontal, AlertTriangle } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Organization Profile', icon: UserCircle },
  { id: 'team', label: 'Team Member Matrix', icon: Users },
  { id: 'wallets', label: 'Wallet Connections', icon: LinkIcon },
  { id: 'security', label: 'Security Rules', icon: Shield },
  { id: 'policies', label: 'Treasury Policies', icon: FileSignature },
  { id: 'thresholds', label: 'Approval Thresholds', icon: SlidersHorizontal },
  { id: 'limits', label: 'Transaction Limits', icon: AlertTriangle },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState(TABS[3].id);

  return (
    <div className="flex flex-col h-full gap-6 max-w-6xl mx-auto w-full">
      <div className="mb-2">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">System Settings & Governance Policy Hub</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Configure workspace rules, role matrices, and global security policies.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 pb-12 items-start">
        {/* Vertical Tab Menu */}
        <BentoCard delay={0.1} noPadding className="w-full md:w-64 flex-shrink-0 sticky top-4">
          <nav className="flex flex-col p-2 space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settingsTabIndicator"
                      className="absolute inset-0 bg-blue-50 border border-blue-200 dark:bg-indigo-500/20 dark:border-indigo-500/30 rounded-lg"
                      initial={false}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-blue-600 dark:text-indigo-400' : ''}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </BentoCard>

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-6 w-full">
           <BentoCard delay={0.2} className="min-h-[400px]">
              {activeTab === 'security' && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 dark:border-transparent dark:bg-indigo-600/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
                     </div>
                     <div>
                       <h3 className="text-xl font-medium text-slate-900 dark:text-white">Security Rules</h3>
                       <p className="text-sm text-slate-500 dark:text-white/50">Manage global cryptographic policies and session constraints.</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 flex items-center justify-between">
                       <div>
                          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Require Multi-Sig on Outflows</h4>
                          <p className="text-xs text-slate-500 dark:text-white/50">All transfers leaving the network strictly require M-of-N hardware signatures.</p>
                       </div>
                       <div className="w-12 h-6 bg-blue-600 dark:bg-indigo-600 rounded-full flex items-center justify-end px-1 border border-blue-500 dark:border-indigo-400/50 cursor-pointer shadow-sm dark:shadow-[0_0_10px_rgba(79,70,229,0.3)]">
                         <div className="w-4 h-4 bg-white rounded-full translate-x-0" />
                       </div>
                     </div>

                     <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 flex items-center justify-between">
                       <div>
                          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Strict IP Allowlisting</h4>
                          <p className="text-xs text-slate-500 dark:text-white/50">Block dashboard access from unknown external addresses.</p>
                       </div>
                       <div className="w-12 h-6 bg-slate-200 dark:bg-[#040208] border border-slate-300 dark:border-white/20 rounded-full flex items-center px-1 cursor-pointer">
                         <div className="w-4 h-4 bg-white dark:bg-white/50 rounded-full shadow-sm" />
                       </div>
                     </div>
                     
                     <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-5 flex items-center justify-between">
                       <div>
                          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Session Timeout</h4>
                          <p className="text-xs text-slate-500 dark:text-white/50">Automatically log out inactive operators after set duration.</p>
                       </div>
                       <select className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-md px-3 py-1 text-sm text-slate-700 dark:text-white focus:outline-none focus:border-blue-500 outline-none shadow-sm dark:shadow-none">
                         <option>15 Minutes</option>
                         <option>30 Minutes</option>
                         <option>1 Hour</option>
                       </select>
                     </div>

                     <div className="bg-slate-50 dark:bg-white/5 border border-blue-200 dark:border-indigo-500/30 rounded-xl p-5 flex items-center justify-between mt-8">
                       <div>
                          <h4 className="font-medium text-sm mb-1 text-slate-900 dark:text-white">Developer Testing Tools</h4>
                          <p className="text-xs text-slate-500 dark:text-white/50">Seed test transactions and notifications for current user.</p>
                       </div>
                       <button 
                         onClick={async () => {
                           // this logic uses auth and db which we need to import
                           try {
                             const { auth, db } = await import('@/lib/firebase');
                             const { addDoc, collection } = await import('firebase/firestore');
                             if (!auth.currentUser) return;
                             await addDoc(collection(db, 'notifications'), {
                               userId: auth.currentUser.uid,
                               title: 'Multi-Sig Approval Required',
                               message: 'A transfer of $2,500,000 to Vault B requires your signature.',
                               createdAt: String(Date.now()),
                               read: false,
                               type: 'alert'
                             });
                             await addDoc(collection(db, 'transactions'), {
                                userId: auth.currentUser.uid,
                                date: String(Date.now() - 3600000),
                                amount: 2500000,
                                asset: 'USDC',
                                party: 'Treasury Vault B',
                                status: 'pending',
                                type: 'transfer'
                             });
                             alert('Data seeded successfully');
                           } catch (e) {
                             console.error('Error seeding', e);
                           }
                         }}
                         className="px-4 py-2 bg-blue-50 dark:bg-indigo-600/20 hover:bg-blue-100 dark:hover:bg-indigo-600/40 text-blue-700 dark:text-indigo-400 text-sm font-medium rounded-lg transition-colors border border-blue-200 dark:border-indigo-500/30"
                       >
                         Seed Test Data
                       </button>
                     </div>
                  </div>
                </div>
              )}

              {activeTab !== 'security' && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 dark:text-white/40">
                   <p>Configuration panel for {TABS.find(t => t.id === activeTab)?.label} is locked by Administrator policy.</p>
                </div>
              )}
           </BentoCard>
        </div>
      </div>
    </div>
  );
}
