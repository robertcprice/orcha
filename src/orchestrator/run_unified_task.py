#!/usr/bin/env python3
"""
CLI script to run a task through the Unified AI Orchestration System.

Usage:
    python run_unified_task.py \
        --task-id TASK_ID \
        --goal "Your goal here" \
        --claude-plan "1. Step 1\n2. Step 2" \
        --context '{"key": "value"}'
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestrator.unified_orchestrator import UnifiedOrchestrator


async def main():
    parser = argparse.ArgumentParser(description="Run Unified AI Orchestration System")
    parser.add_argument("--task-id", required=True, help="Unique task identifier")
    parser.add_argument("--goal", required=True, help="User goal/objective")
    parser.add_argument("--claude-plan", required=True, help="Claude's initial plan from plan mode")
    parser.add_argument("--context", default="{}", help="Additional context as JSON")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--max-refinement-iterations", type=int, default=3, help="Max refinement iterations")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    # Parse context
    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON context: {args.context}")
        sys.exit(1)

    # Initialize orchestrator
    project_root = Path(args.project_root).resolve()
    orchestrator = UnifiedOrchestrator(
        project_root=project_root,
        verbose=args.verbose,
        max_refinement_iterations=args.max_refinement_iterations
    )

    print(f"\n{'='*70}")
    print(f"UNIFIED AI ORCHESTRATION SYSTEM")
    print(f"{'='*70}")
    print(f"Task ID: {args.task_id}")
    print(f"Goal: {args.goal}")
    print(f"Project Root: {project_root}")
    print(f"{'='*70}\n")

    try:
        # Execute orchestration workflow
        result = await orchestrator.execute_goal(
            user_goal=args.goal,
            claude_plan=args.claude_plan,
            context=context,
            task_id=args.task_id
        )

        print(f"\n{'='*70}")
        print(f"ORCHESTRATION COMPLETE")
        print(f"{'='*70}")
        print(f"Success: {result['success']}")
        print(f"Quality Score: {result['quality_score']}/10")
        print(f"Files Created: {len(result['implementation']['files_created'])}")
        print(f"Refinement Iterations: {result['refinement']['iterations']}")
        print(f"Total Cost: ${result['cost']:.4f}")
        print(f"{'='*70}\n")

        # Exit with success
        sys.exit(0)

    except Exception as e:
        print(f"\n{'='*70}")
        print(f"ORCHESTRATION FAILED")
        print(f"{'='*70}")
        print(f"Error: {e}")
        print(f"{'='*70}\n")

        import traceback
        traceback.print_exc()

        # Exit with failure
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
