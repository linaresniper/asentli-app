import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';

export default function PlaceholderScreen({
  title,
  onBack,
  onNavigate,
  activeTab,
  emoji = '🚧',
  message,
}) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const resolvedMessage = message ?? t('underConstruction');
  return (
    <View style={styles.flex}>
      <ScreenHeader title={title} onBack={onBack} />

      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.message}>{resolvedMessage}</Text>
      </View>

      <BottomNav active={activeTab} onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  message: { fontSize: 14, color: colors.textLight },
});
