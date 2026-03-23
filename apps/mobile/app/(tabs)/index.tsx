import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import Card from '@/components/common/Card';
import StreakCounter from '@/components/engagement/StreakCounter';
import DailyPromptCard from '@/components/engagement/DailyPromptCard';
import MilestoneBadge from '@/components/engagement/MilestoneBadge';
import HealthScoreGauge from '@/components/common/HealthScoreGauge';
import RadarChart from '@/components/dials/RadarChart';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [healthScore, setHealthScore] = useState(72);
  const [dailyMessage, setDailyMessage] = useState(
    "Every day you show up is a day you're choosing your family over your comfort. That's what real men do.",
  );
  const [dialScores, setDialScores] = useState([7, 5, 8, 4, 6]);
  const [milestones, setMilestones] = useState<
    { type: string; description: string }[]
  >([]);

  const greetingOpacity = useSharedValue(0);

  useEffect(() => {
    greetingOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [streakRes, healthRes, promptRes, milestonesRes] =
        await Promise.allSettled([
          api.getStreak(),
          api.getHealthScore(),
          api.getDailyPrompt(),
          api.getMilestones(),
        ]);

      if (streakRes.status === 'fulfilled' && streakRes.value.data) {
        setStreak(streakRes.value.data.currentCount);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value.data) {
        setHealthScore(healthRes.value.data.overallScore);
        const bd = healthRes.value.data.dialBreakdown;
        if (bd) {
          setDialScores([
            bd.PARENT ?? 5,
            bd.PARTNER ?? 5,
            bd.PRODUCER ?? 5,
            bd.PLAYER ?? 5,
            bd.POWER ?? 5,
          ]);
        }
      }
      if (promptRes.status === 'fulfilled' && promptRes.value.data) {
        setDailyMessage(promptRes.value.data.message);
      }
      if (milestonesRes.status === 'fulfilled' && milestonesRes.value.data) {
        setMilestones(
          milestonesRes.value.data.slice(0, 3).map((m) => ({
            type: m.type,
            description: m.description,
          })),
        );
      }
    } catch {
      // Silently handle for offline mode
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
  }));

  const firstName = user?.displayName?.split(' ')[0] ?? 'Brother';

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.default}
          />
        }
      >
        {/* Greeting */}
        <Animated.View style={greetingStyle} className="mt-4 mb-6">
          <Text className="text-base text-slate-400">{getGreeting()},</Text>
          <Text className="text-3xl font-bold text-white">{firstName}</Text>
        </Animated.View>

        {/* Streak + Health Score Row */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="flex-row mb-5"
        >
          <View className="flex-1 mr-2">
            <StreakCounter count={streak} />
          </View>
          <View className="flex-1 ml-2">
            <HealthScoreGauge score={healthScore} />
          </View>
        </Animated.View>

        {/* Daily Kickstart */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} className="mb-5">
          <DailyPromptCard message={dailyMessage} />
        </Animated.View>

        {/* Five Dials Mini */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} className="mb-5">
          <Card>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/dials')}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-white">Five Dials</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.text.muted}
                />
              </View>
              <View className="items-center py-2">
                <RadarChart
                  values={dialScores}
                  labels={['Parent', 'Partner', 'Producer', 'Player', 'Power']}
                  size={180}
                />
              </View>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          className="flex-row mb-5"
        >
          <TouchableOpacity
            className="flex-1 mr-2 bg-accent/15 border border-accent/30 rounded-2xl p-4 items-center"
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/coach')}
          >
            <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mb-2">
              <Ionicons name="chatbubble" size={22} color={colors.accent.default} />
            </View>
            <Text className="text-sm font-semibold text-accent">Talk to Keith</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 ml-2 bg-surface-raised border border-surface-overlay rounded-2xl p-4 items-center"
            activeOpacity={0.7}
            onPress={() => router.push('/assess')}
          >
            <View className="w-12 h-12 rounded-full bg-brand-steel/30 items-center justify-center mb-2">
              <Ionicons name="checkmark-circle" size={22} color={colors.text.secondary} />
            </View>
            <Text className="text-sm font-semibold text-slate-300">
              Daily Check-In
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Milestones */}
        {milestones.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <Text className="text-lg font-bold text-white mb-3">
              Recent Achievements
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {milestones.map((m, i) => (
                <View key={i} className="mr-3">
                  <MilestoneBadge type={m.type} description={m.description} />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
