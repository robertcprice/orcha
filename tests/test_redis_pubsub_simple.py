#!/usr/bin/env python3
"""
Simple test to verify Redis async pubsub works correctly.
This test publishes test events and verifies they are received.
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime

# IMPORTANT: Remove project root from sys.path to avoid importing local redis stub
# We need the real redis package for async pub/sub support
project_root = str(Path(__file__).parent)
if project_root in sys.path:
    sys.path.remove(project_root)

# Import real redis
import redis.asyncio as aioredis

# Restore project root for other imports
if project_root not in sys.path:
    sys.path.insert(0, project_root)


async def test_redis_pubsub():
    """Test that Redis async pubsub works correctly"""

    print("="*80)
    print("TESTING REDIS ASYNC PUBSUB")
    print("="*80)
    print()

    # Connect to Redis
    print("Step 1: Connecting to Redis...")
    redis_client = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)
    await redis_client.ping()
    print("✅ Connected to Redis")
    print()

    # Create pubsub and subscribe
    print("Step 2: Creating pubsub and subscribing to channel...")
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("algomind.agent.events")
    print("✅ Subscribed to algomind.agent.events")
    print()

    # Publish test events in background
    async def publish_test_events():
        await asyncio.sleep(1)  # Wait for listener to be ready

        publisher = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)

        for i in range(3):
            test_event = {
                "type": "orchestrator_reasoning",
                "session_id": "test_session",
                "agent_id": "test_orchestrator",
                "reasoning": f"Test reasoning message {i+1}",
                "decision": f"Test decision {i+1}",
                "timestamp": datetime.now().isoformat()
            }

            # Convert to WebSocket format (matching redis_publisher.py pattern)
            ws_event = {
                'event_type': test_event.get('type', 'agent_event'),
                'source_app': test_event.get('agent_id', 'orchestrator'),
                'session_id': test_event.get('session_id', 'unknown'),
                'content': test_event.get('reasoning', ''),
                'data': test_event,
                'timestamp': test_event['timestamp']
            }

            await publisher.publish("algomind.agent.events", json.dumps(ws_event))
            print(f"📤 Published test event {i+1}/3")
            await asyncio.sleep(0.5)

        await publisher.aclose()
        print("✅ All test events published")
        print()

    # Start publisher task
    print("Step 3: Publishing test events...")
    publisher_task = asyncio.create_task(publish_test_events())

    # Listen for events
    print("Step 4: Listening for events (10 second timeout)...")
    print()

    events_received = []
    timeout = 10
    start_time = asyncio.get_event_loop().time()

    try:
        async def listen_with_timeout():
            async for message in pubsub.listen():
                # Check timeout
                if (asyncio.get_event_loop().time() - start_time) >= timeout:
                    break

                # Skip subscription confirmation messages
                if message['type'] != 'message':
                    print(f"   Received: {message['type']} (skipping)")
                    continue

                try:
                    event = json.loads(message['data'])
                    event_type = event.get('event_type', event.get('type', 'unknown'))
                    events_received.append(event)
                    print(f"✅ Received event: {event_type}")
                    print(f"   Content: {event.get('content', '')[:80]}")
                    print()
                except json.JSONDecodeError as e:
                    print(f"⚠️  Failed to decode message: {e}")

        # Run listener with timeout
        try:
            await asyncio.wait_for(listen_with_timeout(), timeout=timeout)
        except asyncio.TimeoutError:
            print(f"⏱️  {timeout} second monitoring period complete")

    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")

    # Wait for publisher to finish
    await publisher_task

    # Clean up Redis connection
    try:
        await pubsub.unsubscribe("algomind.agent.events")
        await pubsub.aclose()
        await redis_client.aclose()
    except Exception as e:
        print(f"⚠️  Error closing Redis connection: {e}")

    print()
    print("="*80)
    print("TEST RESULTS")
    print("="*80)
    print(f"Events published: 3")
    print(f"Events received: {len(events_received)}")
    print()

    if len(events_received) >= 3:
        print("="*80)
        print("✅ SUCCESS! Redis async pubsub is working correctly!")
        print("="*80)
        return True
    else:
        print("="*80)
        print("❌ FAILED! Not all events were received")
        print("="*80)
        return False


if __name__ == '__main__':
    success = asyncio.run(test_redis_pubsub())
    sys.exit(0 if success else 1)
