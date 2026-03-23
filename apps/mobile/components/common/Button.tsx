import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  size = 'lg',
}: ButtonProps) {
  const scale = useSharedValue(1);

  function handlePressIn() {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  function handlePress() {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const baseClass = 'flex-row items-center justify-center rounded-2xl';
  const sizeClass =
    size === 'sm' ? 'py-2.5 px-4' : size === 'md' ? 'py-3 px-6' : 'py-4 px-6';

  const variantClass = {
    primary: isDisabled
      ? 'bg-accent/40'
      : 'bg-accent',
    secondary: 'bg-surface-raised border border-surface-overlay',
    outline: 'border border-accent bg-transparent',
    ghost: 'bg-transparent',
  }[variant];

  const textClass = {
    primary: isDisabled ? 'text-brand-navy/60' : 'text-brand-navy',
    secondary: 'text-slate-200',
    outline: 'text-accent',
    ghost: 'text-accent',
  }[variant];

  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        animStyle,
        variant === 'primary' && !isDisabled
          ? {
              shadowColor: '#f59e0b',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }
          : undefined,
      ]}
      className={`${baseClass} ${sizeClass} ${variantClass}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.surface.base : colors.accent.default}
        />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`font-bold ${textSize} ${textClass}`}>{title}</Text>
        </>
      )}
    </AnimatedTouchable>
  );
}
