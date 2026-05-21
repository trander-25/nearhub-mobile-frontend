import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
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
import { useAuth } from '@/contexts/AuthContext';
import { getMyEvents } from '@/services/userService';
import { cancelRsvp } from '@/services/eventService';
import type { ApiEvent } from '@/types/event.types';
import { colors, fontWeights, spacing, typography } from '@/theme';
import { isOrganizerRole } from '@/utils/role';

type RsvpEvent = ApiEvent & { isRsvped: boolean; isLiked: boolean };
type EventsByDateMap = Record<string, RsvpEvent[]>;

export function MyEventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const [events, setEvents] = useState<RsvpEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [showDateEventsModal, setShowDateEventsModal] = useState(false);

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
    if (tab === 'explore') router.navigate('/' as never);
    else if (tab === 'for-you') router.navigate('/?tab=for-you' as never);
    else if (tab === 'saved') router.navigate('/saved' as never);
    else if (tab === 'scan-qr') router.navigate('/scan-qr' as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
    else if (tab === 'myevents' && isAuthenticated && isOrganizerRole(user?.role)) router.navigate('/organizer-overview' as never);
  }, [isAuthenticated, router, user?.role]);

  const nowTs = Date.now();
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  const eventsByDate = sortedEvents.reduce<EventsByDateMap>((acc, event) => {
    const dateKey = toDateKey(new Date(event.startAt));
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});
  const selectedDateEvents = eventsByDate[selectedDateKey] ?? [];
  const upcomingEvents = sortedEvents.filter((event) => new Date(event.startAt).getTime() >= nowTs);
  const calendarDays = buildCalendarDays(calendarMonthDate);
  const monthTitle = calendarMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const selectedDateLabel = new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

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
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
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
          <Text style={styles.metaText}>
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
      </View>

      <FlatList
        data={upcomingEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    setCalendarMonthDate(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                    )
                  }
                >
                  <Feather name="chevron-left" size={18} color={colors.textPrimary} />
                </Pressable>
                <Text style={styles.calendarMonthText}>{monthTitle}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    setCalendarMonthDate(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                    )
                  }
                >
                  <Feather name="chevron-right" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.calendarWeekDaysRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.calendarWeekDayText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => {
                  const hasEvents = Boolean(eventsByDate[day.dateKey]?.length);
                  const isSelected = day.dateKey === selectedDateKey;
                  return (
                    <Pressable
                      key={`${day.dateKey}-${day.isCurrentMonth ? 'current' : 'other'}`}
                      style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected]}
                      onPress={() => {
                        setSelectedDateKey(day.dateKey);
                        setShowDateEventsModal(true);
                        if (!day.isCurrentMonth) {
                          setCalendarMonthDate(new Date(day.year, day.month, 1));
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          !day.isCurrentMonth && styles.calendarDayTextOutsideMonth,
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {day.day}
                      </Text>
                      {hasEvents ? (
                        <View style={[styles.calendarDayDot, isSelected && styles.calendarDayDotSelected]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.upcomingHeader}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
            </View>
          </View>
        }
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
                Join events from the Explore tab and they&apos;ll show up here
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

      <Modal
        visible={showDateEventsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateEventsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDateEventsModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>
              <Pressable onPress={() => setShowDateEventsModal(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDateEvents.length === 0 ? (
                <Text style={styles.selectedDateEmptyText}>No events on this day</Text>
              ) : (
                selectedDateEvents.map((item) => (
                  <View key={`selected-${item.id}`} style={styles.selectedItemRow}>
                    <Pressable
                      style={styles.selectedItemContent}
                      onPress={() => {
                        setShowDateEventsModal(false);
                        router.push(`/event/${item.id}`);
                      }}
                    >
                      <Text style={styles.selectedItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.selectedItemMeta} numberOfLines={1}>
                        {new Date(item.startAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {item.location?.city ? ` • ${item.location.city}` : ''}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => handleCancelRsvp(item.id)}
                      hitSlop={8}
                    >
                      <Feather name="x" size={16} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
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
  headerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  centered: {
    paddingTop: 80,
    alignItems: 'center',
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarMonthText: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  calendarWeekDaysRow: {
    flexDirection: 'row',
  },
  calendarWeekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.caption,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  calendarDayCell: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 10,
    minHeight: 38,
    gap: 2,
  },
  calendarDayCellSelected: {
    backgroundColor: colors.primary,
  },
  calendarDayText: {
    fontSize: typography.caption,
    color: colors.textPrimary,
    fontWeight: fontWeights.medium,
  },
  calendarDayTextOutsideMonth: {
    color: colors.textPlaceholder,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },
  calendarDayDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  calendarDayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  selectedDateEmptyText: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  selectedItemContent: {
    flex: 1,
    gap: 2,
  },
  selectedItemTitle: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  selectedItemMeta: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  upcomingHeader: {
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    alignItems: 'flex-start',
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
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
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
    backgroundColor: colors.primaryWash,
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
    flexShrink: 1,
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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: {
    year: number;
    month: number;
    day: number;
    dateKey: string;
    isCurrentMonth: boolean;
  }[] = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    days.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day,
      dateKey: toDateKey(date),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    days.push({
      year,
      month,
      day,
      dateKey: toDateKey(date),
      isCurrentMonth: true,
    });
  }

  while (days.length % 7 !== 0 || days.length < 42) {
    const day = days.length - (startWeekday + daysInMonth) + 1;
    const date = new Date(year, month + 1, day);
    days.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day,
      dateKey: toDateKey(date),
      isCurrentMonth: false,
    });
  }

  return days;
}
