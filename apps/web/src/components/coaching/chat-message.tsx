"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ThumbsUp, ThumbsDown, Crown, Copy, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/hooks/use-chat";

interface ChatMessageProps {
  message: ChatMessageType;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
  isStreaming?: boolean;
}

export function ChatMessage({ message, onFeedback, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const isKeith = message.role === "assistant";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-3 max-w-3xl",
        isKeith ? "mr-auto" : "ml-auto flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isKeith ? (
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-amber-500/30">
            <Image
              src="/images/keith/keith-orderofman.png"
              alt="Coach Keith"
              width={36}
              height={36}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <Avatar className="w-9 h-9">
            <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
              You
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message bubble */}
      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
            isKeith
              ? "bg-surface-raised border border-slate-800 text-slate-200 rounded-tl-md"
              : "bg-amber-500/15 border border-amber-500/20 text-white rounded-tr-md"
          )}
        >
          {message.content}
          {isStreaming && isKeith && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block w-1.5 h-4 bg-amber-400 ml-1 rounded-sm align-middle"
            />
          )}
        </div>

        {/* Actions row */}
        {isKeith && !isStreaming && message.content && (
          <div className="flex items-center gap-1 px-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-all"
              title="Copy"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => onFeedback?.(message.id, "up")}
              className={cn(
                "p-1 rounded-md transition-all",
                message.feedback === "up"
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
              )}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onFeedback?.(message.id, "down")}
              className={cn(
                "p-1 rounded-md transition-all",
                message.feedback === "down"
                  ? "text-rose-400 bg-rose-500/10"
                  : "text-slate-600 hover:text-slate-400 hover:bg-slate-800"
              )}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
