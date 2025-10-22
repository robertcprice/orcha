'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeColors {
  textColor: string;
  glowColor: string;
  flowColor1: string;
  flowColor2: string;
  flowColor3: string;
}

interface ThemeSettings {
  enableColorFlow: boolean;
  colorFlowSpeed: 'slow' | 'medium' | 'fast';
  glowIntensity: 'low' | 'medium' | 'high';
  enableScanlines: boolean;
  enableGridBackground: boolean;
}

interface ThemeContextType {
  colors: ThemeColors;
  settings: ThemeSettings;
  updateColors: (colors: Partial<ThemeColors>) => void;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultColors: ThemeColors = {
  textColor: '#e0e7ff',
  glowColor: '#00ff9f',
  flowColor1: '#00ff9f',
  flowColor2: '#00d4ff',
  flowColor3: '#a78bfa',
};

const defaultSettings: ThemeSettings = {
  enableColorFlow: false,
  colorFlowSpeed: 'medium',
  glowIntensity: 'medium',
  enableScanlines: false,
  enableGridBackground: true,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('algomind-theme-colors');
      if (saved) {
        try {
          return { ...defaultColors, ...JSON.parse(saved) };
        } catch (e) {
          return defaultColors;
        }
      }
    }
    return defaultColors;
  });

  const [settings, setSettings] = useState<ThemeSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('algomind-theme-settings');
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  const updateColors = (newColors: Partial<ThemeColors>) => {
    const updated = { ...colors, ...newColors };
    setColors(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('algomind-theme-colors', JSON.stringify(updated));
    }
  };

  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('algomind-theme-settings', JSON.stringify(updated));
    }
  };

  // Update CSS variables and gradient when colors/settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const gradientDiv = document.querySelector('.gradient-background') as HTMLElement;

      // Update CSS variables
      root.style.setProperty('--color-primary', colors.glowColor);
      root.style.setProperty('--color-primary-glow', `${colors.glowColor}80`);
      root.style.setProperty('--color-foreground', colors.textColor);

      // Update glow intensity
      const glowMap = {
        low: '0 0 5px',
        medium: '0 0 10px',
        high: '0 0 20px'
      };
      const glowIntensity = glowMap[settings.glowIntensity];
      root.style.setProperty('--text-glow-sm', `${glowIntensity} ${colors.glowColor}80`);
      root.style.setProperty('--text-glow-md', `${glowIntensity} ${colors.glowColor}80, 0 0 20px ${colors.glowColor}80`);
      root.style.setProperty('--text-glow-lg', `${glowIntensity} ${colors.glowColor}80, 0 0 20px ${colors.glowColor}80, 0 0 30px ${colors.glowColor}80`);

      // Update gradient background - keep transparent for wireframe look
      if (gradientDiv) {
        gradientDiv.style.setProperty('background', 'transparent');
      }

      // Apply color flow to body if enabled
      const body = document.body;
      if (settings.enableColorFlow) {
        // Create smooth 3-color gradient animation
        const speed = settings.colorFlowSpeed === 'slow' ? '20s' : settings.colorFlowSpeed === 'fast' ? '5s' : '10s';

        // Helper to blend two hex colors
        const blendColors = (color1: string, color2: string, ratio: number) => {
          const c1 = parseInt(color1.slice(1), 16);
          const c2 = parseInt(color2.slice(1), 16);

          const r1 = (c1 >> 16) & 0xff;
          const g1 = (c1 >> 8) & 0xff;
          const b1 = c1 & 0xff;

          const r2 = (c2 >> 16) & 0xff;
          const g2 = (c2 >> 8) & 0xff;
          const b2 = c2 & 0xff;

          const r = Math.round(r1 + (r2 - r1) * ratio);
          const g = Math.round(g1 + (g2 - g1) * ratio);
          const b = Math.round(b1 + (b2 - b1) * ratio);

          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        };

        // Create smooth keyframes with interpolated colors
        const keyframes: string[] = [];
        const steps = 30; // More steps = smoother transition

        for (let i = 0; i <= steps; i++) {
          const percent = (i / steps) * 100;
          let color: string;

          if (percent < 33.33) {
            // Blend from color1 to color2
            const ratio = (percent / 33.33);
            color = blendColors(colors.flowColor1, colors.flowColor2, ratio);
          } else if (percent < 66.66) {
            // Blend from color2 to color3
            const ratio = ((percent - 33.33) / 33.33);
            color = blendColors(colors.flowColor2, colors.flowColor3, ratio);
          } else {
            // Blend from color3 back to color1
            const ratio = ((percent - 66.66) / 33.34);
            color = blendColors(colors.flowColor3, colors.flowColor1, ratio);
          }

          keyframes.push(`${percent.toFixed(1)}% {
            --color-primary: ${color};
            --color-primary-glow: ${color}80;
            --color-border: ${color};
            --grid-color: ${color}26;
          }`);
        }

        // Create CSS animation with smooth color transitions
        const styleId = 'dynamic-color-flow';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
          @keyframes smoothColorFlow {
            ${keyframes.join('\n            ')}
          }

          :root.color-flow-active {
            animation: smoothColorFlow ${speed} linear infinite;
          }
        `;

        root.classList.add('color-flow-active');
      } else {
        root.classList.remove('color-flow-active');
      }

      // Apply scanline effect
      if (settings.enableScanlines) {
        body.classList.add('scanline-effect');
      } else {
        body.classList.remove('scanline-effect');
      }

      // Apply grid background to body
      if (settings.enableGridBackground) {
        body.classList.add('grid-enabled');
      } else {
        body.classList.remove('grid-enabled');
      }
    }
  }, [colors, settings]);

  return (
    <ThemeContext.Provider value={{ colors, settings, updateColors, updateSettings }}>
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
