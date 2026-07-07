'use client';

import React, { useState, useMemo } from 'react';
import { BentoCard } from '@/components/ui/bento-card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from 'next-themes';
import { useTransactionStore } from '@/lib/stores/transaction-store';

export function AnalyticsView() {
  const [timeframe, setTimeframe] = useState('Week');
  const { resolvedTheme } = useTheme();
  const { transactions } = useTransactionStore();
  
  const isDark = resolvedTheme === 'dark';
  
  const axisColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
  const tooltipBg = isDark ? 'rgba(10,5,20,0.9)' : 'rgba(255,255,255,0.9)';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipColor = isDark ? '#fff' : '#0f172a';
  const spendColor = isDark ? '#6366f1' : '#2563eb'; // indigo/blue

  const runRateData = useMemo(() => {
    // Generate empty buckets
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = days.reduce((acc, day) => {
      acc[day] = { name: day, spend: 0, alloc: 0 };
      return acc;
    }, {} as Record<string, any>);

    transactions.forEach(tx => {
      const date = new Date(tx.createdAt || new Date());
      // Map JS day to our days array
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const dayName = days[dayIndex];
      
      const amountStr = String(tx.amount).replace(/,/g, '');
      const val = parseFloat(amountStr);
      if (!isNaN(val) && dayName && buckets[dayName]) {
        // All StellarTransactions in the system are Outgoing (Treasury payouts)
        buckets[dayName].spend += val;
      }
    });

    return Object.values(buckets);
  }, [transactions]);

  const pieData = useMemo(() => {
    const assets: Record<string, number> = {};
    let total = 0;
    
    transactions.forEach(tx => {
      const amountStr = String(tx.amount).replace(/,/g, '');
      const val = parseFloat(amountStr);
      if (!isNaN(val)) {
        const asset = tx.assetCode || 'XLM';
        assets[asset] = (assets[asset] || 0) + val;
        total += val;
      }
    });

    const colors = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981'];
    return Object.entries(assets).map(([name, val], i) => ({
      name,
      value: total > 0 ? Math.round((val / total) * 100) : 0,
      color: colors[i % colors.length]
    }));
  }, [transactions]);

  return (
    <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-[#F8FAFC]">Financial Intelligence Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">High-level telemetry utilizing Recharts for real-time visualization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
         {/* Main Chart */}
         <BentoCard delay={0.1} className="col-span-1 lg:col-span-2 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h3 className="font-medium text-slate-900 dark:text-white">Historical Spending Velocity</h3>
               <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-1">
                  {['Week', 'Month', 'Quarter'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${timeframe === t ? 'bg-blue-600 dark:bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
            </div>
            
            <div className="flex-1 w-full h-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={runRateData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={spendColor} stopOpacity={0.3}/>
                       <stop offset="95%" stopColor={spendColor} stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorAlloc" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <XAxis dataKey="name" stroke={axisColor} tick={{ fill: tickColor, fontSize: 12 }} />
                   <YAxis stroke={axisColor} tick={{ fill: tickColor, fontSize: 12 }} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: tooltipColor }}
                     itemStyle={{ color: tooltipColor }}
                   />
                   <Area type="monotone" dataKey="alloc" stroke="#06b6d4" fillOpacity={1} fill="url(#colorAlloc)" />
                   <Area type="monotone" dataKey="spend" stroke={spendColor} fillOpacity={1} fill="url(#colorSpend)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </BentoCard>

         {/* Right Sidebar Charts */}
         <div className="col-span-1 flex flex-col gap-6">
            <BentoCard delay={0.2} className="h-[250px] flex flex-col">
               <h3 className="font-medium mb-4 text-sm text-slate-900 dark:text-white">Liquidity Utilization Breakdown</h3>
               <div className="flex-1 w-full relative left-[-20px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={pieData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                       stroke="rgba(0,0,0,0)"
                     >
                       {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                     </Pie>
                     <Tooltip 
                       contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', color: tooltipColor }}
                       formatter={(val: any) => `${val}%`}
                     />
                   </PieChart>
                 </ResponsiveContainer>
                 {/* Center Metric */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2 ml-10">
                    <div className="text-center">
                       <span className="block font-mono text-xl font-semibold text-slate-900 dark:text-white">100%</span>
                       <span className="block text-[10px] uppercase text-slate-500 dark:text-white/40 tracking-wider">Total</span>
                    </div>
                 </div>
               </div>
            </BentoCard>

            <BentoCard delay={0.3} className="h-fit flex flex-col">
               <h3 className="font-medium mb-4 text-sm text-slate-900 dark:text-white">Action Frequency</h3>
               <div className="flex-1 w-full h-[100px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={runRateData}>
                     <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipColor }} />
                     <Bar dataKey="spend" fill={spendColor} radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </BentoCard>
         </div>
      </div>
    </div>
  );
}
