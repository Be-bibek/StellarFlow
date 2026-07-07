'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BentoCard } from '@/components/ui/bento-card';
import { UploadCloud, Plus, Trash2, ShieldCheck, Cpu } from 'lucide-react';

interface Recipient {
  id: string;
  recipientId: string;
  destKey: string;
  vol: string;
  assetCode: string;
}

export function BatchView() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const parsed = lines.map((line, index) => {
        // Assume format: RecipientId,DestinationKey,Amount,AssetCode
        const [recipientId, destKey, vol, assetCode] = line.split(',');
        return {
          id: `${index}-${Date.now()}`,
          recipientId: recipientId?.trim() || `Row-${index+1}`,
          destKey: destKey?.trim() || '',
          vol: vol?.trim() || '0',
          assetCode: assetCode?.trim() || 'USDC',
        };
      });

      setRecipients([...recipients, ...parsed]);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const executeBatch = async () => {
    if (recipients.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients })
      });
      if (response.ok) {
        alert('Batch broadcast successful');
        setRecipients([]);
      } else {
        alert('Error broadcasting batch');
      }
    } catch (e) {
      console.error(e);
      alert('Error broadcasting batch');
    } finally {
      setLoading(false);
    }
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const totalVolume = recipients.reduce((acc, r) => acc + (parseFloat(r.vol) || 0), 0);
  const hasXlm = recipients.some(r => r.assetCode === 'XLM');
  const hasUsdc = recipients.some(r => r.assetCode === 'USDC');

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
              <p className="text-sm text-slate-500 dark:text-white/50 mt-2 max-w-sm">Upload your .CSV payroll manifest here to parse transactions automatically. (Format: ID, Address, Amount, Asset)</p>
              
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />

              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                onClick={() => fileInputRef.current?.click()}
                className="mt-8 flex items-center gap-2 py-2 px-6 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition cursor-pointer text-slate-700 dark:text-white"
              >
                <Plus className="w-4 h-4" /> Upload CSV
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
                     {recipients.map(rec => (
                       <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-900 dark:text-white/90">{rec.recipientId}</td>
                         <td className="px-6 py-4 font-mono text-xs text-blue-600 dark:text-indigo-300/80">{rec.destKey}</td>
                         <td className="px-6 py-4 font-mono text-right text-slate-900 dark:text-white">{rec.vol} {rec.assetCode}</td>
                         <td className="px-6 py-4 text-right">
                           <button onClick={() => removeRecipient(rec.id)} className="text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition p-2 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                     {recipients.length === 0 && (
                         <tr>
                             <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-white/40">No recipients loaded. Upload a CSV to begin.</td>
                         </tr>
                     )}
                   </tbody>
                 </table>
               </div>
               {/* Mobile Verification Grid */}
               <div className="flex flex-col md:hidden divide-y divide-slate-100 dark:divide-white/5">
                  {recipients.map(rec => (
                    <div key={rec.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors gap-4">
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between w-full items-start">
                          <span className="font-medium text-sm text-slate-900 dark:text-white/90">{rec.recipientId}</span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{rec.vol} {rec.assetCode}</span>
                        </div>
                        <span className="font-mono text-xs text-blue-600 dark:text-indigo-300/80">{rec.destKey}</span>
                      </div>
                      <button onClick={() => removeRecipient(rec.id)} className="text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition p-2 rounded hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0">
                        <Trash2 className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  ))}
                  {recipients.length === 0 && (
                      <div className="p-8 text-center text-slate-500 dark:text-white/40">No recipients loaded.</div>
                  )}
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
                <span className="font-mono text-lg text-slate-900 dark:text-white font-bold tracking-tight">{recipients.length}</span>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-xl flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-white/60">Total Outflow Volume</span>
                <span className="font-mono text-lg text-red-600 dark:text-red-400 font-bold tracking-tight">{totalVolume.toLocaleString()}</span>
              </div>
              
              <div className="mt-8">
                <h4 className="text-xs uppercase text-slate-500 dark:text-white/40 tracking-wider mb-3 font-medium">Origin Asset Ratio</h4>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                   {hasUsdc && <div className={`bg-blue-600 dark:bg-indigo-500 ${hasXlm ? 'w-[70%]' : 'w-full'}`} title="USDC" />}
                   {hasXlm && <div className={`bg-slate-300 dark:bg-slate-500 ${hasUsdc ? 'w-[30%]' : 'w-full'}`} title="XLM" />}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-white/40 font-mono mt-2">
                  <span>USDC</span>
                  <span>XLM</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
               <motion.button 
                  onClick={executeBatch}
                  disabled={recipients.length === 0 || loading}
                  whileHover={{ scale: 1.02, y: -1 }} 
                  whileTap={{ scale: 0.98 }} 
                  className={`w-full py-3 border rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg ${
                    recipients.length === 0 
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 border-transparent cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-[#08060D] border dark:border-indigo-500/40 hover:bg-blue-700 dark:hover:bg-indigo-900/20 text-white dark:shadow-[0_0_15px_rgba(79,70,229,0.2)]'
                  }`}
               >
                 {loading ? 'Processing...' : 'Broadcast to Signers'}
               </motion.button>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
