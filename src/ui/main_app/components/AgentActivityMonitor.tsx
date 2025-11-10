"use client";

import { useEffect, useState } from "react";
import { Brain, CheckCircle2, Loader2, Database, Code, Server, Cloud, TestTube, FileText } from "lucide-react";

interface ManagerAgent {
  name: string;
  type: string;
  status: "idle" | "processing" | "paused" | "stopped" | "offline";
  current_task: string | null;
  tasks_completed: number;
  tasks_in_progress: number;
  last_active: string | null;
}

const managerInfo: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
  database: {
    label: "Database",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
    icon: Database,
  },
  frontend: {
    label: "Frontend",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    icon: Code,
  },
  backend: {
    label: "Backend",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30",
    icon: Server,
  },
  infrastructure: {
    label: "Infrastructure",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
    icon: Cloud,
  },
  testing: {
    label: "Testing",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30",
    icon: TestTube,
  },
  documentation: {
    label: "Documentation",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    borderColor: "border-pink-400/30",
    icon: FileText,
  },
};

export default function AgentActivityMonitor() {
  const [agents, setAgents] = useState<Record<string, ManagerAgent>>({});
  const [loading, setLoading] = useState(true);

  // Fetch initial agent states
  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch('/api/agents');
        const data = await response.json();

        if (data.ok && data.agents) {
          const agentsMap: Record<string, ManagerAgent> = {};
          data.agents.forEach((agent: ManagerAgent) => {
            const key = agent.type.toLowerCase().replace('manager', '');
            agentsMap[key] = agent;
          });
          setAgents(agentsMap);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  // Connect to real-time event stream
  useEffect(() => {
    const eventSource = new EventSource("/api/sessions/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("✅ Connected to orchestration event stream");
          return;
        }

        // Update agents based on events
        const { actor, action, status } = data;

        if (actor && action) {
          setAgents((prev) => {
            const updated = { ...prev };

            // Map actor names to agent keys
            Object.keys(updated).forEach((key) => {
              if (actor.toLowerCase().includes(key)) {
                const agent = updated[key];

                if (action === 'manager_started') {
                  agent.status = 'processing';
                  agent.current_task = data.meta?.task_description || 'Processing task';
                  agent.tasks_in_progress = (agent.tasks_in_progress || 0) + 1;
                  agent.last_active = data.ts;
                } else if (action === 'manager_complete') {
                  agent.status = status === 'completed' ? 'idle' : 'stopped';
                  agent.current_task = null;
                  agent.tasks_completed = (agent.tasks_completed || 0) + 1;
                  agent.tasks_in_progress = Math.max(0, (agent.tasks_in_progress || 1) - 1);
                  agent.last_active = data.ts;
                } else if (action === 'agent_spawned') {
                  agent.status = 'processing';
                  agent.last_active = data.ts;
                }
              }
            });

            return updated;
          });
        }
      } catch (error) {
        console.error("Failed to parse event:", error);
      }
    };

    eventSource.onerror = () => {
      console.error("❌ Event stream connection error");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "paused":
        return <CheckCircle2 className="w-4 h-4 text-yellow-400" />;
      case "stopped":
        return <CheckCircle2 className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing...";
      case "paused":
        return "Paused";
      case "stopped":
        return "Stopped";
      case "offline":
        return "Offline";
      default:
        return "Idle";
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const agentKeys = Object.keys(agents);
  const activeCount = agentKeys.filter(key => agents[key].status === 'processing').length;

  return (
    <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" />
          Manager Agents
        </h2>
        <div className="text-xs text-gray-400">
          {activeCount} active
        </div>
      </div>

      <div className="space-y-3">
        {agentKeys.map((key) => {
          const agent = agents[key];
          const info = managerInfo[key];
          if (!info) return null;

          const Icon = info.icon;

          return (
            <div
              key={key}
              className={`p-4 rounded-lg border ${info.borderColor} ${info.bgColor} transition-all ${
                agent.status === "processing" ? "shadow-sm" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`${info.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${info.color}`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {info.label} Manager
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      {getStatusIcon(agent.status)}
                      <span>{getStatusLabel(agent.status)}</span>
                    </div>
                  </div>
                </div>
                {agent.last_active && (
                  <span className="text-xs text-gray-400">
                    {new Date(agent.last_active).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Current Task */}
              {agent.current_task && (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Current Task:</div>
                  <div className="text-sm text-gray-200">{agent.current_task}</div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Completed: </span>
                  <span className="text-green-400 font-medium">{agent.tasks_completed}</span>
                </div>
                <div>
                  <span className="text-gray-400">In Progress: </span>
                  <span className="text-yellow-400 font-medium">{agent.tasks_in_progress}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manager Pipeline Flow */}
      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="text-xs text-gray-400 mb-2">Orchestration Flow:</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {agentKeys.map((key) => {
            const agent = agents[key];
            const info = managerInfo[key];
            if (!info) return null;

            return (
              <div
                key={key}
                className={`px-2 py-1 rounded text-center ${
                  agent.status === "processing"
                    ? `${info.bgColor} ${info.color} font-medium`
                    : "bg-gray-800/50 text-gray-400"
                }`}
              >
                {info.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
