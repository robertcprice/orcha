#!/usr/bin/env python3
"""
Hybrid Codex-Claude Workflow (MCP Version)

Uses the CORRECT approach:
- Codex via MCP server (codex mcp-server)
- Claude Code via CLI (bash invocation)

Workflow:
1. Codex MCP agent implements the task
2. Claude Code agent reviews the implementation (via CLI)
3. If approved: Done
4. If needs revision: Codex refines via codex-reply
5. Repeat until approved or max iterations
"""

import os
import asyncio
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

from orchestrator.codex_mcp_agent import CodexMCPAgent, CodexTask, CodexResult
from orchestrator.claude_code_agent import ClaudeCodeAgent, ReviewRequest, ReviewResult


@dataclass
class HybridWorkflowResult:
    """Final result from hybrid workflow"""
    success: bool
    final_output: Optional[str] = None
    conversation_id: Optional[str] = None
    iterations: int = 0
    total_time: float = 0.0
    quality_score: float = 0.0
    codex_iterations: int = 0
    claude_reviews: int = 0
    error: Optional[str] = None


class HybridCodexClaudeMCPWorkflow:
    """
    Orchestrates hybrid workflow between Codex MCP and Claude.

    This uses the CORRECT Codex integration via MCP server.
    """

    def __init__(
        self,
        task_id: str,
        title: str,
        description: str,
        requirements: List[str],
        cwd: str = ".",
        context: Dict = None,
        max_iterations: int = 3
    ):
        self.task_id = task_id
        self.title = title
        self.description = description
        self.requirements = requirements
        self.cwd = cwd
        self.context = context or {}
        self.max_iterations = max_iterations

        # Agents
        self.codex_agent: Optional[CodexMCPAgent] = None
        self.claude_agent: Optional[ClaudeCodeAgent] = None

        # State
        self.current_iteration = 0
        self.codex_results: List[CodexResult] = []
        self.claude_reviews: List[ReviewResult] = []

    async def execute(self) -> HybridWorkflowResult:
        """
        Execute the hybrid workflow.

        Returns:
            HybridWorkflowResult with final implementation
        """
        start_time = datetime.now()

        print(f"\n{'='*80}")
        print(f"🔄 HYBRID WORKFLOW (MCP): {self.title}")
        print(f"{'='*80}\n")

        try:
            # Step 1: Initial Codex implementation via MCP
            print(f"📝 Step 1: Codex implementation via MCP server...")
            codex_result = await self._run_codex_implementation()

            if not codex_result.success:
                return HybridWorkflowResult(
                    success=False,
                    error=f"Codex initial implementation failed: {codex_result.error}",
                    total_time=(datetime.now() - start_time).total_seconds()
                )

            self.codex_results.append(codex_result)
            self.current_iteration += 1

            # Step 2: Iterative review and refinement
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
                        final_output=codex_result.output,
                        conversation_id=codex_result.conversation_id,
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
                        final_output=codex_result.output,
                        conversation_id=codex_result.conversation_id,
                        iterations=self.current_iteration,
                        total_time=(datetime.now() - start_time).total_seconds(),
                        quality_score=review_result.quality_score,
                        codex_iterations=len(self.codex_results),
                        claude_reviews=len(self.claude_reviews),
                        error="Max iterations reached without approval"
                    )

                # Refine with Claude's feedback via codex-reply
                print(f"\n🔧 Step {self.current_iteration + 2}: Codex refinement via MCP...")
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

            # Should never reach here
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
        """Run initial Codex implementation via MCP."""
        # Create Codex MCP agent
        task = CodexTask(
            task_id=self.task_id,
            title=self.title,
            description=self.description,
            requirements=self.requirements,
            cwd=self.cwd,
            sandbox="workspace-write",
            approval_policy="never"
        )

        self.codex_agent = CodexMCPAgent(
            agent_id=f"codex-{self.task_id[:8]}",
            task=task
        )

        # Execute via MCP
        return await self.codex_agent.execute()

    async def _run_codex_refinement(self, feedback: str) -> CodexResult:
        """Run Codex refinement via codex-reply MCP tool."""
        if not self.codex_agent:
            raise ValueError("Codex agent not initialized")

        return await self.codex_agent.refine_with_feedback(feedback)

    async def _run_claude_review(self, codex_result: CodexResult) -> ReviewResult:
        """Run Claude Code review of Codex output."""
        # Create Claude Code agent if not exists
        if not self.claude_agent:
            self.claude_agent = ClaudeCodeAgent(
                agent_id=f"claude-{self.task_id[:8]}"
            )

        # Create review request
        request = ReviewRequest(
            task_title=self.title,
            task_description=self.description,
            requirements=self.requirements,
            code=codex_result.output or "",
            output=codex_result.output or "",
            iteration=self.current_iteration
        )

        # Execute review
        return await self.claude_agent.review(request)


# Convenience function
async def run_hybrid_mcp_workflow(
    task_id: str,
    title: str,
    description: str,
    requirements: List[str],
    cwd: str = ".",
    context: Dict = None,
    max_iterations: int = 3
) -> HybridWorkflowResult:
    """
    Run a hybrid Codex-Claude workflow using MCP.

    Args:
        task_id: Unique task identifier
        title: Task title
        description: Task description
        requirements: List of requirements
        cwd: Working directory for Codex
        context: Additional context
        max_iterations: Max refinement iterations

    Returns:
        HybridWorkflowResult with final implementation
    """
    workflow = HybridCodexClaudeMCPWorkflow(
        task_id=task_id,
        title=title,
        description=description,
        requirements=requirements,
        cwd=cwd,
        context=context,
        max_iterations=max_iterations
    )

    return await workflow.execute()


# Main for testing
if __name__ == "__main__":
    async def test():
        result = await run_hybrid_mcp_workflow(
            task_id="test-calc",
            title="Create calculator",
            description="Create a simple Python calculator",
            requirements=[
                "Support add, subtract, multiply, divide",
                "Handle division by zero",
                "Include tests"
            ],
            cwd=".",
            max_iterations=2
        )

        print(f"\n{'='*80}")
        print("FINAL RESULT")
        print("="*80)
        print(f"Success: {result.success}")
        print(f"Iterations: {result.iterations}")
        print(f"Quality Score: {result.quality_score:.1f}/10")
        print(f"Total Time: {result.total_time:.1f}s")

        if result.error:
            print(f"\nError: {result.error}")

    asyncio.run(test())
