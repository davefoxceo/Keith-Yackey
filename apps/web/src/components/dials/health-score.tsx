"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthScoreProps {
  score: number;
  previousScore?: number;
  maxScore?: number;
}

export function HealthScore({ score, previousScore, maxScore = 100 }: HealthScoreProps) {
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 70) return { stroke: "#10b981", bg: "rgba(16, 185, 129, 0.15)", text: "text-emerald-400" };
    if (pct >= 40) return { stroke: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", text: "text-amber-400" };
    return { stroke: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)", text: "text-rose-400" };
  };

  const color = getColor(percentage);
  const trend = previousScore !== undefined
    ? score > previousScore ? "up" : score < previousScore ? "down" : "flat"
    : "flat";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color.stroke}40)` }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Heart className="w-4 h-4 text-rose-400 mb-1" />
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className={`text-2xl font-bold ${color.text}`}
          >
            {score}
          </motion.span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-white">Five Dials Health</p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-rose-400" />}
          {trend === "flat" && <Minus className="w-3 h-3 text-slate-500" />}
          <span className="text-xs text-slate-500">
            {previousScore !== undefined
              ? `${trend === "up" ? "+" : trend === "down" ? "-" : ""}${Math.abs(score - previousScore)} from last week`
              : "First assessment"}
          </span>
        </div>
      </div>
    </div>
  );
}
