#!/usr/bin/env python3
"""
Test ChatGPT Planner Prompt Enhancements

Verifies that ChatGPT planner produces:
1. Tasks with detailed subtasks
2. Folder/file structure with exact file names
3. NEW/EDIT markers for each file
4. All 4 specialized agent types (documentation, testing, security, code_quality)
5. Parallelization markers
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
    print(f"✅ Loaded .env file from {PROJECT_ROOT / '.env'}")
except ImportError:
    print("⚠️ python-dotenv not installed, relying on existing environment variables")

from orchestrator.chatgpt_planner import ChatGPTPlanner


async def test_chatgpt_planner():
    """Test ChatGPT planner with sample task."""
    print("=" * 80)
    print("ChatGPT Planner Prompt Enhancement Test")
    print("=" * 80)

    # Initialize planner
    planner = ChatGPTPlanner()

    # Sample task request
    user_goal = """
    Build a user authentication system with JWT tokens.

    Requirements:
    - User registration with email/password
    - Login with JWT token generation
    - Protected routes that require authentication
    - Password hashing with bcrypt
    - Token refresh mechanism
    """

    context = {
        "framework": "Node.js/Express",
        "language": "TypeScript",
        "database": "PostgreSQL"
    }

    print("\n📝 Test Task:")
    print(user_goal)
    print(f"\n📋 Context: {context}")
    print("\n" + "=" * 80)

    print("\n🤖 Calling ChatGPT Planner...")
    print("=" * 80)

    # Call planner
    try:
        result = await planner.create_plan(user_goal, context)
    except Exception as e:
        print(f"\n❌ Planning Failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    print("\n✅ Planning Successful!")
    print("=" * 80)

    # Analyze the plan content
    # ExecutionPlan has: plan_id, goal, reasoning, tasks, dependencies, estimated_time, risks
    plan_content = f"""
GOAL: {result.goal}

REASONING:
{result.reasoning}

TASKS:
{json.dumps(result.tasks, indent=2)}

DEPENDENCIES:
{json.dumps(result.dependencies, indent=2)}

ESTIMATED TIME: {result.estimated_time}

RISKS:
{json.dumps(result.risks, indent=2)}
    """

    print("\n📋 ANALYZING PLAN CONTENT:")
    print("=" * 80)

    # Check 1: Exact file names present
    print("\n1️⃣ Checking for Exact File Names with NEW/EDIT markers...")
    file_indicators = [
        ".tsx", ".ts", ".js", ".jsx", ".py", ".json", ".md",
        "NEW -", "EDIT -", "CREATE", "MODIFY"
    ]
    files_found = any(indicator in plan_content for indicator in file_indicators)

    if files_found:
        print("   ✅ File names with markers detected")
        # Extract some examples
        for line in plan_content.split('\n'):
            if any(ext in line for ext in ['.tsx', '.ts', '.js', '.py', '.json', '.md']):
                if any(marker in line.upper() for marker in ['NEW', 'EDIT', 'CREATE', 'MODIFY']):
                    print(f"      Example: {line.strip()[:100]}")
                    break
    else:
        print("   ⚠️ No file names with markers found")

    # Check 2: Specialized agents
    print("\n2️⃣ Checking for Specialized Agents...")
    required_agents = {
        "documentation": ["documentation", "docs", "readme", "api.md"],
        "testing": ["testing", "test", "coverage", "e2e"],
        "security": ["security", "vulnerability", "owasp", "auth review"],
        "code_quality": ["code quality", "linting", "eslint", "type check"]
    }

    agents_found = {}
    for agent_type, keywords in required_agents.items():
        found = any(keyword.lower() in plan_content.lower() for keyword in keywords)
        agents_found[agent_type] = found
        status = "✅" if found else "❌"
        print(f"   {status} {agent_type.title()} Agent: {found}")

    all_agents_present = all(agents_found.values())

    # Check 3: Parallelization
    print("\n3️⃣ Checking for Parallelization Mentions...")
    parallel_keywords = [
        "parallel", "simultaneously", "concurrent", "in parallel",
        "can run together", "independent tasks"
    ]
    parallelization_found = any(keyword.lower() in plan_content.lower() for keyword in parallel_keywords)

    if parallelization_found:
        print("   ✅ Parallelization strategy detected")
        # Find example
        for line in plan_content.split('\n'):
            if any(keyword.lower() in line.lower() for keyword in parallel_keywords):
                print(f"      Example: {line.strip()[:100]}")
                break
    else:
        print("   ⚠️ No parallelization mentions found")

    # Check 4: Task breakdown
    print("\n4️⃣ Checking for Task Breakdown with Subtasks...")
    task_indicators = [
        "task", "subtask", "step", "phase",
        "1.", "2.", "3.", "-", "*"
    ]

    # Count numbered items or bullet points
    task_lines = [line for line in plan_content.split('\n')
                  if line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '-', '*'))]

    print(f"   ✅ Found {len(task_lines)} task/subtask items")
    if task_lines:
        print(f"      First few items:")
        for line in task_lines[:3]:
            print(f"         {line.strip()[:80]}")

    # Check 5: Directory structure
    print("\n5️⃣ Checking for Directory/Folder Structure...")
    structure_indicators = [
        "src/", "components/", "tests/", "docs/",
        "├──", "└──", "│", "directory", "folder"
    ]
    structure_found = any(indicator in plan_content for indicator in structure_indicators)

    if structure_found:
        print("   ✅ Directory structure detected")
        # Find tree structure example
        for i, line in enumerate(plan_content.split('\n')):
            if any(char in line for char in ['├──', '└──', '│']):
                print(f"      Example structure:")
                # Print a few lines of the tree
                lines = plan_content.split('\n')[max(0, i-2):i+5]
                for l in lines:
                    print(f"         {l}")
                break
    else:
        print("   ⚠️ No directory structure found")

    # Final Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)

    checks_passed = sum([
        files_found,
        all_agents_present,
        parallelization_found,
        len(task_lines) > 5,
        structure_found
    ])

    print(f"\n✅ Checks Passed: {checks_passed}/5")
    print(f"   • File names with markers: {files_found}")
    print(f"   • All specialized agents: {all_agents_present}")
    print(f"   • Parallelization strategy: {parallelization_found}")
    print(f"   • Task breakdown (>5 items): {len(task_lines) > 5}")
    print(f"   • Directory structure: {structure_found}")

    # Print full plan for manual review
    print("\n" + "=" * 80)
    print("📄 FULL PLAN CONTENT (First 2000 chars)")
    print("=" * 80)
    print(plan_content[:2000])
    if len(plan_content) > 2000:
        print(f"\n... (truncated, total length: {len(plan_content)} characters)")

    print("\n" + "=" * 80)

    if checks_passed >= 4:
        print("✅ ChatGPT Planner Test PASSED!")
        return True
    else:
        print("⚠️ ChatGPT Planner Test NEEDS REVIEW")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_chatgpt_planner())
    sys.exit(0 if success else 1)
