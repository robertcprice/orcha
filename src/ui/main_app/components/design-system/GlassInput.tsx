/**
 * GlassInput - Glass-styled Input Component
 *
 * Input field with frosted glass background and brutalist border.
 * Combines liquid glass aesthetics with brutalist structure.
 */
import React, { forwardRef } from 'react';
import { designTokens } from '@/styles/design-tokens';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      className = '',
      disabled = false,
      ...inputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const containerStyles: React.CSSProperties = {
      width: fullWidth ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: designTokens.spacing.xs,
    };

    const inputWrapperStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const inputStyles: React.CSSProperties = {
      backgroundColor: designTokens.components.input.background,
      backdropFilter: designTokens.glass.blur.md,
      WebkitBackdropFilter: designTokens.glass.blur.md,
      border: isFocused
        ? designTokens.components.input.borderFocus
        : error
        ? `2px solid ${designTokens.colors.semantic.error}`
        : designTokens.components.input.border,
      borderRadius: designTokens.borders.radius,
      color: designTokens.components.input.color,
      padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
      fontSize: designTokens.typography.sizes.base,
      fontFamily: designTokens.typography.fonts.mono,
      width: '100%',
      outline: 'none',
      transition: designTokens.transitions.fast,
      paddingLeft: icon && iconPosition === 'left' ? designTokens.spacing['3xl'] : designTokens.spacing.lg,
      paddingRight: icon && iconPosition === 'right' ? designTokens.spacing['3xl'] : designTokens.spacing.lg,
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
    };

    const labelStyles: React.CSSProperties = {
      color: error ? designTokens.colors.semantic.error : designTokens.colors.text.secondary,
      fontSize: designTokens.typography.sizes.sm,
      fontFamily: designTokens.typography.fonts.header,
      fontWeight: designTokens.typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    };

    const iconStyles: React.CSSProperties = {
      position: 'absolute',
      [iconPosition]: designTokens.spacing.md,
      color: isFocused ? designTokens.colors.accent.cyan : designTokens.colors.text.tertiary,
      transition: designTokens.transitions.fast,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const helperTextStyles: React.CSSProperties = {
      color: error ? designTokens.colors.semantic.error : designTokens.colors.text.tertiary,
      fontSize: designTokens.typography.sizes.xs,
      fontFamily: designTokens.typography.fonts.mono,
    };

    return (
      <div style={containerStyles} className={className}>
        {label && <label style={labelStyles}>{label}</label>}
        <div style={inputWrapperStyles}>
          {icon && <div style={iconStyles}>{icon}</div>}
          <input
            ref={ref}
            style={inputStyles}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            {...inputProps}
          />
        </div>
        {(error || helperText) && (
          <span style={helperTextStyles}>{error || helperText}</span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export default GlassInput;
