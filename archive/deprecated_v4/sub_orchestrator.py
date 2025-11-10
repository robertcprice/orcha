#!/usr/bin/env python3
"""
Sub-Orchestrator - Manages execution of a single main task

A sub-orchestrator is spawned for each main task from task decomposition.
It creates specialized agents to handle subtasks, coordinates their work,
and reports results back to the parent orchestrator.
"""

import os
import json
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import subprocess

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from task_decomposer import MainTask, Subtask
from research_agent import ResearchAgent, ResearchReport
from feedback_validator import FeedbackValidator, ValidationFeedback
from manager_agents import create_manager_for_task, ManagerAgent


@dataclass
class SubtaskResult:
    """Result from executing a subtask"""

    subtask_id: str
    subtask_title: str
    status: str  # completed, failed, skipped
    output: str
    artifacts: List[str]  # Files created/modified
    agent_type: str
    execution_time_seconds: float
    error_message: Optional[str] = None


@dataclass
class MainTaskResult:
    """Complete result from a main task execution"""

    main_task_id: str
    main_task_title: str
    status: str  # completed, failed, partial
    subtask_results: List[SubtaskResult]
    research_reports: List[ResearchReport]
    validation_feedback: Optional[ValidationFeedback]
    total_execution_time: float
    artifacts_created: List[str]
    summary: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SubOrchestrator:
    """
    Manages execution of a single main task by:
    1. Conducting research if needed
    2. Spawning specialized agents for subtasks
    3. Coordinating agent execution
    4. Collecting results and validating work
    """

    def __init__(
        self,
        main_task: MainTask,
        original_task: Dict[str, Any],
        project_root: Path,
        parent_task_id: str,
        depth: int = 2,
        max_depth: int = 3,
        openai_api_key: Optional[str] = None
    ):

        self.main_task = main_task
        self.original_task = original_task
        self.project_root = project_root
        self.parent_task_id = parent_task_id
        self.depth = depth
        self.max_depth = max_depth

        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if OpenAI and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            self.client = None

        self.research_reports: List[ResearchReport] = []
        self.subtask_results: List[SubtaskResult] = []
        self.artifacts: List[str] = []

        self.start_time = datetime.now()

    async def execute(self, verbose: bool = True) -> MainTaskResult:
        """
        Execute the main task and all its subtasks.

        Returns:
            MainTaskResult with complete execution details
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"SUB-ORCHESTRATOR EXECUTING: {self.main_task.title}")
            print(f"{'='*80}")
            print(f"Task ID: {self.main_task.task_id}")
            print(f"Priority: {self.main_task.priority}")
            print(f"Subtasks: {len(self.main_task.subtasks)}")
            print(f"Depth: {self.depth}/{self.max_depth}")
            print()

        # Step 1: Conduct research if needed
        if self.main_task.requires_research and self.main_task.research_topics:
            if verbose:
                print(f"🔍 Research Phase - {len(self.main_task.research_topics)} topics")

            await self._conduct_research(verbose)

        # Step 2: Execute subtasks in dependency order
        if verbose:
            print(f"\n{'─'*80}")
            print(f"SUBTASK EXECUTION ({len(self.main_task.subtasks)} subtasks)")
            print(f"{'─'*80}\n")

        await self._execute_subtasks(verbose)

        # Step 3: Validate work (if we have results)
        validation_feedback = None
        if self.subtask_results and self.client:
            if verbose:
                print(f"\n{'─'*80}")
                print("VALIDATION PHASE")
                print(f"{'─'*80}\n")

            validation_feedback = await self._validate_work(verbose)

        # Step 4: Generate summary
        execution_time = (datetime.now() - self.start_time).total_seconds()

        completed_count = sum(1 for r in self.subtask_results if r.status == "completed")
        failed_count = sum(1 for r in self.subtask_results if r.status == "failed")

        if completed_count == len(self.subtask_results):
            status = "completed"
        elif completed_count > 0:
            status = "partial"
        else:
            status = "failed"

        summary = self._generate_summary(status, completed_count, failed_count)

        result = MainTaskResult(
            main_task_id=self.main_task.task_id,
            main_task_title=self.main_task.title,
            status=status,
            subtask_results=self.subtask_results,
            research_reports=self.research_reports,
            validation_feedback=validation_feedback,
            total_execution_time=execution_time,
            artifacts_created=self.artifacts,
            summary=summary
        )

        if verbose:
            self._print_result(result)

        return result

    async def _conduct_research(self, verbose: bool):
        """Conduct research on required topics"""

        if not self.api_key:
            if verbose:
                print("⚠️  OpenAI API key not available, skipping research")
            return

        try:
            research_agent = ResearchAgent(openai_api_key=self.api_key)

            report = await research_agent.research(
                topics=self.main_task.research_topics,
                context=f"Main Task: {self.main_task.title}\n{self.main_task.description}",
                depth="standard",
                verbose=verbose
            )

            self.research_reports.append(report)

        except Exception as e:
            if verbose:
                print(f"⚠️  Research failed: {e}")

    async def _execute_subtasks(self, verbose: bool):
        """
        Execute subtasks using manager agents.

        Manager agents group related subtasks and assign 1-2 Claude agents per function.
        """

        # Check if we should use manager agents (recommended for structured tasks)
        use_manager = self._should_use_manager_agent()

        if use_manager:
            await self._execute_with_manager(verbose)
        else:
            # Fallback to direct execution (legacy path)
            await self._execute_direct(verbose)

    def _should_use_manager_agent(self) -> bool:
        """
        Determine if this main task should use a manager agent.

        Use manager if:
        - Task is database, frontend, backend, infrastructure, testing, or documentation
        - Multiple subtasks exist (manager can group them)
        """

        if len(self.main_task.subtasks) <= 1:
            return False

        # Try to create manager - if one exists for this task type, use it
        manager = create_manager_for_task({
            'title': self.main_task.title,
            'description': self.main_task.description
        }, verbose=False)

        return manager is not None

    async def _execute_with_manager(self, verbose: bool):
        """Execute subtasks using appropriate manager agent"""

        if verbose:
            print(f"📋 Using Manager Agent for organized execution\n")

        # Create appropriate manager for this main task
        manager = create_manager_for_task({
            'title': self.main_task.title,
            'description': self.main_task.description
        }, verbose=verbose)

        if not manager:
            # Fallback if no manager found
            if verbose:
                print(f"⚠️  No manager available, falling back to direct execution\n")
            await self._execute_direct(verbose)
            return

        # Convert subtasks to dict format for manager
        subtask_dicts = []
        for subtask in self.main_task.subtasks:
            subtask_dicts.append({
                'subtask_id': subtask.subtask_id,
                'title': subtask.title,
                'description': subtask.description,
                'complexity': subtask.estimated_complexity,
                'required_agents': subtask.required_agents,
                'dependencies': subtask.dependencies
            })

        # Create spawn function that manager will use
        async def spawn_func(prompt: str) -> Dict:
            """Wrapper for spawning Claude agents"""
            start_time = datetime.now()

            try:
                output = await self._spawn_claude_agent(
                    agent_type="CODE",  # Manager decides specialization
                    prompt=prompt,
                    verbose=False  # Manager handles logging
                )

                execution_time = (datetime.now() - start_time).total_seconds()
                artifacts = self._extract_artifacts(output)

                return {
                    'status': 'completed',
                    'output': output,
                    'artifacts': artifacts,
                    'execution_time': execution_time
                }

            except Exception as e:
                execution_time = (datetime.now() - start_time).total_seconds()
                return {
                    'status': 'failed',
                    'output': '',
                    'artifacts': [],
                    'execution_time': execution_time,
                    'error': str(e)
                }

        # Manager orchestrates agent execution
        manager_results = await manager.manage_tasks(subtask_dicts, spawn_func)

        # Convert manager results to SubtaskResult objects
        for i, subtask in enumerate(self.main_task.subtasks):
            # Find corresponding result (manager may group differently)
            result_data = manager_results[min(i, len(manager_results) - 1)]

            subtask_result = SubtaskResult(
                subtask_id=subtask.subtask_id,
                subtask_title=subtask.title,
                status=result_data.get('status', 'completed'),
                output=result_data.get('output', ''),
                artifacts=result_data.get('artifacts', []),
                agent_type='managed',
                execution_time_seconds=result_data.get('execution_time', 0.0),
                error_message=result_data.get('error')
            )

            self.subtask_results.append(subtask_result)

            if subtask_result.status == 'completed':
                self.artifacts.extend(subtask_result.artifacts)

    async def _execute_direct(self, verbose: bool):
        """Execute subtasks directly in dependency order (legacy path)"""

        # Build dependency graph
        completed_subtasks = set()
        remaining_subtasks = {s.subtask_id: s for s in self.main_task.subtasks}

        while remaining_subtasks:
            # Find subtasks ready to execute (dependencies met)
            ready_subtasks = []

            for subtask_id, subtask in remaining_subtasks.items():
                deps_met = all(dep in completed_subtasks for dep in subtask.dependencies)
                if deps_met:
                    ready_subtasks.append(subtask)

            if not ready_subtasks:
                # Circular dependency or all remaining failed
                if verbose:
                    print(f"⚠️  {len(remaining_subtasks)} subtasks blocked by dependencies")

                # Mark remaining as skipped
                for subtask in remaining_subtasks.values():
                    self.subtask_results.append(SubtaskResult(
                        subtask_id=subtask.subtask_id,
                        subtask_title=subtask.title,
                        status="skipped",
                        output="Skipped due to unmet dependencies",
                        artifacts=[],
                        agent_type="none",
                        execution_time_seconds=0.0,
                        error_message="Dependencies not satisfied"
                    ))

                break

            # Execute ready subtasks
            for subtask in ready_subtasks:
                result = await self._execute_subtask(subtask, verbose)
                self.subtask_results.append(result)

                if result.status == "completed":
                    completed_subtasks.add(subtask.subtask_id)
                    self.artifacts.extend(result.artifacts)

                del remaining_subtasks[subtask.subtask_id]

    async def _execute_subtask(self, subtask: Subtask, verbose: bool) -> SubtaskResult:
        """Execute a single subtask using appropriate agent"""

        start_time = datetime.now()

        if verbose:
            print(f"🔧 Executing: {subtask.title}")
            print(f"   Subtask ID: {subtask.subtask_id}")
            print(f"   Complexity: {subtask.estimated_complexity}")
            print(f"   Agents: {', '.join(subtask.required_agents)}")

        try:
            # Create agent prompt
            agent_prompt = self._build_agent_prompt(subtask)

            # Spawn agent via Claude CLI
            result = await self._spawn_claude_agent(
                agent_type=subtask.required_agents[0] if subtask.required_agents else "IM",
                prompt=agent_prompt,
                verbose=verbose
            )

            execution_time = (datetime.now() - start_time).total_seconds()

            # Extract artifacts from result
            artifacts = self._extract_artifacts(result)

            if verbose:
                print(f"   ✅ Completed in {execution_time:.1f}s")
                if artifacts:
                    print(f"   📁 Artifacts: {len(artifacts)} file(s)")
                print()

            return SubtaskResult(
                subtask_id=subtask.subtask_id,
                subtask_title=subtask.title,
                status="completed",
                output=result,
                artifacts=artifacts,
                agent_type=subtask.required_agents[0] if subtask.required_agents else "IM",
                execution_time_seconds=execution_time
            )

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()

            if verbose:
                print(f"   ❌ Failed: {e}")
                print()

            return SubtaskResult(
                subtask_id=subtask.subtask_id,
                subtask_title=subtask.title,
                status="failed",
                output="",
                artifacts=[],
                agent_type=subtask.required_agents[0] if subtask.required_agents else "IM",
                execution_time_seconds=execution_time,
                error_message=str(e)
            )

    def _build_agent_prompt(self, subtask: Subtask) -> str:
        """Build prompt for agent executing subtask"""

        # Include research findings if available
        research_context = ""
        if self.research_reports:
            research_context = "\n\nRESEARCH FINDINGS:\n"
            for report in self.research_reports:
                research_context += f"\n{report.overall_summary}\n"
                for finding in report.findings:
                    research_context += f"\n- {finding.topic}: {finding.summary}\n"

        prompt = f"""You are a specialized agent executing a subtask.

MAIN TASK: {self.main_task.title}
{self.main_task.description}

YOUR SUBTASK: {subtask.title}
{subtask.description}

COMPLEXITY: {subtask.estimated_complexity}
REQUIRED SKILLS: {', '.join(subtask.required_agents)}{research_context}

ORIGINAL TASK CONTEXT:
{json.dumps(self.original_task.get('context', {}), indent=2)}

YOUR OBJECTIVE:
Complete this subtask thoroughly and document all work.
Create or modify files as needed.
Report all artifacts created.

Begin execution now.
"""

        return prompt

    async def _spawn_claude_agent(
        self,
        agent_type: str,
        prompt: str,
        verbose: bool
    ) -> str:
        """Spawn a Claude agent via CLI using stdin (recommended for long prompts)"""

        try:
            # Execute Claude CLI with prompt via stdin (most reliable for long prompts)
            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--dangerously-skip-permissions",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root
            )

            # Send prompt via stdin and get response
            stdout, stderr = await process.communicate(prompt.encode("utf-8"))

            if process.returncode != 0:
                raise RuntimeError(f"Claude agent failed: {stderr.decode()}")

            return stdout.decode()

        except Exception as e:
            raise RuntimeError(f"Failed to spawn Claude agent: {e}")

    def _extract_artifacts(self, agent_output: str) -> List[str]:
        """Extract file paths from agent output"""

        artifacts = []

        # Look for common patterns indicating file creation/modification
        patterns = [
            "Created file:",
            "Modified file:",
            "Saved to:",
            "Written to:",
        ]

        lines = agent_output.split('\n')
        for line in lines:
            for pattern in patterns:
                if pattern in line:
                    # Extract file path
                    parts = line.split(pattern, 1)
                    if len(parts) > 1:
                        file_path = parts[1].strip().split()[0]
                        artifacts.append(file_path)

        return artifacts

    async def _validate_work(self, verbose: bool) -> Optional[ValidationFeedback]:
        """Validate completed work using FeedbackValidator"""

        if not self.client:
            return None

        try:
            validator = FeedbackValidator(openai_api_key=self.api_key)

            # Build work summary
            work_completed = {
                "main_task": self.main_task.title,
                "description": self.main_task.description,
                "subtasks_completed": [
                    {
                        "title": r.subtask_title,
                        "status": r.status,
                        "output_summary": r.output[:500] if r.output else "No output"
                    }
                    for r in self.subtask_results
                ],
                "execution_time": (datetime.now() - self.start_time).total_seconds()
            }

            feedback = await validator.validate(
                original_task={
                    "title": self.main_task.title,
                    "description": self.main_task.description,
                },
                work_completed=work_completed,
                artifacts=self.artifacts,
                verbose=verbose
            )

            return feedback

        except Exception as e:
            if verbose:
                print(f"⚠️  Validation failed: {e}")
            return None

    def _generate_summary(self, status: str, completed: int, failed: int) -> str:
        """Generate execution summary"""

        total = len(self.main_task.subtasks)

        summary = f"Main task '{self.main_task.title}' {status}.\n"
        summary += f"Completed {completed}/{total} subtasks"

        if failed > 0:
            summary += f" ({failed} failed)"

        if self.research_reports:
            summary += f"\nConducted research on {len(self.research_reports)} topic(s)"

        if self.artifacts:
            summary += f"\nCreated/modified {len(self.artifacts)} file(s)"

        return summary

    def _print_result(self, result: MainTaskResult):
        """Print execution result"""

        status_icon = {
            "completed": "✅",
            "partial": "⚠️",
            "failed": "❌"
        }

        print(f"\n{'='*80}")
        print(f"SUB-ORCHESTRATOR RESULT")
        print(f"{'='*80}\n")

        print(f"{status_icon.get(result.status, '•')} Status: {result.status.upper()}")
        print(f"⏱️  Execution Time: {result.total_execution_time:.1f}s")
        print(f"📋 Subtasks: {len(result.subtask_results)}")

        completed = sum(1 for r in result.subtask_results if r.status == "completed")
        failed = sum(1 for r in result.subtask_results if r.status == "failed")
        skipped = sum(1 for r in result.subtask_results if r.status == "skipped")

        print(f"   ✅ Completed: {completed}")
        if failed > 0:
            print(f"   ❌ Failed: {failed}")
        if skipped > 0:
            print(f"   ⏭️  Skipped: {skipped}")

        if result.research_reports:
            print(f"🔍 Research Reports: {len(result.research_reports)}")

        if result.artifacts_created:
            print(f"📁 Artifacts: {len(result.artifacts_created)}")

        if result.validation_feedback:
            print(f"\n{'─'*80}")
            print("VALIDATION FEEDBACK")
            print(f"{'─'*80}\n")
            print(f"Status: {result.validation_feedback.status}")
            print(f"Alignment Score: {result.validation_feedback.alignment_score:.1%}")

        print(f"\n{'─'*80}")
        print("SUMMARY")
        print(f"{'─'*80}\n")
        print(result.summary)
        print()

        print(f"{'='*80}\n")


async def main():
    """Test sub-orchestrator"""

    from task_decomposer import MainTask, Subtask

    # Create test main task
    main_task = MainTask(
        task_id="test-main-1",
        title="Setup Authentication API",
        description="Create JWT-based authentication endpoints with database integration",
        subtasks=[
            Subtask(
                subtask_id="test-main-1-sub-1",
                title="Design database schema for users",
                description="Create PostgreSQL schema for user accounts with proper indexes",
                estimated_complexity="medium",
                required_agents=["DATA", "AR"],
                dependencies=[]
            ),
            Subtask(
                subtask_id="test-main-1-sub-2",
                title="Implement registration endpoint",
                description="Create /api/auth/register endpoint with validation",
                estimated_complexity="medium",
                required_agents=["CODE", "QA"],
                dependencies=["test-main-1-sub-1"]
            ),
            Subtask(
                subtask_id="test-main-1-sub-3",
                title="Implement login endpoint",
                description="Create /api/auth/login endpoint with JWT generation",
                estimated_complexity="medium",
                required_agents=["CODE", "QA"],
                dependencies=["test-main-1-sub-1"]
            ),
        ],
        estimated_time="4 hours",
        priority=1,
        dependencies=[],
        requires_research=True,
        research_topics=["JWT best practices 2025", "PostgreSQL password hashing"]
    )

    original_task = {
        "title": "Implement User Authentication System",
        "description": "Complete authentication system with registration, login, and JWT tokens",
        "context": {
            "tech_stack": "Node.js, Express, PostgreSQL",
            "existing_files": ["server/index.ts"]
        }
    }

    orchestrator = SubOrchestrator(
        main_task=main_task,
        original_task=original_task,
        project_root=Path.cwd(),
        parent_task_id="test-parent-001",
        depth=2,
        max_depth=3
    )

    result = await orchestrator.execute(verbose=True)

    # Save result
    output_file = "test_sub_orchestrator_result.json"
    with open(output_file, 'w') as f:
        json.dump({
            "main_task_id": result.main_task_id,
            "main_task_title": result.main_task_title,
            "status": result.status,
            "execution_time": result.total_execution_time,
            "subtasks": [
                {
                    "id": r.subtask_id,
                    "title": r.subtask_title,
                    "status": r.status,
                    "agent": r.agent_type,
                    "time": r.execution_time_seconds,
                    "artifacts": r.artifacts
                }
                for r in result.subtask_results
            ],
            "artifacts": result.artifacts_created,
            "summary": result.summary
        }, f, indent=2)

    print(f"✅ Result saved to {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
