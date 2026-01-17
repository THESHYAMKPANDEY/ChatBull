import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  danger: string;
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
  ready: boolean;
};

const STORAGE_KEY = 'chatbull.theme.mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getColors = (mode: ThemeMode): ThemeColors => {
  if (mode === 'dark') {
    return {
      background: '#000',
      card: '#111',
      text: '#fff',
      mutedText: '#a1a1aa',
      border: '#222',
      primary: '#0095f6',
      danger: '#ff453a',
    };
  }

  return {
    background: '#fff',
    card: '#fff',
    text: '#000',
    mutedText: '#8e8e8e',
    border: '#efefef',
    primary: '#0095f6',
    danger: '#ff3b30',
  };
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') setModeState(stored);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {});
  };

  const toggle = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      colors: getColors(mode),
      toggle,
      setMode,
      ready,
    };
  }, [mode, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
};

