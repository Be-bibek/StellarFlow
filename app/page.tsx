"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { motion } from "motion/react";
import { Settings, Bell, CheckSquare, Archive, Search, Inbox, Moon, MessageSquare, Zap, Network, Shield, Fingerprint, Lock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-[1240px] mx-auto w-full h-full pb-20 relative">
      <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[440px] gap-6">
        
        {/* Card 1: Actions */}
        <BentoCard delay={0.1} className="md:col-span-4 p-0">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-[300px]">
             {/* Abstract background gradient */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             
             {/* Floating Glass Component */}
             <motion.div 
               animate={{ y: [-5, 5, -5] }}
               transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
               className="relative z-10 w-[220px] bg-white/80 dark:bg-[#110C1A]/80 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
             >
               <div className="h-8 border-b border-black/5 dark:border-white/5 flex items-center px-4 justify-between">
                 <div className="flex gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                   <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                   <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                 </div>
                 <div className="flex items-center gap-3">
                   <Settings className="w-3 h-3 text-text-primary/40" />
                   <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                 </div>
               </div>
               <div className="p-3 space-y-1">
                 <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/5 dark:bg-white/5 text-text-primary/70">
                   <CheckSquare className="w-3.5 h-3.5" />
                   <span className="text-xs">Approve all transactions</span>
                 </div>
                 <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/5 dark:bg-white/5 text-text-primary/70">
                   <Lock className="w-3.5 h-3.5" />
                   <span className="text-xs">Lock liquidity pools</span>
                 </div>
                 <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-black/10 dark:bg-white/10 text-text-primary shadow-inner relative overflow-visible border border-black/5 dark:border-white/5">
                   <Archive className="w-3.5 h-3.5 text-purple-400" />
                   <span className="text-xs font-medium">Archive settled</span>
                   
                   {/* Cursor pointer visual */}
                   <motion.div 
                     initial={{ opacity: 0, x: 20, y: 20 }}
                     animate={{ opacity: 1, x: 0, y: 0 }}
                     transition={{ delay: 1 }}
                     className="absolute -right-4 -bottom-6 flex flex-col items-start z-50"
                   >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl scale-x-[-1]">
                       <path d="M4 4L9.5 21L12.5 14L19.5 11L4 4Z" className="fill-white dark:fill-white stroke-black dark:stroke-black" strokeWidth="1.5" strokeLinejoin="round"/>
                     </svg>
                     <div className="bg-yellow-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-md ml-2 mt-[-2px] shadow-lg">
                       Administrator
                     </div>
                   </motion.div>
                 </div>
               </div>
             </motion.div>
          </div>
          <div className="p-6 mt-auto">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">Quick Actions</h3>
            <p className="text-sm text-text-primary/50 mt-2 leading-relaxed font-light">Streamline treasury management with bulk actions like marking approvals or archiving settled ledgers.</p>
          </div>
        </BentoCard>

        {/* Card 2: Bell */}
        <BentoCard delay={0.2} className="md:col-span-4 p-0">
          <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden w-full h-[300px]">
             {/* Center glowing rings */}
             <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full border border-yellow-400/40 w-20 h-20 -ml-10 -mt-10" />
                <motion.div animate={{ scale: [1, 2.5], opacity: [0.3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="absolute inset-0 rounded-full border border-yellow-400/20 w-20 h-20 -ml-10 -mt-10" />
             </div>
             
             {/* Floating Bell */}
             <div className="relative mt-8 mb-6">
                <div className="w-14 h-14 rounded-full bg-card dark:bg-[#1A1525] border border-yellow-400/20 shadow-[0_0_40px_rgba(250,204,21,0.15)] flex items-center justify-center z-20 relative">
                  <Bell className="w-6 h-6 text-yellow-400 drop-shadow-md" />
                  <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[9px] font-bold border-2 border-[#1A1525]">1</div>
                </div>
             </div>

             {/* Floating Glass Component */}
             <motion.div 
               animate={{ y: [-3, 3, -3] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="relative z-10 w-[260px] bg-white/60 dark:bg-[#110C1A]/60 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4 mt-4"
             >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-text-primary font-medium">Live Alerts</span>
                  <span className="text-[10px] text-text-primary/30 hover:text-text-primary/70 cursor-pointer transition-colors">Clear all</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-black/5 dark:bg-white/5 border border-black/[0.05] dark:border-white/[0.05] rounded-lg p-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                    <span className="text-xs text-text-primary/80">Liquidity threshold triggered</span>
                  </div>
                  <div className="bg-black/5 dark:bg-white/5 border border-black/[0.05] dark:border-white/[0.05] rounded-lg p-3 flex items-center gap-3 opacity-50">
                    <div className="w-2 h-2 rounded-full border border-white/30" />
                    <span className="text-xs text-text-primary/70">Daily settlement finished</span>
                  </div>
                </div>
             </motion.div>
          </div>
          <div className="p-6 mt-auto">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">Active Sonar</h3>
            <p className="text-sm text-text-primary/50 mt-2 leading-relaxed font-light">A recognizable alert indicator, notifying users to new settlements or multi-sig updates in real time.</p>
          </div>
        </BentoCard>

        {/* Card 3: Easy to embed */}
        <BentoCard delay={0.3} className="md:col-span-4 p-0">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-[300px]">
             {/* Abstract light */}
             <div className="absolute top-0 right-1/4 w-40 h-[400px] bg-blue-500/10 rotate-45 blur-3xl translate-x-1/2 -translate-y-1/4" />
             
             {/* Floating Glass Component */}
             <motion.div 
               animate={{ y: [-4, 4, -4] }}
               transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
               className="relative z-10 w-[240px] h-[180px] bg-white/80 dark:bg-[#110C1A]/80 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex overflow-hidden"
             >
                {/* Sidebar */}
                <div className="w-14 bg-black/[0.02] dark:bg-white/[0.02] border-r border-black/5 dark:border-white/5 flex flex-col items-center py-4 gap-5">
                   <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                     <Zap className="w-4 h-4 text-text-primary" />
                   </div>
                   <Search className="w-4 h-4 text-text-primary/30 hover:text-text-primary/70 mt-2" />
                   <Bell className="w-4 h-4 text-text-primary/30 hover:text-text-primary/70" />
                   <CheckSquare className="w-4 h-4 text-text-primary/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                   <MessageSquare className="w-4 h-4 text-text-primary/30 hover:text-text-primary/70" />
                </div>
                {/* Main area */}
                <div className="flex-1 p-4 flex flex-col text-left justify-center">
                  <h4 className="text-sm text-text-primary font-medium mb-4 tracking-tight">Your Inbox</h4>
                  <div className="space-y-3 w-full">
                    <div className="h-4 w-full bg-black/10 dark:bg-white/10 rounded-md" />
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-black/5 dark:bg-white/5" />
                      <div className="h-3 w-20 bg-black/5 dark:bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
          <div className="p-6 mt-auto">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">API Integrated</h3>
            <p className="text-sm text-text-primary/50 mt-2 leading-relaxed font-light">Switch effortlessly between the centralized Master Ledger and the deployed routing logic.</p>
          </div>
        </BentoCard>

        {/* Card 4: Preferences */}
        <BentoCard delay={0.4} className="md:col-span-5 p-0">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-[300px]">
             {/* Diagonal flare matching image */}
             <div className="absolute top-0 left-1/4 w-64 h-[500px] bg-purple-500/20 rotate-[45deg] blur-3xl -translate-y-1/4" />
             
             {/* Floating Glass Component */}
             <motion.div 
               animate={{ y: [-5, 5, -5] }}
               transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
               className="relative z-10 w-[320px] bg-white/70 dark:bg-[#110C1A]/70 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden"
             >
               <div className="flex items-center justify-between mb-5">
                 <div className="flex items-center gap-3">
                   <div className="w-6 h-6 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-md flex items-center justify-center shadow-lg">
                     <Shield className="w-3.5 h-3.5 text-text-primary" />
                   </div>
                   <span className="text-sm font-medium text-text-primary/90">Protocol Settings</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <Moon className="w-4 h-4 text-text-primary/40" />
                   <MessageSquare className="w-4 h-4 text-text-primary/40" />
                 </div>
               </div>
               
               <div className="bg-surface/60 dark:bg-[#1A1423]/60 border border-black/5 dark:border-white/5 rounded-xl p-4 backdrop-blur-md">
                 <h5 className="text-xs text-text-primary/90 font-medium mb-1">Authorization Triggers</h5>
                 <p className="text-[10px] text-text-primary/40 mb-4 font-light">Multi-Sig, Time-Lock, Limit, Cold-Storage</p>
                 
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <Fingerprint className="w-4 h-4 text-text-primary/50" />
                       <span className="text-xs text-text-primary/80">Biometric Sign</span>
                     </div>
                     <div className="w-8 h-4 bg-purple-500 rounded-full relative shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
                     </div>
                   </div>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <Inbox className="w-4 h-4 text-text-primary/30" />
                       <span className="text-xs text-text-primary/50">Hardware Key</span>
                     </div>
                     <div className="w-8 h-4 bg-black/10 dark:bg-white/10 rounded-full relative">
                        <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white/40 rounded-full" />
                     </div>
                   </div>
                 </div>
               </div>
             </motion.div>
          </div>
          <div className="p-6 mt-auto">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">Security Preferences</h3>
            <p className="text-sm text-text-primary/50 mt-2 leading-relaxed font-light">Allows protocol administrators to customize how and when they authorize transactions, ensuring a tailored, sovereign security experience.</p>
          </div>
        </BentoCard>

        {/* Card 5: Notification Center */}
        <BentoCard delay={0.5} className="md:col-span-7 p-0">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-[300px]">
             {/* Right side glow */}
             <div className="absolute top-0 right-0 w-80 h-[400px] bg-blue-400/10 blur-[80px] translate-x-1/4" />
             
             {/* Left pill */}
             <motion.div 
               animate={{ x: [-2, 2, -2] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute left-[8%] top-1/3 z-20 flex items-center gap-2 bg-surface/90 dark:bg-[#1A1423]/90 border border-black/10 dark:border-white/10 px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl"
             >
               <div className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                 <Network className="w-3 h-3 text-text-primary/70" />
               </div>
               <span className="text-xs text-text-primary/90 font-medium">Ledger Engine</span>
             </motion.div>

             {/* Connecting lines */}
             <svg className="absolute left-0 top-0 w-full h-full z-10 pointer-events-none opacity-40">
               {/* Main path */}
               <path d="M 180 120 L 300 120 L 300 180 L 400 180" fill="none" stroke="url(#gradient-line)" strokeWidth="1.5" strokeDasharray="4 4" />
               <path d="M 180 120 L 240 120 L 240 240 L 400 240" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
               <circle cx="300" cy="120" r="4" fill="#FBBF24" className="drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
               <circle cx="240" cy="240" r="4" fill="#FBBF24" className="drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
               
               <defs>
                 <linearGradient id="gradient-line" x1="0" y1="0" x2="1" y2="0">
                   <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                   <stop offset="100%" stopColor="rgba(59,130,246,0.8)" />
                 </linearGradient>
               </defs>
             </svg>
             
             {/* Floating Glass Component - Right side */}
             <motion.div 
               animate={{ y: [-4, 4, -4] }}
               transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="absolute right-[8%] top-[15%] z-20 w-[300px] bg-card/80 dark:bg-[#0A0E1A]/80 backdrop-blur-3xl border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_0_60px_rgba(59,130,246,0.15)] overflow-hidden"
             >
               <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                 <div className="flex items-center gap-1.5">
                   <span className="text-sm font-bold text-text-primary tracking-tight">Inbox</span>
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary/40"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
                 <div className="flex gap-3 text-[10px] text-text-primary/50 font-medium tracking-wide">
                   <span className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer flex items-center">View All <span className="bg-yellow-400/20 text-yellow-400 px-1 rounded ml-1">21</span></span>
                   <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center">Mentions <span className="bg-black/10 dark:bg-white/10 px-1 rounded ml-1 text-text-primary">3</span></span>
                 </div>
               </div>
               <div className="p-2 space-y-1 bg-gradient-to-b from-white/5 to-transparent h-full pb-6">
                 <div className="flex items-start gap-3 p-3 hover:bg-black/[0.04] dark:bg-white/[0.04] rounded-xl transition-colors cursor-pointer">
                   <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                      <img src="https://picsum.photos/seed/avatar1/30" alt="avatar" className="w-full h-full object-cover opacity-80" />
                   </div>
                   <div>
                     <p className="text-xs text-text-primary/90 leading-relaxed font-light">
                       <span className="font-semibold text-text-primary">Dr. Gilberto Botsford</span> mentioned you in a transaction.
                     </p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3 p-3 hover:bg-black/[0.04] dark:bg-white/[0.04] rounded-xl transition-colors cursor-pointer">
                   <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                     <img src="https://picsum.photos/seed/avatar2/30" alt="avatar" className="w-full h-full object-cover opacity-80" />
                   </div>
                   <div>
                     <p className="text-xs text-text-primary/60 leading-relaxed font-light">
                       <span className="font-semibold text-text-primary/80">Sonya Ryan</span> joined to the new project.
                     </p>
                   </div>
                 </div>
               </div>
               
               <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-card dark:from-[#0A0E1A] to-transparent pointer-events-none" />
             </motion.div>
          </div>
          <div className="p-6 mt-auto">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">Ledger Hub Feed</h3>
            <p className="text-sm text-text-primary/50 mt-2 leading-relaxed font-light">The Hub feed delivers live operational updates to users concerning the core network. They can be parsed, filtered, and signed with specific on-chain triggers to suit governance needs.</p>
          </div>
        </BentoCard>

      </div>
    </div>
  );
}
