'use client'

import { useState, useEffect, useCallback } from 'react'
import { Playfair_Display } from 'next/font/google'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, CircleDashed, Loader2, Zap } from 'lucide-react'
import Lightfall from '@/components/Lightfall'
import GlassSurface from '@/components/GlassSurface'
import {
  GradualBlurText,
  BootHero,
  OrbitImages,
  FaultyTerminal,
  ScrollReveal,
  useBackendHealth,
  useStaggeredServices,
} from '@/components/BootSequenceComponents'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600'], style: ['italic'] })

const MIN_STORY_SEC = 6
const MAX_WAIT_SEC = 45

function StatusItem({ label, status }: { label: string; status: 'success' | 'polling' | 'pending' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 text-sm"
    >
      {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
      {status === 'polling' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
      {status === 'pending' && <CircleDashed className="w-4 h-4 text-zinc-600 shrink-0" />}
      <span className={status === 'pending' ? 'text-zinc-600' : 'text-zinc-300'}>{label}</span>
      {status === 'success' && (
        <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">READY</span>
      )}
      {status === 'polling' && (
        <span className="ml-auto text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">COLD_START</span>
      )}
      {status === 'pending' && (
        <span className="ml-auto text-[10px] px-2 py-0.5 border border-zinc-700 text-zinc-600 rounded">PENDING</span>
      )}
    </motion.div>
  )
}

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'hero' | 'story' | 'ready'>('hero')
  const [launched, setLaunched] = useState(false)
  const { healthy, elapsed: pollElapsed } = useBackendHealth(phase !== 'hero')
  const getStatus = useStaggeredServices(healthy, pollElapsed)

  const enterStory = useCallback(() => setPhase(p => (p === 'hero' ? 'story' : p)), [])

  useEffect(() => {
    if (phase !== 'story') return
    if (healthy && pollElapsed >= MIN_STORY_SEC) {
      setPhase('ready')
    }
  }, [phase, healthy, pollElapsed])

  useEffect(() => {
    if (launched) {
      const t = setTimeout(() => onComplete(), 1500)
      return () => clearTimeout(t)
    }
  }, [launched, onComplete])

  if (launched) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white relative overflow-hidden ${playfair.className}`}
      >
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Lightfall
            colors={['#a6c8ff', '#5227ff', '#ff9ffc']}
            backgroundColor="#0a29ff"
            speed={0.5}
            streakCount={2}
            streakWidth={1}
            streakLength={1}
            glow={1}
            density={0.6}
            twinkle={1}
            zoom={3}
            backgroundGlow={0.5}
            opacity={1}
            mouseInteraction={true}
            mouseStrength={0.5}
            mouseRadius={1}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute w-96 h-96 gradient-blur -top-48 -left-48" />
        </div>
        <motion.div
          initial={{ scale: 0.92, filter: 'blur(12px)' }}
          animate={{ scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="z-10 flex flex-col items-center"
        >
          <GradualBlurText text="Welcome to StellarFlow." className="text-2xl font-serif italic tracking-widest text-zinc-200 justify-center" />
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 relative overflow-hidden ${playfair.className}`}>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Lightfall
          colors={['#a6c8ff', '#5227ff', '#ff9ffc']}
          backgroundColor="#0a29ff"
          speed={0.5}
          streakCount={2}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={0.6}
          twinkle={1}
          zoom={3}
          backgroundGlow={0.5}
          opacity={1}
          mouseInteraction={true}
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute w-96 h-96 gradient-blur -top-48 -left-48" />
        <div
          className="absolute w-96 h-96 gradient-blur -bottom-48 -right-48"
          style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Hero intro */}
      <AnimatePresence>
        {phase === 'hero' && <BootHero onContinue={enterStory} />}
      </AnimatePresence>

      {/* Compact split panel */}
      {phase !== 'hero' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col md:flex-row min-h-screen"
        >
          {/* Left — status anchor */}
          <div className="md:w-[38%] lg:w-[32%] p-6 md:p-10 md:sticky top-0 md:h-screen flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-900/80 shrink-0">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border-2 border-indigo-500/80 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 bg-indigo-500 rounded-sm rotate-45" />
                </div>
                <div>
                  <GradualBlurText text="StellarFlow" className="text-xl font-serif italic text-white" />
                  <p className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase mt-0.5">Treasury Platform</p>
                </div>
              </div>

              <p className="text-xs font-mono text-zinc-500">
                {phase === 'ready' ? '> System online.' : '> Waking backend services...'}
              </p>

              <GlassSurface
                width="100%"
                height="auto"
                borderRadius={16}
                backgroundOpacity={0.08}
                blur={10}
                saturation={1.4}
                className="!items-stretch !justify-start p-5"
              >
                <div className="w-full space-y-3">
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Service Health</h3>
                  <div className="space-y-3">
                    <StatusItem label="UI Interface Layer" status={getStatus('ui')} />
                    <StatusItem label="Rust Backend (Axum)" status={getStatus('backend')} />
                    <StatusItem label="PostgreSQL Engine" status={getStatus('postgres')} />
                    <StatusItem label="Redis Sequence Manager" status={getStatus('redis')} />
                    <StatusItem label="Horizon Network Node" status={getStatus('horizon')} />
                  </div>
                </div>
              </GlassSurface>
            </div>

            <div className="hidden md:flex justify-center my-6 opacity-60 pointer-events-none">
              <OrbitImages variant="mini" />
            </div>

            <GlassSurface
              width="100%"
              height={52}
              borderRadius={999}
              backgroundOpacity={0.06}
              blur={8}
              className="mt-6 md:mt-0"
            >
              <AnimatePresence mode="wait">
                {phase === 'ready' ? (
                  <motion.button
                    key="launch"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      boxShadow: [
                        '0 0 16px rgba(16,185,129,0.25)',
                        '0 0 32px rgba(16,185,129,0.45)',
                        '0 0 16px rgba(16,185,129,0.25)',
                      ],
                    }}
                    transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
                    onClick={() => setLaunched(true)}
                    className="w-full h-full font-serif italic text-sm text-emerald-300 hover:text-white transition-colors"
                  >
                    Launch Dashboard →
                  </motion.button>
                ) : (
                  <motion.div
                    key="wait"
                    className="flex items-center justify-center gap-2 text-zinc-500 font-serif italic text-sm"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Environment Booting
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassSurface>
          </div>

          {/* Right — short story + terminal */}
          <div className="md:w-[62%] lg:w-[68%] p-6 md:p-12 md:px-16 h-auto md:h-screen overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-8 pb-16">
              <ScrollReveal>
                <GlassSurface
                  width="100%"
                  height="auto"
                  borderRadius={16}
                  backgroundOpacity={0.06}
                  blur={10}
                  className="!items-stretch !justify-start p-6 md:p-8"
                >
                  <div>
                    <h2 className="text-lg font-serif italic text-white mb-3">Built for Enterprise Treasury</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      StellarFlow pairs a fluid Next.js experience with a Rust-powered transaction engine —
                      PostgreSQL persistence, Redis sequence locking, and Stellar Horizon sync in one platform.
                    </p>
                  </div>
                </GlassSurface>
              </ScrollReveal>

              {pollElapsed >= 3 && (
                <ScrollReveal>
                  <GlassSurface
                    width="100%"
                    height="auto"
                    borderRadius={16}
                    backgroundOpacity={0.06}
                    blur={10}
                    className="!items-stretch !justify-start p-5 md:p-6"
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <p className="text-sm text-zinc-300 font-medium">Render Cold Start</p>
                        {pollElapsed < MAX_WAIT_SEC && phase !== 'ready' && (
                          <span className="ml-auto text-[10px] font-mono text-zinc-500">
                            {pollElapsed}s elapsed
                          </span>
                        )}
                      </div>
                      <FaultyTerminal active={phase !== 'ready'} />
                      {pollElapsed >= MAX_WAIT_SEC && !healthy && (
                        <p className="text-xs text-zinc-500 mt-3 font-mono">
                          Backend is taking longer than usual — launch will unlock once health check passes.
                        </p>
                      )}
                    </div>
                  </GlassSurface>
                </ScrollReveal>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
