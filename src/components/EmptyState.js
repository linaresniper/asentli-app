import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

/** Neutral placeholder for "no data yet" states. */
export default function EmptyState({
  icon = 'receipt-outline',
  title,
  subtitle,
  compact,
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const resolvedTitle = title ?? t('noExpensesYet');
  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={compact ? 20 : 26} color={colors.textLight} />
      </View>
      <Text style={styles.title}>{resolvedTitle}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  compact: { paddingVertical: 18 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 17,
  },
});
