'use client';

import { useEffect, useState, useRef } from 'react';

interface TerminalLine {
  content: string;
  timestamp: string;
  type: 'output' | 'thinking' | 'error' | 'system';
}

interface AgentTerminalProps {
  sessionId: string;
  title?: string;
  height?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export default function AgentTerminal({
  sessionId,
  title = 'Agent Terminal',
  height = '500px'
}: AgentTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      addSystemLine('Terminal connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'event') {
          const eventData = message.data;
          const data = eventData.payload?.data || {};
          const metadata = (data.meta || data.metadata || {}) as Record<string, unknown>;
          const matchesSession =
            sessionId === 'all' ||
            eventData.session_id === sessionId ||
            data.session_id === sessionId;

          if (!matchesSession) {
            return;
          }

          const actor = data.agent_id || eventData.source_app;
          const action = data.action || eventData.hook_event_type;
          const baseContent =
            data.content ||
            eventData.payload?.content ||
            JSON.stringify(data || {});

          const fileInfo = Array.isArray(data.files)
            ? data.files
                .map((file: any) => `${file.operation || 'edit'} ${file.path}`)
                .join(', ')
            : undefined;

          const toolInfo = data.tool
            ? `${data.tool.name}${data.tool.output_preview ? ` → ${data.tool.output_preview}` : ''}`
            : undefined;

          const toolInputs = data.tool?.inputs || (typeof metadata.inputs === 'object' ? metadata.inputs : undefined);
          const stage = (metadata.stage as string) || data.stage;
          const purpose = (metadata.purpose as string) || data.tool?.purpose;

          const inputsSummary = toolInputs
            ? `Inputs: ${Object.entries(toolInputs as Record<string, string>).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : undefined;

          const decoratedContent = [
            `[${actor}]`,
            action ? action.toUpperCase() : undefined,
            baseContent,
            stage ? `Stage: ${stage}` : undefined,
            purpose ? `Purpose: ${purpose}` : undefined,
            toolInfo ? `Tool: ${toolInfo}` : undefined,
            inputsSummary,
            fileInfo ? `Files: ${fileInfo}` : undefined,
          ]
            .filter(Boolean)
            .join(' · ');

          let lineType: TerminalLine['type'] = 'output';

          if (eventData.hook_event_type.includes('thinking') || action?.includes('thinking')) {
            lineType = 'thinking';
          } else if (
            eventData.hook_event_type.includes('error') ||
            eventData.hook_event_type.includes('failed') ||
            action?.includes('fail')
          ) {
            lineType = 'error';
          } else if (
            eventData.hook_event_type.includes('started') ||
            eventData.hook_event_type.includes('completed') ||
            action?.includes('complete')
          ) {
            lineType = 'system';
          }

          addLine(decoratedContent, lineType, eventData.timestamp);
        } else if (message.type === 'initial') {
          const sessionEvents = message.data.filter((e: any) => {
            if (sessionId === 'all') return true;
            return e.session_id === sessionId || e.payload?.data?.session_id === sessionId;
          });

          sessionEvents.forEach((e: any) => {
            const data = e.payload?.data || {};
            const metadata = (data.meta || data.metadata || {}) as Record<string, unknown>;
            const actor = data.agent_id || e.source_app;
            const action = data.action || e.hook_event_type;
            const content =
              data.content || e.payload?.content || JSON.stringify(data || {});
            const stage = (metadata.stage as string) || data.stage;
            const purpose = (metadata.purpose as string) || data.tool?.purpose;
            const decorated = [
              `[${actor}]`,
              action ? action.toUpperCase() : undefined,
              content,
              stage ? `Stage: ${stage}` : undefined,
              purpose ? `Purpose: ${purpose}` : undefined,
            ].filter(Boolean).join(' · ');
            addLine(decorated, 'output', e.timestamp);
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
      addSystemLine('Connection error', 'error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      addSystemLine('Terminal disconnected');
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const addLine = (
    content: string,
    type: TerminalLine['type'] = 'output',
    timestamp?: string
  ) => {
    setLines((prev) => [
      ...prev,
      {
        content,
        type,
        timestamp: timestamp || new Date().toISOString()
      }
    ]);
  };

  const addSystemLine = (content: string, type: TerminalLine['type'] = 'system') => {
    addLine(`[SYSTEM] ${content}`, type);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'thinking':
        return 'text-cyan-400';
      case 'error':
        return 'text-red-400';
      case 'system':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    } catch {
      return timestamp;
    }
  };

  const clearTerminal = () => {
    setLines([]);
    addSystemLine('Terminal cleared');
  };

  const copyToClipboard = () => {
    const text = lines.map(line => `${formatTime(line.timestamp)} ${line.content}`).join('\n');
    navigator.clipboard.writeText(text);
    addSystemLine('Copied to clipboard');
  };

  return (
    <div
      data-testid="terminal"
      className="flex flex-col bg-black border border-gray-800 rounded-lg overflow-hidden shadow-2xl"
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-mono text-gray-400">
            {title} - Session: {sessionId.substring(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>

          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            📋 Copy
          </button>

          <button
            onClick={clearTerminal}
            className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            title="Clear terminal"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className={`overflow-y-auto p-4 font-mono text-sm ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        style={{ height }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={0}
      >
        {lines.length === 0 ? (
          <div className="text-gray-600">
            <div className="mb-2">┌─────────────────────────────────────────┐</div>
            <div className="mb-2">│  Waiting for session output...         │</div>
            <div className="mb-2">│  Session ID: {sessionId.substring(0, 8)}...           │</div>
            <div>└─────────────────────────────────────────┘</div>
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={index}
              className={`${getLineColor(line.type)} leading-relaxed`}
            >
              <span className="text-gray-600 mr-2">
                {formatTime(line.timestamp)}
              </span>
              <span className="whitespace-pre-wrap">{line.content}</span>
            </div>
          ))
        )}

        {/* Cursor */}
        <div className="flex items-center mt-1">
          <span className="text-green-500 mr-2">$</span>
          <span className="inline-block w-2 h-4 bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1 bg-gray-900 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
        <div>{lines.length} lines</div>
        <div>Session: {sessionId}</div>
        <div>Scroll: Auto</div>
      </div>
    </div>
  );
}
