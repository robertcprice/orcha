#!/usr/bin/env python3
"""
Quick test to verify progress logging with real-time flush
"""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path.cwd()))

from orchestrator.unified_orchestrator import UnifiedOrchestrator

async def test_progress():
    print("=" * 70)
    print("TESTING UNIFIED ORCHESTRATOR WITH PROGRESS LOGGING")
    print("=" * 70)
    print()

    # Very simple task for quick testing
    user_goal = "Create a hello world function"
    claude_plan = """1. Create a hello.py file with a hello() function
2. Make it return 'Hello, World!'
3. Add a simple docstring"""

    print(f"Goal: {user_goal}")
    print(f"Plan:\n{claude_plan}")
    print()
    print("=" * 70)
    print("Starting orchestration...")
    print("=" * 70)
    sys.stdout.flush()

    # Initialize orchestrator
    project_root = Path.cwd()
    orchestrator = UnifiedOrchestrator(
        project_root=project_root,
        verbose=True,
        max_refinement_iterations=1  # Limit refinement for faster testing
    )

    try:
        # Run with verbose logging
        result = await orchestrator.execute_goal(
            user_goal=user_goal,
            claude_plan=claude_plan,
            context={"test_mode": True},
            task_id="test_progress_logging"
        )

        print("\n" + "=" * 70)
        print("TEST COMPLETE")
        print("=" * 70)
        print(f"✅ Success: {result['success']}")
        print(f"📊 Quality Score: {result['quality_score']}/10")
        print(f"💰 Total Cost: ${result['cost']:.4f}")
        print("=" * 70)

        return result

    except Exception as e:
        print("\n" + "=" * 70)
        print("TEST FAILED")
        print("=" * 70)
        print(f"❌ Error: {e}")
        print("=" * 70)

        import traceback
        traceback.print_exc()

        return None

if __name__ == "__main__":
    print("\n🚀 Running progress logging test...")
    print("📍 All phase transitions should appear immediately")
    print("📍 MCP warnings should be suppressed\n")

    result = asyncio.run(test_progress())

    if result and result['success']:
        print("\n✅ Progress logging test passed!")
        sys.exit(0)
    else:
        print("\n❌ Progress logging test failed!")
        sys.exit(1)
