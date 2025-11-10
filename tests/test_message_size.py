#!/usr/bin/env python3
"""Test if large messages are being truncated by Redis or WebSocket"""

import asyncio
from orchestrator.redis_publisher import publish_event

async def test_large_message():
    # Create a very large message with repeated content
    large_text = "A" * 10000 + "\n" + "B" * 10000 + "\n" + "**Avoid:** Print statements instead of logging, No log levels" + "\n" + "C" * 10000

    print(f"Original text length: {len(large_text)} characters")
    print(f"First 100 chars: {large_text[:100]}")
    print(f"Last 100 chars: {large_text[-100:]}")

    # Publish via Redis
    await publish_event({
        "type": "test_large_message",
        "plan_id": "test-123",
        "ai_name": "TestAI",
        "request_data": large_text
    })

    print("✅ Message published to Redis")
    print(f"If you can see this message in full in the UI, there's no truncation")

if __name__ == "__main__":
    asyncio.run(test_large_message())
