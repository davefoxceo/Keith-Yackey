import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  SlideInRight,
  SlideOutLeft,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DIALS, DialType } from '@coach-keith/shared';
import { colors, dialColors } from '@/lib/theme';
import { submitAssessment } from '@/lib/api';
import DialSlider from '@/components/dials/DialSlider';
import RadarChart from '@/components/dials/RadarChart';
import Button from '@/components/common/Button';

const DIAL_TYPES = [
  DialType.PARENT,
  DialType.PARTNER,
  DialType.PRODUCER,
  DialType.PLAYER,
  DialType.POWER,
];

export default function AssessScreen() {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({
    [DialType.PARENT]: 5,
    [DialType.PARTNER]: 5,
    [DialType.PRODUCER]: 5,
    [DialType.PLAYER]: 5,
    [DialType.POWER]: 5,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = DIALS.length + 1; // 5 dials + summary
  const isOnSummary = step === DIALS.length;
  const currentDial = step < DIALS.length ? DIALS[step] : null;

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const ratings = DIAL_TYPES.map((dial) => ({
        dial,
        score: scores[dial],
      }));
      await submitAssessment(ratings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit assessment.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Animated.View entering={FadeInDown.duration(600)} className="items-center">
          <View className="w-20 h-20 rounded-full bg-success/20 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-white text-center mb-2">
            Assessment Complete
          </Text>
          <Text className="text-base text-slate-400 text-center mb-8">
            Great work being honest with yourself. That takes guts.
          </Text>
          <Button
            title="Back to Dashboard"
            onPress={() => router.back()}
            variant="primary"
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="pt-16 px-6 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => (step > 0 ? handleBack() : router.back())}>
            <Ionicons
              name={step > 0 ? 'arrow-back' : 'close'}
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          <Text className="text-sm text-slate-400">
            {step + 1} of {totalSteps}
          </Text>
        </View>
        {/* Progress */}
        <View className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
          <View
            className="h-full bg-accent rounded-full"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 justify-center">
        {currentDial && (
          <Animated.View
            key={`dial-${step}`}
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(250)}
          >
            <View
              className="w-16 h-16 rounded-full items-center justify-center self-center mb-6"
              style={{ backgroundColor: `${dialColors[currentDial.type]}20` }}
            >
              <Text className="text-2xl">
                {currentDial.type === 'PARENT'
                  ? '👨‍👧‍👦'
                  : currentDial.type === 'PARTNER'
                  ? '💕'
                  : currentDial.type === 'PRODUCER'
                  ? '💼'
                  : currentDial.type === 'PLAYER'
                  ? '🎯'
                  : '⚡'}
              </Text>
            </View>

            <Text className="text-2xl font-bold text-white text-center mb-2">
              {currentDial.name}
            </Text>
            <Text className="text-base text-slate-400 text-center mb-10">
              {currentDial.description}
            </Text>

            <DialSlider
              label=""
              description=""
              value={scores[currentDial.type]}
              color={dialColors[currentDial.type]}
              onValueChange={(val) =>
                setScores((prev) => ({ ...prev, [currentDial.type]: val }))
              }
              large
            />
          </Animated.View>
        )}

        {isOnSummary && (
          <Animated.View
            entering={SlideInRight.duration(350)}
            className="items-center"
          >
            <Text className="text-2xl font-bold text-white text-center mb-2">
              Your Five Dials
            </Text>
            <Text className="text-base text-slate-400 text-center mb-6">
              Here's where you're at right now
            </Text>
            <RadarChart
              values={DIAL_TYPES.map((d) => scores[d])}
              labels={DIALS.map((d) => d.name)}
              size={240}
            />
            <View className="mt-6 w-full">
              {DIALS.map((dial) => (
                <View
                  key={dial.type}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: dialColors[dial.type] }}
                    />
                    <Text className="text-base text-slate-300">{dial.name}</Text>
                  </View>
                  <Text className="text-base font-bold text-white">
                    {scores[dial.type]}/10
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom Button */}
      <View className="px-6 pb-10 pt-4">
        {isOnSummary ? (
          <Button
            title="Submit Assessment"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
        ) : (
          <Button title="Next" onPress={handleNext} variant="primary" />
        )}
      </View>
    </View>
  );
}
