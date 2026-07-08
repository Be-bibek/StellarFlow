import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TreasuryRouter } from '@/components/treasury-router';
import { ArrowRightLeft, Landmark, Users, Briefcase, Lock, Megaphone, Wallet } from 'lucide-react';
import Carousel from '@/components/ui/carousel';
import LaserFlow from '@/components/ui/laser-flow';
import { useTreasuryStore } from '@/lib/stores/treasury-store';
import { useAccountStore } from '@/lib/stores/account-store';

const getWalletIcon = (type: string) => {
  switch (type) {
    case 'MASTER': return <Landmark className="h-[16px] w-[16px] text-white" />;
    case 'PAYROLL': return <Users className="h-[16px] w-[16px] text-white" />;
    case 'OPERATIONS': return <Briefcase className="h-[16px] w-[16px] text-white" />;
    case 'RESERVE': return <Lock className="h-[16px] w-[16px] text-white" />;
    case 'MARKETING': return <Megaphone className="h-[16px] w-[16px] text-white" />;
    default: return <Wallet className="h-[16px] w-[16px] text-white" />;
  }
};

const getWalletColors = (type: string) => {
  switch (type) {
    case 'MASTER': return { colorFrom: '#4f46e5', colorTo: '#7c3aed' }; // Indigo -> Violet
    case 'PAYROLL': return { colorFrom: '#2563eb', colorTo: '#0ea5e9' }; // Blue -> Sky
    case 'OPERATIONS': return { colorFrom: '#10b981', colorTo: '#059669' }; // Emerald
    case 'RESERVE': return { colorFrom: '#f59e0b', colorTo: '#ea580c' }; // Amber -> Orange
    case 'MARKETING': return { colorFrom: '#ec4899', colorTo: '#be185d' }; // Pink
    default: return { colorFrom: '#64748b', colorTo: '#475569' }; // Slate
  }
};

export function TransferView() {
  const [walletKey, setWalletKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>("0");
  const [maxLimit, setMaxLimit] = useState<bigint | null>(BigInt(50000));

  const wallets = useTreasuryStore((s) => s.wallets);
  const xlmPriceUsd = useAccountStore((s) => s.xlmPriceUsd) || 0.125;

  const carouselItems = wallets.map((w, i) => {
    const colors = getWalletColors(w.type);
    
    // Create a mock card number from the stellar public key or use a random one
    const fakePan = w.publicKey 
      ? w.publicKey.replace(/[^A-Z0-9]/ig, '').slice(0, 16)
      : '4111222233334444';
    
    // Format into groups of 4: "GAB3 4XYZ ..."
    const formattedCardNumber = fakePan.match(/.{1,4}/g)?.join(' ') || fakePan;
    
    return {
      id: i + 1,
      title: w.name,
      description: `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(w.balance)} XLM (~${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(w.balance * xlmPriceUsd)})`,
      icon: getWalletIcon(w.type),
      colorFrom: colors.colorFrom,
      colorTo: colors.colorTo,
      cardType: w.type === 'MASTER' ? 'CREDIT' : 'DEBIT' as 'DEBIT' | 'CREDIT',
      cardNumber: formattedCardNumber,
    };
  });

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
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto h-full overflow-y-auto overflow-x-hidden pb-20 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-blue-600 dark:text-indigo-400" />
            Direct Transfer
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Execute one-to-one fast settlements over the Stellar network.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        {/* Left Side: Wallets Carousel */}
        <div className="w-full lg:w-[350px] shrink-0">
          <div style={{ height: '400px', position: 'relative' }} className="w-full flex justify-center">
            <Carousel 
              items={carouselItems.length > 0 ? carouselItems : undefined}
              baseWidth={320}
              autoplay={true}
              autoplayDelay={3000}
              pauseOnHover={true}
              loop={true}
              round={false}
            />
          </div>
        </div>

        {/* Right Side: Transfer Form with LaserFlow Background */}
        <div className="flex-1 w-full min-w-0 relative flex items-center justify-center min-h-[500px] rounded-[24px]">
          <div className="absolute inset-0 z-0 opacity-100 pointer-events-none mix-blend-screen" style={{ transform: 'scale(1.5) rotate(180deg)', transformOrigin: 'center center' }}>
            <LaserFlow 
              color="#a855f7" 
              horizontalSizing={3.0} 
              verticalSizing={2.5} 
              wispDensity={2.5}
              wispSpeed={20}
              fogIntensity={0.6}
            />
          </div>
          <div className="relative z-10 w-full p-4 lg:p-8">
            <TreasuryRouter 
              walletKey={walletKey} 
              balance={balance} 
              maxLimit={maxLimit} 
              onConnect={handleConnect} 
              onDisconnect={handleDisconnect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
