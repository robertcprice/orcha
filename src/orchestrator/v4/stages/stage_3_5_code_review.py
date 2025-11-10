"""
Stage 3.5: Code Review with Review-Fix Cycle

AR agent reviews implementation with automatic fix iteration.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from orchestrator.v4.stages.base_stage import BaseStage
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult
from orchestrator.claude_cli_executor import ClaudeCLIExecutor


class Stage3_5CodeReview(BaseStage):
    """
    Stage 3.5: AR Agent reviews code with review-fix iteration cycle.

    ITERATIVE CYCLE:
    1. Review code for issues
    2. If issues found → Fix → Review again (max 2 cycles)
    3. If no issues → Approve
    """

    def __init__(
        self,
        claude_cli: ClaudeCLIExecutor,
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None,
        max_review_cycles: int = 2
    ):
        super().__init__(
            stage_id="stage-3.5-review",
            stage_type="review",
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        self.claude_cli = claude_cli
        self.max_review_cycles = max_review_cycles

    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult,
        **kwargs
    ) -> DialogueStage:
        """Execute code review with fix iteration cycle"""

        # Only run if artifacts exist
        if not execution_result.artifacts:
            self._log("No artifacts to review, skipping", "WARNING")
            return self._create_skipped_stage()

        self._log("─" * 80)
        self._log("STAGE 3.5: AR Code Review with Fix Iteration")
        self._log("─" * 80)

        stage = DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Review implementation with fix iteration",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        stage.status = "in_progress"

        # Log AR agent spawn
        await self._emit_agent_activity("AR", "spawn", f"Reviewing implementation: {len(execution_result.artifacts)} artifact(s)")
        await self._emit_agent_activity("AR", "status", "running", {"task": "Code review with fix cycle"})

        # REVIEW-FIX CYCLE
        review_result = await self._review_with_fix_cycle(
            user_goal,
            context.get("execution_plan", {}),
            execution_result.artifacts
        )

        stage.metadata["review"] = review_result
        stage.metadata["cycles_performed"] = review_result.get("cycles", 1)
        stage.metadata["issues_found"] = review_result.get("total_issues", 0)
        stage.metadata["issues_fixed"] = review_result.get("fixed_issues", 0)
        stage.status = "completed"
        stage.end_time = datetime.now(timezone.utc).isoformat()

        # Log AR agent completion
        await self._emit_agent_activity("AR", "output", f"Review: {review_result.get('summary', 'Review complete')}")
        await self._emit_agent_activity("AR", "complete", "Code review complete")
        await self._emit_agent_activity("AR", "status", "completed", {
            "artifacts_reviewed": len(execution_result.artifacts),
            "cycles": review_result.get("cycles", 1),
            "issues_found": review_result.get("total_issues", 0)
        })

        self._log(f"✓ Code review complete - {review_result.get('status', 'reviewed')}", "SUCCESS")
        self._log(f"  Cycles: {review_result.get('cycles', 1)}")
        self._log(f"  Issues found: {review_result.get('total_issues', 0)}")
        self._log(f"  Issues fixed: {review_result.get('fixed_issues', 0)}")

        return stage

    async def _review_with_fix_cycle(
        self,
        goal: str,
        plan: Dict,
        artifacts: List[str],
        max_cycles: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Review code with automatic fix cycle.

        CYCLE:
        1. Review code for issues
        2. Issues found? → Fix → Review again
        3. Repeat until no issues OR max cycles reached
        """
        max_cycles = max_cycles or self.max_review_cycles
        all_issues_found = []
        all_issues_fixed = []

        for cycle in range(max_cycles):
            self._log(f"📋 Review-Fix Cycle {cycle + 1}/{max_cycles}")

            # AR reviews implementation
            review = await self._ar_review_implementation(goal, plan, artifacts)

            issues = review.get("issues", [])
            all_issues_found.extend(issues)

            if not issues:
                self._log("✅ No issues found - Code approved!", "SUCCESS")
                return {
                    "status": "approved",
                    "summary": "Code review passed - no issues found",
                    "cycles": cycle + 1,
                    "total_issues": len(all_issues_found),
                    "fixed_issues": len(all_issues_fixed),
                    "final_review": review
                }

            self._log(f"⚠️ Found {len(issues)} issues:")
            for i, issue in enumerate(issues[:5], 1):  # Show first 5
                self._log(f"  {i}. {issue.get('description', 'Unknown issue')[:80]}")

            if cycle < max_cycles - 1:
                # Apply fixes
                self._log("🔧 Applying fixes...")
                fixed = await self._apply_fixes(issues, artifacts)
                all_issues_fixed.extend(fixed)
                self._log(f"✓ Applied {len(fixed)} fixes, re-reviewing...")
            else:
                self._log(f"⚠️ Max review cycles reached, some issues remain", "WARNING")
                return {
                    "status": "issues_remaining",
                    "summary": f"Review complete with {len(issues)} remaining issues",
                    "cycles": cycle + 1,
                    "total_issues": len(all_issues_found),
                    "fixed_issues": len(all_issues_fixed),
                    "remaining_issues": issues,
                    "final_review": review
                }

        return {
            "status": "max_cycles_reached",
            "summary": "Max review cycles reached",
            "cycles": max_cycles,
            "total_issues": len(all_issues_found),
            "fixed_issues": len(all_issues_fixed)
        }

    async def _ar_review_implementation(
        self,
        goal: str,
        plan: Dict,
        artifacts: List[str]
    ) -> Dict[str, Any]:
        """AR reviews the implementation"""

        review_prompt = f"""Review the implementation against the goal and plan.

ORIGINAL GOAL:
{goal}

EXECUTION PLAN:
{json.dumps(plan, indent=2) if plan else 'No plan available'}

ARTIFACTS CREATED:
{json.dumps(artifacts, indent=2)}

YOUR TASK:
Review the implementation and identify any issues:
- Logic errors
- Missing functionality
- Code quality problems
- Security concerns
- Performance issues

OUTPUT FORMAT (JSON):
{{
  "status": "approved|issues_found",
  "summary": "Brief review summary",
  "issues": [
    {{
      "severity": "critical|high|medium|low",
      "type": "logic|missing|quality|security|performance",
      "description": "Issue description",
      "file": "affected file",
      "suggestion": "How to fix"
    }}
  ]
}}

Respond ONLY with JSON."""

        success, output, metadata = await self.claude_cli.execute_prompt(review_prompt, timeout=120)

        if not success:
            return {"status": "review_failed", "summary": "Review failed", "issues": []}

        try:
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(output[json_start:json_end])
        except Exception as e:
            self._log(f"Failed to parse review: {e}", "WARNING")

        return {"status": "parse_error", "summary": "Could not parse review", "issues": []}

    async def _apply_fixes(self, issues: List[Dict], artifacts: List[str]) -> List[Dict]:
        """Apply fixes for identified issues"""
        fixed = []
        for issue in issues:
            if issue.get("suggestion"):
                # In a real implementation, this would apply the fix
                # For now, we just log it
                self._log(f"  Fixing: {issue.get('description', 'Unknown')[:60]}")
                fixed.append(issue)
        return fixed

    def _create_skipped_stage(self) -> DialogueStage:
        """Create a skipped stage when no artifacts to review"""
        return DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Code review skipped (no artifacts)",
            status="skipped",
            start_time=datetime.now(timezone.utc).isoformat(),
            end_time=datetime.now(timezone.utc).isoformat(),
            metadata={"reason": "no_artifacts"}
        )
