"use client";

import { BentoCard } from "@/components/ui/bento-card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const dataPie = [
  { name: 'Payroll Vault', value: 400 },
  { name: 'Marketing', value: 300 },
  { name: 'Operation', value: 200 },
  { name: 'Buffer', value: 100 },
];
const COLORS = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--border)'];

const dataBar = [
  { name: 'Mon', vol: 4000 },
  { name: 'Tue', vol: 3000 },
  { name: 'Wed', vol: 2000 },
  { name: 'Thu', vol: 2780 },
  { name: 'Fri', vol: 1890 },
  { name: 'Sat', vol: 2390 },
  { name: 'Sun', vol: 3490 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Financial Intelligence</h1>
          <p className="text-sm text-text-secondary mt-1">KPI reporting and velocity analytics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BentoCard delay={0.1} className="h-96 flex flex-col">
          <h3 className="font-medium text-text-primary mb-6">Liquidity Utilization Breakdown</h3>
           <div className="flex-1 w-full relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPie}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dataPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                <span className="text-sm text-text-secondary uppercase tracking-widest font-semibold">Total</span>
                <span className="text-2xl font-bold font-mono">1M+</span>
              </div>
           </div>
        </BentoCard>

        <BentoCard delay={0.2} className="h-96 flex flex-col">
          <h3 className="font-medium text-text-primary mb-6">Historical Velocity Run-Rate</h3>
           <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataBar}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                     cursor={{ fill: 'var(--surface)' }}
                     contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="vol" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </BentoCard>
      </div>
    </div>
  );
}
