"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/ui/tooltip";

interface DialCardProps {
  name: string;
  score: number;
  previousScore?: number;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

export function DialCard({
  name,
  score,
  previousScore,
  description,
  icon,
  color,
  onClick,
}: DialCardProps) {
  const trend =
    previousScore !== undefined
      ? score > previousScore
        ? "up"
        : score < previousScore
          ? "down"
          : "flat"
      : "flat";

  const trendIcons = {
    up: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
    down: <TrendingDown className="w-3.5 h-3.5 text-rose-400" />,
    flat: <Minus className="w-3.5 h-3.5 text-slate-500" />,
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-rose-400",
    flat: "text-slate-500",
  };

  const diff =
    previousScore !== undefined ? Math.abs(score - previousScore).toFixed(1) : null;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-surface-raised p-5 cursor-pointer group transition-all hover:border-slate-700"
    >
      {/* Score bar background */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 7) * 100}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>

      <h3 className="text-sm font-semibold text-white mb-1">{name}</h3>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{description}</p>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{score}</span>
          <span className="text-sm text-slate-500">/7</span>
        </div>
        {diff && (
          <InfoTip tip="Change from last week's assessment">
            <div className="flex items-center gap-1">
              {trendIcons[trend]}
              <span className={cn("text-xs font-medium", trendColors[trend])}>
                {trend === "up" ? "+" : trend === "down" ? "-" : ""}
                {diff}
              </span>
            </div>
          </InfoTip>
        )}
      </div>
    </motion.div>
  );
}
