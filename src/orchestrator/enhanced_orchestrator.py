#!/usr/bin/env python3
"""
Enhanced Orchestrator - Multi-level orchestration with ChatGPT-5 integration

This orchestrator implements the full workflow:
1. Accept high-level task
2. Decompose using ChatGPT-5 (TaskDecomposer)
3. Spawn sub-orchestrators for each main task
4. Sub-orchestrators create specialized agents
5. Research agents gather information as needed
6. Feedback validation after completion
7. Comprehensive reporting
"""

import os
import json
import asyncio
import traceback
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import uuid

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from task_decomposer import TaskDecomposer, DecomposedTask, MainTask
from sub_orchestrator import SubOrchestrator, MainTaskResult
from feedback_validator import FeedbackValidator, ValidationFeedback
from planning_layer import PlanningLayer, ArchitecturalPlan
from redis_publisher import get_publisher


@dataclass
class EnhancedOrchestratorResult:
    """Complete result from enhanced orchestration"""

    task_id: str
    original_title: str
    original_description: str
    architectural_plan: Optional[ArchitecturalPlan]
    decomposition: DecomposedTask
    main_task_results: List[MainTaskResult]
    final_validation: Optional[ValidationFeedback]
    total_execution_time: float
    overall_status: str  # completed, partial, failed
    all_artifacts: List[str]
    comprehensive_summary: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EnhancedOrchestrator:
    """
    Enhanced orchestrator with multi-level task decomposition and execution.

    Workflow:
    1. Decompose task using ChatGPT-5
    2. Create execution plan
    3. Spawn sub-orchestrators for each main task
    4. Coordinate parallel/sequential execution
    5. Collect and validate results
    6. Generate comprehensive report
    """

    def __init__(
        self,
        task_id: str,
        title: str,
        description: str,
        context: Optional[Dict] = None,
        config: Optional[Dict] = None,
        openai_api_key: Optional[str] = None
    ):

        self.task_id = task_id
        self.title = title
        self.description = description
        self.context = context or {}
        self.config = config or {}

        self.max_depth = self.config.get('max_agent_depth', 20)  # Deep multi-level orchestration
        self.timeout_minutes = self.config.get('timeout_minutes', 60)

        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required for enhanced orchestration")

        if OpenAI is None:
            raise ImportError("OpenAI library not installed. Install with: pip install openai")

        self.client = OpenAI(api_key=self.api_key)

        self.project_root = Path.cwd()

        self.architectural_plan: Optional[ArchitecturalPlan] = None
        self.decomposition: Optional[DecomposedTask] = None
        self.main_task_results: List[MainTaskResult] = []
        self.all_artifacts: List[str] = []

        self.start_time = datetime.now()

        # Initialize Redis event publisher
        self.event_publisher = get_publisher()

    async def execute(self, verbose: bool = True) -> EnhancedOrchestratorResult:
        """
        Execute complete enhanced orchestration workflow.

        Returns:
            EnhancedOrchestratorResult with full execution details
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"ENHANCED ORCHESTRATOR STARTING")
            print(f"{'='*80}")
            print(f"Task: {self.title}")
            print(f"Task ID: {self.task_id}")
            print(f"Max Depth: {self.max_depth}")
            print(f"Timeout: {self.timeout_minutes} minutes")
            print(f"{'='*80}\n")

        # Publish orchestrator start event
        self.event_publisher.publish_orchestrator_start(
            user_request=f"{self.title}: {self.description}"
        )

        try:
            # Phase 0: Architectural Planning (NEW)
            if verbose:
                print(f"{'─'*80}")
                print("PHASE 0: ARCHITECTURAL PLANNING")
                print(f"{'─'*80}\n")

            self.architectural_plan = await self._create_architectural_plan(verbose)

            # Phase 1: Task Decomposition (with architectural plan)
            if verbose:
                print(f"\n{'─'*80}")
                print("PHASE 1: TASK DECOMPOSITION")
                print(f"{'─'*80}\n")

            self.decomposition = await self._decompose_task(verbose)

            if not self.decomposition.main_tasks:
                raise RuntimeError("Task decomposition produced no main tasks")

            # Phase 2: Execute Main Tasks
            if verbose:
                print(f"\n{'─'*80}")
                print(f"PHASE 2: MAIN TASK EXECUTION ({len(self.decomposition.main_tasks)} tasks)")
                print(f"{'─'*80}\n")

            await self._execute_main_tasks(verbose)

            # Phase 3: Final Validation
            if verbose:
                print(f"\n{'─'*80}")
                print("PHASE 3: FINAL VALIDATION")
                print(f"{'─'*80}\n")

            final_validation = await self._final_validation(verbose)

            # Phase 4: Generate Result
            execution_time = (datetime.now() - self.start_time).total_seconds()

            completed_tasks = sum(1 for r in self.main_task_results if r.status == "completed")
            total_tasks = len(self.main_task_results)

            if completed_tasks == total_tasks:
                overall_status = "completed"
            elif completed_tasks > 0:
                overall_status = "partial"
            else:
                overall_status = "failed"

            comprehensive_summary = self._generate_comprehensive_summary(
                overall_status,
                completed_tasks,
                total_tasks
            )

            result = EnhancedOrchestratorResult(
                task_id=self.task_id,
                original_title=self.title,
                original_description=self.description,
                architectural_plan=self.architectural_plan,
                decomposition=self.decomposition,
                main_task_results=self.main_task_results,
                final_validation=final_validation,
                total_execution_time=execution_time,
                overall_status=overall_status,
                all_artifacts=self.all_artifacts,
                comprehensive_summary=comprehensive_summary
            )

            if verbose:
                self._print_final_result(result)

            # Save detailed report
            await self._save_report(result)

            # Publish orchestrator complete event
            self.event_publisher.publish_orchestrator_complete(
                task_id=self.task_id,
                success=overall_status == "completed",
                duration_seconds=execution_time,
                artifacts=self.all_artifacts
            )

            return result

        except Exception as e:
            if verbose:
                print(f"\n❌ Enhanced orchestration failed: {e}")

            # Publish error event
            self.event_publisher.publish_error(
                task_id=self.task_id,
                error_message=str(e),
                error_details=traceback.format_exc() if verbose else None
            )

            # Create failure result
            execution_time = (datetime.now() - self.start_time).total_seconds()

            return EnhancedOrchestratorResult(
                task_id=self.task_id,
                original_title=self.title,
                original_description=self.description,
                architectural_plan=self.architectural_plan,
                decomposition=self.decomposition,
                main_task_results=self.main_task_results,
                final_validation=None,
                total_execution_time=execution_time,
                overall_status="failed",
                all_artifacts=self.all_artifacts,
                comprehensive_summary=f"Orchestration failed: {e}"
            )

    async def _create_architectural_plan(self, verbose: bool) -> ArchitecturalPlan:
        """
        Create architectural plan using PlanningLayer.

        This happens BEFORE ChatGPT decomposition to provide structured context.
        """

        planner = PlanningLayer(verbose=verbose)

        plan = planner.analyze_request(
            title=self.title,
            description=self.description
        )

        if verbose:
            print(plan.get_component_summary())
            print(f"\n✓ Architectural plan created with {len(plan.components)} components\n")

        # Publish planning complete event
        self.event_publisher.publish_planning_complete(
            task_id=self.task_id,
            plan={
                'components': [c.component_type for c in plan.components],
                'requirements': {c.component_type: c.specific_requirements for c in plan.components}
            }
        )

        return plan

    async def _decompose_task(self, verbose: bool) -> DecomposedTask:
        """
        Decompose task using ChatGPT-5 with architectural plan.

        The architectural plan provides detailed component requirements
        that ChatGPT uses to generate hyper-specific subtasks.
        """

        decomposer = TaskDecomposer(openai_api_key=self.api_key)

        # Convert architectural plan to string for prompt
        arch_plan_str = None
        if self.architectural_plan:
            arch_plan_str = self.architectural_plan.get_component_summary()

        decomposition = decomposer.decompose_task(
            task_id=self.task_id,
            title=self.title,
            description=self.description,
            context=self.context,
            architectural_plan=arch_plan_str,
            verbose=verbose
        )

        # Publish task decomposition complete event
        self.event_publisher.publish_task_decomposed(
            task_id=self.task_id,
            num_tasks=len(decomposition.main_tasks),
            strategy=decomposition.execution_strategy
        )

        return decomposition

    async def _execute_main_tasks(self, verbose: bool):
        """Execute main tasks according to execution strategy"""

        strategy = self.decomposition.execution_strategy.lower()

        if "parallel" in strategy:
            await self._execute_main_tasks_parallel(verbose)
        else:
            await self._execute_main_tasks_sequential(verbose)

    async def _execute_main_tasks_sequential(self, verbose: bool):
        """Execute main tasks one at a time in priority order"""

        # Sort by priority (1 = highest)
        sorted_tasks = sorted(
            self.decomposition.main_tasks,
            key=lambda t: (t.priority, t.task_id)
        )

        for i, main_task in enumerate(sorted_tasks, 1):
            if verbose:
                print(f"{'─'*80}")
                print(f"Main Task {i}/{len(sorted_tasks)}: {main_task.title}")
                print(f"{'─'*80}\n")

            result = await self._execute_main_task(main_task, verbose)
            self.main_task_results.append(result)

            # Collect artifacts
            self.all_artifacts.extend(result.artifacts_created)

            if verbose:
                print(f"\n✓ Main task completed: {result.status}")
                print()

    async def _execute_main_tasks_parallel(self, verbose: bool):
        """Execute independent main tasks in parallel"""

        if verbose:
            print(f"Executing {len(self.decomposition.main_tasks)} main tasks in parallel...\n")

        # Create tasks for parallel execution
        tasks = [
            self._execute_main_task(main_task, verbose)
            for main_task in self.decomposition.main_tasks
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                if verbose:
                    print(f"⚠️  Main task failed: {result}")
            else:
                self.main_task_results.append(result)
                self.all_artifacts.extend(result.artifacts_created)

    async def _execute_main_task(
        self,
        main_task: MainTask,
        verbose: bool
    ) -> MainTaskResult:
        """Execute a single main task using sub-orchestrator"""

        sub_orchestrator = SubOrchestrator(
            main_task=main_task,
            original_task={
                "title": self.title,
                "description": self.description,
                "context": self.context
            },
            project_root=self.project_root,
            parent_task_id=self.task_id,
            depth=2,  # Enhanced orchestrator is depth 1, sub-orch is depth 2
            max_depth=self.max_depth,
            openai_api_key=self.api_key
        )

        result = await sub_orchestrator.execute(verbose=verbose)

        return result

    async def _final_validation(self, verbose: bool) -> Optional[ValidationFeedback]:
        """Perform final validation of all work"""

        if not self.main_task_results:
            if verbose:
                print("⚠️  No results to validate")
            return None

        try:
            validator = FeedbackValidator(openai_api_key=self.api_key)

            # Build comprehensive work summary
            work_completed = {
                "summary": f"Completed {len(self.main_task_results)} main tasks",
                "main_tasks": [
                    {
                        "title": r.main_task_title,
                        "status": r.status,
                        "subtasks_completed": len([s for s in r.subtask_results if s.status == "completed"]),
                        "subtasks_total": len(r.subtask_results),
                        "summary": r.summary
                    }
                    for r in self.main_task_results
                ],
                "total_execution_time": (datetime.now() - self.start_time).total_seconds(),
                "artifacts_created": len(self.all_artifacts)
            }

            # Extract success criteria from decomposition
            success_criteria = self.decomposition.success_criteria if self.decomposition else []

            # Publish validation start event
            self.event_publisher.publish_validation_start(task_id=self.task_id)

            feedback = await validator.validate(
                original_task={
                    "title": self.title,
                    "description": self.description,
                    "success_criteria": success_criteria,
                    "context": self.context
                },
                work_completed=work_completed,
                artifacts=self.all_artifacts,
                verbose=verbose
            )

            # Publish validation complete event
            self.event_publisher.publish_validation_complete(
                task_id=self.task_id,
                alignment_score=feedback.alignment_score,
                passed=feedback.status == "pass"
            )

            return feedback

        except Exception as e:
            if verbose:
                print(f"⚠️  Final validation failed: {e}")
            return None

    def _generate_comprehensive_summary(
        self,
        status: str,
        completed: int,
        total: int
    ) -> str:
        """Generate comprehensive execution summary"""

        summary = f"Enhanced orchestration {status} for task '{self.title}'.\n\n"

        # Decomposition summary
        if self.decomposition:
            summary += f"DECOMPOSITION:\n"
            summary += f"- {len(self.decomposition.main_tasks)} main tasks identified\n"
            summary += f"- Execution strategy: {self.decomposition.execution_strategy}\n"
            summary += f"- Estimated time: {self.decomposition.estimated_total_time}\n\n"

        # Execution summary
        summary += f"EXECUTION:\n"
        summary += f"- Completed: {completed}/{total} main tasks\n"

        total_subtasks = sum(len(r.subtask_results) for r in self.main_task_results)
        completed_subtasks = sum(
            len([s for s in r.subtask_results if s.status == "completed"])
            for r in self.main_task_results
        )
        summary += f"- Subtasks: {completed_subtasks}/{total_subtasks} completed\n"

        if self.all_artifacts:
            summary += f"- Artifacts: {len(self.all_artifacts)} files created/modified\n"

        # Research summary
        total_research = sum(len(r.research_reports) for r in self.main_task_results)
        if total_research > 0:
            summary += f"- Research: {total_research} topic(s) investigated\n"

        summary += f"\nExecution time: {(datetime.now() - self.start_time).total_seconds():.1f}s"

        return summary

    def _print_final_result(self, result: EnhancedOrchestratorResult):
        """Print final orchestration result"""

        status_icon = {
            "completed": "✅",
            "partial": "⚠️",
            "failed": "❌"
        }

        print(f"\n{'='*80}")
        print(f"ENHANCED ORCHESTRATION COMPLETE")
        print(f"{'='*80}\n")

        print(f"{status_icon.get(result.overall_status, '•')} Overall Status: {result.overall_status.upper()}")
        print(f"⏱️  Total Time: {result.total_execution_time:.1f}s")
        print(f"📋 Task: {result.original_title}\n")

        # Decomposition stats
        print(f"{'─'*80}")
        print("DECOMPOSITION")
        print(f"{'─'*80}\n")
        print(f"Main Tasks: {len(result.decomposition.main_tasks)}")
        print(f"Strategy: {result.decomposition.execution_strategy}")
        print(f"Estimated Time: {result.decomposition.estimated_total_time}\n")

        # Execution stats
        print(f"{'─'*80}")
        print("EXECUTION RESULTS")
        print(f"{'─'*80}\n")

        for i, task_result in enumerate(result.main_task_results, 1):
            icon = status_icon.get(task_result.status, '•')
            print(f"{i}. {icon} {task_result.main_task_title}")
            print(f"   Status: {task_result.status}")
            print(f"   Time: {task_result.total_execution_time:.1f}s")

            completed = len([s for s in task_result.subtask_results if s.status == "completed"])
            total = len(task_result.subtask_results)
            print(f"   Subtasks: {completed}/{total}")

            if task_result.artifacts_created:
                print(f"   Artifacts: {len(task_result.artifacts_created)}")

            print()

        # Validation feedback
        if result.final_validation:
            print(f"{'─'*80}")
            print("FINAL VALIDATION")
            print(f"{'─'*80}\n")
            print(f"Status: {result.final_validation.status.upper()}")
            print(f"Alignment: {result.final_validation.alignment_score:.1%}")
            print(f"Assessment: {result.final_validation.overall_assessment}\n")

        # Summary
        print(f"{'─'*80}")
        print("SUMMARY")
        print(f"{'─'*80}\n")
        print(result.comprehensive_summary)
        print()

        print(f"{'='*80}\n")

    async def _save_report(self, result: EnhancedOrchestratorResult):
        """Save comprehensive execution report"""

        reports_dir = self.project_root / "orchestrator" / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)

        report_file = reports_dir / f"{self.task_id}_report.json"

        report_data = {
            "task_id": result.task_id,
            "title": result.original_title,
            "description": result.original_description,
            "status": result.overall_status,
            "execution_time": result.total_execution_time,
            "created_at": result.created_at,
            "decomposition": {
                "main_tasks_count": len(result.decomposition.main_tasks),
                "execution_strategy": result.decomposition.execution_strategy,
                "estimated_time": result.decomposition.estimated_total_time,
                "risks": result.decomposition.risks,
                "success_criteria": result.decomposition.success_criteria
            },
            "execution": {
                "main_tasks": [
                    {
                        "task_id": r.main_task_id,
                        "title": r.main_task_title,
                        "status": r.status,
                        "execution_time": r.total_execution_time,
                        "subtasks": [
                            {
                                "id": s.subtask_id,
                                "title": s.subtask_title,
                                "status": s.status,
                                "agent": s.agent_type,
                                "time": s.execution_time_seconds,
                                "artifacts": s.artifacts
                            }
                            for s in r.subtask_results
                        ],
                        "research_reports": len(r.research_reports),
                        "artifacts": r.artifacts_created,
                        "summary": r.summary
                    }
                    for r in result.main_task_results
                ]
            },
            "validation": {
                "status": result.final_validation.status if result.final_validation else "none",
                "alignment_score": result.final_validation.alignment_score if result.final_validation else 0,
                "assessment": result.final_validation.overall_assessment if result.final_validation else "",
                "strengths": result.final_validation.strengths if result.final_validation else [],
                "concerns": result.final_validation.concerns if result.final_validation else [],
                "suggestions": result.final_validation.suggestions if result.final_validation else []
            },
            "artifacts": result.all_artifacts,
            "summary": result.comprehensive_summary
        }

        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)

        print(f"📄 Detailed report saved to: {report_file}")


async def main():
    """Test enhanced orchestrator"""

    test_task = {
        "task_id": str(uuid.uuid4()),
        "title": "Implement Complete Authentication System",
        "description": """
        Create a production-ready authentication system with:
        - User registration with email verification
        - Login with JWT tokens
        - Password reset functionality
        - Role-based access control
        - Session management
        - Security best practices
        """,
        "context": {
            "tech_stack": "Node.js, Express, PostgreSQL, Redis",
            "existing_files": [
                "server/index.ts",
                "database/schema.sql"
            ],
            "requirements": [
                "Must follow OWASP security guidelines",
                "Must include comprehensive testing",
                "Must have API documentation"
            ]
        },
        "config": {
            "max_agent_depth": 3,
            "timeout_minutes": 60,
            "gpt_model": "gpt-4"
        }
    }

    orchestrator = EnhancedOrchestrator(
        task_id=test_task["task_id"],
        title=test_task["title"],
        description=test_task["description"],
        context=test_task["context"],
        config=test_task["config"]
    )

    result = await orchestrator.execute(verbose=True)

    print(f"\n✅ Enhanced orchestration complete!")
    print(f"Status: {result.overall_status}")
    print(f"Time: {result.total_execution_time:.1f}s")
    print(f"Main tasks: {len(result.main_task_results)}")
    print(f"Artifacts: {len(result.all_artifacts)}")


if __name__ == "__main__":
    asyncio.run(main())
