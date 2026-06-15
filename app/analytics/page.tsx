"use client";

import { useState } from "react";
import { BentoCard } from "@/components/ui/bento-card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

const utilizationData = [
  { name: 'Payroll Vault', value: 840200, color: '#3B82F6' },
  { name: 'Operation Hub', value: 120500, color: '#F59E0B' },
  { name: 'Marketing Reserve', value: 210000, color: '#10B981' },
  { name: 'Emergency Vault', value: 50000, color: '#EF4444' },
];

const totalUtilization = utilizationData.reduce((acc, curr) => acc + curr.value, 0);

const velocityData = {
  week: [
    { name: 'Mon', value: 42000 },
    { name: 'Tue', value: 31000 },
    { name: 'Wed', value: 58000 },
    { name: 'Thu', value: 45000 },
    { name: 'Fri', value: 62000 },
    { name: 'Sat', value: 12000 },
    { name: 'Sun', value: 9000 },
  ],
  month: [
    { name: 'Week 1', value: 250000 },
    { name: 'Week 2', value: 320000 },
    { name: 'Week 3', value: 280000 },
    { name: 'Week 4', value: 410000 },
  ],
  quarter: [
    { name: 'Month 1', value: 1200000 },
    { name: 'Month 2', value: 1450000 },
    { name: 'Month 3', value: 1800000 },
  ]
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = ((data.value / totalUtilization) * 100).toFixed(1);
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
        <p className="text-xs font-bold text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></span>
          {data.name}
        </p>
        <p className="text-sm font-mono mt-1 text-text-primary">
          ${data.value.toLocaleString()}{' '}
          <span className="text-[10px] text-text-secondary ml-1 font-bold">({percentage}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">{label}</p>
        <p className="text-sm font-mono mt-1 text-accent font-bold">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [velocityFilter, setVelocityFilter] = useState<"week" | "month" | "quarter">("week");

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Financial Intelligence</h1>
          <p className="text-sm text-text-secondary mt-1">Deep analytics on treasury deployment and velocity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run Rates Chart */}
        <BentoCard delay={0.1} className="h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="w-4 h-4 text-accent" /> Historical Spending Velocity Run-Rates
            </h3>
            <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border">
              {(['week', 'month', 'quarter'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setVelocityFilter(filter)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded transition-all ${
                    velocityFilter === filter 
                    ? 'bg-accent/10 text-accent' 
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData[velocityFilter]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                  tickFormatter={(val) => `$${val / 1000}k`}
                  width={50}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
                <Bar 
                  dataKey="value" 
                  fill="var(--color-accent)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        {/* Utilization Breakdown Chart */}
        <BentoCard delay={0.2} className="h-[400px] flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 uppercase tracking-widest">
              <PieChartIcon className="w-4 h-4 text-accent" /> Wallet Liquidity Utilization Breakdown
            </h3>
          </div>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label for Pie Chart */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Total Sourced</span>
              <span className="text-lg font-bold font-mono text-text-primary mt-1">
                ${(totalUtilization / 1000000).toFixed(2)}M
              </span>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
