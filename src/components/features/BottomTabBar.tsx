import React, { useEffect } from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { colors, spacing, typography, fontWeights } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminRole, isOrganizerRole } from '@/utils/role';

const TAB_ITEMS = [
  { key: 'explore', label: 'Explore', icon: 'compass' as const },
  { key: 'saved', label: 'Saved', icon: 'bookmark' as const },
  { key: 'scan-qr', label: '', icon: 'camera' as const },
  { key: 'myevents', label: 'My Events', icon: 'calendar' as const },
  { key: 'profile', label: 'Profile', icon: 'user' as const },
] as const;

const ORGANIZER_TAB_ITEMS = [
  { key: 'organizer-overview', label: 'Overview', icon: 'bar-chart-2' as const },
  { key: 'organizer-manage', label: 'Manage', icon: 'briefcase' as const },
  { key: 'organizer-notifications', label: 'Notify', icon: 'bell' as const },
  { key: 'profile', label: 'Profile', icon: 'user' as const },
] as const;

const ADMIN_TAB_ITEMS = [
  { key: 'admin-moderation', label: 'Moderation', icon: 'shield' as const },
  { key: 'admin-users', label: 'Users', icon: 'users' as const },
  { key: 'admin-broadcast', label: 'Broadcast', icon: 'send' as const },
  { key: 'profile', label: 'Profile', icon: 'user' as const },
] as const;

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

type TabItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
};

interface TabButtonProps {
  tab: TabItem;
  isActive: boolean;
  onTabPress: (tab: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabButton({ tab, isActive, onTabPress }: TabButtonProps) {
  const activeProgress = useSharedValue(isActive ? 1 : 0);
  const pressProgress = useSharedValue(0);
  const isCenterQrTab = tab.key === 'scan-qr';

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 180 });
  }, [activeProgress, isActive]);

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressProgress.value ? 0.94 : 1, {
          damping: 18,
          stiffness: 260,
          mass: 0.8,
        }),
      },
      {
        translateY: withSpring(isActive && !isCenterQrTab ? -1 : 0, {
          damping: 18,
          stiffness: 220,
        }),
      },
    ],
  }));

  const activePillStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scale: 0.9 + activeProgress.value * 0.1 }],
  }));

  return (
    <AnimatedPressable
      style={[
        styles.tab,
        isCenterQrTab && styles.centerQrTab,
        isActive && isCenterQrTab && styles.centerQrTabActive,
        tabAnimatedStyle,
      ]}
      onPress={() => onTabPress(tab.key)}
      onPressIn={() => {
        pressProgress.value = 1;
      }}
      onPressOut={() => {
        pressProgress.value = 0;
      }}
    >
      {!isCenterQrTab ? (
        <Animated.View pointerEvents="none" style={[styles.activePill, activePillStyle]} />
      ) : null}
      {isCenterQrTab ? (
        <MaterialCommunityIcons
          name="qrcode-scan"
          size={22}
          color="#FFFFFF"
        />
      ) : (
        <Feather
          name={tab.icon}
          size={20}
          color={isActive ? '#FFFFFF' : colors.tabInactive}
        />
      )}
      {!isCenterQrTab ? (
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {tab.label}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isKeyboardVisible = useKeyboardVisible();
  const isAdmin = isAdminRole(user?.role);
  const isOrganizer = isOrganizerRole(user?.role);
  const tabItems = isAdmin ? ADMIN_TAB_ITEMS : isOrganizer ? ORGANIZER_TAB_ITEMS : TAB_ITEMS;

  if (isKeyboardVisible) return null;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
      {tabItems.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TabButton
            key={tab.key}
            tab={tab}
            isActive={isActive}
            onTabPress={onTabPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 6,
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
    paddingHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
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
  centerQrTab: {
    flex: 0,
    width: 60,
    height: 60,
    marginTop: -26,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 0,
    paddingHorizontal: 0,
    shadowColor: colors.primaryShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  centerQrTabActive: {
    backgroundColor: colors.primaryDark,
  },
});
