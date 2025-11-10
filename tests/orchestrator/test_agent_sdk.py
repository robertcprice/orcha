"""
Test script for Agent SDK integration.
Verifies that the AgentSDKManager and AgentRegistry work correctly.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from orchestrator.agent_sdk_manager import AgentSDKManager, AgentTask
from orchestrator.agent_registry import AgentFactory


async def test_agent_initialization():
    """Test agent factory and registry initialization."""
    print("\n=== Test 1: Agent Initialization ===")

    project_root = Path(__file__).parent.parent
    factory = AgentFactory(project_root)

    # Get available agents
    agents = factory.get_available_agents()
    print(f"✓ Found {len(agents)} registered agents:")
    for agent in agents:
        print(f"  - {agent['role']}: {agent['name']}")

    # Test agent configuration creation
    print("\n=== Test 2: Agent Configuration ===")
    for role in ["PP", "CODE", "QA", "DOC"]:
        config = factory.create_agent_config(role)
        if config:
            print(f"✓ Created config for {role}")
            print(f"  Tools: {', '.join(config.tools_enabled)}")
        else:
            print(f"✗ Failed to create config for {role}")

    return True


async def test_agent_routing():
    """Test task routing recommendations."""
    print("\n=== Test 3: Task Routing ===")

    project_root = Path(__file__).parent.parent
    factory = AgentFactory(project_root)

    test_tasks = [
        "Document the new API endpoints",
        "Implement user authentication feature",
        "Debug failing unit tests",
        "Research best practices for async queues",
        "Train the quantile regression model",
        "Set up CI/CD pipeline",
    ]

    for task in test_tasks:
        recommendations = factory.recommend_agent(task)
        print(f"Task: '{task}'")
        print(f"  → Recommended agents: {', '.join(recommendations)}")


async def test_simple_task_execution():
    """Test executing a simple task with an agent."""
    print("\n=== Test 4: Simple Task Execution ===")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠ ANTHROPIC_API_KEY not set, skipping execution test")
        return False

    project_root = Path(__file__).parent.parent
    factory = AgentFactory(project_root)

    # Create DOC agent config for a simple documentation task
    config = factory.create_agent_config("DOC")
    if not config:
        print("✗ Failed to create DOC agent config")
        return False

    # Create a simple task
    task = AgentTask(
        task_id="test-001",
        goal="List the files in the orchestrator directory",
        acceptance_criteria=[
            "Use list_files tool to find Python files",
            "Report the number of files found"
        ],
        context_paths=["orchestrator/"]
    )

    print(f"Executing task: {task.goal}")
    print("Note: This will make an API call to Anthropic")
    print("Waiting for user confirmation...")
    user_input = input("Proceed with API call? (y/n): ")

    if user_input.lower() != 'y':
        print("Skipped execution test")
        return False

    # Create SDK manager and execute
    manager = AgentSDKManager(project_root, api_key, max_concurrent=1)

    try:
        success, output, metadata = await manager.execute_task(config, task)

        print(f"\n{'='*60}")
        print(f"Task Status: {'SUCCESS' if success else 'FAILED'}")
        print(f"Iterations: {metadata.get('iterations', 'unknown')}")
        print(f"Tool Calls: {metadata.get('tool_calls', 'unknown')}")
        print(f"Duration: {metadata.get('duration', 'unknown')}s")
        print(f"{'='*60}")
        print(f"\nAgent Output:\n{output}")
        print(f"{'='*60}\n")

        return success
    except Exception as e:
        print(f"✗ Error during execution: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_tool_executor():
    """Test tool executor directly."""
    print("\n=== Test 5: Tool Executor ===")

    from orchestrator.agent_sdk_manager import ToolExecutor

    project_root = Path(__file__).parent.parent
    executor = ToolExecutor(project_root)

    # Test list_files
    result = await executor.execute("list_files", {
        "pattern": "*.py",
        "path": "orchestrator"
    })

    if "files" in result:
        print(f"✓ list_files tool works: found {len(result['files'])} files")
        for f in result['files'][:3]:
            print(f"  - {f}")
    else:
        print(f"✗ list_files failed: {result}")

    # Test read_file
    result = await executor.execute("read_file", {
        "path": "README.md",
        "offset": 0,
        "limit": 5
    })

    if "content" in result:
        print(f"✓ read_file tool works")
        print(f"  First line: {result['content'].split(chr(10))[0][:50]}...")
    else:
        print(f"✗ read_file failed: {result}")


async def main():
    """Run all tests."""
    print("="*60)
    print("Agent SDK Integration Tests")
    print("="*60)

    tests = [
        ("Initialization", test_agent_initialization),
        ("Routing", test_agent_routing),
        ("Tool Executor", test_tool_executor),
        ("Task Execution", test_simple_task_execution),
    ]

    results = {}
    for name, test_func in tests:
        try:
            result = await test_func()
            results[name] = result if result is not None else True
        except Exception as e:
            print(f"✗ Test '{name}' failed with error: {e}")
            import traceback
            traceback.print_exc()
            results[name] = False

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    for name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")

    print("\n" + "="*60)
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
