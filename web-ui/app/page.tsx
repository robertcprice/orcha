"use client";

import Link from "next/link";
import { Brain, Settings } from "lucide-react";
import PlanTracker from "@/components/PlanTracker";
import SessionMonitor from "@/components/SessionMonitor";
import StatsOverview from "@/components/StatsOverview";
import LatestIteration from "@/components/LatestIteration";
import HybridOrchestratorPanel from "@/components/HybridOrchestratorPanel";
import DirectClaudePanel from "@/components/DirectClaudePanel";
import UnifiedAgentTerminal from "@/components/UnifiedAgentTerminal";
import AgentVisualization from "@/components/AgentVisualization";
import ColorPicker from "@/components/ColorPicker";
import LiveSessionViewer from "@/components/LiveSessionViewer";
import ObsidianKnowledgeEnhanced from "@/components/ObsidianKnowledgeEnhanced";
import EventTimeline from "@/components/EventTimeline";

export default function Dashboard() {
  return (
    <main className="min-h-screen p-6">
      {/* Color Picker */}
      <ColorPicker />
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Multi-Agent Orchestration Console
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring, agent orchestration, and development tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/agents" className="header-nav-button flex items-center gap-2 px-4 py-2 rounded-lg">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Agents</span>
            </Link>
            <Link href="/tasks" className="header-nav-button flex items-center gap-2 px-4 py-2 rounded-lg">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Tasks</span>
            </Link>
            <Link href="/settings" className="header-nav-button flex items-center gap-2 px-4 py-2 rounded-lg">
              <Settings className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
            <div className="px-4 py-2 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow"></div>
                <span className="text-sm font-medium">System Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Orchestrator Panels + Stats */}
          <div className="xl:col-span-1 space-y-6">
            <HybridOrchestratorPanel />
            <DirectClaudePanel />
            <SessionMonitor />
          </div>

          {/* Middle/Right Columns */}
          <div className="xl:col-span-2 space-y-6">
            <PlanTracker />
            <LatestIteration />
            <LiveSessionViewer />
            <AgentVisualization />
            <EventTimeline />
            <UnifiedAgentTerminal />
            <ObsidianKnowledgeEnhanced />
          </div>
        </div>
      </div>
    </main>
  );
}
