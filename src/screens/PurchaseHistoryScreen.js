import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { SearchBar, Thumb } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useRecentExpenses } from '../hooks/useExpenseData';
import { groupByRelativeDate } from '../lib/expenseMath';
import { categoryIcon } from '../constants/categories';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { formatMoney, formatDateTime } from '../lib/dates';

export default function PurchaseHistoryScreen({ onBack, onNavigate, onBell }) {
  const { t } = useTranslation('budget');
  const categoryLabel = useCategoryLabel();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const { data, isLoading, isError } = useRecentExpenses(50);

  const groups = useMemo(() => {
    const expenses = data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? expenses.filter(
          (e) =>
            (e.merchant || '').toLowerCase().includes(q) ||
            categoryLabel(e.category).toLowerCase().includes(q) ||
            (e.note || '').toLowerCase().includes(q)
        )
      : expenses;
    return groupByRelativeDate(filtered);
  }, [data, query, categoryLabel]);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('purchaseHistory.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content}>
        <SearchBar placeholder={t('purchaseHistory.searchPlaceholder')} value={query} onChangeText={setQuery} />

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('purchaseHistory.loadErrorTitle')}
            subtitle={t('purchaseHistory.loadErrorSubtitle')}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={query ? t('purchaseHistory.noResults') : t('common:noExpensesYet')}
            subtitle={query ? undefined : t('purchaseHistory.addExpenseHint')}
          />
        ) : (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={styles.groupTitle}>{t(`common:relativeDays.${group.key}`)}</Text>
              {group.items.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Thumb icon={categoryIcon(item.category)} bg={colors.lightGreen} />
                  <View style={styles.info}>
                    <Text style={styles.store}>{item.merchant || categoryLabel(item.category)}</Text>
                    <Text style={styles.time}>{formatDateTime(item.spent_at)}</Text>
                  </View>
                  <Text style={styles.amount}>-{formatMoney(item.amount)}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <BottomNav active="Statistics" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  group: { marginTop: 20 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

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
  time: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800', color: colors.text },
});
