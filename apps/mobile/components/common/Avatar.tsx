import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  tier?: 'FREE_TRIAL' | 'STANDARD' | 'PREMIUM';
}

const TIER_COLORS: Record<string, string> = {
  FREE_TRIAL: '#64748b',
  STANDARD: '#3b82f6',
  PREMIUM: '#f59e0b',
};

const TIER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  FREE_TRIAL: 'person',
  STANDARD: 'star',
  PREMIUM: 'diamond',
};

export default function Avatar({
  uri,
  name,
  size = 44,
  tier,
}: AvatarProps) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const fontSize = size * 0.38;

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surface.overlay,
          }}
        >
          <Text
            style={{ fontSize, color: colors.text.secondary, fontWeight: '700' }}
          >
            {initials}
          </Text>
        </View>
      )}

      {/* Tier Badge */}
      {tier && (
        <View
          className="absolute items-center justify-center"
          style={{
            bottom: -2,
            right: -2,
            width: size * 0.36,
            height: size * 0.36,
            borderRadius: size * 0.18,
            backgroundColor: TIER_COLORS[tier] ?? '#64748b',
            borderWidth: 2,
            borderColor: colors.surface.base,
          }}
        >
          <Ionicons
            name={TIER_ICONS[tier] ?? 'person'}
            size={size * 0.18}
            color="#fff"
          />
        </View>
      )}
    </View>
  );
}
