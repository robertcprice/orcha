"use client";

import { useEffect, useState } from "react";
import { Terminal, Activity, Clock } from "lucide-react";

interface OrchestrationSession {
  id: string;
  task_id: string;
  title: string;
  status: "active" | "idle" | "completed" | "failed";
  startTime: Date;
  phases_completed: number;
  total_phases: number;
}

export default function SessionMonitor() {
  const [sessions, setSessions] = useState<OrchestrationSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch active tasks
  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/tasks/status');
        const data = await response.json();

        if (data.ok && data.tasks) {
          const activeTasks = data.tasks
            .filter((task: any) => task.status === 'active' || task.status === 'pending')
            .map((task: any) => ({
              id: task.task_id,
              task_id: task.task_id,
              title: task.title,
              status: task.status === 'active' ? 'active' : 'idle',
              startTime: new Date(task.created_at),
              phases_completed: 0,
              total_phases: 4, // Planning, Decomposition, Execution, Validation
            }));

          setSessions(activeTasks);
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();

    // Refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  // Connect to real-time event stream
  useEffect(() => {
    const eventSource = new EventSource("/api/sessions/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          return;
        }

        const { action, task_id } = data;

        setSessions((prev) => {
          const updated = prev.map((session) => {
            if (session.task_id === task_id) {
              let phases_completed = session.phases_completed;

              if (action === 'planning_complete') {
                phases_completed = 1;
              } else if (action === 'task_decomposed') {
                phases_completed = 2;
              } else if (action === 'manager_complete') {
                phases_completed = 3;
              } else if (action === 'validation_complete') {
                phases_completed = 4;
              } else if (action === 'orchestrator_complete') {
                return { ...session, status: 'completed', phases_completed: 4 };
              } else if (action === 'error') {
                return { ...session, status: 'failed' };
              }

              return {
                ...session,
                status: 'active' as const,
                phases_completed,
              };
            }
            return session;
          });

          // Add new sessions if task_id is new
          if (action === 'orchestrator_start' && !prev.find(s => s.task_id === task_id)) {
            updated.push({
              id: task_id,
              task_id,
              title: data.meta?.user_request || 'New Task',
              status: 'active',
              startTime: new Date(data.ts),
              phases_completed: 0,
              total_phases: 4,
            });
          }

          return updated;
        });
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getUptime = (startTime: Date) => {
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgress = (session: OrchestrationSession) => {
    return (session.phases_completed / session.total_phases) * 100;
  };

  const getPhaseLabel = (phases_completed: number) => {
    switch (phases_completed) {
      case 0:
        return "Initializing...";
      case 1:
        return "Planning Complete";
      case 2:
        return "Tasks Decomposed";
      case 3:
        return "Execution In Progress";
      case 4:
        return "Validation Complete";
      default:
        return "Unknown Phase";
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-5">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-blue-400" />
          Active Sessions
        </h2>
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          Active Sessions
        </h2>
        <div className="px-2 py-1 bg-green-900/20 text-green-400 text-xs font-medium rounded border border-green-700/30">
          {sessions.filter(s => s.status === 'active').length} Active
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8">
          No active sessions. Submit a task to start orchestration.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      session.status === "active"
                        ? "bg-green-400 animate-pulse"
                        : session.status === "completed"
                        ? "bg-blue-400"
                        : session.status === "failed"
                        ? "bg-red-400"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="font-medium text-sm">{session.title}</span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getUptime(session.startTime)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-400" />
                    <span className="text-gray-400">{getPhaseLabel(session.phases_completed)}</span>
                  </div>
                  <span className="font-medium text-gray-300">
                    {session.phases_completed}/{session.total_phases} phases
                  </span>
                </div>
                <div className="bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full transition-all duration-500"
                    style={{ width: `${getProgress(session)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Task ID: {session.task_id.substring(0, 8)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
