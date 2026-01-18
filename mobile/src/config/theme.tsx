import React, { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    primary: string;
    background: string;
    text: string;
    secondary: string;
    border: string;
    error: string;
    card: string;
    mutedText: string;
    danger: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = {
    primary: '#007AFF',
    background: theme === 'light' ? '#ffffff' : '#000000',
    text: theme === 'light' ? '#000000' : '#ffffff',
    secondary: theme === 'light' ? '#f0f0f0' : '#333333',
    border: theme === 'light' ? '#e0e0e0' : '#444444',
    error: '#ff3b30',
    card: theme === 'light' ? '#ffffff' : '#1c1c1e',
    mutedText: theme === 'light' ? '#8e8e8e' : '#8e8e8e',
    danger: '#ff3b30',
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
