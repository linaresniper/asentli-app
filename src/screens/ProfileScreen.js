import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { Thumb } from '../components/ui';
import { useUpdateProfilePhoto } from '../hooks/useUserProfile';

const ACCOUNT = [
  { key: 'editProfile', icon: 'person-outline', label: 'Edit profile' },
  { key: 'changePassword', icon: 'lock-closed-outline', label: 'Change password' },
  { key: 'card', icon: 'card-outline', label: 'My Card' },
  { key: 'family', icon: 'people-outline', label: 'Family members' },
];

const MONEY = [
  { key: 'budgetDetails', icon: 'pie-chart-outline', label: 'Budget Details' },
  { key: 'purchaseHistory', icon: 'receipt-outline', label: 'Purchase History' },
  { key: 'rewards', icon: 'gift-outline', label: 'Rewards (Cashback)' },
];

function MenuRow({ item, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={item.icon} size={20} color={colors.bottleGreen} />
        <Text style={styles.rowLabel}>{item.label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ onBack, onNavigate, onLogout }) {
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();
  const { user } = useUser();
  const updatePhoto = useUpdateProfilePhoto();

  const go = (key) => onNavigate && onNavigate(key);

  const displayName = user?.fullName || user?.username || 'Tu familia';
  const displayEmail =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      onLogout?.(); // auth gate returns to Welcome on its own
    } catch (e) {
      setSigningOut(false);
      Alert.alert('Error', 'No se pudo cerrar la sesión. Intentá de nuevo.');
    }
  };

  const uploadPhoto = (uri) => {
    updatePhoto.mutate(uri, {
      onError: () =>
        Alert.alert('Error', 'No se pudo actualizar la foto de perfil. Intentá de nuevo.'),
    });
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Activá el acceso a la cámara en los ajustes del teléfono.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const fromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Activá el acceso a tus fotos en los ajustes del teléfono.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) uploadPhoto(result.assets[0].uri);
  };

  const handleChangePhoto = () => {
    if (updatePhoto.isPending) return;
    Alert.alert('Foto de perfil', 'Elegí una opción', [
      { text: 'Tomar foto', onPress: fromCamera },
      { text: 'Elegir de galería', onPress: fromLibrary },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Profile" onBack={onBack} onBell={() => go('notifications')} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarWrap} activeOpacity={0.8}>
            <Thumb
              icon="person"
              bg={colors.card}
              color={colors.bottleGreen}
              size={60}
              radius={30}
              imageUri={user?.hasImage ? user.imageUrl : undefined}
            />
            <View style={styles.avatarBadge}>
              {updatePhoto.isPending ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Ionicons name="camera" size={13} color={colors.card} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>
            {!!displayEmail && <Text style={styles.email}>{displayEmail}</Text>}
          </View>
          <TouchableOpacity onPress={() => go('editProfile')}>
            <Ionicons name="create-outline" size={20} color={colors.bottleGreen} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {ACCOUNT.map((item, i) => (
            <MenuRow key={item.key} item={item} last={i === ACCOUNT.length - 1} onPress={() => go(item.key)} />
          ))}
        </View>

        {/* Your money */}
        <Text style={styles.sectionTitle}>Your money</Text>
        <View style={styles.menuCard}>
          {MONEY.map((item, i) => (
            <MenuRow key={item.key} item={item} last={i === MONEY.length - 1} onPress={() => go(item.key)} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, signingOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.card} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>{signingOut ? 'Cerrando sesión…' : 'Sign out'}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Asentli v1.0.0</Text>
      </ScrollView>

      <BottomNav active="Profile" onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.card },
  content: { padding: 20, paddingBottom: 30 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.lightGreen,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  avatarWrap: { position: 'relative' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.bottleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.lightGreen,
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  email: { fontSize: 12, color: colors.textLight, marginTop: 3 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  menuCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },

  signOutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.card, fontSize: 15, fontWeight: '700' },

  version: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 16 },
});
