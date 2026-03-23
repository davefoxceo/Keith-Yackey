import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MarriageStage, DialType, DIALS } from '@coach-keith/shared';
import { useAuth } from '@/lib/auth';
import { completeOnboarding } from '@/lib/api';
import { colors, dialColors } from '@/lib/theme';
import Button from '@/components/common/Button';
import DialSlider from '@/components/dials/DialSlider';

const TOTAL_STEPS = 5;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MARRIAGE_STAGES = [
  {
    value: MarriageStage.CRISIS,
    label: 'In Crisis',
    description: 'Things are really rough right now',
    icon: 'alert-circle' as const,
    color: '#f43f5e',
  },
  {
    value: MarriageStage.DISCONNECTED,
    label: 'Disconnected',
    description: 'We\'re roommates more than partners',
    icon: 'remove-circle' as const,
    color: '#f59e0b',
  },
  {
    value: MarriageStage.REBUILDING,
    label: 'Rebuilding',
    description: 'Working on it, seeing some progress',
    icon: 'construct' as const,
    color: '#3b82f6',
  },
  {
    value: MarriageStage.THRIVING,
    label: 'Thriving',
    description: 'Things are great, want to keep growing',
    icon: 'heart-circle' as const,
    color: '#10b981',
  },
];

export default function OnboardingScreen() {
  const { setOnboarded } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [wifeName, setWifeName] = useState('');
  const [kidsCount, setKidsCount] = useState('');
  const [marriageDuration, setMarriageDuration] = useState('');

  // Step 3 state
  const [marriageStage, setMarriageStage] = useState<MarriageStage | null>(null);

  // Step 4 state
  const [dialScores, setDialScores] = useState<Record<string, number>>({
    [DialType.PARENT]: 5,
    [DialType.PARTNER]: 5,
    [DialType.PRODUCER]: 5,
    [DialType.PLAYER]: 5,
    [DialType.POWER]: 5,
  });

  // Step 5 state
  const [notificationTime, setNotificationTime] = useState('07:00');
  const [goals, setGoals] = useState<string[]>([]);

  const progressWidth = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
  }));

  function canAdvance(): boolean {
    switch (step) {
      case 0: return true;
      case 1: return wifeName.trim().length > 0;
      case 2: return marriageStage !== null;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }

  async function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      await handleComplete();
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await completeOnboarding({
        marriageContext: {
          wifeName: wifeName.trim(),
          kidsCount: parseInt(kidsCount || '0', 10),
          kidNames: [],
          marriageDuration: parseInt(marriageDuration || '0', 10),
          currentState: marriageStage ?? MarriageStage.REBUILDING,
        },
        onboardingResponses: [],
        initialAssessment: Object.entries(dialScores).map(([dial, score]) => ({
          dial: dial as DialType,
          score,
        })),
        preferences: {
          notificationTime,
          goals,
        },
      });
      setOnboarded();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const GOAL_OPTIONS = [
    'Be a more present father',
    'Reconnect with my wife',
    'Get in better shape',
    'Grow my career',
    'Find more balance',
    'Build a brotherhood',
    'Handle conflict better',
    'Increase intimacy',
  ];

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  return (
    <View className="flex-1 bg-surface">
      {/* Progress Bar */}
      <View className="pt-16 px-6 pb-4">
        <View className="flex-row items-center justify-between mb-3">
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)}>
              <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          <Text className="text-sm text-slate-400 ml-auto">
            {step + 1} of {TOTAL_STEPS}
          </Text>
        </View>
        <View className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
          <Animated.View
            style={progressStyle}
            className="h-full bg-accent rounded-full"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Welcome */}
        {step === 0 && (
          <Animated.View
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(300)}
            className="flex-1 justify-center"
          >
            <View className="w-24 h-24 rounded-full bg-accent/20 items-center justify-center self-center mb-8">
              <Ionicons name="hand-right" size={48} color={colors.accent.default} />
            </View>
            <Text className="text-3xl font-bold text-white text-center mb-4">
              Hey brother.{'\n'}Let's get real.
            </Text>
            <Text className="text-lg text-slate-400 text-center leading-7 mb-4">
              I'm Keith, and I've been where you are. Before we dive in, I need to know
              where you're at so I can coach you the right way.
            </Text>
            <Text className="text-base text-slate-500 text-center leading-6">
              This takes about 2 minutes. Everything you share stays between us.
              No judgment -- just honesty.
            </Text>
          </Animated.View>
        )}

        {/* Step 2: Marriage Basics */}
        {step === 1 && (
          <Animated.View
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(300)}
            className="flex-1 pt-8"
          >
            <Text className="text-2xl font-bold text-white mb-2">
              Tell me about your family
            </Text>
            <Text className="text-base text-slate-400 mb-8">
              I need to know who I'm fighting for with you.
            </Text>

            <View className="mb-5">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Wife's name</Text>
              <TextInput
                className="bg-surface-raised border border-surface-overlay rounded-xl px-4 py-4 text-white text-base"
                placeholder="Her first name"
                placeholderTextColor={colors.text.muted}
                value={wifeName}
                onChangeText={setWifeName}
                autoCapitalize="words"
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm text-slate-400 mb-2 ml-1">How many kids?</Text>
              <TextInput
                className="bg-surface-raised border border-surface-overlay rounded-xl px-4 py-4 text-white text-base"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                keyboardType="number-pad"
                value={kidsCount}
                onChangeText={setKidsCount}
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm text-slate-400 mb-2 ml-1">
                Years married
              </Text>
              <TextInput
                className="bg-surface-raised border border-surface-overlay rounded-xl px-4 py-4 text-white text-base"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                keyboardType="number-pad"
                value={marriageDuration}
                onChangeText={setMarriageDuration}
              />
            </View>
          </Animated.View>
        )}

        {/* Step 3: Marriage Stage */}
        {step === 2 && (
          <Animated.View
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(300)}
            className="flex-1 pt-8"
          >
            <Text className="text-2xl font-bold text-white mb-2">
              How would you describe your marriage right now?
            </Text>
            <Text className="text-base text-slate-400 mb-8">
              Be honest. This is between you and me.
            </Text>

            {MARRIAGE_STAGES.map((stage) => (
              <TouchableOpacity
                key={stage.value}
                onPress={() => setMarriageStage(stage.value)}
                className={`flex-row items-center p-4 rounded-xl mb-3 border ${
                  marriageStage === stage.value
                    ? 'border-accent bg-accent/10'
                    : 'border-surface-overlay bg-surface-raised'
                }`}
                activeOpacity={0.7}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${stage.color}20` }}
                >
                  <Ionicons name={stage.icon} size={24} color={stage.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">
                    {stage.label}
                  </Text>
                  <Text className="text-sm text-slate-400 mt-0.5">
                    {stage.description}
                  </Text>
                </View>
                {marriageStage === stage.value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent.default} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Step 4: Five Dials Assessment */}
        {step === 3 && (
          <Animated.View
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(300)}
            className="flex-1 pt-8"
          >
            <Text className="text-2xl font-bold text-white mb-2">
              The Five Dials
            </Text>
            <Text className="text-base text-slate-400 mb-6">
              Rate yourself honestly from 1-10 on each dial. Where are you really at?
            </Text>

            {DIALS.map((dial) => (
              <View key={dial.type} className="mb-6">
                <DialSlider
                  label={dial.name}
                  description={dial.description}
                  value={dialScores[dial.type]}
                  color={dialColors[dial.type]}
                  onValueChange={(val) =>
                    setDialScores((prev) => ({ ...prev, [dial.type]: val }))
                  }
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Step 5: Goals & Notifications */}
        {step === 4 && (
          <Animated.View
            entering={SlideInRight.duration(400)}
            exiting={SlideOutLeft.duration(300)}
            className="flex-1 pt-8"
          >
            <Text className="text-2xl font-bold text-white mb-2">
              What are you fighting for?
            </Text>
            <Text className="text-base text-slate-400 mb-6">
              Pick what matters most to you right now.
            </Text>

            <View className="flex-row flex-wrap mb-8">
              {GOAL_OPTIONS.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  onPress={() => toggleGoal(goal)}
                  className={`mr-2 mb-3 px-4 py-3 rounded-full border ${
                    goals.includes(goal)
                      ? 'border-accent bg-accent/15'
                      : 'border-surface-overlay bg-surface-raised'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm ${
                      goals.includes(goal) ? 'text-accent font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mb-6">
              <Text className="text-base font-semibold text-white mb-2">
                Daily kickstart time
              </Text>
              <Text className="text-sm text-slate-400 mb-3">
                When should I send your morning message?
              </Text>
              <View className="flex-row">
                {['06:00', '07:00', '08:00', '09:00'].map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => setNotificationTime(time)}
                    className={`mr-3 px-5 py-3 rounded-xl border ${
                      notificationTime === time
                        ? 'border-accent bg-accent/15'
                        : 'border-surface-overlay bg-surface-raised'
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-sm ${
                        notificationTime === time
                          ? 'text-accent font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {time.replace(':00', '')} AM
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View className="px-6 pb-10 pt-4">
        <Button
          title={step === TOTAL_STEPS - 1 ? "Let's Go" : 'Continue'}
          onPress={handleNext}
          loading={loading}
          disabled={!canAdvance()}
          variant="primary"
        />
      </View>
    </View>
  );
}
