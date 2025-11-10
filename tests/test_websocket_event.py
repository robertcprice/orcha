#!/usr/bin/env python3
"""
Test script to publish an event to Redis and verify WebSocket delivery
"""
import json
import redis
from datetime import datetime

def publish_test_event():
    """Publish a test event to the Redis channel"""
    r = redis.from_url('redis://localhost:6379', decode_responses=True)

    # Create a test event matching the format from redis_publisher.py
    test_event = {
        "event_type": "test_event",
        "source_app": "test_script",
        "session_id": "test-session-123",
        "content": "This is a test event to verify WebSocket streaming works correctly!",
        "data": {
            "agent_id": "test-agent",
            "session_id": "test-session-123",
            "type": "test_event"
        },
        "timestamp": datetime.now().isoformat()
    }

    # Publish to the Redis channel
    channel = "algomind.agent.events"
    result = r.publish(channel, json.dumps(test_event))

    print(f"✅ Published test event to channel '{channel}'")
    print(f"📊 {result} subscriber(s) received the message")
    print(f"📝 Event data:")
    print(json.dumps(test_event, indent=2))

    return result is not None and result > 0

if __name__ == "__main__":
    success = publish_test_event()
    if success:
        print("\n✅ Test event published successfully!")
        print("👀 Check your browser's Live Monitor to see if the event appears")
    else:
        print("\n⚠️  Warning: No subscribers received the event")
        print("Make sure the WebSocket server is running")
