"""
Stage 0: Multi-AI Planning with Design Iteration Cycle

Sequential multi-AI enrichment with automatic design refinement.
"""

import os
from dataclasses import asdict
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from orchestrator.v4.stages.base_stage import BaseStage
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult
from orchestrator.hybrid_planner import HybridPlanner, EnrichedPlan
from orchestrator.claude_cli_executor import ClaudeCLIExecutor


class Stage0MultiAIPlanning(BaseStage):
    """
    Stage 0: Multi-AI Planning Layer with Design Iteration.

    SEQUENTIAL FLOW: Claude → ChatGPT → DeepSeek → Grok → Gemini

    ITERATIVE CYCLE:
    1. Run multi-AI enrichment
    2. Check confidence score and risks
    3. If confidence < 7.0 OR risks > 5 → Refine and iterate (max 2 iterations)
    4. Otherwise → Approve and proceed
    """

    def __init__(
        self,
        openai_api_key: str,
        gpt_model: str = "gpt-4o",
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None,
        max_design_iterations: int = 2,
        project_root: Path = None
    ):
        super().__init__(
            stage_id="stage-0-multi-ai-planning",
            stage_type="planning",
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )

        self.max_design_iterations = max_design_iterations

        # Initialize HybridPlanner
        self.hybrid_planner = HybridPlanner(
            openai_api_key=openai_api_key,
            deepseek_api_key=os.getenv("DEEPSEEK_API_KEY"),
            grok_api_key=os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY"),
            gemini_api_key=os.getenv("GEMINI_API_KEY"),
            chatgpt_model=gpt_model,
            enable_best_practices=True,
            verbose=verbose
        )

        # Initialize Claude CLI Executor for creative analysis
        self.project_root = project_root or Path.cwd()
        self.claude_executor = ClaudeCLIExecutor(
            project_root=self.project_root,
            working_directory=self.project_root
        )

    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult,
        **kwargs
    ) -> DialogueStage:
        """Execute multi-AI planning with design iteration"""

        self._log("=" * 80)
        self._log("STAGE 0: Multi-AI Planning Layer with Design Iteration")
        self._log("Sequential: Claude → ChatGPT → DeepSeek → Grok → Gemini")
        self._log("=" * 80)

        stage = DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Multi-AI collaborative planning with design refinement",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        stage.status = "in_progress"

        # Spawn visual nodes for each AI agent in the planning chain
        task_id = context.get("task_id", "unknown")
        orchestrator_node_id = f"orchestrator:{task_id}"

        ai_agents = [
            {"role": "CLAUDE", "label": "Claude (Creative Analysis)", "x": 150, "y": 100},
            {"role": "CHATGPT", "label": "ChatGPT (Structured Plan)", "x": 300, "y": 100},
            {"role": "DEEPSEEK", "label": "DeepSeek (Technical Analysis)", "x": 450, "y": 100},
            {"role": "GROK", "label": "Grok (Critical Review)", "x": 600, "y": 100},
            {"role": "GEMINI", "label": "Gemini (Final Assessment)", "x": 750, "y": 100},
        ]

        # Publish spawn events for all AI agents
        for agent_info in ai_agents:
            if self.agent_activity_callback:
                self._log(f"🌟 Spawning AI agent node: {agent_info['role']} at ({agent_info['x']}, {agent_info['y']})")
                await self.agent_activity_callback(
                    agent_role=agent_info["role"],
                    log_type="spawn",
                    message=f"Spawning {agent_info['label']} for multi-AI planning",
                    metadata={
                        "x": agent_info["x"],
                        "y": agent_info["y"],
                        "agent_label": agent_info["label"],
                        "task": "Multi-AI Planning",
                        "stage": "planning"
                    }
                )
            else:
                self._log(f"⚠️ No agent_activity_callback available, cannot spawn AI agent nodes", "WARNING")

        # DESIGN ITERATION CYCLE
        enriched_plan = await self._run_with_design_iteration(user_goal, context)

        stage.metadata["enriched_plan"] = {
            "plan_id": enriched_plan.plan_id,
            "ai_contributors": len(enriched_plan.enrichments),
            "confidence_score": enriched_plan.final_confidence_score,
            "risks_count": len(enriched_plan.risks_identified),
            "best_practices": enriched_plan.best_practices,
            "execution_plan": asdict(enriched_plan.execution_plan) if enriched_plan.execution_plan else {},  # ✅ FIX: Convert ExecutionPlan to dict
            "structured_tasks": enriched_plan.structured_tasks  # Gemini's JSON task breakdown
        }
        stage.status = "completed"
        stage.end_time = datetime.now(timezone.utc).isoformat()

        self._log(f"✓ Multi-AI Planning Complete", "SUCCESS")
        self._log(f"  AI Contributors: {len(enriched_plan.enrichments)}")
        self._log(f"  Confidence Score: {enriched_plan.final_confidence_score}/10")
        self._log(f"  Risks Identified: {len(enriched_plan.risks_identified)}")
        self._log(f"  Best Practices Applied: {len(enriched_plan.best_practices)}")

        # Log Gemini structured tasks data flow
        if enriched_plan.structured_tasks:
            total_tasks = enriched_plan.structured_tasks.get("total_tasks", 0)
            self._log(f"  📊 Gemini Structured Tasks: {total_tasks} tasks organized")
            self._log(f"  ✅ Structured tasks will be passed to execution stage")
        else:
            self._log(f"  ⚠️ No structured tasks from Gemini", "WARNING")

        return stage

    async def _generate_claude_creative_analysis(self, user_goal: str) -> str:
        """
        Call Claude to generate creative analysis and task expansion.

        Args:
            user_goal: The user's task description

        Returns:
            Claude's creative analysis and expansion
        """
        self._log("🤖 Calling Claude for creative analysis...")

        # Create a detailed prompt for Claude to analyze and expand the task
        claude_prompt = f"""Analyze this task and provide a creative, detailed breakdown:

Task: {user_goal}

Please provide:

1. **Understanding**: What is the user really asking for? What's the core goal?
2. **Creative Expansion**: If the request is minimal, expand it into a robust solution
3. **Technical Approach**: What technologies, frameworks, and patterns would work best?
4. **Architecture**: How should this be structured?
5. **Key Considerations**: What are the important design decisions and trade-offs?
6. **Scope**: What features are essential vs nice-to-have?

Be creative and thorough. If the request is simple, think about what a production-ready version would look like."""

        # Call Claude via CLI
        success, output, metadata = await self.claude_executor.execute_prompt(
            prompt=claude_prompt,
            timeout=60
        )

        if success and output.strip():
            self._log(f"✅ Claude analysis generated ({len(output)} chars)")
            return output.strip()
        else:
            # Fallback if Claude call fails
            self._log(f"⚠️ Claude call failed, using fallback analysis", "WARNING")
            return f"""# Initial Analysis

## Task
{user_goal}

## Initial Assessment
This task requires careful planning and execution. The implementation should focus on:
- Meeting the core requirements
- Following best practices
- Creating maintainable code
- Proper error handling and validation

The next stages will provide detailed technical planning and implementation steps."""

    async def _run_with_design_iteration(
        self,
        user_goal: str,
        context: Dict[str, Any]
    ) -> EnrichedPlan:
        """
        Run multi-AI planning with design refinement iteration.

        ITERATION LOGIC:
        - If confidence >= 7.0 AND risks <= 5 → Approve
        - Otherwise → Refine with feedback and iterate
        - Max iterations: 2
        """

        enriched_plan = None
        refinement_context = dict(context)  # Copy to avoid mutating

        for iteration in range(self.max_design_iterations):
            self._log(f"🎨 Design Iteration {iteration + 1}/{self.max_design_iterations}")

            # ✅ FIX: Actually call Claude for creative analysis instead of using hard-coded string
            claude_analysis = await self._generate_claude_creative_analysis(user_goal)

            # Run multi-AI enrichment pipeline (emits events for each AI)
            enriched_plan = await self.hybrid_planner.enrich_plan(
                task_title=f"Task: {user_goal[:100]}",
                task_description=user_goal,
                claude_plan=claude_analysis,  # Now using actual Claude output
                context=refinement_context
            )

            # Check if design refinement needed
            confidence = enriched_plan.final_confidence_score
            risks_count = len(enriched_plan.risks_identified)

            needs_refinement = (confidence < 7.0 or risks_count > 5)

            if not needs_refinement or iteration == self.max_design_iterations - 1:
                self._log(f"✅ Design approved!", "SUCCESS")
                self._log(f"  Final Confidence: {confidence}/10")
                self._log(f"  Risks: {risks_count}")
                break
            else:
                self._log(f"⚠️ Design needs refinement", "WARNING")
                self._log(f"  Current Confidence: {confidence}/10 (target: >= 7.0)")
                self._log(f"  Current Risks: {risks_count} (target: <= 5)")
                self._log(f"  Iterating with refinement feedback...")

                # Add refinement feedback for next iteration
                refinement_context["refinement_feedback"] = {
                    "iteration": iteration + 1,
                    "previous_confidence": confidence,
                    "risks_to_address": enriched_plan.risks_identified,
                    "focus_areas": [
                        "Address identified risks",
                        "Improve confidence through better planning",
                        "Add more detail to unclear areas"
                    ]
                }

        return enriched_plan
