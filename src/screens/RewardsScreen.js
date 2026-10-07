import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { PillButton, ProgressBar, Thumb } from '../components/ui';

const HISTORY = [
  { id: 'h1', store: 'Súper Selectos', date: 'Aug 24, 2026', amount: '+$2.15', icon: 'storefront' },
  { id: 'h2', store: 'La Despensa Familiar', date: 'Aug 19, 2026', amount: '+$1.80', icon: 'storefront' },
  { id: 'h3', store: 'Farmacia San Nicolás', date: 'Aug 12, 2026', amount: '+$0.95', icon: 'medkit' },
  { id: 'h4', store: 'Panadería La Espiga', date: 'Aug 05, 2026', amount: '+$0.40', icon: 'pizza' },
];

export default function RewardsScreen({ onBack, onNavigate, onBell, onWithdraw, onKeepShopping }) {
  const { t } = useTranslation('shopping');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('rewards.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('rewards.totalAvailable')}</Text>
          <Text style={styles.balanceAmount}>$5.30</Text>
          <PillButton label={t('rewards.withdraw')} variant="orange" onPress={onWithdraw} style={{ marginTop: 16 }} />
        </View>

        <Text style={styles.sectionTitle}>{t('rewards.history')}</Text>
        {HISTORY.map((h) => (
          <View key={h.id} style={styles.row}>
            <Thumb icon={h.icon} bg={colors.lightGreen} />
            <View style={styles.info}>
              <Text style={styles.store}>{h.store}</Text>
              <Text style={styles.date}>{h.date}</Text>
            </View>
            <Text style={styles.amount}>{h.amount}</Text>
          </View>
        ))}

        <View style={styles.keepCard}>
          <View style={styles.keepIcon}>
            <Ionicons name="gift" size={22} color={colors.bannerGreenText} />
          </View>
          <Text style={styles.keepTitle}>{t('rewards.keepShoppingTitle')}</Text>
          <Text style={styles.keepText}>{t('rewards.keepShoppingText')}</Text>
          <ProgressBar progress={0.53} color={colors.bannerGreenText} track="#FFFFFF33" />
          <PillButton
            label={t('rewards.browseStore')}
            variant="dark"
            onPress={onKeepShopping}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>

      <BottomNav active="Home" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  balanceCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 22,
    padding: 22,
  },
  balanceLabel: { fontSize: 13, color: '#9FB7AC' },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 26, marginBottom: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1 },
  store: { fontSize: 14, fontWeight: '700', color: colors.text },
  date: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', color: colors.success },

  keepCard: {
    backgroundColor: colors.bannerGreen,
    borderRadius: 22,
    padding: 22,
    marginTop: 24,
  },
  keepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  keepTitle: { fontSize: 17, fontWeight: '800', color: colors.bannerGreenText },
  keepText: { fontSize: 13, color: colors.bannerGreenText, lineHeight: 19, marginTop: 6, marginBottom: 14 },
});
