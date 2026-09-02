import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../styles/theme';

const STATUS_CONFIGS = {
  pending: { label: 'PENDING', bg: colors.warningLight, text: colors.goldText, dot: colors.warning },
  confirmed: { label: 'CONFIRMED', bg: colors.successLight, text: colors.primaryDark, dot: colors.success },
  completed: { label: 'COMPLETED', bg: '#e0f2fe', text: '#0369a1', dot: '#0284c7' },
  done: { label: 'COMPLETED', bg: '#e0f2fe', text: '#0369a1', dot: '#0284c7' },
  'in-transit': { label: 'EN ROUTE', bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  cancelled: { label: 'CANCELLED', bg: colors.errorLight, text: colors.error, dot: colors.error },
  live: { label: 'LIVE GPS', bg: '#dcfce7', text: '#15803d', dot: '#22c55e' }
};

export default function Badge({ status = 'pending', label, size = 'md' }) {
  const norm = (status || '').toLowerCase().trim();
  const config = STATUS_CONFIGS[norm] || {
    label: label || status?.toUpperCase() || 'INFO',
    bg: colors.surfaceSubtle,
    text: colors.textSecondary,
    dot: colors.textMuted
  };

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: config.dot }, isSmall && styles.dotSm]} />
      <Text style={[styles.text, { color: config.text }, isSmall && styles.textSm]}>
        {label || config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start'
  },
  badgeSm: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  textSm: {
    fontSize: 9.5
  }
});
