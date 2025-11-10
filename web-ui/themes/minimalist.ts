/**
 * Minimalist Apple Theme
 * Clean, refined aesthetic inspired by Apple's design language
 * Soft colors, subtle animations, breathing room
 */

export const minimalistTheme = {
  id: 'minimalist',
  name: 'Minimalist',

  colors: {
    // Background layers
    background: {
      primary: '#FAFAFA',      // Main background - soft white
      secondary: '#F5F5F5',    // Secondary panels
      tertiary: '#ECECEC',     // Tertiary elements
      overlay: 'rgba(255, 255, 255, 0.95)', // Modal overlays
    },

    // Foreground/Text
    text: {
      primary: '#1D1D1F',      // Main text - near black
      secondary: '#6E6E73',    // Secondary text - gray
      tertiary: '#86868B',     // Tertiary text - light gray
      disabled: '#C7C7CC',     // Disabled state
      inverse: '#FFFFFF',      // Text on dark backgrounds
    },

    // Accent colors
    accent: {
      primary: '#007AFF',      // Apple blue
      secondary: '#5856D6',    // Purple
      success: '#34C759',      // Green
      warning: '#FF9500',      // Orange
      error: '#FF3B30',        // Red
      info: '#00C7BE',         // Teal
    },

    // Interactive elements
    interactive: {
      default: '#007AFF',
      hover: '#0051D5',
      active: '#003D99',
      disabled: '#C7C7CC',
      focus: 'rgba(0, 122, 255, 0.3)',
    },

    // Glass/Translucent effects
    glass: {
      light: 'rgba(255, 255, 255, 0.8)',
      medium: 'rgba(255, 255, 255, 0.6)',
      heavy: 'rgba(255, 255, 255, 0.95)',
      border: 'rgba(0, 0, 0, 0.1)',
    },

    // Shadows
    shadow: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
      md: '0 4px 6px rgba(0, 0, 0, 0.08)',
      lg: '0 10px 20px rgba(0, 0, 0, 0.10)',
      xl: '0 20px 40px rgba(0, 0, 0, 0.12)',
    },

    // Agent node colors
    agent: {
      orchestrator: '#007AFF',
      active: '#34C759',
      planning: '#FF9500',
      idle: '#86868B',
      complete: '#34C759',
      error: '#FF3B30',
    },
  },

  typography: {
    // Font families
    fonts: {
      primary: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, system-ui, sans-serif',
      mono: '"SF Mono", "Fira Code", "Monaco", "Consolas", monospace',
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
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  animation: {
    // Durations
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },

    // Easing functions
    easing: {
      default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0.0, 1, 1)',
      out: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy spring
    },

    // Node animations
    node: {
      spawn: {
        duration: '400ms',
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        scale: { from: 0, to: 1 },
        opacity: { from: 0, to: 1 },
      },
      pulse: {
        duration: '2s',
        easing: 'ease-in-out',
        scale: { from: 0.95, to: 1.05 },
      },
      active: {
        duration: '1s',
        easing: 'ease-in-out',
      },
    },
  },

  blur: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Component-specific styles
  components: {
    panel: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(0, 0, 0, 0.08)',
      borderRadius: '12px',
      blur: '8px',
      shadow: '0 4px 6px rgba(0, 0, 0, 0.08)',
    },

    button: {
      primary: {
        background: '#007AFF',
        hover: '#0051D5',
        active: '#003D99',
        text: '#FFFFFF',
      },
      secondary: {
        background: 'rgba(0, 0, 0, 0.05)',
        hover: 'rgba(0, 0, 0, 0.08)',
        active: 'rgba(0, 0, 0, 0.12)',
        text: '#1D1D1F',
      },
    },

    input: {
      background: 'rgba(255, 255, 255, 0.6)',
      border: 'rgba(0, 0, 0, 0.12)',
      focus: '#007AFF',
      placeholder: '#86868B',
    },

    terminal: {
      background: 'rgba(255, 255, 255, 0.95)',
      text: '#1D1D1F',
      accent: '#007AFF',
      border: 'rgba(0, 0, 0, 0.1)',
    },
  },
};

export type ThemeConfig = typeof minimalistTheme;
