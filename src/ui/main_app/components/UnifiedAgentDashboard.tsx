/**
 * UnifiedAgentDashboard - Consolidated Agent Monitoring Component
 *
 * Combines functionality from:
 * - SessionMonitor
 * - LiveAgentCard
 * - AgentFeed
 * - AgentTerminal
 * - IndividualAgentMonitor
 *
 * Provides multiple view modes and real-time updates.
 */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Terminal, LayoutGrid, List, Zap, Brain, Clock, GitBranch } from 'lucide-react';
import { GlassPanel, MetricCard, BrutalistButton, PhaseIndicator, designTokens } from '@/components/design-system';
import type { OrchestrationPhase } from '@/components/design-system';
import AgentBranchingTree from '@/components/AgentBranchingTree';

interface AgentSession {
  sessionId: string;
  source: string;
  agentType: 'claude' | 'codex' | 'gemini' | 'grok' | 'manager';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  lastActivity: number;
  events: AgentEvent[];
  currentPhase?: OrchestrationPhase;
  completedPhases?: OrchestrationPhase[];
  metrics?: {
    toolCalls: number;
    duration: number;
    eventsCount: number;
  };
}

interface AgentEvent {
  id: string;
  timestamp: number;
  type: 'thinking' | 'tool_use' | 'response' | 'error' | 'system';
  source: string;
  content: string;
  metadata?: any;
}

type ViewMode = 'cards' | 'list' | 'feed' | 'terminal' | 'tree';

export interface UnifiedAgentDashboardProps {
  defaultView?: ViewMode;
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showMetrics?: boolean;
  className?: string;
}

export const UnifiedAgentDashboard: React.FC<UnifiedAgentDashboardProps> = ({
  defaultView = 'cards',
  maxEvents = 200,
  autoRefresh = true,
  refreshInterval = 3000,
  showMetrics = true,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch active sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/agents/active');
        const data = await response.json();

        if (data.ok && data.sessions) {
          const mappedSessions: AgentSession[] = data.sessions.map((session: any) => ({
            sessionId: session.sessionId,
            source: session.source,
            agentType: inferAgentType(session),
            status: mapSessionStatus(session.status),
            lastActivity: session.lastActivity,
            events: session.events || [],
            metrics: {
              toolCalls: session.events?.filter((e: any) => e.type === 'tool_use').length || 0,
              duration: Date.now() - (session.startTime || session.lastActivity),
              eventsCount: session.events?.length || 0,
            },
          }));

          setSessions(mappedSessions);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
    if (autoRefresh) {
      const interval = setInterval(fetchSessions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Fetch events feed
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const url = selectedSession
          ? `/api/agents/unified-logs?sessionId=${selectedSession}&limit=${maxEvents}`
          : `/api/agents/unified-logs?limit=${maxEvents}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && data.logs) {
          const mappedEvents: AgentEvent[] = data.logs.map((log: any) => ({
            id: log.id || `${log.timestamp}-${Math.random()}`,
            timestamp: log.timestamp,
            type: log.event_type || 'system',
            source: log.source_app || 'unknown',
            content: log.message || JSON.stringify(log.payload),
            metadata: log.payload,
          }));

          setEvents(mappedEvents);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
    if (autoRefresh) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [selectedSession, autoRefresh, refreshInterval, maxEvents]);

  // Auto-scroll feed
  useEffect(() => {
    if (viewMode === 'feed' && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, viewMode]);

  // Helper functions
  const inferAgentType = (session: any): AgentSession['agentType'] => {
    const source = session.source?.toLowerCase() || '';
    if (source.includes('codex')) return 'codex';
    if (source.includes('gemini')) return 'gemini';
    if (source.includes('grok')) return 'grok';
    if (source.includes('manager')) return 'manager';
    return 'claude';
  };

  const mapSessionStatus = (status: string): AgentSession['status'] => {
    if (status === 'running') return 'executing';
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    return 'idle';
  };

  const getAgentIcon = (type: AgentSession['agentType']) => {
    switch (type) {
      case 'codex': return <Terminal className="w-4 h-4" />;
      case 'claude': return <Brain className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AgentSession['status']) => {
    switch (status) {
      case 'executing': return designTokens.colors.accent.cyan;
      case 'thinking': return designTokens.colors.accent.purple;
      case 'completed': return designTokens.colors.semantic.success;
      case 'failed': return designTokens.colors.semantic.error;
      default: return designTokens.colors.text.tertiary;
    }
  };

  const getEventTypeColor = (type: AgentEvent['type']) => {
    switch (type) {
      case 'thinking': return designTokens.colors.accent.purple;
      case 'tool_use': return designTokens.colors.accent.cyan;
      case 'response': return designTokens.colors.semantic.success;
      case 'error': return designTokens.colors.semantic.error;
      default: return designTokens.colors.text.secondary;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }
    const pad = (value: number) => value.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Render components
  const renderViewModeSelector = () => (
    <div style={{ display: 'flex', gap: designTokens.spacing.sm }}>
      <BrutalistButton
        variant={viewMode === 'cards' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('cards')}
      >
        <LayoutGrid className="w-4 h-4" />
        <span>Cards</span>
      </BrutalistButton>
      <BrutalistButton
        variant={viewMode === 'list' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('list')}
      >
        <List className="w-4 h-4" />
        <span>List</span>
      </BrutalistButton>
      <BrutalistButton
        variant={viewMode === 'feed' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('feed')}
      >
        <Zap className="w-4 h-4" />
        <span>Feed</span>
      </BrutalistButton>
      <BrutalistButton
        variant={viewMode === 'terminal' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('terminal')}
      >
        <Terminal className="w-4 h-4" />
        <span>Terminal</span>
      </BrutalistButton>
      <BrutalistButton
        variant={viewMode === 'tree' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('tree')}
      >
        <GitBranch className="w-4 h-4" />
        <span>Tree</span>
      </BrutalistButton>
    </div>
  );

  const renderMetrics = () => {
    const activeSessions = sessions.filter(s => s.status === 'executing' || s.status === 'thinking');
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalEvents = sessions.reduce((sum, s) => sum + (s.metrics?.eventsCount || 0), 0);
    const avgDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.metrics?.duration || 0), 0) / sessions.length
      : 0;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: designTokens.spacing.md }}>
        <MetricCard
          title="Active Sessions"
          value={activeSessions.length}
          subtitle="Currently running"
          icon={<Activity className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.cyan}
          trend={activeSessions.length > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Completed"
          value={completedSessions.length}
          subtitle="Total completed"
          icon={<Zap className="w-5 h-5" />}
          accentColor={designTokens.colors.semantic.success}
          trend="up"
        />
        <MetricCard
          title="Total Events"
          value={totalEvents}
          subtitle="Across all sessions"
          icon={<List className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.purple}
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(avgDuration)}
          subtitle="Per session"
          icon={<Clock className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.yellow}
        />
      </div>
    );
  };

  const renderCardsView = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: designTokens.spacing.lg }}>
      {sessions.map((session) => (
        <GlassPanel
          key={session.sessionId}
          bordered
          borderColor={getStatusColor(session.status)}
          onClick={() => setSelectedSession(session.sessionId)}
          style={{
            padding: designTokens.spacing.lg,
            cursor: 'pointer',
            transition: designTokens.transitions.normal,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: designTokens.spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm }}>
              <div style={{ color: getStatusColor(session.status) }}>
                {getAgentIcon(session.agentType)}
              </div>
              <div>
                <div style={{
                  color: designTokens.colors.text.primary,
                  fontSize: designTokens.typography.sizes.base,
                  fontFamily: designTokens.typography.fonts.header,
                  fontWeight: designTokens.typography.weights.semibold,
                }}>
                  {session.source}
                </div>
                <div style={{
                  color: designTokens.colors.text.tertiary,
                  fontSize: designTokens.typography.sizes.xs,
                  fontFamily: designTokens.typography.fonts.mono,
                }}>
                  {session.sessionId.substring(0, 8)}...
                </div>
              </div>
            </div>
            <div style={{
              padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
              border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${getStatusColor(session.status)}`,
              color: getStatusColor(session.status),
              fontSize: designTokens.typography.sizes.xs,
              fontFamily: designTokens.typography.fonts.mono,
              textTransform: 'uppercase',
            }}>
              {session.status}
            </div>
          </div>

          {session.currentPhase && (
            <div style={{ marginBottom: designTokens.spacing.md }}>
              <PhaseIndicator
                currentPhase={session.currentPhase}
                completedPhases={session.completedPhases}
                showLabels={false}
                compact
                orientation="horizontal"
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: designTokens.spacing.sm }}>
            <div style={{
              padding: designTokens.spacing.sm,
              backgroundColor: designTokens.colors.structure.bg.tertiary,
              border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.structure.border.tertiary}`,
            }}>
              <div style={{ color: designTokens.colors.text.tertiary, fontSize: designTokens.typography.sizes.xs }}>
                Tools
              </div>
              <div style={{ color: designTokens.colors.text.primary, fontSize: designTokens.typography.sizes.lg, fontWeight: designTokens.typography.weights.bold }}>
                {session.metrics?.toolCalls || 0}
              </div>
            </div>
            <div style={{
              padding: designTokens.spacing.sm,
              backgroundColor: designTokens.colors.structure.bg.tertiary,
              border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.structure.border.tertiary}`,
            }}>
              <div style={{ color: designTokens.colors.text.tertiary, fontSize: designTokens.typography.sizes.xs }}>
                Events
              </div>
              <div style={{ color: designTokens.colors.text.primary, fontSize: designTokens.typography.sizes.lg, fontWeight: designTokens.typography.weights.bold }}>
                {session.metrics?.eventsCount || 0}
              </div>
            </div>
            <div style={{
              padding: designTokens.spacing.sm,
              backgroundColor: designTokens.colors.structure.bg.tertiary,
              border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.structure.border.tertiary}`,
            }}>
              <div style={{ color: designTokens.colors.text.tertiary, fontSize: designTokens.typography.sizes.xs }}>
                Duration
              </div>
              <div style={{ color: designTokens.colors.text.primary, fontSize: designTokens.typography.sizes.sm, fontWeight: designTokens.typography.weights.bold }}>
                {formatDuration(session.metrics?.duration || 0)}
              </div>
            </div>
          </div>
        </GlassPanel>
      ))}
    </div>
  );

  const renderListView = () => (
    <GlassPanel bordered style={{ padding: designTokens.spacing.lg }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.sm }}>
        {sessions.map((session, index) => (
          <div
            key={session.sessionId}
            style={{
              padding: designTokens.spacing.md,
              backgroundColor: selectedSession === session.sessionId
                ? designTokens.colors.glass.dark
                : designTokens.colors.structure.bg.tertiary,
              border: `${designTokens.borders.width.medium} ${designTokens.borders.style} ${
                selectedSession === session.sessionId ? getStatusColor(session.status) : designTokens.colors.structure.border.tertiary
              }`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: designTokens.transitions.normal,
            }}
            onClick={() => setSelectedSession(session.sessionId)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.md }}>
              <div style={{ color: getStatusColor(session.status) }}>
                {getAgentIcon(session.agentType)}
              </div>
              <div>
                <div style={{
                  color: designTokens.colors.text.primary,
                  fontFamily: designTokens.typography.fonts.header,
                  fontWeight: designTokens.typography.weights.semibold,
                }}>
                  {session.source}
                </div>
                <div style={{
                  color: designTokens.colors.text.tertiary,
                  fontSize: designTokens.typography.sizes.xs,
                  fontFamily: designTokens.typography.fonts.mono,
                }}>
                  {session.sessionId}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.lg }}>
              <div style={{ color: designTokens.colors.text.secondary, fontSize: designTokens.typography.sizes.sm }}>
                {session.metrics?.eventsCount || 0} events
              </div>
              <div style={{ color: designTokens.colors.text.secondary, fontSize: designTokens.typography.sizes.sm }}>
                {formatDuration(session.metrics?.duration || 0)}
              </div>
              <div style={{
                padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
                border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${getStatusColor(session.status)}`,
                color: getStatusColor(session.status),
                fontSize: designTokens.typography.sizes.xs,
                fontFamily: designTokens.typography.fonts.mono,
                textTransform: 'uppercase',
              }}>
                {session.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const renderFeedView = () => (
    <GlassPanel bordered style={{ height: '600px', padding: designTokens.spacing.md }}>
      <div
        ref={feedRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing.xs,
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.sm,
        }}
      >
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              padding: designTokens.spacing.sm,
              borderLeft: `${designTokens.borders.width.thick} ${designTokens.borders.style} ${getEventTypeColor(event.type)}`,
              backgroundColor: designTokens.colors.structure.bg.tertiary,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.sm, marginBottom: designTokens.spacing.xs }}>
              <span style={{ color: designTokens.colors.text.tertiary }}>
                {formatTimestamp(event.timestamp)}
              </span>
              <span style={{ color: getEventTypeColor(event.type), textTransform: 'uppercase', fontSize: designTokens.typography.sizes.xs }}>
                {event.type}
              </span>
              <span style={{ color: designTokens.colors.text.secondary }}>
                {event.source}
              </span>
            </div>
            <div style={{ color: designTokens.colors.text.primary }}>
              {event.content}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const renderTerminalView = () => (
    <GlassPanel bordered style={{ height: '600px', padding: designTokens.spacing.md, backgroundColor: designTokens.colors.structure.bg.primary }}>
      <div style={{
        height: '100%',
        overflowY: 'auto',
        fontFamily: designTokens.typography.fonts.mono,
        fontSize: designTokens.typography.sizes.sm,
        color: designTokens.colors.semantic.success,
      }}>
        {events.map((event) => (
          <div key={event.id} style={{ marginBottom: designTokens.spacing.xs }}>
            <span style={{ color: designTokens.colors.text.tertiary }}>
              [{formatTimestamp(event.timestamp)}]
            </span>{' '}
            <span style={{ color: getEventTypeColor(event.type) }}>
              [{event.type.toUpperCase()}]
            </span>{' '}
            <span style={{ color: designTokens.colors.text.secondary }}>
              {event.source}:
            </span>{' '}
            <span style={{ color: designTokens.colors.text.primary }}>
              {event.content}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const renderTreeView = () => (
    <GlassPanel
      bordered
      borderColor={designTokens.colors.accent.cyan}
      style={{
        marginTop: designTokens.spacing.lg,
        padding: designTokens.spacing.lg,
        backgroundColor: `${designTokens.colors.accent.cyan}0D`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: designTokens.spacing.lg,
          gap: designTokens.spacing.md,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.xs }}>
          <h3
            style={{
              fontFamily: designTokens.typography.fonts.header,
              fontSize: designTokens.typography.sizes.lg,
              fontWeight: designTokens.typography.weights.semibold,
              color: designTokens.colors.accent.cyan,
            }}
          >
            Orchestration Branching Tree
          </h3>
          <p
            style={{
              fontFamily: designTokens.typography.fonts.mono,
              fontSize: designTokens.typography.sizes.xs,
              color: designTokens.colors.text.secondary,
            }}
          >
            Live hierarchy of orchestrator → agents → sub-agents with status-aware glow effects.
          </p>
        </div>
      </div>
      <AgentBranchingTree maxEventsPerAgent={30} />
    </GlassPanel>
  );

  if (loading) {
    return (
      <GlassPanel className={className} style={{ padding: designTokens.spacing.xl, textAlign: 'center' }}>
        <Activity className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: designTokens.colors.accent.cyan }} />
        <div style={{ color: designTokens.colors.text.secondary }}>
          Loading agent sessions...
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{
            fontSize: designTokens.typography.sizes['2xl'],
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.bold,
            color: designTokens.colors.text.primary,
          }}>
            Agent Dashboard
          </h2>
          <p style={{
            color: designTokens.colors.text.secondary,
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fonts.mono,
          }}>
            {sessions.length} sessions • {events.length} events
          </p>
        </div>
        {renderViewModeSelector()}
      </div>

      {/* Metrics */}
      {showMetrics && renderMetrics()}

      {/* Content */}
      {viewMode === 'cards' && renderCardsView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'feed' && renderFeedView()}
      {viewMode === 'terminal' && renderTerminalView()}
      {viewMode === 'tree' && renderTreeView()}

      {/* Empty State */}
      {sessions.length === 0 && (
        <GlassPanel bordered style={{ padding: designTokens.spacing.xl, textAlign: 'center' }}>
          <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: designTokens.colors.text.tertiary, opacity: 0.3 }} />
          <h3 style={{
            fontSize: designTokens.typography.sizes.xl,
            fontWeight: designTokens.typography.weights.semibold,
            color: designTokens.colors.text.primary,
            marginBottom: designTokens.spacing.sm,
          }}>
            No Active Agents
          </h3>
          <p style={{ color: designTokens.colors.text.secondary }}>
            Agent sessions will appear here when they start running
          </p>
        </GlassPanel>
      )}
    </div>
  );
};

export default UnifiedAgentDashboard;
