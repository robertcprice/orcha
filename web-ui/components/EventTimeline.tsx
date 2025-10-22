"use client";

import { useEffect, useState, useRef } from "react";
import { Activity, Search, X } from "lucide-react";

interface Event {
  id: number;
  timestamp: string;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: any;
}

const EVENT_ICONS: Record<string, string> = {
  PreToolUse: "🔧",
  PostToolUse: "✅",
  Notification: "🔔",
  Stop: "🛑",
  SubagentStop: "👥",
  PreCompact: "📦",
  UserPromptSubmit: "💬",
  SessionStart: "🚀",
  SessionEnd: "🏁",
  manager_started: "⚡",
  manager_complete: "✅",
  agent_spawned: "🎯",
  task_assigned: "📋",
  task_complete: "✔️",
};

export default function EventTimeline() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchPattern, setSearchPattern] = useState("");
  const [searchError, setSearchError] = useState("");
  const [stickToBottom, setStickToBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events/recent?limit=50');
        if (response.ok) {
          const data = await response.json();
          setEvents(data || []);
          setFilteredEvents(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
  }, []);

  // WebSocket connection for real-time events
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket('ws://localhost:4000');

        ws.onopen = () => {
          console.log('✅ Connected to event stream');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'event') {
              setEvents(prev => [data.data, ...prev].slice(0, 100));
            } else if (data.type === 'initial') {
              setEvents(data.data || []);
            } else if (data.type === 'clear') {
              setEvents([]);
            }
          } catch (error) {
            console.error('Failed to parse event:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket closed, reconnecting...');
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Apply search filter
  useEffect(() => {
    if (!searchPattern) {
      setFilteredEvents(events);
      setSearchError("");
      return;
    }

    try {
      const regex = new RegExp(searchPattern, 'i');
      const filtered = events.filter(event => {
        const searchText = JSON.stringify(event).toLowerCase();
        return regex.test(searchText);
      });
      setFilteredEvents(filtered);
      setSearchError("");
    } catch (error) {
      setSearchError("Invalid regex pattern");
      setFilteredEvents(events);
    }
  }, [searchPattern, events]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (stickToBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredEvents, stickToBottom]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setStickToBottom(isAtBottom);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getEventColor = (eventType: string): string => {
    const colors: Record<string, string> = {
      SessionStart: "border-primary text-primary",
      SessionEnd: "border-error text-error",
      manager_started: "border-warning text-warning",
      manager_complete: "border-success text-success",
      agent_spawned: "border-accent text-accent",
      task_assigned: "border-purple-400 text-purple-400",
      task_complete: "border-success text-success",
    };

    return colors[eventType] || "border-muted-foreground text-muted-foreground";
  };

  return (
    <div className="bg-secondary/30 backdrop-blur-sm border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Agent Event Stream
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse-slow' : 'bg-error'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            placeholder="Search events (regex enabled)... e.g., 'manager.*started'"
            className={`w-full pl-10 pr-10 py-2 rounded-lg text-sm font-mono border-2 transition-all bg-background text-foreground placeholder-muted-foreground ${
              searchError ? 'border-error' : 'border-border focus:border-primary'
            } focus:outline-none`}
          />
          {searchPattern && (
            <button
              onClick={() => setSearchPattern("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {searchError && (
          <div className="mt-2 px-3 py-2 bg-error/10 border border-error rounded-lg text-xs text-error">
            ⚠️ {searchError}
          </div>
        )}
      </div>

      {/* Event List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-96 overflow-y-auto scrollbar-thin space-y-2"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">🔳</div>
            <p className="text-lg font-semibold text-primary mb-1">No events to display</p>
            <p className="text-sm">Events will appear here as they are received</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className={`p-3 rounded-lg border ${getEventColor(event.hook_event_type)} bg-background/50 transition-all hover:bg-background/80`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{EVENT_ICONS[event.hook_event_type] || "📌"}</span>
                  <div>
                    <div className="font-semibold text-sm">{event.hook_event_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.source_app} • {event.session_id.slice(0, 8)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
              {event.payload && Object.keys(event.payload).length > 0 && (
                <div className="mt-2 p-2 bg-background/50 rounded border border-border">
                  <pre className="text-xs font-mono overflow-x-auto text-muted-foreground">
                    {JSON.stringify(event.payload, null, 2).slice(0, 200)}
                    {JSON.stringify(event.payload).length > 200 && '...'}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Event Count */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {filteredEvents.length} of {events.length} events
        </span>
        <button
          onClick={() => setStickToBottom(true)}
          className={`px-3 py-1 rounded border ${
            stickToBottom ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
          } transition-all`}
        >
          {stickToBottom ? "Auto-scroll ON" : "Auto-scroll OFF"}
        </button>
      </div>
    </div>
  );
}
