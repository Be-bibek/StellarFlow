import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Wallet, Trash2, CheckCircle2 } from 'lucide-react';
import { useAccountStore } from '@/lib/stores/account-store';
import { connectFreighterWallet } from '@/lib/stellar';

const ACCOUNT_COLORS = [
  '0ea5e9', '8b5cf6', 'ec4899', 'f59e0b', '10b981', 'f43f5e',
  '6366f1', '14b8a6', 'd946ef', '84cc16', 'f97316', '06b6d4',
];

const getAccountColor = (id: string) => {
  const charSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ACCOUNT_COLORS[charSum % ACCOUNT_COLORS.length];
};

export function AccountSwitcherModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { accounts, activeAccountId, setActiveAccount, addAccount, removeAccount, refreshBalances } = useAccountStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPubKey, setNewPubKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) refreshBalances();
  }, [isOpen, refreshBalances]);

  const handleAddFromFreighter = async () => {
    try {
      const pubKey = await connectFreighterWallet();
      setNewPubKey(pubKey);
    } catch (e: any) {
      alert("Failed to connect Freighter: " + e.message);
    }
  };

  const handleSaveNew = async () => {
    if (!newName || !newPubKey) return;
    setLoading(true);
    try {
      await addAccount(newName, newPubKey);
      setIsAdding(false);
      setNewName('');
      setNewPubKey('');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white dark:bg-[#08060D] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Manager</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {accounts.map(acc => {
            const isActive = acc.id === activeAccountId;
            const iconColor = getAccountColor(acc.id);
            return (
              <div 
                key={acc.id}
                onClick={() => { setActiveAccount(acc.id); onClose(); }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${
                  isActive 
                    ? 'border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-500/10' 
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-900 border border-slate-500/30 relative flex-shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundColor: `#${iconColor}` }} />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                    <path d="M12 3C7 3 3 7 3 12C3 12 4.5 11 6 12C7.5 13 9 11 10.5 12C12 13 13.5 11 15 12C16.5 13 18 11 19.5 12C21 13 21 12 21 12C21 7 17 3 12 3Z" fill={`#${iconColor}`} />
                    <path d="M6 12C6 16 4 19 4 21" stroke={`#${iconColor}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.5 12C10.5 16 9 19 9 22" stroke={`#${iconColor}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.5 12C13.5 16 15 19 15 22" stroke={`#${iconColor}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18 12C18 16 20 19 20 21" stroke={`#${iconColor}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">{acc.name}</span>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{acc.publicKey}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-white">${acc.balanceUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  <div className="text-[11px] text-slate-500">{acc.balanceXlm.toLocaleString()} XLM</div>
                </div>
                
                {/* Delete button (don't delete if it's the only one) */}
                {accounts.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeAccount(acc.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Account Section */}
          <AnimatePresence>
            {isAdding ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Account Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="e.g. Treasury Wallet"
                    className="w-full bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Public Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newPubKey} 
                      onChange={e => setNewPubKey(e.target.value)} 
                      placeholder="G..."
                      className="flex-1 bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-orange-500"
                    />
                    <button 
                      onClick={handleAddFromFreighter}
                      className="px-3 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                      title="Connect Freighter"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveNew}
                    disabled={!newName || !newPubKey || loading}
                    className="flex-1 py-2 rounded-lg font-semibold text-sm bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="mt-2 py-3 w-full rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
              >
                <Plus className="w-4 h-4" /> Add Another Wallet
              </button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
