"use client";

import { useEffect, useState } from "react";
import { Brain, GitBranch, CheckCircle2, Play, MessageSquare, FileCode } from "lucide-react";

interface OrchestratorEvent {
  event_type: string;
  timestamp: string;
  data: {
    type: string;
    task_id: string;
    timestamp: string;
    stage?: string;
    reasoning?: string;
    decision?: string;
    next_action?: string;
    agent?: string;
    summon_reason?: string;
    plan?: any;
    plan_id?: string;
    tasks?: any[];
    phase?: string;
    turn?: number;
    tool_name?: string;
    input_preview?: string;
  };
}

export default function OrchestratorEventsMonitor() {
  const [events, setEvents] = useState<OrchestratorEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const eventSource = new EventSource("/api/orchestrator/events");

    eventSource.onopen = () => {
      setConnectionStatus('connected');
      console.log('📡 Connected to orchestrator events stream');
    };

    eventSource.onerror = (error) => {
      setConnectionStatus('disconnected');
      console.error('❌ Orchestrator events stream error:', error);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('✅ Orchestrator events stream connected to:', data.channel);
          return;
        }

        // Add event to list (newest first)
        setEvents((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 events

        console.log('📥 Received orchestrator event:', data.event_type || data.data?.type);
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    return () => {
      eventSource.close();
      setConnectionStatus('disconnected');
    };
  }, []);

  const getEventIcon = (eventType: string) => {
    if (eventType === 'orchestrator_reasoning') {
      return <Brain className="w-4 h-4 text-purple-400" />;
    } else if (eventType === 'orchestrator_decision') {
      return <GitBranch className="w-4 h-4 text-blue-400" />;
    } else if (eventType === 'orchestrator_plan_created') {
      return <FileCode className="w-4 h-4 text-green-400" />;
    } else if (eventType === 'orchestrator_execution_start') {
      return <Play className="w-4 h-4 text-yellow-400" />;
    } else if (eventType === 'orchestrator_guidance_request') {
      return <MessageSquare className="w-4 h-4 text-orange-400" />;
    } else if (eventType === 'orchestrator_execution_complete') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    return <Brain className="w-4 h-4 text-gray-400" />;
  };

  const getEventColor = (eventType: string) => {
    if (eventType === 'orchestrator_reasoning') return 'border-purple-500/50 bg-purple-900/10';
    if (eventType === 'orchestrator_decision') return 'border-blue-500/50 bg-blue-900/10';
    if (eventType === 'orchestrator_plan_created') return 'border-green-500/50 bg-green-900/10';
    if (eventType === 'orchestrator_execution_start') return 'border-yellow-500/50 bg-yellow-900/10';
    if (eventType === 'orchestrator_guidance_request') return 'border-orange-500/50 bg-orange-900/10';
    if (eventType === 'orchestrator_execution_complete') return 'border-green-500/50 bg-green-900/10';
    return 'border-gray-500/50 bg-gray-900/10';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);

      if (seconds < 60) return `${seconds}s ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const renderEventContent = (event: OrchestratorEvent) => {
    const eventType = event.event_type || event.data?.type;
    const data = event.data;

    if (eventType === 'orchestrator_reasoning') {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-400 min-w-[60px]">Stage:</span>
            <span className="text-sm text-gray-200 font-medium">{data.stage}</span>
          </div>
          {data.reasoning && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Thinking:</span>
              <span className="text-sm text-gray-300">{data.reasoning}</span>
            </div>
          )}
          {data.decision && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Decision:</span>
              <span className="text-sm text-blue-300">{data.decision}</span>
            </div>
          )}
          {data.next_action && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Next:</span>
              <span className="text-sm text-green-300">{data.next_action}</span>
            </div>
          )}
        </div>
      );
    }

    if (eventType === 'orchestrator_decision') {
      return (
        <div className="space-y-2">
          {data.agent && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Agent:</span>
              <span className="text-sm text-blue-300 font-medium">{data.agent}</span>
            </div>
          )}
          {data.decision && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Summon:</span>
              <span className="text-sm text-gray-300">{data.decision}</span>
            </div>
          )}
          {data.summon_reason && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Reason:</span>
              <span className="text-sm text-gray-400">{data.summon_reason}</span>
            </div>
          )}
        </div>
      );
    }

    if (eventType === 'orchestrator_plan_created') {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-400 min-w-[60px]">Plan ID:</span>
            <span className="text-sm text-green-300 font-mono">{data.plan_id || 'N/A'}</span>
          </div>
          {data.tasks && data.tasks.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-400">Tasks ({data.tasks.length}):</span>
              <div className="mt-1 space-y-1">
                {data.tasks.slice(0, 3).map((task: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-300 pl-4 border-l-2 border-green-500/30">
                    {task.title || task.description || `Task ${idx + 1}`}
                  </div>
                ))}
                {data.tasks.length > 3 && (
                  <div className="text-xs text-gray-500 pl-4">
                    ...and {data.tasks.length - 3} more tasks
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (eventType === 'orchestrator_execution_start') {
      return (
        <div className="space-y-2">
          {data.phase && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Phase:</span>
              <span className="text-sm text-yellow-300">{data.phase}</span>
            </div>
          )}
          {data.turn !== undefined && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Turn:</span>
              <span className="text-sm text-gray-300">#{data.turn}</span>
            </div>
          )}
        </div>
      );
    }

    if (eventType === 'tool_call') {
      return (
        <div className="space-y-2">
          {data.tool_name && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Tool:</span>
              <span className="text-sm text-cyan-300 font-mono">{data.tool_name}</span>
            </div>
          )}
          {data.input_preview && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 min-w-[60px]">Input:</span>
              <span className="text-sm text-gray-400 font-mono truncate">{data.input_preview}</span>
            </div>
          )}
        </div>
      );
    }

    // Fallback for other event types
    return (
      <div className="text-sm text-gray-400">
        <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Orchestrator Reasoning
        </h2>
        <div className={`px-2 py-1 text-xs font-medium rounded border ${
          connectionStatus === 'connected'
            ? 'bg-green-900/20 text-green-400 border-green-700/30'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-900/20 text-yellow-400 border-yellow-700/30'
            : 'bg-red-900/20 text-red-400 border-red-700/30'
        }`}>
          {connectionStatus === 'connected' ? '● Live' : connectionStatus === 'connecting' ? '○ Connecting' : '○ Disconnected'}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8">
          {connectionStatus === 'connected'
            ? 'Waiting for orchestrator events...'
            : 'Not connected to orchestrator event stream'}
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {events.map((event, idx) => {
            const eventType = event.event_type || event.data?.type || 'unknown';
            return (
              <div
                key={`${event.data.task_id}-${idx}`}
                className={`p-3 rounded-lg border ${getEventColor(eventType)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getEventIcon(eventType)}
                    <span className="text-sm font-medium text-gray-200">
                      {eventType.replace('orchestrator_', '').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(event.timestamp || event.data.timestamp)}
                  </span>
                </div>

                {renderEventContent(event)}

                <div className="mt-2 text-xs text-gray-600 font-mono truncate">
                  Task: {event.data.task_id?.substring(0, 16)}...
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
