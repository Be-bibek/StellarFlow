"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUp, FilePlus, Play, CheckCircle2, Trash2, Cpu } from "lucide-react";
import { useState } from "react";

export default function BatchTransfersPage() {
  const [entries, setEntries] = useState([
    { id: 1, recipientId: "EMP-001", address: "GAHX...9P2Z", amount: 12500.00, ccy: "USDC" },
    { id: 2, recipientId: "EMP-002", address: "GBCP...J1LK", amount: 9400.00, ccy: "USDC" },
    { id: 3, recipientId: "EMP-003", address: "GCY1...Q8MN", amount: 15200.50, ccy: "USDC" },
  ]);

  const totalOutflow = entries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Batch Transfers & Payroll</h1>
          <p className="text-sm text-text-secondary mt-1">CSV Bulk Ingestion and Validation Engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Workspace Table Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <BentoCard delay={0.1} className="border-dashed border-2 bg-surface hover:bg-card transition-colors cursor-pointer group p-0">
            <div className="flex flex-col items-center justify-center p-10 h-full w-full">
            <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border border-border group-hover:scale-110 transition-transform mb-4">
              <FileUp className="w-5 h-5 text-text-secondary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Drag and drop CSV matrix file</p>
            <p className="text-xs text-text-secondary mb-4">or click to browse local files (Max 5MB)</p>
            <Button variant="outline" size="sm">
              <FilePlus className="w-4 h-4 mr-2" /> Add Individual Line
            </Button>
            </div>
          </BentoCard>

          <BentoCard delay={0.2} className="p-0 overflow-hidden bg-card border-border shadow-sm flex-1">
             <div className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between">
               <span className="text-sm font-semibold flex items-center gap-2 text-text-primary">
                 Recipient Verification Grid
               </span>
               <Badge variant="neutral">3 Validated Rows</Badge>
             </div>
             <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="py-3 px-5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Recipient ID</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Destination Key</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider text-right">Volume</th>
                  <th className="py-3 px-5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-5 text-sm font-medium">{entry.recipientId}</td>
                    <td className="py-3 px-5 text-xs font-mono text-text-secondary">{entry.address}</td>
                    <td className="py-3 px-5 text-sm font-mono text-right font-semibold">
                      {entry.amount.toLocaleString()} <span className="text-text-secondary text-xs">{entry.ccy}</span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger hover:bg-danger/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BentoCard>
        </div>

        {/* Pre-Flight Sidebar */}
        <div className="lg:col-span-4">
          <BentoCard delay={0.3} className="sticky top-24 bg-surface p-0">
             <div className="space-y-6 p-6">
             <div className="border-b border-border pb-4">
               <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-success" /> Pre-Flight Run Manifest
               </h3>
             </div>

             <div className="space-y-4">
               <div className="flex justify-between items-center text-sm">
                 <span className="text-text-secondary">Validated Entries</span>
                 <span className="font-mono font-medium">{entries.length}</span>
               </div>
               <div className="flex justify-between items-center text-sm border-b border-border/50 pb-4">
                 <span className="text-text-secondary">Network Gas Fee (Est.)</span>
                 <span className="font-mono text-text-secondary text-xs tracking-tight">{0.0001 * entries.length} XLM</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium text-text-primary">Sum Total Outflow</span>
                 <span className="text-xl font-bold font-mono tracking-tight text-accent">
                   {totalOutflow.toLocaleString()} <span className="text-sm">USDC</span>
                 </span>
               </div>
             </div>

             <div className="pt-6 space-y-3">
               <Button className="w-full" variant="outline">
                 <Cpu className="w-4 h-4 mr-2" /> Run Cryptographic Verification
               </Button>
               <Button className="w-full" variant="secondary">
                 Compile Transaction Batch
               </Button>
               <Button className="w-full shadow-lg shadow-accent/20">
                 <Play className="w-4 h-4 mr-2" /> Broadcast to Signers
               </Button>
             </div>
             </div>
          </BentoCard>
        </div>

      </div>
    </div>
  );
}
