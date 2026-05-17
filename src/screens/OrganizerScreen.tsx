import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { City, Country } from 'country-state-city';

import { BottomTabBar, OpenStreetMapPicker } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import {
  createOrganizerEvent,
  deleteOrganizerEvent,
  getOrganizerEventAttendees,
  getOrganizerEvents,
  getOrganizerStats,
  updateOrganizerEvent,
} from '@/services';
import { getCategories } from '@/services/eventService';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { ApiEvent, CategoryItem, EventInputPayload, OrganizerAttendee, OrganizerStats } from '@/types';

type OrganizerTab = 'overview' | 'manage';
type FormMode = 'create' | 'update';
type OrganizerBottomTab = 'organizer-overview' | 'organizer-manage';
type DateField = 'startAt' | 'endAt';
type DateMode = 'date' | 'time';
const LOCATION_QUERY_MIN_LENGTH = 2;
const LOCATION_RESULT_LIMIT = 8;

function parseIsoDate(input?: string): Date | null {
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(input?: string): string {
  const parsed = parseIsoDate(input);
  if (!parsed) return 'Select date';
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(input?: string): string {
  const parsed = parseIsoDate(input);
  if (!parsed) return 'Select time';
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const defaultForm: EventInputPayload = {
  title: '',
  description: '',
  category: '',
  lat: 10.7769,
  lng: 106.7009,
  address: '',
  city: '',
  startAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endAt: '',
  images: [],
};

interface OrganizerScreenProps {
  initialTab?: OrganizerTab;
  hideSegmentControl?: boolean;
}

export function OrganizerScreen({
  initialTab = 'overview',
  hideSegmentControl = false,
}: OrganizerScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<OrganizerTab>(initialTab);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRefreshing, setStatsRefreshing] = useState(false);

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const [eventSearchInput, setEventSearchInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editEventId, setEditEventId] = useState('');
  const [formData, setFormData] = useState<EventInputPayload>(defaultForm);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCoordinate, setMapCoordinate] = useState({ latitude: defaultForm.lat, longitude: defaultForm.lng });
  const [isLocatingOnMap, setIsLocatingOnMap] = useState(false);
  const [countryInput, setCountryInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [selectedCountryIso, setSelectedCountryIso] = useState('');
  const [activeLocationField, setActiveLocationField] = useState<'country' | 'city' | null>(null);
  const [debouncedCountryQuery, setDebouncedCountryQuery] = useState('');
  const [debouncedCityQuery, setDebouncedCityQuery] = useState('');
  const [pickerField, setPickerField] = useState<DateField | null>(null);
  const [pickerMode, setPickerMode] = useState<DateMode>('date');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const [attendeesEventTitle, setAttendeesEventTitle] = useState('');
  const [attendees, setAttendees] = useState<OrganizerAttendee[]>([]);
  const [showAttendees, setShowAttendees] = useState(false);

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citySource = useMemo(() => {
    if (!selectedCountryIso) return [];
    return City.getCitiesOfCountry(selectedCountryIso) ?? [];
  }, [selectedCountryIso]);

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setStatsLoading(true);
    try {
      const response = await getOrganizerStats();
      setStats(response);
    } catch (error) {
      if (!silent) {
        Alert.alert('Cannot load stats', error instanceof Error ? error.message : 'Please try again later.');
      }
    } finally {
      setStatsLoading(false);
      setStatsRefreshing(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      const mapped = response.map((item: CategoryItem) => item.category);
      setCategories(mapped);
      setFormData((prev) => ({ ...prev, category: prev.category || mapped[0] || '' }));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await getOrganizerEvents();
      setEvents(response);
    } catch (error) {
      Alert.alert('Cannot load events', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadCategories();
    loadEvents();
  }, [loadCategories, loadEvents, loadStats]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCountryQuery(countryInput.trim().toLowerCase()), 220);
    return () => clearTimeout(id);
  }, [countryInput]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCityQuery(cityInput.trim().toLowerCase()), 220);
    return () => clearTimeout(id);
  }, [cityInput]);

  const filteredCountryOptions = useMemo(
    () => {
      if (debouncedCountryQuery.length < LOCATION_QUERY_MIN_LENGTH) return [];
      const startsWith: typeof allCountries = [];
      const contains: typeof allCountries = [];
      for (const item of allCountries) {
        const lower = item.name.toLowerCase();
        if (lower.startsWith(debouncedCountryQuery)) {
          startsWith.push(item);
          if (startsWith.length >= LOCATION_RESULT_LIMIT) break;
          continue;
        }
        if (lower.includes(debouncedCountryQuery)) {
          contains.push(item);
        }
      }
      return [...startsWith, ...contains].slice(0, LOCATION_RESULT_LIMIT);
    },
    [allCountries, debouncedCountryQuery],
  );

  const filteredCityOptions = useMemo(
    () => {
      if (!selectedCountryIso || debouncedCityQuery.length < LOCATION_QUERY_MIN_LENGTH) return [];
      const startsWith: typeof citySource = [];
      const contains: typeof citySource = [];
      for (const item of citySource) {
        const lower = item.name.toLowerCase();
        if (lower.startsWith(debouncedCityQuery)) {
          startsWith.push(item);
          if (startsWith.length >= LOCATION_RESULT_LIMIT) break;
          continue;
        }
        if (lower.includes(debouncedCityQuery)) {
          contains.push(item);
        }
      }
      return [...startsWith, ...contains].slice(0, LOCATION_RESULT_LIMIT);
    },
    [citySource, debouncedCityQuery, selectedCountryIso],
  );

  const resolveSelectedEvent = useCallback(() => {
    const query = eventSearchInput.trim().toLowerCase();
    if (!query) return undefined;
    return events.find((item) => item.title.trim().toLowerCase() === query)
      ?? events.find((item) => item.title.toLowerCase().includes(query));
  }, [eventSearchInput, events]);

  const upsertEvent = useCallback((event: ApiEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((item) => item.id === event.id);
      if (idx === -1) return [event, ...prev];
      const clone = [...prev];
      clone[idx] = event;
      return clone;
    });
  }, []);

  const openCreateForm = useCallback(() => {
    setFormMode('create');
    setEditEventId('');
    setFormData((prev) => ({
      ...defaultForm,
      category: prev.category || categories[0] || '',
    }));
    setMapCoordinate({ latitude: defaultForm.lat, longitude: defaultForm.lng });
    setCountryInput('');
    setCityInput('');
    setSelectedCountryIso('');
    setShowEventForm(true);
  }, [categories]);

  const openEditForm = useCallback((event?: ApiEvent) => {
    const selected = event ?? resolveSelectedEvent();
    if (!selected) {
      Alert.alert('Event not found', 'Search event title and select an event from the list to edit.');
      return;
    }
    setFormMode('update');
    setEditEventId(selected.id);
    setFormData({
      title: selected.title,
      description: selected.description ?? '',
      category: selected.category,
      lat: selected.location.lat,
      lng: selected.location.lng,
      address: selected.location.address,
      city: selected.location.city ?? '',
      startAt: selected.startAt,
      endAt: selected.endAt ?? '',
      images: selected.images ?? [],
    });
    setMapCoordinate({ latitude: selected.location.lat, longitude: selected.location.lng });
    setCountryInput('');
    setCityInput(selected.location.city ?? '');
    setSelectedCountryIso('');
    setShowEventForm(true);
  }, [resolveSelectedEvent]);

  const openDateTimePicker = useCallback((field: DateField, mode: DateMode) => {
    setPickerField(field);
    setPickerMode(mode);
    setIsDatePickerVisible(true);
  }, []);

  const handleDateTimeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setIsDatePickerVisible(false);
      return;
    }
    if (!pickerField || !selectedDate) return;
    setFormData((prev) => {
      const baseDate = parseIsoDate(prev[pickerField]) ?? new Date();
      const nextDate = new Date(baseDate);
      if (pickerMode === 'date') {
        nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else {
        nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      }
      return { ...prev, [pickerField]: nextDate.toISOString() };
    });
    if (Platform.OS === 'android') {
      setIsDatePickerVisible(false);
    }
  }, [pickerField, pickerMode]);

  const applyMapCoordinate = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      lat: Number(mapCoordinate.latitude.toFixed(6)),
      lng: Number(mapCoordinate.longitude.toFixed(6)),
    }));
    setShowMapPicker(false);
  }, [mapCoordinate.latitude, mapCoordinate.longitude]);

  const locateCurrentPositionForMap = useCallback(async () => {
    if (isLocatingOnMap) return;
    setIsLocatingOnMap(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission required', 'Please allow location access to use your current position.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setMapCoordinate({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Cannot get location', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsLocatingOnMap(false);
    }
  }, [isLocatingOnMap]);

  const submitEvent = useCallback(async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.address.trim() || !formData.category || !formData.city?.trim()) {
      Alert.alert('Missing required fields', 'Please fill title, description, category, city and address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPayload: EventInputPayload = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        city: formData.city?.trim() || undefined,
        startAt: formData.startAt.trim(),
        endAt: formData.endAt?.trim() || undefined,
        images: formData.images?.filter(Boolean),
      };

      let response: ApiEvent;
      if (formMode === 'create') {
        response = await createOrganizerEvent(normalizedPayload);
      } else {
        const original = events.find((item) => item.id === editEventId);
        if (!original) {
          throw new Error('Event not found. Please reopen edit form and try again.');
        }

        const updatePayload: Partial<EventInputPayload> = {};

        if (normalizedPayload.title !== original.title) updatePayload.title = normalizedPayload.title;
        if (normalizedPayload.description !== (original.description ?? '')) updatePayload.description = normalizedPayload.description;
        if (normalizedPayload.category !== original.category) updatePayload.category = normalizedPayload.category;
        if (Math.abs(normalizedPayload.lat - original.location.lat) > 1e-9) updatePayload.lat = normalizedPayload.lat;
        if (Math.abs(normalizedPayload.lng - original.location.lng) > 1e-9) updatePayload.lng = normalizedPayload.lng;
        if (normalizedPayload.address !== original.location.address) updatePayload.address = normalizedPayload.address;
        if ((normalizedPayload.city ?? '') !== (original.location.city ?? '')) updatePayload.city = normalizedPayload.city;
        if (normalizedPayload.startAt !== original.startAt) updatePayload.startAt = normalizedPayload.startAt;
        if ((normalizedPayload.endAt ?? '') !== (original.endAt ?? '')) {
          updatePayload.endAt = normalizedPayload.endAt || undefined;
        }

        const nextImages = normalizedPayload.images ?? [];
        const prevImages = original.images ?? [];
        if (JSON.stringify(nextImages) !== JSON.stringify(prevImages)) {
          updatePayload.images = nextImages;
        }

        if (Object.keys(updatePayload).length === 0) {
          Alert.alert('No changes', 'Update at least one field before submitting.');
          return;
        }

        response = await updateOrganizerEvent(editEventId, updatePayload);
      }

      upsertEvent(response);
      setEventSearchInput(response.title);
      setShowEventForm(false);
      loadEvents();
      loadStats(true);
      Alert.alert('Success', formMode === 'create' ? 'Event created successfully.' : 'Event updated successfully.');
    } catch (error) {
      Alert.alert('Action failed', error instanceof Error ? error.message : 'Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  }, [editEventId, events, formData, formMode, loadEvents, loadStats, upsertEvent]);

  const deleteEvent = useCallback((event?: ApiEvent) => {
    const targetEvent = event ?? resolveSelectedEvent();
    if (!targetEvent) {
      Alert.alert('Missing event', 'Search event title or choose from your managed events.');
      return;
    }

    Alert.alert('Delete event', `Delete event "${targetEvent.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrganizerEvent(targetEvent.id);
            setEvents((prev) => prev.filter((item) => item.id !== targetEvent.id));
            if (attendeesEventTitle === targetEvent.title) {
              setAttendees([]);
              setAttendeesEventTitle('');
            }
            loadEvents();
            loadStats(true);
            Alert.alert('Deleted', 'Event deleted successfully.');
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again later.');
          }
        },
      },
    ]);
  }, [attendeesEventTitle, loadEvents, loadStats, resolveSelectedEvent]);

  const loadAttendees = useCallback(async (event?: ApiEvent) => {
    const targetEvent = event ?? resolveSelectedEvent();
    if (!targetEvent) {
      Alert.alert('Missing event', 'Search event title first.');
      return;
    }

    try {
      const response = await getOrganizerEventAttendees(targetEvent.id);
      upsertEvent(response.event);
      setAttendees(response.attendees);
      setAttendeesEventTitle(response.event.title);
      setShowAttendees(true);
    } catch (error) {
      Alert.alert('Cannot load attendees', error instanceof Error ? error.message : 'Please try again later.');
    }
  }, [resolveSelectedEvent, upsertEvent]);

  const handleBottomTab = useCallback((tab: string) => {
    if (tab === 'organizer-overview') router.navigate('/organizer-overview' as never);
    else if (tab === 'organizer-manage') router.navigate('/organizer-manage' as never);
    else if (tab === 'organizer-notifications') router.navigate('/organizer-notifications' as never);
    else if (tab === 'profile') router.navigate('/profile' as never);
  }, [router]);

  const activeBottomTab: OrganizerBottomTab =
    activeTab === 'overview' ? 'organizer-overview' : 'organizer-manage';

  const statsCards = useMemo(() => [
    { label: 'Total Events', value: String(stats?.totalEvents ?? 0), icon: 'calendar' as const },
    { label: 'Total Views', value: String(stats?.totalViews ?? 0), icon: 'eye' as const },
    { label: 'RSVP', value: String(stats?.totalRsvps ?? 0), icon: 'users' as const },
    { label: 'Avg Rating', value: (stats?.averageRating ?? 0).toFixed(1), icon: 'star' as const },
  ], [stats]);

  const filteredEvents = useMemo(() => {
    const query = eventSearchInput.trim().toLowerCase();
    if (!query) return events;
    return events.filter((item) => item.title.toLowerCase().includes(query));
  }, [eventSearchInput, events]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>Organizer Hub</Text>
        <Text style={styles.headerSubtitle}>
          Manage your events{user?.displayName ? `, ${user.displayName}` : ''}
        </Text>
      </View>

      {!hideSegmentControl ? (
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'overview' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.segmentText, activeTab === 'overview' && styles.segmentTextActive]}>Overview</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'manage' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('manage')}
          >
            <Text style={[styles.segmentText, activeTab === 'manage' && styles.segmentTextActive]}>Manage Events</Text>
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'overview' ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={
            <RefreshControl refreshing={statsRefreshing} onRefresh={() => {
              setStatsRefreshing(true);
              loadStats(true);
            }}
              tintColor={colors.primary}
              colors={[colors.primary, colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {statsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              {statsCards.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <Feather name={item.icon} size={17} color={colors.primary} />
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.manageWrap}>
          <View style={styles.quickActions}>
            <Pressable style={styles.primaryButton} onPress={openCreateForm}>
              <Feather name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Create Event</Text>
            </Pressable>
          </View>

          <View style={styles.idBox}>
            <Text style={styles.label}>Search Event by Title</Text>
            <TextInput
              style={styles.input}
              value={eventSearchInput}
              onChangeText={setEventSearchInput}
              placeholder="Type event title to filter/manage"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="words"
            />
          </View>

          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
            refreshControl={
              <RefreshControl
                refreshing={eventsLoading}
                onRefresh={loadEvents}
                tintColor={colors.primary}
                colors={[colors.primary, colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="briefcase" size={34} color={colors.textPlaceholder} />
                <Text style={styles.emptyTitle}>No managed events yet</Text>
                <Text style={styles.emptySubtext}>
                  Pull to refresh after creating your first event.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.eventCard}>
                <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.eventMeta} numberOfLines={1}>{item.category}</Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {item.location.address}{item.location.city ? `, ${item.location.city}` : ''}
                </Text>
                <View style={styles.eventActionRow}>
                  <Pressable style={styles.itemAction} onPress={() => openEditForm(item)}>
                    <Text style={styles.itemActionText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.itemAction} onPress={() => loadAttendees(item)}>
                    <Text style={styles.itemActionText}>Attendees</Text>
                  </Pressable>
                  <Pressable style={styles.itemDanger} onPress={() => deleteEvent(item)}>
                    <Text style={styles.itemDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      )}

      <BottomTabBar activeTab={activeBottomTab} onTabPress={handleBottomTab} />

      <Modal visible={showEventForm} transparent animationType="slide" onRequestClose={() => setShowEventForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formMode === 'create' ? 'Create Event' : 'Update Event'}</Text>
              <Pressable onPress={() => setShowEventForm(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))} />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline value={formData.description} onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))} />
              <Text style={styles.label}>Category</Text>
              <Pressable style={styles.selectorInput} onPress={() => setShowCategoryModal(true)}>
                <Text style={[styles.selectorText, !formData.category && styles.selectorTextPlaceholder]}>
                  {formData.category || 'Select category'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.label}>Address</Text>
              <TextInput style={styles.input} value={formData.address} onChangeText={(v) => setFormData((p) => ({ ...p, address: v }))} />
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={countryInput}
                placeholder="Search country"
                placeholderTextColor={colors.textPlaceholder}
                onFocus={() => setActiveLocationField('country')}
                onBlur={() => setTimeout(() => setActiveLocationField((prev) => (prev === 'country' ? null : prev)), 120)}
                onChangeText={(value) => {
                  setCountryInput(value);
                  setSelectedCountryIso('');
                  setCityInput('');
                  setFormData((prev) => ({ ...prev, city: '' }));
                }}
              />
              {activeLocationField === 'country' && countryInput.trim().length >= LOCATION_QUERY_MIN_LENGTH && filteredCountryOptions.length > 0 && (
                <View style={styles.optionsBox}>
                  {filteredCountryOptions.map((item) => (
                    <Pressable
                      key={item.isoCode}
                      style={styles.optionItem}
                      onPress={() => {
                        setCountryInput(item.name);
                        setSelectedCountryIso(item.isoCode);
                        setCityInput('');
                        setFormData((prev) => ({ ...prev, city: '' }));
                        setActiveLocationField(null);
                      }}
                    >
                      <Text style={styles.optionText}>{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {activeLocationField === 'country' && countryInput.trim().length > 0 && countryInput.trim().length < LOCATION_QUERY_MIN_LENGTH ? (
                <Text style={styles.hintText}>Type at least 2 characters to search country.</Text>
              ) : null}
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={cityInput}
                placeholder={selectedCountryIso ? 'Search city' : 'Select country first'}
                placeholderTextColor={colors.textPlaceholder}
                editable={Boolean(selectedCountryIso)}
                onFocus={() => setActiveLocationField('city')}
                onBlur={() => {
                  setTimeout(() => setActiveLocationField((prev) => (prev === 'city' ? null : prev)), 120);
                  setFormData((prev) => ({ ...prev, city: cityInput.trim() }));
                }}
                onChangeText={(value) => {
                  setCityInput(value);
                }}
              />
              {activeLocationField === 'city' && cityInput.trim().length >= LOCATION_QUERY_MIN_LENGTH && filteredCityOptions.length > 0 && (
                <View style={styles.optionsBox}>
                  {filteredCityOptions.map((item) => (
                    <Pressable
                      key={`${item.countryCode}-${item.name}-${item.latitude}`}
                      style={styles.optionItem}
                      onPress={() => {
                        setCityInput(item.name);
                        setFormData((prev) => ({ ...prev, city: item.name }));
                        setActiveLocationField(null);
                      }}
                    >
                      <Text style={styles.optionText}>{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {activeLocationField === 'city' && cityInput.trim().length > 0 && cityInput.trim().length < LOCATION_QUERY_MIN_LENGTH ? (
                <Text style={styles.hintText}>Type at least 2 characters to search city.</Text>
              ) : null}
              <Text style={styles.label}>Coordinates</Text>
              <Pressable
                style={styles.selectorInput}
                onPress={() => {
                  setMapCoordinate({ latitude: formData.lat, longitude: formData.lng });
                  setShowMapPicker(true);
                }}
              >
                <View>
                  <Text style={styles.selectorText}>Select on map</Text>
                  <Text style={styles.selectorSubText}>{formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}</Text>
                </View>
                <Feather name="map-pin" size={16} color={colors.primary} />
              </Pressable>
              <Text style={styles.label}>Start date & time</Text>
              <View style={styles.dateRow}>
                <Pressable style={styles.dateButton} onPress={() => openDateTimePicker('startAt', 'date')}>
                  <Feather name="calendar" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{formatDateLabel(formData.startAt)}</Text>
                </Pressable>
                <Pressable style={styles.dateButton} onPress={() => openDateTimePicker('startAt', 'time')}>
                  <Feather name="clock" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{formatTimeLabel(formData.startAt)}</Text>
                </Pressable>
              </View>
              <Text style={styles.label}>End date & time (optional)</Text>
              <View style={styles.dateRow}>
                <Pressable style={styles.dateButton} onPress={() => openDateTimePicker('endAt', 'date')}>
                  <Feather name="calendar" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{formatDateLabel(formData.endAt)}</Text>
                </Pressable>
                <Pressable style={styles.dateButton} onPress={() => openDateTimePicker('endAt', 'time')}>
                  <Feather name="clock" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateButtonText}>{formatTimeLabel(formData.endAt)}</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.clearEndButton}
                onPress={() => setFormData((prev) => ({ ...prev, endAt: '' }))}
              >
                <Text style={styles.clearEndButtonText}>Clear end time</Text>
              </Pressable>
              <Text style={styles.label}>Image URLs (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={(formData.images || []).join(', ')}
                onChangeText={(v) => setFormData((p) => ({ ...p, images: v.split(',').map((s) => s.trim()).filter(Boolean) }))}
                autoCapitalize="none"
              />
              <Pressable style={[styles.primaryButton, styles.modalSubmit]} onPress={submitEvent} disabled={isSubmitting}>
                <Text style={styles.primaryButtonText}>{isSubmitting ? 'Submitting...' : 'Submit'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {isDatePickerVisible && pickerField ? (
        <DateTimePicker
          value={parseIsoDate(formData[pickerField]) ?? new Date()}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateTimeChange}
        />
      ) : null}

      <Modal visible={showCategoryModal} transparent animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.selectionSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select category</Text>
              <Pressable onPress={() => setShowCategoryModal(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.selectionItem}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, category: item }));
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.selectionItemText}>{item}</Text>
                  {formData.category === item ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showMapPicker} transparent animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick coordinates on map</Text>
              <Pressable onPress={() => setShowMapPicker(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Pressable
              style={[styles.ghostButton, styles.mapLocateButton, isLocatingOnMap && styles.disabledButton]}
              onPress={locateCurrentPositionForMap}
              disabled={isLocatingOnMap}
            >
              {isLocatingOnMap ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Feather name="crosshair" size={14} color={colors.primary} />
              )}
              <Text style={styles.ghostButtonText}>
                {isLocatingOnMap ? 'Locating...' : 'Use my current location'}
              </Text>
            </Pressable>
            <OpenStreetMapPicker coordinate={mapCoordinate} onCoordinateChange={setMapCoordinate} />
            <Text style={styles.mapCoordinateLabel}>
              {mapCoordinate.latitude.toFixed(6)}, {mapCoordinate.longitude.toFixed(6)}
            </Text>
            <Pressable style={[styles.primaryButton, styles.modalSubmit]} onPress={applyMapCoordinate}>
              <Text style={styles.primaryButtonText}>Use this coordinate</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAttendees} transparent animationType="slide" onRequestClose={() => setShowAttendees(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendees • {attendeesEventTitle}</Text>
              <Pressable onPress={() => setShowAttendees(false)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={attendees}
              keyExtractor={(item) => item.userId}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptySubtext}>No attendees yet.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.attendeeRow}>
                  <Feather name="user" size={14} color={colors.textSecondary} />
                  <Text style={styles.attendeeName}>{item.displayName}</Text>
                  {item.email ? <Text style={styles.attendeeEmail}>{item.email}</Text> : null}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
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
  scrollContent: { paddingHorizontal: spacing.xl },
  centered: { paddingTop: 80, alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: 6,
  },
  statValue: { fontSize: typography.title, fontWeight: fontWeights.bold, color: colors.textPrimary },
  statLabel: { fontSize: typography.caption, color: colors.textTertiary, fontWeight: fontWeights.semibold },
  manageWrap: { flex: 1, paddingHorizontal: spacing.xl },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: fontWeights.semibold, fontSize: typography.bodySmall },
  ghostButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  mapLocateButton: {
    marginBottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  disabledButton: {
    opacity: 0.7,
  },
  ghostButtonText: { color: colors.textPrimary, fontWeight: fontWeights.semibold, fontSize: typography.bodySmall },
  idBox: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  label: { fontSize: typography.caption, color: colors.textTertiary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  selectorInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  selectorText: { color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: fontWeights.medium },
  selectorTextPlaceholder: { color: colors.textPlaceholder },
  selectorSubText: { color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 },
  optionsBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: spacing.sm,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 8,
  },
  optionItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
  },
  hintText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    marginBottom: spacing.sm,
    marginTop: -2,
  },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  dateButtonText: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: fontWeights.medium, flexShrink: 1 },
  clearEndButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  clearEndButtonText: {
    color: colors.textTertiary,
    fontSize: typography.caption,
    textDecorationLine: 'underline',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  inlineAction: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  inlineActionText: { color: colors.primary, fontWeight: fontWeights.semibold, fontSize: typography.bodySmall },
  inlineDanger: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(225,77,77,0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  inlineDangerText: { color: colors.danger, fontWeight: fontWeights.semibold, fontSize: typography.bodySmall },
  listContent: { paddingBottom: spacing.lg },
  eventCard: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  eventTitle: { fontSize: typography.body, fontWeight: fontWeights.semibold, color: colors.textPrimary },
  eventMeta: { fontSize: typography.caption, color: colors.textTertiary, marginTop: 2 },
  eventActionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  itemAction: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.surfaceSecondary },
  itemActionText: { color: colors.primary, fontWeight: fontWeights.semibold, fontSize: typography.caption },
  itemDanger: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(225,77,77,0.12)' },
  itemDangerText: { color: colors.danger, fontWeight: fontWeights.semibold, fontSize: typography.caption },
  emptyState: { alignItems: 'center', paddingVertical: 36, gap: spacing.sm },
  emptyTitle: { fontSize: typography.heading, fontWeight: fontWeights.bold, color: colors.textPrimary },
  emptySubtext: { fontSize: typography.bodySmall, color: colors.textTertiary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.heading, fontWeight: fontWeights.bold, color: colors.textPrimary },
  modalSubmit: { justifyContent: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  selectionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    maxHeight: '60%',
  },
  selectionItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionItemText: {
    color: colors.textPrimary,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    textTransform: 'capitalize',
  },
  mapCoordinateLabel: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attendeeName: { flex: 1, color: colors.textPrimary, fontWeight: fontWeights.medium, fontSize: typography.bodySmall },
  attendeeEmail: { color: colors.textTertiary, fontSize: typography.caption },
});
