/**
 * Design Tokens for Smart Market Solutions Orchestration System
 *
 * Design Philosophy:
 * - Dark palette base (#0a0a0a to #1a1a1a)
 * - Full liquid glass: soft frosted translucent panels with backdrop blur
 * - Brown & Blue color scheme: Taupe/beige + sky blues
 * - Rounded corners, subtle borders, high transparency
 */

export const designTokens = {
  /**
   * Color Palette - Brown & Blue Liquid Glass
   */
  colors: {
    // Background layers (keep dark base)
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      tertiary: '#0f0f0f',
    },

    // Glass panel overlays (higher opacity for softer look)
    glass: {
      dark: 'rgba(26, 26, 26, 0.85)',
      medium: 'rgba(26, 26, 26, 0.7)',
      light: 'rgba(26, 26, 26, 0.5)',
      border: 'rgba(210, 180, 140, 0.2)', // Taupe tinted border
    },

    // Soft structural colors (no more brutalist!)
    structure: {
      border: {
        primary: 'rgba(210, 180, 140, 0.3)', // Soft taupe
        secondary: 'rgba(96, 165, 250, 0.3)', // Soft sky blue
        tertiary: 'rgba(193, 154, 107, 0.2)', // Dim beige
      },
      surface: {
        primary: 'rgba(26, 26, 26, 0.8)',
        secondary: 'rgba(38, 38, 38, 0.7)',
      },
      bg: {
        primary: '#0a0a0a',
        secondary: '#1a1a1a',
        tertiary: '#0f0f0f',
      },
    },

    // Accent colors - Browns & Blues
    accent: {
      // Primary blues (sky blue spectrum)
      blue: '#60a5fa',         // Sky blue
      blueLight: '#93c5fd',    // Light sky blue
      blueDark: '#3b82f6',     // Deep sky blue
      blueVibrant: '#2563eb',  // Vibrant blue

      // Secondary browns (taupe/beige spectrum)
      brown: '#D2B48C',        // Taupe
      brownLight: '#dcc9ab',   // Light taupe
      brownDark: '#C19A6B',    // Beige
      brownWarm: '#b8956a',    // Warm beige

      // Keep some legacy aliases for compatibility
      cyan: '#60a5fa',         // Map to sky blue
      magenta: '#D2B48C',      // Map to taupe
      purple: '#93c5fd',       // Map to light blue
      yellow: '#dcc9ab',       // Map to light taupe
      green: '#60a5fa',        // Map to blue
    },

    // Semantic colors (brown/blue themed)
    semantic: {
      success: '#60a5fa',      // Sky blue for success
      error: '#ef4444',        // Keep red for errors
      warning: '#D2B48C',      // Taupe for warnings
      info: '#93c5fd',         // Light blue for info
    },

    // Text colors (softer whites/grays)
    text: {
      primary: '#f5f5f5',      // Soft white
      secondary: '#d1d5db',    // Light gray
      tertiary: '#9ca3af',     // Medium gray
      disabled: '#6b7280',     // Dark gray
      accent: '#60a5fa',       // Blue accent text
      brown: '#D2B48C',        // Brown accent text
    },

    // Agent-specific colors (adjusted to brown/blue palette)
    agent: {
      claude: '#93c5fd',       // Light sky blue
      codex: '#3b82f6',        // Deep blue
      chatgpt: '#60a5fa',      // Sky blue
      deepseek: '#2563eb',     // Vibrant blue
      grok: '#D2B48C',         // Taupe
      gemini: '#C19A6B',       // Beige
    },
  },

  /**
   * Typography (keep existing)
   */
  typography: {
    fonts: {
      header: 'var(--font-rajdhani)',
      body: 'var(--font-share-tech-mono)',
      mono: 'var(--font-share-tech-mono)',
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: '1.2',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  /**
   * Spacing System
   */
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    '5xl': '8rem',
  },

  /**
   * Border Styles - Soft Liquid Glass
   */
  borders: {
    width: {
      thick: '2px',      // Reduced from 4px
      medium: '1px',     // Reduced from 2px
      thin: '1px',       // Keep thin
    },
    style: 'solid',
    radius: '12px',      // CHANGED: Soft rounded corners!
    radiusLg: '16px',    // Large radius
    radiusSm: '8px',     // Small radius
    colors: {
      primary: 'rgba(210, 180, 140, 0.3)',  // Taupe
      secondary: 'rgba(96, 165, 250, 0.3)', // Sky blue
      accent: 'rgba(60a5fa, 0.5)',          // Bright sky blue
    },
  },

  /**
   * Glass Effects - Enhanced Liquid Glass
   */
  glass: {
    blur: {
      sm: 'blur(8px)',
      md: 'blur(16px)',
      lg: 'blur(24px)',
      xl: 'blur(32px)',   // Extra blur for softer effect
    },
    opacity: {
      light: 0.5,
      medium: 0.7,
      dark: 0.85,         // Higher opacity
      opaque: 0.95,       // Almost opaque
    },
    gradient: {
      subtle: 'linear-gradient(135deg, rgba(26, 26, 26, 0.85) 0%, rgba(26, 26, 26, 0.7) 100%)',
      accent: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(210, 180, 140, 0.15) 100%)', // Blue to brown
      blueBrown: 'linear-gradient(90deg, rgba(96, 165, 250, 0.2) 0%, rgba(210, 180, 140, 0.2) 100%)',
    },
  },

  /**
   * Shadows - Soft Glows
   */
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glassHover: '0 12px 40px rgba(0, 0, 0, 0.5)',
    glow: {
      blue: '0 0 24px rgba(96, 165, 250, 0.3)',
      blueStrong: '0 0 32px rgba(96, 165, 250, 0.5)',
      brown: '0 0 24px rgba(210, 180, 140, 0.3)',
      brownStrong: '0 0 32px rgba(210, 180, 140, 0.5)',
      white: '0 0 20px rgba(255, 255, 255, 0.2)',
    },
    soft: '0 4px 16px rgba(0, 0, 0, 0.2)',
    medium: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },

  /**
   * Transitions & Animations
   */
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
    smooth: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  /**
   * Breakpoints
   */
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  /**
   * Z-index layers
   */
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    modal: 30,
    popover: 40,
    tooltip: 50,
  },

  /**
   * Component-specific tokens - Soft Liquid Glass
   */
  components: {
    panel: {
      glass: {
        background: 'rgba(26, 26, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(210, 180, 140, 0.2)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      glassHover: {
        border: '1px solid rgba(96, 165, 250, 0.4)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
      },
    },
    button: {
      primary: {
        background: 'rgba(96, 165, 250, 0.2)',
        color: '#60a5fa',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        hover: {
          background: 'rgba(96, 165, 250, 0.3)',
          border: '1px solid rgba(96, 165, 250, 0.6)',
          boxShadow: '0 0 24px rgba(96, 165, 250, 0.3)',
        },
      },
      secondary: {
        background: 'rgba(210, 180, 140, 0.15)',
        color: '#D2B48C',
        border: '1px solid rgba(210, 180, 140, 0.3)',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        hover: {
          background: 'rgba(210, 180, 140, 0.25)',
          border: '1px solid rgba(210, 180, 140, 0.5)',
          boxShadow: '0 0 24px rgba(210, 180, 140, 0.3)',
        },
      },
      accent: {
        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(210, 180, 140, 0.25) 100%)',
        color: '#f5f5f5',
        border: '1px solid rgba(96, 165, 250, 0.4)',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        hover: {
          background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.35) 0%, rgba(210, 180, 140, 0.35) 100%)',
          boxShadow: '0 0 28px rgba(96, 165, 250, 0.4)',
        },
      },
    },
    input: {
      background: 'rgba(26, 26, 26, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(210, 180, 140, 0.3)',
      borderRadius: '8px',
      borderFocus: '1px solid rgba(96, 165, 250, 0.5)',
      color: '#f5f5f5',
      placeholder: '#9ca3af',
    },
    card: {
      background: 'rgba(26, 26, 26, 0.8)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(210, 180, 140, 0.2)',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      hover: {
        border: '1px solid rgba(96, 165, 250, 0.4)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 24px rgba(96, 165, 250, 0.2)',
        transform: 'translateY(-2px)',
      },
    },
  },
};

/**
 * Utility functions for generating CSS values
 */
export const utils = {
  /**
   * Generate liquid glass panel CSS properties
   */
  glassPanel: (opacity: 'light' | 'medium' | 'dark' = 'dark') => ({
    backgroundColor: `rgba(26, 26, 26, ${designTokens.glass.opacity[opacity]})`,
    backdropFilter: designTokens.glass.blur.md,
    border: `1px solid ${designTokens.colors.glass.border}`,
    borderRadius: designTokens.borders.radius,
    boxShadow: designTokens.shadows.glass,
  }),

  /**
   * Generate soft border CSS (replaces brutalist)
   */
  softBorder: (width: 'thin' | 'medium' | 'thick' = 'thin', color: string = designTokens.borders.colors.primary) => ({
    border: `${designTokens.borders.width[width]} ${designTokens.borders.style} ${color}`,
    borderRadius: designTokens.borders.radius,
  }),

  /**
   * Generate glow effect CSS
   */
  glowEffect: (color: 'blue' | 'brown' | 'blueStrong' | 'brownStrong' | 'white' = 'blue') => ({
    boxShadow: designTokens.shadows.glow[color],
  }),

  /**
   * Get agent color by name (brown/blue themed)
   */
  agentColor: (agentName: string): string => {
    const name = agentName.toLowerCase();
    if (name.includes('claude')) return designTokens.colors.agent.claude;
    if (name.includes('codex')) return designTokens.colors.agent.codex;
    if (name.includes('chatgpt') || name.includes('gpt')) return designTokens.colors.agent.chatgpt;
    if (name.includes('deepseek')) return designTokens.colors.agent.deepseek;
    if (name.includes('grok')) return designTokens.colors.agent.grok;
    if (name.includes('gemini')) return designTokens.colors.agent.gemini;
    return designTokens.colors.text.primary;
  },
};

export default designTokens;
