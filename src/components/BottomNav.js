import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

/**
 * Shared bottom navigation. Same 4 tabs on every screen.
 * `active` = one of 'Home' | 'Statistics' | 'Basket' | 'Profile'.
 * `onNavigate` receives the lowercase screen key.
 */
const tabs = [
  { key: 'Home', screen: 'home', icon: 'home' },
  { key: 'Statistics', screen: 'statistics', icon: 'bar-chart' },
  { key: 'Basket', screen: 'basket', icon: 'cart' },
  { key: 'Profile', screen: 'profile', icon: 'person' },
];

export default function BottomNav({ active = 'Home', onNavigate }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onNavigate && onNavigate(tab.screen)}
          >
            <Ionicons
              name={tab.icon}
              size={22}
              color={isActive ? '#FFFFFF' : '#8FA89C'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {t(`nav.${tab.key.toLowerCase()}`)}
            </Text>
            {isActive && <View style={styles.tabDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.bottleGreen,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabButton: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, color: '#8FA89C' },
  tabLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
});
