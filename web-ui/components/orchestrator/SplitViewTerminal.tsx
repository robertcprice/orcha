'use client';

import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { X, Maximize2, Minimize2, FileText, Code, Terminal, Lightbulb, FileInput } from 'lucide-react';

interface LogEntry {
  timestamp?: string;
  role?: string;
  type?: string;
  message: string;
  metadata?: any;
}

interface SplitViewTerminalProps {
  agentId: string;
  logs: LogEntry[];
  onClose: () => void;
  nodeMetadata?: {
    thoughts?: string;
    code?: string;
    output?: string;
    content?: string;
    input_data?: string; // ✅ NEW: Input data sent to initiate this node
  };
}

type TabType = 'logs' | 'input' | 'thoughts' | 'code' | 'output'; // ✅ Added 'input' tab

function SplitViewTerminal({ agentId, logs, onClose, nodeMetadata }: SplitViewTerminalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const terminalRef = useRef<HTMLDivElement>(null);
  const hasAutoSelectedTab = useRef(false); // Track if we've auto-selected a tab

  // ✅ PHASE 4: Auto-select most relevant tab based on available content
  useEffect(() => {
    if (!hasAutoSelectedTab.current && nodeMetadata) {
      if (nodeMetadata.thoughts || nodeMetadata.content) {
        setActiveTab('thoughts');
        hasAutoSelectedTab.current = true;
      } else if (nodeMetadata.code) {
        setActiveTab('code');
        hasAutoSelectedTab.current = true;
      } else if (nodeMetadata.output) {
        setActiveTab('output');
        hasAutoSelectedTab.current = true;
      }
    }
  }, [nodeMetadata]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, activeTab]);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  // Extract code from logs
  const codeContent = useMemo(() => {
    // First check metadata
    if (nodeMetadata?.code) {
      return nodeMetadata.code;
    }
    
    // Extract code blocks from logs
    const codeBlocks: string[] = [];
    logs.forEach(log => {
      const message = log.message || '';
      
      // Extract code blocks (```language\ncode\n```)
      const codeBlockRegex = /```[\s\S]*?```/g;
      const matches = message.match(codeBlockRegex);
      if (matches) {
        codeBlocks.push(...matches);
      }
      
      // Check for file paths in message
      if (log.metadata?.file_path || message.match(/\.(py|js|ts|tsx|jsx|html|css|json|md)$/i)) {
        // If message looks like code (has indentation, keywords, etc.)
        if (message.split('\n').length > 3 && 
            (message.includes('def ') || message.includes('function ') || message.includes('class ') || 
             message.includes('import ') || message.includes('const ') || message.includes('let '))) {
          codeBlocks.push(message);
        }
      }
    });
    
    if (codeBlocks.length > 0) {
      return codeBlocks.join('\n\n---\n\n');
    }
    
    return '';
  }, [logs, nodeMetadata]);

  // Extract thoughts from logs and metadata
  const thoughtsContent = useMemo(() => {
    // First check metadata
    if (nodeMetadata?.thoughts) {
      return nodeMetadata.thoughts;
    }
    if (nodeMetadata?.content) {
      return nodeMetadata.content;
    }
    
    // Extract from logs
    const thoughtsLogs = logs.filter(log => {
      const message = (log.message || '').toLowerCase();
      const role = (log.role || '').toLowerCase();
      
      return role === 'planning' || 
             role.includes('planning') ||
             message.includes('thinking') || 
             message.includes('reasoning') ||
             message.includes('plan') ||
             message.includes('analyze') ||
             message.includes('consider') ||
             message.includes('decide');
    });
    
    if (thoughtsLogs.length > 0) {
      return thoughtsLogs.map(log => log.message).join('\n\n---\n\n');
    }
    
    return '';
  }, [logs, nodeMetadata]);

  // Extract output from logs and metadata
  const outputContent = useMemo(() => {
    // First check metadata
    if (nodeMetadata?.output) {
      return nodeMetadata.output;
    }
    
    // Extract from logs
    const outputLogs = logs.filter(log => {
      const message = (log.message || '').toLowerCase();
      const type = (log.type || '').toLowerCase();
      
      return type === 'output' || 
             message.includes('result') ||
             message.includes('completed') ||
             message.includes('finished') ||
             message.includes('success') ||
             message.includes('created') ||
             message.includes('generated') ||
             log.metadata?.result ||
             log.metadata?.output;
    });
    
    if (outputLogs.length > 0) {
      return outputLogs.map(log => {
        const output = log.metadata?.result || log.metadata?.output || log.message;
        return output;
      }).join('\n\n---\n\n');
    }
    
    return '';
  }, [logs, nodeMetadata]);

  const tabs: Array<{ id: TabType; label: string; icon: any; count?: number }> = [
    { id: 'logs', label: 'Logs', icon: Terminal, count: logs.length },
    { id: 'input', label: 'Input', icon: FileInput }, // ✅ NEW: Show request data sent to this node
    { id: 'thoughts', label: 'Thoughts', icon: Lightbulb },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'output', label: 'Output', icon: FileText },
  ];

  // ✅ FIX: Detect if this is a planning node
  const isPlanningNode = agentId.startsWith('planning-');

  const renderContent = () => {
    switch (activeTab) {
      case 'logs':
        return (
          <div ref={terminalRef} className="overflow-y-auto p-4 font-mono text-sm space-y-2 h-full" style={{ color: 'var(--terminal-text)' }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>
                {isPlanningNode ? (
                  <div className="space-y-2">
                    <div style={{ color: 'var(--text-error, #EF4444)' }}>⚠️ No logs received from AI planner</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      Possible causes:
                      <ul style={{ marginTop: '8px', marginLeft: '20px', listStyleType: 'disc' }}>
                        <li>Redis server is not running</li>
                        <li>WebSocket connection failed</li>
                        <li>Task has not been submitted yet</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  'Waiting for agent output...'
                )}
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {log.timestamp && (
                    <span style={{ color: 'var(--text-tertiary)', opacity: 0.5, fontSize: '10px' }}>
                      [{formatTimestamp(log.timestamp)}] {log.role && `[${log.role}]`}
                    </span>
                  )}
                  <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        );
      case 'input':
        return (
          <div ref={terminalRef} className="overflow-y-auto p-4 font-mono text-sm h-full" style={{ color: 'var(--terminal-text)' }}>
            {nodeMetadata?.input_data ? (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                  Request data sent to initiate this node:
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
                  {nodeMetadata.input_data}
                </pre>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No input data available yet...</div>
            )}
          </div>
        );
      case 'thoughts':
        return (
          <div ref={terminalRef} className="overflow-y-auto p-4 font-mono text-sm h-full" style={{ color: 'var(--terminal-text)' }}>
            {thoughtsContent ? (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
                {thoughtsContent}
              </pre>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No thoughts available yet...</div>
            )}
          </div>
        );
      case 'code':
        return (
          <div ref={terminalRef} className="overflow-y-auto p-4 font-mono text-sm h-full" style={{ color: 'var(--terminal-text)' }}>
            {codeContent ? (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
                {codeContent}
              </pre>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No code available yet...</div>
            )}
          </div>
        );
      case 'output':
        return (
          <div ref={terminalRef} className="overflow-y-auto p-4 font-mono text-sm h-full" style={{ color: 'var(--terminal-text)' }}>
            {outputContent ? (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
                {outputContent}
              </pre>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No output available yet...</div>
            )}
          </div>
        );
    }
  };

  return (
    <div
      data-testid="agent-terminal-panel"
      className="fixed right-0 top-0 h-full flex flex-col z-[60] transition-all duration-300"
      style={{
        width: isExpanded ? '60%' : '40%',
        background: 'var(--terminal-bg)',
        borderLeft: '2px solid var(--terminal-border)',
        backdropFilter: 'blur(var(--blur-lg))',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div data-testid="terminal-header" className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <h3 data-testid="terminal-agent-id" className="text-sm font-semibold font-mono" style={{ color: 'var(--terminal-accent)' }}>
          {agentId}
        </h3>
        <div className="flex items-center gap-2">
          <button
            data-testid="terminal-expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:opacity-70 transition-opacity rounded"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            data-testid="terminal-close-button"
            onClick={onClose}
            className="p-1.5 transition-all rounded hover:bg-red-500/20 hover:scale-110"
            style={{ color: 'var(--text-primary, #fff)' }}
            title="Close Terminal"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div data-testid="terminal-tabs" className="flex border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`terminal-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all"
              style={{
                color: isActive ? 'var(--terminal-accent)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--terminal-accent)' : '2px solid transparent',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div data-testid="terminal-content" className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(SplitViewTerminal);
