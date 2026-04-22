import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

import {
  BottomTabBar,
  CategoryChips,
  EventCard,
  EventCardSkeleton,
  FilterModal,
  SearchBar,
} from '@/components/features';
import {
  getCategories,
  getNearbyEvents,
  searchEvents,
  toggleLikeEvent,
} from '@/services';
import { getMyEvents } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, typography, fontWeights } from '@/theme';
import type { CategoryItem, EventData } from '@/types';
import { isOrganizerRole } from '@/utils/role';

const MANUAL_LOCATION_KEY = 'nearhub_manual_location';

interface ManualLocationValue {
  country: string;
  city: string;
  district: string;
}

const AREA_FILTER = 'Your area';
const ALL_EVENTS_FILTER = 'All events';

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [events, setEvents] = useState<EventData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(AREA_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterState, setFilterState] = useState<{
    topics?: string[];
    city?: string;
    sortBy?: string;
    radius?: number;
  }>({});
  const [locationState, setLocationState] = useState<{
    lat?: number;
    lng?: number;
    city?: string;
    district?: string;
  }>({});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState<ManualLocationValue | null>(null);

  useEffect(() => {
    loadCategories();
    if (isAuthenticated) loadUserLikes();
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const raw = await SecureStore.getItemAsync(MANUAL_LOCATION_KEY);
          if (!mounted || !raw) return;
          const parsed = JSON.parse(raw) as ManualLocationValue;
          const normalized = {
            country: parsed.country?.trim() ?? '',
            city: parsed.city?.trim() ?? '',
            district: parsed.district?.trim() ?? '',
          };
          if (!normalized.city) return;
          setManualLocation((prev) => {
            const prevKey = prev ? `${prev.country}|${prev.city}|${prev.district}` : '';
            const nextKey = `${normalized.country}|${normalized.city}|${normalized.district}`;
            if (prevKey === nextKey) return prev;

            setLocationState((state) => ({
              ...state,
              // Manual location should override GPS coordinates.
              // Clear lat/lng so discovery switches to city-based filtering.
              lat: undefined,
              lng: undefined,
              city: normalized.city,
              district: normalized.district || undefined,
            }));
            setFilterState((state) => ({ ...state, city: normalized.city }));
            return normalized;
          });
        } catch {
          // ignore parse/storage errors
        }
      })();

      return () => {
        mounted = false;
      };
    }, []),
  );


  async function loadUserLikes() {
    try {
      const data = await getMyEvents();
      const map: Record<string, boolean> = {};
      data.likedEvents.forEach((e) => { map[e.id] = true; });
      setLikedMap(map);
    } catch {
      // Non-critical
    }
  }

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      // Categories are non-critical; silently fall back
    }
  }

  const loadEvents = useCallback(async (pageNum: number, reset: boolean) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const query = search.trim();
      let result;
      const isAreaMode = selectedCategory === AREA_FILTER;
      const isAllEventsMode = selectedCategory === ALL_EVENTS_FILTER;
      const hasCoordinates =
        typeof locationState.lat === 'number' && typeof locationState.lng === 'number';
      const effectiveCity = filterState.city?.trim() || locationState.city?.trim() || undefined;
      const shouldUseSearchWithoutCoordinates = !hasCoordinates && Boolean(effectiveCity);
      const selectedTopics = filterState.topics ?? [];
      const singleTopic = selectedTopics.length === 1 ? selectedTopics[0] : undefined;
      const categoryFilter = isAreaMode || isAllEventsMode ? undefined : selectedCategory;
      const effectiveCategory = singleTopic ?? categoryFilter;

      if (
        shouldUseSearchWithoutCoordinates ||
        (!isAreaMode && (isAllEventsMode || query || effectiveCity || filterState.radius))
      ) {
        result = await searchEvents({
          keyword: query || undefined,
          category: effectiveCategory,
          city: isAllEventsMode ? undefined : effectiveCity,
          sortBy: (filterState.sortBy as 'relevance' | 'distance' | 'startAt' | 'newest' | 'popular') ?? 'relevance',
          radius: isAllEventsMode ? undefined : filterState.radius,
          lat: isAllEventsMode ? undefined : locationState.lat,
          lng: isAllEventsMode ? undefined : locationState.lng,
          page: pageNum,
          limit: 20,
        });
      } else {
        result = await getNearbyEvents({
          lat: locationState.lat,
          lng: locationState.lng,
          category: effectiveCategory,
          city: effectiveCity,
          sortBy: (filterState.sortBy as 'distance' | 'startAt' | 'newest' | 'popular') ?? 'distance',
          radius: filterState.radius,
          page: pageNum,
          limit: 20,
        });
      }

      const topicFilteredEvents =
        selectedTopics.length > 1
          ? result.events.filter((event) => selectedTopics.includes(event.category))
          : result.events;

      if (reset) {
        setEvents(topicFilteredEvents);
      } else {
        setEvents((prev) => [...prev, ...topicFilteredEvents]);
      }
      setTotalPages(result.totalPages);
      setError(null);
    } catch {
      if (reset) setEvents([]);
      setError('Could not load events. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, selectedCategory, filterState, locationState.lat, locationState.lng, locationState.city]);

  useEffect(() => {
    setPage(1);
    loadEvents(1, true);
  }, [loadEvents]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadEvents(nextPage, false);
    }
  }, [isLoadingMore, page, totalPages, loadEvents]);

  const handleToggleLike = useCallback(
    async (eventId: string) => {
      if (!isAuthenticated) {
        router.push('/login' as never);
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

  const handleEventPress = useCallback(
    (eventId: string) => {
      router.push(`/event/${eventId}` as never);
    },
    [router],
  );

  const handleSearch = useCallback(() => {
    setPage(1);
    loadEvents(1, true);
  }, [loadEvents]);

  const handleFilterApply = useCallback(
    (filters: { categories?: string[]; city?: string; sortBy?: string; radius?: number }) => {
      if (filters.categories?.length === 1) {
        setSelectedCategory(filters.categories[0]);
      }
      setFilterState({
        topics: filters.categories,
        city: filters.city,
        sortBy: filters.sortBy,
        radius: filters.radius,
      });
    },
    [],
  );

  const locationLabel = locationState.district
    ? `${locationState.district}, ${locationState.city ?? 'Unknown'}`
    : (locationState.city ?? filterState.city ?? 'Tap to set location');

  const manualLocationLabel = useMemo(() => {
    if (!manualLocation) return '';
    const parts = [manualLocation.district, manualLocation.city, manualLocation.country].filter(Boolean);
    return parts.join(', ');
  }, [manualLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location access denied', 'You can still choose city/district manually.');
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
        Alert.alert('Location unavailable', 'Cannot get your current coordinates from this device.');
        return;
      }

      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${current.coords.latitude}&longitude=${current.coords.longitude}&localityLanguage=en`,
      );
      const geo = (await geoRes.json()) as {
        countryName?: string;
        city?: string;
        locality?: string;
        principalSubdivision?: string;
      };
      const city = geo.city ?? geo.locality ?? geo.principalSubdivision ?? '';
      const district = geo.locality ?? '';

      setLocationState({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        city,
        district,
      });
      setFilterState((prev) => ({ ...prev, city: city || prev.city }));
      setPage(1);
      loadEvents(1, true);
      setShowLocationPicker(false);
      setError(null);
    } catch {
      Alert.alert('Location unavailable', 'Unable to resolve your current location right now.');
    } finally {
      setIsResolvingLocation(false);
    }
  }, [loadEvents]);

  const categoryNames = categories.map((c) => c.category);

  const renderItem: ListRenderItem<EventData> = ({ item }) => (
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
      onPress={handleEventPress}
    />
  );

  const ListHeader = (
    <View style={styles.headerContainer}>
      <View style={[styles.topNav, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.heroTitle}>Explore</Text>
        <Pressable style={styles.notifButton} onPress={() => router.push('/notifications' as never)}>
          <Feather name="bell" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <Pressable style={styles.locationRow} onPress={() => setShowLocationPicker(true)}>
          <Feather name="navigation" size={10} color={colors.textSecondary} />
          <Text style={styles.locationText}>{locationLabel}</Text>
          <Feather name="chevron-down" size={12} color={colors.textTertiary} />
        </Pressable>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onSubmit={handleSearch}
          onFilterPress={() => setShowFilter(true)}
        />
      </View>

      <View style={styles.chipsSection}>
        <CategoryChips
          categories={categoryNames}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonContainer}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="search" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search terms
              </Text>
            </View>
          )
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.loadingMore}
            />
          ) : null
        }
      />

      <BottomTabBar activeTab="explore" onTabPress={(tab) => {
        if (tab === 'explore') return;
        if (tab === 'saved') router.push('/saved');
        else if (tab === 'scan-qr') router.push('/scan-qr');
        else if (tab === 'myevents') router.push(isAuthenticated && isOrganizerRole(user?.role) ? '/organizer-overview' : '/myevents');
        else if (tab === 'profile') router.push('/profile');
      }} />

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        onApply={handleFilterApply}
        categories={categoryNames}
        initialCategories={filterState.topics}
        initialCity={filterState.city}
        initialSortBy={filterState.sortBy}
        initialRadius={filterState.radius}
      />

      <Modal visible={showLocationPicker} transparent animationType="slide">
        <View style={styles.locationOverlay}>
          <View style={[styles.locationSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Set Location</Text>
              <Pressable onPress={() => setShowLocationPicker(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Pressable
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
              disabled={isResolvingLocation}
            >
              {isResolvingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="crosshair" size={18} color={colors.primary} />
              )}
              <Text style={styles.currentLocationText}>Use current location</Text>
            </Pressable>
            <Pressable
              style={styles.manualTrigger}
              onPress={() => {
                setShowLocationPicker(false);
                setTimeout(() => {
                  router.push('/manual-location' as never);
                }, 120);
              }}
            >
              <Text style={styles.manualTriggerText}>
                Choose location manually
              </Text>
              <Feather name="chevron-right" size={16} color={colors.primary} />
            </Pressable>
            {manualLocationLabel ? (
              <Text style={styles.manualHintText}>{manualLocationLabel}</Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingBottom: spacing.xs,
  },
  notifButton: {
    padding: spacing.sm,
  },
  titleSection: {
    paddingHorizontal: 0,
    gap: spacing.xs,
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
  },
  locationText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  searchSection: {
    paddingHorizontal: 0,
  },
  chipsSection: {
    paddingHorizontal: 0,
  },
  errorContainer: {
    marginHorizontal: 0,
  },
  errorText: {
    color: colors.danger,
    fontWeight: fontWeights.semibold,
    fontSize: typography.bodySmall,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  skeletonContainer: {
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
  },
  loadingMore: {
    paddingVertical: spacing.xl,
  },
  locationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  locationSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  locationTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  currentLocationText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  manualTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  manualHintText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  manualTriggerText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.primary,
  },
});
