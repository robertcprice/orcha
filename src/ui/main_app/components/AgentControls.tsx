"use client";

import { useState, useEffect } from "react";
import { Play, Square, RefreshCw, Terminal, AlertCircle, CheckCircle } from "lucide-react";

interface OrchestratorStatus {
  running: boolean;
  pid: string | null;
}

export default function AgentControls() {
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus>({
    running: false,
    pid: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/agents/control');
      const data = await response.json();

      if (data.ok && data.orchestrator) {
        setOrchestratorStatus(data.orchestrator);
      }
    } catch (error) {
      console.error('Failed to fetch orchestrator status:', error);
    }
  };

  const handleControl = async (action: 'start' | 'stop', target: 'orchestrator') => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/agents/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target }),
      });

      const data = await response.json();

      if (data.ok) {
        setMessage({
          type: 'success',
          text: data.message + (data.note ? ` (${data.note})` : ''),
        });

        // Refresh status after a delay
        setTimeout(fetchStatus, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Operation failed',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to control orchestrator',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">Agent System Control</h3>
          <p className="text-sm text-muted-foreground">
            Manage the session-based orchestrator and agent instances
          </p>
        </div>

        <div className="flex items-center gap-2">
          {orchestratorStatus.running ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs font-medium">Running</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-xs font-medium">Stopped</span>
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : message.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orchestrator Controls */}
        <div className="bg-secondary/30 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold">Session Orchestrator</h4>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Coordinates task distribution to persistent Claude Code agent sessions
          </p>

          {orchestratorStatus.pid && (
            <p className="text-xs text-muted-foreground mb-3">
              PID: <code className="px-1 py-0.5 bg-background/50 rounded">{orchestratorStatus.pid}</code>
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleControl('start', 'orchestrator')}
              disabled={loading || orchestratorStatus.running}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-green-500/10 disabled:opacity-50 text-green-400 rounded-lg border border-green-500/30 transition-all text-sm font-medium disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5" />
              Start
            </button>

            <button
              onClick={() => handleControl('stop', 'orchestrator')}
              disabled={loading || !orchestratorStatus.running}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:bg-red-500/10 disabled:opacity-50 text-red-400 rounded-lg border border-red-500/30 transition-all text-sm font-medium disabled:cursor-not-allowed"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-400 rounded-lg border border-blue-500/30 transition-all disabled:cursor-not-allowed"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Agent Sessions Instructions */}
        <div className="bg-secondary/30 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-semibold">Agent Sessions</h4>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Each agent (PP, AR, IM, RD) must run in a separate Claude Code session
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2 bg-background/30 rounded border border-border/30">
              <code className="text-purple-400">claude</code>
              <p className="text-muted-foreground mt-1">
                Then: <code className="text-xs">python agents/persistent_agent.py --role PP</code>
              </p>
            </div>

            <p className="text-muted-foreground italic">
              Repeat for AR, IM, RD roles in separate sessions
            </p>

            <a
              href="https://github.com/your-repo/blob/main/PERSISTENT_AGENTS_SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-400 hover:text-blue-300 underline"
            >
              View full setup guide →
            </a>
          </div>
        </div>
      </div>

      {/* System Architecture Info */}
      <div className="mt-4 p-3 bg-background/20 rounded-lg border border-border/30">
        <p className="text-xs text-muted-foreground">
          <strong>Architecture:</strong> Session-based agents run in persistent Claude Code sessions,
          monitoring Redis queues for tasks. The orchestrator coordinates task assignment across the
          pipeline (PP → AR → IM → RD). No API calls are made - all agents use local Claude Code sessions.
        </p>
      </div>
    </div>
  );
}
