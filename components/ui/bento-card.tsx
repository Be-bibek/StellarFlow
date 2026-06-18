'use client';

import { motion, HTMLMotionProps } from 'motion/react';
import { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface BentoCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  noPadding?: boolean;
}

export function BentoCard({ children, delay = 0, className = '', noPadding = false, ...props }: BentoCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect\n    setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const isDark = mounted && (resolvedTheme === 'dark' || resolvedTheme === undefined);
  const spotlightColor = isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(197, 160, 89, 0.07)';

  return (
    <motion.div
      ref={divRef}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-xl border border-[rgba(212,163,89,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[#FFFFFF] dark:bg-[#0D0B14] backdrop-blur-[14px] saturate-120 dark:backdrop-blur-[16px] shadow-sm transition-colors duration-[450ms] ease-in-out ${className}`}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className={`relative z-10 h-full ${noPadding ? '' : 'p-4 md:p-6'}`}>
        {children}
      </div>
    </motion.div>
  );
}
