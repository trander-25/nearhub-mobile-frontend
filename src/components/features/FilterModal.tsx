import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, fontWeights } from '@/theme';

const SORT_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'startAt', label: 'Date' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
] as const;

interface FilterState {
  categories: string[];
  city: string;
  sortBy: string;
  radius: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    categories?: string[];
    city?: string;
    sortBy?: string;
    radius?: number;
  }) => void;
  categories: string[];
  initialCategories?: string[];
  initialCity?: string;
  initialSortBy?: string;
  initialRadius?: number;
}

export function FilterModal({
  visible,
  onClose,
  onApply,
  categories,
  initialCategories = [],
  initialCity = '',
  initialSortBy = 'distance',
  initialRadius,
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [filters, setFilters] = useState<FilterState>({
    categories: initialCategories,
    city: initialCity,
    sortBy: initialSortBy,
    radius: initialRadius?.toString() ?? '',
  });

  const handleApply = () => {
    onApply({
      categories: filters.categories.length ? filters.categories : undefined,
      city: filters.city || undefined,
      sortBy: filters.sortBy,
      radius: filters.radius ? Number(filters.radius) : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setFilters({ categories: [], city: '', sortBy: 'distance', radius: '' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipWrap}>
              {categories.map((cat) => {
                const isActive = filters.categories.includes(cat);
                return (
                  <Pressable
                    key={cat}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => {
                      setFilters((prev) => {
                        const exists = prev.categories.includes(cat);
                        const nextCategories = exists
                          ? prev.categories.filter((item) => item !== cat)
                          : [...prev.categories, cat];
                        return { ...prev, categories: nextCategories };
                      });
                    }}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>City</Text>
            <TextInput
              value={filters.city}
              onChangeText={(v) => setFilters((prev) => ({ ...prev, city: v }))}
              placeholder="e.g. Ho Chi Minh City"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.textInput}
            />

            <Text style={styles.sectionTitle}>Radius (km)</Text>
            <TextInput
              value={filters.radius}
              onChangeText={(v) => setFilters((prev) => ({ ...prev, radius: v }))}
              placeholder="e.g. 10"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.textInput}
              keyboardType="numeric"
            />

            <Text style={styles.sectionTitle}>Sort by</Text>
            <View style={styles.chipWrap}>
              {SORT_OPTIONS.map((opt) => {
                const isActive = filters.sortBy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setFilters((prev) => ({ ...prev, sortBy: opt.value }))}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable onPress={handleApply} style={styles.applyButtonWrap}>
              <LinearGradient
                colors={['#003D9B', '#0052CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  bodyContent: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  resetButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  applyButtonWrap: {
    flex: 2,
  },
  applyButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: typography.body,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
