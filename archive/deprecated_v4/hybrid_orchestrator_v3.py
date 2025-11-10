"""
Hybrid Orchestrator V3
Coordinates ChatGPT (planning) + Claude Code (execution) for autonomous task completion.

Architecture:
    User Goal
        ↓
    ChatGPT Planner (OpenAI API) - Creates execution plan
        ↓
    Claude Executor - Executes plan using Agent SDK
        ↓
    Specialized Agents (DOC, CODE, QA, etc.) - Perform actual work
        ↓
    ChatGPT Summarizer - Creates user-friendly summary
        ↓
    User Report
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from orchestrator.chatgpt_planner import ChatGPTPlanner, ExecutionPlan, PlanValidator
from orchestrator.claude_executor import ClaudeExecutor, ExecutionResult


class HybridOrchestrator:
    """
    Unified orchestrator coordinating ChatGPT planning and Claude Code execution.
    """

    def __init__(
        self,
        project_root: Path,
        openai_api_key: Optional[str] = None,
        anthropic_api_key: Optional[str] = None,
        gpt_model: str = "gpt-4",
        max_concurrent_agents: int = 4
    ):
        self.project_root = project_root
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.anthropic_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")

        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY required for ChatGPT planner")
        if not self.anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY required for Claude executor")

        # Initialize components
        self.planner = ChatGPTPlanner(openai_api_key=self.openai_key, model=gpt_model)
        self.executor = ClaudeExecutor(
            project_root=project_root,
            anthropic_api_key=self.anthropic_key,
            max_concurrent=max_concurrent_agents
        )

        # State
        self.current_plan: Optional[ExecutionPlan] = None
        self.current_result: Optional[ExecutionResult] = None

    async def execute_goal(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Execute a user goal end-to-end using ChatGPT + Claude.

        Args:
            user_goal: High-level description of what user wants
            context: Additional context for planning
            verbose: Print detailed progress

        Returns:
            Dict with plan, execution_result, and summary
        """

        if verbose:
            print(f"\n{'='*80}")
            print("HYBRID ORCHESTRATOR - ChatGPT Planning + Claude Execution")
            print(f"{'='*80}")
            print(f"\n📋 USER GOAL: {user_goal}\n")

        # ========================================
        # PHASE 1: ChatGPT Planning
        # ========================================

        if verbose:
            print(f"{'─'*80}")
            print("PHASE 1: ChatGPT Planning")
            print(f"{'─'*80}\n")

        plan = await self.planner.create_plan(user_goal, context)
        self.current_plan = plan

        if verbose:
            print(f"✓ Plan created: {plan.plan_id}")
            print(f"  Goal: {plan.goal}")
            print(f"  Tasks: {len(plan.tasks)}")
            print(f"  Estimated time: {plan.estimated_time}")
            if plan.risks:
                print(f"  Risks: {len(plan.risks)}")
                for i, risk in enumerate(plan.risks, 1):
                    print(f"    {i}. {risk}")

        # Validate plan
        is_valid, errors = PlanValidator.validate_plan(plan)
        if not is_valid:
            if verbose:
                print(f"\n❌ Plan validation failed:")
                for error in errors:
                    print(f"  - {error}")

            return {
                "status": "failed",
                "error": "Plan validation failed",
                "validation_errors": errors,
                "plan": self._plan_to_dict(plan)
            }

        # Check for circular dependencies
        has_circular, cycle = PlanValidator.check_circular_dependencies(plan)
        if has_circular:
            if verbose:
                print(f"\n❌ Circular dependency detected: {' → '.join(cycle)}")

            return {
                "status": "failed",
                "error": "Circular dependencies in plan",
                "cycle": cycle,
                "plan": self._plan_to_dict(plan)
            }

        if verbose:
            print(f"\n✓ Plan validated successfully")
            print(f"\n📝 EXECUTION PLAN:")
            for i, task in enumerate(plan.tasks, 1):
                deps = plan.dependencies.get(task["task_id"], [])
                deps_str = f" (depends on: {', '.join(deps)})" if deps else ""
                print(f"  {i}. [{task['agent']}] {task['description']}{deps_str}")

        # ========================================
        # PHASE 2: Claude Execution
        # ========================================

        if verbose:
            print(f"\n{'─'*80}")
            print("PHASE 2: Claude Execution")
            print(f"{'─'*80}\n")

        # Optional callback to show progress
        def on_task_complete(task_result):
            if verbose:
                status_emoji = "✅" if task_result.status == "success" else "❌"
                print(f"{status_emoji} {task_result.task_id} completed: {task_result.status}")

        execution_result = await self.executor.execute_plan(plan, on_task_complete)
        self.current_result = execution_result

        # ========================================
        # PHASE 3: ChatGPT Summarization
        # ========================================

        if verbose:
            print(f"\n{'─'*80}")
            print("PHASE 3: ChatGPT Summarization")
            print(f"{'─'*80}\n")

        # Prepare results for summarization
        results_for_summary = [
            {
                "task_id": r.task_id,
                "agent": r.agent,
                "status": r.status,
                "output_preview": r.output[:500] if r.output else "",
                "error": r.error
            }
            for r in execution_result.task_results
        ]

        summary = await self.planner.summarize_results(plan, results_for_summary)

        if verbose:
            print(f"✓ Summary generated")
            print(f"\n{'─'*80}")
            print("USER SUMMARY")
            print(f"{'─'*80}\n")
            print(summary)

        # ========================================
        # Return Complete Results
        # ========================================

        result = {
            "status": execution_result.status,
            "plan": self._plan_to_dict(plan),
            "execution": {
                "plan_id": execution_result.plan_id,
                "status": execution_result.status,
                "total_time": execution_result.total_time,
                "tasks_succeeded": execution_result.tasks_succeeded,
                "tasks_failed": execution_result.tasks_failed,
                "task_results": [
                    {
                        "task_id": r.task_id,
                        "agent": r.agent,
                        "status": r.status,
                        "output": r.output,
                        "error": r.error,
                        "metadata": r.metadata
                    }
                    for r in execution_result.task_results
                ]
            },
            "summary": summary,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if verbose:
            print(f"\n{'='*80}")
            print(f"HYBRID ORCHESTRATION COMPLETE")
            print(f"Overall Status: {result['status'].upper()}")
            print(f"{'='*80}\n")

        return result

    async def refine_and_retry(
        self,
        feedback: str,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Refine the current plan based on feedback and retry execution.

        Args:
            feedback: Description of issues or requested changes
            verbose: Print detailed progress

        Returns:
            Dict with refined plan, execution result, and summary
        """

        if not self.current_plan:
            return {
                "status": "error",
                "error": "No current plan to refine"
            }

        if verbose:
            print(f"\n{'='*80}")
            print("PLAN REFINEMENT AND RETRY")
            print(f"{'='*80}\n")
            print(f"Feedback: {feedback}\n")

        # Refine plan with ChatGPT
        refined_plan = await self.planner.refine_plan(self.current_plan, feedback)

        # Execute refined plan
        return await self.execute_goal(
            user_goal=refined_plan.goal,
            context={"refined_from": self.current_plan.plan_id},
            verbose=verbose
        )

    def _plan_to_dict(self, plan: ExecutionPlan) -> Dict[str, Any]:
        """Convert ExecutionPlan to dictionary"""
        return {
            "plan_id": plan.plan_id,
            "goal": plan.goal,
            "reasoning": plan.reasoning,
            "tasks": plan.tasks,
            "dependencies": plan.dependencies,
            "estimated_time": plan.estimated_time,
            "risks": plan.risks,
            "created_at": plan.created_at
        }

    def clear_state(self):
        """Clear current plan and execution state"""
        self.current_plan = None
        self.current_result = None
        self.planner.clear_history()


async def main():
    """Example usage of Hybrid Orchestrator"""

    project_root = Path(__file__).parent.parent

    # Check API keys
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if not openai_key:
        print("❌ OPENAI_API_KEY not set")
        print("Set it with: export OPENAI_API_KEY='your-key'")
        return

    if not anthropic_key:
        print("❌ ANTHROPIC_API_KEY not set")
        print("Set it with: export ANTHROPIC_API_KEY='your-key'")
        return

    # Create orchestrator
    orchestrator = HybridOrchestrator(
        project_root=project_root,
        openai_api_key=openai_key,
        anthropic_api_key=anthropic_key,
        gpt_model="gpt-4",
        max_concurrent_agents=2  # Limit concurrency for testing
    )

    # Example goal
    user_goal = """
    Create a simple README file in the test_output directory that documents
    the Hybrid Orchestrator system. Include:
    1. What it does
    2. How ChatGPT and Claude work together
    3. Example usage
    Keep it brief (under 100 lines).
    """

    # Execute goal
    result = await orchestrator.execute_goal(
        user_goal=user_goal,
        context={"test_mode": True},
        verbose=True
    )

    # Save result to file
    output_dir = project_root / "test_output"
    output_dir.mkdir(exist_ok=True)

    result_file = output_dir / f"orchestrator_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(result_file, 'w') as f:
        import json
        json.dump(result, f, indent=2)

    print(f"\n📄 Full result saved to: {result_file}")


if __name__ == "__main__":
    asyncio.run(main())
