'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface AgentTool {
  name: string;
  inputs?: Record<string, string>;
  output_preview?: string;
  duration_ms?: number;
  stage?: string;
  purpose?: string;
}

interface AgentFile {
  path: string;
  operation?: string;
  summary?: string;
  language?: string;
}

interface AgentEvent {
  type: string;
  agent_id?: string;
  session_id?: string;
  content: string;
  timestamp: string;
  action?: string;
  thinking?: string;
  status?: string;
  role?: string;
  tool?: AgentTool;
  files?: AgentFile[];
  metadata?: Record<string, unknown>;
}

interface AgentFeedProps {
  agentId?: string;
  maxEvents?: number;
  showTimestamps?: boolean;
  autoScroll?: boolean;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export default function AgentFeed({
  agentId,
  maxEvents = 100,
  showTimestamps = true,
  autoScroll = true,
}: AgentFeedProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'event') {
          const eventData = message.data;
          const data = eventData.payload?.data || {};
          const targetAgent = data.agent_id || eventData.source_app;
          const targetSession = data.session_id || eventData.session_id;

          const shouldInclude =
            !agentId ||
            targetAgent === agentId ||
            targetSession === agentId ||
            eventData.source_app === agentId;

          if (!shouldInclude) {
            return;
          }

          const files: AgentFile[] = Array.isArray(data.files) ? data.files : [];
          const tool: AgentTool | undefined = data.tool;
            const metadata = (data.meta || data.metadata || {}) as Record<string, unknown>;

          const agentEvent: AgentEvent = {
            type: eventData.hook_event_type,
            agent_id: targetAgent,
            session_id: targetSession,
            content: data.content || eventData.payload?.content || eventData.hook_event_type,
            timestamp: eventData.timestamp,
            action: data.action,
            thinking: data.thinking,
            status: data.status,
            role: data.role,
            tool,
            files,
            metadata,
          };

          setEvents((prev) => {
            const updated = [...prev, agentEvent];
            return updated.length > maxEvents ? updated.slice(-maxEvents) : updated;
          });
        } else if (message.type === 'initial') {
          const initialEvents: AgentEvent[] = (message.data as any[])
            .filter((e) => {
              const data = e.payload?.data || {};
              if (!agentId) return true;
              return (
                e.source_app === agentId ||
                data.agent_id === agentId ||
                data.session_id === agentId
              );
            })
            .map((e) => {
              const data = e.payload?.data || {};
              const files: AgentFile[] = Array.isArray(data.files) ? data.files : [];
              const tool: AgentTool | undefined = data.tool;
              const metadata = data.meta || data.metadata || {};
              return {
                type: e.hook_event_type,
                agent_id: data.agent_id || e.source_app,
                session_id: data.session_id || e.session_id,
                content: data.content || e.payload?.content || e.hook_event_type,
                timestamp: e.timestamp,
                action: data.action,
                thinking: data.thinking,
                status: data.status,
                role: data.role,
                tool,
                files,
                metadata,
              } as AgentEvent;
            });

          setEvents(initialEvents.slice(-maxEvents));
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [agentId, maxEvents]);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
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

  const handleClear = () => {
    setEvents([]);
  };

  const badgeClass = (event: AgentEvent) => {
    const action = (event.action || event.type || '').toLowerCase();
    if (action.includes('thinking')) return 'border-blue-400 text-blue-200';
    if (action.includes('tool')) return 'border-amber-400 text-amber-200';
    if (action.includes('file')) return 'border-emerald-400 text-emerald-200';
    if (action.includes('complete')) return 'border-green-400 text-green-200';
    if (action.includes('fail') || action.includes('error')) return 'border-red-400 text-red-200';
    return 'border-slate-600 text-slate-200';
  };

  const renderedEvents = useMemo(() => events.slice().reverse(), [events]);

  return (
    <div
      data-testid="activity-feed"
      className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-lg"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">
            {agentId ? `Agent Feed: ${agentId}` : 'All Agents Feed'}
          </span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{events.length} events</span>
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-gray-800/70 transition-colors"
            title="Clear feed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
      >
        {renderedEvents.length === 0 ? (
          <div className="text-gray-600 text-center py-8">
            Waiting for agent activity...
          </div>
        ) : (
          renderedEvents.map((event, index) => {
            const badge = badgeClass(event);
            const metadata = event.metadata || {};
            const stage = (event.tool?.stage as string) || (metadata.stage as string) || '';
            const purpose = (event.tool?.purpose as string) || (metadata.purpose as string) || '';
            const inputs = event.tool?.inputs || (typeof metadata.inputs === 'object' ? (metadata.inputs as Record<string, string>) : undefined);

            return (
              <div
                key={`${event.timestamp}-${index}`}
                className="rounded border border-gray-800 bg-gray-900/40 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`px-2 py-0.5 rounded border ${badge} uppercase tracking-wide text-[10px]`}>
                    {event.action || event.type}
                  </div>
                  {showTimestamps && (
                    <span className="text-[10px] text-gray-500" title={event.timestamp}>
                      {formatTimestamp(event.timestamp)}
                    </span>
                  )}
                </div>

                <div className="text-gray-200 leading-snug whitespace-pre-line">
                  {event.content}
                </div>

                {(stage || purpose) && (
                  <div className="text-[11px] text-gray-400">
                    {stage && (
                      <span>
                        <span className="text-gray-300">Stage:</span> {stage}
                      </span>
                    )}
                    {stage && purpose ? ' · ' : ''}
                    {purpose && (
                      <span>
                        <span className="text-gray-300">Purpose:</span> {purpose}
                      </span>
                    )}
                  </div>
                )}

                {event.thinking && (
                  <div className="text-cyan-300 italic">
                    “{event.thinking}”
                  </div>
                )}

                {event.tool && (
                  <div className="text-amber-200 text-[11px] space-y-0.5">
                    <div>
                      Tool: {event.tool.name}
                      {event.tool.output_preview && (
                        <span className="text-amber-200/70"> · {event.tool.output_preview}</span>
                      )}
                      {event.tool.duration_ms && (
                        <span className="text-amber-200/70"> · {event.tool.duration_ms}ms</span>
                      )}
                    </div>
                    {inputs && (
                      <div className="text-amber-100/70">
                        Inputs: {Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {event.files && event.files.length > 0 && (
                  <div className="text-emerald-200 text-[11px] space-y-0.5">
                    {event.files.map((file, idx) => (
                      <div key={`${file.path}-${idx}`}>
                        {file.operation ? `${file.operation.toUpperCase()}:` : 'FILE:'}{' '}
                        <span className="text-emerald-100">{file.path}</span>
                        {file.summary && <span className="text-emerald-100/80"> · {file.summary}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!isConnected && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-800 text-red-300 text-xs">
          ⚠️ WebSocket disconnected — attempting to reconnect...
        </div>
      )}
    </div>
  );
}
