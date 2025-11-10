/**
 * BrutalistButton - Soft Glass Button Component
 *
 * Soft rounded button with liquid glass effect and brown/blue theme.
 * Available in primary (blue), secondary (brown), and accent variants.
 * Note: Name kept for backwards compatibility, but style is now soft glass.
 */
import React from 'react';
import { designTokens } from '@/styles/design-tokens';

export interface BrutalistButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export const BrutalistButton: React.FC<BrutalistButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    const base = {
      fontFamily: designTokens.typography.fonts.header,
      fontWeight: designTokens.typography.weights.bold,
      transition: designTokens.transitions.normal,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          ...designTokens.components.button.primary,
        };
      case 'secondary':
        return {
          ...base,
          ...designTokens.components.button.secondary,
        };
      case 'accent':
        return {
          ...base,
          ...designTokens.components.button.accent,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: designTokens.colors.semantic.error,
          border: `1px solid ${designTokens.colors.semantic.error}`,
          borderRadius: designTokens.borders.radiusSm,
        };
      default:
        return base;
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
          fontSize: designTokens.typography.sizes.sm,
        };
      case 'md':
        return {
          padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
          fontSize: designTokens.typography.sizes.base,
        };
      case 'lg':
        return {
          padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
          fontSize: designTokens.typography.sizes.lg,
        };
      default:
        return {};
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    const button = e.currentTarget;

    // Apply hover styles based on variant
    if (variant === 'primary') {
      Object.assign(button.style, designTokens.components.button.primary.hover);
    } else if (variant === 'secondary') {
      Object.assign(button.style, designTokens.components.button.secondary.hover);
    } else if (variant === 'accent') {
      Object.assign(button.style, designTokens.components.button.accent.hover);
    } else {
      button.style.boxShadow = designTokens.shadows.glow.white;
    }
  };

  const handleHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    const button = e.currentTarget;

    // Reset hover styles
    button.style.boxShadow = 'none';
    if (variant === 'primary') {
      button.style.background = designTokens.components.button.primary.background;
      button.style.border = designTokens.components.button.primary.border;
    } else if (variant === 'secondary') {
      button.style.background = designTokens.components.button.secondary.background;
      button.style.border = designTokens.components.button.secondary.border;
    } else if (variant === 'accent') {
      button.style.background = designTokens.components.button.accent.background;
      button.style.border = designTokens.components.button.accent.border;
    }
  };

  const styles: React.CSSProperties = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
  };

  return (
    <button
      type={type}
      className={`brutalist-button ${className}`}
      style={styles}
      onClick={handleClick}
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverOut}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span style={{
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 1s linear infinite'
          }} />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default BrutalistButton;
