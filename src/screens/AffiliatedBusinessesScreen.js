import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { SearchBar, Thumb } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useStores } from '../hooks/useCatalog';
import { useUserLocation } from '../hooks/useUserLocation';
import { useNearbySupermarkets } from '../hooks/useNearbySupermarkets';
import NearbyMap from '../components/NearbyMap';
import { formatDistance } from '../lib/geo';

const NEARBY_LIST_SIZE = 10;

export default function AffiliatedBusinessesScreen({ onBack, onNavigate, onBell, onOpenBusiness }) {
  const { t } = useTranslation('shopping');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('List');

  const { data, isLoading, isError } = useStores();
  const businesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data ?? [];
    return q ? all.filter((b) => b.name.toLowerCase().includes(q)) : all;
  }, [data, query]);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('affiliatedBusinesses.title')} onBack={onBack} onBell={onBell} />

      <ScrollView contentContainerStyle={styles.content}>
        <SearchBar placeholder={t('affiliatedBusinesses.searchPlaceholder')} value={query} onChangeText={setQuery} />

        <View style={styles.toggle}>
          {['List', 'Map'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.toggleBtn, view === opt && styles.toggleBtnActive]}
              onPress={() => setView(opt)}
            >
              <Ionicons
                name={opt === 'List' ? 'list' : 'map'}
                size={16}
                color={view === opt ? '#FFFFFF' : colors.chipText}
              />
              <Text style={[styles.toggleText, view === opt && styles.toggleTextActive]}>
                {t(`affiliatedBusinesses.view_${opt}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'Map' ? (
          <NearbyMapSection
            stores={data}
            query={query}
            styles={styles}
            colors={colors}
            t={t}
            onOpenBusiness={onOpenBusiness}
          />
        ) : isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : isError ? (
          <EmptyState icon="cloud-offline-outline" title={t('affiliatedBusinesses.loadError')} />
        ) : businesses.length === 0 ? (
          <EmptyState compact title={t('affiliatedBusinesses.empty')} />
        ) : (
          businesses.map((b) => (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.8}
              style={styles.row}
              onPress={() => onOpenBusiness && onOpenBusiness(b)}
            >
              <Thumb icon="storefront" bg={colors.lightGreen} />
              <View style={styles.info}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.category}>{b.category}</Text>
              </View>
              {Number(b.cashback_pct) > 0 && (
                <View style={styles.cashbackTag}>
                  <Text style={styles.cashbackText}>
                    {t('affiliatedBusinesses.cashback', { pct: Number(b.cashback_pct) })}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNav active="Home" onNavigate={onNavigate} />
    </View>
  );
}

/** Vista Mapa: ubicación del usuario + supermercados cercanos de OpenStreetMap. */
function NearbyMapSection({ stores, query, styles, colors, t, onOpenBusiness }) {
  const location = useUserLocation();
  const nearby = useNearbySupermarkets(location.coords, stores);

  const markets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = nearby.data ?? [];
    return q ? all.filter((m) => m.name.toLowerCase().includes(q)) : all;
  }, [nearby.data, query]);

  const openMarket = (m) => {
    if (m.affiliatedStore && onOpenBusiness) onOpenBusiness(m.affiliatedStore);
  };

  if (location.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.mapText}>{t('affiliatedBusinesses.locating')}</Text>
      </View>
    );
  }

  if (location.status === 'denied' || location.status === 'error') {
    const denied = location.status === 'denied';
    return (
      <View>
        <EmptyState
          icon="location-outline"
          title={t(denied ? 'affiliatedBusinesses.locationDenied' : 'affiliatedBusinesses.locationError')}
        />
        <View style={styles.actions}>
          {denied && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.actionText}>{t('affiliatedBusinesses.openSettings')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={location.retry}>
            <Text style={styles.actionText}>{t('affiliatedBusinesses.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      <NearbyMap
        coords={location.coords}
        markets={markets}
        onPressMarket={openMarket}
        affiliatedLabel={t('affiliatedBusinesses.affiliatedTag')}
        webUnavailableLabel={t('affiliatedBusinesses.mapWebUnavailable')}
      />
      <Text style={styles.attribution}>{t('affiliatedBusinesses.osmAttribution')}</Text>

      <Text style={styles.sectionTitle}>{t('affiliatedBusinesses.nearbyTitle')}</Text>

      {nearby.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : nearby.isError ? (
        <View>
          <EmptyState icon="cloud-offline-outline" title={t('affiliatedBusinesses.nearbyError')} />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => nearby.refetch()}>
              <Text style={styles.actionText}>{t('affiliatedBusinesses.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : markets.length === 0 ? (
        <EmptyState compact icon="storefront-outline" title={t('affiliatedBusinesses.nearbyEmpty')} />
      ) : (
        markets.slice(0, NEARBY_LIST_SIZE).map((m) => (
          <TouchableOpacity
            key={m.id}
            activeOpacity={m.affiliatedStore ? 0.8 : 1}
            style={styles.row}
            onPress={() => openMarket(m)}
          >
            <Thumb
              icon="storefront"
              bg={m.affiliatedStore ? colors.lightGreen : colors.inputBg}
              color={m.affiliatedStore ? colors.bottleGreenText : colors.textLight}
            />
            <View style={styles.info}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.category}>
                {t('affiliatedBusinesses.distance', { distance: formatDistance(m.distanceKm) })}
                {m.address ? ` · ${m.address}` : ''}
              </Text>
            </View>
            {m.affiliatedStore && (
              <View style={styles.cashbackTag}>
                <Text style={styles.cashbackText}>
                  {Number(m.affiliatedStore.cashback_pct) > 0
                    ? t('affiliatedBusinesses.cashback', { pct: Number(m.affiliatedStore.cashback_pct) })
                    : t('affiliatedBusinesses.affiliatedTag')}
                </Text>
              </View>
            )}
            {m.affiliatedStore && (
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.chipBg,
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
    marginBottom: 18,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: colors.bottleGreen },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.chipText },
  toggleTextActive: { color: '#FFFFFF' },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  mapText: { fontSize: 13, color: colors.textLight },
  attribution: { fontSize: 10, color: colors.textLight, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 4 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actionBtn: {
    backgroundColor: colors.bottleGreen,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  category: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  cashbackTag: {
    backgroundColor: colors.lightGreen,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cashbackText: { fontSize: 11, fontWeight: '800', color: colors.bottleGreenText },
});
