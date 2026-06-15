"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockWallets } from "@/lib/mock-data";
import { Plus, Link as LinkIcon, Download, Search, MoreHorizontal } from "lucide-react";

export default function TreasuryCenterPage() {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Master Treasury Center</h1>
          <p className="text-sm text-text-secondary mt-1">Global Asset Ledger and Provision Controls.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="secondary" size="sm">
            <LinkIcon className="w-4 h-4 mr-2" /> Link Core
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Wallet
          </Button>
        </div>
      </div>

      <BentoCard delay={0.1} className="p-0 overflow-hidden bg-surface py-0 border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between content-center bg-card">
           <div className="flex items-center gap-4 w-96">
              <div className="relative w-full group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" />
                <input 
                  type="text" 
                  placeholder="Query ledger..." 
                  className="w-full h-9 bg-surface border border-border rounded-full pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/50 transition-all"
                />
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium uppercase tracking-widest">Total Active: 4 Nodes</span>
           </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Wallet Identity</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Core Asset Class</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Real-Time Balance</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Vault Security</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Operational Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {mockWallets.map((w, i) => (
                <tr key={w.id} className="hover:bg-card/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary text-sm">{w.name}</span>
                      <span className="text-xs font-mono text-text-secondary">{w.address}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                     <span className="bg-background px-2 py-1 rounded text-xs font-mono border border-border">{w.type}</span>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-sm font-bold text-text-primary tracking-tight">
                    {w.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        <div className={`w-1.5 h-3 rounded-full ${w.security === 'High' || w.security === 'Maximum' ? 'bg-accent' : 'bg-border'}`}></div>
                        <div className={`w-1.5 h-3 rounded-full ${w.security === 'High' || w.security === 'Maximum' ? 'bg-accent' : w.security === 'Standard' ? 'bg-border' : 'bg-border'}`}></div>
                        <div className={`w-1.5 h-3 rounded-full ${w.security === 'Maximum' ? 'bg-accent' : 'bg-border'}`}></div>
                      </div>
                      <span className="text-[10px] text-text-secondary ml-1 uppercase font-bold tracking-widest">{w.security}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={w.status === 'Active' ? 'success' : w.status === 'Locked' ? 'danger' : 'warning'}>
                      {w.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-border">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </div>
  );
}
