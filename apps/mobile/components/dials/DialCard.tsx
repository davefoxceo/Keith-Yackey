import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { TrendDirection } from '@coach-keith/shared';
import Card from '@/components/common/Card';
import { colors } from '@/lib/theme';

interface DialCardProps {
  name: string;
  score: number;
  trend: TrendDirection;
  description: string;
  color: string;
}

function getTrendIcon(
  trend: TrendDirection,
): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  switch (trend) {
    case 'up':
      return { name: 'trending-up', color: '#10b981' };
    case 'down':
      return { name: 'trending-down', color: '#f43f5e' };
    default:
      return { name: 'remove', color: '#64748b' };
  }
}

export default function DialCard({
  name,
  score,
  trend,
  description,
  color,
}: DialCardProps) {
  const trendInfo = getTrendIcon(trend);

  // Score bar width percentage
  const barWidth = `${(score / 10) * 100}%`;

  return (
    <Card>
      <View className="flex-row items-center">
        {/* Color indicator */}
        <View
          className="w-1 h-14 rounded-full mr-4"
          style={{ backgroundColor: color }}
        />

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-base font-semibold text-white">{name}</Text>
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-white mr-2">
                {score}
              </Text>
              <Ionicons
                name={trendInfo.name}
                size={16}
                color={trendInfo.color}
              />
            </View>
          </View>

          <Text className="text-xs text-slate-400 mb-2" numberOfLines={1}>
            {description}
          </Text>

          {/* Score Bar */}
          <View className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
            <Animated.View
              entering={FadeIn.duration(800)}
              className="h-full rounded-full"
              style={{
                width: barWidth,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}
