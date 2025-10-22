"""
Claude Code Execution Orchestrator
Receives execution plans from ChatGPT and executes them using Claude Agent SDK.
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field

from orchestrator.chatgpt_planner import ExecutionPlan
from orchestrator.agent_sdk_manager import AgentSDKManager, AgentTask
from orchestrator.agent_registry import AgentFactory


@dataclass
class TaskResult:
    """Result of executing a single task"""
    task_id: str
    agent: str
    status: str  # "success", "failed", "skipped"
    output: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ExecutionResult:
    """Result of executing an entire plan"""
    plan_id: str
    status: str  # "completed", "partial", "failed"
    task_results: List[TaskResult]
    summary: str
    total_time: float
    tasks_succeeded: int
    tasks_failed: int
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ClaudeExecutor:
    """
    Executes ChatGPT plans using Claude Code agents.
    Coordinates task execution, handles dependencies, and reports results.
    """

    def __init__(
        self,
        project_root: Path,
        anthropic_api_key: Optional[str] = None,
        max_concurrent: int = 4
    ):
        self.project_root = project_root
        self.api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")

        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not provided and not in environment")

        # Initialize agent infrastructure
        self.agent_manager = AgentSDKManager(project_root, self.api_key, max_concurrent)
        self.agent_factory = AgentFactory(project_root)

        # Execution state
        self.current_execution: Optional[ExecutionResult] = None

    async def execute_plan(
        self,
        plan: ExecutionPlan,
        on_task_complete: Optional[callable] = None
    ) -> ExecutionResult:
        """
        Execute a ChatGPT execution plan.

        Args:
            plan: ExecutionPlan from ChatGPT planner
            on_task_complete: Optional callback(task_result) called after each task

        Returns:
            ExecutionResult with all task results
        """

        start_time = datetime.now(timezone.utc)

        # Initialize execution result
        execution_result = ExecutionResult(
            plan_id=plan.plan_id,
            status="running",
            task_results=[],
            summary="",
            total_time=0.0,
            tasks_succeeded=0,
            tasks_failed=0
        )
        self.current_execution = execution_result

        # Build dependency graph
        dep_graph = self._build_dependency_graph(plan)

        # Topologically sort tasks
        task_order = self._topological_sort(plan.tasks, dep_graph)

        print(f"\n{'='*60}")
        print(f"EXECUTING PLAN: {plan.plan_id}")
        print(f"Goal: {plan.goal}")
        print(f"Tasks: {len(plan.tasks)} total")
        print(f"Execution order: {' → '.join(task_order)}")
        print(f"{'='*60}\n")

        # Execute tasks in order
        completed_tasks = set()

        for task_id in task_order:
            # Find task definition
            task_def = next((t for t in plan.tasks if t["task_id"] == task_id), None)
            if not task_def:
                print(f"⚠️  Task {task_id} not found in plan, skipping")
                continue

            # Check dependencies
            deps = plan.dependencies.get(task_id, [])
            if not all(dep in completed_tasks for dep in deps):
                print(f"⚠️  Task {task_id} dependencies not met, skipping")
                task_result = TaskResult(
                    task_id=task_id,
                    agent=task_def.get("agent", "unknown"),
                    status="skipped",
                    output="Dependencies not met",
                    error="Missing dependencies"
                )
                execution_result.task_results.append(task_result)
                continue

            # Execute task
            print(f"\n{'─'*60}")
            print(f"TASK: {task_id}")
            print(f"Agent: {task_def.get('agent')}")
            print(f"Description: {task_def.get('description')}")
            print(f"{'─'*60}\n")

            task_result = await self._execute_single_task(task_def)

            # Add to results
            execution_result.task_results.append(task_result)

            # Call callback if provided
            if on_task_complete:
                on_task_complete(task_result)

            # Update counters
            if task_result.status == "success":
                execution_result.tasks_succeeded += 1
                completed_tasks.add(task_id)
                print(f"✅ Task {task_id} SUCCEEDED")
            else:
                execution_result.tasks_failed += 1
                print(f"❌ Task {task_id} FAILED: {task_result.error}")

                # Decide whether to continue or stop
                if task_def.get("priority") == "critical":
                    print(f"🛑 Critical task failed, stopping execution")
                    break

        # Finalize execution result
        end_time = datetime.now(timezone.utc)
        execution_result.total_time = (end_time - start_time).total_seconds()

        # Determine overall status
        if execution_result.tasks_failed == 0:
            execution_result.status = "completed"
        elif execution_result.tasks_succeeded > 0:
            execution_result.status = "partial"
        else:
            execution_result.status = "failed"

        # Generate summary
        execution_result.summary = self._generate_summary(execution_result)

        print(f"\n{'='*60}")
        print(f"EXECUTION COMPLETE")
        print(f"Status: {execution_result.status}")
        print(f"Succeeded: {execution_result.tasks_succeeded}/{len(plan.tasks)}")
        print(f"Failed: {execution_result.tasks_failed}/{len(plan.tasks)}")
        print(f"Total time: {execution_result.total_time:.1f}s")
        print(f"{'='*60}\n")

        self.current_execution = None
        return execution_result

    async def _execute_single_task(self, task_def: Dict[str, Any]) -> TaskResult:
        """Execute a single task using appropriate agent"""

        task_id = task_def.get("task_id", "unknown")
        agent_role = task_def.get("agent", "CODE")

        start_time = datetime.now(timezone.utc)

        try:
            # Create agent configuration
            config = self.agent_factory.create_agent_config(agent_role)
            if not config:
                return TaskResult(
                    task_id=task_id,
                    agent=agent_role,
                    status="failed",
                    output="",
                    error=f"Agent {agent_role} not found in registry",
                    start_time=start_time.isoformat()
                )

            # Create AgentTask
            agent_task = AgentTask(
                task_id=task_id,
                goal=task_def.get("description", ""),
                acceptance_criteria=task_def.get("acceptance_criteria", []),
                constraints=task_def.get("constraints", {}),
                context_paths=task_def.get("context_paths", []),
                context_data=task_def.get("context_data", {}),
                priority={"high": 2, "medium": 1, "low": 0}.get(task_def.get("priority", "medium"), 1),
                timeout=task_def.get("timeout", 300)
            )

            # Execute task
            success, output, metadata = await self.agent_manager.execute_task(config, agent_task)

            end_time = datetime.now(timezone.utc)

            return TaskResult(
                task_id=task_id,
                agent=agent_role,
                status="success" if success else "failed",
                output=output,
                metadata=metadata,
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                error=None if success else metadata.get("error", "Task failed")
            )

        except Exception as e:
            end_time = datetime.now(timezone.utc)
            return TaskResult(
                task_id=task_id,
                agent=agent_role,
                status="failed",
                output="",
                metadata={},
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                error=str(e)
            )

    def _build_dependency_graph(self, plan: ExecutionPlan) -> Dict[str, List[str]]:
        """Build dependency graph from plan"""
        graph = {task["task_id"]: [] for task in plan.tasks}

        for task_id, deps in plan.dependencies.items():
            if task_id in graph:
                graph[task_id] = deps

        return graph

    def _topological_sort(
        self,
        tasks: List[Dict[str, Any]],
        dep_graph: Dict[str, List[str]]
    ) -> List[str]:
        """
        Topologically sort tasks based on dependencies.

        Returns:
            List of task IDs in execution order
        """

        # Count in-degrees
        in_degree = {task["task_id"]: 0 for task in tasks}
        for task_id, deps in dep_graph.items():
            for dep in deps:
                if dep in in_degree:
                    in_degree[dep] += 0  # Dep is a prerequisite
            in_degree[task_id] = len(deps)

        # Queue tasks with no dependencies
        queue = [task_id for task_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            # Process task
            task_id = queue.pop(0)
            result.append(task_id)

            # Find tasks that depend on this one
            for tid, deps in dep_graph.items():
                if task_id in deps:
                    in_degree[tid] -= 1
                    if in_degree[tid] == 0:
                        queue.append(tid)

        return result

    def _generate_summary(self, execution_result: ExecutionResult) -> str:
        """Generate a summary of execution results"""

        summary_parts = []

        summary_parts.append(f"Execution Summary for {execution_result.plan_id}")
        summary_parts.append(f"Status: {execution_result.status.upper()}")
        summary_parts.append(f"Tasks Completed: {execution_result.tasks_succeeded}/{len(execution_result.task_results)}")
        summary_parts.append(f"Tasks Failed: {execution_result.tasks_failed}/{len(execution_result.task_results)}")
        summary_parts.append(f"Total Time: {execution_result.total_time:.1f}s")
        summary_parts.append("")

        if execution_result.tasks_succeeded > 0:
            summary_parts.append("✅ Successful Tasks:")
            for result in execution_result.task_results:
                if result.status == "success":
                    summary_parts.append(f"  - {result.task_id} ({result.agent})")

        if execution_result.tasks_failed > 0:
            summary_parts.append("")
            summary_parts.append("❌ Failed Tasks:")
            for result in execution_result.task_results:
                if result.status == "failed":
                    summary_parts.append(f"  - {result.task_id} ({result.agent}): {result.error}")

        return "\n".join(summary_parts)

    def get_current_execution_status(self) -> Optional[Dict[str, Any]]:
        """Get status of current execution"""
        if not self.current_execution:
            return None

        return {
            "plan_id": self.current_execution.plan_id,
            "status": self.current_execution.status,
            "tasks_completed": len(self.current_execution.task_results),
            "tasks_succeeded": self.current_execution.tasks_succeeded,
            "tasks_failed": self.current_execution.tasks_failed
        }
