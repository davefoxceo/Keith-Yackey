import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/lib/theme';

interface DialSliderProps {
  label: string;
  description: string;
  value: number;
  color: string;
  onValueChange: (value: number) => void;
  large?: boolean;
}

export default function DialSlider({
  label,
  description,
  value,
  color,
  onValueChange,
  large = false,
}: DialSliderProps) {
  function handleValuePress(newValue: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(newValue);
  }

  const valueLabels: Record<number, string> = {
    1: 'Rock bottom',
    2: 'Very low',
    3: 'Struggling',
    4: 'Below average',
    5: 'Okay',
    6: 'Decent',
    7: 'Good',
    8: 'Strong',
    9: 'Excellent',
    10: 'Crushing it',
  };

  return (
    <View>
      {label ? (
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-base font-semibold text-white">{label}</Text>
          <Text className="text-lg font-bold" style={{ color }}>
            {value}
          </Text>
        </View>
      ) : null}
      {description ? (
        <Text className="text-sm text-slate-400 mb-3">{description}</Text>
      ) : null}

      {/* Dot selector */}
      <View className="flex-row justify-between items-center mb-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const isActive = num <= value;
          const isExact = num === value;
          const dotSize = large ? (isExact ? 'w-10 h-10' : 'w-8 h-8') : (isExact ? 'w-8 h-8' : 'w-6 h-6');

          return (
            <TouchableOpacity
              key={num}
              onPress={() => handleValuePress(num)}
              className={`rounded-full items-center justify-center ${dotSize}`}
              style={{
                backgroundColor: isActive ? `${color}${isExact ? '' : '40'}` : '#1e293b',
                borderWidth: isExact ? 2 : 1,
                borderColor: isExact ? color : '#334155',
              }}
              activeOpacity={0.6}
            >
              {(large || isExact) && (
                <Text
                  className={`font-bold ${large ? 'text-xs' : 'text-[10px]'}`}
                  style={{ color: isActive ? '#fff' : '#64748b' }}
                >
                  {num}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Value Label */}
      <Text className="text-center text-sm text-slate-400 mt-1">
        {valueLabels[value] ?? ''}
      </Text>
    </View>
  );
}
