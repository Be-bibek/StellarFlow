"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex bg-black/20 p-1 rounded-full border border-border">
        <div className="p-1 rounded-full bg-border w-5 h-5" />
        <div className="p-1 rounded-full w-5 h-5" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between px-2 w-full mt-4">
      <span className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Theme</span>
      <div className="flex bg-black/20 p-1 rounded-full border border-border">
        <button
          onClick={() => setTheme("dark")}
          className={`p-1 rounded-full transition-colors ${isDark ? "bg-white/10" : ""}`}
        >
          <Moon className={`w-3 h-3 ${isDark ? "text-accent" : "text-text-secondary"}`} />
        </button>
        <button
          onClick={() => setTheme("light")}
          className={`p-1 rounded-full transition-colors ${!isDark ? "bg-white/10" : ""}`}
        >
          <Sun className={`w-3 h-3 ${!isDark ? "text-accent" : "text-text-secondary"}`} />
        </button>
      </div>
    </div>
  );
}
