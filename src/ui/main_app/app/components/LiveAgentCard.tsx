'use client';

import { useEffect, useState, useRef } from 'react';
import { Check, Clock, AlertCircle, Activity, Terminal } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface LiveAgentCardProps {
  agentId: string;
  agentName: string;
  agentType: 'claude' | 'codex' | 'manager';
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
}

export default function LiveAgentCard({
  agentId,
  agentName,
  agentType,
  status: initialStatus
}: LiveAgentCardProps) {
  const [events, setEvents] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const feedRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:4000/ws');
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'event') {
          const eventData = message.data;

          // Check if event is for this agent
          const isForThisAgent =
            eventData.source_app === agentId ||
            eventData.session_id === agentId ||
            eventData.payload?.data?.agent_id === agentId;

          if (isForThisAgent) {
            const content = eventData.payload?.content ||
                          eventData.payload?.data?.content ||
                          eventData.hook_event_type;

            // Add to feed
            setEvents((prev) => [...prev.slice(-19), content]);

            // Update status based on event type
            const eventType = eventData.hook_event_type;
            if (eventType.includes('started')) {
              setStatus('executing');
            } else if (eventType.includes('thinking')) {
              setStatus('thinking');
            } else if (eventType.includes('completed')) {
              setStatus('completed');
            } else if (eventType.includes('failed')) {
              setStatus('failed');
            }

            // Extract tasks from event
            if (eventData.payload?.data?.tasks) {
              setTasks(eventData.payload.data.tasks);
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [agentId]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const getStatusColor = () => {
    switch (status) {
      case 'thinking': return 'bg-blue-500';
      case 'executing': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'thinking': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'executing': return <Clock className="w-4 h-4 animate-spin" />;
      case 'completed': return <Check className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  const getAgentColor = () => {
    switch (agentType) {
      case 'claude': return 'border-blue-500/30 bg-blue-950/20';
      case 'codex': return 'border-green-500/30 bg-green-950/20';
      case 'manager': return 'border-purple-500/30 bg-purple-950/20';
      default: return 'border-gray-500/30 bg-gray-950/20';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${getAgentColor()}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">{agentName}</h3>
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${getStatusColor()} bg-opacity-20 text-white`}>
            {getStatusIcon()}
            <span className="capitalize">{status}</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {agentType.toUpperCase()} • {agentId.substring(0, 8)}
        </div>
      </div>

      {/* Task Checklist */}
      {tasks.length > 0 && (
        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Tasks</h4>
          <div className="space-y-1">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                {task.status === 'completed' ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : task.status === 'in_progress' ? (
                  <Clock className="w-3 h-3 text-yellow-500 animate-spin" />
                ) : task.status === 'failed' ? (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-gray-600" />
                )}
                <span className={`flex-1 ${
                  task.status === 'completed' ? 'text-gray-500 line-through' :
                  task.status === 'in_progress' ? 'text-yellow-400' :
                  task.status === 'failed' ? 'text-red-400' :
                  'text-gray-300'
                }`}>
                  {task.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase flex items-center gap-2">
          <Activity className="w-3 h-3" />
          Live Activity Feed
        </h4>
        <div
          ref={feedRef}
          className="bg-black/50 rounded border border-gray-800 p-2 h-32 overflow-y-auto font-mono text-xs"
        >
          {events.length === 0 ? (
            <div className="text-gray-600 text-center py-4">
              Waiting for activity...
            </div>
          ) : (
            events.map((event, i) => (
              <div key={i} className="text-gray-300 mb-1 hover:text-white">
                {event}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
