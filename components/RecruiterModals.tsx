'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Info, Code2, X, Component, Server, Database, Globe, Zap, Lock } from 'lucide-react'

export function RecruiterModals() {
  const [activeModal, setActiveModal] = useState<'architecture' | 'engineering' | null>(null)

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={() => setActiveModal('architecture')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md rounded-full shadow-lg transition-all text-xs text-zinc-300 hover:text-white font-mono"
        >
          <Globe className="w-3.5 h-3.5" />
          View Architecture
        </button>
        <button
          onClick={() => setActiveModal('engineering')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 backdrop-blur-md rounded-full shadow-lg transition-all text-xs text-indigo-300 hover:text-indigo-200 font-mono"
        >
          <Code2 className="w-3.5 h-3.5" />
          Engineering Decisions
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'architecture' && (
          <ArchitectureModal onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'engineering' && (
          <EngineeringModal onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-10 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}

function ArchitectureModal({ onClose }: { onClose: () => void }) {
  const nodes = [
    { name: 'Browser', icon: Globe, desc: 'Next.js React Client' },
    { name: 'Next.js', icon: Component, desc: 'Server Actions & API Routes' },
    { name: 'Rust API', icon: Server, desc: 'Axum High-Performance Engine' },
    { name: 'Redis', icon: Lock, desc: 'Atomic Sequence Locks' },
    { name: 'PostgreSQL', icon: Database, desc: 'ACID Financial Ledger' },
    { name: 'Stellar', icon: Zap, desc: 'Cryptographic Settlement' },
  ]

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-2xl font-serif italic text-white mb-2">System Architecture</h2>
      <p className="text-sm text-zinc-400 mb-12 font-mono">End-to-End Transaction Flow</p>

      <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4 md:gap-0 mt-8 mb-16">
        {nodes.map((node, i) => (
          <React.Fragment key={node.name}>
            <div className="flex flex-col items-center gap-4 relative group w-32">
              <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/50">
                <node.icon className="w-6 h-6 text-zinc-300 group-hover:text-indigo-400" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-bold text-zinc-200 mb-1">{node.name}</span>
                <span className="block text-[10px] text-zinc-500 leading-tight">{node.desc}</span>
              </div>
            </div>

            {i < nodes.length - 1 && (
              <div className="hidden md:flex flex-1 h-px bg-white/10 mx-2 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.2, ease: 'linear' }}
                />
              </div>
            )}
            
            {i < nodes.length - 1 && (
              <div className="md:hidden h-8 w-px bg-white/10" />
            )}
          </React.Fragment>
        ))}
      </div>
      
      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
        <h3 className="text-sm font-bold text-indigo-400 mb-2">Architecture Note</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The frontend communicates exclusively with Next.js Server Actions, which proxy authenticated requests to the Rust Axum backend. The Rust engine establishes an atomic lock in Redis to prevent double-spending, updates the internal PostgreSQL ledger for instant UI feedback, and asynchronously queues the cryptographic settlement to the Stellar Testnet.
        </p>
      </div>
    </ModalOverlay>
  )
}

function EngineeringModal({ onClose }: { onClose: () => void }) {
  const decisions = [
    { 
      title: 'Why Rust?', 
      desc: 'Financial backends require strict memory safety and predictable latency. Rust guarantees memory safety without a garbage collector, ensuring sub-millisecond API responses and zero runtime panics during critical transaction processing.' 
    },
    { 
      title: 'Why Redis?', 
      desc: 'Distributed systems are prone to race conditions. We use Redis as a distributed atomic sequencer lock. Before a transaction is executed, a lock is acquired using the wallet ID, ensuring a double-spend is mathematically impossible even under massive concurrent load.' 
    },
    { 
      title: 'Why PostgreSQL?', 
      desc: 'While Stellar acts as the ultimate source of truth, an internal ACID-compliant ledger is necessary to provide instant UI feedback to users, store off-chain metadata (like approval flows), and handle internal accounting reconciliation.' 
    },
    { 
      title: 'Why Stellar?', 
      desc: 'Stellar was built ground-up for payments. Unlike Ethereum, it settles in ~3-5 seconds deterministically with fractions of a penny in fees, making it the only viable network for a high-frequency enterprise treasury application.' 
    },
    { 
      title: 'Why WebSockets?', 
      desc: 'Treasury operators need real-time certainty. Instead of polling the backend to see if a Stellar transaction succeeded, the Rust engine pushes real-time state changes via WebSockets directly to the React UI.' 
    },
  ]

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-2xl font-serif italic text-white mb-2">Engineering Decisions</h2>
      <p className="text-sm text-zinc-400 mb-8 font-mono">Rationale Behind the Tech Stack</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {decisions.map((d) => (
          <div key={d.title} className="p-6 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <h3 className="text-sm font-bold text-indigo-400 mb-3">{d.title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{d.desc}</p>
          </div>
        ))}
      </div>
    </ModalOverlay>
  )
}
