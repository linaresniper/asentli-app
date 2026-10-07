import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { PillButton } from '../components/ui';
import { useProfile, useSetProfile, useUpdateName } from '../hooks/useUserProfile';
import { clerkErrorMessage } from '../lib/clerkErrors';

export default function EditProfileScreen({ onBack, onSaved }) {
  const { t } = useTranslation('profileEdit');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateName = useUpdateName();
  const setProfile = useSetProfile();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const prefilledPhone = useRef(false);

  // Prefill once, when the saved phone first loads.
  useEffect(() => {
    if (prefilledPhone.current || profileLoading || !profile) return;
    prefilledPhone.current = true;
    setPhone(profile.phone || '');
  }, [profileLoading, profile]);

  const email =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';

  const saving = updateName.isPending || setProfile.isPending;

  const handleSave = async () => {
    setFormError('');
    try {
      await Promise.all([
        updateName.mutateAsync({ firstName, lastName }),
        setProfile.mutateAsync({ phone }),
      ]);
      onSaved?.();
    } catch (err) {
      setFormError(clerkErrorMessage(err, t('editProfile.genericSaveError')));
    }
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('editProfile.title')} onBack={onBack} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('editProfile.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editProfile.namePlaceholder')}
            placeholderTextColor={colors.textLight}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>{t('editProfile.lastNameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editProfile.lastNamePlaceholder')}
            placeholderTextColor={colors.textLight}
            value={lastName}
            onChangeText={setLastName}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>{t('editProfile.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('editProfile.phonePlaceholder')}
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>{t('editProfile.emailLabel')}</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>{email}</Text>
          </View>
          <Text style={styles.hint}>{t('editProfile.emailHint')}</Text>

          {!!formError && <Text style={styles.errorText}>{formError}</Text>}

          <PillButton
            label={saving ? t('editProfile.saving') : t('editProfile.saveChanges')}
            variant="orange"
            onPress={handleSave}
            style={{ marginTop: 24, opacity: saving ? 0.6 : 1 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  inputDisabled: { backgroundColor: colors.border, opacity: 0.7 },
  disabledText: { fontSize: 14, color: colors.textLight },
  hint: { fontSize: 11, color: colors.textLight, marginTop: 6 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 16 },
});
