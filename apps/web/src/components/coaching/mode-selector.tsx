"use client";

import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, AlertTriangle, BookOpen, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationMode } from "@/hooks/use-chat";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const modes = [
  {
    id: "free" as ConversationMode,
    label: "Coach",
    icon: MessageCircle,
    description: "Keith asks questions to help you find your own answers",
    color: "#f59e0b",
  },
  {
    id: "framework" as ConversationMode,
    label: "Mentor",
    icon: BookOpen,
    description: "Keith shares frameworks, tools, and direct advice",
    color: "#3b82f6",
  },
  {
    id: "accountability" as ConversationMode,
    label: "Accountability",
    icon: Target,
    description: "Keith checks your commitments and calls out excuses",
    color: "#10b981",
  },
  {
    id: "crisis" as ConversationMode,
    label: "Crisis",
    icon: AlertTriangle,
    description: "For urgent situations — compassionate, grounding support",
    color: "#ef4444",
  },
];

interface ModeSelectorProps {
  currentMode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
}

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700/50">
      {modes.map((mode) => {
        const isActive = currentMode === mode.id;
        return (
          <Tooltip key={mode.id} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onModeChange(mode.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: `${mode.color}20` }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <mode.icon
                  className="w-3.5 h-3.5 relative z-10"
                  style={{ color: isActive ? mode.color : undefined }}
                />
                <span className="relative z-10 hidden sm:inline">
                  {mode.label}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{mode.description}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
