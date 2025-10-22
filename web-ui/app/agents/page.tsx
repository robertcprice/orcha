"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Activity } from 'lucide-react';
import AgentSessionMonitor from '@/components/AgentSessionMonitor';

interface AgentSession {
  sessionId: string;
  source: string;
  lastActivity: number;
  status: 'running' | 'completed' | 'idle';
  events: any[];
}

export default function AgentsPage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      try {
        const response = await fetch('/api/agents/active');
        const data = await response.json();

        if (data.ok && data.sessions) {
          setSessions(data.sessions);
        }
      } catch (error) {
        console.error('Failed to fetch active sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSessions();

    // Refresh every 5 seconds
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = sessions.filter(s => s.status === 'running');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary border border-border transition-all">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Active Agents
              </h1>
            </div>
            <p className="text-muted-foreground mt-1 ml-14">
              Live agent sessions with Claude Code hooks integration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow"></div>
                <span className="text-sm font-medium">{activeSessions.length} Active</span>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-20 animate-pulse" />
            <p className="text-muted-foreground">Loading agent sessions...</p>
          </div>
        ) : (
          <>
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                  Running Agents ({activeSessions.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {activeSessions.map((session, index) => (
                    <AgentSessionMonitor
                      key={session.sessionId}
                      session={session}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-400" />
                  Recently Completed ({completedSessions.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {completedSessions.map((session, index) => (
                    <AgentSessionMonitor
                      key={session.sessionId}
                      session={session}
                      index={index + activeSessions.length}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Sessions */}
            {sessions.length === 0 && (
              <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-12">
                <div className="text-center">
                  <Users className="w-20 h-20 mx-auto mb-6 opacity-20" />
                  <h3 className="text-2xl font-semibold mb-2">No Active Agents</h3>
                  <p className="text-muted-foreground mb-6">
                    Agents will appear here automatically when spawned through orchestration
                    or when you run Claude Code commands with hooks enabled.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-6 max-w-2xl mx-auto">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">How to see agents here:</h4>
                    <ol className="text-left text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">1.</span>
                        <span>Run any Claude Code command in this project directory</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">2.</span>
                        <span>The Claude Code hooks will automatically capture events</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">3.</span>
                        <span>Each unique session will appear as an agent card above</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">4.</span>
                        <span>Watch live tool calls, thinking, and agent actions in real-time</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Info Panel */}
            <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                About Agent Monitoring
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Live Session Tracking</h4>
                  <p className="text-muted-foreground">
                    Each agent session is tracked in real-time using Claude Code hooks.
                    You can see every tool call, thinking process, and action as it happens.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-foreground">Event Types</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span>SessionStart - Agent session begins</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span>PreToolUse - Before tool execution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      <span>PostToolUse - After tool execution</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>SessionEnd - Agent session complete</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
