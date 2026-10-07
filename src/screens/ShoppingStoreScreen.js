import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { SearchBar, ViewMore, Thumb } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useStoreProducts } from '../hooks/useCatalog';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import { CATEGORIES, categoryIcon } from '../constants/categories';
import { formatMoney } from '../lib/dates';

const ALL = 'All';

export default function ShoppingStoreScreen({ onBack, onNavigate, onBell, onViewMore }) {
  const { t } = useTranslation('shopping');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const categoryLabel = useCategoryLabel();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  // Carrito local: el botón "Add" de cada producto antes no tenía onPress —
  // se veía tocable y no pasaba nada. Hasta que haya carrito real en
  // Supabase, al menos cuenta de verdad lo que agregás en esta sesión, y el
  // badge refleja ese número en vez del "3" que estaba escrito a mano.
  const [cartCount, setCartCount] = useState(0);

  const { data, isLoading, isError } = useStoreProducts();
  const products = data ?? [];

  // Los chips de categoría se derivan del catálogo, no de una lista escrita a
  // mano: así `other` (que la canasta básica no usa — ver CATALOG.md) no
  // aparece como una pestaña vacía, y si mañana entra un producto de una
  // categoría nueva el chip sale solo.
  const tabs = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return [ALL, ...CATEGORIES.map((c) => c.key).filter((k) => present.has(k))];
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (category === ALL ? true : p.category === category))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  }, [products, category, query]);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('shoppingStore.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content}>
        <SearchBar
          placeholder={t('shoppingStore.searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          right={
            <View>
              <Ionicons name="cart" size={20} color={colors.bottleGreenText} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
          }
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {tabs.map((key) => {
            const active = key === category;
            return (
              <TouchableOpacity key={key} style={styles.catItem} onPress={() => setCategory(key)}>
                <View style={[styles.catCircle, active && styles.catCircleActive]}>
                  <Ionicons
                    name={key === ALL ? 'grid' : categoryIcon(key)}
                    size={20}
                    color={active ? '#FFFFFF' : colors.bottleGreenText}
                  />
                </View>
                <Text style={[styles.catLabel, active && styles.catLabelActive]}>
                  {key === ALL ? t('shoppingStore.cat_All') : categoryLabel(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>{t('shoppingStore.recommendedProducts')}</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('shoppingStore.loadError')}
            subtitle={t('shoppingStore.loadErrorHint')}
          />
        ) : visible.length === 0 ? (
          <EmptyState compact title={t('shoppingStore.empty')} />
        ) : (
          <View style={styles.grid}>
            {visible.map((p) => (
              <View key={p.id} style={styles.gridCard}>
                <Thumb icon={p.icon || categoryIcon(p.category)} bg={colors.lightGreen} size={56} radius={14} />
                <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.productUnit}>{p.unit}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>
                    {p.price === null ? t('shoppingStore.noPrice') : formatMoney(p.price)}
                  </Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setCartCount((n) => n + 1)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addBtnText}>{t('common:add')}</Text>
                  </TouchableOpacity>
                </View>
                {p.storeName && (
                  <Text style={styles.productStore} numberOfLines={1}>
                    {t('shoppingStore.from', { store: p.storeName })}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <ViewMore onPress={onViewMore} />
      </ScrollView>

      <BottomNav active="Basket" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  catRow: { gap: 16, paddingVertical: 16 },
  catItem: { alignItems: 'center', width: 62 },
  catCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catCircleActive: { backgroundColor: colors.bottleGreen },
  catLabel: { fontSize: 11, color: colors.textLight },
  catLabelActive: { color: colors.text, fontWeight: '700' },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  productName: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 10 },
  productUnit: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  productPrice: { fontSize: 14, fontWeight: '800', color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  productStore: { fontSize: 10, color: colors.textLight, marginTop: 6 },
});
