import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import Fab from '../components/Fab';
import { useBudget, useMonthExpenses } from '../hooks/useExpenseData';
import { sumAmount, weeklyBars } from '../lib/expenseMath';
import { formatMoney } from '../lib/dates';

export default function HomeScreen({ onNavigate, onAddExpense }) {
    const { t } = useTranslation('home');
    const { colors } = useTheme();
    const styles = createStyles(colors);
    // bottleGreenText y no bottleGreen: en claro es el mismo #003223, pero
    // en oscuro pasa a verde menta. Como relleno de barra no lleva nada
    // encima, el verde casi negro daba 1.27:1 contra el fondo oscuro.
    const BAR_COLORS = [colors.saladGreen, colors.bottleGreenText, colors.primary, colors.catOther];
    const go = (key) => onNavigate && onNavigate(key);

    const budgetQ = useBudget();
    const expensesQ = useMonthExpenses();

    const loading = budgetQ.isLoading || expensesQ.isLoading;
    const monthlyTotal = budgetQ.data?.monthlyTotal ?? 0;
    const expenses = expensesQ.data ?? [];
    const spent = sumAmount(expenses);
    const bars = weeklyBars(expenses);
    const maxBar = Math.max(...bars.map((b) => b.amount), 0);
    const hasData = spent > 0 || monthlyTotal > 0;

    return (
        <View style={styles.flex}>
            <ScreenHeader title="Asentli" onBell={() => go('notifications')} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Budget card */}
                <TouchableOpacity activeOpacity={0.9} style={styles.budgetCard} onPress={() => go('budgetDetails')}>
                    <View style={styles.budgetHeaderRow}>
                        <Text style={styles.budgetTitle}>{t('home.budgetTitle')}</Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Text style={styles.budgetAmount}>{formatMoney(spent)}</Text>
                        )}
                    </View>
                    <Text style={styles.budgetSubtitle}>
                        {loading
                            ? t('home.loadingSpending')
                            : monthlyTotal > 0
                            ? t('home.spendingThisMonth', { amount: formatMoney(monthlyTotal) })
                            : t('home.setBudgetHint')}
                    </Text>

                    <View style={styles.chartRow}>
                        {bars.map((b, i) => {
                            const height = maxBar > 0 ? 8 + (b.amount / maxBar) * 92 : 6;
                            return (
                                <View key={b.n} style={styles.barColumn}>
                                    <View
                                        style={[
                                            styles.bar,
                                            { height, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] },
                                        ]}
                                    />
                                    <Text style={styles.barLabel}>{t('common:week', { n: b.n })}</Text>
                                </View>
                            );
                        })}
                    </View>
                    {!loading && !hasData && (
                        <Text style={styles.emptyHint}>{t('home.noExpensesThisMonth')}</Text>
                    )}
                </TouchableOpacity>

                {/* Action buttons */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionButton, styles.aiButton]} onPress={() => go('ai')}>
                        <Ionicons name="sparkles" size={24} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>{t('home.aiAssistant')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.cardButton]} onPress={() => go('card')}>
                        <Ionicons name="card" size={24} color="#FFFFFF" style={styles.actionIcon} />
                        <Text style={styles.actionText}>{t('home.myCard')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Affiliated stores */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{t('home.affiliatedStores')}</Text>
                    <TouchableOpacity onPress={() => go('affiliated')}>
                        <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity activeOpacity={0.9} style={styles.storeCard} onPress={() => go('affiliated')}>
                    <View style={styles.storeLogo}>
                        <Ionicons name="storefront" size={22} color={colors.bottleGreenText} />
                    </View>
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>Súper Selectos</Text>
                        <Text style={styles.storeDetail}>{t('home.storeCashback')}</Text>
                        <Text style={styles.storeDistance}>{t('home.storeDistance')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>

                {/* Offer banner */}
                <TouchableOpacity activeOpacity={0.9} style={styles.offerCard} onPress={() => go('availableOffers')}>
                    <Text style={styles.offerLabel}>{t('home.offerLabel')}</Text>
                    <Text style={styles.offerText}>{t('home.offerText')}</Text>
                    <Text style={styles.offerLink}>{t('home.offerLink')}</Text>
                </TouchableOpacity>
            </ScrollView>

            <Fab onPress={onAddExpense} label={t('home.addExpenseFab')} />
            <BottomNav active="Home" onNavigate={onNavigate} />
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.card },
    content: { padding: 20, paddingBottom: 20 },

    budgetCard: {
        backgroundColor: colors.lightGreen,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
    },
    budgetHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budgetTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    budgetAmount: { fontSize: 15, fontWeight: '700', color: colors.primary },
    budgetSubtitle: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 4,
        marginBottom: 16,
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 110,
    },
    barColumn: { alignItems: 'center' },
    bar: { width: 26, borderRadius: 6 },
    barLabel: { fontSize: 10, color: colors.textLight, marginTop: 6 },
    emptyHint: { fontSize: 11, color: colors.textLight, marginTop: 12, textAlign: 'center' },

    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiButton: { backgroundColor: colors.primary },
    cardButton: { backgroundColor: colors.bottleGreen },
    actionIcon: { marginBottom: 6 },
    actionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },

    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    seeAll: { fontSize: 12, color: colors.primary, fontWeight: '600' },

    storeCard: {
        flexDirection: 'row',
        backgroundColor: colors.lightGreen,
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        alignItems: 'center',
    },
    storeLogo: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    storeInfo: { flex: 1 },
    storeName: { fontSize: 14, fontWeight: '700', color: colors.text },
    storeDetail: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    storeDistance: { fontSize: 11, color: colors.textLight, marginTop: 2 },

    offerCard: {
        backgroundColor: '#FDEDE3',
        borderRadius: 16,
        padding: 16,
    },
    offerLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 6,
    },
    offerText: { fontSize: 14, fontWeight: '600', color: colors.text },
    offerLink: { fontSize: 11, color: colors.textLight, marginTop: 6 },
});
