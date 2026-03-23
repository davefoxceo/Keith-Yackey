import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface ConversationStartersProps {
  starters: string[];
  onPress: (text: string) => void;
}

export default function ConversationStarters({
  starters,
  onPress,
}: ConversationStartersProps) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-3">
        <Ionicons name="bulb-outline" size={16} color={colors.accent.default} />
        <Text className="text-sm text-slate-400 ml-2">
          Start a conversation
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {starters.map((starter, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => onPress(starter)}
            className="bg-surface-raised border border-surface-overlay rounded-2xl px-4 py-3 mr-3"
            style={{ maxWidth: 200 }}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-slate-300" numberOfLines={2}>
              {starter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
