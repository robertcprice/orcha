#!/usr/bin/env python3
"""
REAL TEST - Make Claude actually build something

This will make Claude Code create a real todo list app
and we'll watch it think live!
"""

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.claude_code_agent import ClaudeCodeAgent, ReviewRequest

async def test_real_build():
    print("\n" + "=" * 80)
    print("🏗️  REAL BUILD TEST - Making Claude Build a Todo App")
    print("=" * 80)
    print()
    print("⚠️  OPEN THIS IN YOUR BROWSER NOW:")
    print("   http://localhost:3002/monitor")
    print()
    print("You will see LIVE streaming as Claude thinks and codes!")
    print()
    print("Waiting 5 seconds for you to open the browser...")
    await asyncio.sleep(5)
    print()
    print("🚀 Starting Claude Code to BUILD A TODO APP...")
    print()

    # Create agent
    agent = ClaudeCodeAgent(agent_id="builder-live-demo")

    # Create a REAL building task
    request = ReviewRequest(
        task_title="Build Todo List App",
        task_description="Build a complete todo list web application",
        requirements=[
            "Create HTML file with todo list interface",
            "Add JavaScript for add/delete functionality",
            "Include local storage persistence",
            "Style with CSS",
            "Make it responsive"
        ],
        code="",  # No code yet - asking Claude to build it!
        output="",
        iteration=0
    )

    # Modify the prompt to actually BUILD something
    print("📝 Asking Claude to BUILD (not review)...")
    print()

    # Run Claude
    result = await agent.review(request)

    print()
    print("=" * 80)
    print("✅ DONE!")
    print("=" * 80)
    print(f"Check the monitor page - you should see all the thinking!")
    print(f"Also check logs/claude_sessions/ for the full log")
    print()

if __name__ == "__main__":
    print()
    print("🎬 REAL BUILD TEST")
    print()
    asyncio.run(test_real_build())
