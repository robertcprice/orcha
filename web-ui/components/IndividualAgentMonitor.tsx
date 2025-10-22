"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, CheckCircle2, XCircle, Loader2, Circle, DollarSign, Clock, MessageSquare } from "lucide-react";

interface AgentActivity {
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentTask?: string;
  lastActivity?: string;
  sessionId?: string;
  cost?: number;
  duration?: number;
  turns?: number;
}

interface LogEntry {
  timestamp: string;
  role: string;
  type: 'spawn' | 'progress' | 'complete' | 'error' | 'info';
  message: string;
  metadata?: {
    sessionId?: string;
    cost?: number;
    duration?: number;
    turns?: number;
  };
}

interface Props {
  role: 'PP' | 'AR' | 'IM' | 'RD' | 'DOC' | 'CODE' | 'QA' | 'RES' | 'DATA' | 'TRAIN' | 'DEVOPS' | 'COORD';
  name: string;
  description: string;
  color: string;
}

const roleColors = {
  PP: 'purple',
  AR: 'blue',
  IM: 'green',
  RD: 'orange',
};

export default function IndividualAgentMonitor({ role, name, description, color }: Props) {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveOutput, setLiveOutput] = useState<string>('');
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // Fetch activity
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('/api/agents/activity');
        const data = await response.json();
        if (data.agents && data.agents[role]) {
          setActivity(data.agents[role]);
        }
      } catch (error) {
        console.error(`Failed to fetch activity for ${role}:`, error);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 2000);
    return () => clearInterval(interval);
  }, [role]);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/agents/logs?role=${role}&limit=20`);
        const data = await response.json();
        if (data.logs) {
          setLogs(data.logs);

          // Auto-scroll to bottom
          setTimeout(() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      } catch (error) {
        console.error(`Failed to fetch logs for ${role}:`, error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [role]);

  // Fetch live output when agent has a session (running or recently completed)
  useEffect(() => {
    if (!activity || !activity.sessionId) {
      // Only clear output if there's no session at all
      // Don't clear when status changes from running to completed
      return;
    }

    const fetchOutput = async () => {
      try {
        const response = await fetch(`/api/agents/output?taskId=${activity.sessionId}`);
        const data = await response.json();
        if (data.stdout) {
          setLiveOutput(data.stdout);

          // Auto-scroll output to bottom (only when running)
          if (activity.status === 'running') {
            setTimeout(() => {
              if (outputContainerRef.current) {
                outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
              }
            }, 50);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch output for ${role}:`, error);
      }
    };

    fetchOutput();

    // Keep polling while running, fetch once when completed/failed
    if (activity.status === 'running') {
      const interval = setInterval(fetchOutput, 1000);
      return () => clearInterval(interval);
    }
  }, [activity, role]);

  const getStatusIcon = () => {
    if (!activity) return <Circle className="w-4 h-4 text-gray-400" />;

    switch (activity.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!activity) return 'gray';

    switch (activity.status) {
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Brain className={`w-5 h-5 text-${color}-400`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-semibold text-${statusColor}-400 capitalize`}>
            {activity?.status || 'idle'}
          </span>
        </div>
      </div>

      {/* Current Task */}
      {activity?.currentTask && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground mb-1">Current Task</div>
          <div className="text-sm text-foreground font-medium">{activity.currentTask}</div>
        </div>
      )}

      {/* Session Info */}
      {activity?.sessionId && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cost</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              {activity.cost ? `$${activity.cost.toFixed(4)}` : '-'}
            </div>
          </div>

          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Duration</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              {activity.duration ? `${activity.duration.toFixed(1)}s` : '-'}
            </div>
          </div>

          <div className="p-2 bg-muted/30 rounded-lg col-span-2">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Turns</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              {activity.turns || '-'}
            </div>
          </div>
        </div>
      )}

      {/* Live Claude Output (when running or recently completed) */}
      {liveOutput && (
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-2">
            <span>Claude Output (--print)</span>
            {activity?.status === 'running' && (
              <span className="text-blue-400 text-[10px] animate-pulse">● LIVE</span>
            )}
            {activity?.status === 'completed' && (
              <span className="text-green-400 text-[10px]">✓ COMPLETE</span>
            )}
            {activity?.status === 'failed' && (
              <span className="text-red-400 text-[10px]">✗ FAILED</span>
            )}
          </div>
          <div
            ref={outputContainerRef}
            className="bg-black/80 rounded-lg p-3 h-80 overflow-y-auto font-mono text-xs border border-green-500/30"
          >
            <pre className="text-green-400 whitespace-pre-wrap break-words">
              {liveOutput}
            </pre>
          </div>
        </div>
      )}

      {/* Live Log Feed */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-semibold">Live Activity Feed</div>
        <div
          ref={logsContainerRef}
          className="bg-muted/20 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-1.5 border border-border"
        >
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No activity yet
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={`agent-${role}-log-${i}-${log.timestamp}`}
                className={`p-2 rounded border-l-2 ${
                  log.type === 'error'
                    ? 'border-l-red-500 bg-red-500/10'
                    : log.type === 'complete'
                    ? 'border-l-green-500 bg-green-500/10'
                    : log.type === 'spawn'
                    ? 'border-l-blue-500 bg-blue-500/10'
                    : 'border-l-gray-500 bg-muted/20'
                }`}
              >
                <div className="text-muted-foreground text-[10px] mb-0.5">
                  {log.type.toUpperCase()}
                </div>
                <div className="text-foreground">{log.message}</div>
                {log.metadata && (
                  <div className="text-muted-foreground text-[10px] mt-1 space-x-2">
                    {log.metadata.cost && <span>Cost: ${log.metadata.cost.toFixed(4)}</span>}
                    {log.metadata.duration && <span>Duration: {log.metadata.duration.toFixed(1)}s</span>}
                    {log.metadata.turns && <span>Turns: {log.metadata.turns}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Session ID */}
      {activity?.sessionId && (
        <div className="mt-3 p-2 bg-muted/20 rounded-lg">
          <div className="text-[10px] text-muted-foreground mb-1">Session ID</div>
          <div className="text-[10px] font-mono text-foreground break-all">
            {activity.sessionId}
          </div>
        </div>
      )}
    </div>
  );
}
