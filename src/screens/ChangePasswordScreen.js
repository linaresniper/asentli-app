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
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { PillButton } from '../components/ui';
import { useUpdatePassword } from '../hooks/useUserProfile';
import { clerkErrorMessage } from '../lib/clerkErrors';

export default function ChangePasswordScreen({ onBack, onSaved }) {
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
      next.currentPassword = 'Ingresá tu contraseña actual';
    }
    if (!newPassword || newPassword.length < 8) {
      next.newPassword = 'Debe tener al menos 8 caracteres';
    }
    if (newPassword !== confirmPassword) {
      next.confirmPassword = 'Las contraseñas no coinciden';
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
          Alert.alert('Listo', 'Tu contraseña se actualizó correctamente.', [
            { text: 'OK', onPress: onSaved },
          ]);
        },
        onError: (err) =>
          setFormError(clerkErrorMessage(err, 'No se pudo cambiar la contraseña.')),
      }
    );
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Change Password" onBack={onBack} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!hasPassword && (
            <Text style={styles.hint}>
              Tu cuenta usa Google para iniciar sesión y todavía no tiene contraseña. Si creás una
              acá, vas a poder entrar también con correo y contraseña.
            </Text>
          )}

          {hasPassword && (
            <>
              <Text style={styles.label}>Contraseña actual</Text>
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

          <Text style={[styles.label, { marginTop: 16 }]}>Nueva contraseña</Text>
          <TextInput
            style={[styles.input, errors.newPassword && styles.inputError]}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textLight}
            secureTextEntry={!showPasswords}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          {!!errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Confirmar nueva contraseña</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder="Repetí la contraseña"
            placeholderTextColor={colors.textLight}
            secureTextEntry={!showPasswords}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <TouchableOpacity onPress={() => setShowPasswords((v) => !v)} style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            </Text>
          </TouchableOpacity>

          {!!formError && <Text style={[styles.errorText, { marginTop: 6 }]}>{formError}</Text>}

          <PillButton
            label={updatePassword.isPending ? 'Guardando…' : 'Save password'}
            variant="orange"
            onPress={handleSave}
            style={{ marginTop: 20, opacity: updatePassword.isPending ? 0.6 : 1 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
