import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabBar } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFollowingOrganizers,
  getMyEvents,
  getProfile,
  type FollowingOrganizer,
  type MyEventsResponse,
} from '@/services/userService';
import type { AuthUser } from '@/types/auth.types';
import type { ApiEvent } from '@/types/event.types';
import { colors, fontWeights, spacing, typography } from '@/theme';
import { isAdminRole, isOrganizerRole } from '@/utils/role';

type EventTab = 'myevents' | 'saved';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: authUser, signOut, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && isAdminRole(authUser?.role);
  const isOrganizer = isAuthenticated && isOrganizerRole(authUser?.role);

  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [eventsData, setEventsData] = useState<MyEventsResponse | null>(null);
  const [followingOrganizers, setFollowingOrganizers] = useState<FollowingOrganizer[]>([]);
  const [activeEventTab, setActiveEventTab] = useState<EventTab>('myevents');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const loadProfileData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profileRes, eventsRes, followingRes] = await Promise.all([
        getProfile(),
        getMyEvents(),
        getFollowingOrganizers(),
      ]);
      setProfile(profileRes);
      setEventsData(eventsRes);
      setFollowingOrganizers(followingRes.items ?? []);
    } catch {
      if (authUser) setProfile(authUser);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    if (authUser) {
      setProfile(authUser);
    }
  }, [authUser]);

  const displayUser = profile ?? authUser;

  const rsvpEvents = eventsData?.rsvpEvents ?? [];
  const likedEvents = eventsData?.likedEvents ?? [];
  const visibleEvents = activeEventTab === 'myevents' ? rsvpEvents : likedEvents;

  const handleTabPress = useCallback((tab: string) => {
    if (isAdmin) {
      if (tab === 'admin-moderation') router.navigate('/admin-moderation' as never);
      else if (tab === 'admin-users') router.navigate('/admin-users' as never);
      else if (tab === 'admin-broadcast') router.navigate('/admin-broadcast' as never);
      return;
    }
    if (isOrganizer) {
      if (tab === 'organizer-overview') router.navigate('/organizer-overview' as never);
      else if (tab === 'organizer-manage') router.navigate('/organizer-manage' as never);
      else if (tab === 'organizer-notifications') router.navigate('/organizer-notifications' as never);
      return;
    }
    if (tab === 'explore') router.navigate('/' as never);
    else if (tab === 'for-you') router.navigate('/?tab=for-you' as never);
    else if (tab === 'saved') router.navigate('/saved' as never);
    else if (tab === 'scan-qr') router.navigate('/scan-qr' as never);
    else if (tab === 'myevents') router.navigate('/myevents' as never);
  }, [isAdmin, isOrganizer, router]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setShowSettings(false);
          await signOut();
          router.replace('/');
        },
      },
    ]);
  }, [router, signOut]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProfileData(true);
  }, [loadProfileData]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable style={styles.settingsButton} hitSlop={12} onPress={() => setShowSettings(true)}>
            <Feather name="settings" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {displayUser?.avatarUrl ? (
              <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Feather name="user" size={48} color={colors.textTertiary} />
              </View>
            )}
            <View style={styles.avatarEditBtn}>
              <Feather name="edit-2" size={11} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.displayName}>{displayUser?.displayName ?? 'User'}</Text>
          <Text style={styles.email}>{displayUser?.email ?? ''}</Text>

          <Pressable style={styles.changeBtn} onPress={() => router.push('/edit-profile' as never)}>
            <Text style={styles.changeBtnText}>Change</Text>
          </Pressable>
        </View>

        {!isOrganizer && !isAdmin ? (
          <>
            <View style={styles.statsRow}>
              <Pressable style={styles.statCard} onPress={() => setShowFollowingModal(true)}>
                <Text style={styles.statNumber}>{followingOrganizers.length}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  FOLLOWING
                </Text>
              </Pressable>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{rsvpEvents.length}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  EVENTS
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{likedEvents.length}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  SAVED
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel} numberOfLines={1}>
                  REVIEWS
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <Pressable onPress={() => router.push('/edit-preferences' as never)}>
                  <Text style={styles.editLink}>Edit Preferences</Text>
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {(displayUser?.preferences ?? []).length > 0 ? (
                  displayUser!.preferences.map((pref) => (
                    <View key={pref} style={styles.chip}>
                      <Text style={styles.chipText}>{pref}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No interests selected yet</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tab, activeEventTab === 'myevents' && styles.tabActive]}
                  onPress={() => setActiveEventTab('myevents')}
                >
                  <Text style={[styles.tabText, activeEventTab === 'myevents' && styles.tabTextActive]}>
                    My Events
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeEventTab === 'saved' && styles.tabActive]}
                  onPress={() => setActiveEventTab('saved')}
                >
                  <Text style={[styles.tabText, activeEventTab === 'saved' && styles.tabTextActive]}>
                    Saved
                  </Text>
                </Pressable>
              </View>

              <View style={styles.eventList}>
                {visibleEvents.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather
                      name={activeEventTab === 'myevents' ? 'calendar' : 'bookmark'}
                      size={32}
                      color={colors.textPlaceholder}
                    />
                    <Text style={styles.emptyText}>
                      {activeEventTab === 'myevents'
                        ? 'No events yet'
                        : 'No saved events yet'}
                    </Text>
                  </View>
                ) : (
                  visibleEvents.map((event) => (
                    <EventMiniCard
                      key={event.id}
                      event={event}
                      isRsvped={event.isRsvped}
                      onPress={() => router.push(`/event/${event.id}`)}
                    />
                  ))
                )}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomTabBar activeTab="profile" onTabPress={handleTabPress} />

      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.settingsOverlay}>
          <Pressable style={styles.settingsBackdrop} onPress={() => setShowSettings(false)} />
          <View style={[styles.settingsSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Pressable onPress={() => setShowSettings(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            {!isOrganizer && !isAdmin ? (
              <>
                <Pressable
                  style={styles.settingsItem}
                  onPress={() => {
                    setShowSettings(false);
                    router.push('/edit-profile' as never);
                  }}
                >
                  <View style={styles.settingsItemLeft}>
                    <Feather name="user" size={17} color={colors.textPrimary} />
                    <Text style={styles.settingsItemText}>Edit profile</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                </Pressable>

                <Pressable
                  style={styles.settingsItem}
                  onPress={() => {
                    setShowSettings(false);
                    router.push('/edit-preferences' as never);
                  }}
                >
                  <View style={styles.settingsItemLeft}>
                    <Feather name="sliders" size={17} color={colors.textPrimary} />
                    <Text style={styles.settingsItemText}>Interests & preferences</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                </Pressable>
              </>
            ) : null}

            <Pressable
              style={styles.settingsItem}
              onPress={() => {
                setShowSettings(false);
                router.push('/notifications' as never);
              }}
            >
              <View style={styles.settingsItemLeft}>
                <Feather name="bell" size={17} color={colors.textPrimary} />
                <Text style={styles.settingsItemText}>Notifications</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </Pressable>

            <Pressable style={[styles.settingsItem, styles.settingsLogout]} onPress={handleSignOut}>
              <View style={styles.settingsItemLeft}>
                <Feather name="log-out" size={17} color={colors.danger} />
                <Text style={styles.settingsLogoutText}>Logout</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showFollowingModal} transparent animationType="slide" onRequestClose={() => setShowFollowingModal(false)}>
        <View style={styles.settingsOverlay}>
          <Pressable style={styles.settingsBackdrop} onPress={() => setShowFollowingModal(false)} />
          <View style={[styles.settingsSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Following Organizers</Text>
              <Pressable onPress={() => setShowFollowingModal(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {followingOrganizers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="users" size={28} color={colors.textPlaceholder} />
                  <Text style={styles.emptyText}>You are not following any organizer yet.</Text>
                </View>
              ) : (
                followingOrganizers.map((organizer) => (
                  <Pressable
                    key={organizer.id}
                    style={styles.organizerRow}
                    onPress={() => {
                      setShowFollowingModal(false);
                      router.push(`/organizer/${organizer.id}`);
                    }}
                  >
                    <View style={styles.organizerLeft}>
                      {organizer.avatarUrl ? (
                        <Image source={{ uri: organizer.avatarUrl }} style={styles.organizerAvatar} />
                      ) : (
                        <View style={[styles.organizerAvatar, styles.organizerAvatarPlaceholder]}>
                          <Text style={styles.organizerAvatarText}>
                            {organizer.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.organizerName} numberOfLines={1}>
                        {organizer.displayName}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EventMiniCard({
  event,
  isRsvped,
  onPress,
}: {
  event: ApiEvent & { isRsvped: boolean; isLiked: boolean };
  isRsvped: boolean;
  onPress: () => void;
}) {
  const imageUrl = event.images?.[0];
  const dateStr = event.startAt
    ? new Date(event.startAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const venue = event.location?.address ?? event.location?.city ?? '';
  const subtitle = [dateStr, venue].filter(Boolean).join(' • ');

  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <View style={styles.eventImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.eventImage} contentFit="cover" />
        ) : (
          <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
            <Feather name="image" size={24} color={colors.textPlaceholder} />
          </View>
        )}
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventSubtitle} numberOfLines={1}>{subtitle}</Text>
        <View style={styles.eventBadgeRow}>
          <Feather name="check-square" size={10} color={colors.primary} />
          <Text style={styles.eventBadgeText}>
            {isRsvped ? 'Confirmed' : 'Saved'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  headerSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.sm,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  displayName: {
    fontSize: 30,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.75,
    textAlign: 'center',
  },
  email: {
    fontSize: typography.body,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  changeBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingHorizontal: 25,
    paddingVertical: 7,
  },
  changeBtnText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: typography.title,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: 'rgba(67,70,84,0.7)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  editLink: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.chipBg,
    borderRadius: 9999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,214,0.1)',
    marginBottom: spacing.xl,
  },
  tab: {
    paddingBottom: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: 'rgba(67,70,84,0.6)',
  },
  tabTextActive: {
    color: colors.primary,
  },

  // Event list
  eventList: {
    gap: spacing.lg,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.lg,
  },
  eventImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  eventImage: {
    width: 80,
    height: 80,
  },
  eventImagePlaceholder: {
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  eventInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  eventSubtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventBadgeText: {
    fontSize: typography.badge,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
    lineHeight: 17,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  settingsBackdrop: {
    flex: 1,
  },
  settingsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  settingsTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsItemText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  settingsLogout: {
    borderColor: 'rgba(220, 53, 69, 0.25)',
    marginTop: spacing.sm,
  },
  settingsLogoutText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  organizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  organizerAvatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: fontWeights.bold,
  },
  organizerName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
});
