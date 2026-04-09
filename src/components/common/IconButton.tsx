import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme';

interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  selected?: boolean;
}

export function IconButton({ icon, onPress, selected = false }: IconButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Feather name={icon} size={16} color={selected ? colors.danger : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
});
