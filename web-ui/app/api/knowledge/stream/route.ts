import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';

export async function GET() {

	const encoder = new TextEncoder();

	const stream = new ReadableStream({

		async start(controller) {

			// Send initial connection confirmation
			const data = encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
			controller.enqueue(data);

			let redis: Redis | null = null;

			try {

				redis = new Redis(REDIS_URL);

				// Subscribe to knowledge events
				await redis.subscribe(
					'algomind.knowledge.session',
					'algomind.knowledge.experiment',
					'algomind.knowledge.milestone'
				);

				redis.on('message', (channel, message) => {

					try {

						const event = JSON.parse(message);

						// Send event to client
						const data = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
						controller.enqueue(data);

					} catch (error) {

						console.error('Error processing knowledge event:', error);
					}
				});

				// Keep-alive ping every 30 seconds
				const keepAlive = setInterval(() => {

					const ping = encoder.encode(`: ping\n\n`);
					controller.enqueue(ping);

				}, 30000);

				// Cleanup on connection close
				const cleanup = () => {

					clearInterval(keepAlive);

					if (redis) {

						redis.disconnect();
					}
				};

				// Handle client disconnect
				controller.enqueue = new Proxy(controller.enqueue, {

					apply(target, thisArg, args) {

						try {

							return Reflect.apply(target, thisArg, args);

						} catch (error) {

							cleanup();
							throw error;
						}
					},
				});

			} catch (error) {

				console.error('Redis connection error:', error);

				// Send error event
				const errorData = encoder.encode(
					`data: ${JSON.stringify({ type: 'error', message: 'Redis unavailable' })}\n\n`
				);
				controller.enqueue(errorData);
			}
		},

		cancel() {

			console.log('Knowledge stream cancelled');
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
