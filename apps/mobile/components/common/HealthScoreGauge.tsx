import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Card from '@/components/common/Card';
import { colors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HealthScoreGaugeProps {
  score: number;
  maxScore?: number;
}

export default function HealthScoreGauge({
  score,
  maxScore = 100,
}: HealthScoreGaugeProps) {
  const progress = useSharedValue(0);
  const numberScale = useSharedValue(0.5);

  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withDelay(
      400,
      withTiming(score / maxScore, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    numberScale.value = withDelay(400, withSpring(1, { damping: 10 }));
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));

  function getColor(): string {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#f97316';
    return '#f43f5e';
  }

  const gaugeColor = getColor();

  return (
    <Card>
      <View className="items-center py-2">
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            {/* Background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#334155"
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.4}
            />
            {/* Progress ring */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          {/* Center Number */}
          <Animated.View
            style={[
              numberStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Text className="text-xl font-bold text-white">{score}</Text>
          </Animated.View>
        </View>
        <Text className="text-xs text-slate-400 mt-1.5">Health Score</Text>
      </View>
    </Card>
  );
}
