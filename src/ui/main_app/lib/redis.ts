/**
 * Redis client for subscribing to orchestrator events
 */

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/0';
const EVENT_CHANNEL = 'algomind.events';

export interface OrchestratorEvent {
  ts: string;
  actor: string;
  task_id: string;
  action: string;
  status: string;
  meta?: Record<string, any>;
}

export class RedisEventSubscriber {
  private client: ReturnType<typeof createClient> | null = null;
  private subscriber: ReturnType<typeof createClient> | null = null;
  private listeners: Set<(event: OrchestratorEvent) => void> = new Set();
  private connectionPromise: Promise<void> | null = null;
  private isConnected: boolean = false;

  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.client = createClient({ url: REDIS_URL });
        this.subscriber = this.client.duplicate();

        await this.client.connect();
        await this.subscriber.connect();

        console.log('✅ Connected to Redis for events');

        // Subscribe to orchestrator events
        await this.subscriber.subscribe(EVENT_CHANNEL, (message) => {
          try {
            const event: OrchestratorEvent = JSON.parse(message);
            this.emit(event);
          } catch (error) {
            console.error('Failed to parse event:', error);
          }
        });

        this.isConnected = true;
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        this.connectionPromise = null; // Reset so we can retry
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  async ensureConnected() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  on(listener: (event: OrchestratorEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: OrchestratorEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  async disconnect() {
    if (this.subscriber) await this.subscriber.quit();
    if (this.client) await this.client.quit();
    this.isConnected = false;
  }
}

export const redisSubscriber = new RedisEventSubscriber();

// Auto-connect when module loads
redisSubscriber.connect().catch(err => {
  console.error('Failed to connect Redis subscriber on startup:', err);
});
