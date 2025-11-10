/**
 * Orchestrator Events Stream API
 * Real-time pub/sub stream for orchestrator reasoning and decision events
 * Subscribes to: algomind.agent.events
 */

import { NextRequest } from 'next/server';
import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const EVENT_CHANNEL = 'algomind.agent.events';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let redis: RedisClientType | undefined;
      let subscriber: RedisClientType | undefined;
      let isClosed = false;

      const cleanup = async () => {
        if (isClosed) return;
        isClosed = true;

        if (subscriber) {
          try {
            await subscriber.unsubscribe(EVENT_CHANNEL);
            await subscriber.quit();
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        if (redis) {
          try {
            await redis.quit();
          } catch (e) {
            // Ignore cleanup errors
          }
        }

        try {
          controller.close();
        } catch (e) {
          // Ignore if already closed
        }
      };

      try {
        // Connect to Redis
        redis = createClient({ url: REDIS_URL });
        await redis.connect();

        // Create subscriber
        subscriber = redis.duplicate();
        await subscriber.connect();

        console.log(`📡 Orchestrator events stream connected to ${EVENT_CHANNEL}`);

        // Send initial connected message
        const connectedMsg = JSON.stringify({
          type: 'connected',
          channel: EVENT_CHANNEL,
          timestamp: new Date().toISOString()
        });
        controller.enqueue(encoder.encode(`data: ${connectedMsg}\n\n`));

        // Subscribe to orchestrator events
        await subscriber.subscribe(EVENT_CHANNEL, (message) => {
          try {
            // Events are already in WebSocket wrapper format:
            // { event_type: '...', data: {...}, timestamp: '...' }
            const event = JSON.parse(message);

            // Only forward orchestrator events to this stream
            const eventType = event.event_type || event.data?.type || '';
            if (eventType.startsWith('orchestrator_') || eventType.startsWith('codex_') || eventType === 'tool_call') {
              const data = `data: ${message}\n\n`;
              controller.enqueue(encoder.encode(data));

              console.log(`📤 Sent ${eventType} event to client`);
            }
          } catch (error) {
            console.error('Error parsing/sending orchestrator event:', error);
          }
        });

        // Send keepalive every 30 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch (error) {
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener('abort', async () => {
          console.log('🔌 Orchestrator events stream disconnected');
          clearInterval(keepaliveInterval);
          await cleanup();
        });

      } catch (error) {
        console.error('❌ Redis connection error:', error);

        // Send error to client
        const errorData = JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Failed to connect to orchestrator event stream'
        });

        try {
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } catch (e) {
          // Ignore if controller is closed
        }

        await cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
