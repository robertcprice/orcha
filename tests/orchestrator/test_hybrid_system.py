"""
Comprehensive Test Suite for Hybrid Orchestrator System
Tests ChatGPT Planner + Claude Executor + Agent SDK integration
"""

import os
import sys
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from orchestrator.chatgpt_planner import ChatGPTPlanner, ExecutionPlan, PlanValidator
from orchestrator.claude_executor import ClaudeExecutor
from orchestrator.hybrid_orchestrator_v3 import HybridOrchestrator


def test_imports():
    """Test that all modules import correctly"""
    print("\n" + "="*60)
    print("TEST 1: Module Imports")
    print("="*60)

    try:
        from orchestrator.chatgpt_planner import ChatGPTPlanner
        print("✓ ChatGPTPlanner imported")
    except Exception as e:
        print(f"✗ ChatGPTPlanner import failed: {e}")
        return False

    try:
        from orchestrator.claude_executor import ClaudeExecutor
        print("✓ ClaudeExecutor imported")
    except Exception as e:
        print(f"✗ ClaudeExecutor import failed: {e}")
        return False

    try:
        from orchestrator.hybrid_orchestrator_v3 import HybridOrchestrator
        print("✓ HybridOrchestrator imported")
    except Exception as e:
        print(f"✗ HybridOrchestrator import failed: {e}")
        return False

    try:
        from orchestrator.agent_sdk_manager import AgentSDKManager
        print("✓ AgentSDKManager imported")
    except Exception as e:
        print(f"✗ AgentSDKManager import failed: {e}")
        return False

    try:
        from orchestrator.agent_registry import AgentFactory
        print("✓ AgentFactory imported")
    except Exception as e:
        print(f"✗ AgentFactory import failed: {e}")
        return False

    print("\n✓ All imports successful!")
    return True


def test_plan_validation():
    """Test plan validation logic"""
    print("\n" + "="*60)
    print("TEST 2: Plan Validation")
    print("="*60)

    # Valid plan
    valid_plan = ExecutionPlan(
        plan_id="test-001",
        goal="Test goal",
        reasoning="Test reasoning",
        tasks=[
            {
                "task_id": "task-1",
                "agent": "DOC",
                "description": "Create documentation",
                "acceptance_criteria": ["Docs exist", "Docs are clear"],
                "priority": "high"
            },
            {
                "task_id": "task-2",
                "agent": "CODE",
                "description": "Implement feature",
                "acceptance_criteria": ["Code works", "Tests pass"],
                "priority": "high"
            }
        ],
        dependencies={
            "task-2": ["task-1"]
        }
    )

    is_valid, errors = PlanValidator.validate_plan(valid_plan)
    if is_valid:
        print("✓ Valid plan passes validation")
    else:
        print(f"✗ Valid plan failed validation: {errors}")
        return False

    # Invalid plan (missing agent)
    invalid_plan = ExecutionPlan(
        plan_id="test-002",
        goal="Test goal",
        reasoning="Test reasoning",
        tasks=[
            {
                "task_id": "task-1",
                "description": "Missing agent",
                "acceptance_criteria": ["Done"],
                "priority": "high"
            }
        ],
        dependencies={}
    )

    is_valid, errors = PlanValidator.validate_plan(invalid_plan)
    if not is_valid:
        print("✓ Invalid plan correctly rejected")
    else:
        print("✗ Invalid plan incorrectly passed validation")
        return False

    # Circular dependency
    circular_plan = ExecutionPlan(
        plan_id="test-003",
        goal="Test circular dependencies",
        reasoning="Test reasoning",
        tasks=[
            {
                "task_id": "task-1",
                "agent": "DOC",
                "description": "Task 1",
                "acceptance_criteria": ["Done"],
                "priority": "high"
            },
            {
                "task_id": "task-2",
                "agent": "CODE",
                "description": "Task 2",
                "acceptance_criteria": ["Done"],
                "priority": "high"
            }
        ],
        dependencies={
            "task-1": ["task-2"],
            "task-2": ["task-1"]
        }
    )

    has_circular, cycle = PlanValidator.check_circular_dependencies(circular_plan)
    if has_circular:
        print(f"✓ Circular dependency detected: {cycle}")
    else:
        print("✗ Circular dependency not detected")
        return False

    print("\n✓ All validation tests passed!")
    return True


def test_api_keys():
    """Test if API keys are configured"""
    print("\n" + "="*60)
    print("TEST 3: API Keys Configuration")
    print("="*60)

    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    results = {}

    if openai_key:
        print(f"✓ OPENAI_API_KEY found ({openai_key[:8]}...)")
        results["openai"] = True
    else:
        print("⚠ OPENAI_API_KEY not set (live tests will be skipped)")
        results["openai"] = False

    if anthropic_key:
        print(f"✓ ANTHROPIC_API_KEY found ({anthropic_key[:8]}...)")
        results["anthropic"] = True
    else:
        print("⚠ ANTHROPIC_API_KEY not set (live tests will be skipped)")
        results["anthropic"] = False

    return results


async def test_chatgpt_planning(api_keys):
    """Test ChatGPT planning (if API key available)"""
    print("\n" + "="*60)
    print("TEST 4: ChatGPT Planning (Live API Test)")
    print("="*60)

    if not api_keys.get("openai"):
        print("⏸ Skipped (no OPENAI_API_KEY)")
        return None

    try:
        planner = ChatGPTPlanner(model="gpt-4")
        print("✓ ChatGPTPlanner initialized")

        # Test simple planning request
        print("\nTesting simple plan creation...")
        plan = await planner.create_plan(
            user_goal="Create a simple test file with 'Hello World'",
            context={"test_mode": True}
        )

        print(f"✓ Plan created: {plan.plan_id}")
        print(f"  Goal: {plan.goal}")
        print(f"  Tasks: {len(plan.tasks)}")
        for i, task in enumerate(plan.tasks, 1):
            print(f"    {i}. [{task['agent']}] {task['description']}")

        # Validate plan
        is_valid, errors = PlanValidator.validate_plan(plan)
        if is_valid:
            print("✓ Generated plan is valid")
        else:
            print(f"✗ Generated plan has errors: {errors}")
            return False

        return True

    except Exception as e:
        print(f"✗ ChatGPT planning test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_hybrid_orchestrator(api_keys):
    """Test full hybrid orchestrator (if both API keys available)"""
    print("\n" + "="*60)
    print("TEST 5: Hybrid Orchestrator (Full System Test)")
    print("="*60)

    if not api_keys.get("openai") or not api_keys.get("anthropic"):
        print("⏸ Skipped (requires both OPENAI_API_KEY and ANTHROPIC_API_KEY)")
        return None

    try:
        orchestrator = HybridOrchestrator(
            project_root=project_root,
            gpt_model="gpt-4",
            max_concurrent_agents=1  # Limit for testing
        )
        print("✓ HybridOrchestrator initialized")

        # Test simple goal
        print("\nExecuting simple goal...")
        result = await orchestrator.execute_goal(
            user_goal="List the Python files in the orchestrator directory",
            context={"test_mode": True},
            verbose=True
        )

        print(f"\n✓ Execution complete: {result['status']}")
        print(f"  Tasks succeeded: {result['execution']['tasks_succeeded']}")
        print(f"  Tasks failed: {result['execution']['tasks_failed']}")

        if result['status'] in ['completed', 'partial']:
            return True
        else:
            print(f"✗ Execution failed: {result.get('error')}")
            return False

    except Exception as e:
        print(f"✗ Hybrid orchestrator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("HYBRID ORCHESTRATOR SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*80)

    results = {}

    # Test 1: Imports
    results["imports"] = test_imports()

    # Test 2: Validation
    results["validation"] = test_plan_validation()

    # Test 3: API Keys
    api_keys = test_api_keys()
    results["api_keys"] = any(api_keys.values())

    # Test 4: ChatGPT Planning (optional)
    if api_keys.get("openai"):
        try:
            results["chatgpt"] = await test_chatgpt_planning(api_keys)
        except Exception as e:
            print(f"ChatGPT test exception: {e}")
            results["chatgpt"] = False
    else:
        results["chatgpt"] = None

    # Test 5: Full Hybrid Orchestrator (optional)
    if api_keys.get("openai") and api_keys.get("anthropic"):
        try:
            results["hybrid"] = await test_hybrid_orchestrator(api_keys)
        except Exception as e:
            print(f"Hybrid test exception: {e}")
            results["hybrid"] = False
    else:
        results["hybrid"] = None

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for test_name, result in results.items():
        if result is None:
            status = "⏸ SKIPPED"
        elif result:
            status = "✓ PASS"
        else:
            status = "✗ FAIL"
        print(f"{status}: {test_name}")

    # Calculate pass rate (only for non-skipped tests)
    non_skipped = [r for r in results.values() if r is not None]
    if non_skipped:
        passed = sum(1 for r in non_skipped if r)
        total = len(non_skipped)
        pass_rate = (passed / total) * 100
        print(f"\nPass Rate: {passed}/{total} ({pass_rate:.0f}%)")
    else:
        print("\nNo tests could be run (missing API keys)")

    print("\n" + "="*80)

    # Instructions for running live tests
    if not api_keys.get("openai") or not api_keys.get("anthropic"):
        print("\nTO RUN LIVE TESTS:")
        if not api_keys.get("openai"):
            print("  export OPENAI_API_KEY='your-openai-api-key'")
        if not api_keys.get("anthropic"):
            print("  export ANTHROPIC_API_KEY='your-anthropic-api-key'")
        print("  python orchestrator/test_hybrid_system.py")
        print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
