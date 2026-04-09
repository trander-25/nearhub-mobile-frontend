import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, fontWeights, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/userService';

const ALL_CATEGORIES = [
  'Music',
  'Art',
  'Sport',
  'Food',
  'Technology',
  'Business',
  'Education',
  'Workshop',
  'Festival',
  'Community',
  'Health',
  'Travel',
] as const;

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Music: 'music',
  Art: 'image',
  Sport: 'activity',
  Food: 'coffee',
  Technology: 'cpu',
  Business: 'briefcase',
  Education: 'book-open',
  Workshop: 'tool',
  Festival: 'star',
  Community: 'users',
  Health: 'heart',
  Travel: 'map',
};

export function EditPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [selected, setSelected] = useState<Set<string>>(
    new Set(user?.preferences ?? []),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const original = new Set(user?.preferences ?? []);
  const hasChanges =
    selected.size !== original.size ||
    [...selected].some((s) => !original.has(s));

  const toggleCategory = useCallback((cat: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  async function handleSave() {
    if (isSubmitting || !hasChanges) return;
    setIsSubmitting(true);

    try {
      const updated = await updateProfile({
        preferences: [...selected],
      });
      if (refreshUser) refreshUser(updated);
      Alert.alert('Thành công', 'Sở thích đã được cập nhật.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể cập nhật.');
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
        <Text style={styles.headerTitle}>Sở thích</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Chọn các chủ đề bạn quan tâm để nhận gợi ý sự kiện phù hợp
        </Text>

        <View style={styles.grid}>
          {ALL_CATEGORIES.map((cat) => {
            const isActive = selected.has(cat);
            return (
              <Pressable
                key={cat}
                style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                onPress={() => toggleCategory(cat)}
              >
                <View style={[styles.categoryIcon, isActive && styles.categoryIconActive]}>
                  <Feather
                    name={CATEGORY_ICONS[cat] ?? 'tag'}
                    size={20}
                    color={isActive ? '#FFFFFF' : colors.textTertiary}
                  />
                </View>
                <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>
                  {cat}
                </Text>
                {isActive && (
                  <View style={styles.checkBadge}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
        <Text style={styles.selectedCount}>
          {selected.size} chủ đề đã chọn
        </Text>
        <Pressable
          style={[styles.saveButton, (!hasChanges || isSubmitting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu</Text>
          )}
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
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,61,155,0.04)',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconActive: {
    backgroundColor: colors.primary,
  },
  categoryName: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  categoryNameActive: {
    color: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedCount: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});
