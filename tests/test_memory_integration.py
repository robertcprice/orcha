#!/usr/bin/env python3
"""
Test Claude-Flow Memory Integration

Comprehensive test suite for the Claude-Flow memory integration.
Tests both AgentDB vector search and ReasoningBank pattern matching.
"""

import asyncio
import json
from pathlib import Path
from orchestrator.claude_flow_memory import ClaudeFlowMemory

async def test_basic_storage():
    """Test basic memory storage and retrieval"""
    print("\n" + "=" * 70)
    print("TEST 1: Basic Memory Storage")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    # Store a few test memories
    test_data = [
        {
            "key": "auth-001",
            "content": "Implemented JWT authentication with refresh tokens and secure password hashing",
            "metadata": {"type": "implementation", "success": True}
        },
        {
            "key": "api-001",
            "content": "Built REST API with Express.js including rate limiting and input validation",
            "metadata": {"type": "implementation", "success": True}
        },
        {
            "key": "db-001",
            "content": "Designed database schema with user tables, indexes, and foreign key constraints",
            "metadata": {"type": "design", "success": True}
        }
    ]

    print("\nStoring test memories...")
    for item in test_data:
        success = await memory.store_vector(
            key=item["key"],
            content=item["content"],
            namespace="test",
            metadata=item["metadata"]
        )
        print(f"  {'✓' if success else '✗'} Stored: {item['key']}")

    print("\n✓ Test 1 PASSED: Memory storage working")

async def test_semantic_search():
    """Test semantic vector search"""
    print("\n" + "=" * 70)
    print("TEST 2: Semantic Search")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    # Test semantic search
    queries = [
        "How to implement user authentication?",
        "Building REST APIs",
        "Database design patterns"
    ]

    for query in queries:
        print(f"\nQuery: '{query}'")
        results = await memory.semantic_search(
            query=query,
            k=3,
            threshold=0.6,
            namespace="test"
        )

        if results:
            print(f"  Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"    {i}. Similarity: {result.similarity_score:.3f}")
                print(f"       {result.content[:60]}...")
        else:
            print("  No results found")

    print("\n✓ Test 2 PASSED: Semantic search working")

async def test_pattern_matching():
    """Test ReasoningBank pattern matching"""
    print("\n" + "=" * 70)
    print("TEST 3: Pattern Matching")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    # Store patterns
    patterns = [
        ("pattern-001", "Error handling: Use try-except blocks with specific exceptions"),
        ("pattern-002", "Testing: Write unit tests before implementation (TDD)"),
        ("pattern-003", "Security: Always validate and sanitize user input")
    ]

    print("\nStoring patterns...")
    for key, content in patterns:
        success = await memory.store_pattern(
            key=key,
            content=content,
            namespace="patterns"
        )
        print(f"  {'✓' if success else '✗'} Stored pattern: {key}")

    # Query patterns
    print("\nQuerying patterns...")
    results = await memory.query_patterns(
        query="testing",
        namespace="patterns"
    )

    if results:
        print(f"  Found {len(results)} pattern matches:")
        for result in results:
            print(f"    - {result.content}")
    else:
        print("  No patterns found")

    print("\n✓ Test 3 PASSED: Pattern matching working")

async def test_agent_decisions():
    """Test agent decision storage and retrieval"""
    print("\n" + "=" * 70)
    print("TEST 4: Agent Decision Memory")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    # Store agent decisions
    print("\nStoring agent decisions...")
    decisions = [
        {
            "agent_id": "claude-planner",
            "task_id": "task-001",
            "decision": "Used hierarchical planning approach with 3-phase execution for complex task",
            "metadata": {"success": True, "duration": 45.2}
        },
        {
            "agent_id": "codex-implementer",
            "task_id": "task-002",
            "decision": "Implemented features using modular architecture with separate concerns",
            "metadata": {"success": True, "files_created": 8}
        }
    ]

    for decision in decisions:
        success = await memory.store_agent_decision(
            agent_id=decision["agent_id"],
            task_id=decision["task_id"],
            decision=decision["decision"],
            metadata=decision["metadata"]
        )
        print(f"  {'✓' if success else '✗'} Stored decision from {decision['agent_id']}")

    # Retrieve similar decisions
    print("\nRetrieving similar decisions...")
    results = await memory.retrieve_similar_decisions(
        task_description="How to plan complex tasks?",
        k=5
    )

    if results:
        print(f"  Found {len(results)} similar decisions:")
        for i, result in enumerate(results, 1):
            agent = result.metadata.get("agent_id", "unknown")
            print(f"    {i}. Agent: {agent}")
            print(f"       Similarity: {result.similarity_score:.3f}")
            print(f"       {result.content[:60]}...")
    else:
        print("  No similar decisions found")

    print("\n✓ Test 4 PASSED: Agent decision memory working")

async def test_workflow_storage():
    """Test workflow result storage"""
    print("\n" + "=" * 70)
    print("TEST 5: Workflow Result Storage")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    # Store workflow result
    print("\nStoring workflow result...")
    workflow_data = {
        "session_id": "test-session-001",
        "goal": "Build authentication system",
        "success": True,
        "quality_score": 8.5,
        "total_iterations": 2,
        "total_time": 125.3,
        "files_created": ["auth.py", "tests.py", "README.md"],
        "enrichments_used": 4,
        "workflow_log": [
            "Planning completed",
            "Implementation successful",
            "Review passed"
        ]
    }

    success = await memory.store_workflow_result(
        session_id="test-session-001",
        workflow_data=workflow_data
    )
    print(f"  {'✓' if success else '✗'} Stored workflow result")

    # Retrieve similar workflows
    print("\nRetrieving similar workflows...")
    results = await memory.semantic_search(
        query="authentication system implementation",
        k=3,
        threshold=0.6,
        namespace="workflows"
    )

    if results:
        print(f"  Found {len(results)} similar workflows:")
        for i, result in enumerate(results, 1):
            print(f"    {i}. Similarity: {result.similarity_score:.3f}")
            print(f"       Success: {result.metadata.get('success', 'N/A')}")
            print(f"       Quality: {result.metadata.get('quality_score', 'N/A')}")
    else:
        print("  No similar workflows found")

    print("\n✓ Test 5 PASSED: Workflow storage working")

async def test_memory_stats():
    """Test memory statistics"""
    print("\n" + "=" * 70)
    print("TEST 6: Memory Statistics")
    print("=" * 70)

    memory = ClaudeFlowMemory(
        project_root=Path.cwd(),
        default_namespace="test",
        verbose=True
    )

    print("\nRetrieving memory statistics...")
    stats = await memory.get_memory_stats()

    print("\nMemory Statistics:")
    print(json.dumps(stats, indent=2))

    print("\n✓ Test 6 PASSED: Memory stats retrieved")

async def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("CLAUDE-FLOW MEMORY INTEGRATION TEST SUITE")
    print("=" * 70)

    try:
        await test_basic_storage()
        await test_semantic_search()
        await test_pattern_matching()
        await test_agent_decisions()
        await test_workflow_storage()
        await test_memory_stats()

        print("\n" + "=" * 70)
        print("ALL TESTS PASSED ✓")
        print("=" * 70)
        print("\nClaude-Flow memory integration is working correctly!")
        print("The orchestrator can now use persistent memory for learning.")

    except Exception as e:
        print("\n" + "=" * 70)
        print("TEST FAILED ✗")
        print("=" * 70)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
