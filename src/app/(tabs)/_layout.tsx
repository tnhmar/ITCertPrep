import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../components/ui';

function TabIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color, fontSize: 22, fontWeight: '700' }}>{symbol}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);
  return (
    <Tabs initialRouteName="study" screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink, headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 58 + bottom, paddingTop: 6, paddingBottom: bottom } }}>
      <Tabs.Screen name="study" options={{ title: 'Study', headerTitle: 'ITCertPrep', tabBarIcon: ({ color }) => <TabIcon symbol="▤" color={color} /> }} />
      <Tabs.Screen name="saved" options={{ title: 'Bookmarks', tabBarIcon: ({ color }) => <TabIcon symbol="★" color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: ({ color }) => <TabIcon symbol="▥" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon symbol="⚙" color={color} /> }} />
    </Tabs>
  );
}
