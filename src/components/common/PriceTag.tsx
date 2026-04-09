import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/theme';

interface PriceTagProps {
  value: string;
}

export function PriceTag({ value }: PriceTagProps) {
  return <Text style={styles.price}>{value}</Text>;
}

const styles = StyleSheet.create({
  price: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
