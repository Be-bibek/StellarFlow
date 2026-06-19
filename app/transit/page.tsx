"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/ui/bento-card";
import { motion } from "motion/react";
import { Activity, ArrowRight, CircleDot, ServerOff, CheckCircle2 } from "lucide-react";

const nodes = [
  { id: "source", label: "Master Liquidity Pool", state: "active" },
  { id: "node-1", label: "Verification Node Alpha", state: "processing" },
  { id: "node-2", label: "Consensus Node Beta", state: "pending" },
  { id: "destination", label: "Operation Hub", state: "pending" },
];

export default function TransitCenterPage() {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev < nodes.length - 1 ? prev + 1 : 0));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Transit UI</h1>
          <p className="text-sm text-text-secondary mt-2">Real-time asset flow across the ledger network.</p>
        </div>
      </div>

      <BentoCard delay={0.1} className="h-[600px] flex flex-col justify-center items-center relative overflow-hidden">
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-100" />
        
        <div className="relative z-10 w-full max-w-4xl px-8 flex justify-between items-center">
          {nodes.map((node, i) => {
            const isActive = i === activeNode;
            const isCompleted = i < activeNode;
            const isPending = i > activeNode;

            return (
              <div key={node.id} className="flex items-center relative">
                <div className="flex flex-col items-center relative z-20">
                  {/* Outer glowing ring for active state */}
                  {isActive && (
                    <motion.div
                      layoutId="active-ring"
                      className="absolute inset-0 -m-4 rounded-full border border-accent/30 bg-accent/5 backdrop-blur-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                  )}
                  
                  {/* Node Circle */}
                  <motion.div 
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-xl backdrop-blur-xl relative z-10 ${
                      isActive 
                      ? "bg-accent/20 border-accent text-accent shadow-[0_0_40px_-5px_rgba(59,130,246,0.3)]" 
                      : isCompleted
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-surface border-border text-text-secondary"
                    }`}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -5 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center inner-shadow ${isActive ? 'bg-accent/20' : 'bg-transparent'}`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : isActive ? <Activity className="w-5 h-5 animate-pulse" /> : <CircleDot className="w-5 h-5 opacity-50" />}
                    </div>
                  </motion.div>

                  <div className="mt-6 text-center absolute top-full w-40">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-accent' : isCompleted ? 'text-success' : 'text-text-secondary'}`}>
                      {node.label}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1 font-mono">
                      {isActive ? "Processing..." : isCompleted ? "Verified" : "Waiting"}
                    </p>
                  </div>
                </div>

                {/* Connecting Line */}
                {i < nodes.length - 1 && (
                  <div className="w-[120px] lg:w-[180px] h-1 mx-4 relative bg-border rounded-full overflow-hidden">
                    {/* Animated asset pulse along the path */}
                    {(isActive || isCompleted) && (
                      <motion.div
                        className={`absolute inset-y-0 left-0 ${isCompleted ? 'bg-success/50' : 'bg-accent'} rounded-full`}
                        initial={{ width: "0%" }}
                        animate={{ width: isCompleted ? "100%" : "30%" }}
                        transition={{ 
                          duration: isActive ? 2 : 0, 
                          ease: "linear",
                          repeat: isActive ? Infinity : 0
                        }}
                      >
                         {isActive && (
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full blur-[4px] shadow-[0_0_15px_5px_rgba(255,255,255,0.8)]" />
                         )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Abstract Fluid Skeuomorphic Asset Overlay */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-20 filter blur-3xl">
           <motion.div 
             animate={{ 
               x: [0, 50, -50, 0],
               y: [0, -30, 30, 0],
               scale: [1, 1.2, 0.9, 1] 
             }}
             transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
             className="w-full h-full bg-accent/30 rounded-[100%]"
           />
        </div>
      </BentoCard>
      
      {/* Transaction Details below */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <BentoCard delay={0.2} className="col-span-2">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Ledger Payload</h3>
            <div className="bg-surface rounded-xl p-4 font-mono text-xs text-text-secondary whitespace-pre-wrap border border-border">
              {`{
  "tx_context": "TR-004X-SETTLEMENT",
  "amount": "50,000.00 USDC",
  "source_node": "GD3W...7K9A",
  "target_node": "GAT7...VN3C",
  "signatures_required": 3,
  "gas_limit": 100,
  "priority": "HIGH"
}`}
            </div>
         </BentoCard>
         <BentoCard delay={0.3} className="bg-surface">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Network Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                 <span className="text-sm font-medium">Core Ping</span>
                 <span className="text-sm font-mono text-success">14ms</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                 <span className="text-sm font-medium">Consensus Nodes</span>
                 <span className="text-sm font-mono text-text-primary">43/44</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">Last Ledger</span>
                 <span className="text-sm font-mono text-text-primary">#48192934</span>
              </div>
            </div>
         </BentoCard>
      </div>
    </div>
  );
}
