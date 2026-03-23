import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Card from '@/components/common/Card';
import { colors } from '@/lib/theme';

interface StreakCounterProps {
  count: number;
}

export default function StreakCounter({ count }: StreakCounterProps) {
  const flameScale = useSharedValue(1);
  const flameRotation = useSharedValue(0);
  const countScale = useSharedValue(0.5);

  useEffect(() => {
    // Fire animation
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    flameRotation.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 400 }),
        withTiming(3, { duration: 400 }),
      ),
      -1,
      true,
    );

    // Count pop-in
    countScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 150 }));
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotation.value}deg` },
    ],
  }));

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  return (
    <Card>
      <View className="items-center py-2">
        <Animated.View style={flameStyle}>
          <Text className="text-3xl mb-1">{count > 0 ? '🔥' : '💤'}</Text>
        </Animated.View>
        <Animated.View style={countStyle}>
          <Text className="text-2xl font-bold text-white">{count}</Text>
        </Animated.View>
        <Text className="text-xs text-slate-400 mt-0.5">
          day{count !== 1 ? 's' : ''} streak
        </Text>
      </View>
    </Card>
  );
}
