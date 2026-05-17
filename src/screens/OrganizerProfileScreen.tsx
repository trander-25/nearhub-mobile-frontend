import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import { getOrganizerProfile, toggleFollowOrganizer } from '@/services';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { EventData } from '@/types';
import { promptSignIn } from '@/utils/authPrompt';

export function OrganizerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizer, setOrganizer] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    followers: number;
  } | null>(null);
  const [rating, setRating] = useState({ average: 0, total: 0 });
  const [events, setEvents] = useState<EventData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setIsLoading(true);
    try {
      const response = await getOrganizerProfile(id);
      setOrganizer(response.organizer);
      setRating(response.rating);
      setIsFollowing(response.isFollowing);
      setEvents(
        response.events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          imageUrl: event.images?.[0] ?? 'https://picsum.photos/1200/800',
          dateLabel: new Date(event.startAt).toLocaleString('en-US'),
          address: event.location.address,
          city: event.location.city ?? 'N/A',
          category: event.category,
          lat: event.location.lat,
          lng: event.location.lng,
          startAt: event.startAt,
          endAt: event.endAt ?? undefined,
          totalViews: event.totalViews,
          organizer: event.organizer ?? null,
        })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load organizer profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleFollow = useCallback(async () => {
    if (!id) return;
    if (!isAuthenticated) {
      promptSignIn(() => router.push('/login?entry=required' as never));
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await toggleFollowOrganizer(id);
      setIsFollowing(result.following);
      setOrganizer((prev) => (prev ? { ...prev, followers: result.followers } : prev));
    } catch (err) {
      Alert.alert('Cannot follow organizer', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [id, isAuthenticated, isSubmitting, router]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfile(true);
  }, [loadProfile]);

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !organizer) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>{error ?? 'Organizer not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary, colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Organizer</Text>
        </View>
      </View>

      <View style={styles.bodyContent}>
        <View style={styles.profileCard}>
          {organizer.avatarUrl ? (
            <Image source={{ uri: organizer.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{organizer.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{organizer.displayName}</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{organizer.followers}</Text>
              <Text style={styles.metricLabel}>Followers</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <View style={styles.ratingInline}>
                <Feather name="star" size={12} color={colors.star} />
                <Text style={styles.metricValue}>{rating.average.toFixed(1)}</Text>
              </View>
              <Text style={styles.metricLabel}>{rating.total} Reviews</Text>
            </View>
          </View>
          <Pressable
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleToggleFollow}
          >
            <Text style={[styles.followText, isFollowing && styles.followingText]}>
              {isFollowing ? 'Following' : 'Follow Organizer'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Events from organizer</Text>
        <View style={styles.eventsList}>
          {events.map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              title={event.title}
              imageUrl={event.imageUrl}
              date={event.dateLabel}
              location={`${event.address}, ${event.city}`}
              category={event.category}
              distanceKm={event.distanceKm}
              rating={event.rating}
              onPress={(eventId) => router.push(`/event/${eventId}` as never)}
            />
          ))}
          {events.length === 0 ? <Text style={styles.meta}>No published events yet.</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { gap: spacing.lg },
  bodyContent: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  subtitle: { color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { color: '#fff', fontWeight: fontWeights.bold, fontSize: typography.body },
  name: { fontSize: typography.heading, color: colors.textPrimary, fontWeight: fontWeights.bold },
  metricsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: 34, backgroundColor: colors.border },
  metricValue: { fontSize: typography.body, color: colors.textPrimary, fontWeight: fontWeights.bold },
  metricLabel: { fontSize: typography.caption, color: colors.textTertiary },
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  followButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
  },
  followingButton: {
    backgroundColor: colors.chipBg,
  },
  followText: { color: '#fff', fontSize: typography.bodySmall, fontWeight: fontWeights.semibold },
  followingText: { color: colors.primary },
  sectionTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  eventsList: { gap: spacing.md },
  meta: { color: colors.textTertiary, fontSize: typography.bodySmall, textAlign: 'center' },
  errorText: { color: colors.textSecondary, fontSize: typography.bodySmall, textAlign: 'center' },
});
