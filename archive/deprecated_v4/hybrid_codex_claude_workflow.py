#!/usr/bin/env python3
"""
Hybrid Codex-Claude Workflow Orchestrator

Coordinates between Codex (implementation) and Claude (review) agents:
1. Codex implements the task
2. Claude reviews the implementation
3. If approved: Done
4. If needs revision: Codex refines based on feedback
5. Repeat until approved or max iterations

This creates a quality-driven development loop where:
- Codex focuses on fast implementation
- Claude ensures quality and correctness
- Iteration continues until standards are met
"""

import os
import asyncio
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

from orchestrator.codex_agent import CodexAgent, CodexTask, CodexResult
from orchestrator.claude_review_agent import ClaudeReviewAgent, ReviewRequest, ReviewResult


@dataclass
class HybridWorkflowResult:
    """Final result from hybrid workflow"""
    success: bool
    final_code: Optional[str] = None
    final_output: Optional[str] = None
    iterations: int = 0
    total_time: float = 0.0
    quality_score: float = 0.0
    codex_iterations: int = 0
    claude_reviews: int = 0
    error: Optional[str] = None


class HybridCodexClaudeWorkflow:
    """
    Orchestrates hybrid workflow between Codex and Claude agents.

    Workflow:
    1. Create Codex agent with task
    2. Codex implements
    3. Create Claude review agent
    4. Claude reviews
    5. If not approved: Codex refines with feedback
    6. Repeat 4-5 until approved or max iterations
    7. Return final approved implementation
    """

    def __init__(
        self,
        task_id: str,
        title: str,
        description: str,
        requirements: List[str],
        context: Dict = None,
        max_iterations: int = 3
    ):

        self.task_id = task_id
        self.title = title
        self.description = description
        self.requirements = requirements
        self.context = context or {}
        self.max_iterations = max_iterations

        # Agents (created on demand)
        self.codex_agent: Optional[CodexAgent] = None
        self.claude_agent: Optional[ClaudeReviewAgent] = None

        # Workflow state
        self.current_iteration = 0
        self.codex_results: List[CodexResult] = []
        self.claude_reviews: List[ReviewResult] = []

    async def execute(self) -> HybridWorkflowResult:
        """
        Execute the hybrid workflow.

        Returns:
            HybridWorkflowResult with final approved implementation
        """

        start_time = datetime.now()

        print(f"\n{'='*80}")
        print(f"🔄 HYBRID WORKFLOW: {self.title}")
        print(f"{'='*80}\n")

        try:
            # Step 1: Initial Codex implementation
            print(f"📝 Step 1: Codex implementation...")
            codex_result = await self._run_codex_implementation()

            if not codex_result.success:
                return HybridWorkflowResult(
                    success=False,
                    error=f"Codex initial implementation failed: {codex_result.error}",
                    total_time=(datetime.now() - start_time).total_seconds()
                )

            self.codex_results.append(codex_result)
            self.current_iteration += 1

            # Step 2: Iterative review and refinement loop
            while self.current_iteration <= self.max_iterations:

                print(f"\n🔍 Step {self.current_iteration + 1}: Claude review...")

                # Claude reviews Codex output
                review_result = await self._run_claude_review(codex_result)
                self.claude_reviews.append(review_result)

                # Check if approved
                if review_result.approved:
                    print(f"\n✅ APPROVED after {self.current_iteration} iteration(s)!")
                    print(f"   Quality Score: {review_result.quality_score:.1f}/10")

                    return HybridWorkflowResult(
                        success=True,
                        final_code=codex_result.code,
                        final_output=codex_result.output,
                        iterations=self.current_iteration,
                        total_time=(datetime.now() - start_time).total_seconds(),
                        quality_score=review_result.quality_score,
                        codex_iterations=len(self.codex_results),
                        claude_reviews=len(self.claude_reviews)
                    )

                # Not approved - check if we can iterate
                if self.current_iteration >= self.max_iterations:
                    print(f"\n⚠️  Max iterations reached without approval")

                    return HybridWorkflowResult(
                        success=False,
                        final_code=codex_result.code,
                        final_output=codex_result.output,
                        iterations=self.current_iteration,
                        total_time=(datetime.now() - start_time).total_seconds(),
                        quality_score=review_result.quality_score,
                        codex_iterations=len(self.codex_results),
                        claude_reviews=len(self.claude_reviews),
                        error="Max iterations reached without approval"
                    )

                # Refine with Claude's feedback
                print(f"\n🔧 Step {self.current_iteration + 2}: Codex refinement...")
                print(f"   Feedback: {review_result.feedback[:200]}...")

                codex_result = await self._run_codex_refinement(review_result.feedback)

                if not codex_result.success:
                    return HybridWorkflowResult(
                        success=False,
                        error=f"Codex refinement failed: {codex_result.error}",
                        iterations=self.current_iteration,
                        total_time=(datetime.now() - start_time).total_seconds(),
                        codex_iterations=len(self.codex_results),
                        claude_reviews=len(self.claude_reviews)
                    )

                self.codex_results.append(codex_result)
                self.current_iteration += 1

            # Should never reach here, but handle it
            return HybridWorkflowResult(
                success=False,
                error="Unexpected workflow termination",
                iterations=self.current_iteration,
                total_time=(datetime.now() - start_time).total_seconds(),
                codex_iterations=len(self.codex_results),
                claude_reviews=len(self.claude_reviews)
            )

        except Exception as e:
            print(f"\n❌ Workflow error: {e}")

            return HybridWorkflowResult(
                success=False,
                error=str(e),
                iterations=self.current_iteration,
                total_time=(datetime.now() - start_time).total_seconds(),
                codex_iterations=len(self.codex_results),
                claude_reviews=len(self.claude_reviews)
            )

    async def _run_codex_implementation(self) -> CodexResult:
        """Run initial Codex implementation."""

        # Create Codex agent if not exists
        if not self.codex_agent:
            task = CodexTask(
                task_id=self.task_id,
                title=self.title,
                description=self.description,
                requirements=self.requirements,
                context=self.context
            )

            self.codex_agent = CodexAgent(
                agent_id=f"codex-{self.task_id[:8]}",
                task=task
            )

        # Execute
        return await self.codex_agent.execute()

    async def _run_codex_refinement(self, feedback: str) -> CodexResult:
        """Run Codex refinement based on Claude feedback."""

        if not self.codex_agent:
            raise ValueError("Codex agent not initialized")

        return await self.codex_agent.refine_with_feedback(feedback)

    async def _run_claude_review(self, codex_result: CodexResult) -> ReviewResult:
        """Run Claude review of Codex output."""

        # Create Claude agent if not exists
        if not self.claude_agent:
            self.claude_agent = ClaudeReviewAgent(
                agent_id=f"claude-{self.task_id[:8]}"
            )

        # Create review request
        request = ReviewRequest(
            task_title=self.title,
            task_description=self.description,
            requirements=self.requirements,
            code=codex_result.code or "",
            output=codex_result.output or "",
            iteration=self.current_iteration
        )

        # Execute review
        return await self.claude_agent.review(request)


# Convenience function for orchestrator
async def run_hybrid_workflow(
    task_id: str,
    title: str,
    description: str,
    requirements: List[str],
    context: Dict = None,
    max_iterations: int = 3
) -> HybridWorkflowResult:
    """
    Run a hybrid Codex-Claude workflow.

    Args:
        task_id: Unique task identifier
        title: Task title
        description: Task description
        requirements: List of requirements
        context: Additional context
        max_iterations: Max refinement iterations

    Returns:
        HybridWorkflowResult with final implementation
    """

    workflow = HybridCodexClaudeWorkflow(
        task_id=task_id,
        title=title,
        description=description,
        requirements=requirements,
        context=context,
        max_iterations=max_iterations
    )

    return await workflow.execute()


# Main for testing
if __name__ == "__main__":
    async def test():
        result = await run_hybrid_workflow(
            task_id="test-001",
            title="Create a simple calculator",
            description="Create a Python calculator with add, subtract, multiply, divide",
            requirements=[
                "Support basic arithmetic operations",
                "Handle division by zero",
                "Include error handling",
                "Add unit tests"
            ],
            context={"language": "Python", "style": "functional"},
            max_iterations=3
        )

        print(f"\n{'='*80}")
        print(f"FINAL RESULT:")
        print(f"{'='*80}")
        print(f"Success: {result.success}")
        print(f"Iterations: {result.iterations}")
        print(f"Quality Score: {result.quality_score:.1f}/10")
        print(f"Total Time: {result.total_time:.2f}s")

        if result.final_code:
            print(f"\nFinal Code:\n{result.final_code}")

    asyncio.run(test())
