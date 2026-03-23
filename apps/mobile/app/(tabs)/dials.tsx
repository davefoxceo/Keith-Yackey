import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { DIALS, DialType } from '@coach-keith/shared';
import { colors, dialColors } from '@/lib/theme';
import * as api from '@/lib/api';
import RadarChart from '@/components/dials/RadarChart';
import DialCard from '@/components/dials/DialCard';
import Card from '@/components/common/Card';
import type { TrendDirection, MicroChallenge } from '@coach-keith/shared';

interface DialData {
  dial: string;
  score: number;
  trend: TrendDirection;
  description: string;
  color: string;
}

export default function DialsTab() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [dialData, setDialData] = useState<DialData[]>(
    DIALS.map((d) => ({
      dial: d.name,
      score: 5,
      trend: 'stable' as TrendDirection,
      description: d.description,
      color: dialColors[d.type],
    })),
  );
  const [challenges, setChallenges] = useState<MicroChallenge[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [healthRes, challengeRes] = await Promise.allSettled([
        api.getHealthScore(),
        api.getActiveChallenges(),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.data) {
        const bd = healthRes.value.data.dialBreakdown;
        if (bd) {
          setDialData(
            DIALS.map((d) => ({
              dial: d.name,
              score: bd[d.type] ?? 5,
              trend: 'stable' as TrendDirection,
              description: d.description,
              color: dialColors[d.type],
            })),
          );
        }
      }

      if (challengeRes.status === 'fulfilled' && challengeRes.value.data) {
        setChallenges(challengeRes.value.data);
      }
    } catch {
      // Handle offline
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const scores = dialData.map((d) => d.score);
  const labels = dialData.map((d) => d.dial);

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.default}
          />
        }
      >
        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="text-2xl font-bold text-white">Five Dials</Text>
          <Text className="text-base text-slate-400 mt-1">
            Your life at a glance
          </Text>
        </View>

        {/* Radar Chart */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Card>
            <View className="items-center py-4">
              <RadarChart values={scores} labels={labels} size={260} />
            </View>
          </Card>
        </Animated.View>

        {/* Dial Cards */}
        <View className="mt-6">
          {dialData.map((dial, index) => (
            <Animated.View
              key={dial.dial}
              entering={FadeInRight.delay(200 + index * 80).duration(400)}
              className="mb-3"
            >
              <DialCard
                name={dial.dial}
                score={dial.score}
                trend={dial.trend}
                description={dial.description}
                color={dial.color}
              />
            </Animated.View>
          ))}
        </View>

        {/* Active Challenges */}
        {challenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(500)} className="mt-6">
            <Text className="text-lg font-bold text-white mb-3">
              Active Challenges
            </Text>
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="mb-3">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${dialColors[challenge.dial]}20` }}
                  >
                    <Ionicons
                      name="flash"
                      size={20}
                      color={dialColors[challenge.dial]}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-white">
                      {challenge.description}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      {challenge.dial} dial
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => api.completeChallenge(challenge.id)}
                    className="bg-success/20 rounded-full px-3 py-1.5"
                  >
                    <Text className="text-xs text-green-400 font-medium">Done</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/assess')}
        className="absolute bottom-28 right-6 w-14 h-14 rounded-full bg-accent items-center justify-center"
        style={{
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.surface.base} />
      </TouchableOpacity>
    </View>
  );
}
