"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Users, Shield, SlidersHorizontal, BookOpen } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const TABS = [
  { id: "org", label: "Organization Profile", icon: Building },
  { id: "rules", label: "Security & Rules", icon: Shield },
  { id: "team", label: "Team Members", icon: Users },
  { id: "limits", label: "Threshold Limits", icon: SlidersHorizontal },
  { id: "policies", label: "Treasury Policies", icon: BookOpen },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">System Settings & Governance</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3 space-y-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative text-left ${
                  isActive ? "text-text-primary bg-card border border-border shadow-sm" : "text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
        
        <div className="md:col-span-9">
          <BentoCard className="min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === "org" && (
                <motion.div
                  key="org"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                   <div>
                     <h2 className="text-lg font-medium border-b border-border pb-2 mb-4">Organization Detail</h2>
                     <div className="space-y-4 max-w-md">
                        <div>
                          <label className="text-xs font-semibold text-text-secondary uppercase mb-1.5 block">Entity Legal Name</label>
                          <Input defaultValue="StellarFlow OS Inc." />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-text-secondary uppercase mb-1.5 block">Treasury Master Key</label>
                          <Input defaultValue="GBMaster...92XA" readOnly className="font-mono bg-surface/50 text-text-secondary" />
                        </div>
                        <div className="pt-4">
                          <Button>Save Configuration</Button>
                        </div>
                     </div>
                   </div>
                </motion.div>
              )}
              {activeTab !== "org" && (
                <motion.div
                  key="other"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-20 opacity-60"
                >
                   <SlidersHorizontal className="w-8 h-8 text-text-secondary mb-3" />
                   <p className="text-sm font-medium">Configuration Module Selected</p>
                   <p className="text-xs text-text-secondary font-mono mt-1">Config block for {activeTab} loads dynamically.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
