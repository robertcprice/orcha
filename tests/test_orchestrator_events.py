#!/usr/bin/env python3
"""
Test orchestrator reasoning events are actually being published
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
import os

# IMPORTANT: Load .env from project root FIRST
project_root = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(dotenv_path=project_root / ".env")

# IMPORTANT: Remove project root from sys.path to avoid importing local redis stub
# We need the real redis package for async pub/sub support
if str(project_root) in sys.path:
    sys.path.remove(str(project_root))

# But we need to keep it available for other imports, so add it back after redis import
import redis.asyncio as aioredis
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

async def test_orchestrator_events():
    """Test that orchestrator publishes reasoning events"""

    print("="*80)
    print("TESTING ORCHESTRATOR REASONING EVENTS")
    print("="*80)
    print()

    # Connect to Redis
    print("Step 1: Connecting to Redis...")
    redis_client = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)
    await redis_client.ping()
    print("✅ Connected to Redis")
    print()

    # Start orchestrator with a simple task (optional - skip if dependencies missing)
    orchestrator_task = None
    try:
        print("Step 2: Starting orchestrator with test task...")
        from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4
        from dotenv import load_dotenv

        load_dotenv()  # Load OpenAI API key

        orchestrator = HybridOrchestratorV4(
            project_root=Path.cwd(),
            enable_multi_ai_research=False  # Disable for faster test
        )

        # Run orchestrator in background
        task_id = f"test_{int(datetime.now().timestamp())}"

        async def run_orchestrator():
            try:
                await orchestrator.execute_goal_iterative(
                    user_goal="Create a simple hello world Python script",
                    task_id=task_id,
                    max_dialogue_turns=2,
                    verbose=False
                )
            except Exception as e:
                print(f"Orchestrator error (expected): {e}")

        orchestrator_task = asyncio.create_task(run_orchestrator())

        # Give orchestrator a moment to start
        await asyncio.sleep(2)
    except ImportError as e:
        print(f"⚠️  Skipping orchestrator start (dependency missing): {e}")
        print("    Test will only verify Redis subscription works correctly")
        print()

    # Subscribe and monitor events
    print("Step 3: Subscribing to algomind.agent.events channel and monitoring...")
    print()

    events_found = {
        "orchestrator_reasoning": 0,
        "orchestrator_decision": 0,
        "orchestrator_plan_created": 0,
        "orchestrator_execution_start": 0,
        "tool_call": 0
    }

    timeout = 30
    start_time = asyncio.get_event_loop().time()

    pubsub = redis_client.pubsub()
    await pubsub.subscribe("algomind.agent.events")

    print(f"📡 Subscribed to algomind.agent.events channel")
    print(f"⏱️  Monitoring for {timeout} seconds...")
    print()

    try:
        # Use asyncio.wait_for to handle timeout properly
        # pubsub.listen() is an async generator that needs timeout wrapping
        async def listen_with_timeout():
            async for message in pubsub.listen():
                # Check timeout
                if (asyncio.get_event_loop().time() - start_time) >= timeout:
                    break

                # Skip subscription confirmation messages
                if message['type'] != 'message':
                    continue

                try:
                    event = json.loads(message['data'])
                    event_type = event.get('type', 'unknown')

                    # Track event types
                    if event_type in events_found:
                        events_found[event_type] += 1

                        # Print first occurrence of each type
                        if events_found[event_type] == 1:
                            print(f"✅ FOUND: {event_type}")
                            if event_type == "orchestrator_reasoning":
                                print(f"   Reasoning: {event.get('reasoning', '')[:100]}...")
                                print(f"   Decision: {event.get('decision', '')[:100]}...")
                            elif event_type == "orchestrator_decision":
                                print(f"   Agent Summoned: {event.get('agent_summoned', 'N/A')}")
                                print(f"   Reason: {event.get('summon_reason', '')[:100]}...")
                            elif event_type == "orchestrator_plan_created":
                                print(f"   Plan ID: {event.get('plan_id', 'N/A')}")
                                print(f"   Tasks: {event.get('num_tasks', 0)}")
                            elif event_type == "tool_call":
                                print(f"   Tool: {event.get('tool_name', 'N/A')}")
                                print(f"   File: {event.get('file_path', 'N/A')}")
                            print()
                except json.JSONDecodeError:
                    pass

        # Run listener with timeout
        try:
            await asyncio.wait_for(listen_with_timeout(), timeout=timeout)
        except asyncio.TimeoutError:
            print(f"⏱️  {timeout} second monitoring period complete")

    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
        pass

    # Cancel orchestrator task if it was started
    if orchestrator_task:
        orchestrator_task.cancel()
        try:
            await orchestrator_task
        except asyncio.CancelledError:
            pass

    # Clean up Redis connection
    try:
        await pubsub.unsubscribe("algomind.agent.events")
        await pubsub.aclose()
        await redis_client.aclose()
    except Exception as e:
        print(f"⚠️  Error closing Redis connection: {e}")

    print()
    print("="*80)
    print("EVENT SUMMARY")
    print("="*80)
    for event_type, count in events_found.items():
        status = "✅" if count > 0 else "❌"
        print(f"{status} {event_type}: {count} events")
    print()

    # Determine success
    success = (
        events_found["orchestrator_reasoning"] > 0 and
        events_found["orchestrator_decision"] > 0
    )

    if success:
        print("="*80)
        print("✅ SUCCESS! Orchestrator reasoning events are working!")
        print("="*80)
    else:
        print("="*80)
        print("❌ FAILED! Missing key orchestrator events")
        print("="*80)

    return success

if __name__ == '__main__':
    success = asyncio.run(test_orchestrator_events())
    sys.exit(0 if success else 1)
