"use client";

import { useState, useEffect } from "react";
import { Network, Bot, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface AgentNode {
  id: string;
  agent: string;
  task: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  parent?: string;
  children: string[];
  createdAt: string;
}

interface AgentActivity {
  role: string;
  status: string;
  currentTask?: string;
  sessionId?: string;
}

const AGENT_COLORS: Record<string, string> = {
  'ORCHESTRATOR': 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  'PP': 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'AR': 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
  'IM': 'bg-green-500/20 border-green-500/50 text-green-400',
  'RD': 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  'CODE': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  'QA': 'bg-pink-500/20 border-pink-500/50 text-pink-400',
  'DATA': 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
  'TRAIN': 'bg-red-500/20 border-red-500/50 text-red-400',
  'DOC': 'bg-teal-500/20 border-teal-500/50 text-teal-400',
  'DEVOPS': 'bg-violet-500/20 border-violet-500/50 text-violet-400',
};

export default function AgentVisualization() {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentActivity>>({});
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');

  // Fetch agent activity
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch('/api/agents/activity');
        if (response.ok) {
          const data = await response.json();
          if (data.agents) {
            setAgents(data.agents);
          }
        }
      } catch (error) {
        console.error('Error fetching agent activity:', error);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch task hierarchy
  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        const response = await fetch('/api/agents/unified-logs?limit=50');
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.logs) {
            // Build task hierarchy from logs
            const taskMap = new Map<string, AgentNode>();

            data.logs.forEach((log: any) => {
              if (log.type === 'spawn' && log.task_id) {
                if (!taskMap.has(log.task_id)) {
                  taskMap.set(log.task_id, {
                    id: log.task_id,
                    agent: log.agent,
                    task: log.message,
                    status: 'running',
                    children: [],
                    createdAt: log.timestamp
                  });
                }
              } else if (log.type === 'complete' && log.task_id) {
                const node = taskMap.get(log.task_id);
                if (node) {
                  node.status = 'completed';
                }
              } else if (log.type === 'error' && log.task_id) {
                const node = taskMap.get(log.task_id);
                if (node) {
                  node.status = 'failed';
                }
              }
            });

            setNodes(Array.from(taskMap.values()));
          }
        }
      } catch (error) {
        console.error('Error fetching hierarchy:', error);
      }
    };

    fetchHierarchy();
    const interval = setInterval(fetchHierarchy, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderTreeView = () => {
    // Group by agent
    const agentGroups = new Map<string, AgentNode[]>();
    nodes.forEach(node => {
      const existing = agentGroups.get(node.agent) || [];
      agentGroups.set(node.agent, [...existing, node]);
    });

    return (
      <div className="space-y-6 p-4">
        {Array.from(agentGroups.entries()).map(([agent, agentNodes]) => (
          <div key={agent} className="space-y-2">
            {/* Agent Header */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${AGENT_COLORS[agent] || 'bg-secondary/20 border-border'}`}>
              <Bot className="w-5 h-5" />
              <div className="flex-1">
                <div className="font-semibold">{agent}</div>
                <div className="text-xs text-muted-foreground">
                  {agentNodes.length} task{agentNodes.length !== 1 ? 's' : ''}
                  {' · '}
                  {agents[agent]?.status || 'idle'}
                </div>
              </div>
              {agents[agent] && agents[agent].status === 'running' && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </div>

            {/* Tasks */}
            <div className="ml-8 space-y-2">
              {agentNodes.map(node => (
                <div
                  key={node.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-border/80 transition-all"
                >
                  <div className="mt-0.5">
                    {getStatusIcon(node.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {node.task.substring(0, 100)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{new Date(node.createdAt).toLocaleTimeString()}</span>
                      <span>·</span>
                      <span className="font-mono">{node.id.substring(0, 12)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {agentGroups.size === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No active agents</p>
            <p className="text-xs mt-2">Submit a task to see the agent hierarchy</p>
          </div>
        )}
      </div>
    );
  };

  const renderGridView = () => {
    const allAgents = ['ORCHESTRATOR', 'PP', 'AR', 'IM', 'RD', 'CODE', 'QA', 'DATA', 'TRAIN', 'DOC', 'DEVOPS'];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {allAgents.map(agent => {
          const activity = agents[agent];
          const agentTasks = nodes.filter(n => n.agent === agent);
          const isActive = activity && activity.status === 'running';

          return (
            <div
              key={agent}
              className={`p-4 rounded-lg border transition-all ${
                AGENT_COLORS[agent] || 'bg-secondary/20 border-border'
              } ${isActive ? 'ring-2 ring-primary/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <span className="font-semibold text-sm">{agent}</span>
                </div>
                {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{activity?.status || 'idle'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tasks:</span>
                  <span className="font-medium">{agentTasks.length}</span>
                </div>
                {agentTasks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-muted-foreground mb-1">Recent:</div>
                    <div className="text-[10px] truncate">
                      {agentTasks[0].task.substring(0, 50)}...
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Agent Network</h3>
          <span className="text-xs text-muted-foreground">
            {Object.values(agents).filter(a => a.status === 'running').length} active
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'tree' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
        {viewMode === 'tree' ? renderTreeView() : renderGridView()}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between p-3 bg-background/50 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Total Tasks: {nodes.length}</span>
          <span className="text-green-400">
            Completed: {nodes.filter(n => n.status === 'completed').length}
          </span>
          <span className="text-blue-400">
            Running: {nodes.filter(n => n.status === 'running').length}
          </span>
          <span className="text-red-400">
            Failed: {nodes.filter(n => n.status === 'failed').length}
          </span>
        </div>
      </div>
    </div>
  );
}
