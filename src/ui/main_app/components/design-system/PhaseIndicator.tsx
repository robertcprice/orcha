/**
 * PhaseIndicator - Orchestration Phase Progress Indicator
 *
 * Visual indicator showing current phase in the 6-phase orchestration workflow.
 * Displays: Enrichment → Execution → Review → Refinement → Documentation → Finalization
 */
import React from 'react';
import { designTokens } from '@/styles/design-tokens';

export type OrchestrationPhase =
  | 'enrichment'
  | 'execution'
  | 'review'
  | 'refinement'
  | 'documentation'
  | 'finalization';

export interface PhaseIndicatorProps {
  currentPhase: OrchestrationPhase;
  completedPhases?: OrchestrationPhase[];
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
  className?: string;
}

const phases: Array<{ id: OrchestrationPhase; label: string; icon: string }> = [
  { id: 'enrichment', label: 'Enrichment', icon: '🧠' },
  { id: 'execution', label: 'Execution', icon: '⚡' },
  { id: 'review', label: 'Review', icon: '🔍' },
  { id: 'refinement', label: 'Refinement', icon: '✨' },
  { id: 'documentation', label: 'Documentation', icon: '📝' },
  { id: 'finalization', label: 'Finalization', icon: '✅' },
];

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  completedPhases = [],
  showLabels = true,
  orientation = 'horizontal',
  compact = false,
  className = '',
}) => {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);

  const getPhaseStatus = (phase: OrchestrationPhase, index: number): 'completed' | 'active' | 'pending' => {
    if (completedPhases.includes(phase)) return 'completed';
    if (phase === currentPhase || index === currentIndex) return 'active';
    return 'pending';
  };

  const getPhaseColor = (status: 'completed' | 'active' | 'pending'): string => {
    switch (status) {
      case 'completed':
        return designTokens.colors.semantic.success;
      case 'active':
        return designTokens.colors.accent.cyan;
      case 'pending':
        return designTokens.colors.text.tertiary;
    }
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    alignItems: 'center',
    gap: orientation === 'horizontal' ? designTokens.spacing.md : designTokens.spacing.sm,
    padding: compact ? designTokens.spacing.sm : designTokens.spacing.md,
  };

  const phaseStyles = (status: 'completed' | 'active' | 'pending'): React.CSSProperties => ({
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'column' : 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
    flex: orientation === 'horizontal' ? '1' : 'none',
  });

  const dotStyles = (status: 'completed' | 'active' | 'pending'): React.CSSProperties => ({
    width: compact ? '12px' : status === 'active' ? '20px' : '16px',
    height: compact ? '12px' : status === 'active' ? '20px' : '16px',
    borderRadius: '50%',
    border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${getPhaseColor(status)}`,
    backgroundColor: status === 'completed' ? getPhaseColor(status) : 'transparent',
    transition: designTokens.transitions.normal,
    boxShadow: status === 'active' ? `0 0 12px ${getPhaseColor(status)}` : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? designTokens.typography.sizes.xs : designTokens.typography.sizes.sm,
  });

  const connectorStyles = (index: number): React.CSSProperties => {
    const isCompleted = index < currentIndex;
    return {
      flex: 1,
      height: orientation === 'horizontal' ? '2px' : '24px',
      width: orientation === 'horizontal' ? 'auto' : '2px',
      backgroundColor: isCompleted
        ? designTokens.colors.semantic.success
        : designTokens.colors.structure.border.tertiary,
      transition: designTokens.transitions.normal,
    };
  };

  const labelStyles = (status: 'completed' | 'active' | 'pending'): React.CSSProperties => ({
    color: getPhaseColor(status),
    fontSize: compact ? designTokens.typography.sizes.xs : designTokens.typography.sizes.sm,
    fontFamily: designTokens.typography.fonts.mono,
    fontWeight: status === 'active' ? designTokens.typography.weights.bold : designTokens.typography.weights.normal,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    textAlign: 'center' as const,
  });

  return (
    <div style={containerStyles} className={`phase-indicator ${className}`}>
      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase.id, index);

        return (
          <React.Fragment key={phase.id}>
            <div style={phaseStyles(status)}>
              <div style={dotStyles(status)}>
                {status === 'completed' ? '✓' : compact ? '' : phase.icon}
              </div>
              {showLabels && <div style={labelStyles(status)}>{phase.label}</div>}
            </div>

            {/* Connector line between phases (except after last phase) */}
            {index < phases.length - 1 && orientation === 'horizontal' && (
              <div style={connectorStyles(index)} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default PhaseIndicator;
