'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import GradualBlur from './GradualBlur';

export function IntroScreen({ onScrollComplete }: { onScrollComplete: () => void }) {
  useEffect(() => {
    // We want to capture the first scroll down to proceed
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        onScrollComplete();
      }
    };
    
    // For touch devices
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touchEndY = e.touches[0].clientY;
      if (touchStartY - touchEndY > 20) { // scrolling down
        onScrollComplete();
      }
    };

    window.addEventListener('wheel', handleWheel);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onScrollComplete]);

  return (
    <motion.div 
      className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="relative w-full max-w-4xl h-[50vh] mt-48 rounded-[60px] overflow-hidden"
        >
          {/* Animated gradient background mimicking the visual */}
          <div className="absolute inset-0 bg-zinc-900">
             <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#9333ea] rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob"></div>
             <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#4f46e5] rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob animation-delay-4000"></div>
          </div>
        </motion.div>
      </div>

      <div className="z-10 flex flex-col items-center mt-[-10vh]">
        <motion.h1 
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="text-5xl md:text-8xl font-bold tracking-tight text-[#c4b5fd]"
        >
          Let's get started.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-8 text-white font-bold text-3xl md:text-5xl tracking-tight z-10"
        >
          Scroll Down.
        </motion.p>
      </div>

      {/* Gradual Blur at the bottom for aesthetic over the colored div */}
      <GradualBlur
        target="parent"
        position="bottom"
        height="16rem"
        strength={4}
        divCount={8}
        curve="bezier"
        exponential={true}
        opacity={1}
        className="z-20"
      />
    </motion.div>
  );
}
