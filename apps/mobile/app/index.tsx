import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Index() {
  const { isLoading, user, isOnboarded } = useAuth();
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Animated.View style={logoStyle} className="items-center">
          <Text className="text-4xl font-bold text-accent mb-2">Coach Keith</Text>
          <Animated.Text style={taglineStyle} className="text-base text-slate-400">
            Becoming the man your family needs
          </Animated.Text>
        </Animated.View>
        <ActivityIndicator
          size="large"
          color={colors.accent.default}
          style={{ marginTop: 40 }}
        />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
