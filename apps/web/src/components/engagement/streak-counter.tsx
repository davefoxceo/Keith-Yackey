"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  count: number;
  size?: "sm" | "md" | "lg";
}

export function StreakCounter({ count, size = "md" }: StreakCounterProps) {
  const sizeClasses = {
    sm: { wrapper: "gap-1.5 px-3 py-1.5", flame: "w-4 h-4", text: "text-sm", sub: "text-[10px]" },
    md: { wrapper: "gap-2 px-4 py-3", flame: "w-6 h-6", text: "text-2xl", sub: "text-xs" },
    lg: { wrapper: "gap-3 px-6 py-4", flame: "w-10 h-10", text: "text-4xl", sub: "text-sm" },
  };

  const s = sizeClasses[size];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center ${s.wrapper} rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20`}
    >
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [-3, 3, -3],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <Flame className={`${s.flame} text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]`} />
      </motion.div>
      <div>
        <motion.p
          key={count}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${s.text} font-bold text-gradient-gold leading-none`}
        >
          {count}
        </motion.p>
        <p className={`${s.sub} text-slate-400 font-medium`}>day streak</p>
      </div>
    </motion.div>
  );
}
