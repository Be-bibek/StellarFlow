"use client";

import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface BentoCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function BentoCard({ className, delay = 0, children, ...props }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={cn(
        "bg-card border border-border rounded-2xl p-5 flex flex-col shadow-sm relative overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
