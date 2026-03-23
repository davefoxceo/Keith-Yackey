"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Square, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  placeholder = "Talk to Coach Keith...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-surface-raised/80 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-800/50 p-2 focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none px-2 py-1.5 max-h-40"
          />

          <div className="flex items-center gap-1 shrink-0">
            {isStreaming ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={onStop}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors"
              >
                <Square className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!value.trim()}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                  value.trim()
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20"
                    : "bg-slate-700/50 text-slate-500"
                )}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-2">
          Coach Keith AI provides guidance based on Keith Yackey&apos;s teachings.
          Not a substitute for professional therapy.
        </p>
      </div>
    </div>
  );
}
