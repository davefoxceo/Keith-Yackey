import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import Card from '@/components/common/Card';

interface MenuItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  color: string;
  onPress: () => void;
}

export default function MoreTab() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Community',
      items: [
        {
          icon: 'people',
          label: 'The Brotherhood',
          description: 'Connect with other men on the journey',
          color: '#8b5cf6',
          onPress: () => {},
        },
        {
          icon: 'person-add',
          label: 'Accountability Partner',
          description: 'Get matched with a brother',
          color: '#3b82f6',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'card',
          label: 'Subscription',
          description: 'Manage your plan',
          color: colors.accent.default,
          onPress: () => {},
        },
        {
          icon: 'settings',
          label: 'Settings',
          description: 'Notifications, privacy, preferences',
          color: '#94a3b8',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle',
          label: 'Help & Support',
          description: 'FAQs, contact us',
          color: '#10b981',
          onPress: () => {},
        },
        {
          icon: 'person-circle',
          label: 'About Keith',
          description: 'Learn about Coach Keith Yackey',
          color: '#ec4899',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="items-center mt-4 mb-8"
        >
          <View className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center mb-3">
            <Text className="text-3xl">
              {user?.displayName?.charAt(0).toUpperCase() ?? 'K'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-white">
            {user?.displayName ?? 'Brother'}
          </Text>
          <Text className="text-sm text-slate-400 mt-0.5">
            {user?.email ?? ''}
          </Text>
        </Animated.View>

        {/* Menu Sections */}
        {sections.map((section, sIdx) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(200 + sIdx * 100).duration(500)}
            className="mb-6"
          >
            <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-1">
              {section.title}
            </Text>
            <Card>
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  className={`flex-row items-center py-4 ${
                    iIdx < section.items.length - 1
                      ? 'border-b border-surface-overlay/50'
                      : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-white">
                      {item.label}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              ))}
            </Card>
          </Animated.View>
        ))}

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-danger/10 border border-danger/20 rounded-2xl py-4 items-center"
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-rose-400">Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Version */}
        <Text className="text-xs text-slate-600 text-center mt-6">
          Coach Keith v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
