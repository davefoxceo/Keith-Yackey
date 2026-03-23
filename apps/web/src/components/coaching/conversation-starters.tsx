"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  AlertTriangle,
  BookOpen,
  Target,
  Heart,
  Dumbbell,
} from "lucide-react";

const starters = [
  {
    icon: Heart,
    text: "My wife and I had a fight last night",
    color: "#f43f5e",
  },
  {
    icon: Target,
    text: "Help me set goals for this week",
    color: "#f59e0b",
  },
  {
    icon: Dumbbell,
    text: "I've been slacking on my fitness",
    color: "#10b981",
  },
  {
    icon: BookOpen,
    text: "Explain the Five Dials framework",
    color: "#3b82f6",
  },
  {
    icon: AlertTriangle,
    text: "I think my marriage is in trouble",
    color: "#ef4444",
  },
  {
    icon: MessageCircle,
    text: "I need accountability on my goals",
    color: "#8b5cf6",
  },
];

interface ConversationStartersProps {
  onSelect: (text: string) => void;
}

export function ConversationStarters({ onSelect }: ConversationStartersProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
          <MessageCircle className="w-8 h-8 text-slate-900" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          What&apos;s on your mind, brother?
        </h2>
        <p className="text-sm text-slate-400 max-w-md">
          I&apos;m here to help you become the best version of yourself. Pick a
          topic or just start talking.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {starters.map((starter, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(starter.text)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-800 bg-surface-raised hover:border-slate-700 transition-all text-left group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${starter.color}20` }}
            >
              <starter.icon
                className="w-4 h-4"
                style={{ color: starter.color }}
              />
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              {starter.text}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
