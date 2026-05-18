import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar, EventCard, EventCardSkeleton } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import { searchEvents, toggleLikeEvent } from '@/services/eventService';
import { getMyEvents } from '@/services/userService';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { EventData } from '@/types/event.types';
import { isOrganizerRole } from '@/utils/role';

type LocationState = {
  lat?: number;
  lng?: number;
  label?: string;
};

function hasCoordinates(location: LocationState) {
  return typeof location.lat === 'number' && typeof location.lng === 'number';
}

function shuffleEvents<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function ForYouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [events, setEvents] = useState<EventData[]>([]);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [locationState, setLocationState] = useState<LocationState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const preferences = useMemo(() => user?.preferences ?? [], [user?.preferences]);
  const hasPreferences = preferences.length > 0;

  const resolveLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationState({});
        return;
      }

      let current: Location.LocationObject | null = null;
      try {
        current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        current = await Location.getLastKnownPositionAsync();
      }

      if (!current) {
        setLocationState({});
        return;
      }

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      }).catch(() => []);
      const label = [geo?.district, geo?.city ?? geo?.region].filter(Boolean).join(', ');

      setLocationState({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        label: label || 'Current location',
      });
    } finally {
      setIsResolvingLocation(false);
    }
  }, []);

  const loadUserLikes = useCallback(async () => {
    try {
      const data = await getMyEvents();
      const map: Record<string, boolean> = {};
      data.likedEvents.forEach((event) => {
        map[event.id] = true;
      });
      setLikedMap(map);
    } catch {
      // Likes are non-critical for this feed.
    }
  }, []);

  const loadEvents = useCallback(async (pageNum: number, reset: boolean) => {
    if (isResolvingLocation) return;

    if (reset && !isRefreshing) setIsLoading(true);
    if (!reset) setIsLoadingMore(true);

    try {
      const canUseCoordinates = hasCoordinates(locationState);
      const result = await searchEvents({
        categories: hasPreferences ? preferences : undefined,
        lat: canUseCoordinates ? locationState.lat : undefined,
        lng: canUseCoordinates ? locationState.lng : undefined,
        sortBy: canUseCoordinates ? 'distance' : 'random',
        page: pageNum,
        limit: 20,
      });
      const nextEvents = canUseCoordinates ? result.events : shuffleEvents(result.events);

      if (reset) {
        setEvents(nextEvents);
      } else {
        setEvents((prev) => [...prev, ...nextEvents]);
      }
      setTotalPages(result.totalPages);
      setError(null);
    } catch {
      if (reset) setEvents([]);
      setError('Could not load personalized events. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [hasPreferences, isRefreshing, isResolvingLocation, locationState, preferences]);

  useEffect(() => {
    resolveLocation();
  }, [resolveLocation]);

  useEffect(() => {
    if (isAuthenticated) loadUserLikes();
  }, [isAuthenticated, loadUserLikes]);

  useEffect(() => {
    setPage(1);
    loadEvents(1, true);
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    resolveLocation().finally(() => {
      loadEvents(1, true);
    });
  }, [loadEvents, resolveLocation]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadEvents(nextPage, false);
    }
  }, [isLoadingMore, loadEvents, page, totalPages]);

  const handleToggleLike = useCallback(async (eventId: string) => {
    if (!isAuthenticated) {
      router.push('/login?entry=required' as never);
      return;
    }

    setLikedMap((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
    try {
      await toggleLikeEvent(eventId);
    } catch {
      setLikedMap((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
      Alert.alert('Unable to update', 'Please try again in a moment.');
    }
  }, [isAuthenticated, router]);

  const handleTabPress = useCallback((tab: string) => {
    if (tab === 'explore') router.navigate('/' as never);
    else if (tab === 'saved') router.navigate('/saved' as never);
    else if (tab === 'scan-qr') router.navigate('/scan-qr' as never);
    else if (tab === 'myevents') router.navigate((isAuthenticated && isOrganizerRole(user?.role) ? '/organizer-overview' : '/myevents') as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
  }, [isAuthenticated, router, user?.role]);

  const renderItem: ListRenderItem<EventData> = useCallback(({ item }) => (
    <EventCard
      id={item.id}
      title={item.title}
      imageUrl={item.imageUrl}
      date={item.dateLabel}
      location={`${item.address}, ${item.city}`}
      category={item.category}
      distanceKm={item.distanceKm}
      rating={item.rating}
      isLiked={Boolean(likedMap[item.id])}
      onToggleLike={handleToggleLike}
      onPress={(eventId) => router.push(`/event/${eventId}` as never)}
    />
  ), [handleToggleLike, likedMap, router]);

  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={[styles.topNav, { paddingTop: insets.top + spacing.lg }]}>
        <View>
          <Text style={styles.heroTitle}>For You</Text>
          <View style={styles.locationRow}>
            <Feather name="navigation" size={11} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {isResolvingLocation ? 'Finding nearby events...' : locationState.label ?? 'Showing mixed events'}
            </Text>
          </View>
        </View>
        <Pressable style={styles.editButton} onPress={() => router.push('/edit-preferences' as never)}>
          <Feather name="sliders" size={17} color={colors.primary} />
        </Pressable>
      </View>

      {hasPreferences ? (
        <View style={styles.preferenceRow}>
          {preferences.slice(0, 4).map((preference) => (
            <View key={preference} style={styles.preferenceChip}>
              <Text style={styles.preferenceText}>{preference}</Text>
            </View>
          ))}
          {preferences.length > 4 ? (
            <View style={styles.preferenceChip}>
              <Text style={styles.preferenceText}>+{preferences.length - 4}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isLoading || isResolvingLocation ? (
            <View style={styles.skeletonContainer}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name={hasPreferences ? 'heart' : 'sliders'} size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>
                {hasPreferences ? 'No matches yet' : 'No events yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {hasPreferences
                  ? 'Try adding more interests or check back when organizers publish new events.'
                  : 'Pick interests to personalize this feed, or check back when organizers publish new events.'}
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push('/edit-preferences' as never)}
              >
                <Text style={styles.primaryButtonText}>
                  {hasPreferences ? 'Edit Interests' : 'Pick Interests'}
                </Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
          ) : null
        }
      />

      <BottomTabBar activeTab="for-you" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  headerContainer: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preferenceChip: {
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  preferenceText: {
    fontSize: typography.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  errorContainer: {
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontWeight: fontWeights.semibold,
    fontSize: typography.bodySmall,
  },
  skeletonContainer: {
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
  loadingMore: {
    paddingVertical: spacing.xl,
  },
});
