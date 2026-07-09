"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowUpDown, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { fetchSwapQuote, executePathPaymentSwap, type SwapAsset } from "@/lib/stellar";

const ASSETS: { code: string; label: string; issuer?: string; color: string; bg: string }[] = [
  { code: "XLM", label: "XLM", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  { code: "USDC", label: "USDC", issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
];

interface Props {
  walletKey: string | null;
  onConnect: () => void;
}

export function SwapWidget({ walletKey, onConnect }: Props) {
  const [payAsset, setPayAsset] = useState(ASSETS[0]);
  const [getAsset, setGetAsset] = useState(ASSETS[1]);
  const [payAmount, setPayAmount] = useState("10");
  const [quote, setQuote] = useState<{ destAmount: string; exchangeRate: string; path: any[] } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  // Debounced quote fetch
  const fetchQuote = useCallback(async (sendAsset: SwapAsset, destAsset: SwapAsset, amount: string) => {
    if (!amount || parseFloat(amount) <= 0) { setQuote(null); return; }
    setQuoteLoading(true);
    const q = await fetchSwapQuote(sendAsset, destAsset, amount);
    setQuote(q ? { destAmount: q.destAmount, exchangeRate: q.exchangeRate, path: q.path } : null);
    setQuoteLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuote(payAsset, getAsset, payAmount), 800);
    return () => clearTimeout(timer);
  }, [payAmount, payAsset, getAsset, fetchQuote]);

  const handleSwapDirection = () => {
    setPayAsset(getAsset);
    setGetAsset(payAsset);
    setQuote(null);
  };

  const handlePlaceOrder = async () => {
    if (!walletKey) { onConnect(); return; }
    if (!quote) return;
    setStatus("loading");
    setMessage("");
    setTxHash("");

    const slippage = 0.005; // 0.5% slippage tolerance
    const minDest = (parseFloat(quote.destAmount) * (1 - slippage)).toFixed(7);

    const result = await executePathPaymentSwap(
      walletKey,
      payAsset,
      getAsset,
      payAmount,
      minDest,
      quote.path
    );

    if (result.success) {
      setStatus("success");
      setMessage(`Swapped ${payAmount} ${payAsset.code} → ${quote.destAmount} ${getAsset.code}`);
      setTxHash(result.hash ?? "");
      setPayAmount("10");
      setQuote(null);
    } else {
      setStatus("error");
      setMessage(result.error ?? "Swap failed");
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 tracking-tight">Swap Crypto</h3>

      {/* You Pay */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 mb-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">You Pay</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
            className="flex-1 bg-transparent text-3xl font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 w-0 min-w-0"
            placeholder="0.00"
          />
          <AssetSelector selected={payAsset} options={ASSETS.filter(a => a.code !== getAsset.code)} onChange={setPayAsset} />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center py-1 z-10">
        <button
          onClick={handleSwapDirection}
          className="w-9 h-9 rounded-full border-2 border-slate-200 dark:border-white/20 bg-white dark:bg-[#0E0C17] flex items-center justify-center shadow-md hover:border-violet-500 hover:text-violet-500 dark:text-slate-400 text-slate-600 transition-all active:scale-90"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {/* You Get */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 mt-1 mb-5">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">You Get</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {quoteLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            ) : (
              <span className="text-3xl font-bold text-slate-900 dark:text-white block truncate">
                {quote ? quote.destAmount : "—"}
              </span>
            )}
          </div>
          <AssetSelector selected={getAsset} options={ASSETS.filter(a => a.code !== payAsset.code)} onChange={setGetAsset} />
        </div>
      </div>

      {/* Quote Details */}
      <div className="space-y-2 mb-5 border-t border-slate-100 dark:border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Best Price</span>
          <span className="text-xs font-mono text-slate-700 dark:text-slate-200">
            {quoteLoading ? "Fetching..." : quote ? quote.exchangeRate : "Enter amount"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Powered by</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Stellar DEX</span>
        </div>
      </div>

      {/* Status Messages */}
      {status === "success" && (
        <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{message}</p>
            {txHash && (
              <a href={`https://stellarchain.io/transactions/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="underline flex items-center gap-1 mt-1 opacity-70 hover:opacity-100">
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={status === "loading" || (!quote && !!walletKey)}
        className="w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide
          bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 mt-auto"
      >
        {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
        {walletKey ? (status === "loading" ? "Signing…" : "Place Order") : "Connect Wallet"}
      </button>
    </div>
  );
}

function AssetSelector({
  selected,
  options,
  onChange,
}: {
  selected: typeof ASSETS[0];
  options: typeof ASSETS;
  onChange: (a: typeof ASSETS[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-sm font-bold text-slate-900 dark:text-white"
      >
        <span
          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
          style={{ background: selected.color }}
        >
          {selected.code[0]}
        </span>
        {selected.code}
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-28 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E0C17] shadow-xl z-50 overflow-hidden">
          {options.map(a => (
            <button
              key={a.code}
              onClick={() => { onChange(a); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: a.color }}>
                {a.code[0]}
              </span>
              {a.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
