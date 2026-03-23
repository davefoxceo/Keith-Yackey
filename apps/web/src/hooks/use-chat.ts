"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export type ConversationMode = "free" | "crisis" | "framework" | "accountability";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  feedback?: "up" | "down" | null;
  mode?: ConversationMode;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  mode: ConversationMode;
}

interface UseChatOptions {
  conversationId?: string;
  mode?: ConversationMode;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(options.conversationId);
  const [mode, setMode] = useState<ConversationMode>(options.mode || "free");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
        mode,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        mode,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const stream = api.stream("/coaching/chat", {
          conversationId,
          message: content,
          mode,
        });

        let fullContent = "";
        for await (const chunk of stream) {
          const text = chunk.text || chunk.content || "";
          fullContent += text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }

        if (!conversationId) {
          setConversationId(`conv-${Date.now()}`);
        }
      } catch (error) {
        console.error("Chat error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content:
                    "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
                }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId, mode]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const giveFeedback = useCallback(
    async (messageId: string, feedback: "up" | "down") => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg
        )
      );
      try {
        await api.post("/coaching/feedback", {
          messageId,
          conversationId,
          feedback,
        });
      } catch (error) {
        console.error("Feedback error:", error);
      }
    },
    [conversationId]
  );

  const loadConversation = useCallback(async (id: string) => {
    try {
      const data = await api.get<{ messages: ChatMessage[] }>(
        `/coaching/conversations/${id}`
      );
      setConversationId(id);
      setMessages(
        data.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      );
    } catch (error) {
      console.error("Load conversation error:", error);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>("/coaching/conversations");
      setConversations(data);
    } catch (error) {
      console.error("Load conversations error:", error);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    mode,
    conversations,
    setMode,
    sendMessage,
    stopStreaming,
    giveFeedback,
    loadConversation,
    loadConversations,
    startNewConversation,
  };
}
