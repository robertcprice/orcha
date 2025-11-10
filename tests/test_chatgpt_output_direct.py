#!/usr/bin/env python3
"""
Direct test of ChatGPT planner to see exact output
"""
import asyncio
import json
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Add orchestrator to path
sys.path.insert(0, str(Path(__file__).parent / "orchestrator"))

from chatgpt_planner import ChatGPTPlanner


async def test_chatgpt_plan():
    print("=" * 80)
    print("DIRECT CHATGPT PLANNER TEST")
    print("=" * 80)

    planner = ChatGPTPlanner()

    goal = "Build a REST API with JWT authentication and bcrypt hashing. Include documentation and tests."

    print(f"\n📝 Goal: {goal}")
    print("\n⏳ Calling ChatGPT planner...")

    plan = await planner.create_plan(
        user_goal=goal,
        context={"request": goal}
    )

    print("\n" + "=" * 80)
    print("📋 CHATGPT PLAN RESULT")
    print("=" * 80)

    print(f"\n✅ Plan ID: {plan.plan_id}")
    print(f"✅ Goal: {plan.goal}")
    print(f"✅ Reasoning: {plan.reasoning[:200]}...")
    print(f"✅ Tasks Count: {len(plan.tasks)}")
    print(f"✅ Dependencies: {plan.dependencies}")
    print(f"✅ Estimated Time: {plan.estimated_time}")

    print("\n" + "=" * 80)
    print("🔍 DETAILED TASKS INSPECTION")
    print("=" * 80)

    for i, task in enumerate(plan.tasks, 1):
        print(f"\n{'='*60}")
        print(f"Task {i}: {task.get('task_id', 'NO ID')}")
        print(f"{'='*60}")
        print(f"  Agent: {task.get('agent', 'NO AGENT')}")
        print(f"  Description: {task.get('description', 'NO DESCRIPTION')}")

        # CHECK FOR SUBTASKS
        if 'subtasks' in task:
            print(f"  ✅ HAS SUBTASKS ({len(task['subtasks'])} items):")
            for j, subtask in enumerate(task['subtasks'], 1):
                print(f"     {j}. {subtask}")
        else:
            print(f"  ❌ NO SUBTASKS FIELD")

        # Check other fields
        print(f"  Acceptance Criteria: {len(task.get('acceptance_criteria', []))} items")
        print(f"  Priority: {task.get('priority', 'NOT SET')}")
        print(f"  Estimated Time: {task.get('estimated_time', 'NOT SET')}")
        print(f"  Parallelization: {task.get('parallelization', 'NOT SET')}")
        print(f"  Depends On: {task.get('depends_on', [])}")

    print("\n" + "=" * 80)
    print("📄 FULL TASKS JSON")
    print("=" * 80)
    print(json.dumps(plan.tasks, indent=2))

    print("\n" + "=" * 80)
    print("✅ TEST COMPLETE")
    print("=" * 80)

    # Summary
    tasks_with_subtasks = sum(1 for task in plan.tasks if 'subtasks' in task)
    print(f"\n📊 SUMMARY:")
    print(f"   Total Tasks: {len(plan.tasks)}")
    print(f"   Tasks WITH Subtasks: {tasks_with_subtasks}")
    print(f"   Tasks WITHOUT Subtasks: {len(plan.tasks) - tasks_with_subtasks}")

    if tasks_with_subtasks == len(plan.tasks):
        print("\n🎉 SUCCESS: All tasks have subtasks!")
    else:
        print(f"\n❌ PROBLEM: {len(plan.tasks) - tasks_with_subtasks} tasks are missing subtasks!")


if __name__ == "__main__":
    asyncio.run(test_chatgpt_plan())
