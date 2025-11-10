#!/usr/bin/env python3
"""Test WebSocket event streaming after Redis publisher fix"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path.cwd()))

from orchestrator.redis_publisher import publish_event

async def test_redis_publishing():
    """Test that events are published to Redis instead of HTTP POST"""

    print("=" * 70)
    print("TESTING REDIS PUB/SUB EVENT PUBLISHING")
    print("=" * 70)
    print()

    # Test 1: Publish a simple event
    print("📤 Publishing test event to Redis...")
    await publish_event({
        'type': 'test_event',
        'agent_id': 'test-agent',
        'session_id': 'test-session-123',
        'content': 'This is a test event from the fixed Redis publisher',
        'data': {
            'status': 'testing',
            'phase': 'verification'
        }
    })
    print("✅ Event published (check WebSocket server logs for broadcast)")
    print()

    # Test 2: Publish a Claude thinking event
    print("📤 Publishing Claude thinking event...")
    await publish_event({
        'type': 'claude_thinking',
        'agent_id': 'claude-test',
        'session_id': 'test-session-123',
        'content': 'Claude is analyzing the task requirements...',
        'data': {
            'phase': 'planning',
            'confidence': 0.85
        }
    })
    print("✅ Claude event published")
    print()

    # Test 3: Publish a Codex execution event
    print("📤 Publishing Codex execution event...")
    await publish_event({
        'type': 'codex_execution',
        'agent_id': 'codex-mcp',
        'session_id': 'test-session-123',
        'content': 'Executing code: print("Hello from Codex")',
        'data': {
            'code': 'print("Hello from Codex")',
            'language': 'python'
        }
    })
    print("✅ Codex event published")
    print()

    print("=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)
    print()
    print("Check the WebSocket server logs to verify events were broadcast.")
    print("The server should show '📤 Broadcasted event to N clients' messages.")
    print()

if __name__ == '__main__':
    asyncio.run(test_redis_publishing())
