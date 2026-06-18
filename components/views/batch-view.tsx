'use client';

import React from 'react';
import { motion } from 'motion/react';
import { BentoCard } from '@/components/ui/bento-card';
import { UploadCloud, Plus, Trash2, ShieldCheck, Cpu } from 'lucide-react';

const RECIPIENTS = [
  { id: '1', recipientId: 'EMP-014', destKey: '0x94A...B22F', vol: '12,500 USDC' },
  { id: '2', recipientId: 'VEN-882', destKey: 'GCD...44K9', vol: '104,200 XLM' },
  { id: '3', recipientId: 'EMP-112', destKey: '0x81C...90FA', vol: '8,400 USDC' },
];

export function BatchView() {
  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">Batch Transfers & Payroll Workflow</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Main Content Area */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          {/* Ingestion Dropzone */}
          <BentoCard delay={0.1} className="relative overflow-hidden group border-dashed hover:border-blue-500/50 dark:hover:border-indigo-500/50 transition-colors">
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-8 h-8 text-blue-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Drag & Drop Batch Matrix</h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-2 max-w-sm">Drop your .CSV or .JSON payroll manifest here to parse transactions automatically.</p>
              
              <div className="flex items-center gap-4 mt-8 w-full max-w-sm">
                <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
                <span className="text-xs text-slate-400 dark:text-white/30 font-mono uppercase">or</span>
                <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8 flex items-center gap-2 py-2 px-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition cursor-pointer text-slate-700 dark:text-white">
                <Plus className="w-4 h-4" /> Add Individual Recipient Line
              </motion.button>
            </div>
          </BentoCard>

          {/* Verification Grid */}
          <div className="flex flex-col gap-4">
             <h3 className="text-sm uppercase tracking-wider text-slate-500 dark:text-white/50 font-medium">Recipient Verification Grid</h3>
             <BentoCard delay={0.2} noPadding className="overflow-hidden">
               <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-slate-200 dark:border-white/10 text-xs tracking-wider text-slate-500 dark:text-white/40 bg-slate-50 dark:bg-white/[0.02]">
                       <th className="px-6 py-4 font-medium uppercase">Recipient ID</th>
                       <th className="px-6 py-4 font-medium uppercase">Dest Key</th>
                       <th className="px-6 py-4 font-medium uppercase text-right">Volume</th>
                       <th className="px-6 py-4 font-medium uppercase text-right w-16">Remove</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                     {RECIPIENTS.map(rec => (
                       <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-white/90">{rec.recipientId}</td>
                         <td className="px-6 py-4 font-mono text-xs text-blue-600 dark:text-indigo-300/80">{rec.destKey}</td>
                         <td className="px-6 py-4 font-mono text-right text-slate-900 dark:text-white">{rec.vol}</td>
                         <td className="px-6 py-4 text-right">
                           <button className="text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition p-2 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               {/* Mobile Verification Grid */}
               <div className="flex flex-col md:hidden divide-y divide-slate-100 dark:divide-white/5">
                  {RECIPIENTS.map(rec => (
                    <div key={rec.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors gap-4">
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between w-full items-start">
                          <span className="font-medium text-sm text-slate-900 dark:text-white/90">{rec.recipientId}</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{rec.vol}</span>
                        </div>
                        <span className="font-mono text-xs text-blue-600 dark:text-indigo-300/80">{rec.destKey}</span>
                      </div>
                      <button className="text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition p-2 rounded hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0">
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  ))}
               </div>
             </BentoCard>
          </div>
        </div>

        {/* Pre-Flight Run Manifest Sidebar */}
        <div className="col-span-1 h-full">
          <BentoCard delay={0.3} className="h-full flex flex-col pt-8">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
              <Cpu className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
              Pre-Flight Manifest
            </h3>

            <div className="space-y-4 flex-1">
              <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-white/60">Validated Entries</span>
                <span className="font-mono text-lg text-slate-900 dark:text-white font-bold tracking-tight">402</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-white/60">Total Outflow Volume</span>
                <span className="font-mono text-lg text-red-600 dark:text-red-400 font-bold tracking-tight">2,540,200.00</span>
              </div>
              
              <div className="mt-8">
                <h4 className="text-xs uppercase text-slate-500 dark:text-white/40 tracking-wider mb-3 font-medium">Origin Asset Ratio</h4>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                   <div className="bg-blue-600 dark:bg-indigo-500 w-[70%]" title="USDC" />
                   <div className="bg-slate-300 dark:bg-indigo-500 w-[30%]" title="XLM" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-white/40 font-mono mt-2">
                  <span>USDC (70%)</span>
                  <span>XLM (30%)</span>
                </div>
              </div>

              <div className="mt-8 p-4 border border-blue-200 dark:border-indigo-500/20 bg-blue-50 dark:bg-indigo-500/5 rounded-xl">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-700 dark:text-indigo-300/60">Estimated Gas Fee</span>
                  <span className="font-mono font-medium text-blue-800 dark:text-indigo-300">0.00041 XLM</span>
                </div>
                <p className="text-[10px] text-blue-500 dark:text-indigo-300/40">Highly optimized via Batch V2</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
               <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 text-slate-700 dark:text-white shadow-sm dark:shadow-none">
                 <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Run Verification
               </motion.button>
               <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="w-full py-3 bg-blue-600 dark:bg-[#08060D] border dark:border-indigo-500/40 hover:bg-blue-700 dark:hover:bg-indigo-900/20 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg dark:shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                 Broadcast to Signers
               </motion.button>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
