"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { mockApprovals } from "@/lib/mock-data";
import { Check, X, ShieldAlert, Key, FileText } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Multi-Signer Validation</h1>
          <p className="text-sm text-text-secondary mt-1">Governance review queue and consensus tracking.</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockApprovals.map((req, idx) => {
          const progressPercent = (req.signed / req.required) * 100;
          return (
            <BentoCard key={req.id} delay={0.1 + (idx * 0.1)} className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center w-full p-6">
              
              <div className="col-span-1 md:col-span-4 space-y-1 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase tracking-widest">Escrow Locked</span>
                </div>
                <h3 className="text-base font-medium text-text-primary">{req.purpose}</h3>
                <div className="text-xs text-text-secondary font-mono">Ref: {req.id}</div>
              </div>

              <div className="col-span-1 md:col-span-4 px-0 md:px-4 space-y-4">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm text-text-secondary">Consensus Progress</span>
                  <span className="text-sm font-mono font-medium text-text-primary">{req.signed} of {req.required} Keys</span>
                </div>
                
                <div className="relative h-2 w-full bg-surface rounded-full overflow-hidden border border-border">
                  <div 
                    className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                  {/* Threshold Markers */}
                  {Array.from({ length: req.required }).map((_, i) => (
                    <div 
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-border z-10"
                      style={{ left: `${((i + 1) / req.required) * 100}%` }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                   {Array.from({ length: req.required }).map((_, i) => (
                     <div key={i} className={`w-6 h-6 rounded flex items-center justify-center border ${i < req.signed ? 'bg-success/10 border-success/30 text-success' : 'bg-surface border-border text-text-secondary'}`}>
                       <Key className="w-3 h-3" />
                     </div>
                   ))}
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 justify-self-end w-full space-y-3">
                 <div className="text-right mb-4 border-b md:border-b-0 pb-3 md:pb-0 border-border">
                   <div className="text-xs text-text-secondary uppercase mb-1 font-semibold tracking-wider">Outbound Value</div>
                   <div className="text-xl font-bold font-mono tracking-tight text-text-primary">${req.amount.toLocaleString()}</div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                   <Button variant="success" size="sm" className="w-full text-xs" disabled={req.signed === req.required}>
                     <Check className="w-3.5 h-3.5 mr-1" /> Sign Request
                   </Button>
                   <Button variant="danger" size="sm" className="w-full text-xs">
                     <X className="w-3.5 h-3.5 mr-1" /> Nullify
                   </Button>
                   <Button variant="outline" size="sm" className="col-span-2 text-xs w-full">
                     <FileText className="w-3.5 h-3.5 mr-1" /> Inspect Context Details
                   </Button>
                 </div>
              </div>
              </div>
            </BentoCard>
          );
        })}

        {mockApprovals.length === 0 && (
          <BentoCard className="flex flex-col items-center justify-center py-16 bg-surface text-center">
             <ShieldAlert className="w-8 h-8 text-text-secondary/50 mb-3" />
             <p className="text-sm font-medium text-text-primary">No pending approvals</p>
             <p className="text-xs text-text-secondary mt-1">All multi-sig workflows have been resolved.</p>
          </BentoCard>
        )}
      </div>
    </div>
  );
}
