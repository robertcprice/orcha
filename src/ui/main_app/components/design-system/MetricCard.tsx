/**
 * MetricCard - Metric Display Card Component
 *
 * Glass card with brutalist border for displaying metrics and statistics.
 * Supports icons, trends, and color-coded indicators.
 */
import React from 'react';
import { designTokens } from '@/styles/design-tokens';
import { GlassPanel } from './GlassPanel';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  accentColor = designTokens.colors.accent.cyan,
  onClick,
  className = '',
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return designTokens.colors.semantic.success;
      case 'down':
        return designTokens.colors.semantic.error;
      case 'neutral':
      default:
        return designTokens.colors.text.tertiary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'neutral':
      default:
        return '→';
    }
  };

  const cardStyles: React.CSSProperties = {
    padding: designTokens.spacing.lg,
    border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${accentColor}`,
    transition: designTokens.transitions.normal,
    cursor: onClick ? 'pointer' : 'default',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designTokens.spacing.md,
  };

  const titleStyles: React.CSSProperties = {
    color: designTokens.colors.text.secondary,
    fontSize: designTokens.typography.sizes.sm,
    fontFamily: designTokens.typography.fonts.header,
    fontWeight: designTokens.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const iconStyles: React.CSSProperties = {
    color: accentColor,
    fontSize: designTokens.typography.sizes['2xl'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const valueStyles: React.CSSProperties = {
    color: designTokens.colors.text.primary,
    fontSize: designTokens.typography.sizes['4xl'],
    fontFamily: designTokens.typography.fonts.header,
    fontWeight: designTokens.typography.weights.bold,
    lineHeight: designTokens.typography.lineHeights.tight,
    marginBottom: designTokens.spacing.xs,
  };

  const subtitleStyles: React.CSSProperties = {
    color: designTokens.colors.text.tertiary,
    fontSize: designTokens.typography.sizes.xs,
    fontFamily: designTokens.typography.fonts.mono,
  };

  const trendStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.sm,
    color: getTrendColor(),
    fontSize: designTokens.typography.sizes.sm,
    fontFamily: designTokens.typography.fonts.mono,
    fontWeight: designTokens.typography.weights.medium,
  };

  const handleHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = `0 0 20px ${accentColor}40`;
  };

  const handleHoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      className={className}
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverOut}
    >
      <GlassPanel
        className="metric-card"
        style={cardStyles}
        onClick={onClick}
        opacity="dark"
        blur="md"
      >
        <div style={headerStyles}>
          <div style={titleStyles}>{title}</div>
          {icon && <div style={iconStyles}>{icon}</div>}
        </div>

        <div style={valueStyles}>{value}</div>

        {subtitle && <div style={subtitleStyles}>{subtitle}</div>}

        {trend && trendValue && (
          <div style={trendStyles}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default MetricCard;
