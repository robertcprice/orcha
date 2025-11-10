#!/usr/bin/env python3
"""
Test script to demonstrate real-time streaming from agents

This will show:
1. Claude Code agent with real-time thinking output
2. Codex MCP agent with progress events
3. Logs streaming to files in real-time
4. Events publishing to Redis for WebSocket clients
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.hybrid_codex_claude_mcp import run_hybrid_mcp_workflow


async def test_streaming():
    """Test the hybrid workflow with streaming enabled"""

    print("=" * 80)
    print("🧪 TESTING REAL-TIME AGENT STREAMING")
    print("=" * 80)
    print()
    print("This test will demonstrate:")
    print("  ✓ Claude Code streaming output line-by-line")
    print("  ✓ Real-time log file updates")
    print("  ✓ Redis event publishing for WebSocket clients")
    print("  ✓ Codex MCP progress events")
    print()
    print("Watch the logs directory: logs/claude_sessions/")
    print("Monitor console output for [Claude-*] and [Codex-MCP-*] messages")
    print()
    print("=" * 80)
    print()

    # Define a simple test task
    task_id = "streaming-test-001"
    title = "Create a Simple Greeting Function"
    description = """
Create a Python function called 'greet' that:
- Takes a name parameter
- Returns a personalized greeting message
- Has a docstring
- Includes basic input validation
"""

    requirements = [
        "Function named 'greet' with parameter 'name'",
        "Returns greeting string",
        "Has clear docstring",
        "Validates input (not empty)",
        "Include simple unit tests"
    ]

    print(f"📋 Task: {title}")
    print(f"📋 Task ID: {task_id}")
    print()

    # Run the hybrid workflow
    print("🚀 Starting hybrid workflow...")
    print("   Watch for streaming output below:")
    print()

    result = await run_hybrid_mcp_workflow(
        task_id=task_id,
        title=title,
        description=description,
        requirements=requirements,
        cwd="./workspace",
        max_iterations=2
    )

    # Print results
    print()
    print("=" * 80)
    print("📊 RESULTS")
    print("=" * 80)
    print(f"Success: {result.success}")
    print(f"Iterations: {result.iterations}")
    print(f"Total Time: {result.total_time:.1f}s")
    print(f"Quality Score: {result.quality_score:.1f}/10")
    print(f"Codex Iterations: {result.codex_iterations}")
    print(f"Claude Reviews: {result.claude_reviews}")

    if result.error:
        print(f"Error: {result.error}")

    print()
    print("=" * 80)
    print("📁 Check these locations:")
    print("=" * 80)
    print(f"  • Logs: {PROJECT_ROOT}/logs/claude_sessions/")
    print(f"  • Workspace: {PROJECT_ROOT}/workspace/")
    print(f"  • Redis events published in real-time")
    print()

    # Show log files
    log_dir = PROJECT_ROOT / "logs" / "claude_sessions"
    if log_dir.exists():
        log_files = sorted(log_dir.glob("review_*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
        if log_files:
            latest_log = log_files[0]
            print(f"📝 Latest log file: {latest_log.name}")
            print()
            print("First 50 lines:")
            print("-" * 80)
            with open(latest_log, 'r') as f:
                for i, line in enumerate(f):
                    if i >= 50:
                        print("... (truncated)")
                        break
                    print(line.rstrip())
            print("-" * 80)


if __name__ == "__main__":
    print()
    print("🎬 Starting streaming test...")
    print()

    asyncio.run(test_streaming())

    print()
    print("✅ Test complete!")
    print()
