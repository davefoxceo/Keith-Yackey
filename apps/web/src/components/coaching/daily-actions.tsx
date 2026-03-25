"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface DailyAction {
  id: string;
  text: string;
  targetDial: string;
  completed: boolean;
}

const dialColors: Record<string, string> = {
  Parent: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  Partner: "bg-pink-500/15 text-pink-400 border border-pink-500/20",
  Producer: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  Player: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  Power: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export function DailyActions() {
  const [actions, setActions] = useState<DailyAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActions() {
      try {
        const data = await api.get<DailyAction[]>("/coaching/daily-actions");
        setActions(data);
      } catch {
        // Silently handle — component is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchActions();
  }, []);

  async function handleToggle(actionId: string) {
    // Optimistic update
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId ? { ...a, completed: !a.completed } : a
      )
    );
    try {
      await api.post(`/coaching/daily-actions/${actionId}/complete`);
    } catch {
      // Revert on failure
      setActions((prev) =>
        prev.map((a) =>
          a.id === actionId ? { ...a, completed: !a.completed } : a
        )
      );
    }
  }

  const completedCount = actions.filter((a) => a.completed).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <CardTitle className="text-base">Daily Actions</CardTitle>
        </div>
        {!loading && actions.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {completedCount} of {actions.length} completed today
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 bg-slate-800 rounded animate-pulse"
              />
            ))}
          </div>
        ) : actions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No actions for today yet.
          </p>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            <AnimatePresence>
              {actions.map((action) => (
                <motion.button
                  key={action.id}
                  variants={item}
                  onClick={() => handleToggle(action.id)}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-colors ${
                    action.completed
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                      : "bg-slate-800/30 hover:bg-slate-800/60"
                  }`}
                >
                  {action.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      action.completed
                        ? "text-slate-500 line-through"
                        : "text-slate-200"
                    }`}
                  >
                    {action.text}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      dialColors[action.targetDial] || "bg-slate-700/50 text-slate-300"
                    }`}
                  >
                    {action.targetDial}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
