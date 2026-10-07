import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// react-native-maps no soporta web. Este archivo reemplaza a
// NearbyMap.native.js en `expo start --web` para que el bundle no se rompa.
export default function NearbyMap({ webUnavailableLabel, style }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.box, style]}>
      <Ionicons name="map-outline" size={40} color={colors.textLight} />
      <Text style={styles.text}>{webUnavailableLabel}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  box: {
    height: 220,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  text: { fontSize: 13, color: colors.textLight, textAlign: 'center', paddingHorizontal: 20 },
});
