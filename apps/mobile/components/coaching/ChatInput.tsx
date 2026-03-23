import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);

  const hasText = text.trim().length > 0;

  function handleSend() {
    if (!hasText) return;
    sendScale.value = withSpring(0.85, {}, () => {
      sendScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(text);
    setText('');
  }

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  return (
    <View
      className="border-t border-surface-overlay/50 bg-surface-raised px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row items-end">
        <TextInput
          ref={inputRef}
          className="flex-1 bg-surface border border-surface-overlay rounded-2xl px-4 py-3 text-white text-base mr-3"
          placeholder="Message Keith..."
          placeholderTextColor={colors.text.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          style={{ maxHeight: 120, minHeight: 44 }}
        />
        <Animated.View style={sendButtonStyle}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!hasText}
            className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 ${
              hasText ? 'bg-accent' : 'bg-surface-overlay'
            }`}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={hasText ? colors.surface.base : colors.text.muted}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}
