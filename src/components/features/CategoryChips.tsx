import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography, fontWeights } from '@/theme';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  'Your area': 'navigation',
  'All events': 'grid',
  Music: 'music',
  Art: 'image',
  Sport: 'activity',
  Food: 'coffee',
  Technology: 'monitor',
  Business: 'briefcase',
  Education: 'book-open',
  Workshop: 'tool',
  Festival: 'sun',
  Community: 'users',
};

interface CategoryChipsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  const allCategories = ['Your area', 'All events', ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {allCategories.map((cat) => {
        const isActive = selected === cat;
        const iconName = CATEGORY_ICONS[cat] ?? 'tag';

        return (
          <Pressable
            key={cat}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(cat)}
          >
            <Feather
              name={iconName}
              size={16}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {cat === 'Technology' ? 'Tech' : cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.chipBg,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
  },
});
