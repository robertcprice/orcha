/**
 * GlassPanel - Liquid Glass Panel Component
 *
 * Translucent panel with frosted backdrop blur effect.
 * Core building block for all glass UI elements.
 */
import React from 'react';
import { designTokens } from '@/styles/design-tokens';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  opacity?: 'light' | 'medium' | 'dark';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  bordered?: boolean;
  borderColor?: string;
  gradient?: boolean;
  rounded?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  opacity = 'dark',
  blur = 'md',
  bordered = true,
  borderColor,
  gradient = false,
  rounded = 'md',
  shadow = true,
  hoverable = false,
  onClick,
  style = {},
}) => {
  const opacityValue = designTokens.glass.opacity[opacity];
  const blurValue = designTokens.glass.blur[blur];

  // Map rounded size to border radius
  const borderRadiusMap = {
    sm: designTokens.borders.radiusSm,
    md: designTokens.borders.radius,
    lg: designTokens.borders.radiusLg,
  };

  const baseStyles: React.CSSProperties = {
    backgroundColor: `rgba(26, 26, 26, ${opacityValue})`,
    backdropFilter: blurValue,
    WebkitBackdropFilter: blurValue, // Safari support
    border: bordered ? `${designTokens.borders.width.thin} ${designTokens.borders.style} ${borderColor || designTokens.colors.glass.border}` : 'none',
    borderRadius: borderRadiusMap[rounded],
    boxShadow: shadow ? designTokens.shadows.glass : 'none',
    backgroundImage: gradient ? designTokens.glass.gradient.subtle : 'none',
    transition: designTokens.transitions.normal,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  const hoverStyles: React.CSSProperties = hoverable || onClick ? {
    boxShadow: designTokens.shadows.glassHover,
    transform: 'translateY(-2px)',
  } : {};

  return (
    <div
      className={`glass-panel ${className}`}
      style={baseStyles}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.boxShadow = shadow ? designTokens.shadows.glass : 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
