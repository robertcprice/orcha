#!/usr/bin/env python3
"""
Automated test to verify agent activity logging
Submits a task and checks if agents show up in Redis
"""

import requests
import redis
import time
import json
import sys

# Configuration
API_URL = "http://localhost:3000/api/hybrid-orchestrator/submit"
REDIS_URL = "redis://localhost:6379/0"
TEST_GOAL = "Create a simple hello world Python script that prints 'Hello from AlgoMind!'"

def check_redis_agent_logs(redis_client, agent_role):
    """Check if agent has logged activity"""
    log_key = f"algomind.agent.{agent_role}.logs"
    logs = redis_client.lrange(log_key, 0, -1)

    if logs:
        print(f"  ✓ Found {len(logs)} log entries for {agent_role}")
        # Show first log
        try:
            first_log = json.loads(logs[0])
            print(f"    First log: {first_log.get('type')} - {first_log.get('message', '')[:60]}...")
        except:
            pass
        return True
    else:
        print(f"  ✗ No logs found for {agent_role}")
        return False

def check_redis_agent_status(redis_client, agent_role):
    """Check if agent status is registered"""
    status_key = f"algomind.agent.{agent_role}.current"
    status = redis_client.hgetall(status_key)

    if status:
        print(f"  ✓ {agent_role} status: {status.get('status', 'unknown')}")
        if 'task' in status:
            print(f"    Task: {status['task'][:60]}...")
        return True
    else:
        print(f"  ✗ No status found for {agent_role}")
        return False

def main():
    print("=" * 80)
    print("Automated Agent Logging Test")
    print("=" * 80)
    print()

    # Connect to Redis
    print("Connecting to Redis...")
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print("✓ Connected to Redis")
    except Exception as e:
        print(f"✗ Failed to connect to Redis: {e}")
        return False

    print()

    # Submit task
    print("Submitting test task...")
    print(f"Goal: {TEST_GOAL}")
    print()

    try:
        response = requests.post(API_URL, json={
            "goal": TEST_GOAL,
            "context": {},
            "maxTurns": 5
        })

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                task_id = data.get("task_id")
                print(f"✓ Task submitted successfully")
                print(f"  Task ID: {task_id}")
            else:
                print(f"✗ Task submission failed: {data.get('error')}")
                return False
        else:
            print(f"✗ HTTP error: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Failed to submit task: {e}")
        return False

    print()
    print("Waiting for orchestrator to start (10 seconds)...")
    time.sleep(10)

    print()
    print("=" * 80)
    print("Checking Agent Activity in Redis")
    print("=" * 80)
    print()

    agents_to_check = ["PP", "IM", "RD"]
    results = {}

    for agent in agents_to_check:
        print(f"Checking {agent} (Product Planner/Implementer/Researcher)...")
        has_logs = check_redis_agent_logs(r, agent)
        has_status = check_redis_agent_status(r, agent)
        results[agent] = has_logs or has_status
        print()

    # Summary
    print("=" * 80)
    print("Test Results")
    print("=" * 80)
    print()

    all_passed = all(results.values())

    for agent, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {agent} agent activity logged")

    print()

    if all_passed:
        print("✅ All agents are properly logging activity!")
        print()
        print("Next steps:")
        print("1. Open http://localhost:3000/agents in your browser")
        print("2. You should see active agents with their tasks")
        print("3. Check the Agent Activity Logs section for detailed logs")
        return True
    else:
        print("⚠️  Some agents failed to log activity")
        print()
        print("Debugging:")
        print("1. Check if the task is still running:")
        print(f"   redis-cli hget algomind.hybrid.task.{task_id} status")
        print()
        print("2. Check orchestrator activity:")
        print("   redis-cli hgetall algomind.agent.activity.ORCHESTRATOR")
        print()
        print("3. Check all agent keys:")
        print("   redis-cli keys 'algomind.agent.*'")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
