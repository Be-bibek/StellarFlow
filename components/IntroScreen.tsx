'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import GradualBlur from './GradualBlur';

export function IntroScreen({ onScrollComplete }: { onScrollComplete: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isExiting) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If they scrolled down decently far, trigger the exit animation
    if (scrollTop > 150) {
      setIsExiting(true);
      setTimeout(() => {
        onScrollComplete();
      }, 1500); // 1.5 second glossy fade out
    }
  };

  return (
    <motion.section 
      className="h-screen w-full bg-[#09090b] flex items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      {/* Subtle Dotted Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative w-[90%] max-w-3xl h-[500px] rounded-[32px] overflow-hidden border border-white/10 bg-black shadow-2xl z-10">
        
        {/* Scrollable Container inside the Card */}
        <div 
          onScroll={handleScroll}
          className="h-full w-full overflow-y-auto hide-scrollbar"
          style={{ padding: '4rem 2rem' }}
        >
          <div className="flex flex-col items-center justify-start min-h-[150vh]">
            
            <div className="flex flex-col items-center mt-[10vh] mb-[20vh] text-center">
              <motion.h1 
                initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
                animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="text-4xl md:text-6xl font-bold tracking-tight text-[#c4b5fd]"
              >
                Let's get started.
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-6 text-zinc-400 font-medium text-xl md:text-2xl tracking-tight"
              >
                Scroll inside this card.
              </motion.p>
            </div>

            {/* Liquid animated mesh background */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="relative w-full max-w-2xl h-[400px] rounded-[40px] overflow-hidden mb-32 border border-white/5"
            >
              <div className="absolute inset-0 bg-zinc-900">
                 <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#9333ea] rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob"></div>
                 <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-[#4f46e5] rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
                 <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Gradual Blur is anchored to the bottom of the card, blurring content that scrolls under it */}
        <GradualBlur
          target="parent"
          position="bottom"
          height="14rem"
          strength={4}
          divCount={8}
          curve="bezier"
          exponential={true}
          opacity={1}
        />
      </div>
      
      {/* CSS to hide scrollbar for sleekness */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.section>
  );
}
