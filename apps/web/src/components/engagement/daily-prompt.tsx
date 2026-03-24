"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Sunrise, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyPromptProps {
  prompt: string;
  completed?: boolean;
  onStart?: () => void;
}

export function DailyPrompt({ prompt, completed = false, onStart }: DailyPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-surface-raised to-surface-raised p-6"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Sunrise className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-400">
              Morning Kickstart
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Daily Challenge
            </p>
          </div>
          {completed && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/20 mt-0.5">
            <Image
              src="/images/keith/keith-dadedge-recent.jpg"
              alt="Coach Keith"
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </div>
          <p className="text-white font-medium leading-relaxed text-[15px]">
            &ldquo;{prompt}&rdquo;
          </p>
        </div>

        {!completed && (
          <Button
            onClick={onStart}
            variant="outline"
            size="sm"
            className="group"
          >
            Start Today&apos;s Challenge
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
