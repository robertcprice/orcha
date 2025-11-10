#!/usr/bin/env python3
"""
V5 Hybrid Orchestrator Task Runner

Executes tasks using the V5 multi-AI orchestration workflow.
This script is called by the web UI to run V5 tasks.

Usage:
    python run_hybrid_task_v5.py --task-id <id> --goal "<goal>" --claude-plan "<plan>" [--context '{}']
"""

import asyncio
import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime
import traceback

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import V5 orchestrator
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# Import Redis for event publishing
try:
    import redis
    REDIS_AVAILABLE = True
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', '6379')),
        db=int(os.getenv('REDIS_DB', '0')),
        decode_responses=True
    )
except ImportError:
    REDIS_AVAILABLE = False
    redis_client = None


def publish_event(event_type: str, task_id: str, data: dict):
    """Publish event to Redis for web UI."""
    if not REDIS_AVAILABLE or not redis_client:
        return

    try:
        event = {
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "task_id": task_id,
            **data
        }
        redis_client.publish('claude:sessions', json.dumps(event))

        # Also store in task hash
        task_key = f"algomind.hybrid.task.{task_id}"
        redis_client.hset(task_key, mapping={
            "status": data.get("status", "running"),
            "updated_at": datetime.now().isoformat(),
            **{k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
               for k, v in data.items()}
        })
    except Exception as e:
        print(f"Warning: Failed to publish event: {e}", file=sys.stderr)


async def agent_activity_callback(agent_id: str, activity: str, message: str, task_id: str):
    """Callback for agent activity updates."""
    print(f"[{agent_id}] {activity}: {message}")
    publish_event("agent_activity", task_id, {
        "agent_id": agent_id,
        "activity": activity,
        "message": message
    })


async def run_v5_task(task_id: str, goal: str, claude_plan: str, context: dict = None):
    """Run a task using V5 orchestrator."""

    print(f"=" * 70)
    print(f"V5 HYBRID ORCHESTRATOR - Task: {task_id}")
    print(f"=" * 70)
    print(f"Goal: {goal}")
    print(f"Claude Plan Length: {len(claude_plan)} characters")
    print(f"=" * 70)

    # Publish start event
    publish_event("task_started", task_id, {
        "status": "planning",
        "goal": goal,
        "mode": "v5"
    })

    try:
        # Initialize V5 orchestrator
        orchestrator = HybridOrchestratorV5(
            project_root=PROJECT_ROOT,
            verbose=True,
            agent_activity_callback=lambda a, act, msg: asyncio.create_task(
                agent_activity_callback(a, act, msg, task_id)
            )
        )

        # Execute goal
        result = await orchestrator.execute_goal(
            user_goal=goal,
            claude_plan=claude_plan,
            context=context
        )

        # Publish completion event
        publish_event("task_completed", task_id, {
            "status": "completed" if result.success else "failed",
            "success": result.success,
            "quality_score": result.review.quality_score,
            "approved": result.review.approved,
            "files_created": len(result.implementation.files_created),
            "tests_created": len(result.implementation.tests_created),
            "iterations": result.total_iterations,
            "execution_time": result.total_execution_time,
            "cost_breakdown": result.cost_breakdown,
            "documentation": result.documentation[:500] if result.documentation else None
        })

        # Print final summary
        print(f"\n{'=' * 70}")
        print(f"V5 WORKFLOW COMPLETED")
        print(f"{'=' * 70}")
        print(f"Success: {result.success}")
        print(f"Quality Score: {result.review.quality_score}/10")
        print(f"Approved: {result.review.approved}")
        print(f"Files Created: {len(result.implementation.files_created)}")
        print(f"Tests Created: {len(result.implementation.tests_created)}")
        print(f"Iterations: {result.total_iterations}")
        print(f"Execution Time: {result.total_execution_time:.2f}s")
        print(f"Total Cost: ${result.cost_breakdown.get('total', 0.0):.3f}")
        print(f"{'=' * 70}")

        # Save detailed results
        results_file = PROJECT_ROOT / f"v5_results_{task_id}.json"
        with open(results_file, 'w') as f:
            json.dump({
                "task_id": task_id,
                "goal": goal,
                "success": result.success,
                "enriched_plan": {
                    "plan_id": result.enriched_plan.plan_id,
                    "enrichments": len(result.enriched_plan.enrichments),
                    "confidence_score": result.enriched_plan.final_confidence_score
                },
                "implementation": {
                    "files_created": result.implementation.files_created,
                    "files_modified": result.implementation.files_modified,
                    "tests_created": result.implementation.tests_created
                },
                "review": {
                    "approved": result.review.approved,
                    "quality_score": result.review.quality_score,
                    "feedback": result.review.feedback,
                    "issues_found": result.review.issues_found,
                    "suggestions": result.review.suggestions
                },
                "documentation": result.documentation,
                "iterations": result.total_iterations,
                "execution_time": result.total_execution_time,
                "cost_breakdown": result.cost_breakdown,
                "workflow_log": result.workflow_log
            }, f, indent=2)

        print(f"\nDetailed results saved to: {results_file}")

        return 0 if result.success else 1

    except Exception as e:
        print(f"\n❌ V5 WORKFLOW FAILED: {e}", file=sys.stderr)
        traceback.print_exc()

        # Publish error event
        publish_event("task_error", task_id, {
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc()
        })

        return 1


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run V5 Hybrid Orchestrator task"
    )
    parser.add_argument(
        "--task-id",
        required=True,
        help="Unique task identifier"
    )
    parser.add_argument(
        "--goal",
        required=True,
        help="User goal/task description"
    )
    parser.add_argument(
        "--claude-plan",
        required=True,
        help="Claude's initial plan from plan mode"
    )
    parser.add_argument(
        "--context",
        default="{}",
        help="Additional context as JSON string"
    )

    args = parser.parse_args()

    # Parse context
    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        print(f"Warning: Invalid context JSON, using empty context", file=sys.stderr)
        context = {}

    # Run task
    exit_code = asyncio.run(run_v5_task(
        task_id=args.task_id,
        goal=args.goal,
        claude_plan=args.claude_plan,
        context=context
    ))

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
