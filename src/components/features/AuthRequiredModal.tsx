import React, { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, Modal, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, spacing, typography } from '@/theme';
import { dismissSignInPrompt, subscribeAuthPrompt } from '@/utils/authPrompt';

type AuthPromptState = {
  visible: boolean;
  onSignIn?: () => void;
};

export function AuthRequiredModalHost() {
  const [prompt, setPrompt] = useState<AuthPromptState>({ visible: false });

  useEffect(() => subscribeAuthPrompt(setPrompt), []);

  const handleClose = () => {
    dismissSignInPrompt();
  };

  const handleSignIn = () => {
    const onSignIn = prompt.onSignIn;
    dismissSignInPrompt();
    onSignIn?.();
  };

  return (
    <Modal
      visible={prompt.visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={10}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Feather name="lock" size={24} color={colors.primary} />
          </View>

          <Text style={styles.title}>Cần đăng nhập</Text>
          <Text style={styles.message}>
            Bạn cần đăng nhập để sử dụng tính năng này và đồng bộ sự kiện đã lưu, đăng ký tham gia, theo dõi organizer.
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryText}>Để sau</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSignIn}>
              <Text style={styles.primaryText}>Đăng nhập</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25,27,35,0.24)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 14,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  secondaryText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  primaryText: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
  },
});
