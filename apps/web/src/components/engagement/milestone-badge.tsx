"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Star, Shield, Zap, Crown } from "lucide-react";

const milestoneIcons = {
  trophy: Trophy,
  star: Star,
  shield: Shield,
  zap: Zap,
  crown: Crown,
};

interface MilestoneBadgeProps {
  title: string;
  description: string;
  icon: keyof typeof milestoneIcons;
  achieved: boolean;
  date?: string;
}

export function MilestoneBadge({
  title,
  description,
  icon,
  achieved,
  date,
}: MilestoneBadgeProps) {
  const Icon = milestoneIcons[icon];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.03 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        achieved
          ? "bg-amber-500/10 border-amber-500/20"
          : "bg-slate-800/30 border-slate-700/30 opacity-50"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          achieved
            ? "bg-gradient-to-br from-amber-500 to-amber-700"
            : "bg-slate-700"
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            achieved ? "text-slate-900" : "text-slate-500"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            achieved ? "text-white" : "text-slate-500"
          }`}
        >
          {title}
        </p>
        <p className="text-xs text-slate-500 truncate">{description}</p>
      </div>
      {achieved && date && (
        <span className="text-[10px] text-amber-500/60 whitespace-nowrap">
          {date}
        </span>
      )}
    </motion.div>
  );
}
