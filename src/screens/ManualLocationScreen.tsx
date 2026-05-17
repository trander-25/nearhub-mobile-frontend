import React, { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { City, Country } from 'country-state-city';

import { colors, spacing, typography, fontWeights } from '@/theme';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const MANUAL_LOCATION_KEY = 'nearhub_manual_location';

export function ManualLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [countryInput, setCountryInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [selectedCountryIso, setSelectedCountryIso] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<'country' | 'city' | null>(null);
  const [debouncedCountryQuery, setDebouncedCountryQuery] = useState('');
  const [debouncedCityQuery, setDebouncedCityQuery] = useState('');
  const { refreshControl } = usePullToRefresh(async () => {
    try {
      const raw = await SecureStore.getItemAsync(MANUAL_LOCATION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { country?: string; city?: string };
      setCountryInput(saved.country ?? '');
      setCityInput(saved.city ?? '');
    } catch {
      // Ignore invalid saved location data.
    }
  });

  const canSave = countryInput.trim().length > 0 && cityInput.trim().length > 0;
  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const citySource = useMemo(() => {
    if (!selectedCountryIso) return [];
    return City.getCitiesOfCountry(selectedCountryIso) ?? [];
  }, [selectedCountryIso]);

  useEffect(() => {
    const matchedCountry = allCountries.find(
      (item) => item.name.toLowerCase() === countryInput.trim().toLowerCase(),
    );
    setSelectedCountryIso(matchedCountry?.isoCode ?? '');
  }, [allCountries, countryInput]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCountryQuery(countryInput.trim().toLowerCase()), 120);
    return () => clearTimeout(id);
  }, [countryInput]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedCityQuery(cityInput.trim().toLowerCase()), 120);
    return () => clearTimeout(id);
  }, [cityInput]);

  const filteredCountryOptions = useMemo(
    () =>
      allCountries
        .filter((item) => {
          if (!debouncedCountryQuery) return false;
          const lower = item.name.toLowerCase();
          return lower.startsWith(debouncedCountryQuery) || lower.includes(debouncedCountryQuery);
        })
        .map((item) => item.name)
        .slice(0, 8),
    [allCountries, debouncedCountryQuery],
  );
  const filteredCityOptions = useMemo(
    () =>
      citySource
        .filter((item) => {
          if (!debouncedCityQuery) return false;
          const lower = item.name.toLowerCase();
          return lower.startsWith(debouncedCityQuery) || lower.includes(debouncedCityQuery);
        })
        .map((item) => item.name)
        .slice(0, 8),
    [debouncedCityQuery, citySource],
  );

  async function handleSave() {
    if (!canSave || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await SecureStore.setItemAsync(
        MANUAL_LOCATION_KEY,
        JSON.stringify({
          country: countryInput.trim(),
          city: cityInput.trim(),
          district: '',
        }),
      );
      router.back();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Location</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <Text style={styles.subtitle}>
          Search and select country, city and district to personalize event discovery.
        </Text>

        <Text style={styles.label}>Country</Text>
        <TextInput
          value={countryInput}
          onChangeText={(value) => {
            setCountryInput(value);
            setSelectedCountryIso('');
            setCityInput('');
          }}
          onFocus={() => setActiveField('country')}
          onBlur={() => setTimeout(() => setActiveField((prev) => (prev === 'country' ? null : prev)), 120)}
          placeholder="Search country"
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {activeField === 'country' && countryInput.trim().length > 0 && filteredCountryOptions.length > 0 && (
          <View style={styles.optionsBox}>
            {filteredCountryOptions.map((name) => (
              <Pressable
                key={name}
                style={styles.optionItem}
                onPress={() => {
                  const country = allCountries.find((item) => item.name === name);
                  setActiveField(null);
                  setCountryInput(name);
                  setSelectedCountryIso(country?.isoCode ?? '');
                  setCityInput('');
                }}
              >
                <Text style={styles.optionText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>City</Text>
        <TextInput
          value={cityInput}
          onChangeText={(value) => {
            setCityInput(value);
          }}
          onFocus={() => setActiveField('city')}
          onBlur={() => setTimeout(() => setActiveField((prev) => (prev === 'city' ? null : prev)), 120)}
          placeholder="Search city"
          placeholderTextColor={colors.textPlaceholder}
          style={styles.input}
          editable
          autoCorrect={false}
          autoCapitalize="words"
        />
        {activeField === 'city' && cityInput.trim().length > 0 && filteredCityOptions.length > 0 && (
          <View style={styles.optionsBox}>
            {filteredCityOptions.map((name) => (
              <Pressable
                key={name}
                style={styles.optionItem}
                onPress={() => {
                  setActiveField(null);
                  setCityInput(name);
                }}
              >
                <Text style={styles.optionText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <Pressable
          style={[styles.saveButton, (!canSave || isSubmitting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Apply Location</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  optionsBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: spacing.xs,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 20,
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
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    fontSize: typography.body,
  },
});
