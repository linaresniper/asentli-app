// src/screens/TermsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

export default function TermsScreen({ onAccept }) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useUser();
  const [accepted, setAccepted] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!accepted || saving) return;
    setError('');
    setSaving(true);
    try {
      // Persisted on the Clerk user so Terms is skipped on every future login.
      await user?.update({
        unsafeMetadata: {
          ...(user?.unsafeMetadata ?? {}),
          acceptedTerms: true,
          acceptedTermsAt: new Date().toISOString(),
        },
      });
      onAccept?.();
    } catch (e) {
      setError(t('terms.saveError'));
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('terms.title')}</Text>

      <View style={styles.iconCircle}>
        <Text style={styles.iconEmoji}>⚖️</Text>
      </View>

      <Text style={styles.subtitle}>{t('terms.intro')}</Text>

      <View style={styles.box}>
        <Text style={styles.sectionTitle}>{t('terms.section1Title')}</Text>
        <Text style={styles.sectionText}>{t('terms.section1Text')}</Text>

        <Text style={styles.sectionTitle}>{t('terms.section2Title')}</Text>
        <Text style={styles.sectionText}>{t('terms.section2Text')}</Text>

        <Text style={styles.sectionTitle}>{t('terms.section3Title')}</Text>
        <Text style={styles.sectionText}>{t('terms.section3Text')}</Text>

        <Text style={styles.sectionTitle}>{t('terms.section4Title')}</Text>
        <Text style={styles.sectionText}>{t('terms.section4Text')}</Text>

        <Text style={styles.sectionTitle}>{t('terms.section5Title')}</Text>
        <Text style={styles.sectionText}>{t('terms.section5Text')}</Text>
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAccepted(!accepted)}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
        <Text style={styles.checkboxLabel}>{t('terms.acceptCheckbox')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setDontShowAgain(!dontShowAgain)}
      >
        <View
          style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}
        />
        <Text style={styles.checkboxLabel}>{t('terms.dontShowAgain')}</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!accepted || saving) && styles.continueButtonDisabled,
        ]}
        disabled={!accepted || saving}
        onPress={handleContinue}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.continueText}>{t('terms.continueButton')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
    backgroundColor: colors.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.bottleGreenText,
    textAlign: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.lightGreen,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 28 },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 19,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});