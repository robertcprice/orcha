#!/usr/bin/env python3
"""
run_hybrid_task.py

Standalone script to execute a HybridOrchestrator task from web app.

Usage:
    python run_hybrid_task.py --task-id TASK_ID --goal "Your goal here" --context '{"key": "value"}'
"""

import asyncio
import argparse
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from orchestrator.hybrid_orchestrator_v3 import HybridOrchestrator

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

	except Exception as e:

		print(f"Error updating task status in Redis: {e}")


async def main():

	parser = argparse.ArgumentParser(description="Run HybridOrchestrator task")
	parser.add_argument("--task-id", required=True, help="Unique task ID")
	parser.add_argument("--goal", required=True, help="User goal to achieve")
	parser.add_argument("--context", default="{}", help="JSON context (optional)")

	args = parser.parse_args()

	task_id = args.task_id
	goal = args.goal

	try:

		context = json.loads(args.context)
	except json.JSONDecodeError:

		print(f"ERROR: Invalid JSON in --context: {args.context}")
		context = {}

	print(f"Starting HybridOrchestrator task: {task_id}")
	print(f"Goal: {goal}")
	print(f"Context: {context}")

	# Update status: planning
	await update_task_status(task_id, {"status": "planning"})

	try:

		# Initialize orchestrator
		orchestrator = HybridOrchestrator(verbose=True)

		# Execute goal (async)
		result = await orchestrator.execute_goal(goal, context=context, verbose=True)

		# Extract key information
		status = result.get("status", "unknown")
		plan = result.get("plan")
		execution_result = result.get("execution")
		summary = result.get("summary", "")

		# Store results in Redis
		updates = {
			"status": status,
			"plan": json.dumps(plan.__dict__) if plan else "null",
			"execution_result": json.dumps({
				"status": execution_result.status if execution_result else "unknown",
				"completed_tasks": execution_result.completed_tasks if execution_result else 0,
				"failed_tasks": execution_result.failed_tasks if execution_result else 0,
			}),
			"summary": summary,
		}

		await update_task_status(task_id, updates)

		print(f"\n✅ Task {task_id} completed successfully")
		print(f"Status: {status}")
		print(f"Summary: {summary[:200]}..." if len(summary) > 200 else summary)

		sys.exit(0)

	except Exception as e:

		error_msg = str(e)
		print(f"❌ ERROR executing task {task_id}: {error_msg}")

		# Update status: failed
		await update_task_status(task_id, {
			"status": "failed",
			"error": error_msg,
		})

		sys.exit(1)


if __name__ == "__main__":

	asyncio.run(main())
