import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  onMessage?: (event: WebSocketEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(reconnectDelay);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);

  const connect = useCallback(() => {
    // Stop reconnecting if max attempts reached
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`WebSocket: Max reconnect attempts (${maxReconnectAttempts}) reached. Stopping.`);
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        // Reset reconnect attempts and delay on successful connection
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = reconnectDelay;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle batch messages (type: "initial" or "event")
          if (message.type && message.data) {
            if (Array.isArray(message.data)) {
              // Multiple events in batch
              message.data.forEach((evt: WebSocketEvent) => {
                setLastEvent(evt);
                onMessage?.(evt);
              });
            } else {
              // Single event wrapped
              const evt: WebSocketEvent = message.data;
              setLastEvent(evt);
              onMessage?.(evt);
            }
          } else {
            // Direct event (backwards compatibility)
            const data: WebSocketEvent = message;
            setLastEvent(data);
            onMessage?.(data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Only attempt reconnect if not max attempts and not a normal closure
        if (reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1000) {
          reconnectAttemptsRef.current += 1;

          // Exponential backoff with jitter
          const backoff = Math.min(reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          const jitter = Math.random() * 1000;
          const delay = backoff + jitter;

          console.log(`Attempting reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${Math.round(delay / 1000)}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (event.code === 1000) {
          console.log('WebSocket closed normally');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      reconnectAttemptsRef.current += 1;
    }
  }, [onMessage, onConnect, onDisconnect, reconnectDelay, maxReconnectAttempts]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    isConnected,
    lastEvent,
    send,
    reconnect: connect
  };
}
