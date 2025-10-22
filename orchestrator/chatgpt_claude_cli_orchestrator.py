#!/usr/bin/env python3
"""
ChatGPT + Claude CLI Orchestrator
Uses ChatGPT for planning and Claude Code CLI for execution (no Anthropic API needed)
"""

import asyncio
import argparse
import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)

from orchestrator.chatgpt_planner import ChatGPTPlanner


async def execute_with_claude_cli(task: str, verbose: bool = True) -> dict:
    """
    Execute a task using Claude Code CLI

    Args:
        task: Task description for Claude to execute
        verbose: Print progress

    Returns:
        dict with success, output, error
    """

    if verbose:
        print(f"  🤖 Executing with Claude CLI...")
        print(f"     Task: {task[:100]}...")

    try:
        # Run Claude CLI with task as stdin (using input parameter instead of stdin)
        result = subprocess.run(
            ['claude', '--print', '--dangerously-skip-permissions'],
            input=task,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout per task
        )

        if result.returncode != 0:
            return {
                "success": False,
                "output": result.stdout,
                "error": result.stderr or "Claude execution failed"
            }

        if verbose:
            print(f"  ✅ Claude completed successfully")

        return {
            "success": True,
            "output": result.stdout.strip(),
            "error": None
        }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Task timed out after 5 minutes"
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e)
        }


async def orchestrate_task(
    goal: str,
    context: dict = None,
    verbose: bool = True,
    reasoning_model: str = "gpt-4o"
) -> dict:
    """
    Orchestrate a task using ChatGPT planning + Claude CLI execution

    Args:
        goal: User's goal
        context: Additional context
        verbose: Print detailed progress

    Returns:
        dict with status, results, summary
    """

    if verbose:
        print(f"\n{'='*80}")
        print("ChatGPT + Claude CLI Orchestrator")
        print(f"{'='*80}\n")
        print(f"Goal: {goal}\n")

    start_time = datetime.now()

    # Step 1: ChatGPT creates execution plan
    if verbose:
        print(f"{'─'*80}")
        print("Step 1: ChatGPT Planning")
        print(f"{'─'*80}\n")

    try:
        # Configure planner based on reasoning_model choice
        if reasoning_model in ["gpt-5", "o3", "o3-mini", "o1", "o1-mini"]:
            # Two-step: Advanced reasoning + JSON formatting
            # (GPT-5, o3 models can do JSON but this ensures clean structure)
            if verbose:
                print(f"  Using {reasoning_model} for planning (with gpt-4o for JSON formatting)")
            planner = ChatGPTPlanner(
                model="gpt-4o",                    # For JSON formatting
                reasoning_model=reasoning_model     # For advanced planning
            )
        else:
            # Single-step: gpt-4o does both
            if verbose:
                print(f"  Using {reasoning_model} for planning")
            planner = ChatGPTPlanner(model=reasoning_model)

        plan = await planner.create_plan(goal, context)

        if verbose:
            print(f"✅ Plan created:")
            print(f"   Plan ID: {plan.plan_id}")
            print(f"   Tasks: {len(plan.tasks)}")
            print(f"   Reasoning: {plan.reasoning[:200]}...")
            print()

            for i, task in enumerate(plan.tasks, 1):
                print(f"   {i}. [{task.get('agent', 'N/A')}] {task.get('description', 'N/A')}")
            print()

    except Exception as e:
        return {
            "status": "failed",
            "error": f"Planning failed: {str(e)}",
            "results": []
        }

    # Step 2: Execute tasks with Claude CLI
    if verbose:
        print(f"{'─'*80}")
        print("Step 2: Claude CLI Execution")
        print(f"{'─'*80}\n")

    results = []

    for i, task in enumerate(plan.tasks, 1):
        task_id = task.get("task_id", f"task-{i}")
        description = task.get("description", "")
        acceptance = task.get("acceptance_criteria", [])

        if verbose:
            print(f"Task {i}/{len(plan.tasks)}: {task_id}")
            print(f"  Description: {description}")

        # Build task prompt for Claude
        task_prompt = f"""# Task {task_id}

## Description
{description}

## Acceptance Criteria
{chr(10).join(f'- {criterion}' for criterion in acceptance)}

## Context
Original goal: {goal}

## Instructions
Complete this task using the available tools. When done, confirm that all acceptance criteria are met.
"""

        # Execute with Claude CLI
        result = await execute_with_claude_cli(task_prompt, verbose)

        results.append({
            "task_id": task_id,
            "description": description,
            "success": result["success"],
            "output": result["output"][:500] if result["output"] else "",
            "error": result["error"]
        })

        if not result["success"]:
            if verbose:
                print(f"  ❌ Task failed: {result['error']}")
                print(f"     Stopping execution.\n")
            break

        if verbose:
            print()

    # Step 3: ChatGPT summarizes results
    if verbose:
        print(f"{'─'*80}")
        print("Step 3: Summary")
        print(f"{'─'*80}\n")

    try:
        summary = await planner.summarize_results(plan, results)

        if verbose:
            print(summary)
            print()
    except Exception as e:
        summary = f"Could not generate summary: {str(e)}"

    # Final status
    all_success = all(r["success"] for r in results)
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    if verbose:
        print(f"{'='*80}")
        print(f"Status: {'✅ SUCCESS' if all_success else '❌ FAILED'}")
        print(f"Duration: {duration:.1f}s")
        print(f"Tasks completed: {sum(1 for r in results if r['success'])}/{len(plan.tasks)}")
        print(f"{'='*80}\n")

    return {
        "status": "completed" if all_success else "failed",
        "plan_id": plan.plan_id,
        "goal": goal,
        "tasks_total": len(plan.tasks),
        "tasks_completed": sum(1 for r in results if r["success"]),
        "duration": duration,
        "results": results,
        "summary": summary
    }


async def main():
    parser = argparse.ArgumentParser(
        description="ChatGPT + Claude CLI Orchestrator"
    )
    parser.add_argument("--goal", required=True, help="User goal to achieve")
    parser.add_argument("--context", default="{}", help="JSON context (optional)")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    parser.add_argument("--output", help="Save result to JSON file")
    parser.add_argument(
        "--reasoning-model",
        choices=["gpt-5", "o3", "o3-mini", "o1", "o1-mini", "gpt-4o"],
        default="gpt-5",
        help="Model for planning (default: gpt-5 = OpenAI's latest and best model)"
    )

    args = parser.parse_args()

    # Parse context
    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON in --context")
        sys.exit(1)

    # Check OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set in environment or .env file")
        sys.exit(1)

    # Run orchestration
    result = await orchestrate_task(
        goal=args.goal,
        context=context,
        verbose=not args.quiet,
        reasoning_model=args.reasoning_model
    )

    # Save output if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"Result saved to: {output_path}")

    # Exit with appropriate code
    sys.exit(0 if result["status"] == "completed" else 1)


if __name__ == "__main__":
    asyncio.run(main())
