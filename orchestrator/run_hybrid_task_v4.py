#!/usr/bin/env python3
"""
run_hybrid_task_v4.py

Standalone script to execute a HybridOrchestratorV4 (iterative dialogue) task from web app.

Usage:
    python run_hybrid_task_v4.py --task-id TASK_ID --goal "Your goal here" --context '{"key": "value"}'

Architecture:
    - Claude analyzes goal first and requests information
    - ChatGPT provides requested information
    - Iterative dialogue loop at each execution stage
    - Real-time status updates to Redis
"""

import asyncio
import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from .env
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)

from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4

# Redis for state storage
try:
    import redis
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=0,
        decode_responses=True
    )
except ImportError:
    print("WARNING: redis package not installed. Cannot update task status.")
    redis_client = None


async def update_task_status(task_id: str, updates: dict):
    """Update task status in Redis"""

    if not redis_client:
        return

    try:
        task_key = f"algomind.hybrid.task.{task_id}"
        updates["updated_at"] = datetime.now().isoformat()
        redis_client.hset(task_key, mapping=updates)

        # Also log to terminal feed
        if "status" in updates:
            log_to_terminal(task_id, f"Status: {updates['status']}")

    except Exception as e:
        print(f"Error updating task status in Redis: {e}")


def update_orchestrator_activity(status: str, task_id: str, current_task: str = ""):
    """Update orchestrator activity in Redis for agent visualization"""

    if not redis_client:
        return

    try:
        activity_key = "algomind.agent.activity.ORCHESTRATOR"
        activity_data = {
            "role": "ORCHESTRATOR",
            "status": status,  # "running" or "idle"
            "currentTask": current_task,
            "sessionId": task_id,
            "updated_at": datetime.now().isoformat()
        }
        redis_client.hset(activity_key, mapping=activity_data)
        redis_client.expire(activity_key, 3600)  # 1 hour TTL
    except Exception as e:
        print(f"Error updating orchestrator activity: {e}")


def log_to_terminal(task_id: str, message: str, level: str = "info"):
    """Log message to terminal feed in Redis"""

    if not redis_client:
        return

    try:
        terminal_key = f"algomind.terminal.{task_id}"
        log_entry = json.dumps({
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        })
        redis_client.rpush(terminal_key, log_entry)
        redis_client.ltrim(terminal_key, -1000, -1)  # Keep last 1000 messages
        redis_client.expire(terminal_key, 3600)  # 1 hour TTL
    except Exception as e:
        print(f"Error logging to terminal: {e}")


def log_agent_activity(agent_role: str, log_type: str, message: str, task_id: str, metadata: dict = None):
    """Log agent activity for the agents page"""

    if not redis_client:
        return

    try:
        # Add to agent logs
        log_key = f"algomind.agent.{agent_role}.logs"
        log_entry = json.dumps({
            "timestamp": datetime.now().isoformat(),
            "type": log_type,  # "spawn", "output", "complete", "error", "status"
            "message": message,
            "metadata": {
                "taskId": task_id,
                "sessionId": task_id,
                **(metadata or {})
            }
        })
        redis_client.rpush(log_key, log_entry)
        redis_client.ltrim(log_key, -500, -1)  # Keep last 500 entries
        redis_client.expire(log_key, 7200)  # 2 hours TTL
    except Exception as e:
        print(f"Error logging agent activity: {e}")


def update_agent_status(agent_role: str, status: str, task: str, task_id: str, metadata: dict = None):
    """Update agent status for real-time display on agents page"""

    if not redis_client:
        return

    try:
        agent_key = f"algomind.agent.{agent_role}.current"
        agent_data = {
            "status": status,  # "running", "idle", "completed", "failed"
            "task": task,
            "session_id": task_id,
            "last_activity": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        if status == "running" and "started_at" not in (metadata or {}):
            agent_data["started_at"] = datetime.now().isoformat()

        if status in ["completed", "failed"] and "completed_at" not in (metadata or {}):
            agent_data["completed_at"] = datetime.now().isoformat()

        if metadata:
            agent_data.update(metadata)

        redis_client.hset(agent_key, mapping=agent_data)
        redis_client.expire(agent_key, 3600)  # 1 hour TTL
    except Exception as e:
        print(f"Error updating agent status: {e}")


async def update_stage_progress(task_id: str, stage_info: dict):
    """Update current stage progress in Redis"""

    if not redis_client:
        return

    try:
        task_key = f"algomind.hybrid.task.{task_id}"
        redis_client.hset(task_key, mapping={
            "current_stage": json.dumps(stage_info),
            "updated_at": datetime.now().isoformat()
        })

        # Log to terminal
        log_to_terminal(
            task_id,
            f"Stage: {stage_info.get('stage_type', 'unknown')} - {stage_info.get('status', 'unknown')}"
        )

    except Exception as e:
        print(f"Error updating stage progress in Redis: {e}")


async def main():

    parser = argparse.ArgumentParser(description="Run HybridOrchestratorV4 (iterative) task")
    parser.add_argument("--task-id", required=True, help="Unique task ID")
    parser.add_argument("--goal", required=True, help="User goal to achieve")
    parser.add_argument("--context", default="{}", help="JSON context (optional)")
    parser.add_argument("--max-turns", type=int, default=20, help="Max dialogue turns")

    args = parser.parse_args()

    task_id = args.task_id
    goal = args.goal
    max_turns = args.max_turns

    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON in --context: {args.context}")
        context = {}

    print(f"Starting HybridOrchestratorV4 (Iterative Dialogue) task: {task_id}")
    print(f"Goal: {goal}")
    print(f"Context: {context}")
    print(f"Max dialogue turns: {max_turns}")

    # Mark orchestrator as running
    update_orchestrator_activity("running", task_id, f"Executing goal: {goal[:80]}")

    # Update status: analyzing
    await update_task_status(task_id, {"status": "analyzing", "mode": "iterative_v4"})

    try:
        # Initialize V4 orchestrator (uses Claude CLI)
        orchestrator = HybridOrchestratorV4(
            project_root=project_root,
            gpt_model="gpt-4o"  # Use gpt-4o for JSON format support
        )

        # Track stage progress with callback
        async def on_stage_update(stage_id: str, stage_type: str, status: str, metadata: dict):
            """Called when a stage starts/completes"""
            await update_stage_progress(task_id, {
                "stage_id": stage_id,
                "stage_type": stage_type,
                "status": status,
                "metadata": metadata
            })

        # Progress callback to log updates to Redis
        async def on_progress(message: str, level: str = "info"):
            log_to_terminal(task_id, message, level)
            # Update Redis with current activity
            await update_task_status(task_id, {
                "last_activity": message,
                "activity_timestamp": datetime.now().isoformat()
            })

        # Agent activity callback to log to agents page
        async def on_agent_activity(agent_role: str, log_type: str, message: str, metadata: dict = None):
            """
            Called when agent activity occurs
            log_type: "spawn", "output", "complete", "error", "status"
            """
            if log_type == "status":
                # Update agent status in Redis
                status = message  # For status type, message is the status
                task_desc = metadata.get("task", "") if metadata else ""
                update_agent_status(agent_role, status, task_desc, task_id, metadata)
            else:
                # Log agent activity
                log_agent_activity(agent_role, log_type, message, task_id, metadata)

        # Execute goal with iterative dialogue
        print(f"\n{'='*80}")
        print("Starting iterative execution...")
        print(f"{'='*80}\n")

        log_to_terminal(task_id, "Initializing hybrid orchestrator V4...", "info")
        await update_task_status(task_id, {"status": "planning"})

        result = await orchestrator.execute_goal_iterative(
            user_goal=goal,
            context=context,
            max_dialogue_turns=max_turns,
            verbose=True,
            progress_callback=on_progress,
            agent_activity_callback=on_agent_activity
        )

        # Extract results
        status = result.get("status", "unknown")
        stages = result.get("stages", [])
        dialogue_turns = result.get("total_dialogue_turns", 0)
        total_time = result.get("total_time", 0)
        summary = result.get("final_summary", "")
        artifacts = result.get("artifacts", [])

        # Store comprehensive results in Redis
        updates = {
            "status": status,
            "dialogue_turns": dialogue_turns,
            "total_time": f"{total_time:.1f}s",
            "stages_completed": len(stages),
            "artifacts": json.dumps(artifacts),
            "summary": summary,
            "full_result": json.dumps(result),
        }

        await update_task_status(task_id, updates)

        print(f"\n{'='*80}")
        print(f"✅ Task {task_id} completed successfully")
        print(f"{'='*80}")
        print(f"Status: {status}")
        print(f"Dialogue turns: {dialogue_turns}")
        print(f"Total time: {total_time:.1f}s")
        print(f"Artifacts: {len(artifacts)} file(s)")
        print(f"\nSummary:\n{summary}")
        print(f"{'='*80}\n")

        # Mark orchestrator as idle
        update_orchestrator_activity("idle", task_id, "Task completed")

        sys.exit(0)

    except Exception as e:
        error_msg = str(e)
        print(f"\n{'='*80}")
        print(f"❌ ERROR executing task {task_id}")
        print(f"{'='*80}")
        print(f"Error: {error_msg}")
        print(f"{'='*80}\n")

        # Update status: failed
        await update_task_status(task_id, {
            "status": "failed",
            "error": error_msg,
        })

        # Mark orchestrator as idle
        update_orchestrator_activity("idle", task_id, f"Task failed: {error_msg[:80]}")

        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
