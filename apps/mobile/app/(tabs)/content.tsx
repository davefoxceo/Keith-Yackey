import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import * as api from '@/lib/api';
import Card from '@/components/common/Card';

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: number;
  topics: string[];
}

const CATEGORIES = ['All', 'Podcasts', 'Book', 'Frameworks', 'Recordings'];

export default function ContentTab() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContent();
  }, [activeCategory]);

  async function loadContent() {
    try {
      const category = activeCategory === 'All' ? undefined : activeCategory;
      const res = await api.getEpisodes(1, category);
      if (res.success && res.data) {
        setEpisodes(
          res.data.items.map((ep: any) => ({
            id: ep.id,
            title: ep.title,
            description: ep.description ?? '',
            duration: ep.duration ?? 0,
            topics: ep.topics ?? [],
          })),
        );
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleSearch() {
    if (!search.trim()) return;
    try {
      const res = await api.searchContent(search.trim());
      if (res.success && res.data) {
        setEpisodes(
          res.data.items.map((ep: any) => ({
            id: ep.id,
            title: ep.title,
            description: ep.description ?? '',
            duration: ep.duration ?? 0,
            topics: ep.topics ?? [],
          })),
        );
      }
    } catch {
      // Handle error
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins}m`;
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-white mb-4">Content</Text>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View className="flex-row items-center bg-surface-raised border border-surface-overlay rounded-xl px-4 mb-4">
            <Ionicons name="search" size={18} color={colors.text.muted} />
            <TextInput
              className="flex-1 text-white text-base py-3 ml-3"
              placeholder="Search episodes, topics..."
              placeholderTextColor={colors.text.muted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Category Pills */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`mr-2 px-5 py-2 rounded-full border ${
                  activeCategory === cat
                    ? 'bg-accent/20 border-accent/40'
                    : 'bg-surface-raised border-surface-overlay'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-medium ${
                    activeCategory === cat ? 'text-accent' : 'text-slate-400'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Episode List */}
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.default}
          />
        }
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text className="text-lg font-bold text-white mb-3 mt-2">
              {activeCategory === 'All' ? 'Recommended for You' : activeCategory}
            </Text>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(100 + index * 60).duration(400)}>
            <TouchableOpacity activeOpacity={0.8}>
              <Card className="mb-3">
                <View className="flex-row">
                  {/* Episode Artwork Placeholder */}
                  <View className="w-16 h-16 rounded-xl bg-surface-overlay items-center justify-center mr-4">
                    <Ionicons
                      name={
                        activeCategory === 'Book'
                          ? 'book'
                          : activeCategory === 'Frameworks'
                          ? 'git-network'
                          : 'headset'
                      }
                      size={24}
                      color={colors.accent.default}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold text-white mb-1"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-sm text-slate-400 mb-2"
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={colors.text.muted}
                      />
                      <Text className="text-xs text-slate-500 ml-1">
                        {formatDuration(item.duration)}
                      </Text>
                      {item.topics.length > 0 && (
                        <>
                          <View className="w-1 h-1 rounded-full bg-slate-600 mx-2" />
                          <Text className="text-xs text-slate-500">
                            {item.topics[0]}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity className="self-center ml-2">
                    <Ionicons
                      name="play-circle"
                      size={36}
                      color={colors.accent.default}
                    />
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="library-outline" size={48} color={colors.text.muted} />
            <Text className="text-base text-slate-400 mt-4 text-center">
              Content loading...{'\n'}Pull down to refresh.
            </Text>
          </View>
        }
      />
    </View>
  );
}
