import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from '../locales/en/common.json';
import commonEs from '../locales/es/common.json';
import authEn from '../locales/en/auth.json';
import authEs from '../locales/es/auth.json';
import homeEn from '../locales/en/home.json';
import homeEs from '../locales/es/home.json';
import budgetEn from '../locales/en/budget.json';
import budgetEs from '../locales/es/budget.json';
import profileEn from '../locales/en/profile.json';
import profileEs from '../locales/es/profile.json';
import profileEditEn from '../locales/en/profileEdit.json';
import profileEditEs from '../locales/es/profileEdit.json';
import shoppingEn from '../locales/en/shopping.json';
import shoppingEs from '../locales/es/shopping.json';
import settingsEn from '../locales/en/settings.json';
import settingsEs from '../locales/es/settings.json';
import aiAssistantEn from '../locales/en/aiAssistant.json';
import aiAssistantEs from '../locales/es/aiAssistant.json';
import notificationsEn from '../locales/en/notifications.json';
import notificationsEs from '../locales/es/notifications.json';

// Inglés por defecto (ver PreferencesProvider) — el idioma real activo se
// pisa con i18n.changeLanguage() apenas se lee la preferencia guardada.
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'auth',
    'home',
    'budget',
    'profile',
    'profileEdit',
    'shopping',
    'settings',
    'aiAssistant',
    'notifications',
  ],
  resources: {
    en: {
      common: commonEn,
      auth: authEn,
      home: homeEn,
      budget: budgetEn,
      profile: profileEn,
      profileEdit: profileEditEn,
      shopping: shoppingEn,
      settings: settingsEn,
      aiAssistant: aiAssistantEn,
      notifications: notificationsEn,
    },
    es: {
      common: commonEs,
      auth: authEs,
      home: homeEs,
      budget: budgetEs,
      profile: profileEs,
      profileEdit: profileEditEs,
      shopping: shoppingEs,
      settings: settingsEs,
      aiAssistant: aiAssistantEs,
      notifications: notificationsEs,
    },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
