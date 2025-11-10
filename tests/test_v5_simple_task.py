#!/usr/bin/env python3
"""
Simple V5 Test - Calculator Function
Tests the V5 orchestrator with a simple task
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

print("Importing V5 orchestrator...")
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# Simple Claude plan
CLAUDE_PLAN = """
# Calculator Function Implementation Plan

## Step 1: Create calculator.py
- Implement add, subtract, multiply, divide functions
- Add error handling for division by zero
- Use clear function names and docstrings

## Step 2: Create test_calculator.py
- Test each operation
- Test edge cases (division by zero, negative numbers)
- Use pytest framework

## Step 3: Create README.md
- Document usage
- Show examples
"""


async def main():
    print("=" * 70)
    print("V5 SIMPLE TEST: CALCULATOR FUNCTION")
    print("=" * 70)
    print()

    goal = "Create a simple calculator module with tests"

    print(f"Goal: {goal}")
    print()

    try:
        print("Initializing V5 orchestrator...")
        orchestrator = HybridOrchestratorV5(
            project_root=PROJECT_ROOT,
            verbose=True
        )
        print("✅ V5 orchestrator initialized")
        print()

        print("Starting workflow...")
        print("=" * 70)

        result = await orchestrator.execute_goal(
            user_goal=goal,
            claude_plan=CLAUDE_PLAN,
            context={"type": "simple_module"}
        )

        print()
        print("=" * 70)
        print("RESULTS")
        print("=" * 70)
        print(f"Success: {result.success}")
        print(f"Quality Score: {result.review.quality_score}/10")
        print(f"Approved: {result.review.approved}")
        print(f"Files Created: {result.implementation.files_created}")
        print(f"Tests Created: {result.implementation.tests_created}")
        print()

        return 0 if result.success else 1

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
