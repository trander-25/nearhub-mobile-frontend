import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, fontWeights } from '@/theme';

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export function WriteReviewModal({ visible, onClose, onSubmit }: WriteReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || !comment.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      setRating(0);
      setComment('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && comment.trim().length > 0 && !isSubmitting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Write a Review</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <Text style={styles.label}>Your Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} hitSlop={4}>
                  <Feather
                    name="star"
                    size={36}
                    color={star <= rating ? colors.star : colors.chipBg}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Your Review</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this event..."
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{comment.length}/1000</Text>
          </ScrollView>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} disabled={!canSubmit} style={styles.submitWrap}>
              <LinearGradient
                colors={canSubmit ? colors.primaryGradient : colors.disabledGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[styles.submitText, !canSubmit && { color: colors.textTertiary }]}
                  >
                    Submit
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    flexGrow: 0,
    maxHeight: 360,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  label: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  starRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: spacing.lg,
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  submitWrap: {
    flex: 2,
  },
  submitButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
});
