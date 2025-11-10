"use client";

import Link from 'next/link';
import { ArrowLeft, GitBranch, Users } from 'lucide-react';
import { BrutalistButton, GlassPanel, designTokens } from '@/components/design-system';
import UnifiedAgentDashboard from '@/components/UnifiedAgentDashboard';

export default function AgentsPage() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: designTokens.spacing.xl,
      backgroundColor: designTokens.colors.background.primary,
    }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: designTokens.spacing.xl,
          flexWrap: 'wrap',
          gap: designTokens.spacing.md,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
            <Link href="/">
              <BrutalistButton variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </BrutalistButton>
            </Link>
            <div>
              <h1 style={{
                fontSize: designTokens.typography.sizes['3xl'],
                fontFamily: designTokens.typography.fonts.header,
                fontWeight: designTokens.typography.weights.bold,
                background: `linear-gradient(90deg, ${designTokens.colors.accent.cyan}, ${designTokens.colors.accent.magenta})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Active Agents
              </h1>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.sm,
              }}>
                Live agent sessions with Claude Code hooks integration
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
            <Link href="/agents/branching">
              <BrutalistButton variant="primary" size="sm">
                <GitBranch className="w-4 h-4" />
                <span>Branching View</span>
              </BrutalistButton>
            </Link>
          </div>
        </header>

        {/* Agent Dashboard */}
        <UnifiedAgentDashboard
          defaultView="cards"
          maxEvents={200}
          autoRefresh
          refreshInterval={5000}
          showMetrics
        />

        {/* Info Panel */}
        <GlassPanel
          bordered
          borderColor={designTokens.colors.accent.cyan}
          style={{
            marginTop: designTokens.spacing.xl,
            padding: designTokens.spacing.lg,
            backgroundColor: `${designTokens.colors.accent.cyan}10`,
          }}
        >
          <h3 style={{
            fontSize: designTokens.typography.sizes.lg,
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.accent.cyan,
            marginBottom: designTokens.spacing.sm,
          }}>
            <Users className="w-5 h-5 inline-block mr-2" />
            About Agent Monitoring
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: designTokens.spacing.lg,
          }}>
            <div>
              <h4 style={{
                color: designTokens.colors.text.primary,
                fontSize: designTokens.typography.sizes.base,
                fontFamily: designTokens.typography.fonts.header,
                fontWeight: designTokens.typography.weights.semibold,
                marginBottom: designTokens.spacing.xs,
              }}>
                Live Session Tracking
              </h4>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
              }}>
                Each agent session is tracked in real-time using Claude Code hooks.
                You can see every tool call, thinking process, and action as it happens.
              </p>
            </div>
            <div>
              <h4 style={{
                color: designTokens.colors.text.primary,
                fontSize: designTokens.typography.sizes.base,
                fontFamily: designTokens.typography.fonts.header,
                fontWeight: designTokens.typography.weights.semibold,
                marginBottom: designTokens.spacing.xs,
              }}>
                Event Types
              </h4>
              <ul style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
                listStyle: 'none',
                padding: 0,
              }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: designTokens.colors.semantic.success,
                  }} />
                  <span>SessionStart - Agent session begins</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: designTokens.colors.accent.purple,
                  }} />
                  <span>PreToolUse - Before tool execution</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs, marginBottom: designTokens.spacing.xs }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: designTokens.colors.accent.cyan,
                  }} />
                  <span>PostToolUse - After tool execution</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: designTokens.colors.accent.cyan,
                  }} />
                  <span>SessionEnd - Agent session complete</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{
                color: designTokens.colors.text.primary,
                fontSize: designTokens.typography.sizes.base,
                fontFamily: designTokens.typography.fonts.header,
                fontWeight: designTokens.typography.weights.semibold,
                marginBottom: designTokens.spacing.xs,
              }}>
                View Modes
              </h4>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
              }}>
                Switch between Cards (grid overview), List (compact view), Feed (event stream),
                and Terminal (log output) to find the perfect view for your workflow.
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
