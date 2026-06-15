"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Route, Lock, ArrowRight, GitMerge, RotateCcw, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function SmartRoutingPage() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [urgency, setUrgency] = useState<"Economy"|"Balanced"|"Instant">("Balanced");
  const [targetAddress, setTargetAddress] = useState("");
  const [hasError, setHasError] = useState(false);

  const handleSimulate = () => {
    if (!targetAddress.startsWith("G") || targetAddress.length < 5) {
      setHasError(true);
      return;
    }
    setHasError(false);
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1500);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Smart Routing Center</h1>
          <p className="text-sm text-text-secondary mt-1">Capital Split Visualizer & Optimal Payment Router.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Hand: Configuration Block */}
        <div className="lg:col-span-4 space-y-4">
          <BentoCard delay={0.1} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-border pb-3 uppercase tracking-widest">
                <Route className="w-4 h-4 text-accent" /> Routing Parameters
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Recipient Core Target</label>
                <Input 
                  value={targetAddress}
                  onChange={(e) => { setTargetAddress(e.target.value); setHasError(false); }}
                  placeholder="Enter Stellar Address (G...)" 
                  className={`font-mono text-sm ${hasError ? 'border-danger/50 focus:ring-danger/30' : ''}`} 
                />
                {hasError && (
                  <p className="text-[10px] text-danger flex items-center gap-1 mt-1 font-bold uppercase tracking-widest">
                    <AlertCircle className="w-3 h-3" /> Invalid Core Target Format
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total Liquidity Volume (USDC)</label>
                <Input type="number" placeholder="0.00" className="text-lg font-bold font-mono tracking-tight" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Transaction Urgency</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Economy", "Balanced", "Instant"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setUrgency(level)}
                      className={`py-2 px-1 text-[10px] uppercase font-bold tracking-widest rounded-lg border text-center transition-all ${
                        urgency === level 
                        ? "bg-accent/10 border-accent text-accent shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]" 
                        : "bg-surface border-border text-text-secondary hover:bg-card"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-border">
              <Button 
                onClick={handleSimulate} 
                className="w-full" 
                isLoading={isSimulating}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Simulate Optimal Path
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-1" /> Lock Sourcing</Button>
                <Button variant="secondary" className="text-[10px] text-success border-success/20 hover:bg-success/10"><Activity className="w-3 h-3 mr-1" /> Execute Route</Button>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Right Hand: Visualizer */}
        <div className="lg:col-span-8 space-y-4">
          <BentoCard delay={0.2} className="h-full min-h-[500px] flex flex-col items-center justify-center relative bg-surface p-0 overflow-hidden border-border border">
             
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-100" />
            
            {!isSimulating ? (
              <div className="z-10 w-full max-w-2xl px-8 py-8 h-full">
                <h3 className="text-[10px] font-bold text-text-secondary mb-8 text-left border-b border-border pb-3 uppercase tracking-widest flex items-center gap-2">
                  <GitMerge className="w-4 h-4" /> Aggregated Path Map Output
                </h3>
                
                <div className="flex flex-col gap-8">
                  {/* Sources Column */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg relative group hover:border-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-sm text-text-secondary">#1</div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">Payroll Vault</div>
                          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">Sourcing 60%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm tracking-tight font-bold text-text-primary">300,000.00 USDC</div>
                      </div>
                      {/* Connecting Line Vector */}
                      <div className="absolute top-1/2 -right-12 w-12 h-px bg-white/10 flex items-center justify-end">
                        <ArrowRight className="w-3 h-3 text-white/30 translate-x-1" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg relative group hover:border-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-sm text-text-secondary">#2</div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">Marketing Vault</div>
                          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">Sourcing 30%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm tracking-tight font-bold text-text-primary">150,000.00 USDC</div>
                      </div>
                      <div className="absolute top-1/2 -right-12 w-12 h-px bg-white/10 flex items-center justify-end">
                        <ArrowRight className="w-3 h-3 text-white/30 translate-x-1" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-lg relative group hover:border-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center font-bold text-sm text-text-secondary">#3</div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">Buffer Vault</div>
                          <div className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-1">Sourcing 10%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm tracking-tight font-bold text-text-primary">50,000.00 USDC</div>
                      </div>
                      <div className="absolute top-1/2 -right-12 w-12 h-px bg-white/10 flex items-center justify-end">
                        <ArrowRight className="w-3 h-3 text-white/30 translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center justify-center mt-4 border-t border-border/50 pt-8">
                    <div className="flex items-center gap-4 bg-accent/10 border border-accent/20 p-6 rounded-2xl w-full max-w-sm justify-between shadow-[0_0_40px_-5px_rgba(59,130,246,0.15)]">
                      <div>
                        <div className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1.5">Target Compiled</div>
                        <div className="font-mono text-sm font-semibold text-text-primary">{targetAddress || "GHIJ...88KL"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-accent font-mono tracking-tight">500,000.00</div>
                        <div className="text-[10px] text-accent/70 mt-1 uppercase font-bold tracking-widest">Est. Gas: 0.001 XLM</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
               <div className="flex flex-col items-center justify-center z-10 w-full h-full absolute inset-0 bg-surface/50 backdrop-blur-sm">
                 <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mb-5 shadow-2xl shadow-accent/10">
                   <Activity className="w-7 h-7 text-accent animate-pulse" />
                 </div>
                 <p className="text-[10px] font-bold text-text-primary uppercase tracking-widest animate-pulse">Calculating Optimal Path...</p>
               </div>
            )}
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
