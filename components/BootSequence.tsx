'use client'

import { useState, useEffect } from 'react'
import { Playfair_Display } from 'next/font/google'
import { motion, AnimatePresence } from 'motion/react'
import Silk from '@/components/Silk'
import { useBackendHealth } from '@/components/BootSequenceComponents'
import { 
  ScreenIntro, 
  ScreenArchitecture, 
  ScreenComparison, 
  ScreenEngineering, 
  ScreenBooting 
} from '@/components/BootExperienceScreens'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600'], style: ['italic'] })

// How long each screen stays before auto-advancing (in ms)
const SCREEN_DURATION = 5000 

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [screen, setScreen] = useState<number>(1)
  const { healthy } = useBackendHealth(true)
  const [launched, setLaunched] = useState(false)

  // Auto-advance screens 1 through 4
  useEffect(() => {
    if (screen >= 5 || launched) return

    const timer = setTimeout(() => {
      setScreen(s => s + 1)
    }, SCREEN_DURATION)

    return () => clearTimeout(timer)
  }, [screen, launched])

  // Handle launch transition
  useEffect(() => {
    if (launched) {
      const t = setTimeout(() => onComplete(), 1000)
      return () => clearTimeout(t)
    }
  }, [launched, onComplete])

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800 relative overflow-hidden ${playfair.className}`}>
      {/* Background Silk Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen transition-opacity duration-1000" style={{ opacity: launched ? 0 : 0.8 }}>
        <Silk
          speed={5}
          scale={1}
          color="#ff0000"
          noiseIntensity={1.5}
          rotation={4.39}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute w-96 h-96 gradient-blur -top-48 -left-48" />
        <div
          className="absolute w-96 h-96 gradient-blur -bottom-48 -right-48"
          style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <AnimatePresence mode="wait">
          {!launched && screen === 1 && <ScreenIntro key="1" />}
          {!launched && screen === 2 && <ScreenArchitecture key="2" />}
          {!launched && screen === 3 && <ScreenComparison key="3" />}
          {!launched && screen === 4 && <ScreenEngineering key="4" />}
          {!launched && screen === 5 && (
            <ScreenBooting 
              key="5" 
              healthy={healthy} 
              onLaunch={() => setLaunched(true)} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Skip indicator (optional, for dev or impatient users) */}
      {!launched && screen < 5 && (
        <div className="absolute bottom-8 right-8 z-20">
          <button 
            onClick={() => setScreen(5)}
            className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            Skip Intro
          </button>
        </div>
      )}
    </div>
  )
}
