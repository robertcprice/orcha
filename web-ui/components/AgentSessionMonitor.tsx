"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, CheckCircle2, XCircle, Loader2, Circle, Clock, Activity } from "lucide-react";

interface AgentSession {
  sessionId: string;
  source: string;
  lastActivity: number;
  status: 'running' | 'completed' | 'idle';
  events: any[];
}

interface Props {
  session: AgentSession;
  index: number;
}

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'SessionStart':
      return 'border-l-green-500 bg-green-500/10';
    case 'SessionEnd':
      return 'border-l-blue-500 bg-blue-500/10';
    case 'PreToolUse':
      return 'border-l-purple-500 bg-purple-500/10';
    case 'PostToolUse':
      return 'border-l-cyan-500 bg-cyan-500/10';
    case 'UserPromptSubmit':
      return 'border-l-yellow-500 bg-yellow-500/10';
    case 'Notification':
      return 'border-l-orange-500 bg-orange-500/10';
    default:
      return 'border-l-gray-500 bg-muted/20';
  }
};

const getToolName = (payload: any): string => {
  if (!payload) return 'Unknown';
  if (payload.tool_name) return payload.tool_name;
  if (payload.name) return payload.name;
  return 'Unknown';
};

const getDetailedToolInfo = (payload: any): { summary: string; details: string } => {
  if (!payload) return { summary: '', details: '' };

  try {
    const input = payload.tool_input
      ? (typeof payload.tool_input === 'string' ? JSON.parse(payload.tool_input) : payload.tool_input)
      : payload;

    let summary = '';
    let details = '';

    // Read tool
    if (input.file_path && !input.new_string) {
      summary = `Reading: ${input.file_path}`;
      details = `File: ${input.file_path}${input.offset ? `\\nStarting at line ${input.offset}` : ''}${input.limit ? ` (${input.limit} lines)` : ''}`;
    }

    // Write tool
    else if (input.file_path && input.content) {
      summary = `Writing file: ${input.file_path}`;
      const preview = input.content.substring(0, 200);
      details = `File: ${input.file_path}\\nContent preview:\\n${preview}${input.content.length > 200 ? '...' : ''}\\n(${input.content.length} chars)`;
    }

    // Edit tool
    else if (input.file_path && input.old_string && input.new_string) {
      summary = `Editing: ${input.file_path}`;
      details = `File: ${input.file_path}\\nReplacing:\\n"${input.old_string.substring(0, 100)}${input.old_string.length > 100 ? '...' : ''}"\\nWith:\\n"${input.new_string.substring(0, 100)}${input.new_string.length > 100 ? '...' : ''}"`;
    }

    // Bash tool
    else if (input.command) {
      summary = `Running: ${input.command.substring(0, 50)}${input.command.length > 50 ? '...' : ''}`;
      details = `Command: ${input.command}${input.description ? `\\nPurpose: ${input.description}` : ''}`;
    }

    // Grep/Search
    else if (input.pattern) {
      summary = `Searching for: ${input.pattern}`;
      details = `Pattern: ${input.pattern}${input.path ? `\\nIn: ${input.path}` : ''}${input.glob ? `\\nFiles: ${input.glob}` : ''}`;
    }

    // Glob/File finding
    else if (input.pattern && !payload.tool_name?.includes('rep')) {
      summary = `Finding files: ${input.pattern}`;
      details = `Pattern: ${input.pattern}${input.path ? `\\nIn: ${input.path}` : ''}`;
    }

    // WebFetch
    else if (input.url) {
      summary = `Fetching: ${input.url}`;
      details = `URL: ${input.url}${input.prompt ? `\\nLooking for: ${input.prompt}` : ''}`;
    }

    // Generic fallback
    else {
      summary = JSON.stringify(input).substring(0, 80);
      details = JSON.stringify(input, null, 2).substring(0, 300);
    }

    return { summary, details };
  } catch {
    return {
      summary: String(payload.tool_input || '').substring(0, 80),
      details: String(payload.tool_input || '').substring(0, 300)
    };
  }
};

export default function AgentSessionMonitor({ session, index }: Props) {
  const [events, setEvents] = useState<any[]>(session.events || []);
  const [isExpanded, setIsExpanded] = useState(false);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket for live updates
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connect = () => {
      ws = new WebSocket('ws://localhost:4000');

      ws.onopen = () => {
        console.log(`✅ Connected to event stream for session ${session.sessionId}`);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'event' && data.data.session_id === session.sessionId) {
          setEvents(prev => [...prev, data.data]);

          // Auto-scroll to bottom
          setTimeout(() => {
            if (eventsContainerRef.current) {
              eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [session.sessionId]);

  const getStatusIcon = () => {
    switch (session.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getColorFromIndex = (idx: number) => {
    const colors = ['purple', 'blue', 'green', 'orange', 'cyan', 'pink', 'indigo', 'amber'];
    return colors[idx % colors.length];
  };

  const color = getColorFromIndex(index);
  const lastEvent = events[events.length - 1];
  const sessionName = session.source || 'Claude Agent';
  const timeSinceLastActivity = session.lastActivity
    ? `${Math.floor((Date.now() - session.lastActivity) / 1000)}s ago`
    : 'Unknown';

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Brain className={`w-5 h-5 text-${color}-400`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{sessionName}</h3>
            <p className="text-xs text-muted-foreground">
              Session {session.sessionId.substring(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-semibold capitalize ${
            session.status === 'running' ? 'text-blue-400' :
            session.status === 'completed' ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {session.status}
          </span>
        </div>
      </div>

      {/* Last Activity */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Clock className="w-3 h-3" />
          <span>Last Activity: {timeSinceLastActivity}</span>
        </div>
        {lastEvent && (
          <div className="text-sm text-foreground font-medium">
            {lastEvent.hook_event_type === 'PreToolUse'
              ? getDetailedToolInfo(lastEvent.payload).summary || getToolName(lastEvent.payload)
              : lastEvent.hook_event_type === 'PostToolUse'
              ? `✓ Completed: ${getToolName(lastEvent.payload)}`
              : lastEvent.summary || 'Activity recorded'
            }
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Events</span>
          </div>
          <div className="text-sm font-bold text-foreground">{events.length}</div>
        </div>

        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tool Calls</span>
          </div>
          <div className="text-sm font-bold text-foreground">
            {events.filter(e => e.hook_event_type === 'PreToolUse').length}
          </div>
        </div>

        <div className="p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Status</span>
          </div>
          <div className={`text-sm font-bold ${
            session.status === 'running' ? 'text-blue-400' :
            session.status === 'completed' ? 'text-green-400' :
            'text-gray-400'
          }`}>
            {session.status === 'running' ? '● LIVE' :
             session.status === 'completed' ? '✓ DONE' :
             '○ IDLE'}
          </div>
        </div>
      </div>

      {/* Toggle Events */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mb-3 px-3 py-2 bg-muted/50 hover:bg-muted/70 rounded-lg text-sm font-medium transition-all border border-border"
      >
        {isExpanded ? 'Hide' : 'Show'} Event Feed ({events.length} events)
      </button>

      {/* Live Event Feed */}
      {isExpanded && (
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-2">
            <span>Live Activity Feed</span>
            {session.status === 'running' && (
              <span className="text-blue-400 text-[10px] animate-pulse">● LIVE</span>
            )}
          </div>
          <div
            ref={eventsContainerRef}
            className="bg-muted/20 rounded-lg p-3 h-80 overflow-y-auto font-mono text-xs space-y-1.5 border border-border"
          >
            {events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No events yet
              </div>
            ) : (
              events.map((event, i) => (
                <div
                  key={`event-${event.id || i}-${event.timestamp}`}
                  className={`p-2 rounded border-l-2 ${getEventColor(event.hook_event_type)}`}
                >
                  <div className="text-muted-foreground text-[10px] mb-0.5 flex items-center justify-between">
                    <span>{event.hook_event_type}</span>
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {event.hook_event_type === 'PreToolUse' && (() => {
                    const toolInfo = getDetailedToolInfo(event.payload);
                    return (
                      <div className="space-y-1">
                        <div className="text-foreground font-semibold">
                          {toolInfo.summary || `Tool: ${getToolName(event.payload)}`}
                        </div>
                        {toolInfo.details && (
                          <div className="text-muted-foreground text-[10px] whitespace-pre-wrap">
                            {toolInfo.details}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {event.hook_event_type === 'PostToolUse' && (
                    <div className="text-foreground">
                      ✓ Completed: {getToolName(event.payload)}
                    </div>
                  )}

                  {event.hook_event_type === 'SessionStart' && (
                    <div className="text-green-400 font-semibold">
                      Session started
                    </div>
                  )}

                  {event.hook_event_type === 'SessionEnd' && (
                    <div className="text-blue-400 font-semibold">
                      Session ended
                    </div>
                  )}

                  {event.summary && event.hook_event_type !== 'PreToolUse' && event.hook_event_type !== 'PostToolUse' && (
                    <div className="text-foreground">{event.summary}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
