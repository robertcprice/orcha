"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, Target, ListTodo, TrendingUp, Activity } from "lucide-react";

interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface AgentStats {
  total_tasks: number;
  completed: number;
  in_progress: number;
  failed: number;
  success_rate: number;
  last_active: string | null;
}

interface AgentState {
  role: string;
  name: string;
  objective: string;
  current_task: string | null;
  planned_tasks: AgentTask[];
  stats: AgentStats;
  last_updated: string;
  status?: 'idle' | 'processing' | 'paused' | 'stopped' | 'offline';
  timestamp?: string;
  task_id?: string | null;
}

export default function AgentCards() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({}); // role -> set of section names
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();

      if (data.ok) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgent = (role: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const toggleSection = (role: string, section: string) => {
    setExpandedSections((prev) => {
      const roleSections = prev[role] || new Set();
      const next = new Set(roleSections);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return { ...prev, [role]: next };
    });
  };

  const getAgentColor = (role: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
      PP: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        gradient: 'from-purple-500/20 to-purple-600/20'
      },
      AR: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        gradient: 'from-blue-500/20 to-blue-600/20'
      },
      IM: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30',
        gradient: 'from-green-500/20 to-green-600/20'
      },
      RD: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        gradient: 'from-orange-500/20 to-orange-600/20'
      },
    };
    return colors[role] || colors.PP;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5 text-success" />;
      case 'in_progress':
        return <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-error" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'idle':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            ● Idle
          </span>
        );
      case 'processing':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse">
            ● Processing
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            ⏸ Paused
          </span>
        );
      case 'stopped':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            ■ Stopped
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
            ○ Offline
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {agents.map((agent) => {
        const isExpanded = expandedAgents.has(agent.role);
        const colors = getAgentColor(agent.role);
        const sectionExpanded = expandedSections[agent.role] || new Set();

        return (
          <div
            key={agent.role}
            className={`bg-gradient-to-br ${colors.gradient} backdrop-blur-sm border ${colors.border} rounded-lg overflow-hidden`}
          >
            {/* Agent Header */}
            <div
              className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => toggleAgent(agent.role)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                    <span className={`${colors.text} font-mono text-sm font-bold`}>{agent.role}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      {getStatusBadge(agent.status)}
                      {agent.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          • {formatDate(agent.timestamp)}
                        </span>
                      )}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-success" />
                        <span>{agent.stats.completed} done</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>{agent.stats.in_progress} active</span>
                      </div>
                      {agent.stats.success_rate > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-success" />
                          <span>{agent.stats.success_rate.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Current Task Preview */}
                    {agent.current_task && (
                      <div className="mt-2 p-2 bg-background/30 rounded border border-border/30">
                        <p className="text-xs text-muted-foreground mb-0.5">Currently working on:</p>
                        <p className="text-sm line-clamp-1">{agent.current_task}</p>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                {/* Objective */}
                <div className="pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className={`w-4 h-4 ${colors.text}`} />
                    <h4 className="text-sm font-semibold">Objective</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                    {agent.objective}
                  </p>
                </div>

                {/* Current Task - Expanded */}
                {agent.current_task && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={`w-4 h-4 ${colors.text}`} />
                      <h4 className="text-sm font-semibold">Current Task</h4>
                    </div>
                    <div className="pl-6 p-2 bg-background/30 rounded border border-border/30">
                      <p className="text-sm">{agent.current_task}</p>
                    </div>
                  </div>
                )}

                {/* Planned Tasks */}
                <div>
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80"
                    onClick={() => toggleSection(agent.role, 'tasks')}
                  >
                    <ListTodo className={`w-4 h-4 ${colors.text}`} />
                    <h4 className="text-sm font-semibold">
                      Planned Tasks ({agent.planned_tasks.length})
                    </h4>
                    {sectionExpanded.has('tasks') ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {sectionExpanded.has('tasks') && (
                    <div className="pl-6 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                      {agent.planned_tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No planned tasks</p>
                      ) : (
                        agent.planned_tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-2 bg-background/20 rounded border border-border/20 hover:border-border/40 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              {getStatusIcon(task.status)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm">{task.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(task.updated_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Stats */}
                <div>
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80"
                    onClick={() => toggleSection(agent.role, 'stats')}
                  >
                    <TrendingUp className={`w-4 h-4 ${colors.text}`} />
                    <h4 className="text-sm font-semibold">Statistics</h4>
                    {sectionExpanded.has('stats') ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {sectionExpanded.has('stats') && (
                    <div className="pl-6 grid grid-cols-2 gap-3">
                      <div className="p-2 bg-background/20 rounded border border-border/20">
                        <p className="text-xs text-muted-foreground">Total Tasks</p>
                        <p className="text-lg font-semibold mt-1">{agent.stats.total_tasks}</p>
                      </div>
                      <div className="p-2 bg-background/20 rounded border border-border/20">
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-lg font-semibold mt-1">
                          {agent.stats.success_rate.toFixed(0)}%
                        </p>
                      </div>
                      <div className="p-2 bg-background/20 rounded border border-border/20">
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="text-lg font-semibold mt-1 text-success">
                          {agent.stats.completed}
                        </p>
                      </div>
                      <div className="p-2 bg-background/20 rounded border border-border/20">
                        <p className="text-xs text-muted-foreground">Failed</p>
                        <p className="text-lg font-semibold mt-1 text-error">
                          {agent.stats.failed}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
