'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrutalistButton, designTokens } from '@/components/design-system';
import LiveMonitorDashboard from '@/components/LiveMonitorDashboard';

export default function MonitorPage() {
  return (
    <div style={{
      minHeight: '100vh',
      padding: designTokens.spacing.xl,
      backgroundColor: designTokens.colors.background.primary,
    }}>
      <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing.md,
          marginBottom: designTokens.spacing.xl,
        }}>
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
              background: `linear-gradient(90deg, ${designTokens.colors.accent.cyan}, ${designTokens.colors.accent.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Live Agent Monitor
            </h1>
            <p style={{
              color: designTokens.colors.text.secondary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
            }}>
              Real-time agent thinking and session logs
            </p>
          </div>
        </header>

        {/* Live Monitor Dashboard */}
        <LiveMonitorDashboard
          defaultView="split"
          defaultSession="all"
          maxEvents={500}
          wsUrl="ws://localhost:4000/ws"
          showStats
        />
      </div>
    </div>
  );
}
