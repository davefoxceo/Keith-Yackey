import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Only if needed; fallback to View
import { colors } from '@/lib/theme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: {
  name: string;
  title: string;
  icon: TabIconName;
  iconFocused: TabIconName;
}[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'coach', title: 'Coach', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  { name: 'dials', title: 'Dials', icon: 'disc-outline', iconFocused: 'disc' },
  { name: 'content', title: 'Content', icon: 'book-outline', iconFocused: 'book' },
  { name: 'more', title: 'More', icon: 'menu-outline', iconFocused: 'menu' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface.raised,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarActiveTintColor: colors.accent.default,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <View className="items-center">
                {focused && (
                  <View
                    className="absolute -top-1 w-1 h-1 rounded-full bg-accent"
                  />
                )}
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={22}
                  color={color}
                />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
