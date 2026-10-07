import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Shared top header. Matches the pattern used across every Asentli screen:
 * back arrow (optional) + title + bell (optional) or a custom right slot.
 */
export default function ScreenHeader({ title, onBack, onBell, right }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.headerTitle}>{title}</Text>

      {right !== undefined ? (
        right
      ) : onBell ? (
        <TouchableOpacity onPress={onBell} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="notifications-outline" size={22} color={colors.bottleGreenText} />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backArrow: { fontSize: 22, color: colors.bottleGreenText },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.bottleGreenText },
  spacer: { width: 22 },
});
