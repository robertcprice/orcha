#!/usr/bin/env python3
"""
Simple test to demonstrate Claude Code agent streaming

This just runs Claude Code agent to show the streaming works.
Watch http://localhost:3002/monitor to see events!
"""

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.claude_code_agent import ClaudeCodeAgent, ReviewRequest

async def test_claude_streaming():
    print("=" * 80)
    print("🧪 Testing Claude Code Agent Streaming")
    print("=" * 80)
    print()
    print("This will run Claude Code to review some code.")
    print("Watch http://localhost:3002/monitor to see streaming events!")
    print()
    print("You should see:")
    print("  🔵 claude_session_started")
    print("  🔵 claude_thinking (multiple lines as it thinks)")
    print("  🔵 claude_session_completed")
    print()
    print("=" * 80)
    print()

    # Create a simple code review task
    agent = ClaudeCodeAgent(agent_id="test-streaming-123")

    request = ReviewRequest(
        task_title="Test Calculator Review",
        task_description="Review a simple calculator function",
        requirements=[
            "Function should add two numbers",
            "Should handle edge cases",
            "Should have tests"
        ],
        code="""
def add(a, b):
    '''Add two numbers together.'''
    return a + b

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0

test_add()
print("All tests passed!")
""",
        output="All tests passed!",
        iteration=0
    )

    print("🚀 Starting Claude Code review...")
    print(f"   Agent ID: test-streaming-123")
    print(f"   Session will stream to WebSocket!")
    print()

    result = await agent.review(request)

    print()
    print("=" * 80)
    print("📊 RESULTS")
    print("=" * 80)
    print(f"Approved: {result.approved}")
    print(f"Quality Score: {result.quality_score}/10")
    print(f"Issues Found: {len(result.issues_found)}")
    print(f"Suggestions: {len(result.suggestions)}")
    print()
    print("Feedback:")
    print(result.feedback[:500])
    print()
    print("=" * 80)
    print("✅ Check http://localhost:3002/monitor to see the streaming events!")
    print("=" * 80)

if __name__ == "__main__":
    print()
    print("Starting test...")
    print("Make sure WebSocket server is running on port 4000!")
    print()

    asyncio.run(test_claude_streaming())
