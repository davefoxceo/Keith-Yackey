import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface MilestoneBadgeProps {
  type: string;
  description: string;
}

const BADGE_CONFIG: Record<
  string,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }
> = {
  FIRST_CONVERSATION: { icon: 'chatbubble', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  FIRST_ASSESSMENT: { icon: 'analytics', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  FIRST_CHALLENGE_COMPLETED: { icon: 'flash', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  STREAK_7_DAYS: { icon: 'flame', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
  STREAK_30_DAYS: { icon: 'flame', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' },
  STREAK_90_DAYS: { icon: 'flame', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  STREAK_365_DAYS: { icon: 'trophy', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  ALL_DIALS_ASSESSED: { icon: 'disc', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  MARRIAGE_STAGE_UPGRADE: { icon: 'arrow-up-circle', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  BOOK_COMPLETED: { icon: 'book', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
};

export default function MilestoneBadge({ type, description }: MilestoneBadgeProps) {
  const config = BADGE_CONFIG[type] ?? {
    icon: 'star' as const,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.15)',
  };

  return (
    <View
      className="items-center rounded-2xl px-4 py-3 border border-surface-overlay"
      style={{ backgroundColor: config.bg, minWidth: 100 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: `${config.color}30` }}
      >
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <Text
        className="text-xs text-slate-300 text-center font-medium"
        numberOfLines={2}
      >
        {description}
      </Text>
    </View>
  );
}
