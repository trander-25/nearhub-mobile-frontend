import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

interface BadgeProps {
  label: string;
  tone?: 'accent' | 'success';
}

export function Badge({ label, tone = 'accent' }: BadgeProps) {
  return (
    <View style={[styles.badge, tone === 'success' ? styles.successBg : styles.accentBg]}>
      <Text style={[styles.text, tone === 'success' ? styles.successText : styles.accentText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  accentBg: {
    backgroundColor: '#EEF1FF',
  },
  successBg: {
    backgroundColor: colors.success,
  },
  text: {
    fontSize: typography.badge,
    fontWeight: '700',
  },
  accentText: {
    color: colors.accent,
  },
  successText: {
    color: '#0F3A00',
  },
});
