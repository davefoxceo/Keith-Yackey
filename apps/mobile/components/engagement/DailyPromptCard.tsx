import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/lib/theme';

interface DailyPromptCardProps {
  message: string;
  onAction?: () => void;
}

export default function DailyPromptCard({
  message,
  onAction,
}: DailyPromptCardProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      500,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.7,
  }));

  return (
    <Animated.View
      style={borderStyle}
      className="rounded-2xl overflow-hidden"
    >
      <LinearGradient
        colors={['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.04)', 'rgba(30,41,59,0.8)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-[1px] rounded-2xl"
      >
        <View className="bg-surface-raised rounded-2xl p-5">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-full bg-accent/20 items-center justify-center mr-2">
              <Ionicons
                name="sunny"
                size={18}
                color={colors.accent.default}
              />
            </View>
            <Text className="text-sm font-semibold text-accent">
              Today's Kickstart
            </Text>
          </View>

          <Text className="text-base text-slate-200 leading-6 italic">
            "{message}"
          </Text>

          <Text className="text-xs text-slate-500 mt-3">-- Coach Keith</Text>

          {onAction && (
            <TouchableOpacity
              onPress={onAction}
              className="flex-row items-center justify-center bg-accent/10 border border-accent/20 rounded-xl mt-4 py-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={16} color={colors.accent.default} />
              <Text className="text-sm font-semibold text-accent ml-2">
                Respond to Keith
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
