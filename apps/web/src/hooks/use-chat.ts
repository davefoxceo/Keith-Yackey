"use client";

import { useState, useCallback, useRef } from "react";
import { api, API_BASE_URL, getAuthToken } from "@/lib/api";

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

  const refreshConversations = useCallback(async () => {
    try {
      const data = await api.get<{ items: Array<{ id: string; title: string; mode: string; messageCount: number; lastMessageAt: string; createdAt: string }> }>("/coaching/conversations");
      setConversations((data.items || []).map((item) => ({
        id: item.id,
        title: item.title,
        lastMessage: `${item.messageCount} messages`,
        updatedAt: new Date(item.lastMessageAt || item.createdAt),
        mode: (item.mode || "free") as ConversationMode,
      })));
    } catch { /* ignore */ }
  }, []);

  const processStream = useCallback(
    async (response: Response, assistantMessageId: string) => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") return;
            let parsed: { text?: string; content?: string };
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = { text: data };
            }
            const text = parsed.text || parsed.content || "";
            // Check for conversation ID metadata
            if (text.startsWith("\n[CONV_ID:")) {
              const match = text.match(/\[CONV_ID:(.+?)\]/);
              if (match) setConversationId(match[1]);
              continue;
            }
            fullContent += text;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
          }
        }
      }
    },
    []
  );

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
          // Check for conversation ID metadata
          if (text.startsWith("\n[CONV_ID:")) {
            const match = text.match(/\[CONV_ID:(.+?)\]/);
            if (match) setConversationId(match[1]);
            continue;
          }
          fullContent += text;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: fullContent }
                : msg
            )
          );
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
        refreshConversations();
      }
    },
    [conversationId, mode, refreshConversations]
  );

  const sendMessageWithImage = useCallback(
    async (content: string, imageFile: File) => {
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
        const formData = new FormData();
        formData.append("message", content);
        formData.append("image", imageFile);
        formData.append("mode", mode);
        if (conversationId) {
          formData.append("conversationId", conversationId);
        }

        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        // Do NOT set Content-Type; the browser sets it with the boundary for multipart

        const response = await fetch(`${API_BASE_URL}/coaching/chat-with-image`, {
          method: "POST",
          headers,
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        await processStream(response, assistantMessage.id);
      } catch (error) {
        console.error("Chat with image error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content:
                    "I apologize, but I'm having trouble processing your image right now. Please try again in a moment.",
                }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
        refreshConversations();
      }
    },
    [conversationId, mode, processStream, refreshConversations]
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
      const data = await api.get<{ items: Array<{ id: string; title: string; mode: string; messageCount: number; lastMessageAt: string; createdAt: string }> }>("/coaching/conversations");
      const convs: Conversation[] = (data.items || []).map((item) => ({
        id: item.id,
        title: item.title,
        lastMessage: `${item.messageCount} messages`,
        updatedAt: new Date(item.lastMessageAt || item.createdAt),
        mode: (item.mode || "free") as ConversationMode,
      }));
      setConversations(convs);
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
    sendMessageWithImage,
    stopStreaming,
    giveFeedback,
    loadConversation,
    loadConversations,
    startNewConversation,
  };
}
