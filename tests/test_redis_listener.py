#!/usr/bin/env python3
"""Listen to Redis pub/sub channel to verify events are being published"""

import redis
import json
import time
import signal
import sys

REDIS_URL = "redis://localhost:6379/0"
CHANNEL = "algomind.agent.events"

def signal_handler(sig, frame):
    print("\n\nStopping Redis listener...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

print("=" * 70)
print(f"REDIS PUB/SUB LISTENER")
print("=" * 70)
print(f"Redis URL: {REDIS_URL}")
print(f"Channel: {CHANNEL}")
print("=" * 70)
print("Listening for events... (Press Ctrl+C to stop)")
print()

client = redis.from_url(REDIS_URL, decode_responses=True)
pubsub = client.pubsub()
pubsub.subscribe(CHANNEL)

event_count = 0

for message in pubsub.listen():
    if message['type'] == 'message':
        event_count += 1
        print(f"\n[Event #{event_count}] Received at {time.strftime('%H:%M:%S')}")
        print("-" * 70)

        try:
            data = json.loads(message['data'])
            print(f"Event Type: {data.get('event_type', 'unknown')}")
            print(f"Source: {data.get('source_app', 'unknown')}")
            print(f"Session: {data.get('session_id', 'unknown')}")
            print(f"Content: {data.get('content', '')[:100]}")
            if 'data' in data:
                print(f"Additional Data: {json.dumps(data['data'], indent=2)[:200]}")
        except json.JSONDecodeError:
            print(f"Raw Data: {message['data']}")

        print("-" * 70)
    elif message['type'] == 'subscribe':
        print(f"✅ Subscribed to channel: {message['channel']}")
        print()
