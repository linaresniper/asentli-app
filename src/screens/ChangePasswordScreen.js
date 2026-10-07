import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { PillButton } from '../components/ui';
import { useUpdatePassword } from '../hooks/useUserProfile';
import { clerkErrorMessage } from '../lib/clerkErrors';

export default function ChangePasswordScreen({ onBack, onSaved }) {
  const { t } = useTranslation('profileEdit');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useUser();
  const updatePassword = useUpdatePassword();
  const hasPassword = !!user?.passwordEnabled;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const validate = () => {
    const next = {};
    if (hasPassword && !currentPassword) {
      next.currentPassword = t('changePassword.currentPasswordRequired');
    }
    if (!newPassword || newPassword.length < 8) {
      next.newPassword = t('changePassword.newPasswordTooShort');
    }
    if (newPassword !== confirmPassword) {
      next.confirmPassword = t('changePassword.passwordsDontMatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    setFormError('');
    if (!validate()) return;
    updatePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert(t('changePassword.successTitle'), t('changePassword.successMessage'), [
            { text: t('common:ok'), onPress: onSaved },
          ]);
        },
        onError: (err) =>
          setFormError(clerkErrorMessage(err, t('changePassword.genericError'))),
      }
    );
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('changePassword.title')} onBack={onBack} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!hasPassword && (
            <Text style={styles.hint}>{t('changePassword.noPasswordHint')}</Text>
          )}

          {hasPassword && (
            <>
              <Text style={styles.label}>{t('changePassword.currentPasswordLabel')}</Text>
              <TextInput
                style={[styles.input, errors.currentPassword && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPasswords}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              {!!errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
            </>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>{t('changePassword.newPasswordLabel')}</Text>
          <TextInput
            style={[styles.input, errors.newPassword && styles.inputError]}
            placeholder={t('changePassword.newPasswordPlaceholder')}
            placeholderTextColor={colors.textLight}
            secureTextEntry={!showPasswords}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          {!!errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>{t('changePassword.confirmPasswordLabel')}</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder={t('changePassword.confirmPasswordPlaceholder')}
            placeholderTextColor={colors.textLight}
            secureTextEntry={!showPasswords}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <TouchableOpacity onPress={() => setShowPasswords((v) => !v)} style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {showPasswords ? t('changePassword.hidePasswords') : t('changePassword.showPasswords')}
            </Text>
          </TouchableOpacity>

          {!!formError && <Text style={[styles.errorText, { marginTop: 6 }]}>{formError}</Text>}

          <PillButton
            label={updatePassword.isPending ? t('changePassword.saving') : t('changePassword.savePassword')}
            variant="orange"
            onPress={handleSave}
            style={{ marginTop: 20, opacity: updatePassword.isPending ? 0.6 : 1 }}
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
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 6 },
  hint: { fontSize: 13, color: colors.textLight, lineHeight: 19, marginBottom: 20 },
  toggleRow: { marginTop: 10 },
  toggleText: { fontSize: 12, color: colors.link, fontWeight: '600' },
});
