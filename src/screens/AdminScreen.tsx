import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabBar } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import {
  broadcastAdminNotification,
  getAdminUsers,
  getPendingEvents,
  updateAdminUser,
  updateEventStatus,
} from '@/services';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { AdminUserRole, ApiEvent, AuthUser } from '@/types';

type AdminTab = 'moderation' | 'users' | 'broadcast';
type AdminBottomTab = 'admin-moderation' | 'admin-users' | 'admin-broadcast';

interface AdminScreenProps {
  initialTab?: AdminTab;
  hideSegmentControl?: boolean;
}

const USER_ROLE_OPTIONS: AdminUserRole[] = ['user', 'organizer', 'admin'];

export function AdminScreen({ initialTab = 'moderation', hideSegmentControl = false }: AdminScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [pendingEvents, setPendingEvents] = useState<ApiEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsRefreshing, setEventsRefreshing] = useState(false);
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [eventMutatingId, setEventMutatingId] = useState('');

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | AdminUserRole>('all');
  const [userMutatingId, setUserMutatingId] = useState('');

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastEventId, setBroadcastEventId] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastRefreshing, setBroadcastRefreshing] = useState(false);

  const loadPendingEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await getPendingEvents({ page: 1, limit: 50 });
      setPendingEvents(response.items);
    } catch (error) {
      Alert.alert('Cannot load pending events', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setEventsLoading(false);
      setEventsRefreshing(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await getAdminUsers({
        page: 1,
        limit: 50,
        search: userSearch.trim() || undefined,
        role: selectedRoleFilter === 'all' ? undefined : selectedRoleFilter,
      });
      setUsers(response.items);
    } catch (error) {
      Alert.alert('Cannot load users', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setUsersLoading(false);
    }
  }, [selectedRoleFilter, userSearch]);

  useEffect(() => {
    loadPendingEvents();
    loadUsers();
  }, [loadPendingEvents, loadUsers]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const moderateEvent = useCallback(async (eventId: string, status: 'approved' | 'rejected' | 'hidden') => {
    setEventMutatingId(eventId);
    try {
      await updateEventStatus(eventId, {
        status,
        moderationNote: moderationNotes[eventId]?.trim() || undefined,
      });
      setPendingEvents((prev) => prev.filter((item) => item.id !== eventId));
      Alert.alert('Updated', `Event is now ${status}.`);
    } catch (error) {
      Alert.alert('Cannot update event', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setEventMutatingId('');
    }
  }, [moderationNotes]);

  const mutateUser = useCallback(async (userId: string, payload: { role?: AdminUserRole; isBlocked?: boolean }) => {
    if (userId === authUser?.id) return;
    setUserMutatingId(userId);
    try {
      const updated = await updateAdminUser({ userId, ...payload });
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      Alert.alert('Cannot update user', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setUserMutatingId('');
    }
  }, [authUser?.id]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      Alert.alert('Missing required fields', 'Please fill title and message body.');
      return;
    }
    setIsBroadcasting(true);
    try {
      const response = await broadcastAdminNotification({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        eventId: broadcastEventId.trim() || undefined,
      });
      Alert.alert('Broadcast sent', `${response.message} (${response.totalSent} users)`);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastEventId('');
    } catch (error) {
      Alert.alert('Broadcast failed', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setIsBroadcasting(false);
    }
  }, [broadcastBody, broadcastEventId, broadcastTitle]);

  const refreshBroadcastForm = useCallback(() => {
    setBroadcastRefreshing(true);
    setBroadcastTitle('');
    setBroadcastBody('');
    setBroadcastEventId('');
    setTimeout(() => setBroadcastRefreshing(false), 450);
  }, []);

  const handleBottomTab = useCallback((tab: string) => {
    if (tab === 'admin-moderation') router.navigate('/admin-moderation' as never);
    else if (tab === 'admin-users') router.navigate('/admin-users' as never);
    else if (tab === 'admin-broadcast') router.navigate('/admin-broadcast' as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
  }, [router]);

  const activeBottomTab: AdminBottomTab = useMemo(() => {
    if (activeTab === 'users') return 'admin-users';
    if (activeTab === 'broadcast') return 'admin-broadcast';
    return 'admin-moderation';
  }, [activeTab]);

  const visibleUsers = useMemo(() => {
    if (!authUser?.id) return users;
    return users.filter((item) => item.id !== authUser.id);
  }, [authUser?.id, users]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>Admin Console</Text>
        <Text style={styles.headerSubtitle}>Moderate events, manage users, and send announcements</Text>
      </View>

      {!hideSegmentControl ? (
        <View style={styles.segmentWrap}>
          <Pressable style={[styles.segmentBtn, activeTab === 'moderation' && styles.segmentBtnActive]} onPress={() => setActiveTab('moderation')}>
            <Text style={[styles.segmentText, activeTab === 'moderation' && styles.segmentTextActive]}>Moderation</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, activeTab === 'users' && styles.segmentBtnActive]} onPress={() => setActiveTab('users')}>
            <Text style={[styles.segmentText, activeTab === 'users' && styles.segmentTextActive]}>Users</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, activeTab === 'broadcast' && styles.segmentBtnActive]} onPress={() => setActiveTab('broadcast')}>
            <Text style={[styles.segmentText, activeTab === 'broadcast' && styles.segmentTextActive]}>Broadcast</Text>
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'moderation' ? (
        <FlatList
          data={pendingEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          refreshControl={
            <RefreshControl
              refreshing={eventsRefreshing}
              onRefresh={() => {
                setEventsRefreshing(true);
                loadPendingEvents();
              }}
              tintColor={colors.primary}
              colors={[colors.primary, colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            eventsLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="shield" size={34} color={colors.textPlaceholder} />
                <Text style={styles.emptyTitle}>No pending events</Text>
                <Text style={styles.emptySubtext}>New submitted events will appear here for moderation.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{item.category}</Text>
              <Text style={styles.cardMeta} numberOfLines={2}>
                {item.location.address}{item.location.city ? `, ${item.location.city}` : ''}
              </Text>
              <TextInput
                style={styles.input}
                value={moderationNotes[item.id] ?? ''}
                onChangeText={(value) => setModerationNotes((prev) => ({ ...prev, [item.id]: value }))}
                placeholder="Moderation note (optional)"
                placeholderTextColor={colors.textPlaceholder}
              />
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, styles.actionApprove]}
                  onPress={() => moderateEvent(item.id, 'approved')}
                  disabled={eventMutatingId === item.id}
                >
                  <Text style={styles.actionBtnText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionReject]}
                  onPress={() => moderateEvent(item.id, 'rejected')}
                  disabled={eventMutatingId === item.id}
                >
                  <Text style={styles.actionBtnText}>Reject</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionHide]}
                  onPress={() => moderateEvent(item.id, 'hidden')}
                  disabled={eventMutatingId === item.id}
                >
                  <Text style={styles.actionBtnText}>Hide</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : null}

      {activeTab === 'users' ? (
        <View style={styles.usersWrap}>
          <View style={styles.filterCard}>
            <TextInput
              style={[styles.input, { marginBottom: spacing.sm }]}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Search by name/email"
              placeholderTextColor={colors.textPlaceholder}
            />
            <View style={styles.roleFilterRow}>
              {(['all', ...USER_ROLE_OPTIONS] as const).map((role) => {
                const selected = selectedRoleFilter === role;
                return (
                  <Pressable
                    key={role}
                    style={[styles.roleChip, selected && styles.roleChipActive]}
                    onPress={() => setSelectedRoleFilter(role)}
                  >
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextActive]}>{role}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.reloadButton} onPress={loadUsers}>
              <Text style={styles.reloadButtonText}>Apply filter</Text>
            </Pressable>
          </View>

          <FlatList
            data={visibleUsers}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            refreshControl={
              <RefreshControl
                refreshing={usersLoading}
                onRefresh={loadUsers}
                tintColor={colors.primary}
                colors={[colors.primary, colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            }
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
            ListEmptyComponent={
              usersLoading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="users" size={34} color={colors.textPlaceholder} />
                  <Text style={styles.emptyTitle}>No users found</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.displayName || item.email}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>{item.email}</Text>
                <Text style={styles.cardMeta}>Role: {item.role} • {item.isBlocked ? 'Blocked' : 'Active'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineRow}>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <Pressable
                      key={role}
                      style={[styles.inlineBtn, item.role === role && styles.inlineBtnActive]}
                      onPress={() => mutateUser(item.id, { role })}
                      disabled={userMutatingId === item.id}
                    >
                      <Text style={[styles.inlineBtnText, item.role === role && styles.inlineBtnTextActive]}>
                        {role}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={[styles.inlineBtn, item.isBlocked && styles.blockedBtn]}
                    onPress={() => mutateUser(item.id, { isBlocked: !item.isBlocked })}
                    disabled={userMutatingId === item.id}
                  >
                    <Text style={[styles.inlineBtnText, item.isBlocked && styles.blockedBtnText]}>
                      {item.isBlocked ? 'Unblock' : 'Block'}
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}
          />
        </View>
      ) : null}

      {activeTab === 'broadcast' ? (
        <ScrollView
          contentContainerStyle={[styles.broadcastWrap, { paddingBottom: insets.bottom + 110 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          refreshControl={
            <RefreshControl
              refreshing={broadcastRefreshing}
              onRefresh={refreshBroadcastForm}
              tintColor={colors.primary}
              colors={[colors.primary, colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          <View style={styles.card}>
            <Text style={styles.label}>Broadcast title</Text>
            <TextInput
              style={styles.input}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder="System maintenance notice"
              placeholderTextColor={colors.textPlaceholder}
            />
            <Text style={styles.label}>Message body</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={broadcastBody}
              onChangeText={setBroadcastBody}
              placeholder="Provide concise update for end users."
              placeholderTextColor={colors.textPlaceholder}
              multiline
            />
            <Text style={styles.label}>Target event ID (optional)</Text>
            <TextInput
              style={styles.input}
              value={broadcastEventId}
              onChangeText={setBroadcastEventId}
              placeholder="Leave empty to broadcast all users"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="none"
            />
            <Pressable style={styles.primaryButton} onPress={sendBroadcast} disabled={isBroadcasting}>
              <Feather name="send" size={14} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{isBroadcasting ? 'Sending...' : 'Send broadcast'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      <BottomTabBar activeTab={activeBottomTab} onTabPress={handleBottomTab} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  headerSubtitle: { fontSize: typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs },
  segmentWrap: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.primaryDark },
  segmentText: { fontSize: typography.bodySmall, fontWeight: fontWeights.semibold, color: colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  usersWrap: { flex: 1, paddingHorizontal: spacing.xl },
  filterCard: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  roleFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  roleChipText: { color: colors.textSecondary, fontSize: typography.caption, fontWeight: fontWeights.medium },
  roleChipTextActive: { color: colors.primary, fontWeight: fontWeights.semibold },
  reloadButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  reloadButtonText: { color: '#FFFFFF', fontSize: typography.caption, fontWeight: fontWeights.semibold },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { fontSize: typography.body, fontWeight: fontWeights.semibold, color: colors.textPrimary },
  cardMeta: { fontSize: typography.caption, color: colors.textTertiary, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    color: colors.textPrimary,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionApprove: { backgroundColor: `${colors.primary}18` },
  actionReject: { backgroundColor: 'rgba(225,77,77,0.12)' },
  actionHide: { backgroundColor: colors.surfaceSecondary },
  actionBtnText: { color: colors.textPrimary, fontWeight: fontWeights.semibold, fontSize: typography.caption },
  inlineRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingRight: spacing.lg },
  inlineBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  inlineBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  inlineBtnText: { color: colors.textSecondary, fontWeight: fontWeights.semibold, fontSize: typography.caption },
  inlineBtnTextActive: { color: colors.primary },
  blockedBtn: { borderColor: 'rgba(225,77,77,0.3)', backgroundColor: 'rgba(225,77,77,0.1)' },
  blockedBtnText: { color: colors.danger },
  centered: { paddingTop: 80, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: spacing.sm },
  emptyTitle: { fontSize: typography.heading, fontWeight: fontWeights.bold, color: colors.textPrimary },
  emptySubtext: { fontSize: typography.bodySmall, color: colors.textTertiary, textAlign: 'center' },
  broadcastWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  label: { fontSize: typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: fontWeights.semibold, fontSize: typography.bodySmall },
});
