import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { Thumb } from '../components/ui';
import { useUpdateProfilePhoto } from '../hooks/useUserProfile';

const ACCOUNT_KEYS = [
  { key: 'editProfile', icon: 'person-outline', labelKey: 'editProfile' },
  { key: 'changePassword', icon: 'lock-closed-outline', labelKey: 'changePassword' },
  { key: 'card', icon: 'card-outline', labelKey: 'myCard' },
  { key: 'family', icon: 'people-outline', labelKey: 'familyMembers' },
];

const MONEY_KEYS = [
  { key: 'budgetDetails', icon: 'pie-chart-outline', labelKey: 'budgetDetails' },
  { key: 'purchaseHistory', icon: 'receipt-outline', labelKey: 'purchaseHistory' },
  { key: 'rewards', icon: 'gift-outline', labelKey: 'rewards' },
];

const PREFERENCES_KEYS = [
  { key: 'settings', icon: 'settings-outline', labelKey: 'settings' },
];

function MenuRow({ item, onPress, last }) {
  const { t } = useTranslation('profile');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={item.icon} size={20} color={colors.bottleGreenText} />
        <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ onBack, onNavigate, onLogout }) {
  const { t } = useTranslation('profile');
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();
  const { user } = useUser();
  const updatePhoto = useUpdateProfilePhoto();

  const go = (key) => onNavigate && onNavigate(key);

  const displayName = user?.fullName || user?.username || t('defaultDisplayName');
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
      Alert.alert(t('common:error'), t('signOutError'));
    }
  };

  const uploadPhoto = (uri) => {
    updatePhoto.mutate(uri, {
      onError: () => Alert.alert(t('common:error'), t('photoUpdateError')),
    });
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common:permissionNeeded'), t('cameraPermission'));
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) uploadPhoto(result.assets[0].uri);
    } catch {
      Alert.alert(t('common:error'), t('cameraError'));
    }
  };

  const fromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common:permissionNeeded'), t('galleryPermission'));
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) uploadPhoto(result.assets[0].uri);
    } catch {
      Alert.alert(t('common:error'), t('galleryError'));
    }
  };

  const handleChangePhoto = () => {
    if (updatePhoto.isPending) return;
    Alert.alert(t('changePhotoTitle'), t('changePhotoMessage'), [
      { text: t('takePhoto'), onPress: fromCamera },
      { text: t('chooseFromGallery'), onPress: fromLibrary },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('title')} onBack={onBack} onBell={() => go('notifications')} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarWrap} activeOpacity={0.8}>
            <Thumb
              icon="person"
              bg={colors.card}
              color={colors.bottleGreenText}
              size={60}
              radius={30}
              imageUri={user?.hasImage ? user.imageUrl : undefined}
            />
            <View style={styles.avatarBadge}>
              {updatePhoto.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{displayName}</Text>
            {!!displayEmail && <Text style={styles.email}>{displayEmail}</Text>}
          </View>
          <TouchableOpacity onPress={() => go('editProfile')}>
            <Ionicons name="create-outline" size={20} color={colors.bottleGreenText} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>{t('account')}</Text>
        <View style={styles.menuCard}>
          {ACCOUNT_KEYS.map((item, i) => (
            <MenuRow key={item.key} item={item} last={i === ACCOUNT_KEYS.length - 1} onPress={() => go(item.key)} />
          ))}
        </View>

        {/* Your money */}
        <Text style={styles.sectionTitle}>{t('yourMoney')}</Text>
        <View style={styles.menuCard}>
          {MONEY_KEYS.map((item, i) => (
            <MenuRow key={item.key} item={item} last={i === MONEY_KEYS.length - 1} onPress={() => go(item.key)} />
          ))}
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>{t('preferences')}</Text>
        <View style={styles.menuCard}>
          {PREFERENCES_KEYS.map((item, i) => (
            <MenuRow key={item.key} item={item} last={i === PREFERENCES_KEYS.length - 1} onPress={() => go(item.key)} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, signingOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>{signingOut ? t('signingOut') : t('signOut')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{t('version')}</Text>
      </ScrollView>

      <BottomNav active="Profile" onNavigate={onNavigate} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
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
  signOutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  version: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 16 },
});
