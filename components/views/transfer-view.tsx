import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TreasuryRouter } from '@/components/treasury-router';
import { ArrowRightLeft } from 'lucide-react';

export function TransferView() {
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>("0");
  const [maxLimit, setMaxLimit] = useState<bigint | null>(BigInt(50000));

  const handleConnect = async () => {
    setWalletKey('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    setBalance("150000");
    setMaxLimit(250000n);
  };

  const handleDisconnect = () => {
    setWalletKey(null);
    setBalance("0");
    setMaxLimit(50000n);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto h-full overflow-y-auto pb-20 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-blue-600 dark:text-indigo-400" />
            Direct Transfer
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Execute one-to-one fast settlements over the Stellar network.</p>
        </div>
      </div>

      <TreasuryRouter 
        walletKey={walletKey} 
        balance={balance} 
        maxLimit={maxLimit} 
        onConnect={handleConnect} 
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}
