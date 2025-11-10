#!/usr/bin/env python3
"""Test WebSocket event publishing"""
import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.redis_publisher import publish_event

async def test_publish():
    print("Testing WebSocket event publishing...")

    # Test event
    await publish_event({
        "type": "test_event",
        "agent_id": "test-agent-123",
        "content": "This is a test event from Python"
    })

    print("Event published (check for errors above)")
    print("Check http://localhost:3002/monitor to see if event appears")

if __name__ == "__main__":
    asyncio.run(test_publish())
