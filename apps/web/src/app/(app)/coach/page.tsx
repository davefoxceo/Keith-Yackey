"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Clock,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/coaching/chat-message";
import { ChatInput } from "@/components/coaching/chat-input";
import { ConversationStarters } from "@/components/coaching/conversation-starters";
import { ModeSelector } from "@/components/coaching/mode-selector";
import { useChat, type Conversation, type ConversationMode } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

const mockConversations: Conversation[] = [
  {
    id: "1",
    title: "Communication with Sarah",
    lastMessage: "Try the mirror technique we discussed...",
    updatedAt: new Date(Date.now() - 3600000),
    mode: "free",
  },
  {
    id: "2",
    title: "Player accountability",
    lastMessage: "Your consistency is paying off, brother",
    updatedAt: new Date(Date.now() - 86400000),
    mode: "accountability",
  },
  {
    id: "3",
    title: "Five Dials deep dive",
    lastMessage: "Let's focus on the Producer dial this week",
    updatedAt: new Date(Date.now() - 172800000),
    mode: "framework",
  },
];

export default function CoachPage() {
  const {
    messages,
    isStreaming,
    mode,
    setMode,
    sendMessage,
    stopStreaming,
    giveFeedback,
    startNewConversation,
  } = useChat();

  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (content: string) => {
    sendMessage(content);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Conversation Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:flex flex-col border-r border-slate-800 bg-surface/50 overflow-hidden"
          >
            <div className="p-3 border-b border-slate-800">
              <Button
                onClick={startNewConversation}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {mockConversations.map((conv) => (
                <button
                  key={conv.id}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-800/60 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors truncate">
                      {conv.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {conv.lastMessage}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] text-slate-600">
                      {conv.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-surface-raised/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            >
              {showSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <Crown className="w-4 h-4 text-slate-900" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Coach Keith AI
                </h2>
                <p className="text-[10px] text-emerald-400">Online</p>
              </div>
            </div>
          </div>
          <ModeSelector currentMode={mode} onModeChange={setMode} />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <ConversationStarters onSelect={handleSend} />
          ) : (
            <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onFeedback={giveFeedback}
                  isStreaming={
                    isStreaming &&
                    msg.role === "assistant" &&
                    index === messages.length - 1
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
