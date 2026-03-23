import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={style}
      className="w-2 h-2 rounded-full bg-slate-400 mx-0.5"
    />
  );
}

export default function TypingIndicator() {
  return (
    <View className="flex-row items-center mb-3">
      {/* Keith's Avatar */}
      <View className="w-8 h-8 rounded-full bg-accent/20 items-center justify-center mr-2">
        <Ionicons name="shield-checkmark" size={16} color={colors.accent.default} />
      </View>

      <View className="bg-surface-raised border border-surface-overlay rounded-2xl rounded-tl-sm px-5 py-4 flex-row items-center">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}
