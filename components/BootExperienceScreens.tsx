'use client'

import React from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, Server, Database, Activity, Lock, Globe, Zap, Shield, Loader2, ArrowRight } from 'lucide-react'
import { GradualBlurText } from './BootSequenceComponents'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  },
  exit: { opacity: 0, transition: { duration: 0.5 } }
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
}

// ----------------------------------------------------------------------
// Screen 1: Introduction
// ----------------------------------------------------------------------
export function ScreenIntro() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center text-center space-y-8"
    >
      <div className="space-y-4">
        <motion.h1 variants={item} className="text-4xl md:text-6xl font-serif italic text-slate-900 dark:text-white tracking-tight">
          StellarFlow
        </motion.h1>
        <motion.p variants={item} className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 font-light tracking-wide">
          AI-Powered Multi-Wallet Treasury Platform
        </motion.p>
      </div>

      <motion.div variants={item} className="pt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-600 mb-6 font-mono">Built using</p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 max-w-2xl">
          {['Next.js', 'Rust', 'PostgreSQL', 'Redis', 'WebSockets', 'Stellar'].map((tech) => (
            <motion.div key={tech} variants={item} className="px-4 py-2 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 rounded-full shadow-sm dark:shadow-none backdrop-blur-sm">
              <span className="text-sm text-slate-700 dark:text-zinc-300 font-mono">{tech}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ----------------------------------------------------------------------
// Screen 2: Architecture
// ----------------------------------------------------------------------
export function ScreenArchitecture() {
  const nodes = [
    { name: 'Browser', icon: Globe },
    { name: 'Next.js', icon: Activity },
    { name: 'Rust API', icon: Server },
    { name: 'Redis', icon: Lock },
    { name: 'PostgreSQL', icon: Database },
    { name: 'Stellar', icon: Zap },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center w-full max-w-4xl px-4"
    >
      <motion.h2 variants={item} className="text-sm font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500 mb-16">
        Data Flow Architecture
      </motion.h2>

      <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 md:gap-0">
        {nodes.map((node, i) => (
          <React.Fragment key={node.name}>
            <motion.div
              variants={item}
              className="flex flex-col items-center gap-3 relative group"
            >
              <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/50">
                <node.icon className="w-6 h-6 text-slate-400 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
              <span className="text-xs font-mono text-slate-600 dark:text-zinc-400">{node.name}</span>
            </motion.div>

            {i < nodes.length - 1 && (
              <motion.div
                variants={item}
                className="hidden md:flex flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent mx-4 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2, ease: 'linear' }}
                />
              </motion.div>
            )}
            
            {/* Mobile separator */}
            {i < nodes.length - 1 && (
              <motion.div variants={item} className="md:hidden h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  )
}

// ----------------------------------------------------------------------
// Screen 3: Comparison
// ----------------------------------------------------------------------
export function ScreenComparison() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center w-full max-w-5xl px-4"
    >
      <motion.h2 variants={item} className="text-3xl font-serif italic text-slate-900 dark:text-white mb-16">
        Why StellarFlow?
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={item} className="p-8 rounded-3xl border border-red-200 dark:border-red-500/10 bg-red-50 dark:bg-red-500/5 backdrop-blur-sm">
          <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-red-600 dark:text-red-400 mb-8">Traditional Treasury</h3>
          <ul className="space-y-6">
            {['Manual Payments', 'Single Wallet', 'Slow Settlement', 'Manual Approvals'].map(t => (
              <li key={t} className="flex items-center gap-3 text-slate-700 dark:text-zinc-400">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-500 text-xs">✕</span>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item} className="p-8 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 dark:from-emerald-500/5 to-transparent" />
          <h3 className="text-sm font-mono uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-8 relative z-10">StellarFlow</h3>
          <ul className="space-y-6 relative z-10">
            {['Multi Wallet Architecture', 'Smart Routing', 'Real-Time Transit', 'Multi-Sig Approvals', 'Cryptographic Settlement'].map(t => (
              <li key={t} className="flex items-center gap-3 text-slate-900 dark:text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ----------------------------------------------------------------------
// Screen 4: Engineering
// ----------------------------------------------------------------------
export function ScreenEngineering() {
  const highlights = [
    { title: 'Rust Backend', desc: 'Memory-safe, high-performance API' },
    { title: 'Redis Atomic Sequencer', desc: 'Zero double-spend architecture' },
    { title: 'AES-256-GCM', desc: 'Military-grade payload encryption' },
    { title: 'WebSocket Transit', desc: 'Real-time state synchronization' },
    { title: 'JIT Routing Engine', desc: 'Algorithmic liquidity sourcing' },
    { title: 'Real Stellar Testnet', desc: 'Live cryptographic ledgers' },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center w-full max-w-4xl px-4"
    >
      <motion.h2 variants={item} className="text-sm font-mono uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-12">
        Engineering Highlights
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {highlights.map((h, i) => (
          <motion.div key={h.title} variants={item} className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors shadow-sm dark:shadow-none">
            <div className="mt-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-zinc-200">{h.title}</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{h.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ----------------------------------------------------------------------
// Screen 5: Booting
// ----------------------------------------------------------------------
export function ScreenBooting({ 
  healthy, 
  onLaunch 
}: { 
  healthy: boolean
  onLaunch: () => void 
}) {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    if (healthy) {
      setProgress(100)
    } else {
      // Simulate erratic progress while waiting for the health check
      const interval = setInterval(() => {
        setProgress(p => {
          if (p > 85) return p
          return Math.min(85, p + Math.floor(Math.random() * 12) + 2)
        })
      }, 400)
      return () => clearInterval(interval)
    }
  }, [healthy])

  const checks = [
    { id: 'ui', label: 'UI Loaded', status: true },
    { id: 'backend', label: 'Backend Connected', status: healthy },
    { id: 'postgres', label: 'PostgreSQL Connected', status: healthy },
    { id: 'redis', label: 'Redis Connected', status: healthy },
    { id: 'stellar', label: 'Stellar Connected', status: healthy },
  ]

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center justify-center w-full max-w-md px-4"
    >
      <motion.h2 variants={item} className="text-sm font-mono uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500 mb-8">
        System Boot
      </motion.h2>

      {/* Circular Progress Indicator */}
      <motion.div variants={item} className="relative flex items-center justify-center mb-10">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            className="text-slate-200 dark:text-white/5"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="64"
            cy="64"
          />
          <circle
            className="text-indigo-500 transition-all duration-500 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="64"
            cy="64"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{progress}%</span>
          <span className="text-[8px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 mt-1">Boot Index</span>
        </div>
      </motion.div>

      <div className="w-full space-y-3 mb-12">
        {checks.map((check) => (
          <motion.div key={check.id} variants={item} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 shadow-sm dark:shadow-none">
            <span className="text-sm text-slate-700 dark:text-zinc-300 font-mono">{check.label}</span>
            {check.status ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            )}
          </motion.div>
        ))}
      </div>

      <motion.div variants={item}>
        {healthy ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onLaunch}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Launch Dashboard <ArrowRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <p className="text-xs font-mono text-amber-500 animate-pulse text-center">Waiting for services...</p>
        )}
      </motion.div>
    </motion.div>
  )
}
