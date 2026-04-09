import React, { useCallback, useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, fontWeights } from '@/theme';
import { WriteReviewModal } from '@/components/features';
import {
  getEventDetail,
  toggleLikeEvent,
  rsvpEvent,
  cancelRsvp,
  submitReview,
} from '@/services';
import { getMyEvents } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import type { EventData, ReviewItem } from '@/types';

const META_CARD_WIDTH = 280;
const HERO_HEIGHT = 397;

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState<EventData | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [rating, setRating] = useState({ average: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadDetail();
      if (isAuthenticated) loadUserStatus();
    }
  }, [id, isAuthenticated]);

  async function loadDetail() {
    setIsLoading(true);
    try {
      const data = await getEventDetail(id!);
      setEvent(data.event);
      setReviews(data.reviews);
      setRating(data.rating);
      setError(null);
    } catch {
      setError('Could not load event details.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUserStatus() {
    try {
      const data = await getMyEvents();
      const rsvpIds = new Set(data.rsvpEvents.map((e) => e.id));
      const likeIds = new Set(data.likedEvents.map((e) => e.id));
      setIsRsvped(rsvpIds.has(id!));
      setIsLiked(likeIds.has(id!));
    } catch {
      // Non-critical
    }
  }

  const handleToggleLike = useCallback(async () => {
    if (!id) return;
    if (!isAuthenticated) {
      router.push('/login' as never);
      return;
    }
    if (isLikeSubmitting) return;

    setIsLikeSubmitting(true);
    setIsLiked((prev) => !prev);
    try {
      const res = await toggleLikeEvent(id);
      setIsLiked(res.liked);
    } catch (e) {
      setIsLiked((prev) => !prev);
      Alert.alert('Không thể thả tim', e instanceof Error ? e.message : 'Vui lòng thử lại.');
    } finally {
      setIsLikeSubmitting(false);
    }
  }, [id, isAuthenticated, isLikeSubmitting, router]);

  const handleRsvp = useCallback(async () => {
    if (!id) return;
    if (!isAuthenticated) {
      router.push('/login' as never);
      return;
    }
    if (isRsvpSubmitting) return;

    setIsRsvpSubmitting(true);
    try {
      if (isRsvped) {
        await cancelRsvp(id);
        setIsRsvped(false);
      } else {
        await rsvpEvent(id);
        setIsRsvped(true);
      }
    } catch (e) {
      Alert.alert('Không thể tham gia', e instanceof Error ? e.message : 'Vui lòng thử lại.');
    } finally {
      setIsRsvpSubmitting(false);
    }
  }, [id, isAuthenticated, isRsvped, isRsvpSubmitting, router]);

  const handleSubmitReview = useCallback(
    async (reviewRating: number, reviewComment: string) => {
      if (!id) return;
      await submitReview(id, reviewRating, reviewComment);
      loadDetail();
    },
    [id],
  );

  const handleDirections = useCallback(() => {
    if (!event) return;
    const query = encodeURIComponent(`${event.address}, ${event.city}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }, [event]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- Error state ---
  if (error || !event) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Feather name="alert-circle" size={48} color={colors.textTertiary} />
        <Text style={styles.errorText}>{error ?? 'Event not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBackButton}>
          <Feather name="arrow-left" size={16} color={colors.primary} />
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const descriptionText = event.description ?? '';
  const isLongDescription = descriptionText.length > 200;
  const displayDescription =
    isLongDescription && !aboutExpanded
      ? descriptionText.slice(0, 200) + '...'
      : descriptionText;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ====== Hero Section ====== */}
        <View style={styles.heroSection}>
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(250,248,255,0)', colors.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* ====== Content Canvas (overlaps hero by 48px) ====== */}
        <View style={styles.contentCanvas}>
          {/* --- Header Info Card --- */}
          <View style={styles.headerInfoCard}>
            <Text style={styles.eventTitle}>{event.title}</Text>

            <View style={styles.organizerRow}>
              <View style={styles.organizerLeft}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {event.address.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.organizerName} numberOfLines={1}>
                    {event.address.split(',')[0]}
                  </Text>
                  <Text style={styles.organizerLabel}>Organizer</Text>
                </View>
              </View>
              <Pressable style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </Pressable>
            </View>
          </View>

          {/* --- Meta Cards Row (horizontal scroll) --- */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metaCardsContainer}
            style={styles.metaCardsScroll}
          >
            {/* Time Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaCardTop}>
                <View style={styles.metaIconBadge}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <View style={styles.metaCardInfo}>
                  <Text style={styles.metaCardTitle}>{event.dateLabel}</Text>
                  <Text style={styles.metaCardSub} numberOfLines={2}>
                    {event.endAt
                      ? `Ends ${new Date(event.endAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                      : 'Doors open early for check-in.'}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.metaCardLink}>
                <Text style={styles.metaCardLinkText}>Add to Calendar</Text>
                <Feather name="chevron-right" size={12} color={colors.primary} />
              </Pressable>
            </View>

            {/* Location Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaCardTop}>
                <View style={[styles.metaIconBadge, styles.metaIconBadgeLocation]}>
                  <Feather name="map-pin" size={16} color={colors.primary} />
                </View>
                <View style={styles.metaCardInfo}>
                  <Text style={styles.metaCardTitle} numberOfLines={1}>
                    {event.address.split(',')[0]}
                  </Text>
                  <Text style={styles.metaCardSub}>{event.city}</Text>
                </View>
              </View>
              <Pressable style={styles.mapPreview} onPress={handleDirections}>
                <View style={styles.mapPlaceholder}>
                  <Feather name="map" size={24} color={colors.textTertiary} />
                </View>
                <View style={styles.directionsButton}>
                  <Text style={styles.directionsText}>Directions</Text>
                </View>
              </Pressable>
            </View>

            {/* Price Card */}
            <View style={[styles.metaCard, styles.priceCard]}>
              <Text style={styles.priceLabel}>Ticket Price</Text>
              <Text style={styles.priceValue}>Free</Text>
              <Text style={styles.priceSub}>Open to all</Text>
            </View>
          </ScrollView>

          {/* --- About Section --- */}
          {descriptionText.length > 0 && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionHeading}>About the Event</Text>
              <Text style={styles.aboutText}>{displayDescription}</Text>
              {isLongDescription && (
                <Pressable onPress={() => setAboutExpanded((prev) => !prev)}>
                  <Text style={styles.readMoreLink}>
                    {aboutExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* --- Reviews Section --- */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <View>
                <Text style={styles.sectionHeading}>Reviews</Text>
                <View style={styles.reviewsSummary}>
                  <Feather name="star" size={12} color={colors.star} />
                  <Text style={styles.reviewsSummaryValue}>
                    {rating.average.toFixed(1)}
                  </Text>
                  <Text style={styles.reviewsSummaryCount}>
                    ({rating.total} review{rating.total !== 1 ? 's' : ''})
                  </Text>
                </View>
              </View>
              {reviews.length > 2 && (
                <Pressable>
                  <Text style={styles.viewAllLink}>View All</Text>
                </Pressable>
              )}
            </View>

            {/* Review cards */}
            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewUserRow}>
                    {review.user?.avatarUrl ? (
                      <Image
                        source={{ uri: review.user.avatarUrl }}
                        style={styles.reviewAvatar}
                      />
                    ) : (
                      <View style={styles.reviewAvatarPlaceholder}>
                        <Text style={styles.reviewAvatarText}>
                          {(review.user?.displayName ?? 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.reviewUserName}>
                        {review.user?.displayName ?? 'Anonymous'}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {formatRelativeTime(review.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Feather
                        key={star}
                        name="star"
                        size={10}
                        color={star <= review.rating ? colors.star : colors.chipBg}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}

            {reviews.length === 0 && (
              <Text style={styles.noReviewsText}>
                No reviews yet. Be the first to share your experience!
              </Text>
            )}

            {/* Write a Review button */}
            <Pressable
              style={styles.writeReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Text style={styles.writeReviewButtonText}>Write a Review</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ====== Top Navigation Bar (absolute) ====== */}
      <View style={[styles.topNavBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.navRight}>
          <Pressable style={styles.navButtonOutline}>
            <Feather name="share-2" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={[styles.navButtonOutline, isLiked && styles.navButtonLiked]} onPress={handleToggleLike}>
            <Feather
              name="heart"
              size={16}
              color={isLiked ? '#FFFFFF' : colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {/* ====== Sticky Bottom Bar ====== */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total Price</Text>
          <Text style={styles.bottomPriceValue}>Free</Text>
        </View>
        <Pressable onPress={handleRsvp}>
          <LinearGradient
            colors={isRsvped ? ['#E7E7F2', '#E7E7F2'] : ['#003D9B', '#0052CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.joinNowButton}
          >
            <Text
              style={[
                styles.joinNowText,
                isRsvped && { color: colors.primary },
              ]}
            >
              {isRsvped ? 'Registered ✓' : 'Join Now'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ====== Write Review Modal ====== */}
      <WriteReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: fontWeights.medium,
  },
  errorBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLink: {
    color: colors.primary,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
  },

  // ---- Hero ----
  heroSection: {
    height: HERO_HEIGHT,
    marginBottom: -48,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // ---- Content Canvas ----
  contentCanvas: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
    marginBottom: -48,
  },

  // ---- Header Info Card ----
  headerInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    shadowColor: 'rgba(25,27,35,0.04)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 4,
  },
  eventTitle: {
    fontSize: 30,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.75,
    lineHeight: 37.5,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
  },
  organizerName: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  organizerLabel: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  followButton: {
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  followButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // ---- Meta Cards ----
  metaCardsScroll: {
    marginHorizontal: -spacing.xl,
  },
  metaCardsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: META_CARD_WIDTH,
    height: 172,
    justifyContent: 'space-between',
  },
  metaCardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  metaIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,61,155,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIconBadgeLocation: {},
  metaCardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  metaCardTitle: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  metaCardSub: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  metaCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  metaCardLinkText: {
    fontSize: typography.caption,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },
  mapPreview: {
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  directionsButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  directionsText: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  priceCard: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLabel: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  priceValue: {
    fontSize: typography.title,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    textAlign: 'center',
  },
  priceSub: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // ---- About Section ----
  aboutSection: {
    gap: 8,
    paddingTop: spacing.sm,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  aboutText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22.75,
  },
  readMoreLink: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // ---- Reviews Section ----
  reviewsSection: {
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reviewsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  reviewsSummaryValue: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  reviewsSummaryCount: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  viewAllLink: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: fontWeights.bold,
  },
  reviewUserName: {
    fontSize: typography.caption,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  reviewDate: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noReviewsText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: typography.bodySmall,
    paddingVertical: spacing.xl,
  },
  writeReviewButton: {
    borderWidth: 1,
    borderColor: '#C3C6D6',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeReviewButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // ---- Top Navigation Bar ----
  topNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    gap: 8,
  },
  navButtonOutline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLiked: {
    backgroundColor: colors.danger,
  },

  // ---- Sticky Bottom Bar ----
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 17,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSecondary,
    shadowColor: 'rgba(25,27,35,0.06)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  bottomPriceLabel: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
  },
  bottomPriceValue: {
    fontSize: typography.heading,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  joinNowButton: {
    borderRadius: 999,
    paddingHorizontal: 40,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,61,155,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 6,
  },
  joinNowText: {
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
