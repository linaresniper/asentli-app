import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

// Un solo blob persistido para ambas preferencias (idioma + tema), así no hay
// dos mecanismos de storage compitiendo. Default explícito: inglés + claro,
// sin mirar el idioma del dispositivo (la app pide "inglés por defecto").
const STORAGE_KEY = 'asentli:preferences';
const DEFAULT_PREFERENCES = { language: 'en', theme: 'light' };

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let next = DEFAULT_PREFERENCES;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) next = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
      } catch {
        // Storage no disponible o corrupta — seguimos con el default.
      }
      i18n.changeLanguage(next.language);
      setPreferences(next);
      setIsLoaded(true);
    })();
  }, []);

  const persist = useCallback((next) => {
    setPreferences(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setLanguage = useCallback(
    (language) => {
      i18n.changeLanguage(language);
      persist({ ...preferences, language });
    },
    [preferences, persist]
  );

  const setTheme = useCallback(
    (theme) => {
      persist({ ...preferences, theme });
    },
    [preferences, persist]
  );

  return (
    <PreferencesContext.Provider
      value={{ ...preferences, isLoaded, setLanguage, setTheme }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
