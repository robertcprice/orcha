#!/usr/bin/env python3
"""
Unified Hybrid Orchestrator
Combines iterative development workflow with multi-AI enrichment pipeline.

Features:
- Claude planning in plan mode
- Multi-AI enrichment (ChatGPT, DeepSeek R1, Grok 4, Gemini 2.5)
- Iterative execution with Codex
- Claude Code review with real file analysis
- Automatic refinement loops
- Gemini documentation generation
"""

import asyncio
import json
import os
import sys
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime
from dataclasses import asdict, is_dataclass

from orchestrator.hybrid_planner import HybridPlanner
from orchestrator.agent_dispatcher import AgentDispatcher
from orchestrator.claude_code_agent import ClaudeCodeAgent
from orchestrator.gemini_agent import GeminiAgent
from orchestrator.redis_publisher import RedisEventPublisher
from orchestrator.obsidian_manager import get_obsidian_manager

# Suppress repetitive MCP validation warnings
logging.getLogger('root').setLevel(logging.ERROR)

class UnifiedOrchestrator:
    """
    Unified orchestration system combining:
    - Multi-AI enrichment pipeline
    - Iterative development workflow
    - Automated review and refinement
    """

    def __init__(
        self,
        project_root: Path,
        verbose: bool = False,
        max_refinement_iterations: int = 3
    ):
        self.project_root = project_root
        self.verbose = verbose
        self.max_refinement_iterations = max_refinement_iterations

        # Initialize components
        self.planner = HybridPlanner(verbose=verbose)
        self.dispatcher = AgentDispatcher(project_root=project_root, verbose=verbose)
        self.redis_publisher = RedisEventPublisher()
        self.obsidian = get_obsidian_manager()

        self._log(f"[UnifiedOrchestrator] Initialized")
        self._log(f"  Project root: {project_root}")
        self._log(f"  Max refinement iterations: {max_refinement_iterations}")

    def _log(self, message: str):
        """Log message with immediate flush for real-time monitoring."""
        print(message)
        sys.stdout.flush()

    def _serialize_for_json(self, value: Any) -> Any:
        """Convert complex objects into JSON-serializable structures."""
        if is_dataclass(value):
            return self._serialize_for_json(asdict(value))
        if isinstance(value, dict):
            return {k: self._serialize_for_json(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._serialize_for_json(item) for item in value]
        if isinstance(value, datetime):
            return value.isoformat()
        return value

    def _update_task_state(self, task_id: str, updates: Dict[str, Any]) -> None:
        """Persist task state changes to Redis so the web UI stays in sync."""
        redis_client = getattr(self.redis_publisher, "redis_client", None)
        if not redis_client:
            return

        try:
            prepared: Dict[str, Any] = {
                key: (
                    json.dumps(self._serialize_for_json(value))
                    if isinstance(value, (dict, list)) or is_dataclass(value)
                    else value
                )
                for key, value in updates.items()
                if value is not None
            }
            prepared["updated_at"] = datetime.now().isoformat()
            redis_client.hset(f"algomind.hybrid.task.{task_id}", None, prepared)
        except Exception as exc:
            if self.verbose:
                self._log(f"⚠️  Failed to update task state in Redis: {exc}")

    async def execute_goal(
        self,
        user_goal: str,
        claude_plan: str,
        context: Optional[Dict[str, Any]] = None,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute a complete orchestration workflow:

        1. ENRICHMENT: Multi-AI plan enrichment
        2. EXECUTION: Iterative implementation with Codex
        3. REVIEW: Claude Code quality assessment
        4. REFINEMENT: Automated improvement loops
        5. DOCUMENTATION: Gemini docs generation
        6. FINALIZATION: Cost breakdown and summary
        """

        task_id = task_id or f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        context = context or {}

        try:
            # Publish manager_started event for frontend visualization
            self.redis_publisher.publish_event(
                action="manager_started",
                status="started",
                actor="Unified Orchestrator",
                task_id=task_id,
                meta={"goal": user_goal}
            )

            # ============================================
            # PHASE 1: MULTI-AI ENRICHMENT
            # ============================================
            if self.verbose:
                self._log("\n" + "="*70)
                self._log("PHASE 1: MULTI-AI ENRICHMENT")
                self._log("="*70)

            await self._publish_event(task_id, "phase_start", {"phase": "enrichment"})

            enrichment_result = await self.planner.enrich_plan(
                task_title=user_goal,
                task_description=user_goal,
                claude_plan=claude_plan,
                context=context
            )

            if self.verbose:
                self._log(f"\n✅ Enrichment complete:")
                self._log(f"   AI Contributors: {len(enrichment_result.enrichments)}")
                self._log(f"   Confidence Score: {enrichment_result.final_confidence_score}/10")
                self._log(f"   Risks Identified: {len(enrichment_result.risks_identified)}")

            await self._publish_event(task_id, "enrichment_complete", {
                "confidence": enrichment_result.final_confidence_score,
                "ai_contributors": len(enrichment_result.enrichments),
                "risks": len(enrichment_result.risks_identified)
            })

            self._update_task_state(task_id, {
                "plan": {
                    "plan_id": enrichment_result.execution_plan.plan_id,
                    "goal": enrichment_result.execution_plan.goal,
                    "reasoning": enrichment_result.execution_plan.reasoning,
                    "tasks": enrichment_result.execution_plan.tasks,
                    "dependencies": enrichment_result.execution_plan.dependencies,
                    "estimated_time": enrichment_result.execution_plan.estimated_time,
                    "risks": enrichment_result.execution_plan.risks,
                    "confidence": enrichment_result.final_confidence_score,
                    "best_practices": enrichment_result.best_practices,
                    "contributors": [
                        {
                            "ai": contribution.ai_name,
                            "summary": contribution.content[:500],
                            "suggestions": contribution.suggestions,
                            "insights": contribution.insights,
                            "concerns": contribution.concerns,
                            "timestamp": contribution.timestamp,
                        }
                        for contribution in enrichment_result.enrichments
                    ],
                }
            })

            # ============================================
            # PHASE 2: ITERATIVE EXECUTION
            # ============================================
            if self.verbose:
                self._log("\n" + "="*70)
                self._log("PHASE 2: ITERATIVE EXECUTION")
                self._log("="*70)

            await self._publish_event(task_id, "phase_start", {"phase": "execution"})

            implementation_result = await self.dispatcher.execute_task({
                "task_id": task_id,
                "goal": user_goal,
                "enriched_plan": enrichment_result.execution_plan,
                "context": context,
                "hint": "CODE"  # Use Codex for implementation
            })

            if self.verbose:
                self._log(f"\n✅ Implementation complete:")
                self._log(f"   Files Created: {len(implementation_result.files_created)}")
                self._log(f"   Tests Created: {len(implementation_result.tests_created)}")

            await self._publish_event(task_id, "execution_complete", {
                "files_created": len(implementation_result.files_created),
                "tests_created": len(implementation_result.tests_created)
            })

            self._update_task_state(task_id, {
                "execution_result": {
                    "status": "success" if implementation_result.success else "failed",
                    "completed_tasks": 1 if implementation_result.success else 0,
                    "failed_tasks": 0 if implementation_result.success else 1,
                    "files_created": implementation_result.files_created,
                    "files_modified": implementation_result.files_modified,
                    "tests_created": implementation_result.tests_created,
                    "error": implementation_result.error,
                    "metadata": implementation_result.metadata,
                }
            })

            # ============================================
            # PHASE 3: AUTOMATED REVIEW
            # ============================================
            if self.verbose:
                self._log("\n" + "="*70)
                self._log("PHASE 3: AUTOMATED REVIEW")
                self._log("="*70)

            await self._publish_event(task_id, "phase_start", {"phase": "review"})

            reviewer = ClaudeCodeAgent(
                agent_id=f"reviewer-{task_id}",
                project_root=self.project_root
            )

            # Create ReviewRequest with proper parameters
            from orchestrator.claude_code_agent import ReviewRequest
            review_request = ReviewRequest(
                task_title=user_goal,
                task_description=user_goal,
                requirements=[],
                code="\n".join([f"# {f}" for f in implementation_result.files_created]),
                output="",
                iteration=0
            )

            review_result = await reviewer.review(review_request)

            if self.verbose:
                self._log(f"\n✅ Review complete:")
                self._log(f"   Quality Score: {review_result.quality_score}/10")
                self._log(f"   Approved: {review_result.approved}")
                self._log(f"   Issues Found: {len(review_result.issues_found)}")

            await self._publish_event(task_id, "review_complete", {
                "quality_score": review_result.quality_score,
                "approved": review_result.approved,
                "issues": len(review_result.issues_found)
            })

            self._update_task_state(task_id, {
                "review_result": {
                    "approved": review_result.approved,
                    "quality_score": review_result.quality_score,
                    "feedback": review_result.feedback,
                    "issues_found": review_result.issues_found,
                    "suggestions": review_result.suggestions,
                }
            })

            # ============================================
            # PHASE 4: ITERATIVE REFINEMENT
            # ============================================
            refinement_iteration = 0

            while not review_result.approved and refinement_iteration < self.max_refinement_iterations:
                refinement_iteration += 1

                if self.verbose:
                    self._log("\n" + "="*70)
                    self._log(f"PHASE 4: REFINEMENT (Iteration {refinement_iteration})")
                    self._log("="*70)

                await self._publish_event(task_id, "phase_start", {
                    "phase": "refinement",
                    "iteration": refinement_iteration
                })

                # Re-execute with refinement feedback
                refinement_result = await self.dispatcher.execute_task({
                    "task_id": f"{task_id}_refine_{refinement_iteration}",
                    "goal": user_goal,
                    "enriched_plan": enrichment_result.execution_plan,
                    "context": {
                        **context,
                        "refinement_feedback": review_result.suggestions,
                        "issues_to_fix": review_result.issues_found
                    },
                    "hint": "CODE"
                })

                # Re-review
                review_request = ReviewRequest(
                    task_title=user_goal,
                    task_description=user_goal,
                    requirements=[],
                    code="\n".join([f"# {f}" for f in refinement_result.files_created]),
                    output="",
                    iteration=refinement_iteration
                )
                review_result = await reviewer.review(review_request)

                if self.verbose:
                    self._log(f"\n✅ Refinement {refinement_iteration} complete:")
                    self._log(f"   Quality Score: {review_result.quality_score}/10")
                    self._log(f"   Approved: {review_result.approved}")

                await self._publish_event(task_id, "refinement_complete", {
                    "iteration": refinement_iteration,
                    "quality_score": review_result.quality_score,
                    "approved": review_result.approved
                })

            # ============================================
            # PHASE 5: DOCUMENTATION
            # ============================================
            if self.verbose:
                self._log("\n" + "="*70)
                self._log("PHASE 5: DOCUMENTATION")
                self._log("="*70)

            await self._publish_event(task_id, "phase_start", {"phase": "documentation"})

            documenter = GeminiAgent(agent_id=f"documenter-{task_id}")

            documentation = await documenter.generate_docs(
                files=implementation_result.files_created,
                goal=user_goal,
                project_root=self.project_root
            )

            if self.verbose:
                self._log(f"\n✅ Documentation complete:")
                self._log(f"   Files Generated: {len(documentation)}")

            await self._publish_event(task_id, "documentation_complete", {
                "files_generated": len(documentation)
            })

            if documentation:
                self._update_task_state(task_id, {
                    "documentation": documentation
                })

            # ============================================
            # PHASE 6: FINALIZATION
            # ============================================
            if self.verbose:
                self._log("\n" + "="*70)
                self._log("PHASE 6: FINALIZATION")
                self._log("="*70)

            await self._publish_event(task_id, "phase_start", {"phase": "finalization"})

            # Calculate total cost
            total_cost = self._calculate_total_cost(
                enrichment_result,
                implementation_result,
                review_result,
                documentation,
                refinement_iteration
            )

            final_result = {
                "success": review_result.approved,
                "task_id": task_id,
                "quality_score": review_result.quality_score,
                "enrichment": {
                    "confidence": enrichment_result.final_confidence_score,
                    "ai_contributors": len(enrichment_result.enrichments),
                    "risks": enrichment_result.risks_identified
                },
                "implementation": {
                    "files_created": implementation_result.files_created,
                    "tests_created": implementation_result.tests_created
                },
                "review": {
                    "quality_score": review_result.quality_score,
                    "approved": review_result.approved,
                    "issues": review_result.issues_found,
                    "suggestions": review_result.suggestions
                },
                "refinement": {
                    "iterations": refinement_iteration,
                    "final_approved": review_result.approved
                },
                "documentation": documentation,
                "cost": total_cost
            }

            if self.verbose:
                self._log(f"\n✅ Orchestration complete:")
                self._log(f"   Success: {final_result['success']}")
                self._log(f"   Quality Score: {final_result['quality_score']}/10")
                self._log(f"   Refinement Iterations: {refinement_iteration}")
                self._log(f"   Total Cost: ${total_cost:.4f}")

            await self._publish_event(task_id, "orchestration_complete", final_result)

            summary_text = (
                f"Quality Score: {review_result.quality_score}/10. "
                f"{'Approved' if review_result.approved else 'Requires refinement'}."
            )
            self._update_task_state(task_id, {
                "summary": summary_text,
                "final_result": final_result
            })

            # ============================================
            # SAVE TO OBSIDIAN FOR AGENT MEMORY
            # ============================================
            try:
                # Save task documentation to Obsidian
                project_name = context.get("project_name")
                self.obsidian.save_task_documentation(
                    task_id=task_id,
                    goal=user_goal,
                    result=final_result,
                    project_name=project_name
                )

                # Save generated documentation to Obsidian
                for doc_file, doc_content in documentation.items():
                    self.obsidian.save_generated_documentation(
                        doc_name=doc_file,
                        content=doc_content,
                        project_name=project_name,
                        tags=["ai-generated", "gemini"]
                    )

                if self.verbose:
                    self._log(f"\n📚 Documentation saved to Obsidian vault")
            except Exception as e:
                if self.verbose:
                    self._log(f"\n⚠️  Failed to save to Obsidian: {e}")

            # Publish manager_complete event for frontend visualization
            self.redis_publisher.publish_event(
                action="manager_complete",
                status="completed",
                actor="Unified Orchestrator",
                task_id=task_id,
                meta={"success": review_result.approved, "quality_score": review_result.quality_score}
            )

            return final_result

        except Exception as e:
            if self.verbose:
                self._log(f"\n❌ Orchestration failed: {e}")

            await self._publish_event(task_id, "orchestration_failed", {
                "error": str(e)
            })

            raise

    async def _publish_event(self, task_id: str, event_type: str, data: Dict[str, Any]):
        """Publish orchestration event to Redis"""
        try:
            status_map = {
                "phase_start": "started",
                "enrichment_complete": "completed",
                "execution_complete": "completed",
                "review_complete": "completed",
                "refinement_complete": "completed",
                "documentation_complete": "completed",
                "orchestration_complete": "completed",
                "orchestration_failed": "failed"
            }
            status = status_map.get(event_type, "in_progress")

            self.redis_publisher.publish_event(
                action=event_type,
                status=status,
                actor="Unified Orchestrator",
                task_id=task_id,
                meta=data
            )

            updates: Dict[str, Any] = {}
            if event_type == "phase_start":
                phase = data.get("phase")
                phase_status_map = {
                    "enrichment": "planning",
                    "execution": "executing",
                    "review": "reviewing",
                    "refinement": "refining",
                    "documentation": "documenting",
                    "finalization": "finalizing"
                }
                if phase in phase_status_map:
                    updates["status"] = phase_status_map[phase]
                if phase == "refinement" and "iteration" in data:
                    updates["refinement_iteration"] = data["iteration"]
            elif event_type == "orchestration_complete":
                updates["status"] = "completed"
            elif event_type == "orchestration_failed":
                updates["status"] = "failed"
                if "error" in data:
                    updates["error"] = data["error"]

            if updates:
                self._update_task_state(task_id, updates)
        except Exception as e:
            if self.verbose:
                self._log(f"⚠️  Failed to publish event: {e}")

    def _calculate_total_cost(
        self,
        enrichment_result,
        implementation_result,
        review_result,
        documentation,
        refinement_iterations: int
    ) -> float:
        """Calculate total orchestration cost"""
        # Rough cost estimates
        enrichment_cost = 0.05  # Multi-AI enrichment
        implementation_cost = 0.10 * (1 + refinement_iterations)  # Codex
        review_cost = 0.05 * (1 + refinement_iterations)  # Claude Code
        documentation_cost = 0.02  # Gemini

        return enrichment_cost + implementation_cost + review_cost + documentation_cost
