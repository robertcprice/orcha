#!/usr/bin/env python3
"""Test redis.asyncio pub/sub pattern"""
import asyncio
import json
import sys
from pathlib import Path

# Remove project from path to avoid stub
project_root = str(Path(__file__).parent)
if project_root in sys.path:
    sys.path.remove(project_root)

import redis.asyncio as aioredis
import redis

CHANNEL = "algomind.agent.events"

async def subscriber():
    """Subscribe and listen for messages"""
    print("=== SUBSCRIBER ===")
    redis_client = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)
    await redis_client.ping()
    print("✅ Subscriber connected to Redis")

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(CHANNEL)
    print(f"✅ Subscribed to {CHANNEL}")

    print("Listening for messages...")
    message_count = 0

    async for message in pubsub.listen():
        print(f"  Received message: {message}")

        if message['type'] == 'message':
            message_count += 1
            data = json.loads(message['data'])
            print(f"  📨 Event #{message_count}: {data.get('event_type')}")

            if message_count >= 3:
                print("Received 3 messages, stopping...")
                break

    await pubsub.aclose()
    await redis_client.aclose()
    print("✅ Subscriber closed")

async def publisher():
    """Publish test messages"""
    print("\n=== PUBLISHER ===")
    await asyncio.sleep(1)  # Let subscriber start first

    # Use synchronous client for publishing (simpler)
    redis_client = redis.from_url("redis://localhost:6379/0", decode_responses=True)
    print("✅ Publisher connected to Redis")

    for i in range(3):
        event = {
            'event_type': f'test_event_{i+1}',
            'source_app': 'test-publisher',
            'content': f'Test message {i+1}',
            'timestamp': f'2025-11-02T19:20:{i:02d}'
        }

        result = redis_client.publish(CHANNEL, json.dumps(event))
        print(f"✅ Published event #{i+1} to {result} subscribers")
        await asyncio.sleep(0.5)

    redis_client.close()
    print("✅ Publisher closed")

async def main():
    """Run subscriber and publisher concurrently"""
    # Run both tasks
    subscriber_task = asyncio.create_task(subscriber())
    publisher_task = asyncio.create_task(publisher())

    # Wait for both to complete
    await asyncio.gather(subscriber_task, publisher_task)

    print("\n✅ TEST COMPLETE!")

if __name__ == '__main__':
    asyncio.run(main())
