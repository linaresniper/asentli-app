import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { SearchBar, Thumb } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useStoreProducts, useProductPrices } from '../hooks/useCatalog';
import { categoryIcon } from '../constants/categories';
import { formatMoney, formatDate } from '../lib/dates';

export default function PriceComparerScreen({ onBack, onNavigate, onBell, onOpenStore }) {
  const { t } = useTranslation('shopping');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const catalogQ = useStoreProducts();
  const products = catalogQ.data ?? [];

  // Al abrir la pantalla sin producto elegido, mostramos el primero del
  // catálogo en vez de una pantalla vacía.
  useEffect(() => {
    if (!selectedId && products.length) setSelectedId(products[0].id);
  }, [products, selectedId]);

  const selected = products.find((p) => p.id === selectedId) ?? null;
  const pricesQ = useProductPrices(selectedId);
  const prices = pricesQ.data ?? [];

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? products.filter((p) => p.name.toLowerCase().includes(q)) : []),
    [products, q]
  );

  // La recomendación se calcula con los precios reales. Antes era una frase
  // fija que mencionaba un comercio y un ahorro inventados.
  const insight = useMemo(() => {
    if (prices.length === 0) return null;
    const best = prices[0];
    if (prices.length === 1) {
      return t('priceComparer.recommendationSinglePrice', { store: best.storeName });
    }
    const worst = prices[prices.length - 1];
    return t('priceComparer.recommendationReal', {
      store: best.storeName,
      amount: formatMoney(worst.price - best.price),
    });
  }, [prices, t]);

  const pickProduct = (id) => {
    setSelectedId(id);
    setQuery('');
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('priceComparer.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SearchBar placeholder={t('priceComparer.searchPlaceholder')} value={query} onChangeText={setQuery} />

        {/* Con búsqueda activa, la pantalla es un selector de producto. */}
        {q ? (
          matches.length === 0 ? (
            <EmptyState compact title={t('priceComparer.noResults')} />
          ) : (
            matches.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.pickRow}
                activeOpacity={0.8}
                onPress={() => pickProduct(p.id)}
              >
                <Thumb icon={p.icon || categoryIcon(p.category)} bg={colors.lightGreen} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productUnit}>{p.unit}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ))
          )
        ) : catalogQ.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : catalogQ.isError ? (
          <EmptyState icon="cloud-offline-outline" title={t('priceComparer.loadError')} />
        ) : !selected ? (
          <EmptyState compact title={t('priceComparer.pickProduct')} />
        ) : (
          <>
            <View style={styles.productCard}>
              <Thumb
                icon={selected.icon || categoryIcon(selected.category)}
                bg={colors.lightGreen}
                size={56}
                radius={14}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{selected.name}</Text>
                <Text style={styles.productUnit}>{selected.unit}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('priceComparer.storesByPrice')}</Text>

            {pricesQ.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : prices.length === 0 ? (
              <EmptyState compact title={t('priceComparer.noPrices')} />
            ) : (
              prices.map((s) => (
                <View key={s.storeId} style={[styles.storeRow, s.best && styles.storeRowBest]}>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{s.storeName}</Text>
                    {s.best && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>{t('bestPrice')}</Text>
                      </View>
                    )}
                    <Text style={styles.updatedAt}>
                      {t('priceComparer.updatedAgo', { date: formatDate(s.updatedAt) })}
                    </Text>
                  </View>
                  <Text style={[styles.storePrice, s.best && { color: colors.bottleGreenText }]}>
                    {formatMoney(s.price)}
                  </Text>
                </View>
              ))
            )}

            {insight && (
              <View style={styles.recCard}>
                <View style={styles.recHeader}>
                  <Ionicons name="hardware-chip" size={18} color={colors.cardPinkText} />
                  <Text style={styles.recTitle}>{t('priceComparer.recommendationTitle')}</Text>
                </View>
                <Text style={styles.recText}>{insight}</Text>
                {prices[0]?.cashbackPct > 0 && (
                  <Text style={styles.recText}>
                    {t('priceComparer.cashbackNote', {
                      store: prices[0].storeName,
                      pct: prices[0].cashbackPct,
                    })}
                  </Text>
                )}
                <Text style={styles.recLink} onPress={onOpenStore}>
                  {t('priceComparer.openStore')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BottomNav active="Basket" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '800', color: colors.text },
  productUnit: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  updatedAt: { fontSize: 10, color: colors.textLight, marginTop: 4 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 24, marginBottom: 14 },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  storeRowBest: { borderColor: colors.saladGreen, backgroundColor: colors.lightGreen },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  storeName: { fontSize: 14, fontWeight: '700', color: colors.text },
  bestBadge: {
    backgroundColor: colors.saladGreen,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: colors.bottleGreenText },
  storePrice: { fontSize: 16, fontWeight: '800', color: colors.text },

  recCard: {
    backgroundColor: colors.cardPink,
    borderRadius: 20,
    padding: 18,
    marginTop: 18,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recTitle: { fontSize: 15, fontWeight: '800', color: colors.cardPinkText },
  recText: { fontSize: 13, color: colors.cardPinkText, lineHeight: 19 },
  recLink: { fontSize: 13, fontWeight: '800', color: colors.cardPinkText, marginTop: 10 },
});
