import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import { useNotifications } from '../hooks/useNotifications';
import { formatMoney } from '../lib/dates';

const ALERT_ICON = {
  budgetOver: 'alert-circle',
  budgetWarning: 'warning',
  largeExpense: 'cash',
};

function alertCopy(alert, t) {
  if (alert.type === 'budgetOver') {
    return {
      title: t('budgetOverTitle'),
      text: t('budgetOver', {
        percent: alert.percent,
        spent: formatMoney(alert.spent),
        monthlyTotal: formatMoney(alert.monthlyTotal),
      }),
    };
  }
  if (alert.type === 'budgetWarning') {
    return {
      title: t('budgetWarningTitle'),
      text: t('budgetWarning', {
        percent: alert.percent,
        remaining: formatMoney(alert.remaining),
      }),
    };
  }
  return {
    title: t('largeExpenseTitle'),
    text: alert.merchant
      ? t('largeExpenseWithMerchant', { amount: formatMoney(alert.amount), merchant: alert.merchant })
      : t('largeExpenseNoMerchant', { amount: formatMoney(alert.amount) }),
  };
}

export default function NotificationsScreen({ onBack, onNavigate }) {
  const { t } = useTranslation('notifications');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { alerts, isLoading } = useNotifications();

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('title')} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loading} />
        ) : alerts.length === 0 ? (
          <EmptyState icon="notifications-outline" title={t('empty')} />
        ) : (
          alerts.map((alert) => {
            const { title, text } = alertCopy(alert, t);
            return (
              <View key={alert.id} style={styles.bubbleRow}>
                <View style={styles.avatar}>
                  <Ionicons
                    name={ALERT_ICON[alert.type]}
                    size={14}
                    color={colors.bottleGreenText}
                  />
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleTitle}>{title}</Text>
                  <Text style={styles.bubbleText}>{text}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="Home" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.card },
    content: { padding: 20, paddingBottom: 30 },
    loading: { marginTop: 32 },

    bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    bubble: {
      flex: 1,
      backgroundColor: colors.notifBubble,
      borderRadius: 16,
      borderTopLeftRadius: 4,
      padding: 14,
    },
    bubbleTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.bottleGreenText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    bubbleText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  });
