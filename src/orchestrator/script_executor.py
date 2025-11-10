#!/usr/bin/env python3
"""
Script Execution Engine

Executes bash scripts and commands directly without context overhead.
Provides parallel execution, output capture, and error handling.

This replaces subagent spawning with lightweight script execution,
reducing context usage and improving performance.
"""

import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import sys
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


class ExecutionMode(Enum):
    """Script execution modes"""
    SEQUENTIAL = "sequential"  # Run scripts one after another
    PARALLEL = "parallel"  # Run scripts concurrently
    PIPELINE = "pipeline"  # Pipe output between scripts


@dataclass
class ScriptTask:
    """A script or command to execute"""
    task_id: str
    command: str
    cwd: Optional[Path] = None
    env: Optional[Dict[str, str]] = None
    timeout: float = 300.0  # 5 minutes default
    shell: bool = True
    capture_output: bool = True


@dataclass
class ScriptResult:
    """Result from script execution"""
    task_id: str
    success: bool
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    execution_time: float = 0.0
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class ScriptExecutor:
    """
    Executes bash scripts and commands with advanced features.

    Features:
    - Parallel or sequential execution
    - Output capture and streaming
    - Timeout handling
    - Environment variable management
    - Working directory control
    - Error handling and retries
    """

    def __init__(
        self,
        project_root: Path = PROJECT_ROOT,
        default_timeout: float = 300.0,
        max_parallel: int = 5,
        verbose: bool = True
    ):
        """
        Initialize Script Executor.

        Args:
            project_root: Default working directory
            default_timeout: Default timeout in seconds
            max_parallel: Maximum parallel executions
            verbose: Enable verbose logging
        """
        self.project_root = project_root
        self.default_timeout = default_timeout
        self.max_parallel = max_parallel
        self.verbose = verbose

        # Execution tracking
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.results: Dict[str, ScriptResult] = {}

        self._log("Script Executor initialized")

    def _log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            print(f"[ScriptExecutor] {message}")

    async def execute(
        self,
        task: ScriptTask,
        retry_count: int = 0
    ) -> ScriptResult:
        """
        Execute a single script task.

        Args:
            task: ScriptTask to execute
            retry_count: Number of retries on failure

        Returns:
            ScriptResult with execution outcome
        """
        self._log(f"Executing task {task.task_id}: {task.command[:50]}...")

        await publish_event({
            "type": "script_started",
            "task_id": task.task_id,
            "command": task.command[:100]
        })

        start_time = datetime.now()

        try:
            # Prepare environment
            env = os.environ.copy()
            if task.env:
                env.update(task.env)

            # Prepare working directory
            cwd = task.cwd or self.project_root

            # Execute command
            if task.shell:
                # Execute as shell command
                process = await asyncio.create_subprocess_shell(
                    task.command,
                    stdout=asyncio.subprocess.PIPE if task.capture_output else None,
                    stderr=asyncio.subprocess.PIPE if task.capture_output else None,
                    cwd=str(cwd),
                    env=env
                )
            else:
                # Execute as direct command
                cmd_parts = task.command.split()
                process = await asyncio.create_subprocess_exec(
                    *cmd_parts,
                    stdout=asyncio.subprocess.PIPE if task.capture_output else None,
                    stderr=asyncio.subprocess.PIPE if task.capture_output else None,
                    cwd=str(cwd),
                    env=env
                )

            # Wait for completion with timeout
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=task.timeout
                )

                stdout = stdout_bytes.decode('utf-8', errors='replace') if stdout_bytes else ""
                stderr = stderr_bytes.decode('utf-8', errors='replace') if stderr_bytes else ""

            except asyncio.TimeoutError:
                process.kill()
                await process.wait()

                execution_time = (datetime.now() - start_time).total_seconds()

                result = ScriptResult(
                    task_id=task.task_id,
                    success=False,
                    exit_code=-1,
                    stderr=f"Timeout after {task.timeout}s",
                    execution_time=execution_time,
                    error="Execution timeout"
                )

                self._log(f"Task {task.task_id} timed out after {task.timeout}s")

                await publish_event({
                    "type": "script_timeout",
                    "task_id": task.task_id,
                    "timeout": task.timeout
                })

                return result

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()

            # Create result
            success = process.returncode == 0
            result = ScriptResult(
                task_id=task.task_id,
                success=success,
                exit_code=process.returncode or 0,
                stdout=stdout,
                stderr=stderr,
                execution_time=execution_time
            )

            if success:
                self._log(f"Task {task.task_id} completed in {execution_time:.2f}s")
            else:
                self._log(f"Task {task.task_id} failed with exit code {process.returncode}")

                # Retry if configured
                if retry_count > 0:
                    self._log(f"Retrying task {task.task_id} ({retry_count} retries left)")
                    await asyncio.sleep(1)  # Brief delay before retry
                    return await self.execute(task, retry_count - 1)

            await publish_event({
                "type": "script_completed",
                "task_id": task.task_id,
                "success": success,
                "exit_code": result.exit_code,
                "execution_time": execution_time
            })

            self.results[task.task_id] = result
            return result

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()

            result = ScriptResult(
                task_id=task.task_id,
                success=False,
                exit_code=-1,
                execution_time=execution_time,
                error=str(e)
            )

            self._log(f"Task {task.task_id} failed with error: {e}")

            await publish_event({
                "type": "script_error",
                "task_id": task.task_id,
                "error": str(e)
            })

            return result

    async def execute_many(
        self,
        tasks: List[ScriptTask],
        mode: ExecutionMode = ExecutionMode.SEQUENTIAL,
        stop_on_error: bool = False
    ) -> List[ScriptResult]:
        """
        Execute multiple script tasks.

        Args:
            tasks: List of ScriptTask to execute
            mode: Execution mode (sequential or parallel)
            stop_on_error: Stop execution if a task fails

        Returns:
            List of ScriptResult
        """
        self._log(f"Executing {len(tasks)} tasks in {mode.value} mode")

        results = []

        if mode == ExecutionMode.SEQUENTIAL:
            # Execute one after another
            for task in tasks:
                result = await self.execute(task)
                results.append(result)

                if stop_on_error and not result.success:
                    self._log(f"Stopping execution due to failure in {task.task_id}")
                    break

        elif mode == ExecutionMode.PARALLEL:
            # Execute all concurrently
            # Limit concurrency using semaphore
            semaphore = asyncio.Semaphore(self.max_parallel)

            async def execute_with_semaphore(task: ScriptTask) -> ScriptResult:
                async with semaphore:
                    return await self.execute(task)

            # Create tasks
            execution_tasks = [execute_with_semaphore(task) for task in tasks]

            # Wait for all to complete
            results = await asyncio.gather(*execution_tasks, return_exceptions=True)

            # Convert exceptions to error results
            results = [
                r if isinstance(r, ScriptResult) else ScriptResult(
                    task_id=tasks[i].task_id,
                    success=False,
                    exit_code=-1,
                    error=str(r)
                )
                for i, r in enumerate(results)
            ]

        return results

    async def execute_pipeline(
        self,
        tasks: List[ScriptTask]
    ) -> ScriptResult:
        """
        Execute tasks as a pipeline, piping output between them.

        Args:
            tasks: List of ScriptTask (output of one feeds into next)

        Returns:
            Final ScriptResult
        """
        self._log(f"Executing {len(tasks)} tasks as pipeline")

        if not tasks:
            return ScriptResult(
                task_id="empty",
                success=False,
                exit_code=-1,
                error="No tasks to execute"
            )

        # For simplicity, concatenate commands with pipes
        pipeline_command = " | ".join([task.command for task in tasks])

        pipeline_task = ScriptTask(
            task_id=f"pipeline-{tasks[0].task_id}",
            command=pipeline_command,
            cwd=tasks[0].cwd,
            env=tasks[0].env,
            timeout=sum(t.timeout for t in tasks),
            shell=True,
            capture_output=True
        )

        return await self.execute(pipeline_task)

    def create_agent_spawn_script(
        self,
        agent_type: str,
        agent_id: str,
        prompt: str,
        project_root: Optional[Path] = None
    ) -> ScriptTask:
        """
        Create a script task to spawn an agent via bash.

        Args:
            agent_type: Type of agent ('claude', 'codex', etc.)
            agent_id: Unique agent identifier
            prompt: Prompt for the agent
            project_root: Working directory

        Returns:
            ScriptTask configured to spawn the agent
        """
        cwd = project_root or self.project_root

        if agent_type == "claude":
            # Spawn claude CLI
            command = f"""
echo '{prompt}' | claude --print --dangerously-skip-permissions
"""

        elif agent_type == "codex":
            # Spawn codex via MCP
            # This would typically involve a Python script
            command = f"""
python -c "
import asyncio
from orchestrator.codex_mcp_agent import CodexMCPAgent, CodexTask

async def main():
    task = CodexTask(
        task_id='{agent_id}',
        title='Agent Task',
        description='{prompt}',
        requirements=[]
    )
    agent = CodexMCPAgent('{agent_id}', task)
    result = await agent.execute()
    print(result.output if result.success else result.error)

asyncio.run(main())
"
"""

        else:
            command = f"echo 'Unknown agent type: {agent_type}'"

        return ScriptTask(
            task_id=f"{agent_type}-{agent_id}",
            command=command.strip(),
            cwd=cwd,
            timeout=600.0,  # 10 minutes
            shell=True,
            capture_output=True
        )

    def get_result(self, task_id: str) -> Optional[ScriptResult]:
        """Get result for a specific task."""
        return self.results.get(task_id)

    def get_all_results(self) -> Dict[str, ScriptResult]:
        """Get all execution results."""
        return self.results.copy()


# Example usage
async def main():
    """Example usage of Script Executor."""
    executor = ScriptExecutor(verbose=True)

    # Example 1: Simple command
    task1 = ScriptTask(
        task_id="list-files",
        command="ls -la",
        timeout=10.0
    )

    result1 = await executor.execute(task1)
    print(f"\nResult 1 - Success: {result1.success}")
    print(f"Output: {result1.stdout[:200]}")

    # Example 2: Multiple tasks in parallel
    tasks = [
        ScriptTask(task_id="task-1", command="echo 'Task 1' && sleep 1"),
        ScriptTask(task_id="task-2", command="echo 'Task 2' && sleep 1"),
        ScriptTask(task_id="task-3", command="echo 'Task 3' && sleep 1"),
    ]

    print("\n\nParallel execution:")
    results = await executor.execute_many(tasks, mode=ExecutionMode.PARALLEL)
    for result in results:
        print(f"  {result.task_id}: {result.success} ({result.execution_time:.2f}s)")

    # Example 3: Pipeline
    print("\n\nPipeline execution:")
    pipeline_tasks = [
        ScriptTask(task_id="p1", command="echo 'hello world'"),
        ScriptTask(task_id="p2", command="tr '[:lower:]' '[:upper:]'"),
        ScriptTask(task_id="p3", command="sed 's/WORLD/UNIVERSE/'"),
    ]

    pipeline_result = await executor.execute_pipeline(pipeline_tasks)
    print(f"Pipeline output: {pipeline_result.stdout.strip()}")

    # Example 4: Agent spawning
    print("\n\nAgent spawn script:")
    agent_task = executor.create_agent_spawn_script(
        agent_type="claude",
        agent_id="test-001",
        prompt="Hello, can you help me with a task?"
    )
    print(f"Command: {agent_task.command[:100]}...")


if __name__ == "__main__":
    asyncio.run(main())
