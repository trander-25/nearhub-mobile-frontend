import React, { useCallback, useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import QRCode from 'react-native-qrcode-svg';

import { colors, spacing, typography, fontWeights } from '@/theme';
import { WriteReviewModal } from '@/components/features';
import {
  getEventDetail,
  toggleLikeEvent,
  rsvpEvent,
  cancelRsvp,
  submitReview,
  toggleFollowOrganizer,
} from '@/services';
import { getMyEvents } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import type { EventData, ReviewItem } from '@/types';
import { promptSignIn } from '@/utils/authPrompt';

const HERO_HEIGHT = 397;

function resolveMapBounds(lat: number, lng: number): string {
  const latDelta = 0.0008;
  const lngDelta = 0.0008;
  const left = (lng - lngDelta).toFixed(6);
  const right = (lng + lngDelta).toFixed(6);
  const top = (lat + latDelta).toFixed(6);
  const bottom = (lat - latDelta).toFixed(6);
  return `${left}%2C${bottom}%2C${right}%2C${top}`;
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRsvped, setIsRsvped] = useState(false);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [isRsvpSubmitting, setIsRsvpSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isFollowingOrganizer, setIsFollowingOrganizer] = useState(false);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showShareQrModal, setShowShareQrModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadDetail();
      if (isAuthenticated) loadUserStatus();
    }
  }, [id, isAuthenticated]);

  async function loadDetail(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await getEventDetail(id!);
      setEvent(data.event);
      setIsFollowingOrganizer(Boolean(data.isFollowingOrganizer));
      setReviews(data.reviews);
      setRating(data.rating);
      setError(null);
    } catch {
      setError('Could not load event details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
      promptSignIn(() => router.push('/login?entry=required' as never));
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
      Alert.alert('Unable to like', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsLikeSubmitting(false);
    }
  }, [id, isAuthenticated, isLikeSubmitting, router]);

  const handleRsvp = useCallback(async () => {
    if (!id) return;
    if (!isAuthenticated) {
      promptSignIn(() => router.push('/login?entry=required' as never));
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
      Alert.alert('Unable to RSVP', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsRsvpSubmitting(false);
    }
  }, [id, isAuthenticated, isRsvped, isRsvpSubmitting, router]);

  const handleSubmitReview = useCallback(
    async (reviewRating: number, reviewComment: string) => {
      if (!id) return;
      if (!isAuthenticated) {
        promptSignIn(() => router.push('/login?entry=required' as never));
        return;
      }
      await submitReview(id, reviewRating, reviewComment);
      loadDetail();
    },
    [id, isAuthenticated, router],
  );

  const handleDirections = useCallback(() => {
    if (!event) return;
    if (typeof event.lat === 'number' && typeof event.lng === 'number') {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`);
      return;
    }
    const query = encodeURIComponent(`${event.address}, ${event.city}`);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }, [event]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setIsRefreshing(true);
    await loadDetail(true);
    if (isAuthenticated) await loadUserStatus();
  }, [id, isAuthenticated]);

  const handleOpenMapScreen = useCallback(() => {
    if (!event) return;
    const latParam = typeof event.lat === 'number' ? `&lat=${event.lat}` : '';
    const lngParam = typeof event.lng === 'number' ? `&lng=${event.lng}` : '';
    const cityParam = event.city ? `&city=${encodeURIComponent(event.city)}` : '';
    router.push(`/map?eventId=${event.id}${latParam}${lngParam}${cityParam}` as never);
  }, [event, router]);

  const handleOpenOrganizerProfile = useCallback(() => {
    if (!event?.organizer?.id) return;
    router.push(`/organizer/${event.organizer.id}` as never);
  }, [event?.organizer?.id, router]);

  const handleToggleFollowOrganizer = useCallback(async () => {
    if (!event?.organizer?.id) return;
    if (!isAuthenticated) {
      promptSignIn(() => router.push('/login?entry=required' as never));
      return;
    }
    if (isFollowSubmitting) return;
    setIsFollowSubmitting(true);
    try {
      const result = await toggleFollowOrganizer(event.organizer.id);
      setIsFollowingOrganizer(result.following);
    } catch (error) {
      Alert.alert('Unable to follow organizer', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsFollowSubmitting(false);
    }
  }, [event?.organizer?.id, isAuthenticated, isFollowSubmitting, router]);

  const shareLink = id ? `nearhub://event/${id}` : '';

  const handleShareLink = useCallback(async () => {
    if (!shareLink) return;
    try {
      await Share.share(Platform.OS === 'ios' ? { url: shareLink } : { message: shareLink });
    } catch {
      Alert.alert('Unable to share', 'Please try again.');
    }
  }, [shareLink]);

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

  const mapEmbedUrl =
    typeof event.lat === 'number' && typeof event.lng === 'number'
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${resolveMapBounds(event.lat, event.lng)}&layer=mapnik&marker=${event.lat},${event.lng}`
      : null;

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
        {/* ====== Hero Section ====== */}
        <View style={styles.heroSection}>
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(251,252,247,0)', colors.background]}
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
              <Pressable style={styles.organizerLeft} onPress={handleOpenOrganizerProfile}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {(event.organizer?.displayName ?? event.address).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.organizerTextBlock}>
                  <Text style={styles.organizerName}>
                    {event.organizer?.displayName ?? event.address.split(',')[0]}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.followButton} onPress={handleToggleFollowOrganizer}>
                <Text style={styles.followButtonText}>
                  {isFollowingOrganizer ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionHeading}>Event Time</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={styles.infoPrimaryText}>{event.dateLabel}</Text>
              </View>
              <Text style={styles.infoSecondaryText}>
                {event.endAt
                  ? `Ends ${new Date(event.endAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                  : 'Doors open early for check-in.'}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionHeading}>Location</Text>
            <View style={styles.infoCard}>
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={16} color={colors.primary} style={styles.addressIcon} />
                <Text style={styles.addressText}>
                  {event.address}
                </Text>
              </View>
              <Text style={styles.infoSecondaryText}>{event.city}</Text>
              <View style={styles.mapPreview}>
                {mapEmbedUrl ? (
                  <View style={styles.mapEmbedWrap}>
                    <WebView
                      source={{ uri: mapEmbedUrl }}
                      style={styles.mapEmbed}
                      scrollEnabled
                      javaScriptEnabled
                      domStorageEnabled
                      nestedScrollEnabled
                    />
                  </View>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Feather name="map" size={24} color={colors.textTertiary} />
                  </View>
                )}
                <Pressable style={styles.mapTapOverlay} onPress={handleOpenMapScreen} />
              </View>
              <Pressable style={styles.mapActionButton} onPress={handleDirections}>
                <Feather name="external-link" size={14} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionHeading}>Ticket Price</Text>
            <View style={styles.infoCard}>
              <Text style={styles.priceValue}>Free</Text>
              <Text style={styles.infoSecondaryText}>Open to all</Text>
            </View>
          </View>

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
              onPress={() => {
                if (!isAuthenticated) {
                  promptSignIn(() => router.push('/login?entry=required' as never));
                  return;
                }
                setShowReviewModal(true);
              }}
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
          <Pressable style={styles.navButtonOutline} onPress={() => setShowShareOptions(true)}>
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
            colors={isRsvped ? colors.disabledGradient : colors.primaryGradient}
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

      <Modal visible={showShareOptions} transparent animationType="fade" onRequestClose={() => setShowShareOptions(false)}>
        <View style={styles.shareOverlay}>
          <Pressable style={styles.shareBackdrop} onPress={() => setShowShareOptions(false)} />
          <View style={[styles.shareSheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            <Text style={styles.shareTitle}>Share Event</Text>
            <Pressable
              style={styles.shareOption}
              onPress={async () => {
                setShowShareOptions(false);
                await handleShareLink();
              }}
            >
              <Feather name="link" size={16} color={colors.primary} />
              <Text style={styles.shareOptionText}>Share link</Text>
            </Pressable>
            <Pressable
              style={styles.shareOption}
              onPress={() => {
                setShowShareOptions(false);
                setShowShareQrModal(true);
              }}
            >
              <Feather name="maximize" size={16} color={colors.primary} />
              <Text style={styles.shareOptionText}>Create QR code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showShareQrModal} transparent animationType="slide" onRequestClose={() => setShowShareQrModal(false)}>
        <View style={styles.shareOverlay}>
          <Pressable style={styles.shareBackdrop} onPress={() => setShowShareQrModal(false)} />
          <View style={[styles.shareSheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
            <Text style={styles.shareTitle}>Event QR Code</Text>
            <View style={styles.shareQrWrap}>
              <QRCode value={shareLink || 'nearhub://event'} size={220} />
            </View>
            <Text numberOfLines={2} style={styles.shareLinkText}>
              {shareLink}
            </Text>
            <Pressable
              style={styles.sharePrimaryButton}
              onPress={async () => {
                await handleShareLink();
              }}
            >
              <Text style={styles.sharePrimaryButtonText}>Share link</Text>
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
    gap: spacing.md,
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  organizerAvatarText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
  },
  organizerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  organizerName: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    flexShrink: 1,
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    flexShrink: 0,
  },
  followButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // ---- Info Sections ----
  infoSection: {
    gap: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    flexShrink: 1,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  infoPrimaryText: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  infoSecondaryText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    lineHeight: 16,
  },
  mapPreview: {
    height: 240,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapActionButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipBg,
  },
  mapEmbedWrap: {
    width: '100%',
    height: '100%',
  },
  mapEmbed: {
    flex: 1,
    opacity: Platform.OS === 'android' ? 0.95 : 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  mapTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  priceValue: {
    fontSize: typography.title,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
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
    borderColor: colors.border,
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
    shadowColor: colors.primaryShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  joinNowText: {
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  shareBackdrop: {
    flex: 1,
  },
  shareSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  shareTitle: {
    alignSelf: 'flex-start',
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  shareOption: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareOptionText: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: fontWeights.semibold,
  },
  shareQrWrap: {
    width: 236,
    height: 236,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkText: {
    width: '100%',
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  sharePrimaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sharePrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    fontSize: typography.bodySmall,
  },
});
