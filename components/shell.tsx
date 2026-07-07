"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { connectFreighterWallet, fetchXlmBalance } from "../lib/stellar";
import { motion } from "framer-motion";
import { ThemeToggle } from "./theme-toggle";
import { 
  LayoutDashboard, 
  Wallet, 
  Route, 
  Layers, 
  Activity, 
  ShieldCheck, 
  BarChart3, 
  Settings,
  Bell,
  Search,
  ChevronDown,
  Layers3
} from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.0000");

  const handleConnect = async () => {
    try {
      const address = await connectFreighterWallet();
      setWalletAddress(address);
      const bal = await fetchXlmBalance(address);
      setBalance(bal);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setBalance("0.0000");
  };

  const navItems = [
    { href: "/", label: "Dashboard", badge: undefined, icon: LayoutDashboard },
    { href: "/treasury", label: "Treasury Center", badge: "12", icon: Wallet },
    { href: "/analytics", label: "Intelligence", badge: undefined, icon: BarChart3 },
    { href: "/routing", label: "Smart Routing", badge: undefined, icon: Route },
    { href: "/batch", label: "Batch Transfers", badge: undefined, icon: Layers },
    { href: "/transit", label: "Transit Center", badge: undefined, icon: Activity },
    { href: "/approvals", label: "Multi-Sig", badge: undefined, icon: ShieldCheck },
    { href: "/settings", label: "Settings", badge: undefined, icon: Settings },
  ];

  const mobileNavItems = navItems.slice(0, 5);

  const currentRouteName = navItems.find((item) => item.href === pathname)?.label || "Workspace";

  return (
    <div className="flex h-full w-full bg-background text-text-primary font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[280px] bg-surface/80 backdrop-blur-3xl border-r border-border flex-col flex-shrink-0 z-30 shadow-sm relative">
        <div className="p-8 flex items-center gap-4 border-b border-border">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-accent to-blue-400 flex items-center justify-center font-bold text-white shadow-lg">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">StellarFlow</span>
            <span className="text-[10px] text-text-secondary flex items-center gap-1 uppercase tracking-widest font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Mainnet
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="block relative group">
                <div className={`px-3 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  isActive 
                  ? "bg-accent/10 border border-accent/30 text-accent" 
                  : "text-text-secondary hover:bg-white/5 border border-transparent"
                }`}>
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                    <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-white/10 px-1 rounded text-text-secondary ml-2">{item.badge}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border space-y-4">
          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-border">
            <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center border border-white/10">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">GD3W...7K9A</span>
              <span className="text-[10px] text-text-secondary uppercase">Administrator</span>
            </div>
            <ChevronDown className="w-3 h-3 ml-auto text-text-secondary" />
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative pb-16 md:pb-0">
        {/* Header */}
        <header className="h-[70px] md:h-[80px] border-b border-border px-4 md:px-10 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-3xl z-20">
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
            <div className="md:hidden w-8 h-8 rounded bg-gradient-to-br from-accent to-blue-400 flex items-center justify-center font-bold text-white shadow-lg mr-2">
              S
            </div>
            <span className="hidden sm:inline text-text-secondary">Workspace</span>
            <ChevronDown className="hidden sm:inline w-3 h-3 text-white/20 -rotate-90" />
            <span className="font-medium text-text-primary">{currentRouteName}</span>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Press ⌘K to query..." 
                className="w-full bg-card border border-border rounded-full py-2 pl-10 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative">
            <div 
              className="relative p-2 bg-card rounded-full border border-border cursor-pointer hover:border-text-secondary transition-colors"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-text-secondary" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-background animate-pulse"></div>
            </div>
            
            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-12 right-0 md:right-[120px] w-72 md:w-80 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary">Notifications</h4>
                  <span className="text-[10px] text-text-secondary hover:text-text-primary cursor-pointer">Mark all as read</span>
                </div>
                <div className="divide-y divide-border">
                  <div className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-danger/10 border border-danger/20 flex flex-shrink-0 items-center justify-center text-danger mt-1">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Security Alert: Unusual Activity</p>
                      <p className="text-[10px] text-text-secondary mt-1">Multiple routing attempts detected from unregistered node identity.</p>
                      <p className="text-[10px] text-danger font-bold mt-2 uppercase tracking-widest">2 mins ago</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="hidden md:block h-8 w-[1px] bg-border"></div>
            {walletAddress ? (
              <div className="flex items-center gap-2 md:gap-3 bg-white/5 px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg border border-border">
                <span className="text-[10px] md:text-xs font-bold text-accent">{balance} XLM</span>
                <div className="h-4 w-[1px] bg-border"></div>
                <span className="text-[10px] md:text-xs text-text-secondary">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                <button onClick={handleDisconnect} className="hidden sm:inline text-[10px] text-danger ml-2 hover:underline">Disconnect</button>
              </div>
            ) : (
              <button 
                onClick={handleConnect}
                className="bg-accent hover:bg-blue-400 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg shadow-lg shadow-accent/20 transition-all"
              >
                Connect Wallet
              </button>
            )}
            <button className="hidden sm:block bg-white/10 hover:bg-white/20 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg border border-border transition-all">
              New Transfer
            </button>
            
            <div className="md:hidden ml-1">
                <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full h-full p-4 sm:p-6 md:p-10 lg:p-12 max-w-[1600px] mx-auto"
          >
            {children}
          </motion.div>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-border flex items-center justify-around z-50 h-16 px-2 pb-safe">
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className="flex-1 flex justify-center">
                  <div className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? "text-accent" : "text-text-secondary"}`}>
                    <item.icon className={`w-5 h-5 ${isActive ? "text-accent" : ""}`} />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
        </nav>
      </main>
    </div>
  );
}
