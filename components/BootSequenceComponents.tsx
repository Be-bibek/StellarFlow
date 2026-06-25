'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Database, Server, Component, Zap, Blocks, ChevronDown } from 'lucide-react'
import Cubes from '@/components/Cubes'

const BootFluidLens = dynamic(() => import('@/components/BootFluidLens'), { ssr: false })

export function GradualBlurText({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  const words = text.split(' ')
  return (
    <div className={`flex flex-wrap gap-x-2 gap-y-1 ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: 'blur(16px)', opacity: 0, y: 8 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: delay + i * 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}

export function useBackendHealth(enabled: boolean) {
  const [healthy, setHealthy] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const start = Date.now()
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(tick)
  }, [enabled])

  useEffect(() => {
    if (!enabled || healthy) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080'

    const poll = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(`${apiUrl}/health`, { signal: controller.signal })
        clearTimeout(timeout)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'healthy') setHealthy(true)
        }
      } catch {
        /* cold start — keep polling */
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [enabled, healthy])

  return { healthy, elapsed }
}

export function BootHero({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onContinue, 2500)
    const handleScroll = () => onContinue()
    window.addEventListener('wheel', handleScroll, { once: true, passive: true })
    window.addEventListener('touchmove', handleScroll, { once: true, passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchmove', handleScroll)
    }
  }, [onContinue])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-20 flex flex-col items-center justify-center"
    >
      {/* Subtle cubes backdrop */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none hidden md:block">
        <Cubes gridSize={8} maxAngle={30} radius={2} faceColor="#0a0a0f" borderStyle="1px solid rgba(255,255,255,0.06)" shadow={false} autoAnimate />
      </div>

      {/* Fluid glass lens */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,90vw)] h-[min(420px,90vw)]">
          <BootFluidLens />
        </div>
      </div>

      {/* Orbit + logo */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <motion.div
          initial={{ scale: 0.75, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
        >
          <OrbitImages variant="hero" />
        </motion.div>

        <div className="text-center space-y-3">
          <GradualBlurText text="StellarFlow" className="text-4xl md:text-5xl font-serif italic tracking-tight text-white justify-center" />
          <GradualBlurText text="Enterprise Treasury Platform" delay={0.4} className="text-[11px] font-mono tracking-[0.35em] text-zinc-500 uppercase justify-center" />
          <GradualBlurText text="> Initializing Platform..." delay={1.2} className="text-xs font-mono text-indigo-400/70 justify-center mt-2" />
        </div>
      </div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="absolute bottom-10 text-zinc-600"
      >
        <ChevronDown className="w-5 h-5" />
      </motion.div>
    </motion.div>
  )
}

export function OrbitImages({ variant = 'mini' }: { variant?: 'hero' | 'mini' }) {
  const icons = [
    { icon: <Component className="w-5 h-5 text-blue-400" />, label: 'Next.js' },
    { icon: <Zap className="w-5 h-5 text-orange-400" />, label: 'Rust' },
    { icon: <Database className="w-5 h-5 text-green-400" />, label: 'PostgreSQL' },
    { icon: <Blocks className="w-5 h-5 text-red-400" />, label: 'Redis' },
    { icon: <Server className="w-5 h-5 text-purple-400" />, label: 'Stellar' },
  ]

  const size = variant === 'hero' ? 288 : 224
  const radius = size / 2
  const iconSize = variant === 'hero' ? 44 : 40

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className={`absolute rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center z-10 shadow-[0_0_40px_rgba(255,255,255,0.05)] ${variant === 'hero' ? 'w-16 h-16' : 'w-14 h-14'}`}>
        <span className="text-zinc-400 text-[10px] font-bold tracking-widest">CORE</span>
      </div>

      <div className="absolute w-full h-full rounded-full border border-zinc-800/50" />
      <div className="absolute w-3/4 h-3/4 rounded-full border border-zinc-800/30" />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: variant === 'hero' ? 30 : 40, repeat: Infinity, ease: 'linear' }}
        className="absolute w-full h-full"
      >
        {icons.map((item, i) => {
          const angle = (i / icons.length) * Math.PI * 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg"
              style={{
                width: iconSize,
                height: iconSize,
                left: `calc(50% + ${x}px - ${iconSize / 2}px)`,
                top: `calc(50% + ${y}px - ${iconSize / 2}px)`,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: variant === 'hero' ? 30 : 40, repeat: Infinity, ease: 'linear' }}
              title={item.label}
            >
              {item.icon}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

const potentialLogs = [
  '[INFO] Initializing Axum Server on Port 8080...',
  '[WARN] PostgreSQL Engine waking up (Cold Start)...',
  '[INFO] Redis Sequence Manager connection attempt...',
  '[OK] Redis Sequence Manager connected.',
  '[OK] PostgreSQL Engine synced.',
  '[INFO] Awaiting final health check probe...',
]

export function FaultyTerminal({ active }: { active: boolean }) {
  const [logs, setLogs] = useState<string[]>([
    '[INFO] Boot sequence initiated...',
    '[WARN] High latency expected on initial connection.',
  ])

  useEffect(() => {
    if (!active) return
    let i = 0
    const interval = setInterval(() => {
      if (i < potentialLogs.length) {
        setLogs(prev => [...prev, potentialLogs[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 1400)
    return () => clearInterval(interval)
  }, [active])

  return (
    <div className="font-mono text-[11px] text-indigo-400/90 rounded-lg p-4 h-40 flex flex-col overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2 mb-2 shrink-0">
        <span className="text-zinc-500 uppercase tracking-tighter text-[10px]">Backend Logs</span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        </div>
      </div>
      <div className="space-y-1 overflow-y-auto flex-1 flex flex-col justify-end pb-1 opacity-80">
        {logs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: [log.includes('[WARN]') ? 0.6 : 1, 1, log.includes('[WARN]') ? 0.85 : 1] }}
            transition={{ duration: 0.3, ...(log.includes('[WARN]') ? { repeat: 2 } : {}) }}
            className={`break-all ${log.includes('[WARN]') ? 'text-amber-400 italic' : log.includes('[OK]') ? 'text-emerald-400' : ''}`}
          >
            {log}
          </motion.div>
        ))}
        {active && (
          <div className="flex items-center">
            <motion.div
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="inline-block w-2 h-3.5 bg-white/80"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  )
}

// Keep exports used elsewhere if needed
export function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`spotlight-card-bg relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, rgba(139, 92, 246, 0.12) 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function TiltedCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 })
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 })
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['8deg', '-8deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-8deg', '8deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX / rect.width - 0.5)
    y.set(e.clientY / rect.height - 0.5)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="relative w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-sm"
    >
      {children}
    </motion.div>
  )
}

export function useStaggeredServices(backendHealthy: boolean, storyElapsed: number) {
  const getStatus = useCallback((service: string): 'success' | 'polling' | 'pending' => {
    if (service === 'ui') return 'success'
    if (!backendHealthy) return service === 'backend' ? 'polling' : 'pending'
    if (service === 'backend') return 'success'
    const delays: Record<string, number> = { postgres: 1, redis: 2, horizon: 3 }
    return storyElapsed >= delays[service] ? 'success' : 'pending'
  }, [backendHealthy, storyElapsed])

  return getStatus
}
