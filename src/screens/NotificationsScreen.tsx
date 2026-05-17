import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabBar } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { Notification } from '@/types/notification.types';
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/services/notificationService';
import { isOrganizerRole } from '@/utils/role';

const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  system: 'info',
  event: 'calendar',
  admin: 'shield',
};

const ICON_COLOR_MAP: Record<string, string> = {
  system: colors.accent,
  event: colors.primary,
  admin: colors.danger,
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface NotificationsScreenProps {
  organizerMode?: boolean;
}

export function NotificationsScreen({ organizerMode = false }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const isOrganizer = organizerMode && isOrganizerRole(user?.role);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (reset) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const res = await getNotifications({ page: pageNum, limit: 20 });
        if (reset) {
          setNotifications(res.items);
        } else {
          setNotifications((prev) => [...prev, ...res.items]);
        }
        setTotalPages(res.totalPages);
      } catch {
        if (reset) setNotifications([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadNotifications(1, true);
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    loadNotifications(1, true);
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && page < totalPages) {
      const next = page + 1;
      setPage(next);
      loadNotifications(next, false);
    }
  }, [isLoadingMore, page, totalPages, loadNotifications]);

  const handlePress = useCallback(
    async (item: Notification) => {
      if (!item.isRead) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        try {
          await markNotificationAsRead(item.id);
        } catch {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: false } : n)),
          );
        }
      }

      if (item.eventId) {
        router.push(`/event/${item.eventId}` as never);
      }
    },
    [router],
  );

  const handleDelete = useCallback((item: Notification) => {
    Alert.alert('Delete notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
          try {
            await deleteNotification(item.id);
          } catch {
            loadNotifications(1, true);
          }
        },
      },
    ]);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOrganizerTab = useCallback((tab: string) => {
    if (tab === 'organizer-overview') router.navigate('/organizer-overview' as never);
    else if (tab === 'organizer-manage') router.navigate('/organizer-manage' as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
  }, [router]);

  const renderItem: ListRenderItem<Notification> = useCallback(
    ({ item }) => (
      <Pressable
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        onPress={() => handlePress(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${ICON_COLOR_MAP[item.type] ?? colors.primary}14` },
          ]}
        >
          <Feather
            name={ICON_MAP[item.type] ?? 'bell'}
            size={18}
            color={ICON_COLOR_MAP[item.type] ?? colors.primary}
          />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeaderRow}>
            <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
      </Pressable>
    ),
    [handlePress, handleDelete],
  );

  return (
    <View style={styles.screen}>
      {isOrganizer ? (
        <View style={[styles.organizerHeader, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.organizerHeaderTopRow}>
            <Text style={styles.organizerHeaderTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            ) : (
              <View style={styles.headerBadgePlaceholder} />
            )}
          </View>
          <Text style={styles.organizerHeaderSubtitle}>Latest updates for your organizer account</Text>
        </View>
      ) : (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="bell-off" size={48} color={colors.textPlaceholder} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>
                Event and system notifications will appear here
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
          ) : null
        }
      />

      {isOrganizer ? (
        <BottomTabBar activeTab="organizer-notifications" onTabPress={handleOrganizerTab} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerHeader: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  organizerHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizerHeaderTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  organizerHeaderSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgePlaceholder: {
    minWidth: 22,
    height: 22,
  },
  headerBadgeText: {
    fontSize: typography.badge,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 60,
  },
  notifCard: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  notifCardUnread: {
    backgroundColor: colors.primarySubtle,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifTitle: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: fontWeights.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifBody: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: typography.badge,
    color: colors.textTertiary,
    marginTop: 2,
  },
  centered: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
  },
});
