'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { minimalistTheme } from '../themes/minimalist';
import { scifiTheme } from '../themes/scifi';

export type ThemeId = 'minimalist' | 'scifi';
export type Theme = typeof minimalistTheme;

interface ThemeContextType {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'orchestrator-theme';
const DEFAULT_THEME: ThemeId = 'scifi';

const themes = {
  minimalist: minimalistTheme,
  scifi: scifiTheme,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
  const [theme, setThemeState] = useState<Theme>(themes[DEFAULT_THEME]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (savedTheme && themes[savedTheme]) {
      setThemeId(savedTheme);
      setThemeState(themes[savedTheme]);
      applyThemeToDOM(themes[savedTheme], savedTheme);
    } else {
      applyThemeToDOM(theme, themeId);
    }
  }, []);

  const setTheme = (newThemeId: ThemeId) => {
    const newTheme = themes[newThemeId];
    setThemeId(newThemeId);
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newThemeId);
    applyThemeToDOM(newTheme, newThemeId);
  };

  const toggleTheme = () => {
    const newThemeId = themeId === 'minimalist' ? 'scifi' : 'minimalist';
    setTheme(newThemeId);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

function applyThemeToDOM(theme: Theme, themeId: ThemeId) {
  const root = document.documentElement;

  Object.entries(theme.colors.background).forEach(([key, value]) => {
    root.style.setProperty(`--bg-${key}`, value);
  });
  Object.entries(theme.colors.text).forEach(([key, value]) => {
    root.style.setProperty(`--text-${key}`, value);
  });
  Object.entries(theme.colors.accent).forEach(([key, value]) => {
    root.style.setProperty(`--accent-${key}`, value);
  });

  root.setAttribute('data-theme', themeId);
  root.style.setProperty('color-scheme', themeId === 'minimalist' ? 'light' : 'dark');
}
