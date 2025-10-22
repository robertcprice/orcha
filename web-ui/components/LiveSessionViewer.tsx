'use client';

import React, { useEffect, useState, useRef } from 'react';

interface SessionMessage {
  timestamp: string;
  session_id: string;
  agent: string;
  type: 'user' | 'assistant' | 'tool' | 'status' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

interface SessionInfo {
  id: string;
  startTime: string;
  endTime: string | null;
  messageCount: number;
}

interface SessionData {
  active: boolean;
  session: SessionInfo | null;
  messages: SessionMessage[];
}

export default function LiveSessionViewer() {

  const [sessionData, setSessionData] = useState<SessionData>({
    active: false,
    session: null,
    messages: []
  });

  const [liveMessages, setLiveMessages] = useState<SessionMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch current session on mount
  useEffect(() => {

    const fetchSession = async () => {
      try {
        const response = await fetch('/api/sessions/current');
        const data: SessionData = await response.json();
        setSessionData(data);

        if (data.messages) {
          setLiveMessages(data.messages.reverse()); // Reverse to chronological order
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };

    fetchSession();

  }, []);

  // Subscribe to live updates via SSE
  useEffect(() => {

    if (!sessionData.active) {
      return;
    }

    const eventSource = new EventSource('/api/sessions/stream');

    eventSource.onmessage = (event) => {
      try {

        const message: SessionMessage = JSON.parse(event.data);

        setLiveMessages(prev => [...prev, message]);

        // Update message count
        setSessionData(prev => ({
          ...prev,
          session: prev.session ? {
            ...prev.session,
            messageCount: prev.session.messageCount + 1
          } : null
        }));

      } catch (error) {
        console.error('Error parsing session message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };

  }, [sessionData.active]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {

    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

  }, [liveMessages, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {

    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isAtBottom);
  };

  // Filter messages by type
  const filteredMessages = filterType === 'all'
    ? liveMessages
    : liveMessages.filter(msg => msg.type === filterType);

  // Message type styling
  const getMessageTypeStyle = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-900/20 border-l-4 border-blue-500';
      case 'assistant':
        return 'bg-green-900/20 border-l-4 border-green-500';
      case 'tool':
        return 'bg-purple-900/20 border-l-4 border-purple-500';
      case 'status':
        return 'bg-gray-900/20 border-l-4 border-gray-500';
      case 'error':
        return 'bg-red-900/20 border-l-4 border-red-500';
      default:
        return 'bg-gray-900/10 border-l-4 border-gray-400';
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'user': return '👤 USER';
      case 'assistant': return '🤖 CLAUDE';
      case 'tool': return '🔧 TOOL';
      case 'status': return 'ℹ️  STATUS';
      case 'error': return '❌ ERROR';
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-700">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            💬 Live Claude Session
            {sessionData.active && (
              <span className="animate-pulse text-green-400 text-sm">● ACTIVE</span>
            )}
          </h2>
          {sessionData.session && (
            <p className="text-sm text-gray-400 mt-1">
              Session: {sessionData.session.id} |
              Messages: {sessionData.session.messageCount} |
              Started: {new Date(sessionData.session.startTime).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-600 text-sm"
          >
            <option value="all">All Messages</option>
            <option value="user">User Only</option>
            <option value="assistant">Claude Only</option>
            <option value="tool">Tools Only</option>
            <option value="status">Status Only</option>
            <option value="error">Errors Only</option>
          </select>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1 rounded text-sm ${
              autoScroll
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {autoScroll ? '📍 Auto-scroll ON' : '📍 Auto-scroll OFF'}
          </button>
        </div>
      </div>

      {/* No active session */}
      {!sessionData.active && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">💤 No active Claude session</p>
          <p className="text-sm">Start a captured session with:</p>
          <code className="block mt-2 bg-gray-800 px-4 py-2 rounded">
            python scripts/claude_session_capture.py
          </code>
        </div>
      )}

      {/* Messages */}
      {sessionData.active && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="bg-black rounded border border-gray-700 p-4 h-[600px] overflow-y-auto font-mono text-sm"
          style={{ scrollBehavior: 'smooth' }}
        >
          {filteredMessages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {filterType === 'all' ? 'Waiting for messages...' : `No ${filterType} messages`}
            </p>
          ) : (
            filteredMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 p-3 rounded ${getMessageTypeStyle(msg.type)}`}
              >
                {/* Message header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-300">
                    {getMessageTypeLabel(msg.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Message content */}
                <div className="text-gray-100 whitespace-pre-wrap break-words">
                  {msg.message}
                </div>

                {/* Metadata (if present) */}
                {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                  <details className="mt-2 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-300">
                      Metadata
                    </summary>
                    <pre className="mt-1 bg-gray-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(msg.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Stats footer */}
      {sessionData.active && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400">
          <div>
            Displaying: {filteredMessages.length} / {liveMessages.length} messages
          </div>
          <div>
            {autoScroll ? '📍 Following latest' : '📍 Scroll to follow'}
          </div>
        </div>
      )}

    </div>
  );
}
