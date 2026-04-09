import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, fontWeights } from '@/theme';

const TAB_ITEMS = [
  { key: 'explore', label: 'Explore', icon: 'compass' as const },
  { key: 'saved', label: 'Saved', icon: 'bookmark' as const },
  { key: 'myevents', label: 'My Events', icon: 'calendar' as const },
  { key: 'profile', label: 'Profile', icon: 'user' as const },
] as const;

type TabKey = (typeof TAB_ITEMS)[number]['key'];

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
      {TAB_ITEMS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabPress(tab.key)}
          >
            <Feather
              name={tab.icon}
              size={20}
              color={isActive ? '#FFFFFF' : colors.tabInactive}
            />
            <Text
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
    shadowColor: 'rgba(25,27,35,0.04)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: colors.primaryDark,
  },
  tabLabel: {
    fontSize: typography.badge,
    fontWeight: fontWeights.medium,
    color: colors.tabInactive,
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
});
