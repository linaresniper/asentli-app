import React, { createContext, useContext, useMemo } from 'react';
import { lightColors, darkColors } from './colors';
import { usePreferences } from '../context/PreferencesProvider';

const ThemeContext = createContext({ colors: lightColors, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const { theme, setTheme } = usePreferences();
  const isDark = theme === 'dark';

  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      toggleTheme: () => setTheme(isDark ? 'light' : 'dark'),
    }),
    [isDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
