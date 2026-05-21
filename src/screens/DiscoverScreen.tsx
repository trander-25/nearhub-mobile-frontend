import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';

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
import { promptSignIn } from '@/utils/authPrompt';

const AREA_FILTER = 'Your area';
const FOR_YOU_FILTER = 'For You';
const ALL_EVENTS_FILTER = 'All events';
const DEFAULT_AREA_RADIUS_KM = 100;

type SortBy = 'closest' | 'farthest' | 'newest' | 'oldest';
type SearchSortBy = SortBy | 'random';

interface LocationState {
  lat?: number;
  lng?: number;
  city?: string;
  district?: string;
  source?: 'current';
}

let cachedDiscoverLocation: LocationState | null = null;
let didBootstrapDiscoverLocation = false;
let bootstrapDiscoverLocationPromise: Promise<LocationState | null> | null = null;

function hasCoordinates(location: { lat?: number; lng?: number }) {
  return typeof location.lat === 'number' && typeof location.lng === 'number';
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeRadius(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function shuffleEvents<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

async function readCurrentLocation(silent = false): Promise<LocationState | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      if (!silent) {
        Alert.alert('Location access denied', 'We will show a mixed event feed instead.');
      }
      return null;
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
      if (!silent) {
        Alert.alert('Location unavailable', 'Cannot get your current coordinates from this device.');
      }
      return null;
    }

    const [geo] = await Location.reverseGeocodeAsync({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    }).catch(() => []);
    const city = geo?.city ?? geo?.subregion ?? geo?.region ?? '';
    const district = geo?.district ?? geo?.subregion ?? '';

    return {
      lat: current.coords.latitude,
      lng: current.coords.longitude,
      city,
      district,
      source: 'current',
    };
  } catch {
    if (!silent) {
      Alert.alert('Location unavailable', 'Unable to resolve your current location right now.');
    }
    return null;
  }
}

async function bootstrapDiscoverLocation(): Promise<LocationState | null> {
  if (didBootstrapDiscoverLocation) return cachedDiscoverLocation;

  bootstrapDiscoverLocationPromise ??= readCurrentLocation(true).then((location) => {
    cachedDiscoverLocation = location;
    didBootstrapDiscoverLocation = true;
    return location;
  }).finally(() => {
    bootstrapDiscoverLocationPromise = null;
  });

  return bootstrapDiscoverLocationPromise;
}

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isAuthenticated, user } = useAuth();

  const [events, setEvents] = useState<EventData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(FOR_YOU_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [locationState, setLocationState] = useState<LocationState>(() => cachedDiscoverLocation ?? {});
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [isBootstrappingLocation, setIsBootstrappingLocation] = useState(!didBootstrapDiscoverLocation);
  const preferences = useMemo(() => user?.preferences ?? [], [user?.preferences]);
  const hasPreferences = preferences.length > 0;

  useEffect(() => {
    if (params.tab === 'for-you') {
      setSelectedCategory(FOR_YOU_FILTER);
    }
  }, [params.tab]);

  useEffect(() => {
    loadCategories();
    if (isAuthenticated) loadUserLikes();
  }, [isAuthenticated]);

  const resolveCurrentLocation = useCallback(async (silent = false): Promise<boolean> => {
    const location = await readCurrentLocation(silent);
    if (!location) return false;

    cachedDiscoverLocation = location;
    didBootstrapDiscoverLocation = true;
    setLocationState(location);
    setFilterState((prev) => ({ ...prev, city: undefined }));
    setPage(1);
    setError(null);
    return true;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const location = await bootstrapDiscoverLocation();
      if (mounted && location) {
        setLocationState(location);
      }
      if (mounted) setIsBootstrappingLocation(false);
    })();

    return () => {
      mounted = false;
    };
  }, [resolveCurrentLocation]);

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

  const loadEvents = useCallback(async (pageNum: number, reset: boolean, silent = false) => {
    if (isBootstrappingLocation && (selectedCategory === AREA_FILTER || selectedCategory === FOR_YOU_FILTER)) return;

    if (reset && !silent) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const query = search.trim();
      let result;
      const isAreaMode = selectedCategory === AREA_FILTER;
      const isForYouMode = selectedCategory === FOR_YOU_FILTER;
      const isAllEventsMode = selectedCategory === ALL_EVENTS_FILTER;
      const canUseCoordinates = hasCoordinates(locationState);
      const radius = normalizeRadius(filterState.radius);
      const explicitSort = filterState.sortBy as SortBy | undefined;
      const selectedSort = explicitSort ?? (isAreaMode || isForYouMode ? 'closest' : 'oldest');
      const cityFilter = normalizeOptionalText(filterState.city);
      const selectedTopics = filterState.topics ?? [];
      const singleTopic = selectedTopics.length === 1 ? selectedTopics[0] : undefined;
      const multiTopicCategories = selectedTopics.length > 1 ? selectedTopics : undefined;
      const categoryFilter = isAreaMode || isAllEventsMode || isForYouMode ? undefined : selectedCategory;
      const effectiveCategory = singleTopic ?? categoryFilter;
      const sortNeedsCoordinates = selectedSort === 'closest' || selectedSort === 'farthest';
      const usedDistanceFallbackSort = sortNeedsCoordinates && !canUseCoordinates;
      const useRandomCoordinateFallback =
        usedDistanceFallbackSort && !cityFilter && (isForYouMode || isAreaMode);
      const searchSort: SearchSortBy = useRandomCoordinateFallback
        ? 'random'
        : usedDistanceFallbackSort
          ? 'oldest'
          : selectedSort;
      const coordinatesFilter = canUseCoordinates
        ? {
            lat: locationState.lat,
            lng: locationState.lng,
            radius,
          }
        : {};

      if (isForYouMode) {
        result = await searchEvents({
          keyword: query || undefined,
          categories: hasPreferences ? preferences : undefined,
          city: cityFilter,
          ...coordinatesFilter,
          sortBy: searchSort,
          page: pageNum,
          limit: 20,
        });
      } else if (isAreaMode && canUseCoordinates) {
        result = await getNearbyEvents({
          lat: locationState.lat!,
          lng: locationState.lng!,
          keyword: query || undefined,
          category: effectiveCategory,
          categories: multiTopicCategories,
          city: cityFilter,
          sortBy: selectedSort,
          radius: radius ?? DEFAULT_AREA_RADIUS_KM,
          page: pageNum,
          limit: 20,
        });
      } else {
        result = await searchEvents({
          keyword: query || undefined,
          category: effectiveCategory,
          categories: multiTopicCategories,
          city: cityFilter,
          sortBy: searchSort,
          ...coordinatesFilter,
          page: pageNum,
          limit: 20,
        });
      }

      const topicFilteredEvents =
        selectedTopics.length > 1
          ? result.events.filter((event) => selectedTopics.includes(event.category))
          : result.events;
      const nextEvents =
        useRandomCoordinateFallback
          ? shuffleEvents(topicFilteredEvents)
          : topicFilteredEvents;

      if (reset) {
        setEvents(nextEvents);
      } else {
        setEvents((prev) => [...prev, ...nextEvents]);
      }
      setTotalPages(result.totalPages);
      setError(null);
    } catch {
      if (reset) setEvents([]);
      setError('Could not load events. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [filterState, hasPreferences, isBootstrappingLocation, locationState, preferences, search, selectedCategory]);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await loadCategories();
    if (isAuthenticated) await loadUserLikes();
    await loadEvents(1, true, true);
  }, [isAuthenticated, loadEvents]);

  const handleFilterApply = useCallback(
    (filters: { categories?: string[]; city?: string; sortBy?: string; radius?: number }) => {
      if (filters.categories?.length === 1) {
        setSelectedCategory(filters.categories[0]);
      } else if (filters.categories && filters.categories.length > 1) {
        setSelectedCategory(ALL_EVENTS_FILTER);
      }
      setFilterState({
        topics: filters.categories,
        city: normalizeOptionalText(filters.city),
        sortBy: filters.sortBy,
        radius: filters.radius,
      });
    },
    [],
  );

  const locationLabel = locationState.source === 'current'
    ? (
      locationState.district
        ? `${locationState.district}, ${locationState.city ?? 'Current location'}`
        : locationState.city ?? 'Current location'
    )
    : 'Set location';

  const handleUseCurrentLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    try {
      const resolved = await resolveCurrentLocation(false);
      if (resolved) {
        setShowLocationPicker(false);
      }
    } finally {
      setIsResolvingLocation(false);
    }
  }, [resolveCurrentLocation]);

  const categoryNames = categories.map((c) => c.category);
  const isForYouSelected = selectedCategory === FOR_YOU_FILTER;

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

  const FixedHeader = (
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
      {FixedHeader}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonContainer}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name={isForYouSelected ? 'heart' : 'search'} size={48} color={colors.textTertiary} />
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
        if (!isAuthenticated && (tab === 'saved' || tab === 'myevents' || tab === 'profile')) {
          promptSignIn(() => router.push('/login?entry=required' as never));
          return;
        }
        if (tab === 'saved') router.navigate('/saved' as never);
        else if (tab === 'scan-qr') router.navigate('/scan-qr' as never);
        else if (tab === 'myevents') router.navigate((isAuthenticated && isOrganizerRole(user?.role) ? '/organizer-overview' : '/myevents') as never);
        else if (tab === 'profile') router.navigate('/profile' as never);
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
    backgroundColor: colors.background,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    zIndex: 10,
    elevation: 2,
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
    paddingTop: spacing.sm,
  },
  list: {
    flex: 1,
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
    textAlign: 'center',
    lineHeight: 22,
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
});
