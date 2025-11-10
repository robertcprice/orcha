/**
 * LiveMonitorDashboard - Real-time Agent Monitoring Component
 *
 * Consolidates:
 * - /app/monitor/page.tsx
 * - AgentFeed
 * - AgentTerminal
 *
 * Provides split-view monitoring with WebSocket real-time updates.
 */
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Terminal, Zap, Split, Maximize2, Filter } from 'lucide-react';
import { GlassPanel, BrutalistButton, GlassInput, MetricCard, designTokens } from '@/components/design-system';

interface AgentEvent {
  id: string;
  type: string;
  agent_id?: string;
  session_id?: string;
  source_app?: string;
  content?: string;
  timestamp: string;
  payload?: any;
  hook_event_type?: string;
}

interface TerminalLine {
  content: string;
  timestamp: string;
  type: 'output' | 'thinking' | 'error' | 'system';
}

type ViewMode = 'split' | 'feed' | 'terminal';

export interface LiveMonitorDashboardProps {
  defaultView?: ViewMode;
  defaultSession?: string;
  maxEvents?: number;
  wsUrl?: string;
  showStats?: boolean;
  className?: string;
}

export const LiveMonitorDashboard: React.FC<LiveMonitorDashboardProps> = ({
  defaultView = 'split',
  defaultSession = 'all',
  maxEvents = 500,
  wsUrl = 'ws://localhost:4000/ws',
  showStats = true,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [selectedSession, setSelectedSession] = useState<string>(defaultSession);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [stats, setStats] = useState({
    activeSessions: 0,
    eventsPerMin: 0,
    claudeSessions: 0,
    codexSessions: 0,
  });

  const feedRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection with reconnection logic
  const connectWebSocket = () => {
    console.log(`🔌 Attempting to connect to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('📡 LiveMonitor WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      addSystemLine('Connected to live monitor');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'event') {
          handleNewEvent(message.data);
        } else if (message.type === 'initial') {
          handleInitialEvents(message.data);
        } else if (message.type === 'clear') {
          // Handle clear event
          setEvents([]);
          setTerminalLines([]);
          addSystemLine('Events cleared');
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
      addSystemLine('Connection error - will retry', 'error');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket connection closed');
      setIsConnected(false);
      addSystemLine('Disconnected from monitor - reconnecting...');

      // Attempt to reconnect with exponential backoff
      const maxRetries = 10;
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds

      setReconnectAttempts(prev => {
        const attempts = prev + 1;
        if (attempts <= maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), maxDelay);
          console.log(`⏳ Reconnecting in ${delay}ms (attempt ${attempts}/${maxRetries})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          addSystemLine('Max reconnection attempts reached', 'error');
        }
        return attempts;
      });
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      // Clean up on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  // Auto-scroll feed and terminal
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Handle new event
  const handleNewEvent = (eventData: any) => {
    const matchesFilter = selectedSession === 'all' ||
      eventData.source_app === selectedSession ||
      eventData.session_id === selectedSession ||
      eventData.data?.session_id === selectedSession ||
      eventData.data?.agent_id === selectedSession;

    if (!matchesFilter) return;

    const agentEvent: AgentEvent = {
      id: `${eventData.timestamp}-${Math.random()}`,
      type: eventData.event_type || eventData.hook_event_type || eventData.data?.type || 'unknown',
      agent_id: eventData.data?.agent_id || eventData.source_app,
      session_id: eventData.data?.session_id || eventData.session_id,
      source_app: eventData.source_app,
      content: eventData.content || eventData.data?.content || '',
      timestamp: eventData.timestamp,
      payload: eventData.data,
      hook_event_type: eventData.event_type || eventData.hook_event_type,
    };

    // Add to events feed
    setEvents((prev) => {
      const updated = [...prev, agentEvent];
      return updated.length > maxEvents ? updated.slice(-maxEvents) : updated;
    });

    // Add to terminal
    const content = agentEvent.content || JSON.stringify(agentEvent.payload || {});
    let lineType: TerminalLine['type'] = 'output';

    if (agentEvent.type.includes('thinking')) {
      lineType = 'thinking';
    } else if (agentEvent.type.includes('error') || agentEvent.type.includes('failed')) {
      lineType = 'error';
    } else if (agentEvent.type.includes('started') || agentEvent.type.includes('completed')) {
      lineType = 'system';
    }

    addTerminalLine(content, lineType, agentEvent.timestamp);
  };

  // Handle initial events
  const handleInitialEvents = (initialData: any[]) => {
    const filtered = selectedSession === 'all'
      ? initialData
      : initialData.filter((e) =>
          e.source_app === selectedSession ||
          e.session_id === selectedSession
        );

    const mappedEvents: AgentEvent[] = filtered.map((e) => ({
      id: `${e.timestamp}-${Math.random()}`,
      type: e.event_type || e.hook_event_type || e.data?.type || 'unknown',
      agent_id: e.data?.agent_id || e.source_app,
      session_id: e.data?.session_id || e.session_id,
      source_app: e.source_app,
      content: e.content || e.data?.content || '',
      timestamp: e.timestamp,
      payload: e.data,
      hook_event_type: e.event_type || e.hook_event_type,
    }));

    setEvents(mappedEvents.slice(-maxEvents));

    // Also add to terminal
    mappedEvents.forEach((e) => {
      const content = e.content || JSON.stringify(e.payload || {});
      addTerminalLine(content, 'output', e.timestamp);
    });
  };

  // Add line to terminal
  const addTerminalLine = (content: string, type: TerminalLine['type'], timestamp: string) => {
    setTerminalLines((prev) => {
      const updated = [...prev, { content, type, timestamp }];
      return updated.length > maxEvents ? updated.slice(-maxEvents) : updated;
    });
  };

  // Add system message to terminal
  const addSystemLine = (message: string, type: TerminalLine['type'] = 'system') => {
    addTerminalLine(message, type, new Date().toISOString());
  };

  // Calculate stats
  useEffect(() => {
    const sessionIds = new Set(events.map(e => e.session_id).filter(Boolean));
    const claudeSessions = events.filter(e => e.source_app?.toLowerCase().includes('claude')).length;
    const codexSessions = events.filter(e => e.source_app?.toLowerCase().includes('codex')).length;

    setStats({
      activeSessions: sessionIds.size,
      eventsPerMin: events.length > 0 ? Math.round((events.length / 5)) : 0, // Approximate
      claudeSessions,
      codexSessions,
    });
  }, [events]);

  // Get event type color
  const getEventTypeColor = (type: string) => {
    if (type.includes('thinking')) return designTokens.colors.accent.purple;
    if (type.includes('tool')) return designTokens.colors.accent.cyan;
    if (type.includes('error') || type.includes('failed')) return designTokens.colors.semantic.error;
    if (type.includes('completed') || type.includes('success')) return designTokens.colors.semantic.success;
    if (type.includes('started')) return designTokens.colors.accent.yellow;
    return designTokens.colors.text.secondary;
  };

  // Get terminal line color
  const getTerminalLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'thinking': return designTokens.colors.accent.purple;
      case 'error': return designTokens.colors.semantic.error;
      case 'system': return designTokens.colors.accent.cyan;
      default: return designTokens.colors.text.primary;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Render view mode selector
  const renderViewModeSelector = () => (
    <div style={{ display: 'flex', gap: designTokens.spacing.sm }}>
      <BrutalistButton
        variant={viewMode === 'split' ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => setViewMode('split')}
      >
        <Split className="w-4 h-4" />
        <span>Split</span>
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
    </div>
  );

  // Clear all metrics and events
  const handleClearMetrics = async () => {
    try {
      // Clear local state
      setEvents([]);
      setTerminalLines([]);
      setStats({
        activeSessions: 0,
        eventsPerMin: 0,
        claudeSessions: 0,
        codexSessions: 0,
      });

      // Call server to clear events
      await fetch('http://localhost:4000/events/clear', {
        method: 'DELETE',
      });

      addSystemLine('All metrics and events cleared', 'system');
    } catch (error) {
      console.error('Failed to clear metrics:', error);
      addSystemLine('Failed to clear metrics', 'error');
    }
  };

  // Render stats
  const renderStats = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{
          fontSize: designTokens.typography.sizes.lg,
          fontFamily: designTokens.typography.fonts.header,
          fontWeight: designTokens.typography.weights.semibold,
          color: designTokens.colors.text.primary,
        }}>
          Live Metrics
        </h3>
        <BrutalistButton
          variant="secondary"
          size="sm"
          onClick={handleClearMetrics}
        >
          Clear Metrics
        </BrutalistButton>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: designTokens.spacing.md }}>
        <MetricCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon={<Activity className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.cyan}
        />
        <MetricCard
          title="Events/min"
          value={stats.eventsPerMin}
          icon={<Zap className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.purple}
        />
        <MetricCard
          title="Claude Events"
          value={stats.claudeSessions}
          icon={<Activity className="w-5 h-5" />}
          accentColor={designTokens.colors.accent.cyan}
        />
        <MetricCard
          title="Codex Events"
          value={stats.codexSessions}
          icon={<Terminal className="w-5 h-5" />}
          accentColor={designTokens.colors.semantic.success}
        />
      </div>
    </div>
  );

  // Render feed
  const renderFeed = (height: string = '600px') => (
    <GlassPanel
      bordered
      style={{
        height,
        padding: designTokens.spacing.md,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: designTokens.spacing.sm,
        paddingBottom: designTokens.spacing.sm,
        borderBottom: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.structure.border.tertiary}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing.sm,
        }}>
          <Zap className="w-4 h-4" style={{ color: designTokens.colors.accent.cyan }} />
          <span style={{
            color: designTokens.colors.text.primary,
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.semibold,
          }}>
            Agent Event Feed
          </span>
        </div>
        <div style={{
          padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`,
          border: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${
            isConnected ? designTokens.colors.semantic.success : designTokens.colors.semantic.error
          }`,
          color: isConnected ? designTokens.colors.semantic.success : designTokens.colors.semantic.error,
          fontSize: designTokens.typography.sizes.xs,
          fontFamily: designTokens.typography.fonts.mono,
        }}>
          {isConnected ? '● CONNECTED' : '○ DISCONNECTED'}
        </div>
      </div>

      <div
        ref={feedRef}
        style={{
          flex: 1,
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing.sm,
              marginBottom: designTokens.spacing.xs,
            }}>
              <span style={{ color: designTokens.colors.text.tertiary }}>
                {formatTimestamp(event.timestamp)}
              </span>
              <span style={{
                color: getEventTypeColor(event.type),
                textTransform: 'uppercase',
                fontSize: designTokens.typography.sizes.xs,
              }}>
                {event.type}
              </span>
              <span style={{ color: designTokens.colors.text.secondary }}>
                {event.source_app}
              </span>
            </div>
            <div style={{ color: designTokens.colors.text.primary }}>
              {event.content || JSON.stringify(event.payload)}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  // Render terminal
  const renderTerminal = (height: string = '600px') => (
    <GlassPanel
      bordered
      style={{
        height,
        padding: designTokens.spacing.md,
        backgroundColor: designTokens.colors.structure.bg.primary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing.sm,
        marginBottom: designTokens.spacing.sm,
        paddingBottom: designTokens.spacing.sm,
        borderBottom: `${designTokens.borders.width.thin} ${designTokens.borders.style} ${designTokens.colors.structure.border.tertiary}`,
      }}>
        <Terminal className="w-4 h-4" style={{ color: designTokens.colors.semantic.success }} />
        <span style={{
          color: designTokens.colors.text.primary,
          fontFamily: designTokens.typography.fonts.header,
          fontWeight: designTokens.typography.weights.semibold,
        }}>
          Agent Session Terminal
        </span>
      </div>

      <div
        ref={terminalRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: designTokens.typography.fonts.mono,
          fontSize: designTokens.typography.sizes.sm,
        }}
      >
        {terminalLines.map((line, index) => (
          <div key={index} style={{ marginBottom: designTokens.spacing.xs }}>
            <span style={{ color: designTokens.colors.text.tertiary }}>
              [{formatTimestamp(line.timestamp)}]
            </span>{' '}
            <span style={{
              color: getTerminalLineColor(line.type),
              textTransform: 'uppercase',
              fontSize: designTokens.typography.sizes.xs,
            }}>
              [{line.type}]
            </span>{' '}
            <span style={{ color: designTokens.colors.text.primary }}>
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  // Render help section
  const renderHelp = () => (
    <GlassPanel
      bordered
      borderColor={designTokens.colors.accent.cyan}
      style={{
        padding: designTokens.spacing.md,
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
        How to use Live Monitor
      </h3>
      <ul style={{
        color: designTokens.colors.text.secondary,
        fontSize: designTokens.typography.sizes.sm,
        fontFamily: designTokens.typography.fonts.mono,
        listStyle: 'none',
        padding: 0,
      }}>
        <li style={{ marginBottom: designTokens.spacing.xs }}>
          • <strong style={{ color: designTokens.colors.text.primary }}>Feed</strong>: Real-time agent thinking events with color-coded types
        </li>
        <li style={{ marginBottom: designTokens.spacing.xs }}>
          • <strong style={{ color: designTokens.colors.text.primary }}>Terminal</strong>: Full session log view with timestamps
        </li>
        <li style={{ marginBottom: designTokens.spacing.xs }}>
          • <strong style={{ color: designTokens.colors.text.primary }}>Filter</strong>: Enter session ID or 'all' to see all activity
        </li>
        <li style={{ marginBottom: designTokens.spacing.xs }}>
          • <strong style={{ color: designTokens.colors.text.primary }}>Auto-scroll</strong>: Both views automatically scroll to latest
        </li>
        <li>
          • <strong style={{ color: designTokens.colors.text.primary }}>Colors</strong>: Purple=Thinking, Cyan=Tools, Green=Success, Red=Errors
        </li>
      </ul>
    </GlassPanel>
  );

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: designTokens.spacing.md }}>
        <div>
          <h2 style={{
            fontSize: designTokens.typography.sizes['2xl'],
            fontFamily: designTokens.typography.fonts.header,
            fontWeight: designTokens.typography.weights.bold,
            color: designTokens.colors.text.primary,
          }}>
            Live Agent Monitor
          </h2>
          <p style={{
            color: designTokens.colors.text.secondary,
            fontSize: designTokens.typography.sizes.sm,
            fontFamily: designTokens.typography.fonts.mono,
          }}>
            Real-time agent thinking and session logs
          </p>
        </div>
        {renderViewModeSelector()}
      </div>

      {/* Session Filter */}
      <div>
        <GlassInput
          label="Filter by Session/Agent ID"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          placeholder="Enter session ID or 'all' for all agents"
          fullWidth
        />
      </div>

      {/* Stats */}
      {showStats && renderStats()}

      {/* Content Views */}
      {viewMode === 'split' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: designTokens.spacing.lg,
        }}>
          {renderFeed('600px')}
          {renderTerminal('600px')}
        </div>
      )}

      {viewMode === 'feed' && renderFeed('800px')}
      {viewMode === 'terminal' && renderTerminal('800px')}

      {/* Help */}
      {renderHelp()}
    </div>
  );
};

export default LiveMonitorDashboard;
