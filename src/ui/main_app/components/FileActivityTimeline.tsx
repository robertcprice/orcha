'use client';

import { useEffect, useRef, useState } from 'react';

interface FileActivityEntry {
  timestamp: string;
  agent: string;
  sessionId: string;
  path: string;
  operation?: string;
  summary?: string;
  language?: string;
  stage?: string;
}

interface FileActivityTimelineProps {
  maxEntries?: number;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export default function FileActivityTimeline({ maxEntries = 25 }: FileActivityTimelineProps) {
  const [entries, setEntries] = useState<FileActivityEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type !== 'event') return;

        const eventData = message.data;
        const data = eventData.payload?.data || {};
        const files = Array.isArray(data.files) ? data.files : [];
        if (files.length === 0) return;

        const agent = data.agent_id || eventData.source_app;
        const sessionId = data.session_id || eventData.session_id;
        const timestamp = eventData.timestamp;

        const stage = data.meta?.stage || data.stage;

        const events: FileActivityEntry[] = files.map((file: any) => ({
          timestamp,
          agent,
          sessionId,
          path: file.path,
          operation: file.operation,
          summary: file.summary,
          language: file.language,
          stage,
        }));

        setEntries((prev) => {
          const updated = [...events, ...prev];
          return updated.slice(0, maxEntries);
        });
      } catch (error) {
        console.error('Failed to parse file activity event', error);
      }
    };

    return () => {
      ws.close();
    };
  }, [maxEntries]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
          File Activity
        </h3>
        <p className="text-xs text-gray-500">
          Real-time edits and file operations broadcast from agents.
        </p>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto divide-y divide-gray-800"
      >
        {entries.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 text-center">
            No file activity yet.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatTimestamp(entry.timestamp)}</span>
                <span className="text-gray-400">{entry.agent}</span>
              </div>
              <div className="text-sm text-gray-200 font-mono break-all">
                {entry.path}
              </div>
              <div className="text-xs text-emerald-300">
                {(entry.operation || 'modified').toUpperCase()}
                {entry.language && <span className="text-emerald-200/70"> · {entry.language}</span>}
                {entry.stage && <span className="text-emerald-200/70"> · Stage: {entry.stage}</span>}
              </div>
              {entry.summary && (
                <div className="text-xs text-gray-400">
                  {entry.summary}
                </div>
              )}
              <div className="text-[11px] text-gray-500">
                Session: {entry.sessionId}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
