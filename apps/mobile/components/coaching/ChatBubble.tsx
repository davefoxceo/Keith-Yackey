import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <View
      className={`flex-row mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Keith's Avatar */}
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-accent/20 items-center justify-center mr-2 mt-1">
          <Ionicons name="shield-checkmark" size={16} color={colors.accent.default} />
        </View>
      )}

      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-accent rounded-tr-sm'
            : 'bg-surface-raised border border-surface-overlay rounded-tl-sm'
        }`}
      >
        <Text
          className={`text-base leading-6 ${
            isUser ? 'text-brand-navy' : 'text-slate-200'
          }`}
        >
          {content}
        </Text>
        <Text
          className={`text-[10px] mt-1.5 ${
            isUser ? 'text-brand-navy/60 text-right' : 'text-slate-500'
          }`}
        >
          {timestamp}
        </Text>
      </View>
    </View>
  );
}
