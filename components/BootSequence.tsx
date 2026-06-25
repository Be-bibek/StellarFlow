'use client'

import { useState, useEffect } from 'react'
import { Playfair_Display } from 'next/font/google'
import { motion, AnimatePresence } from 'motion/react'
import { BeamsBackground } from '@/components/ui/beams-background'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
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
  const { theme, setTheme } = useTheme()

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
    <div className={`min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 font-sans selection:bg-blue-200 dark:selection:bg-zinc-800 relative overflow-hidden transition-colors duration-500 ${playfair.className}`}>
      
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
        </button>
      </div>

      {/* Background Beams Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000" style={{ opacity: launched ? 0 : 1 }}>
        <BeamsBackground />
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
