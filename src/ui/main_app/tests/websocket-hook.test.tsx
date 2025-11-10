/**
 * Tests for useWebSocket React Hook
 * Validates the client-side WebSocket implementation
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, WebSocketEvent } from '../../lib/useWebSocket';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      // Send initial message
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'initial',
            data: []
          })
        }));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Setup global WebSocket mock
global.WebSocket = MockWebSocket as any;

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should establish connection on mount', async () => {
    const onConnect = jest.fn();

    const { result } = renderHook(() =>
      useWebSocket({ onConnect })
    );

    expect(result.current.isConnected).toBe(false);

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(true);
    });
  });

  test('should handle incoming messages', async () => {
    const onMessage = jest.fn();
    const testEvent: WebSocketEvent = {
      id: 1,
      source_app: 'test',
      session_id: 'test-123',
      hook_event_type: 'test_event',
      payload: { test: 'data' },
      timestamp: Date.now()
    };

    const { result } = renderHook(() =>
      useWebSocket({ onMessage })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate incoming message
    const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');
    act(() => {
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'event',
            data: testEvent
          })
        }));
      }
    });

    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith(testEvent);
      expect(result.current.lastEvent).toEqual(testEvent);
    });
  });

  test('should handle batch messages', async () => {
    const onMessage = jest.fn();
    const testEvents: WebSocketEvent[] = [
      {
        id: 1,
        source_app: 'test1',
        session_id: 'batch-1',
        hook_event_type: 'event1',
        payload: { index: 1 },
        timestamp: Date.now()
      },
      {
        id: 2,
        source_app: 'test2',
        session_id: 'batch-2',
        hook_event_type: 'event2',
        payload: { index: 2 },
        timestamp: Date.now()
      }
    ];

    renderHook(() => useWebSocket({ onMessage }));

    await waitFor(() => {
      const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');

      act(() => {
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'initial',
              data: testEvents
            })
          }));
        }
      });
    });

    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(testEvents.length);
      testEvents.forEach(event => {
        expect(onMessage).toHaveBeenCalledWith(event);
      });
    });
  });

  test('should handle disconnection', async () => {
    const onDisconnect = jest.fn();

    const { result } = renderHook(() =>
      useWebSocket({ onDisconnect })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate disconnection
    const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');
    act(() => {
      ws.close();
    });

    await waitFor(() => {
      expect(onDisconnect).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });
  });

  test('should send messages when connected', async () => {
    const { result } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');
    const sendSpy = jest.spyOn(ws, 'send');

    const testData = { type: 'test', data: 'message' };

    act(() => {
      result.current.send(testData);
    });

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testData));
  });

  test('should not send messages when disconnected', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { result } = renderHook(() => useWebSocket());

    // Try to send before connection
    act(() => {
      result.current.send({ test: 'data' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');

    consoleSpy.mockRestore();
  });

  test('should handle reconnection', async () => {
    const onConnect = jest.fn();
    const { result } = renderHook(() =>
      useWebSocket({ onConnect, reconnectDelay: 100 })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');

    // Force disconnect
    act(() => {
      ws.close();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });

    // Wait for reconnection attempt
    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledTimes(2); // Initial + reconnect
    }, { timeout: 500 });
  });

  test('should handle malformed messages gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const onMessage = jest.fn();

    renderHook(() => useWebSocket({ onMessage }));

    await waitFor(() => {
      const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');

      // Send malformed JSON
      act(() => {
        if (ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: 'not valid json {'
          }));
        }
      });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse WebSocket message:',
      expect.any(Error)
    );
    expect(onMessage).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = (global.WebSocket as any).mock?.instances?.[0] || new MockWebSocket('ws://test');
    const closeSpy = jest.spyOn(ws, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});