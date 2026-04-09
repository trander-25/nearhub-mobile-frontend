import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabBar } from '@/components/features';
import { getMyEvents, type MyEventsResponse } from '@/services/userService';
import { cancelRsvp } from '@/services/eventService';
import type { ApiEvent } from '@/types/event.types';
import { colors, fontWeights, spacing, typography } from '@/theme';

type RsvpEvent = ApiEvent & { isRsvped: boolean; isLiked: boolean };

export function MyEventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [events, setEvents] = useState<RsvpEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getMyEvents();
      setEvents(data.rsvpEvents);
    } catch {
      // Keep existing data on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadEvents(true);
  }, [loadEvents]);

  const handleCancelRsvp = useCallback(async (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await cancelRsvp(eventId);
    } catch {
      loadEvents(true);
    }
  }, [loadEvents]);

  const handleTabPress = useCallback((tab: string) => {
    if (tab === 'explore') router.replace('/');
    else if (tab === 'saved') router.replace('/saved');
    else if (tab === 'profile') router.push('/profile');
  }, [router]);

  const renderItem: ListRenderItem<RsvpEvent> = useCallback(({ item }) => (
    <Pressable
      style={styles.eventCard}
      onPress={() => router.push(`/event/${item.id}`)}
    >
      <View style={styles.eventImageContainer}>
        {item.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.eventImage} contentFit="cover" />
        ) : (
          <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
            <Feather name="image" size={28} color={colors.textPlaceholder} />
          </View>
        )}
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
          <Pressable
            style={styles.cancelBtn}
            onPress={() => handleCancelRsvp(item.id)}
            hitSlop={8}
          >
            <Feather name="x" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {new Date(item.startAt).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.location?.address}{item.location?.city ? `, ${item.location.city}` : ''}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Feather name="check-circle" size={12} color={colors.primary} />
            <Text style={styles.badgeText}>Confirmed</Text>
          </View>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
    </Pressable>
  ), [router, handleCancelRsvp]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>My Events</Text>
        <Text style={styles.headerCount}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySubtext}>
                Join events from the Explore tab and they'll show up here
              </Text>
              <Pressable
                style={styles.exploreBtn}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.exploreBtnText}>Explore Events</Text>
              </Pressable>
            </View>
          )
        }
      />

      <BottomTabBar activeTab="myevents" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  headerCount: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
  },
  centered: {
    paddingTop: 80,
    alignItems: 'center',
  },

  // Event Card
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  eventImageContainer: {
    width: '100%',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  eventImagePlaceholder: {
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventTitle: {
    flex: 1,
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 25,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,61,155,0.08)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  categoryText: {
    fontSize: typography.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
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
  exploreBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  exploreBtnText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});
