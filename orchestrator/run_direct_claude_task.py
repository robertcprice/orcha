#!/usr/bin/env python3
"""
Direct Claude Task Executor (CLI Method)

Executes tasks directly using Claude Code CLI without ChatGPT planning phase.
Uses the same method as the legacy orchestrator - spawns claude CLI process.
This script is spawned by the web app for fast, single-agent execution.
"""

import argparse
import sys
import os
import asyncio
from datetime import datetime
from pathlib import Path
import redis
import traceback

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def shell_quote(text: str) -> str:
    """Quote text for safe shell usage"""
    # Replace single quotes with '\'' and wrap in single quotes
    return "'" + text.replace("'", "'\\''") + "'"


def build_prompt(agent_role: str, task_description: str) -> str:
    """Build prompt for Claude Code CLI"""

    prompt_parts = [
        f"# You are {agent_role} Agent",
        "",
        "# Your Task",
        task_description,
        "",
        "## Instructions",
        "- Use the Read tool to examine files",
        "- Use the Edit or Write tools to make changes",
        "- Use the Bash tool to run commands",
        "- All file paths are relative to the project root",
        "- Make focused, minimal changes",
        "- When done, output 'TASK COMPLETE' on a line by itself",
        "",
        "Begin your work now.",
    ]

    return "\n".join(prompt_parts)


async def execute_direct_task(task_id: str, task_description: str, agent_role: str):
    """Execute task directly with Claude Code CLI"""

    # Connect to Redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    r = redis.from_url(redis_url, decode_responses=True)
    task_key = f"algomind.direct.claude.{task_id}"
    agent_key = f"algomind.agent.{agent_role}.current"
    agent_logs_key = f"algomind.agent.{agent_role}.logs"

    try:
        start_time = datetime.now()

        # Update task status
        r.hset(task_key, mapping={
            "status": "executing",
            "updated_at": start_time.isoformat()
        })

        # Update agent current status
        r.hset(agent_key, mapping={
            "status": "running",
            "task": task_description[:200],
            "session_id": task_id,
            "started_at": start_time.isoformat(),
            "last_activity": start_time.isoformat()
        })
        r.expire(agent_key, 3600)  # Expire after 1 hour

        # Log agent spawn
        import json
        spawn_log = json.dumps({
            "timestamp": start_time.isoformat(),
            "role": agent_role,
            "type": "spawn",
            "message": f"Started task: {task_description[:100]}{'...' if len(task_description) > 100 else ''}",
            "metadata": {
                "sessionId": task_id
            }
        })
        r.rpush(agent_logs_key, spawn_log)
        r.ltrim(agent_logs_key, -100, -1)  # Keep last 100 logs

        print(f"[DirectClaude] Executing task with {agent_role} via Claude Code CLI...")
        print(f"[DirectClaude] Task: {task_description[:100]}...")

        # Build prompt
        prompt = build_prompt(agent_role, task_description)

        # Spawn Claude Code CLI process (same method as legacy orchestrator)
        # Use script -q /dev/null to create a PTY and disable output buffering (macOS compatible)
        cmd = f"echo {shell_quote(prompt)} | script -q /dev/null claude --print --dangerously-skip-permissions"

        print(f"[DirectClaude] Spawning: claude CLI process...")

        # Create environment without ANTHROPIC_API_KEY to use Claude Code session
        env = {**os.environ}
        env.pop('ANTHROPIC_API_KEY', None)  # Remove API key if present

        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=PROJECT_ROOT,
            env=env  # Use Claude Code session, not API key
        )

        # Stream output and store progressively in Redis
        stdout_lines = []
        stderr_lines = []
        output_key = f"{task_key}.output"

        async def read_stdout():
            """Read stdout line by line and update Redis"""
            if process.stdout:
                async for line in process.stdout:
                    line_text = line.decode('utf-8', errors='replace')
                    stdout_lines.append(line_text)

                    # Print to console for debugging
                    print(f"[DirectClaude] Got output: {line_text.strip()[:80]}...", flush=True)

                    # Update Redis with progressive output
                    current_output = ''.join(stdout_lines)
                    r.hset(output_key, "stdout", current_output)
                    r.hset(output_key, "last_update", datetime.now().isoformat())
                    r.expire(output_key, 3600)  # 1 hour TTL

        async def read_stderr():
            """Read stderr line by line"""
            if process.stderr:
                async for line in process.stderr:
                    line_text = line.decode('utf-8', errors='replace')
                    stderr_lines.append(line_text)

        # Start reading both streams
        try:
            await asyncio.wait_for(
                asyncio.gather(read_stdout(), read_stderr(), process.wait()),
                timeout=900  # 15 minutes
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise Exception(f"Task timeout after 900s (15 minutes)")

        stdout_text = ''.join(stdout_lines)
        stderr_text = ''.join(stderr_lines)

        success = process.returncode == 0
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"[DirectClaude] Claude CLI finished with exit code {process.returncode}")

        # Combine output
        output = f"--- Agent Output ---\n{stdout_text}"
        if stderr_text.strip():
            output += f"\n\n--- Errors ---\n{stderr_text}"

        # Store result
        r.hset(task_key, mapping={
            "status": "completed" if success else "failed",
            "result": output,
            "error": "" if success else f"Exit code: {process.returncode}",
            "updated_at": end_time.isoformat(),
            "duration": str(duration)
        })

        # Update agent status
        r.hset(agent_key, mapping={
            "status": "completed" if success else "failed",
            "task": task_description[:200],
            "session_id": task_id,
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat(),
            "last_activity": end_time.isoformat(),
            "duration": str(duration)
        })
        r.expire(agent_key, 3600)  # Keep for 1 hour after completion (matches output TTL)

        # Log completion/failure
        import json
        complete_log = json.dumps({
            "timestamp": end_time.isoformat(),
            "role": agent_role,
            "type": "complete" if success else "error",
            "message": "Task completed successfully" if success else f"Task failed with exit code {process.returncode}",
            "metadata": {
                "sessionId": task_id,
                "duration": duration
            }
        })
        r.rpush(agent_logs_key, complete_log)
        r.ltrim(agent_logs_key, -100, -1)  # Keep last 100 logs

        print(f"[DirectClaude] Task {task_id} {'completed' if success else 'failed'}")

    except Exception as e:
        error_msg = f"Error executing task: {str(e)}\n{traceback.format_exc()}"
        print(f"[DirectClaude] {error_msg}", file=sys.stderr)

        error_time = datetime.now()

        r.hset(task_key, mapping={
            "status": "failed",
            "error": str(e),
            "updated_at": error_time.isoformat()
        })

        # Update agent status on error
        r.hset(agent_key, mapping={
            "status": "failed",
            "task": task_description[:200],
            "session_id": task_id,
            "last_activity": error_time.isoformat()
        })
        r.expire(agent_key, 3600)  # Keep for 1 hour (matches output TTL)

        # Log error
        import json
        error_log = json.dumps({
            "timestamp": error_time.isoformat(),
            "role": agent_role,
            "type": "error",
            "message": f"Task failed with exception: {str(e)}",
            "metadata": {
                "sessionId": task_id
            }
        })
        r.rpush(agent_logs_key, error_log)
        r.ltrim(agent_logs_key, -100, -1)

        raise

    finally:
        # Always close Redis connection
        r.close()


def main():
    parser = argparse.ArgumentParser(description="Execute task directly with Claude agent")
    parser.add_argument("--task-id", required=True, help="Task ID")
    parser.add_argument("--task", required=True, help="Task description")
    parser.add_argument("--agent", default="IM", help="Agent ID (default: IM)")
    args = parser.parse_args()

    try:
        # Run async task execution
        asyncio.run(execute_direct_task(args.task_id, args.task, args.agent))
        print(f"[DirectClaude] Task {args.task_id} execution complete")

    except Exception as e:
        print(f"[DirectClaude] Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
