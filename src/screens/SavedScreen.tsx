import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomTabBar, EventCard } from '@/components/features';
import { getMyEvents } from '@/services/userService';
import { toggleLikeEvent } from '@/services/eventService';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiEvent, EventData } from '@/types/event.types';
import { colors, fontWeights, spacing, typography } from '@/theme';
import { isOrganizerRole } from '@/utils/role';
import { promptSignIn } from '@/utils/authPrompt';

type LikedEvent = ApiEvent & { isRsvped: boolean; isLiked: boolean };
const DEFAULT_LAT = 10.7769;
const DEFAULT_LNG = 106.7009;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function calcDistanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

function toCardData(event: LikedEvent): EventData {
  const startDate = new Date(event.startAt);
  const dateLabel = Number.isNaN(startDate.getTime())
    ? event.startAt
    : startDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl:
      event.images?.[0] ??
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    dateLabel,
    address: event.location.address,
    city: event.location.city ?? 'Location TBA',
    category: event.category,
    distanceKm:
      event.distanceKm ??
      calcDistanceKm(DEFAULT_LAT, DEFAULT_LNG, event.location.lat, event.location.lng),
    startAt: event.startAt,
    endAt: event.endAt ?? undefined,
    totalViews: event.totalViews,
    isLiked: true,
    isRsvped: event.isRsvped,
  };
}

export function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [events, setEvents] = useState<EventData[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getMyEvents();
      const mapped = data.likedEvents.map(toCardData);
      setEvents(mapped);
      const initialLiked: Record<string, boolean> = {};
      mapped.forEach((e) => { initialLiked[e.id] = true; });
      setLikedMap(initialLiked);
    } catch {
      // Keep existing data
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

  const handleToggleLike = useCallback(
    async (eventId: string) => {
      if (!isAuthenticated) {
        promptSignIn(() => router.push('/login?entry=required' as never));
        return;
      }

      setLikedMap((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
      try {
        await toggleLikeEvent(eventId);
      } catch {
        setLikedMap((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
      }
    },
    [isAuthenticated, router],
  );

  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/event/${eventId}`);
  }, [router]);

  const handleTabPress = useCallback((tab: string) => {
    if (tab === 'explore') router.navigate('/' as never);
    else if (tab === 'for-you') router.navigate('/?tab=for-you' as never);
    else if (tab === 'scan-qr') router.navigate('/scan-qr' as never);
    else if (tab === 'myevents') router.navigate((isAuthenticated && isOrganizerRole(user?.role) ? '/organizer-overview' : '/myevents') as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
  }, [isAuthenticated, router, user?.role]);

  const visibleEvents = events.filter((e) => likedMap[e.id] !== false);

  const renderItem: ListRenderItem<EventData> = useCallback(({ item }) => (
    <EventCard
      id={item.id}
      title={item.title}
      imageUrl={item.imageUrl}
      date={item.dateLabel}
      location={`${item.address}, ${item.city}`}
      category={item.category}
      distanceKm={item.distanceKm}
      isLiked={likedMap[item.id] ?? true}
      onToggleLike={handleToggleLike}
      onPress={handleEventPress}
    />
  ), [likedMap, handleToggleLike, handleEventPress]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerCount}>
          {visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      <FlatList
        data={visibleEvents}
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
              <Feather name="bookmark" size={48} color={colors.textPlaceholder} />
              <Text style={styles.emptyTitle}>No saved events</Text>
              <Text style={styles.emptySubtext}>
                Tap the heart icon on events you like and they&apos;ll appear here
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

      <BottomTabBar activeTab="saved" onTabPress={handleTabPress} />
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
    paddingTop: spacing.sm,
  },
  centered: {
    paddingTop: 80,
    alignItems: 'center',
  },
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
