import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';
import { formatDistance } from '../lib/geo';

const DELTA = 0.04; // ~4 km de alto en pantalla

/** Mapa con la ubicación del usuario y un pin por supermercado. */
export default function NearbyMap({ coords, markets, onPressMarket, affiliatedLabel, style }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <MapView
      style={[styles.map, style]}
      showsUserLocation
      showsMyLocationButton
      initialRegion={{
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: DELTA,
        longitudeDelta: DELTA,
      }}
    >
      {markets.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          pinColor={m.affiliatedStore ? colors.bottleGreen : colors.primary}
          onCalloutPress={() => onPressMarket && onPressMarket(m)}
        >
          <Callout tooltip={false}>
            <View style={styles.callout}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.meta}>{formatDistance(m.distanceKm)}</Text>
              {m.affiliatedStore && (
                <Text style={styles.affiliated}>
                  {affiliatedLabel}
                  {Number(m.affiliatedStore.cashback_pct) > 0
                    ? ` · ${Number(m.affiliatedStore.cashback_pct)}%`
                    : ''}
                </Text>
              )}
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

// El callout es una burbuja nativa blanca en ambos temas: colores fijos.
const createStyles = (colors) => StyleSheet.create({
  map: { width: '100%', height: 320, borderRadius: 20 },
  callout: { maxWidth: 220, paddingVertical: 2 },
  name: { fontSize: 13, fontWeight: '700', color: '#2A2A2A' },
  meta: { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  affiliated: { fontSize: 12, fontWeight: '800', color: '#003223', marginTop: 2 },
});
