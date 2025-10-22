/**
 * Server-Sent Events (SSE) endpoint for real-time orchestrator events
 * Clients connect to /api/events to receive live updates
 */

import { NextRequest } from 'next/server';
import { redisSubscriber } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Ensure Redis is connected before starting the stream
  try {
    await redisSubscriber.ensureConnected();
  } catch (error) {
    console.error('[SSE] Failed to connect to Redis:', error);
    return new Response('Failed to connect to event stream', { status: 503 });
  }

  // Create a stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log('[SSE] Client connected to events stream');

      // Send initial connection event
      const data = `data: ${JSON.stringify({ type: 'connected', ts: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Subscribe to events
      const unsubscribe = redisSubscriber.on((event) => {
        try {
          console.log('[SSE] Sending event to client:', event.action);
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('[SSE] Failed to send event:', error);
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected from events stream');
        unsubscribe();
        controller.close();
      });

      // Keep alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch (error) {
          clearInterval(keepAlive);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
