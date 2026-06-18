'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { ShieldAlert, CheckCircle, XCircle, FileText, KeyRound } from 'lucide-react';

const QUEUE = [
  { id: '1', origin: 'Strategic Reserve', dest: 'Op Layer 1', amount: '1,500,000.00 USDC', conf: 2, req: 4, status: 'Awaiting Your Signature', urgency: 'High' },
  { id: '2', origin: 'Payroll Global', dest: 'Batch Spool', amount: '214,000.00 XLM', conf: 1, req: 2, status: 'Awaiting Others', urgency: 'Normal' },
  { id: '3', origin: 'Treasury Core 01', dest: 'Cold Storage', amount: '5.240 BTC', conf: 3, req: 5, status: 'Awaiting Your Signature', urgency: 'Critical' }
];

export function MultiSigView() {
  const [selectedId, setSelectedId] = useState<string>(QUEUE[0].id);

  const active = QUEUE.find(q => q.id === selectedId) || QUEUE[0];

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">Multi-Signer Approval Tracker</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Review, validate, and cryptographically sign outbound volume requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full pb-10">
        
        {/* Left Hand: Queue */}
        <div className="flex flex-col gap-4">
           {QUEUE.map((item, idx) => (
             <BentoCard 
               key={item.id} 
               delay={0.1 + (idx * 0.05)}
               onClick={() => setSelectedId(item.id)}
               className={`cursor-pointer transition-all duration-300 ${
                 selectedId === item.id ? 'border-blue-500/50 dark:border-indigo-500/50 bg-blue-50 dark:bg-indigo-500/5 shadow-[0_0_20px_rgba(197,160,89,0.1)] dark:shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'hover:bg-slate-50 dark:hover:bg-white/5'
               }`}
             >
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">Outbound Transit Request</div>
                   <div className="font-mono text-xl text-slate-900 dark:text-white">{item.amount}</div>
                 </div>
                 {item.urgency === 'Critical' && (
                   <span className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20 px-2 py-1 rounded text-xs animate-pulse font-medium">CRITICAL</span>
                 )}
               </div>

               <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/70 mb-4">
                  <span className="font-medium text-slate-900 dark:text-white">{item.origin}</span>
                  <span className="text-slate-400 dark:text-white/30">→</span>
                  <span className="font-medium text-slate-900 dark:text-white">{item.dest}</span>
               </div>

               <div className="flex items-center justify-between text-xs font-medium">
                  <span className={item.status.includes('Your') ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 dark:text-white/40'}>{item.status}</span>
                  <span className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded flex items-center gap-1 font-mono text-slate-700 dark:text-white border border-slate-200 dark:border-transparent">
                    <KeyRound className="w-3 h-3 text-slate-500 dark:text-white" /> {item.conf} / {item.req} Confirmed
                  </span>
               </div>
             </BentoCard>
           ))}
        </div>

        {/* Right Hand: Decision Engine Interface */}
        <BentoCard delay={0.3} className="h-fit flex flex-col relative overflow-hidden">
           {/* Glass Accents */}
           <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-100 dark:bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

           <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-indigo-500/10 border border-blue-200 dark:border-indigo-500/30 flex items-center justify-center">
                 <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium tracking-tight text-slate-900 dark:text-white">Consensus Approval Engine</h3>
                <p className="text-sm text-slate-500 dark:text-white/50">Cryptographic hardware key required.</p>
              </div>
           </div>

           {/* Metrics */}
           <div className="flex flex-col gap-6 mb-8">
              <div>
                 <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">Signature Status: {active.conf} of {active.req} Confirmed</div>
                 <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden flex">
                    {Array.from({ length: active.req }).map((_, i) => (
                      <div key={i} className={`flex-1 ${i > 0 ? 'border-l border-white dark:border-[#040208]' : ''} ${i < active.conf ? 'bg-blue-600 dark:bg-purple-500' : 'bg-transparent'}`} />
                    ))}
                 </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 mt-2">
                 <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-500 dark:text-white/50">Requested Volume</span>
                    <span className="font-mono text-slate-900 dark:text-white tracking-tight font-medium">{active.amount}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-500 dark:text-white/50">Execution Route</span>
                    <span className="text-slate-900 dark:text-white tracking-tight font-medium">{active.origin} ➝ {active.dest}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-white/50">Network Gas (Est)</span>
                    <span className="font-mono text-slate-400 dark:text-white/50 tracking-tight">0.00411 XLM</span>
                 </div>
              </div>
           </div>

           {/* Decision Buttons */}
           <div className="flex flex-col gap-3">
              <motion.button 
                whileHover={{ scale: 1.02, y: -1 }} 
                whileTap={{ scale: 0.98 }} 
                className="w-full py-3.5 bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-500 rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg dark:shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-blue-500 dark:border-indigo-400/50 text-white"
              >
                <CheckCircle className="w-5 h-5" /> Approve & Sign Transaction
              </motion.button>

              <div className="grid grid-cols-2 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-700 hover:text-red-600 dark:text-white/70 dark:hover:text-red-400 border border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/30 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm dark:shadow-none">
                  <XCircle className="w-4 h-4" /> Reject & Nullify
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="py-3 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 text-slate-700 dark:text-white/70 shadow-sm dark:shadow-none">
                  <FileText className="w-4 h-4" /> Inspect Security Context
                </motion.button>
              </div>
           </div>
        </BentoCard>
      </div>
    </div>
  );
}
