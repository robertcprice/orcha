"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

interface ThemeContextType {
  mode: 'dark' | 'light';
  colorScheme: 'blue' | 'purple' | 'green' | 'orange' | 'custom';
  customColors?: ThemeColors;
  setTheme: (mode: 'dark' | 'light', colorScheme: string, customColors?: ThemeColors) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_PRESETS = {
  blue: {
    primary: 'hsl(217.2, 91.2%, 59.8%)',
    secondary: 'hsl(217.2, 32.6%, 17.5%)',
    accent: 'hsl(210, 40%, 98%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 72%, 51%)',
  },
  purple: {
    primary: 'hsl(271, 91%, 65%)',
    secondary: 'hsl(271, 32%, 20%)',
    accent: 'hsl(280, 40%, 98%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 72%, 51%)',
  },
  green: {
    primary: 'hsl(142, 76%, 45%)',
    secondary: 'hsl(142, 32%, 20%)',
    accent: 'hsl(150, 40%, 98%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 72%, 51%)',
  },
  orange: {
    primary: 'hsl(25, 95%, 53%)',
    secondary: 'hsl(25, 32%, 20%)',
    accent: 'hsl(30, 40%, 98%)',
    success: 'hsl(142, 76%, 36%)',
    warning: 'hsl(38, 92%, 50%)',
    error: 'hsl(0, 72%, 51%)',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  const [colorScheme, setColorScheme] = useState<'blue' | 'purple' | 'green' | 'orange' | 'custom'>('blue');
  const [customColors, setCustomColors] = useState<ThemeColors | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load theme from localStorage on mount (only on client)
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('theme-mode') as 'dark' | 'light' | null;
      const savedScheme = localStorage.getItem('theme-scheme') as typeof colorScheme | null;
      const savedCustomColors = localStorage.getItem('theme-custom-colors');

      if (savedMode) setMode(savedMode);
      if (savedScheme) setColorScheme(savedScheme);
      if (savedCustomColors) {
        try {
          setCustomColors(JSON.parse(savedCustomColors));
        } catch (e) {
          console.error('Failed to parse custom colors:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    applyTheme(mode, colorScheme, customColors);
  }, [mode, colorScheme, customColors]);

  const applyTheme = (
    newMode: 'dark' | 'light',
    newScheme: string,
    newCustomColors?: ThemeColors
  ) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Set mode
    root.setAttribute('data-mode', newMode);
    root.classList.toggle('dark', newMode === 'dark');
    root.classList.toggle('light', newMode === 'light');

    // Get colors
    const colors =
      newScheme === 'custom' && newCustomColors
        ? newCustomColors
        : THEME_PRESETS[newScheme as keyof typeof THEME_PRESETS] || THEME_PRESETS.blue;

    // Apply colors as CSS variables
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-error', colors.error);

    // Set background colors based on mode
    if (newMode === 'dark') {
      root.style.setProperty('--color-background', 'hsl(222.2, 84%, 4.9%)');
      root.style.setProperty('--color-foreground', 'hsl(210, 40%, 98%)');
      root.style.setProperty('--color-border', 'hsl(217.2, 32.6%, 17.5%)');
      root.style.setProperty('--color-muted', 'hsl(217.2, 32.6%, 17.5%)');
      root.style.setProperty('--color-muted-foreground', 'hsl(215, 20.2%, 65.1%)');
    } else {
      root.style.setProperty('--color-background', 'hsl(0, 0%, 100%)');
      root.style.setProperty('--color-foreground', 'hsl(222.2, 84%, 4.9%)');
      root.style.setProperty('--color-border', 'hsl(214.3, 31.8%, 91.4%)');
      root.style.setProperty('--color-muted', 'hsl(210, 40%, 96.1%)');
      root.style.setProperty('--color-muted-foreground', 'hsl(215.4, 16.3%, 46.9%)');
    }
  };

  const setTheme = (
    newMode: 'dark' | 'light',
    newScheme: string,
    newCustomColors?: ThemeColors
  ) => {
    setMode(newMode);
    setColorScheme(newScheme as any);
    setCustomColors(newCustomColors);

    // Save to localStorage (only on client)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', newMode);
      localStorage.setItem('theme-scheme', newScheme);
      if (newCustomColors) {
        localStorage.setItem('theme-custom-colors', JSON.stringify(newCustomColors));
      } else {
        localStorage.removeItem('theme-custom-colors');
      }
    }
  };

  const toggleMode = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setTheme(newMode, colorScheme, customColors);
  };

  return (
    <ThemeContext.Provider value={{ mode, colorScheme, customColors, setTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
