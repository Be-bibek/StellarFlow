'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Wallet, 
  ArrowRightLeft, 
  FileBox, 
  ActivitySquare, 
  ShieldCheck, 
  BarChart3, 
  Settings, 
  Bell, 
  Search, 
  Sun, 
  Moon, 
  Command, 
  User,
  LogOut,
  History,
  ArrowDownToLine
} from 'lucide-react';
import { DashboardView } from '@/components/views/dashboard-view';
import { TreasuryView } from '@/components/views/treasury-view';
import { RoutingView } from '@/components/views/routing-view';
import { BatchView } from '@/components/views/batch-view';
import { TransitView } from '@/components/views/transit-view';
import { MultiSigView } from '@/components/views/multisig-view';
import { AnalyticsView } from '@/components/views/analytics-view';
import { SettingsView } from '@/components/views/settings-view';
import { HistoryView } from '@/components/views/history-view';
import { GovernanceView } from '@/components/views/governance-view';
import { FundingView } from '@/components/views/funding-view';
import { useTheme } from 'next-themes';
import { auth, googleProvider, db } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDocFromServer, setDoc, query, collection, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useTransactionStore } from '@/lib/stores/transaction-store';

import { BootSequence } from '@/components/BootSequence';
import { IntroScreen } from '@/components/IntroScreen';
import { RecruiterModals } from '@/components/RecruiterModals';
import GooeyNav from '@/components/ui/gooey-nav';

type ActiveView = 'dashboard' | 'history' | 'treasury' | 'routing' | 'batch' | 'transit' | 'multisig' | 'analytics' | 'settings' | 'governance' | 'funding';

export default function AppShell() {
  const [introFinished, setIntroFinished] = useState(false);
  const [bootFinished, setBootFinished] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    // Skip boot sequence if already booted on this machine, or if the backend is healthy
    if (typeof window !== 'undefined' && window.localStorage.getItem('stellarflow_booted') === 'true') {
      setIntroFinished(true);
      setBootFinished(true);
    } else {
      // Ping backend; if it's already running, skip the fake boot sequence
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      fetch(`${apiUrl}/health`)
        .then(res => {
          if (res.ok) {
            setIntroFinished(true);
            setBootFinished(true);
            if (typeof window !== 'undefined') window.localStorage.setItem('stellarflow_booted', 'true');
          }
        })
        .catch(() => { /* ignore, show boot sequence */ });
    }
    


    // --- TEMPORARY MOCK AUTH ---
    setUser({
      uid: 'mock-user-123',
      email: 'admin@stellarflow.app',
      displayName: 'Test Admin',
      photoURL: null
    } as any);
    setLoadingAuth(false);

    // Connect to WebSocket
    useTransactionStore.getState().connectWebSocket();

    return () => {};
    // ---------------------------

    /*
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Ensure user profile exists
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDocFromServer(userRef);
          if (!snap.exists()) {
             await setDoc(userRef, {
               email: user.email,
               createdAt: String(Date.now()),
               role: 'operator'
             });
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
    */
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { id: 'dashboard',  label: 'Dashboard',             icon: Building2       },
    { id: 'history',    label: 'Transaction History',    icon: History         },
    { id: 'treasury',   label: 'Treasury Center',        icon: Wallet          },
    { id: 'funding',    label: 'Funding Center',         icon: ArrowDownToLine },
    { id: 'routing',    label: 'Smart Routing',          icon: ArrowRightLeft  },
    { id: 'batch',      label: 'Batch Transfers',        icon: FileBox         },
    { id: 'transit',    label: 'Transit Center',         icon: ActivitySquare  },
    { id: 'governance', label: 'Multi-Sig Governance',   icon: ShieldCheck     },
    { id: 'analytics',  label: 'Intelligence Analytics', icon: BarChart3       },
    { id: 'settings',   label: 'System Settings',        icon: Settings        },
  ] as const;

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'treasury': return <TreasuryView />;
      case 'routing': return <RoutingView onNavigate={setActiveView} />;
      case 'batch': return <BatchView />;
      case 'transit':    return <TransitView />;
      case 'analytics':  return <AnalyticsView />;
      case 'settings':   return <SettingsView />;
      case 'history':    return <HistoryView />;
      case 'governance': return <GovernanceView />;
      case 'funding':    return <FundingView />;
      default: return <DashboardView />;
    }
  };

// replacing header and adding notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Skip Firestore listener for mock/dev user — no real auth session
    if (!user || user.uid.startsWith('mock-')) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      snapshot.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const currentNav = navItems.find((n) => n.id === activeView);

  if (!mounted || loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#040208]">
        <div className="w-8 h-8 border-4 border-blue-500 dark:border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#040208]">
         <div className="bg-white dark:bg-[#110E1C] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-sm w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-xl bg-blue-600 dark:bg-indigo-600 flex items-center justify-center font-bold text-white text-2xl mb-6 shadow-lg shadow-blue-500/20 dark:shadow-indigo-500/20">
               SF
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">StellarFlow</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">Sign in to access the Enterprise Treasury Network</p>
            <button 
              onClick={handleLogin}
              className="w-full py-3 px-4 bg-blue-600 dark:bg-indigo-600 hover:bg-blue-500 dark:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" /> Sign In with Google
            </button>
         </div>
      </div>
    );
  }

  if (!introFinished) {
    return <IntroScreen onScrollComplete={() => setIntroFinished(true)} />;
  }

  if (!bootFinished) {
    return (
      <BootSequence onComplete={() => {
        setBootFinished(true);
        if (typeof window !== 'undefined') window.localStorage.setItem('stellarflow_booted', 'true');
      }} />
    );
  }

  return (
    <div className="flex h-screen w-full bg-transparent overflow-hidden">
      <RecruiterModals />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#08060D] flex-col z-20 transition-colors duration-500">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-4 transition-colors duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-2 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 w-full transition-colors">
              <div className="h-8 w-8 rounded-md bg-blue-600 dark:bg-indigo-600 flex items-center justify-center font-bold text-white">
                SF
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-semibold truncate uppercase tracking-widest text-blue-500 dark:text-indigo-500 dark:text-blue-500 dark:text-indigo-400">StellarFlow</div>
                <div className="text-[10px] text-slate-500 truncate">Mainnet: Online</div>
              </div>
            </div>
            
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-shrink-0 ml-2"
            >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-500 dark:text-indigo-500" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-all ${
                  isActive ? 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-3 w-1 h-4 bg-blue-500 dark:bg-indigo-500 rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-blue-600 dark:text-indigo-600 dark:text-white ml-2' : ''}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/10 transition-colors duration-500">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center border border-slate-200 dark:border-white/10 overflow-hidden flex-shrink-0">
                {user.photoURL ? <img src={user.photoURL} alt="User" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName || 'Operator'}</span>
                <span className="text-[10px] text-slate-500 truncate">{user.email}</span>
              </div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-red-500 flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {/* Header */}
        <header className="h-[70px] flex-shrink-0 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-md shadow-sm dark:shadow-xl flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0 transition-colors duration-500">
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-500 hidden sm:inline">Workspace</span>
            <span className="text-slate-500 hidden sm:inline">/</span>
            <span className="text-slate-900 dark:text-white">{currentNav?.label}</span>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="relative group w-40 sm:w-64 hidden sm:block">
              <input 
                type="text" 
                placeholder="Press ⌘K to query..." 
                className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-4 py-1.5 text-xs text-slate-900 dark:text-slate-400 focus:outline-none focus:border-blue-500 dark:border-indigo-500/50 transition-all placeholder:text-slate-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                ⌘K
              </div>
            </div>
            
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="lg:hidden relative p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-500 dark:text-indigo-500" />}
            </button>

            <div className="flex items-center gap-4 sm:border-l border-slate-200 dark:border-white/10 sm:pl-6 transition-colors">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:text-blue-600 dark:text-indigo-600 dark:hover:text-white text-slate-500 dark:text-slate-400 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 dark:bg-indigo-500 rounded-full border-2 border-white dark:border-[#040208]" />}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-4 lg:right-8 top-[60px] w-72 sm:w-80 bg-white dark:bg-[#110E1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                  >
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      {unreadCount > 0 && <span className="text-xs bg-blue-500 dark:bg-indigo-500/10 text-blue-500 dark:text-indigo-500 px-2 py-0.5 rounded-full font-medium">{unreadCount} New</span>}
                    </div>
                    <div className="flex flex-col max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-4 border-b border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-blue-500 dark:bg-indigo-500/5' : ''}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500 dark:bg-indigo-500' : 'bg-transparent'}`} />
                            <div className="flex flex-col flex-1">
                               <span className="text-sm font-medium">{n.title}</span>
                               <span className="text-xs text-slate-500 mt-1">{n.message}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation — GooeyNav */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#08060D]/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-white/10 z-40 transition-colors duration-300">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center px-3 py-2 min-w-max">
            <GooeyNav
              activeId={activeView}
              onSelect={(id) => setActiveView(id as ActiveView)}
              animationTime={500}
              particleCount={12}
              particleDistances={[70, 8]}
              particleR={80}
              timeVariance={250}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
              items={navItems.map((item) => ({
                id: item.id,
                label: item.label.replace('Center', '').replace('Intelligence ', '').replace('System ', '').trim(),
                icon: <item.icon className="w-5 h-5" />,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
