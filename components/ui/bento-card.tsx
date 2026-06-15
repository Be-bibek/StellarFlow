"use client";

import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface BentoCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
  glass?: boolean;
}

export function BentoCard({ className, delay = 0, glass = false, children, ...props }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(
        "bg-card border border-border rounded-[24px] p-6 lg:p-8 flex flex-col relative overflow-hidden transition-all duration-300 shadow-sm",
        glass && "bg-surface/60 backdrop-blur-2xl border-white/10 shadow-2xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
