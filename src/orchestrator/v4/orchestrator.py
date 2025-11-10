"""
Hybrid Orchestrator V4 - Modular Architecture with Iterative Cycles

Coordinates multi-AI planning and iterative Claude-ChatGPT dialogue.

ARCHITECTURE:
    User Goal
        ↓
    Stage 0: Multi-AI Planning (with design iteration cycle)
        ↓
    Stage 1: Claude Analysis
        ↓
    Stage 2: ChatGPT Comprehensive Planning
        ↓
    Stage 3: Iterative Execution (with code-test-debug cycle)
        ↓
    Stage 3.5: AR Code Review (with review-fix cycle)
        ↓
    Stage 4: Final Summary
        ↓
    User Report

KEY FEATURES:
- Modular stage-based architecture
- Three iterative cycles: design iteration, code-test-debug, review-fix
- Full multi-AI planning integration
- NO TRUNCATION throughout
"""

import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from orchestrator.chatgpt_planner import ChatGPTPlanner
from orchestrator.claude_cli_executor import ClaudeCLIExecutor
from orchestrator.v4.types import IterativeExecutionResult, DialogueStage

# Import all stages
from orchestrator.v4.stages.stage_0_multi_ai_planning import Stage0MultiAIPlanning
from orchestrator.v4.stages.stage_1_claude_analysis import Stage1ClaudeAnalysis
from orchestrator.v4.stages.stage_3_iterative_execution import Stage3IterativeExecution
from orchestrator.v4.stages.stage_3_5_code_review import Stage3_5CodeReview
from orchestrator.v4.stages.stage_4_final_summary import Stage4FinalSummary


class HybridOrchestratorV4:
    """
    Modular orchestrator with iterative cycles.

    Coordinates:
    - Multi-AI planning with design iteration
    - Claude-ChatGPT dialogue
    - Code-test-debug cycle
    - Review-fix cycle
    """

    def __init__(
        self,
        project_root: Path,
        openai_api_key: Optional[str] = None,
        gpt_model: str = "gpt-4o",
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None,
        progress_callback: Optional[callable] = None,
        max_dialogue_turns: int = 5,
        max_design_iterations: int = 2,
        max_review_cycles: int = 2,
        max_test_cycles: int = 3
    ):
        self.project_root = project_root
        self.openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.verbose = verbose
        self.agent_activity_callback = agent_activity_callback
        self.progress_callback = progress_callback

        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY required for ChatGPT planner")

        # Read current project for directory isolation
        current_project_file = project_root / "current-project.txt"
        try:
            if current_project_file.exists():
                current_project_name = current_project_file.read_text().strip()
            else:
                current_project_name = "default"
        except Exception as e:
            if verbose:
                print(f"Warning: Could not read current project file: {e}")
            current_project_name = "default"

        # Set project output directory
        self.project_name = current_project_name
        self.project_output_dir = project_root / "projects" / current_project_name / "outputs"
        self.project_output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize components
        self.chatgpt = ChatGPTPlanner(openai_api_key=self.openai_key, model=gpt_model)
        self.claude_cli = ClaudeCLIExecutor(
            project_root=self.project_root,
            working_directory=self.project_output_dir
        )

        # Initialize all stages
        self.stage_0 = Stage0MultiAIPlanning(
            openai_api_key=self.openai_key,
            gpt_model=gpt_model,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback,
            max_design_iterations=max_design_iterations,
            project_root=self.project_root
        )

        self.stage_1 = Stage1ClaudeAnalysis(
            claude_cli=self.claude_cli,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )

        self.stage_3 = Stage3IterativeExecution(
            claude_cli=self.claude_cli,
            chatgpt_planner=self.chatgpt,
            project_name=self.project_name,
            project_root=self.project_root,
            project_output_dir=self.project_output_dir,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback,
            max_dialogue_turns=max_dialogue_turns,
            max_test_cycles=max_test_cycles
        )

        self.stage_3_5 = Stage3_5CodeReview(
            claude_cli=self.claude_cli,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback,
            max_review_cycles=max_review_cycles
        )

        self.stage_4 = Stage4FinalSummary(
            claude_cli=self.claude_cli,
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )

        if verbose:
            print(f"✓ HybridOrchestratorV4 initialized")
            print(f"  Project: {self.project_name}")
            print(f"  Output: {self.project_output_dir}")
            print(f"  Max Dialogue Turns: {max_dialogue_turns}")
            print(f"  Max Design Iterations: {max_design_iterations}")
            print(f"  Max Review Cycles: {max_review_cycles}")
            print(f"  Max Test Cycles: {max_test_cycles}")

    async def run(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None,
        enable_multi_ai_planning: bool = True
    ) -> IterativeExecutionResult:
        """
        Run the orchestration pipeline with all stages.

        Args:
            user_goal: User's goal/task description
            context: Additional context information
            enable_multi_ai_planning: Enable Stage 0 multi-AI planning (default: True)

        Returns:
            IterativeExecutionResult with all stages and results
        """

        start_time = datetime.now(timezone.utc)
        context = context or {}

        if self.verbose:
            print("\n" + "=" * 80)
            print("HYBRID ORCHESTRATOR V4 - Modular Pipeline with Iterative Cycles")
            print("=" * 80)
            print(f"Goal: {user_goal[:100]}...")
            print(f"Project: {self.project_name}")
            print(f"Multi-AI Planning: {'Enabled' if enable_multi_ai_planning else 'Disabled'}")
            print("=" * 80 + "\n")

        # Initialize execution result
        execution_result = IterativeExecutionResult(
            goal=user_goal,
            status="in_progress",
            stages=[],
            total_dialogue_turns=0,
            total_time=0.0,
            final_summary="",
            artifacts=[]
        )

        await self._emit_progress("🚀 Starting orchestration pipeline...")

        try:
            # ========================================
            # STAGE 0: Multi-AI Planning (Optional)
            # ========================================
            if enable_multi_ai_planning:
                stage_0_result = await self.stage_0.execute(
                    user_goal=user_goal,
                    context=context,
                    execution_result=execution_result
                )
                execution_result.stages.append(stage_0_result)

                # Extract enriched plan from stage 0
                if "enriched_plan" in stage_0_result.metadata:
                    enriched_plan_data = stage_0_result.metadata["enriched_plan"]
                    context["enriched_plan"] = enriched_plan_data
                    context["execution_plan"] = enriched_plan_data.get("execution_plan", {})

                await self._emit_progress("✓ Multi-AI planning complete")

            # ========================================
            # STAGE 1: Claude Analysis
            # ========================================
            stage_1_result = await self.stage_1.execute(
                user_goal=user_goal,
                context=context,
                execution_result=execution_result
            )
            execution_result.stages.append(stage_1_result)

            # Extract information request from stage 1
            if "information_request" in stage_1_result.metadata:
                context["information_request"] = stage_1_result.metadata["information_request"]

            await self._emit_progress("✓ Claude analysis complete")

            # ========================================
            # STAGE 2: ChatGPT Planning
            # ========================================
            await self._emit_progress("📋 ChatGPT creating execution plan...")

            stage_2 = DialogueStage(
                stage_id="stage-2-planning",
                stage_type="planning",
                claude_action="ChatGPT creates comprehensive plan",
                start_time=datetime.now(timezone.utc).isoformat()
            )
            stage_2.status = "in_progress"

            # Log CHATGPT agent spawn
            if self.agent_activity_callback:
                await self.agent_activity_callback("CHATGPT", "spawn", f"Planning execution for: {user_goal[:100]}")
                await self.agent_activity_callback("CHATGPT", "status", "running", {"task": "Comprehensive planning"})

            # Get information request from stage 1
            info_request = context.get("information_request")
            if info_request:
                execution_plan = await self.chatgpt.create_plan(
                    user_goal=user_goal,
                    analysis_result=info_request,
                    context=context
                )
            else:
                # Fallback: create plan without detailed analysis
                execution_plan = await self.chatgpt.create_plan(
                    user_goal=user_goal,
                    analysis_result=None,
                    context=context
                )

            # Store execution plan in context
            context["execution_plan"] = {
                "plan_id": execution_plan.plan_id,
                "reasoning": execution_plan.reasoning,
                "tasks": execution_plan.tasks,
                "dependencies": execution_plan.dependencies,
                "estimated_time": execution_plan.estimated_time,
                "risks": execution_plan.risks
            }

            stage_2.metadata["execution_plan"] = context["execution_plan"]
            stage_2.chatgpt_response = execution_plan.reasoning  # NO TRUNCATION
            stage_2.status = "completed"
            stage_2.end_time = datetime.now(timezone.utc).isoformat()
            execution_result.stages.append(stage_2)

            # Log CHATGPT completion
            if self.agent_activity_callback:
                await self.agent_activity_callback("CHATGPT", "output", f"Created plan with {len(execution_plan.tasks)} tasks")
                await self.agent_activity_callback("CHATGPT", "complete", "Execution plan ready")
                await self.agent_activity_callback("CHATGPT", "status", "completed", {"tasks": len(execution_plan.tasks)})

            await self._emit_progress("✓ Execution plan created")

            # ========================================
            # STAGE 3: Iterative Execution
            # ========================================
            stage_3_results = await self.stage_3.execute(
                user_goal=user_goal,
                context=context,
                execution_result=execution_result
            )
            execution_result.stages.extend(stage_3_results)

            await self._emit_progress("✓ Iterative execution complete")

            # ========================================
            # STAGE 3.5: Code Review
            # ========================================
            stage_3_5_result = await self.stage_3_5.execute(
                user_goal=user_goal,
                context=context,
                execution_result=execution_result
            )
            execution_result.stages.append(stage_3_5_result)

            await self._emit_progress("✓ Code review complete")

            # ========================================
            # STAGE 4: Final Summary
            # ========================================
            stage_4_result = await self.stage_4.execute(
                user_goal=user_goal,
                context=context,
                execution_result=execution_result
            )
            execution_result.stages.append(stage_4_result)

            await self._emit_progress("✓ Final summary generated", "success")

            # Mark execution as complete
            execution_result.status = "completed"

        except Exception as e:
            if self.verbose:
                print(f"\n❌ Orchestration failed: {e}")
            execution_result.status = "failed"
            execution_result.final_summary = f"Orchestration failed: {str(e)}"
            await self._emit_progress(f"❌ Orchestration failed: {str(e)}", "error")

        # Calculate total time
        end_time = datetime.now(timezone.utc)
        execution_result.total_time = (end_time - start_time).total_seconds()

        if self.verbose:
            print("\n" + "=" * 80)
            print("ORCHESTRATION COMPLETE")
            print("=" * 80)
            print(f"Status: {execution_result.status}")
            print(f"Total Stages: {len(execution_result.stages)}")
            print(f"Total Time: {execution_result.total_time:.1f}s")
            print(f"Artifacts: {len(execution_result.artifacts)}")
            print("=" * 80 + "\n")

        return execution_result

    async def _emit_progress(self, message: str, status: str = "info"):
        """Emit progress message via callback"""
        if self.progress_callback:
            try:
                await self.progress_callback(message, status)
            except Exception as e:
                if self.verbose:
                    print(f"Progress callback error: {e}")
