"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { mockWallets, mockTransactions } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-4 grid-rows-[auto_1fr_auto] gap-4 h-full">
      {/* Top row */}
      <BentoCard className="col-span-2 justify-center p-6 bg-card border-border">
        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">Total Treasury Equity</span>
        <div className="flex items-baseline gap-3">
          <h2 className="text-4xl font-bold tracking-tight text-text-primary">
            $2,489,500<span className="text-text-secondary font-light">.00</span>
          </h2>
          <span className="text-success text-xs font-bold flex items-center">
            +12.4% <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </span>
        </div>
      </BentoCard>

      <BentoCard delay={0.1} className="justify-center p-5 bg-card border-border">
        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Available Cash</span>
        <span className="text-2xl font-bold mt-1 text-text-primary">$1,204,410</span>
        <div className="h-1 bg-border rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-success w-[62%]"></div>
        </div>
      </BentoCard>

      <BentoCard delay={0.2} className="justify-center p-5 bg-card border-border">
        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Spending Velocity</span>
        <span className="text-2xl font-bold mt-1 text-danger">
          $42.8k<span className="text-xs text-text-secondary font-normal">/day</span>
        </span>
        <div className="h-1 bg-border rounded-full mt-3 overflow-hidden">
          <div className="h-full bg-danger w-[88%]"></div>
        </div>
      </BentoCard>

      {/* Middle Grid */}
      <BentoCard delay={0.3} className="justify-between group hover:border-accent/30 cursor-pointer transition-all p-5">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center text-accent">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Active</span>
        </div>
        <div>
          <h4 className="text-sm font-bold mt-4 text-text-primary">Payroll Wallet</h4>
          <p className="text-xs text-text-secondary">Master Liquidity Pool</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-text-primary">
          <span className="text-lg font-bold">$840,200</span>
          <svg width="40" height="20" className="text-success"><path d="M0 15 Q 10 5, 20 12 T 40 8" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
      </BentoCard>

      <BentoCard delay={0.4} className="justify-between group hover:border-accent/30 cursor-pointer transition-all p-5">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded bg-warning/10 flex items-center justify-center text-warning">
             <Lock className="w-4 h-4" />
          </div>
          <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Locked</span>
        </div>
        <div>
          <h4 className="text-sm font-bold mt-4 text-text-primary">Operation Hub</h4>
          <p className="text-xs text-text-secondary">Global Logistics Cap</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-text-primary">
          <span className="text-lg font-bold">$120,500</span>
          <svg width="40" height="20" className="text-warning"><path d="M0 10 Q 15 10, 20 5 T 40 18" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
      </BentoCard>

      <BentoCard delay={0.5} className="justify-between group hover:border-accent/30 cursor-pointer transition-all p-5">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center text-accent">
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Active</span>
        </div>
        <div>
          <h4 className="text-sm font-bold mt-4 text-text-primary">Marketing Reserve</h4>
          <p className="text-xs text-text-secondary">AdSpend Multi-Sig</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-text-primary">
          <span className="text-lg font-bold">$210,000</span>
          <svg width="40" height="20" className="text-success"><path d="M0 18 L 10 12 L 20 15 L 40 2" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
      </BentoCard>

      <BentoCard delay={0.6} className="justify-between group hover:border-accent/30 cursor-pointer transition-all p-5">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded bg-danger/10 flex items-center justify-center text-danger">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] bg-danger/10 text-danger px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">Review</span>
        </div>
        <div>
          <h4 className="text-sm font-bold mt-4 text-text-primary">Emergency Vault</h4>
          <p className="text-xs text-text-secondary">Protocol Backup</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-text-primary">
          <span className="text-lg font-bold">$50,000</span>
          <svg width="40" height="20" className="text-border"><path d="M0 10 H 40" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </div>
      </BentoCard>

      {/* Activity Bar */}
      <BentoCard delay={0.7} className="col-span-4 p-6 overflow-hidden flex flex-col justify-start min-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary">Live Treasury Activity</h3>
          <div className="flex gap-2">
            <span className="text-[10px] text-text-secondary hover:text-text-primary cursor-pointer transition-colors px-2 py-1 uppercase font-bold tracking-widest">Recent</span>
            <span className="text-[10px] text-text-secondary hover:text-text-primary cursor-pointer transition-colors px-2 py-1 uppercase font-bold tracking-widest">Pending</span>
            <span className="text-[10px] text-text-primary bg-border rounded px-2 py-1 uppercase font-bold tracking-widest">All</span>
          </div>
        </div>
        
        <div className="space-y-3 overflow-y-auto pr-2 pb-4 h-[250px]">
          <div className="flex items-center justify-between p-3 bg-white/5 border border-border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-success">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">Batch Payroll Execution #8492</p>
                <p className="text-[10px] text-text-secondary mt-0.5">to 42 Recipients • 2 mins ago</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-text-primary">$24,000.00</span>
              <div className="flex gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span className="w-2 h-2 rounded-full bg-success"></span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 border border-border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-accent">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">Treasury Rebalance • Ops → Reserve</p>
                <p className="text-[10px] text-text-secondary mt-0.5">via Smart Router • 1 hour ago</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-warning">$150,000.00</span>
              <div className="flex gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                <span className="w-2 h-2 rounded-full bg-white/10"></span>
                <span className="w-2 h-2 rounded-full bg-white/10"></span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 border border-border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-danger">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">Security Lock: Marketing Wallet</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Automated Compliance Trigger • 4 hours ago</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-danger">PERMISSION DENIED</span>
              <span className="text-[8px] uppercase font-bold tracking-widest mt-1 text-danger">Err: Core_Access_02</span>
            </div>
          </div>
        </div>
      </BentoCard>
    </div>
  );
}
