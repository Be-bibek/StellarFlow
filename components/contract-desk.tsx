"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  contractGetMaxLimit,
  contractGetVaults,
  contractAddVault,
  connectFreighterWallet,
  isContractDeployed,
  fetchXlmBalance,
} from "@/lib/stellar";
import { useTransactionStore } from "@/lib/stores/transaction-store";

// ── Error badge colours ────────────────────────────────────────────────────────
const ERROR_TYPE_META: Record<string, { label: string; colour: string; Icon: React.ComponentType<{ className?: string }> }> = {
  UserRejected:     { label: "User Rejected",      colour: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",  Icon: X },
  SimulationFailed: { label: "Simulation Failed",  colour: "text-orange-400 border-orange-500/30 bg-orange-500/10", Icon: ServerCrash },
  ContractRevert:   { label: "Contract Reverted",  colour: "text-red-400    border-red-500/30    bg-red-500/10",    Icon: ShieldAlert },
  NotDeployed:      { label: "Contract Not Deployed", colour: "text-slate-400 border-slate-500/30 bg-slate-500/10", Icon: AlertCircle },
  Unknown:          { label: "Unknown Error",      colour: "text-red-400    border-red-500/30    bg-red-500/10",    Icon: AlertCircle },
};

// ── Animated Vault Node for the Credit-Netting matrix ─────────────────────────
function VaultNode({
  label,
  address,
  index,
  isActive,
}: {
  label: string;
  address: string;
  index: number;
  isActive: boolean;
}) {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const colours = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-emerald-500 to-teal-400",
    "from-orange-500 to-amber-400",
    "from-rose-500 to-red-400",
    "from-indigo-500 to-violet-400",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.07 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Node circle */}
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-full bg-gradient-to-br ${colours[index % colours.length]} p-[2px] shadow-lg`}
        >
          <div className="w-full h-full rounded-full bg-[#08060D] flex items-center justify-center">
            <span className="text-lg font-bold text-white">{letters[index % letters.length]}</span>
          </div>
        </div>
        {isActive && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#08060D] animate-pulse" />
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-xs font-semibold text-white truncate max-w-[80px]">{label}</p>
        <p className="text-[10px] text-slate-500 font-mono">{address.substring(0, 6)}…</p>
      </div>
    </motion.div>
  );
}

// ── Animated arrow connector ──────────────────────────────────────────────────
function FlowArrow({ animated }: { animated: boolean }) {
  return (
    <div className="flex items-center justify-center pb-6">
      <div className="relative flex items-center">
        <div className={`h-[2px] w-10 bg-gradient-to-r from-blue-500/40 to-blue-500/80 ${animated ? "animate-pulse" : ""}`} />
        {animated && (
          <motion.div
            className="absolute w-2 h-2 bg-blue-400 rounded-full"
            animate={{ x: [0, 40] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        )}
        <ArrowRight className="w-4 h-4 text-blue-400 -ml-1" />
      </div>
    </div>
  );
}

interface ContractDeskProps {
  walletKey: string | null;
  balance: string | null;
  maxLimit: bigint | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onRefreshBalance: () => Promise<void>;
}

export function ContractDesk({
  walletKey,
  balance,
  maxLimit,
  onConnect,
  onDisconnect,
  onRefreshBalance,
}: ContractDeskProps) {
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const [vaults, setVaults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deployed] = useState(isContractDeployed());

  // Add vault form
  const [newVault, setNewVault] = useState("");
  const [vaultStatus, setVaultStatus] = useState<{ msg: string; type: string; hash?: string } | null>(null);

  const fetchContractState = async () => {
    setRefreshing(true);
    const vaultList = await contractGetVaults();
    setVaults(Array.from(new Set(vaultList)));
    await onRefreshBalance();
    setRefreshing(false);
  };

  useEffect(() => {
    if (deployed) {
      fetchContractState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployed]);

  const handleAddVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletKey || !newVault) return;
    
    if (vaults.includes(newVault)) {
      setVaultStatus({ msg: "This vault is already registered in the mesh.", type: "error" });
      return;
    }

    setLoading(true);
    setVaultStatus(null);
    const res = await contractAddVault(walletKey, newVault);
    if (res.success) {
      setVaultStatus({ msg: "Vault registered on-chain!", type: "success", hash: res.hash });
      
      // Store the vault registration event in the transaction history
      addTransaction({
        id: `vault_add_${Date.now()}`,
        transferId: `v_add_${Math.random().toString(36).substring(7)}`,
        orgId: "org-1",
        amount: 0,
        assetCode: "VAULT_ADD",
        destination: newVault,
        sourceBreakdown: { [walletKey]: "0" },
        status: "SETTLED",
        stellarTxHash: res.hash,
        recipientCount: 1,
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
      });

      setNewVault("");
      await fetchContractState();
    } else {
      setVaultStatus({ msg: res.error ?? "Failed", type: res.errorType ?? "Unknown" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">On-Chain Treasury Router</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {deployed
              ? "Contract deployed · Soroban Testnet"
              : "Contract not deployed — run npm run deploy:contract"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {deployed && (
            <button
              onClick={fetchContractState}
              className="p-2 bg-slate-100 hover:bg-slate-200 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border dark:border-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          {!walletKey ? (
            <button
              onClick={onConnect}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-mono flex items-center gap-2">
                <span className="text-emerald-500 dark:text-emerald-400">{walletKey.substring(0, 6)}…{walletKey.slice(-4)}</span>
                <span className="opacity-35 text-slate-400">|</span>
                <span className="font-bold text-slate-900 dark:text-white">{balance ? `${parseFloat(balance).toFixed(4)} XLM` : "Loading..."}</span>
              </div>
              <button
                onClick={onDisconnect}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Contract Info Bar ── */}
      {deployed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Registered Vaults</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{vaults.length}</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Max Transfer</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {maxLimit != null ? `${(Number(maxLimit) / 1e7).toLocaleString()} XLM` : "—"}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Network</p>
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">Testnet</p>
          </div>
        </div>
      )}

      {/* ── Vault Matrix Visualiser ── */}
      {vaults.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-6">Credit-Netting Mesh (A→B→C→A)</p>
          <div className="flex flex-wrap items-end gap-3 justify-center">
            {vaults.map((vault, i) => (
              <React.Fragment key={`${vault}-${i}`}>
                <VaultNode label={`Vault ${i + 1}`} address={vault} index={i} isActive />
                {i < vaults.length - 1 && <FlowArrow animated={false} />}
              </React.Fragment>
            ))}
            {vaults.length > 1 && (
              <>
                <FlowArrow animated />
                <div className="text-xs text-blue-400 font-mono self-center pb-6">← Loop</div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto w-full">
        {/* ── Register Vault Form ── */}
        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Register Vault Wallet</h4>
          </div>
          <form onSubmit={handleAddVault} className="space-y-4">
            <div>
              <label className="text-xs text-slate-700 dark:text-slate-400 mb-1.5 block">Vault Address (G…)</label>
              <input
                value={newVault}
                onChange={(e) => setNewVault(e.target.value)}
                placeholder="GABCDEF..."
                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white text-sm font-mono placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !walletKey || !deployed}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in Freighter…" : "Add Vault On-Chain"}
            </button>
          </form>

          {vaultStatus && <StatusBanner status={vaultStatus} />}
        </div>
      </div>
    </div>
  );
}

// ── Status Banner ─────────────────────────────────────────────────────────────
function StatusBanner({
  status,
}: {
  status: { msg: string; type: string; hash?: string };
}) {
  const meta = status.type === "success"
    ? { label: "Success", colour: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", Icon: CheckCircle2 }
    : ERROR_TYPE_META[status.type] ?? ERROR_TYPE_META["Unknown"];

  const { Icon, colour, label } = meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-4 p-3 rounded-xl border ${colour} flex items-start gap-3`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colour.split(" ")[0]}`} />
      <div>
        <p className={`text-xs font-bold uppercase tracking-wide ${colour.split(" ")[0]}`}>{label}</p>
        <p className="text-xs text-slate-300 mt-0.5">{status.msg}</p>
        {status.hash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View on Stellar Expert <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
