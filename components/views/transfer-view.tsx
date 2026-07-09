import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TreasuryRouter } from '@/components/treasury-router';
import { ArrowRightLeft, Landmark, Users, Briefcase, Lock, Megaphone, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  const wallets = useTreasuryStore((s) => s.wallets);
  const [toast, setToast] = useState<{ msg: string; success: boolean } | null>(null);
  
  const showToast = (msg: string, success: boolean = false) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 3000);
  };
  
  const { 
    connectWallet, 
    disconnectWallet, 
    activeAccountId, 
    accounts,
    xlmPriceUsd 
  } = useAccountStore();

  const activeAccount = accounts.find(a => a.id === activeAccountId);
  
  const walletKey = activeAccount ? activeAccount.publicKey : null;
  const balance = activeAccount ? activeAccount.balanceXlm.toString() : "0";
  const maxLimit = activeAccount ? BigInt(250000) : BigInt(50000); // Mock limit

  const handleConnect = async () => {
    try {
      await connectWallet();
      showToast("Wallet connected successfully", true);
    } catch (e) {
      showToast("Connection cancelled");
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

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
      description: `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(w.balance)} XLM (~${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(w.balance * (xlmPriceUsd || 0.125))})`,
      icon: getWalletIcon(w.type),
      colorFrom: colors.colorFrom,
      colorTo: colors.colorTo,
      cardType: w.type === 'MASTER' ? 'MULTI-SIG' : 'STANDARD',
      cardNumber: formattedCardNumber,
    };
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto h-full p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8 text-blue-600 dark:text-indigo-400" />
            Direct Transfer
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Execute one-to-one fast settlements over the Stellar network.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 w-full items-center justify-center mt-6 lg:mt-20">
        {/* Left Side: Wallets Carousel */}
        <div className="w-full lg:w-[450px] shrink-0">
          <div className="w-full flex justify-center h-[350px] md:h-[400px] lg:h-[480px] relative overflow-hidden md:overflow-visible">
            <Carousel 
              items={carouselItems.length > 0 ? carouselItems : undefined}
              baseWidth={360}
              autoplay={true}
              autoplayDelay={3000}
              pauseOnHover={true}
              loop={true}
              round={false}
            />
          </div>
        </div>

        {/* Right Side: Transfer Form with LaserFlow */}
        <div className="flex-1 w-full min-w-0 relative">
          
          <div className="relative z-10 w-full mt-4 lg:mt-0">
            {/* LaserFlow Background - Spans infinitely upwards from the top edge of the box */}
            <div className="hidden lg:block absolute bottom-[calc(100%-30px)] left-0 right-0 w-full h-[600px] opacity-100 mix-blend-screen pointer-events-none z-0">
              <LaserFlow 
                color="#a855f7" 
                horizontalBeamOffset={0.0} 
                verticalBeamOffset={-0.45} // Origin exactly near the bottom edge of this canvas
                fogIntensity={2.5} 
                wispDensity={3.0}
                wispSpeed={20}
                horizontalSizing={1.0}
              />
            </div>

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

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl z-50 text-sm font-medium ${
              toast.success ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="max-w-xs">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
