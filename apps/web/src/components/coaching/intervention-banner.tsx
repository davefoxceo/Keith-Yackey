"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Intervention {
  id: string;
  type: "warning" | "escalation" | "critical" | "celebration";
  message: string;
  deliveredAt?: string;
}

const borderColorMap: Record<Intervention["type"], string> = {
  warning: "border-amber-500/60",
  escalation: "border-orange-500/60",
  critical: "border-red-500/60",
  celebration: "border-emerald-500/60",
};

const bgColorMap: Record<Intervention["type"], string> = {
  warning: "bg-amber-500/5",
  escalation: "bg-orange-500/5",
  critical: "bg-red-500/5",
  celebration: "bg-emerald-500/5",
};

export function InterventionBanner() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function fetchInterventions() {
      try {
        const data = await api.get<{ items: Intervention[] }>("/coaching/interventions");
        if (mounted && data.items?.length) {
          setInterventions(data.items);
        }
      } catch {
        // Silently fail - interventions are supplemental
      }
    }
    fetchInterventions();
    return () => { mounted = false; };
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const pending = interventions.filter((i) => !dismissed.has(i.id));

  if (pending.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-4xl mx-auto space-y-2">
      <AnimatePresence>
        {pending.map((intervention) => (
          <motion.div
            key={intervention.id}
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3",
                borderColorMap[intervention.type],
                bgColorMap[intervention.type]
              )}
            >
              {/* Keith avatar */}
              <div className="shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/30">
                  <Image
                    src="/images/keith/keith-dadedge-recent.jpg"
                    alt="Coach Keith"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Message */}
              <p className="flex-1 text-sm text-slate-200 leading-relaxed">
                {intervention.message}
              </p>

              {/* Dismiss */}
              <button
                onClick={() => handleDismiss(intervention.id)}
                className="shrink-0 p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
