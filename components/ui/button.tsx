"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    const variants = {
      primary: "bg-accent hover:bg-blue-400 text-white shadow-lg shadow-accent/20 border border-transparent",
      secondary: "bg-surface text-text-primary border border-border hover:bg-card",
      outline: "bg-transparent border border-border text-text-primary hover:bg-surface",
      ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface/50",
      danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20",
      success: "bg-success/10 text-success border border-success/20 hover:bg-success/20",
    };

    const sizes = {
      sm: "h-8 px-3 text-[10px] font-bold uppercase tracking-wide",
      md: "h-10 px-5 text-xs font-bold",
      lg: "h-12 px-6 text-sm font-bold",
      icon: "h-10 w-10 flex items-center justify-center",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
