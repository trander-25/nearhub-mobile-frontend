import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, fontWeights, spacing, typography } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/userService';

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasChanges =
    displayName.trim() !== (user?.displayName ?? '') ||
    avatarUrl.trim() !== (user?.avatarUrl ?? '');

  async function handleSave() {
    if (isSubmitting || !hasChanges) return;
    setError('');
    setIsSubmitting(true);

    try {
      const updated = await updateProfile({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      });
      if (refreshUser) refreshUser(updated);
      Alert.alert('Success', 'Profile updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          {avatarUrl.trim() ? (
            <Image source={{ uri: avatarUrl.trim() }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Feather name="user" size={48} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Display Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.textPlaceholder}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Avatar URL */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Avatar URL</Text>
          <View style={styles.inputWrapper}>
            <Feather name="image" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://example.com/avatar.jpg"
              placeholderTextColor={colors.textPlaceholder}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
            />
          </View>
          <Text style={styles.hint}>Paste an image URL from the web</Text>
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveButton, (!hasChanges || isSubmitting) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: colors.danger,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
    height: '100%',
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});
