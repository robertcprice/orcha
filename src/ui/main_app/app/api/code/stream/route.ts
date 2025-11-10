import { NextRequest } from 'next/server';
import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CODE_CHANNEL = 'algomind.code.events';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let redis: RedisClientType | undefined;
      let subscriber: RedisClientType | undefined;

      try {
        redis = createClient({ url: REDIS_URL });
        await redis.connect();

        subscriber = redis.duplicate();
        await subscriber.connect();

        console.log(`📡 Code stream connected to ${CODE_CHANNEL}`);

        controller.enqueue(encoder.encode(`data: {"type":"connected","channel":"${CODE_CHANNEL}"}\n\n`));

        await subscriber.subscribe(CODE_CHANNEL, (message) => {
          try {
            const data = `data: ${message}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Error sending code event:', error);
          }
        });

        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch (error) {
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        request.signal.addEventListener('abort', async () => {
          console.log('🔌 Code stream disconnected');
          clearInterval(keepaliveInterval);
          await subscriber?.unsubscribe();
          await subscriber?.quit();
          await redis?.quit();
        });

      } catch (error) {
        console.error('❌ Redis connection error:', error);
        controller.enqueue(encoder.encode(`data: {"type":"error","message":"${String(error)}"}\n\n`));
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
