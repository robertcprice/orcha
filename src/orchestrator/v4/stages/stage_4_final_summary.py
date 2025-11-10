"""
Stage 4: Final Summary

Claude generates final documentation and summary of work completed.
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from orchestrator.v4.stages.base_stage import BaseStage
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult
from orchestrator.claude_cli_executor import ClaudeCLIExecutor


class Stage4FinalSummary(BaseStage):
    """
    Stage 4: RD Agent generates final summary and documentation.

    This stage has Claude create a comprehensive summary of the work
    completed, including accomplishments, files created, and next steps.
    """

    def __init__(
        self,
        claude_cli: ClaudeCLIExecutor,
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None
    ):
        super().__init__(
            stage_id="stage-4-summary",
            stage_type="summary",
            verbose=verbose,
            agent_activity_callback=agent_activity_callback
        )
        self.claude_cli = claude_cli

    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult,
        **kwargs
    ) -> DialogueStage:
        """Execute final summary stage"""

        self._log("─" * 80)
        self._log("STAGE 4: Final Summary")
        self._log("─" * 80)

        stage = DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Generate final summary",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        stage.status = "in_progress"

        # Log RD agent spawn
        await self._emit_agent_activity("RD", "spawn", "Generating final documentation and summary")
        await self._emit_agent_activity("RD", "status", "running", {"task": "Final summary"})

        # Claude generates final summary
        final_summary = await self._claude_generate_summary(execution_result)

        execution_result.final_summary = final_summary
        stage.metadata["summary_length"] = len(final_summary)
        stage.metadata["summary"] = final_summary  # Store full summary, NO TRUNCATION
        stage.status = "completed"
        stage.end_time = datetime.now(timezone.utc).isoformat()

        # Log RD agent completion
        await self._emit_agent_activity("RD", "output", f"Generated {len(final_summary)} character summary")
        await self._emit_agent_activity("RD", "complete", "Summary documentation complete")
        await self._emit_agent_activity("RD", "status", "completed", {"summary_length": len(final_summary)})

        self._log(f"✓ Summary generated ({len(final_summary)} chars)", "SUCCESS")
        self._log("─" * 80)
        self._log("FINAL SUMMARY")
        self._log("─" * 80)
        self._log(final_summary)  # Full summary, NO TRUNCATION

        return stage

    async def _claude_generate_summary(
        self,
        execution_result: IterativeExecutionResult
    ) -> str:
        """
        Claude generates a final summary of the work completed.
        """

        summary_prompt = f"""You completed a multi-turn collaborative task with ChatGPT.

ORIGINAL GOAL:
{execution_result.goal}

TOTAL DIALOGUE TURNS: {execution_result.total_dialogue_turns}
TOTAL TIME: {execution_result.total_time:.1f}s
STATUS: {execution_result.status}

STAGES COMPLETED:
{json.dumps([
    {
        "stage": s.stage_id,
        "type": s.stage_type,
        "status": s.status
    }
    for s in execution_result.stages
], indent=2)}

ARTIFACTS CREATED:
{json.dumps(execution_result.artifacts, indent=2)}

YOUR TASK:
Create a clear, user-friendly summary that explains:
1. What was accomplished
2. How the goal was achieved
3. What files were created/modified
4. Any important notes or next steps

Write the summary in plain language (not JSON)."""

        # Use Claude CLI for summary
        success, output, metadata = await self.claude_cli.execute_prompt(
            summary_prompt,
            timeout=120
        )

        if not success:
            self._log("Summary generation failed, using fallback", "WARNING")
            return f"Summary generation failed. Goal: {execution_result.goal}. Status: {execution_result.status}."

        return output  # Full output, NO TRUNCATION
