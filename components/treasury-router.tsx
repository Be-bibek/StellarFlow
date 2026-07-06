"use client";

import React, { useState } from "react";
import { sendNativeTransaction, connectFreighterWallet } from "@/lib/stellar";
import { Loader2, ArrowRightLeft, ExternalLink, AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import { useTransactionStore } from "@/lib/stores/transaction-store";

export function TreasuryRouter() {
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleConnect = async () => {
    try {
      const address = await connectFreighterWallet();
      setPublicKey(address);
    } catch (e: any) {
      setStatus("error");
      setMessage("Failed to connect Freighter: " + e.message);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      setStatus("error");
      setMessage("Please connect your Freighter wallet first.");
      return;
    }
    if (!destination || !amount) {
      setStatus("error");
      setMessage("Destination and amount are required.");
      return;
    }

    setStatus("loading");
    setMessage("Please sign the transaction in Freighter...");
    setTxHash("");

    const result = await sendNativeTransaction(publicKey, destination, amount);

    if (result.success && result.hash) {
      setStatus("success");
      setMessage("Transfer successful!");
      setTxHash(result.hash);
      
      // Log to client transaction history
      addTransaction({
        id: `client-${Date.now()}`,
        transferId: `direct-${result.hash.substring(0, 8)}`,
        orgId: "org-1",
        amount: parseFloat(amount),
        assetCode: "native",
        destination: destination,
        sourceBreakdown: { [publicKey]: amount },
        status: "SETTLED",
        stellarTxHash: result.hash,
        recipientCount: 1,
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
      });

      setDestination("");
      setAmount("");
    } else {
      setStatus("error");
      setMessage(result.error || "Transaction failed. Did you reject the signature?");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto relative group">
      {/* Dynamic Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative bg-white/80 dark:bg-[#08060D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-[1px]">
              <div className="w-full h-full bg-white dark:bg-[#08060D] rounded-full flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Direct Transfer</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Level 1 Testnet Validation</p>
            </div>
          </div>
          
          {!publicKey ? (
            <button
              onClick={handleConnect}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white font-medium rounded-lg transition-colors border dark:border-white/10"
            >
              <Wallet className="w-4 h-4" /> Connect Freighter
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-md font-mono">
              {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 4)}
            </div>
          )}
        </div>

        <form onSubmit={handleTransfer} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Destination Public Key</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="G..."
              className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (XLM)</label>
            <div className="relative">
              <input
                type="number"
                step="0.0000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.5"
                className="w-full bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                XLM
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] disabled:opacity-50 mt-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative bg-white dark:bg-[#08060D] hover:bg-transparent dark:hover:bg-transparent transition-colors duration-300 rounded-xl px-4 py-3 flex items-center justify-center">
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin mr-2" />
                  <span className="text-slate-900 dark:text-white font-medium group-hover:text-white transition-colors duration-300">Processing...</span>
                </>
              ) : (
                <span className="text-slate-900 dark:text-white font-medium group-hover:text-white transition-colors duration-300">Execute Transfer</span>
              )}
            </div>
          </button>
        </form>

        {/* Status Feedback */}
        {status !== "idle" && status !== "loading" && (
          <div
            className={`mt-6 p-4 rounded-xl border ${
              status === "success"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <div className="flex items-start">
              {status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 mr-3 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 shrink-0" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    status === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {message}
                </p>
                {txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View on Stellar Expert
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
