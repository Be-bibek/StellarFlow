"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart,
} from "recharts";
import { SwapWidget } from "@/components/ui/swap-widget";
import { useAccountStore } from "@/lib/stores/account-store";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Wallet, Zap, RefreshCw, Activity,
} from "lucide-react";

// ── Chart Data ────────────────────────────────────────────────────────────────

const generateChartData = (points: number, base: number, variance: number) =>
  Array.from({ length: points }, (_, i) => {
    const hour = i % 24;
    const label = hour === 0 ? "12 am"
      : hour < 12 ? `${hour} am`
      : hour === 12 ? "12 pm"
      : `${hour - 12} pm`;
    return {
      name: label,
      value: Math.max(800, base + (Math.random() - 0.45) * variance + Math.sin(i * 0.4) * 300),
      volume: Math.floor(Math.random() * 900 + 200),
    };
  });

const TIMEFRAME_DATA: Record<string, ReturnType<typeof generateChartData>> = {
  "1D": generateChartData(24, 2200, 800),
  "1W": generateChartData(28, 2100, 1200),
  "1Y": generateChartData(52, 1800, 2000),
  "Max": generateChartData(60, 1200, 3000),
};

// ── Vault Table Data ──────────────────────────────────────────────────────────

const VAULTS = [
  {
    id: 1,
    name: "Master Treasury",
    type: "MULTI-SIG",
    icon: "🔮",
    daily: "+$187.45",
    dailyPositive: true,
    balance: "$24,732.89",
    apy: "+8.56%",
    state: "Fixed",
    startDate: "06.10.2023",
    liquidity: 3,
    color: "#8B5CF6",
  },
  {
    id: 2,
    name: "Payroll Vault",
    type: "STANDARD",
    icon: "💰",
    daily: "+$68.73",
    dailyPositive: true,
    balance: "$11,854.27",
    apy: "+6.45%",
    state: "Fixed",
    startDate: "15.08.2023",
    liquidity: 2,
    color: "#3B82F6",
  },
  {
    id: 3,
    name: "Operations Hub",
    type: "STANDARD",
    icon: "⚙️",
    daily: "+$27.92",
    dailyPositive: true,
    balance: "$6,668.22",
    apy: "—",
    state: "Flexible",
    startDate: "10.02.2024",
    liquidity: 3,
    color: "#10B981",
  },
  {
    id: 4,
    name: "Marketing Reserve",
    type: "STANDARD",
    icon: "📣",
    daily: "-$12.10",
    dailyPositive: false,
    balance: "$2,340.55",
    apy: "+3.12%",
    state: "Flexible",
    startDate: "01.01.2024",
    liquidity: 1,
    color: "#F59E0B",
  },
];

const TOTAL_BALANCE = VAULTS.reduce(
  (acc, v) => acc + parseFloat(v.balance.replace(/[$,]/g, "")),
  0
);

// ── Custom Tooltips ────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-[#0E0C17]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      <p className="font-bold text-slate-900 dark:text-white font-mono">${payload[0].value.toFixed(2)}</p>
    </div>
  );
};

// ── Dot Indicator ─────────────────────────────────────────────────────────────
const LiquidityDots = ({ count }: { count: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full transition-colors"
        style={{
          background: i <= count
            ? count === 3 ? "#10B981" : count === 2 ? "#F59E0B" : "#EF4444"
            : "rgba(148,163,184,0.2)"
        }}
      />
    ))}
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

export function OverviewView() {
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1Y" | "Max">("1D");
  const [chartMode, setChartMode] = useState<"actual" | "ai">("actual");
  const { activeAccountId, connectWallet } = useAccountStore();

  const chartData = useMemo(() => TIMEFRAME_DATA[timeframe], [timeframe]);

  // Slight AI-predicted smoothing effect
  const displayData = useMemo(() =>
    chartMode === "ai"
      ? chartData.map((d, i, arr) => ({
          ...d,
          value: arr.slice(Math.max(0, i - 2), i + 1).reduce((s, v) => s + v.value, 0) /
                 Math.min(3, i + 1),
        }))
      : chartData,
    [chartData, chartMode]
  );

  const [intPart, decPart] = TOTAL_BALANCE.toFixed(2).split(".");

  return (
    <div className="space-y-6 pb-20">
      {/* ── Main Content Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── LEFT: Total Balance Card ──────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E0C17] overflow-hidden shadow-sm">
          <div className="p-5 md:p-6">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Total Balance</p>

            {/* Balance + Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    ${intPart}
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-slate-400">.{decPart}</span>
                </div>
                <p className="text-xs font-semibold text-slate-400 mt-1.5 uppercase tracking-wide">XLM • USDC • NFT</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Actual / AI toggle */}
                <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-white/5 p-0.5">
                  <button
                    onClick={() => setChartMode("actual")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      chartMode === "actual"
                        ? "bg-white shadow-sm text-slate-900 dark:bg-[#1E1B2E] dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >Actual</button>
                  <button
                    onClick={() => setChartMode("ai")}
                    className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 rounded-md transition-all ${
                      chartMode === "ai"
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <Zap className="w-3 h-3" /> AI predicted
                  </button>
                </div>

                {/* Timeframe filters */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  {(["1D", "1W", "1Y", "Max"] as const).map(tf => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        timeframe === tf
                          ? "bg-white shadow-sm text-slate-900 dark:bg-[#1E1B2E] dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                      }`}
                    >{tf}</button>
                  ))}
                  <button className="px-2 py-1 text-xs text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200">≡</button>
                </div>
              </div>
            </div>

            {/* Area + Volume Composite Chart */}
            <div className="h-[240px] md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={displayData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                    interval={Math.floor(displayData.length / 5)}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    width={45}
                    domain={["auto", "auto"]}
                    dx={-10}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#10B981", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#balanceGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Bar
                    dataKey="volume"
                    fill="rgba(148,163,184,0.18)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={8}
                    yAxisId={0}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 border-t border-slate-100 dark:border-white/5 divide-x divide-slate-100 dark:divide-white/5">
            {[
              { label: "Swap", icon: <RefreshCw className="w-3.5 h-3.5" />, accent: true },
              { label: "Deposit", icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
              { label: "Withdraw", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
              { label: "Buy Crypto", icon: <Zap className="w-3.5 h-3.5" /> },
            ].map(({ label, icon, accent }) => (
              <button
                key={label}
                className={`py-3.5 md:py-4 flex flex-col items-center gap-1.5 text-[10px] md:text-xs font-bold transition-colors ${
                  accent
                    ? "text-orange-500 bg-orange-50/50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Swap Widget ─────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E0C17] p-5 shadow-sm flex flex-col">
          <SwapWidget
            walletKey={activeAccountId}
            onConnect={connectWallet}
          />
        </div>
      </div>

        {/* ── Vault Liquidity Table ────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E0C17] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] md:grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_1fr_0.8fr] gap-2 px-5 py-3 border-b border-slate-100 dark:border-white/5">
            {["Vault", "Daily", "Balance", "APY", "State", "Start Date", "Liquidity"].map((h, i) => (
              <span key={h} className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i > 3 ? "hidden md:block" : ""}`}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {VAULTS.map((vault) => (
              <div
                key={vault.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] md:grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_1fr_0.8fr] gap-2 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors items-center"
              >
                {/* Vault */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${vault.color}20` }}
                  >
                    {vault.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{vault.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{vault.type}</p>
                  </div>
                </div>

                {/* Daily */}
                <div className={`flex items-center gap-1 text-sm font-bold ${vault.dailyPositive ? "text-emerald-500" : "text-red-400"}`}>
                  {vault.dailyPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="truncate">{vault.daily}</span>
                </div>

                {/* Balance */}
                <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">{vault.balance}</p>

                {/* APY */}
                <div>
                  {vault.apy === "—" ? (
                    <span className="text-sm text-slate-400">—</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {vault.apy}
                    </span>
                  )}
                </div>

                {/* State (hidden on mobile) */}
                <p className="hidden md:block text-sm text-slate-600 dark:text-slate-300">{vault.state}</p>

                {/* Start Date (hidden on mobile) */}
                <p className="hidden md:block text-sm font-mono text-slate-500 dark:text-slate-400">{vault.startDate}</p>

                {/* Liquidity (hidden on mobile) */}
                <div className="hidden md:flex">
                  <LiquidityDots count={vault.liquidity} />
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
