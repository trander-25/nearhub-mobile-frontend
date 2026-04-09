import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function EventCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={styles.lineLg} />
        <View style={styles.lineMd} />
        <View style={styles.lineSm} />
        <View style={styles.footerRow}>
          <View style={styles.ratingPlaceholder} />
          <View style={styles.buttonPlaceholder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  image: {
    height: 214,
    backgroundColor: '#EDEFF3',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  lineLg: {
    height: 22,
    borderRadius: 8,
    width: '80%',
    backgroundColor: '#EDEFF3',
  },
  lineMd: {
    height: 16,
    borderRadius: 8,
    width: '60%',
    backgroundColor: '#EDEFF3',
  },
  lineSm: {
    height: 16,
    borderRadius: 8,
    width: '50%',
    backgroundColor: '#EDEFF3',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  ratingPlaceholder: {
    height: 16,
    width: 60,
    borderRadius: 8,
    backgroundColor: '#EDEFF3',
  },
  buttonPlaceholder: {
    height: 36,
    width: 80,
    borderRadius: 999,
    backgroundColor: '#EDEFF3',
  },
});
