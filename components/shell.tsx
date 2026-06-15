"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
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

  const currentRouteName = navItems.find((item) => item.href === pathname)?.label || "Workspace";

  return (
    <div className="flex h-full w-full bg-background text-text-primary font-sans overflow-hidden">
      {/* Sidebar - Fix width 260px matching Sleek Interface */}
      <aside className="w-[260px] bg-surface border-r border-border flex flex-col flex-shrink-0 z-20 shadow-sm relative">
        <div className="p-6 flex items-center gap-3 border-b border-border">
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
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header - Fixed Height 70px matching Sleek Interface */}
        <header className="h-[70px] border-b border-border px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-secondary">Workspace</span>
            <ChevronDown className="w-3 h-3 text-white/20 -rotate-90" />
            <span className="font-medium text-text-primary">{currentRouteName}</span>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Press ⌘K to query..." 
                className="w-full bg-card border border-border rounded-full py-2 pl-10 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative p-2 bg-card rounded-full border border-border cursor-pointer hover:border-text-secondary transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full ring-2 ring-background animate-pulse"></div>
            </div>
            <div className="h-8 w-[1px] bg-border"></div>
            <button className="bg-accent hover:bg-blue-400 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-accent/20 transition-all">
              New Transfer
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full h-full p-8"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
