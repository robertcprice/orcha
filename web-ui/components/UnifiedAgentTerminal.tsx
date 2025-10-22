"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, X, Maximize2, Minimize2, Filter, Search, RefreshCw } from "lucide-react";

interface UnifiedLogEntry {
  timestamp: string;
  agent: string;
  type: 'spawn' | 'output' | 'complete' | 'error' | 'status';
  message: string;
  task_id?: string;
  session_id?: string;
  details?: any;
}

const AGENT_COLORS: Record<string, string> = {
  'ORCHESTRATOR': 'text-purple-400',
  'PP': 'text-blue-400',
  'AR': 'text-cyan-400',
  'IM': 'text-green-400',
  'RD': 'text-orange-400',
  'CODE': 'text-yellow-400',
  'QA': 'text-pink-400',
  'DATA': 'text-indigo-400',
  'TRAIN': 'text-red-400',
  'DOC': 'text-teal-400',
  'DEVOPS': 'text-violet-400',
};

export default function UnifiedAgentTerminal() {
  const [logs, setLogs] = useState<UnifiedLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UnifiedLogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/unified-logs?limit=200');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Error fetching unified logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter logs
  useEffect(() => {
    let filtered = logs;

    // Filter by agent
    if (selectedAgent !== 'ALL') {
      filtered = filtered.filter(log => log.agent === selectedAgent);
    }

    // Filter by type
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(log => log.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(term) ||
        log.agent.toLowerCase().includes(term) ||
        log.task_id?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedAgent, selectedType, searchTerm]);

  // Auto-scroll (only within terminal, not page)
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  // Get unique agents
  const uniqueAgents = Array.from(new Set(logs.map(log => log.agent))).sort();

  const getLogColor = (type: string) => {
    switch (type) {
      case 'spawn':
        return 'text-blue-400';
      case 'output':
        return 'text-gray-400';
      case 'complete':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'spawn':
        return '↗';
      case 'output':
        return '│';
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '·';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className={`bg-secondary/30 backdrop-blur-sm border border-border rounded-lg overflow-hidden transition-all ${
      isExpanded ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-background/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold">Unified Agent Terminal</h3>
          <span className="text-xs text-muted-foreground">
            {filteredLogs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-xs ${
              autoScroll ? 'bg-green-500/20 text-green-400' : 'bg-secondary/50'
            }`}
            title="Toggle auto-scroll"
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-3 bg-background/30 border-b border-border flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded hover:bg-secondary/50"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Agent Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-secondary/50 border border-border rounded px-2 py-1 text-xs"
          >
            <option value="ALL">All Agents</option>
            {uniqueAgents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-secondary/50 border border-border rounded px-2 py-1 text-xs"
        >
          <option value="ALL">All Types</option>
          <option value="spawn">Spawns</option>
          <option value="output">Output</option>
          <option value="complete">Completions</option>
          <option value="error">Errors</option>
        </select>
      </div>

      {/* Terminal Content */}
      <div
        ref={terminalRef}
        className={`bg-black/90 font-mono text-xs overflow-y-auto scrollbar-thin ${
          isExpanded ? 'h-[calc(100vh-200px)]' : 'h-[600px]'
        }`}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
          setAutoScroll(isAtBottom);
        }}
      >
        <div className="p-4 space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Terminal className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No agent activity yet</p>
              <p className="text-xs mt-2">Agents will appear here when tasks are submitted</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className={`flex items-start gap-2 hover:bg-white/5 px-2 py-1 rounded ${getLogColor(log.type)}`}
              >
                <span className="text-gray-500 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="whitespace-nowrap">
                  {getLogIcon(log.type)}
                </span>
                <span className={`whitespace-nowrap font-semibold ${AGENT_COLORS[log.agent] || 'text-gray-400'}`}>
                  [{log.agent}]
                </span>
                <span className="flex-1 break-words">
                  {log.message}
                </span>
                {log.task_id && (
                  <span className="text-gray-600 text-[10px] whitespace-nowrap">
                    {log.task_id.substring(0, 12)}
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-2 bg-background/50 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Total: {logs.length}</span>
          <span className="text-blue-400">
            Spawns: {logs.filter(l => l.type === 'spawn').length}
          </span>
          <span className="text-green-400">
            Completed: {logs.filter(l => l.type === 'complete').length}
          </span>
          <span className="text-red-400">
            Errors: {logs.filter(l => l.type === 'error').length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}
