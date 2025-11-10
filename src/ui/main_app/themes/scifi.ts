/**
 * Dark Sci-Fi Theme
 * Cyberpunk aesthetic inspired by Tron, Blade Runner, and cybernetic interfaces
 * Deep blacks, electric blues/teals, neon glows, holographic effects
 */

export const scifiTheme = {
  id: 'scifi',
  name: 'Dark Sci-Fi',

  colors: {
    // Background layers
    background: {
      primary: '#0A0A0A',      // Deep black
      secondary: '#0F0F0F',    // Slightly lighter
      tertiary: '#1A1A1A',     // Card backgrounds
      overlay: 'rgba(10, 10, 10, 0.95)', // Modal overlays
    },

    // Foreground/Text
    text: {
      primary: '#FFFFFF',      // Pure white
      secondary: '#A0A0A0',    // Gray
      tertiary: '#707070',     // Darker gray
      disabled: '#404040',     // Disabled state
      inverse: '#0A0A0A',      // Text on light backgrounds
    },

    // Accent colors (Electric/Neon)
    accent: {
      primary: '#00D9FF',      // Electric cyan
      secondary: '#00FFA3',    // Electric teal
      success: '#00FF88',      // Neon green
      warning: '#FFB800',      // Electric amber
      error: '#FF0055',        // Hot pink/red
      info: '#8B5CF6',         // Electric purple
    },

    // Interactive elements
    interactive: {
      default: '#00D9FF',
      hover: '#00FFA3',
      active: '#00B8D4',
      disabled: '#404040',
      focus: 'rgba(0, 217, 255, 0.5)',
    },

    // Glass/Translucent effects
    glass: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.08)',
      heavy: 'rgba(255, 255, 255, 0.12)',
      border: 'rgba(0, 217, 255, 0.3)',
    },

    // Glows & Neon effects
    glow: {
      cyan: '0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.3)',
      teal: '0 0 20px rgba(0, 255, 163, 0.5), 0 0 40px rgba(0, 255, 163, 0.3)',
      purple: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
      pink: '0 0 20px rgba(255, 0, 85, 0.5), 0 0 40px rgba(255, 0, 85, 0.3)',
      subtle: '0 0 10px rgba(0, 217, 255, 0.3)',
      intense: '0 0 30px rgba(0, 217, 255, 0.7), 0 0 60px rgba(0, 217, 255, 0.5)',
    },

    // Shadows (with glow)
    shadow: {
      sm: '0 2px 4px rgba(0, 217, 255, 0.1)',
      md: '0 4px 8px rgba(0, 217, 255, 0.15)',
      lg: '0 10px 20px rgba(0, 217, 255, 0.2)',
      xl: '0 20px 40px rgba(0, 217, 255, 0.25)',
    },

    // Agent node colors
    agent: {
      orchestrator: '#00D9FF',
      active: '#00FFA3',
      planning: '#FFB800',
      idle: '#404040',
      complete: '#00FF88',
      error: '#FF0055',
    },
  },

  typography: {
    // Font families
    fonts: {
      primary: '"Rajdhani", -apple-system, system-ui, sans-serif',
      mono: '"Share Tech Mono", "Fira Code", monospace',
    },

    // Font sizes
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },

    // Font weights
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    // Line heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },

  borderRadius: {
    sm: '2px',
    md: '4px',
    lg: '6px',
    xl: '8px',
    full: '9999px',
  },

  animation: {
    // Durations
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '400ms',
    },

    // Easing functions (sharper, more instant)
    easing: {
      default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      in: 'cubic-bezier(0.4, 0.0, 1, 1)',
      out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },

    // Node animations (more intense)
    node: {
      spawn: {
        duration: '300ms',
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        scale: { from: 0, to: 1 },
        opacity: { from: 0, to: 1 },
        glow: { from: '0 0 0 rgba(0, 217, 255, 0)', to: '0 0 20px rgba(0, 217, 255, 0.8)' },
      },
      pulse: {
        duration: '1.5s',
        easing: 'ease-in-out',
        scale: { from: 0.9, to: 1.1 },
        glow: { from: '0 0 10px rgba(0, 217, 255, 0.3)', to: '0 0 30px rgba(0, 217, 255, 0.8)' },
      },
      active: {
        duration: '0.8s',
        easing: 'ease-in-out',
        glow: '0 0 30px rgba(0, 255, 163, 0.8)',
      },
    },

    // Special effects
    scanline: {
      duration: '8s',
      easing: 'linear',
    },
    glitch: {
      duration: '0.3s',
      easing: 'steps(2, end)',
    },
  },

  blur: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
  },

  // Component-specific styles
  components: {
    panel: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(0, 217, 255, 0.3)',
      borderRadius: '4px',
      blur: '4px',
      shadow: '0 4px 8px rgba(0, 217, 255, 0.15)',
      glow: '0 0 20px rgba(0, 217, 255, 0.1)',
    },

    button: {
      primary: {
        background: 'rgba(0, 217, 255, 0.15)',
        hover: 'rgba(0, 217, 255, 0.25)',
        active: 'rgba(0, 217, 255, 0.35)',
        text: '#00D9FF',
        border: '#00D9FF',
        glow: '0 0 20px rgba(0, 217, 255, 0.5)',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.05)',
        hover: 'rgba(255, 255, 255, 0.08)',
        active: 'rgba(255, 255, 255, 0.12)',
        text: '#FFFFFF',
        border: 'rgba(255, 255, 255, 0.2)',
      },
    },

    input: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(0, 217, 255, 0.3)',
      focus: '#00D9FF',
      placeholder: '#707070',
      glow: '0 0 10px rgba(0, 217, 255, 0.3)',
    },

    terminal: {
      background: 'rgba(10, 10, 10, 0.95)',
      text: '#00FFA3',
      accent: '#00D9FF',
      border: 'rgba(0, 217, 255, 0.5)',
      glow: '0 0 20px rgba(0, 217, 255, 0.2)',
      scanline: 'rgba(0, 217, 255, 0.05)',
    },
  },

  // Special effects configuration
  effects: {
    scanlines: true,
    crtCurvature: false,
    glitchIntensity: 0.1,
    particleEffects: true,
  },
};

export type ThemeConfig = typeof scifiTheme;
