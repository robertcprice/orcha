import { NextRequest } from 'next/server';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export async function GET(request: NextRequest) {

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {

      let redis;
      let subscriber;

      try {

        // Connect to Redis
        redis = createClient({ url: REDIS_URL });
        await redis.connect();

        // Create subscriber
        subscriber = redis.duplicate();
        await subscriber.connect();

        console.log('📡 SSE session stream connected');

        // Subscribe to Claude session updates
        await subscriber.subscribe('claude:sessions', (message) => {
          try {

            // Send message to client
            const data = `data: ${message}\n\n`;
            controller.enqueue(encoder.encode(data));

          } catch (error) {
            console.error('Error sending session message:', error);
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
          console.log('🔌 SSE session stream disconnected');
          clearInterval(keepaliveInterval);

          if (subscriber) {
            await subscriber.unsubscribe('claude:sessions');
            await subscriber.quit();
          }

          if (redis) {
            await redis.quit();
          }

          controller.close();
        });

      } catch (error) {
        console.error('❌ Redis connection error:', error);

        // Send error to client
        const errorData = JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'error',
          message: 'Failed to connect to session stream'
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));

        controller.close();
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
