'use client';

import Link from 'next/link';
import { ArrowLeft, Database, BookOpen, FileText } from 'lucide-react';
import { BrutalistButton, GlassPanel, designTokens } from '@/components/design-system';
import EnhancedVaultBrowser from '@/components/EnhancedVaultBrowser';

export default function VaultPage() {
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
                background: `linear-gradient(90deg, ${designTokens.colors.accent.purple}, ${designTokens.colors.accent.cyan})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Knowledge Vault
              </h1>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontFamily: designTokens.typography.fonts.mono,
                fontSize: designTokens.typography.sizes.sm,
              }}>
                Obsidian vault browser for agent sessions, experiments, and architecture docs
              </p>
            </div>
          </div>

          <GlassPanel
            bordered
            borderColor={designTokens.colors.semantic.success}
            style={{
              padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.xs,
            }}
          >
            <Database className="w-4 h-4" style={{ color: designTokens.colors.semantic.success }} />
            <span style={{
              color: designTokens.colors.text.primary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              fontWeight: designTokens.typography.weights.medium,
            }}>
              Vault Connected
            </span>
          </GlassPanel>
        </header>

        {/* Enhanced Vault Browser */}
        <div style={{ height: 'calc(100vh - 280px)' }}>
          <EnhancedVaultBrowser />
        </div>

        {/* Info Panel */}
        <GlassPanel
          bordered
          borderColor={designTokens.colors.accent.purple}
          style={{
            marginTop: designTokens.spacing.xl,
            padding: designTokens.spacing.lg,
            backgroundColor: `${designTokens.colors.accent.purple}10`,
          }}
        >
          <h3 style={{
            fontSize: designTokens.typography.sizes.lg,
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.accent.purple,
            marginBottom: designTokens.spacing.sm,
          }}>
            <BookOpen className="w-5 h-5 inline-block mr-2" />
            About the Knowledge Vault
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
                Organized Knowledge Base
              </h4>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
              }}>
                All agent sessions, experiments, architecture decisions, and daily notes are
                stored in an Obsidian vault with frontmatter metadata and wiki-style links.
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
                Vault Structure
              </h4>
              <ul style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
                listStyle: 'none',
                padding: 0,
              }}>
                <li style={{ marginBottom: '4px' }}>01-Architecture • System design docs</li>
                <li style={{ marginBottom: '4px' }}>02-Components • Code components</li>
                <li style={{ marginBottom: '4px' }}>03-Experiments • A/B tests & trials</li>
                <li style={{ marginBottom: '4px' }}>04-Decisions • ADRs & choices</li>
                <li style={{ marginBottom: '4px' }}>05-Agent-Sessions • AI session logs</li>
                <li style={{ marginBottom: '4px' }}>09-Milestones • Major achievements</li>
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
                Features
              </h4>
              <p style={{
                color: designTokens.colors.text.secondary,
                fontSize: designTokens.typography.sizes.sm,
                fontFamily: designTokens.typography.fonts.mono,
              }}>
                Browse the hierarchical file tree, search across all notes with context
                highlighting, view frontmatter metadata, and track internal wiki-links between
                notes for knowledge graph exploration.
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
