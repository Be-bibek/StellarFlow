"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Badge } from "@/components/ui/badge";
import { mockTransits } from "@/lib/mock-data";
import { Activity, CheckCircle2, CircleDashed, FileSearch, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const STAGES = [
  "AUTHORIZING",
  "ROUTING PIPELINE",
  "STELLAR CORE LEDGER",
  "FINAL SETTLED"
];

export default function TransitCenterPage() {
  const [activeTab, setActiveTab] = useState("All Active");

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Real-Time Transit Center</h1>
          <p className="text-sm text-text-secondary mt-1">Multi-wallet outbound sequence tracking.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border pb-2">
        {(["All Active", "Completed", "Anomalies"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="transitTabIndicator"
                className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-accent"
              />
            )}
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 border border-border bg-surface px-3 py-1.5 rounded-lg text-xs text-text-secondary cursor-pointer hover:bg-card">
          <Filter className="w-3.5 h-3.5" /> Filter Matrix
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {mockTransits.map((transit, tIdx) => (
            <BentoCard key={transit.id} delay={0.1 + (tIdx * 0.1)} className="overflow-visible relative hover:border-accent/40 transition-colors group">
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
                     <Activity className="w-5 h-5 text-accent" />
                   </div>
                   <div>
                     <div className="font-mono text-sm font-semibold text-text-primary">{transit.id}</div>
                     <div className="text-xs text-text-secondary font-mono tracking-tight">Dest: {transit.dest}</div>
                   </div>
                 </div>
                 <div className="flex items-center gap-6">
                   <div className="text-right">
                     <div className="font-mono text-lg font-bold tracking-tight text-text-primary">{transit.amount.toLocaleString()} USDC</div>
                   </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge variant="neutral" className="cursor-pointer hover:bg-border/50"><FileSearch className="w-3 h-3 mr-1"/> Inspect</Badge>
                   </div>
                 </div>
               </div>

               {/* Pipeline Tracker */}
               <div className="relative">
                 {/* Background Track Line */}
                 <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-border -translate-y-1/2 z-0" />
                 
                 {/* Active Track Line */}
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(transit.progress / (STAGES.length - 1)) * 100}%` }}
                   transition={{ duration: 1, ease: "easeOut", delay: 0.2 + (tIdx * 0.1) }}
                   className="absolute top-1/2 left-4 h-0.5 bg-accent -translate-y-1/2 z-0 origin-left"
                 />

                 <div className="flex justify-between relative z-10 w-full px-4">
                   {STAGES.map((stage, sIdx) => {
                     const isCompleted = sIdx < transit.progress;
                     const isActive = sIdx === transit.progress;
                     
                     return (
                       <div key={stage} className="flex flex-col items-center group/node relative cursor-pointer">
                         <div className={`w-4 h-4 rounded-full border-2 bg-card flex items-center justify-center transition-colors duration-500 z-10 ${
                           isCompleted ? 'border-accent bg-accent' : isActive ? 'border-accent ring-4 ring-accent/20' : 'border-border'
                         }`}>
                           {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-background" />}
                           {isActive && <CircleDashed className="w-2.5 h-2.5 text-accent animate-spin-slow" />}
                         </div>
                         <span className={`absolute top-6 whitespace-nowrap text-[9px] font-bold tracking-widest uppercase transition-colors duration-300 ${
                           isActive ? 'text-text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-secondary/50'
                         }`}>
                           {stage}
                         </span>
                         
                         {/* Glassmorphic Tooltip / Pane */}
                         <div className="absolute bottom-8 opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-none z-50 transform translate-y-2 group-hover/node:translate-y-0 duration-200">
                           <div className="glass px-3 py-2 rounded-lg border border-border shadow-xl w-48 text-left">
                              <p className="text-[10px] font-semibold text-text-primary mb-1 uppercase bg-surface inline-block px-1 rounded">{stage}</p>
                              <div className="text-[10px] space-y-0.5 font-mono text-text-secondary mt-1">
                                <p>Block: {Math.floor(Math.random() * 10000000)}</p>
                                <p>Gas: 0.0{Math.floor(Math.random() * 9)} XLM</p>
                                <p className="text-[9px] mt-1 text-text-primary opacity-80">{isActive ? 'Processing in node cluster...' : isCompleted ? `Validated securely.` : 'Awaiting propagation.'}</p>
                              </div>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
               
               <div className="h-6" /> {/* Spacing for the absolute positioned text below track */}
            </BentoCard>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
