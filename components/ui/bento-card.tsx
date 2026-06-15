"use client";

import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";

export interface BentoCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
  glass?: boolean;
  children?: React.ReactNode;
}

export function BentoCard({ className, delay = 0, glass = false, children, ...props }: BentoCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[24px] bg-card border border-border transition-all duration-300 shadow-xl dark:bg-[#09080C] dark:border-white/[0.08]",
        glass && "bg-white/40 dark:bg-white/[0.02] backdrop-blur-3xl border-white/20 dark:border-white/10",
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0 rounded-[24px]"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, var(--card-flare), transparent 40%)`,
        }}
      />
      <div className="relative z-10 flex flex-col flex-1 h-full">
        {children}
      </div>
    </motion.div>
  );
}
