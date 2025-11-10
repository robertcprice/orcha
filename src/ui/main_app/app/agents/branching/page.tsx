"use client";

import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import AgentBranchingTree from "@/components/AgentBranchingTree";
import { BrutalistButton, GlassPanel, designTokens } from "@/components/design-system";

export default function AgentBranchingVisualizationPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: designTokens.spacing.xl,
        backgroundColor: designTokens.colors.background.primary,
        backgroundImage: "radial-gradient(circle at top, rgba(120, 119, 198, 0.25), transparent 45%)",
      }}
    >
      <div style={{ maxWidth: "1920px", margin: "0 auto", display: "flex", flexDirection: "column", gap: designTokens.spacing.xl }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: designTokens.spacing.lg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: designTokens.spacing.md }}>
            <Link href="/agents">
              <BrutalistButton variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </BrutalistButton>
            </Link>
            <div>
              <h1
                style={{
                  fontSize: designTokens.typography.sizes["3xl"],
                  fontFamily: designTokens.typography.fonts.header,
                  fontWeight: designTokens.typography.weights.bold,
                  background: `linear-gradient(90deg, ${designTokens.colors.accent.cyan}, ${designTokens.colors.accent.magenta})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Agent Branching Visualizer
              </h1>
              <p
                style={{
                  color: designTokens.colors.text.secondary,
                  fontFamily: designTokens.typography.fonts.mono,
                  fontSize: designTokens.typography.sizes.sm,
                  maxWidth: "720px",
                }}
              >
                Observe how the orchestrator spins up and coordinates sub-agents in real time. Pulsing
                branches indicate when new agents spawn, actively work, or complete their tasks.
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: designTokens.spacing.sm,
              color: designTokens.colors.text.secondary,
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
            }}
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Live Orchestration Hierarchy</span>
          </div>
        </header>

        <GlassPanel
          bordered
          borderColor={designTokens.colors.accent.magenta}
          style={{
            padding: designTokens.spacing.lg,
            backgroundColor: `${designTokens.colors.accent.magenta}12`,
          }}
        >
          <p
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.sm,
              color: designTokens.colors.text.secondary,
              lineHeight: 1.6,
            }}
          >
            Branch colors represent the current lifecycle of each agent:
            <span style={{ color: designTokens.colors.accent.purple }}> violet</span> for spawning,
            <span style={{ color: designTokens.colors.accent.cyan }}> cyan</span> for active work,
            <span style={{ color: designTokens.colors.semantic.success }}> emerald</span> for
            completion, and <span style={{ color: designTokens.colors.semantic.error }}> rose</span> for
            failures. The cards beneath the tree provide a concise timeline of the most recent agent
            activity.
          </p>
        </GlassPanel>

        <AgentBranchingTree />
      </div>
    </main>
  );
}
