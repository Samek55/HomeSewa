import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

const STORAGE_KEY = 'themeMode';

type ThemeMode = 'light' | 'dark';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
      } else {
        // First-ever launch — seed from the device's own theme so a phone
        // already set to dark mode doesn't open HomeSewa looking jarringly light.
        setMode(systemScheme === 'dark' ? 'dark' : 'light');
      }
    });
    // Only ever runs once on mount — later system-theme changes don't override
    // an explicit in-app choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  if (mode === null) return null; // brief blank frame instead of a light-then-dark flash

  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
