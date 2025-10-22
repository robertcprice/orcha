"use client";

import AgentActivityMonitor from '@/components/AgentActivityMonitor';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AgentsPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Manager Agents
            </h1>
            <p className="text-muted-foreground mt-1">
              View and monitor all manager agents in the orchestration system
            </p>
          </div>
        </header>

        {/* Agent Activity Monitor */}
        <AgentActivityMonitor />

        {/* Agent Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-primary">What are Manager Agents?</h3>
            <p className="text-sm text-foreground mb-4">
              Manager agents are domain-specific coordinators that organize and delegate
              work to Claude agents. Each manager specializes in a specific area of
              development.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <strong className="text-primary">Database Manager:</strong>{" "}
                  <span className="text-muted-foreground">Handles schema design, migrations, and database operations</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent">•</span>
                <div>
                  <strong className="text-accent">Frontend Manager:</strong>{" "}
                  <span className="text-muted-foreground">Coordinates UI components, state management, and styling</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">•</span>
                <div>
                  <strong className="text-success">Backend Manager:</strong>{" "}
                  <span className="text-muted-foreground">Manages API endpoints, business logic, and middleware</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <div>
                  <strong className="text-warning">Infrastructure Manager:</strong>{" "}
                  <span className="text-muted-foreground">Handles deployment, DevOps, and infrastructure as code</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-primary">How They Work</h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-semibold text-foreground mb-1">1. Task Assignment</div>
                <div className="text-muted-foreground">
                  Managers receive related subtasks from the orchestrator
                </div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">2. Agent Spawning</div>
                <div className="text-muted-foreground">
                  Each manager spawns 1-2 Claude agents per function group for efficient coordination
                </div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">3. Result Collection</div>
                <div className="text-muted-foreground">
                  Managers collect results from agents and ensure task completion
                </div>
              </div>
              <div>
                <div className="font-semibold text-foreground mb-1">4. Status Reporting</div>
                <div className="text-muted-foreground">
                  Real-time status updates are published to Redis for dashboard monitoring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
