#!/usr/bin/env python3
"""
Claude-First Orchestrator

Receives a high-level task, analyzes it with Claude, creates an execution plan,
and delegates work to specialized agents. Agents can spawn sub-agents as needed.
"""

import argparse
import sys
import os
import asyncio
from datetime import datetime
from pathlib import Path
import redis
import json
import subprocess

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


async def analyze_and_plan(task_description: str) -> dict:
    """
    Use Claude to analyze the task and create an execution plan
    """

    planning_prompt = f"""You are an expert task orchestrator. Analyze this task and create a detailed execution plan.

Task: {task_description}

Your job is to:
1. Break down the task into clear, actionable steps
2. Identify which specialized agents should handle each step
3. Define dependencies between steps
4. Specify what each agent needs to accomplish

Available Agents:
- PP (Product Planner): Requirements analysis, feature planning, roadmaps
- AR (Architect/Reviewer): System design, code review, architecture decisions
- IM (Implementer): Code implementation, bug fixes, feature development
- RD (Researcher/Documenter): Research, documentation, knowledge gathering
- CODE (Code Specialist): Advanced coding, algorithms, optimization
- QA (QA Specialist): Testing, debugging, quality assurance
- DATA (Data Engineer): Data pipelines, ETL, data processing
- TRAIN (ML Trainer): Model training, hyperparameter tuning, experiments
- DOC (Documentation): Technical writing, user guides, API docs
- DEVOPS (DevOps): Deployment, infrastructure, CI/CD

Respond with a JSON object in this exact format:
{{
  "analysis": "Brief analysis of the task requirements",
  "steps": [
    {{
      "id": 1,
      "agent": "AGENT_ID",
      "task": "Specific task for this agent",
      "dependencies": [],
      "can_delegate": true
    }}
  ]
}}

Important: Only output the JSON, nothing else."""

    # Create a temporary file for the prompt
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(planning_prompt)
        prompt_file = f.name

    try:
        # Run Claude CLI to get the plan
        result = subprocess.run(
            ['claude', '--print', '--dangerously-skip-permissions'],
            stdin=open(prompt_file, 'r'),
            capture_output=True,
            text=True,
            timeout=120
        )

        os.unlink(prompt_file)

        if result.returncode != 0:
            raise Exception(f"Claude planning failed: {result.stderr}")

        # Parse the JSON response
        output = result.stdout.strip()

        # Try to extract JSON from the output
        import re
        json_match = re.search(r'\{[\s\S]*\}', output)
        if json_match:
            plan = json.loads(json_match.group(0))
            return plan
        else:
            raise Exception("Could not extract JSON plan from Claude response")

    except Exception as e:
        print(f"Planning error: {e}")
        # Return a simple default plan
        return {
            "analysis": f"Task: {task_description}",
            "steps": [{
                "id": 1,
                "agent": "IM",
                "task": task_description,
                "dependencies": [],
                "can_delegate": True
            }]
        }


async def execute_step(step: dict, task_id: str, r: redis.Redis):
    """
    Execute a single step by delegating to an agent
    """

    agent_id = step['agent']
    agent_task = step['task']
    step_id = step['id']

    print(f"[Orchestrator] Delegating step {step_id} to {agent_id}: {agent_task[:80]}...")

    # Log delegation
    delegation_log = {
        "timestamp": datetime.now().isoformat(),
        "task_id": task_id,
        "step_id": step_id,
        "agent": agent_id,
        "action": f"Delegated: {agent_task[:100]}",
        "status": "delegating"
    }
    r.rpush(f"algomind.orchestrator.{task_id}.logs", json.dumps(delegation_log))

    # Spawn agent using Direct Claude system
    agent_task_id = f"dc_{int(datetime.now().timestamp() * 1000)}_{os.urandom(4).hex()}"

    subprocess.Popen([
        'python3',
        str(PROJECT_ROOT / 'orchestrator' / 'run_direct_claude_task.py'),
        '--task-id', agent_task_id,
        '--task', agent_task,
        '--agent', agent_id
    ], cwd=PROJECT_ROOT)

    # Wait for agent to complete (with timeout)
    max_wait = 600  # 10 minutes per step
    elapsed = 0
    poll_interval = 2

    while elapsed < max_wait:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

        # Check agent status
        agent_data = r.hgetall(f"algomind.direct.claude.{agent_task_id}")
        if not agent_data:
            continue

        status = agent_data.get(b'status', b'').decode('utf-8')

        if status == 'completed':
            result = agent_data.get(b'result', b'').decode('utf-8')
            print(f"[Orchestrator] Step {step_id} completed by {agent_id}")

            # Log completion
            complete_log = {
                "timestamp": datetime.now().isoformat(),
                "task_id": task_id,
                "step_id": step_id,
                "agent": agent_id,
                "action": f"Completed: {agent_task[:100]}",
                "status": "completed"
            }
            r.rpush(f"algomind.orchestrator.{task_id}.logs", json.dumps(complete_log))

            return {"success": True, "result": result}

        elif status == 'failed':
            error = agent_data.get(b'error', b'Unknown error').decode('utf-8')
            print(f"[Orchestrator] Step {step_id} failed: {error}")

            # Log failure
            error_log = {
                "timestamp": datetime.now().isoformat(),
                "task_id": task_id,
                "step_id": step_id,
                "agent": agent_id,
                "action": f"Failed: {error}",
                "status": "failed"
            }
            r.rpush(f"algomind.orchestrator.{task_id}.logs", json.dumps(error_log))

            return {"success": False, "error": error}

    # Timeout
    print(f"[Orchestrator] Step {step_id} timed out")
    return {"success": False, "error": "Execution timeout"}


async def orchestrate(task_id: str, task_description: str):
    """
    Main orchestration logic
    """

    # Connect to Redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    r = redis.from_url(redis_url, decode_responses=False)
    task_key = f"algomind.orchestrator.{task_id}"

    try:
        print(f"[Orchestrator] Starting orchestration for task {task_id}")

        # Phase 1: Planning
        r.hset(task_key, "status", "planning")
        r.hset(task_key, "updated_at", datetime.now().isoformat())

        plan = await analyze_and_plan(task_description)

        r.hset(task_key, "plan", json.dumps(plan))
        r.hset(task_key, "status", "delegating")
        r.hset(task_key, "updated_at", datetime.now().isoformat())

        print(f"[Orchestrator] Plan created with {len(plan['steps'])} steps")

        # Phase 2: Execution
        r.hset(task_key, "status", "executing")
        r.hset(task_key, "updated_at", datetime.now().isoformat())

        results = []
        for step in plan['steps']:
            step_result = await execute_step(step, task_id, r)
            results.append({
                "step_id": step['id'],
                "agent": step['agent'],
                "task": step['task'],
                **step_result
            })

            if not step_result['success']:
                # Stop on first failure
                print(f"[Orchestrator] Stopping due to step failure")
                break

        # Phase 3: Completion
        all_success = all(r['success'] for r in results)

        final_status = "completed" if all_success else "failed"
        r.hset(task_key, "status", final_status)
        r.hset(task_key, "result", json.dumps(results, indent=2))
        r.hset(task_key, "updated_at", datetime.now().isoformat())

        print(f"[Orchestrator] Task {task_id} {final_status}")

    except Exception as e:
        error_msg = f"Orchestration error: {str(e)}"
        print(f"[Orchestrator] {error_msg}")

        r.hset(task_key, "status", "failed")
        r.hset(task_key, "error", error_msg)
        r.hset(task_key, "updated_at", datetime.now().isoformat())

    finally:
        r.close()


def main():
    parser = argparse.ArgumentParser(description="Claude Orchestrator")
    parser.add_argument("--task-id", required=True, help="Task ID")
    parser.add_argument("--task", required=True, help="Task description")
    args = parser.parse_args()

    try:
        asyncio.run(orchestrate(args.task_id, args.task))
        print(f"[Orchestrator] Orchestration complete for {args.task_id}")
    except Exception as e:
        print(f"[Orchestrator] Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
