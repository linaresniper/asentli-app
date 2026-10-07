import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

/** Shown while Clerk restores the persisted session on cold start. */
export default function SplashScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <LinearGradient colors={[colors.gradientTop, colors.card]} style={styles.flex}>
      <View style={styles.center}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../../assets/asentli-logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brand}>ASENTLI</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.backgroundLogo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logo: { width: 90, height: 90 },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.bottleGreenText,
    letterSpacing: 1,
  },
});
