import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ConversationMode } from '@coach-keith/shared';
import { colors } from '@/lib/theme';
import * as api from '@/lib/api';
import ChatBubble from '@/components/coaching/ChatBubble';
import ChatInput from '@/components/coaching/ChatInput';
import ConversationStarters from '@/components/coaching/ConversationStarters';
import TypingIndicator from '@/components/coaching/TypingIndicator';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MODES = [
  { value: ConversationMode.FREE_CHAT, label: 'Free Chat' },
  { value: ConversationMode.CRISIS, label: 'Crisis' },
  { value: ConversationMode.FRAMEWORK, label: 'Framework' },
  { value: ConversationMode.ACCOUNTABILITY, label: 'Accountability' },
];

const STARTERS = [
  "I had a fight with my wife last night",
  "Help me plan a date night",
  "I'm struggling to stay consistent",
  "How do I handle her criticism?",
  "I feel disconnected from my kids",
  "I need to set better boundaries",
];

export default function CoachTab() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState(ConversationMode.FREE_CHAT);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    // Show Keith's welcome when first opened with no messages
    if (!hasMessages) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hey brother. I'm here whenever you need to talk. What's on your mind today?",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const res = await api.createConversation(mode);
    if (res.success && res.data) {
      setConversationId(res.data.id);
      return res.data.id;
    }
    throw new Error('Failed to start conversation');
  }

  async function handleSend(text: string) {
    if (!text.trim()) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const cId = await ensureConversation();
      const res = await api.sendMessage(cId, text.trim());

      if (res.success && res.data) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: (res.data.assistantMessage as any)?.content ?? "I hear you, brother. Let me think on that.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          "Looks like we're having a connection issue. I'm still here -- try sending that again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }

  function handleStarterPress(text: string) {
    handleSend(text);
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <Animated.View entering={FadeInDown.delay(50).duration(300)}>
        <ChatBubble
          role={item.role}
          content={item.content}
          timestamp={formatTime(item.timestamp)}
        />
      </Animated.View>
    ),
    [],
  );

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="px-5 pt-2 pb-3 border-b border-surface-overlay/50"
      >
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mr-3">
            <Text className="text-lg">🎯</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-white">Coach Keith</Text>
            <Text className="text-xs text-green-400">Online</Text>
          </View>
        </View>

        {/* Mode Selector */}
        <View className="flex-row">
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.value}
              onPress={() => setMode(m.value)}
              className={`mr-2 px-4 py-1.5 rounded-full ${
                mode === m.value
                  ? 'bg-accent/20 border border-accent/40'
                  : 'bg-surface-raised border border-surface-overlay'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-medium ${
                  mode === m.value ? 'text-accent' : 'text-slate-400'
                }`}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListHeaderComponent={
            !hasMessages || messages.length <= 1 ? (
              <Animated.View entering={FadeInUp.delay(300).duration(500)}>
                <ConversationStarters
                  starters={STARTERS}
                  onPress={handleStarterPress}
                />
              </Animated.View>
            ) : null
          }
          ListFooterComponent={
            isTyping ? (
              <View className="mb-2">
                <TypingIndicator />
              </View>
            ) : null
          }
        />

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </View>
  );
}
