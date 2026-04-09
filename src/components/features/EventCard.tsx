import React from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { colors, spacing, typography, fontWeights } from '@/theme';

interface EventCardProps {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
  location: string;
  category: string;
  distanceKm?: number;
  rating?: { average: number; total: number };
  isLiked?: boolean;
  onToggleLike?: (id: string) => void;
  onPress?: (id: string) => void;
}

export function EventCard({
  id,
  title,
  imageUrl,
  date,
  location,
  category,
  distanceKm,
  rating,
  isLiked = false,
  onToggleLike,
  onPress,
}: EventCardProps) {
  const distanceLabel = distanceKm != null
    ? `${distanceKm.toFixed(1)} km`
    : null;

  function stopAndRun(e: GestureResponderEvent, fn?: () => void) {
    e.stopPropagation();
    fn?.();
  }

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(id)}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

        <View style={styles.badgeRow}>
          {distanceLabel && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{distanceLabel}</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{category.toUpperCase()}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.heartButton, isLiked && styles.heartButtonLiked]}
          onPress={(e) => stopAndRun(e, () => onToggleLike?.(id))}
          hitSlop={8}
        >
          <Feather
            name="heart"
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          <Feather name="calendar" size={12} color={colors.textSecondary} />
          <Text style={styles.metaText}>{date}</Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
        </View>

        <View style={styles.footer}>
          {rating && rating.total > 0 ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={colors.star} />
              <Text style={styles.ratingValue}>{rating.average.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({rating.total})</Text>
            </View>
          ) : (
            <View />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 214,
  },
  badgeRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  distanceBadge: {
    backgroundColor: colors.distanceBadgeBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  distanceBadgeText: {
    fontSize: typography.badge,
    fontWeight: fontWeights.bold,
    color: colors.distanceBadgeText,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  categoryBadge: {
    backgroundColor: colors.categoryBadgeBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  categoryBadgeText: {
    fontSize: typography.badge,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  heartButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(25,27,35,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  heartButtonLiked: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.heading,
    lineHeight: 25,
    color: colors.textPrimary,
    fontWeight: fontWeights.bold,
    fontFamily: 'System',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  ratingCount: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
});
