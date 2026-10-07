import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { Chips } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { usePeriodExpenses } from '../hooks/useExpenseData';
import { sumAmount, donutData, comparisonInsight } from '../lib/expenseMath';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { formatMoney } from '../lib/dates';

const PERIODS = ['Weekly', 'Monthly', 'Yearly'];

function DonutChart({ data, total, size = 170, strokeWidth = 26 }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {total > 0 ? (
            data.map((d) => {
              const dash = (d.value / total) * circ;
              const seg = (
                <Circle
                  key={d.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-acc}
                  strokeLinecap="butt"
                />
              );
              acc += dash;
              return seg;
            })
          ) : (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors.progressTrack}
              strokeWidth={strokeWidth}
            />
          )}
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterValue}>{formatMoney(total)}</Text>
        <Text style={styles.donutCenterLabel}>{t('statistics.spent')}</Text>
      </View>
    </View>
  );
}

export default function StatisticsScreen({ onBack, onNavigate, onBell, onOpenHistory, onOpenRewards }) {
  const { t } = useTranslation('home');
  const categoryLabel = useCategoryLabel();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [period, setPeriod] = useState('Monthly');
  const { current, previous } = usePeriodExpenses(period);

  const loading = current.isLoading;
  const expenses = current.data ?? [];
  const total = sumAmount(expenses);
  const prevTotal = sumAmount(previous.data ?? []);
  const donut = donutData(expenses);
  const insight = comparisonInsight(total, prevTotal);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('statistics.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content}>
        <Chips options={PERIODS} value={period} onChange={setPeriod} />

        <Text style={styles.periodLabel}>{t(`statistics.periodLabel.${period.toLowerCase()}`)}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20, alignSelf: 'flex-start' }} />
        ) : (
          <>
            <Text style={styles.totalSpent}>{formatMoney(total)}</Text>
            <Text style={styles.totalCaption}>{t('statistics.totalSpent')}</Text>

            <View style={styles.chartCard}>
              <DonutChart data={donut} total={total} />
              <View style={styles.legend}>
                {donut.map((c) => (
                  <View key={c.key} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                    <Text style={styles.legendKey}>{categoryLabel(c.key)}</Text>
                    <Text style={styles.legendPct}>{Math.round(c.pct * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {total === 0 && (
              <EmptyState
                compact
                title={t('common:noExpensesYet')}
                subtitle={t('statistics.addExpenseHint')}
              />
            )}

            {/* Spending Insight */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="trending-down" size={18} color={colors.cardPinkText} />
                <Text style={styles.insightTitle}>{t('statistics.spendingInsight')}</Text>
              </View>
              <Text style={styles.insightText}>
                {t(`statistics.insight.${insight.key}`, {
                  amount: insight.amount,
                  period: t(`statistics.periodWord.${period.toLowerCase()}`),
                })}
              </Text>
              <Text style={styles.insightLink} onPress={onOpenHistory}>
                {t('statistics.viewPurchaseHistory')}
              </Text>
            </View>

            {/* Asentli Tip */}
            <View style={styles.tipCard}>
              <View style={styles.insightHeader}>
                <Ionicons name="bulb" size={18} color={colors.bottleGreenText} />
                <Text style={styles.tipTitle}>{t('statistics.asentliTip')}</Text>
              </View>
              <Text style={styles.tipText}>{t('statistics.tipText')}</Text>
              <Text style={styles.tipLink} onPress={onOpenRewards}>
                {t('statistics.seeYourCashback')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav active="Statistics" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  periodLabel: { fontSize: 13, color: colors.textLight, marginTop: 18 },
  totalSpent: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 4 },
  totalCaption: { fontSize: 12, color: colors.textLight, marginTop: 2 },

  chartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lightGreen,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  donutCenterLabel: { fontSize: 11, color: colors.textLight },

  legend: { flex: 1, marginLeft: 20, gap: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendKey: { flex: 1, fontSize: 13, color: colors.text },
  legendPct: { fontSize: 13, fontWeight: '800', color: colors.text },

  insightCard: {
    backgroundColor: colors.cardPink,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { fontSize: 15, fontWeight: '800', color: colors.cardPinkText },
  insightText: { fontSize: 13, color: colors.cardPinkText, lineHeight: 19 },
  insightLink: { fontSize: 13, fontWeight: '800', color: colors.cardPinkText, marginTop: 10 },

  tipCard: {
    backgroundColor: colors.lightGreen,
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
  },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.bottleGreenText },
  tipText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  tipLink: { fontSize: 13, fontWeight: '800', color: colors.bottleGreenText, marginTop: 10 },
});
