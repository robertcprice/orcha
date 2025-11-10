#!/usr/bin/env python3
"""
Test the delegate skill by creating a Codex MCP subagent
"""

import asyncio
import sys
from pathlib import Path

# Add project root for imports
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.codex_mcp_agent import CodexMCPAgent, CodexTask, CodexResult


async def test_delegate_skill():
    """
    Test delegate skill by:
    1. Creating a Codex MCP subagent
    2. Delegating a simple implementation task
    3. Reviewing the output
    """

    print("=" * 60)
    print("TESTING DELEGATE SKILL")
    print("=" * 60)

    # Step 1: Create a task for the subagent
    task = CodexTask(
        task_id="test-001",
        title="Create a simple greeting function",
        description="Create a Python function that greets a user by name",
        requirements=[
            "Function should be named 'greet'",
            "Function should take a 'name' parameter",
            "Function should return a greeting string",
            "Include type hints",
            "Include a docstring"
        ],
        cwd=".",
        sandbox="workspace-write",
        approval_policy="never"
    )

    print(f"\n📋 Task: {task.title}")
    print(f"📝 Description: {task.description}")
    print(f"✅ Requirements: {len(task.requirements)} items")

    # Step 2: Create and execute Codex MCP agent
    print("\n🤖 Creating Codex MCP subagent...")
    agent = CodexMCPAgent(agent_id="delegate-test", task=task)

    print("▶️  Executing task via Codex MCP...")
    result = await agent.execute()

    # Step 3: Review the result
    print("\n" + "=" * 60)
    print("RESULT")
    print("=" * 60)

    print(f"\n✅ Success: {result.success}")

    if result.conversation_id:
        print(f"💬 Conversation ID: {result.conversation_id}")

    if result.output:
        print(f"\n📄 Output ({len(result.output)} chars):")
        print("-" * 60)
        print(result.output)
        print("-" * 60)

    if result.error:
        print(f"\n❌ Error: {result.error}")

    if result.files_created:
        print(f"\n📁 Files created: {', '.join(result.files_created)}")

    print(f"\n🔄 Iterations: {result.iterations}")

    # Step 4: Test refinement (if initial succeeded)
    if result.success and result.conversation_id:
        print("\n" + "=" * 60)
        print("TESTING REFINEMENT")
        print("=" * 60)

        print("\n📝 Providing feedback for refinement...")
        feedback = """
        The implementation looks good, but please make these improvements:
        1. Add input validation to check if name is empty
        2. Add a parameter for custom greeting prefix (default: "Hello")
        3. Add an example in the docstring
        """

        print("▶️  Refining via Codex MCP...")
        refined_result = await agent.refine_with_feedback(feedback)

        print(f"\n✅ Refinement Success: {refined_result.success}")

        if refined_result.output:
            print(f"\n📄 Refined Output ({len(refined_result.output)} chars):")
            print("-" * 60)
            print(refined_result.output)
            print("-" * 60)

        if refined_result.error:
            print(f"\n❌ Refinement Error: {refined_result.error}")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

    return result


if __name__ == "__main__":
    result = asyncio.run(test_delegate_skill())
    sys.exit(0 if result.success else 1)
