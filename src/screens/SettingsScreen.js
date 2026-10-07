import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../components/ScreenHeader';
import { usePreferences } from '../context/PreferencesProvider';
import { useTheme } from '../theme/ThemeContext';

function OptionPill({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: active ? colors.bottleGreen : colors.inputBg },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onBack }) {
  const { t } = useTranslation('settings');
  const { language, setLanguage } = usePreferences();
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: colors.card }]}>
      <ScreenHeader title={t('title')} onBack={onBack} />

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.textLight }]}>{t('language')}</Text>
        <View style={[styles.menuCard, { borderColor: colors.border }]}>
          <View style={styles.pillRow}>
            <OptionPill
              label={t('english')}
              active={language === 'en'}
              onPress={() => setLanguage('en')}
              colors={colors}
            />
            <OptionPill
              label={t('spanish')}
              active={language === 'es'}
              onPress={() => setLanguage('es')}
              colors={colors}
            />
          </View>
        </View>
        <Text style={[styles.hint, { color: colors.textLight }]}>{t('languageHint')}</Text>

        <Text style={[styles.sectionTitle, styles.sectionSpacing, { color: colors.textLight }]}>
          {t('appearance')}
        </Text>
        <View style={[styles.menuCard, styles.toggleRow, { borderColor: colors.border }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>{t('darkMode')}</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.inputBg, true: colors.bottleGreen }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sectionSpacing: { marginTop: 20 },
  menuCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  pillText: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18 },
});
