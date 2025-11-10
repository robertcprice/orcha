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
from typing import Dict

# Add project root to path
project_root = Path(__file__).parent.parent.parent
# Add src/ directory to Python path for imports
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

# Load environment variables from .env
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)

from orchestrator.v4 import HybridOrchestratorV4
from orchestrator.redis_publisher import publish_event

# Redis for state storage
try:
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.from_url(redis_url, decode_responses=True)
except ImportError:
    print("WARNING: redis package not installed. Cannot update task status.")
    redis_client = None
except Exception as e:
    print(f"WARNING: Could not connect to Redis: {e}")
    redis_client = None


async def update_task_status(task_id: str, updates: dict):
    """Update task status in Redis"""

    if not redis_client:
        return

    try:
        task_key = f"algomind.hybrid.task.{task_id}"
        updates["updated_at"] = datetime.now().isoformat()
        # Set each field individually for Redis compatibility
        for field, value in updates.items():
            redis_client.hset(task_key, field, value)

        # Also log to terminal feed
        if "status" in updates:
            log_to_terminal(task_id, f"Status: {updates['status']}")

    except Exception as e:
        print(f"Error updating task status in Redis: {e}")


async def save_tree_structure(task_id: str, goal: str, result_dict: dict, project_name: str = "Smart Market Solutions"):
    """
    ✅ PHASE 3: Save complete agent tree structure to task file
    Gathers all agent data from Redis and builds TaskTreeSnapshot format
    """
    if not redis_client:
        print("⚠️ Redis not available, skipping tree structure save")
        return

    try:
        # Gather all agent data from Redis
        agent_keys = redis_client.keys("algomind.agent.*.current")
        nodes = {}
        edges = []

        for key in agent_keys:
            agent_data = redis_client.hgetall(key)
            if not agent_data:
                continue

            agent_id = agent_data.get("agent_id", "")
            agent_role = agent_data.get("role", "")
            parent_id = agent_data.get("parent_agent_id", "")

            # Build node structure
            node = {
                "id": agent_id,
                "name": agent_data.get("agent_label", agent_role),
                "type": agent_role.lower(),
                "status": agent_data.get("status", "idle"),
                "parentId": parent_id if parent_id and parent_id != "root" else None,
                "x": float(agent_data.get("x", 50)),
                "y": float(agent_data.get("y", 20)),
                "children": [],
                "depth": int(agent_data.get("depth", 0)),
                "layer": agent_data.get("layer", "agent"),
                "metadata": {
                    "thoughts": agent_data.get("thoughts", ""),
                    "code": agent_data.get("code", ""),
                    "output": agent_data.get("output", ""),
                    "content": agent_data.get("content", ""),
                }
            }

            nodes[agent_id] = node

            # Build edge if has parent
            if parent_id and parent_id != "root":
                edges.append({"from": parent_id, "to": agent_id})

        # Build children arrays
        for edge in edges:
            parent_id = edge["from"]
            child_id = edge["to"]
            if parent_id in nodes:
                if "children" not in nodes[parent_id]:
                    nodes[parent_id]["children"] = []
                nodes[parent_id]["children"].append(child_id)

        # Create tree structure
        tree_structure = {
            "nodes": nodes,
            "edges": edges,
            "layout": {
                "width": 1200,
                "height": 800,
            },
            "capturedAt": datetime.now().isoformat(),
            "title": goal,
        }

        # Save to task file
        tasks_dir = project_root / "projects" / project_name / "tasks" / "completed"
        tasks_dir.mkdir(parents=True, exist_ok=True)

        task_file = tasks_dir / f"{task_id}.json"

        # Read existing task data if present
        if task_file.exists():
            with open(task_file, 'r') as f:
                task_data = json.load(f)
        else:
            task_data = {
                "task_id": task_id,
                "title": goal,
                "status": "completed",
                "created_at": datetime.now().isoformat(),
            }

        # Add tree structure and result
        task_data["tree_structure"] = tree_structure
        task_data["result"] = result_dict
        task_data["completed_at"] = datetime.now().isoformat()

        # Write to file
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)

        print(f"✅ Tree structure saved to: {task_file}")

    except Exception as e:
        print(f"⚠️ Error saving tree structure: {e}")


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
        # Set each field individually for Redis compatibility
        for field, value in activity_data.items():
            redis_client.hset(activity_key, field, value)
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

        # Set each field individually for Redis compatibility
        for field, value in agent_data.items():
            redis_client.hset(agent_key, field, value)
        redis_client.expire(agent_key, 3600)  # 1 hour TTL
    except Exception as e:
        print(f"Error updating agent status: {e}")


async def update_stage_progress(task_id: str, stage_info: dict):
    """Update current stage progress in Redis"""

    if not redis_client:
        return

    try:
        task_key = f"algomind.hybrid.task.{task_id}"
        stage_data = {
            "current_stage": json.dumps(stage_info),
            "updated_at": datetime.now().isoformat()
        }
        # Set each field individually for Redis compatibility
        for field, value in stage_data.items():
            redis_client.hset(task_key, field, value)

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
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output with detailed logging")

    args = parser.parse_args()

    # Enable verbose mode from environment or argument
    verbose = args.verbose or os.getenv("VERBOSE_MODE", "").lower() == "true"
    if verbose:
        print(f"🔊 VERBOSE MODE ENABLED")
        print(f"📋 Task ID: {args.task_id}")
        print(f"🎯 Goal: {args.goal}")
        print(f"🔄 Max turns: {args.max_turns}")

    task_id = args.task_id
    goal = args.goal
    max_turns = args.max_turns
    orchestrator_node_id = f"orchestrator:{task_id}"
    agent_role_labels: Dict[str, str] = {
        "PP": "Product Planner",
        "IM": "Implementer",
        "AR": "Architect Reviewer",
        "RD": "Research & Documenter",
        "DOC": "Documentation Specialist",
        "CODE": "Coding Specialist",
        "QA": "QA Specialist",
        "RES": "Research Specialist",
        "ORCHESTRATOR": "Hybrid Orchestrator",
        # Multi-AI Planning agents
        "CLAUDE": "Claude (Creative Analysis)",
        "CHATGPT": "ChatGPT (Structured Plan)",
        "DEEPSEEK": "DeepSeek (Technical Analysis)",
        "GROK": "Grok (Critical Review)",
        "GEMINI": "Gemini (Final Assessment)",
    }

    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        print(f"ERROR: Invalid JSON in --context: {args.context}")
        context = {}

    # Add task_id to context for agent spawning
    context["task_id"] = task_id

    print(f"Starting HybridOrchestratorV4 (Iterative Dialogue) task: {task_id}")
    print(f"Goal: {goal}")
    print(f"Context: {context}")
    print(f"Max dialogue turns: {max_turns}")

    # Mark orchestrator as running
    update_orchestrator_activity("running", task_id, f"Executing goal: {goal[:80]}")

    # Update status: analyzing
    await update_task_status(task_id, {"status": "analyzing", "mode": "iterative_v4"})
    await publish_event({
        "type": "manager_started",
        "task_id": task_id,
        "session_id": task_id,
        "agent_id": orchestrator_node_id,
        "agent": "ORCHESTRATOR",
        "agent_label": agent_role_labels["ORCHESTRATOR"],
        "parent_agent_id": "root",
        "status": "running",
        "message": goal,
        "source_app": "hybrid_orchestrator_v4",
        "data": {
            "agent": "ORCHESTRATOR",
            "agent_id": orchestrator_node_id,
            "agent_label": agent_role_labels["ORCHESTRATOR"],
            "parent_agent_id": "root",
            "status": "running",
            "goal": goal,
        }
    })

    try:
        # Read MAX_ITERATIONS from env (controls planning loop iterations)
        max_iterations = int(os.getenv("MAX_ITERATIONS", "1"))

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
            meta = metadata or {}
            agent_label = agent_role_labels.get(agent_role, agent_role)
            agent_node_id = f"{agent_role}:{task_id}"

            if log_type == "status":
                # Update agent status in Redis
                status = message  # For status type, message is the status
                task_desc = meta.get("task", "") if meta else ""
                update_agent_status(agent_role, status, task_desc, task_id, meta)
            else:
                # Log agent activity
                log_agent_activity(agent_role, log_type, message, task_id, meta)

            status_lookup = {
                "spawn": ("agent_spawned", "spawning"),
                "output": ("agent_output", "active"),
                "complete": ("agent_completed", "completed"),
                "error": ("agent_failed", "failed"),
            }

            event_type: str
            status_value: str

            if log_type == "status":
                normalized_status = (message or "").lower()
                status_event_map = {
                    "running": ("agent_started", "active"),
                    "active": ("agent_started", "active"),
                    "completed": ("agent_completed", "completed"),
                    "failed": ("agent_failed", "failed"),
                    "idle": ("agent_status", "idle"),
                    "waiting": ("agent_status", "waiting"),
                }
                event_type, status_value = status_event_map.get(
                    normalized_status,
                    ("agent_status", normalized_status or "unknown")
                )
            else:
                event_type, status_value = status_lookup.get(log_type, ("agent_event", "active"))

            # Build enriched event payload for visualization
            event_payload = {
                "type": event_type,
                "task_id": task_id,
                "session_id": task_id,
                "agent_id": agent_node_id,
                "agent": agent_role,
                "agent_label": agent_label,
                "parent_agent_id": orchestrator_node_id,
                "status": status_value,
                "message": message,
                "meta": meta,
                "source_app": "hybrid_orchestrator_v4",
                "data": {
                    "agent": agent_role,
                    "agent_id": agent_node_id,
                    "agent_label": agent_label,
                    "parent_agent_id": orchestrator_node_id,
                    "status": status_value,
                    "message": message,
                    **meta
                }
            }

            await publish_event(event_payload)

        # Execute goal with iterative dialogue
        print(f"\n{'='*80}")
        print("Starting iterative execution...")
        print(f"{'='*80}\n")

        log_to_terminal(task_id, "Initializing hybrid orchestrator V4 (modular)...", "info")
        await update_task_status(task_id, {"status": "planning"})

        # ✅ FIX: Initialize orchestrator WITH callbacks (not after)
        orchestrator = HybridOrchestratorV4(
            project_root=project_root,
            gpt_model="gpt-4o",  # Use gpt-4o for JSON format support
            verbose=verbose,
            agent_activity_callback=on_agent_activity,  # Pass callback during init
            progress_callback=on_progress,  # Pass callback during init
            max_dialogue_turns=max_turns,
            max_design_iterations=max_iterations  # Use env var for planning iterations
        )

        # Execute with new modular architecture
        result = await orchestrator.run(
            user_goal=goal,
            context=context,
            enable_multi_ai_planning=True  # Enable Stage 0 multi-AI planning
        )

        # Extract results from IterativeExecutionResult object
        status = result.status
        stages = result.stages
        dialogue_turns = result.total_dialogue_turns
        total_time = result.total_time
        summary = result.final_summary
        artifacts = result.artifacts

        # Store comprehensive results in Redis
        # Convert IterativeExecutionResult to dict for JSON serialization
        result_dict = {
            "goal": result.goal,
            "status": result.status,
            "total_dialogue_turns": result.total_dialogue_turns,
            "total_time": result.total_time,
            "final_summary": result.final_summary,
            "artifacts": result.artifacts,
            "stages": [
                {
                    "stage_id": s.stage_id,
                    "stage_type": s.stage_type,
                    "status": s.status,
                    "metadata": s.metadata
                }
                for s in result.stages
            ]
        }

        updates = {
            "status": status,
            "dialogue_turns": dialogue_turns,
            "total_time": f"{total_time:.1f}s",
            "stages_completed": len(stages),
            "artifacts": json.dumps(artifacts),
            "summary": summary,
            "full_result": json.dumps(result_dict),
        }

        await update_task_status(task_id, updates)
        await publish_event({
            "type": "manager_complete",
            "task_id": task_id,
            "session_id": task_id,
            "agent_id": orchestrator_node_id,
            "agent": "ORCHESTRATOR",
            "agent_label": agent_role_labels["ORCHESTRATOR"],
            "parent_agent_id": "root",
            "status": "completed",
            "message": summary or "Task completed",
            "source_app": "hybrid_orchestrator_v4",
            "data": {
                "agent": "ORCHESTRATOR",
                "agent_id": orchestrator_node_id,
                "agent_label": agent_role_labels["ORCHESTRATOR"],
                "parent_agent_id": "root",
                "status": "completed",
                "summary": summary,
                "dialogue_turns": dialogue_turns,
                "total_time": total_time,
            }
        })

        print(f"\n{'='*80}")
        print(f"✅ Task {task_id} completed successfully")
        print(f"{'='*80}")
        print(f"Status: {status}")
        print(f"Dialogue turns: {dialogue_turns}")
        print(f"Total time: {total_time:.1f}s")
        print(f"Artifacts: {len(artifacts)} file(s)")
        print(f"\nSummary:\n{summary}")
        print(f"{'='*80}\n")

        # ✅ PHASE 3: Save tree structure to task file
        await save_tree_structure(task_id, goal, result_dict)

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
        await publish_event({
            "type": "manager_failed",
            "task_id": task_id,
            "session_id": task_id,
            "agent_id": orchestrator_node_id,
            "agent": "ORCHESTRATOR",
            "agent_label": agent_role_labels["ORCHESTRATOR"],
            "parent_agent_id": "root",
            "status": "failed",
            "message": error_msg,
            "source_app": "hybrid_orchestrator_v4",
            "data": {
                "agent": "ORCHESTRATOR",
                "agent_id": orchestrator_node_id,
                "agent_label": agent_role_labels["ORCHESTRATOR"],
                "parent_agent_id": "root",
                "status": "failed",
                "error": error_msg,
            }
        })

        # Mark orchestrator as idle
        update_orchestrator_activity("idle", task_id, f"Task failed: {error_msg[:80]}")

        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
