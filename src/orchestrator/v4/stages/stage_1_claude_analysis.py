"""
Stage 1: Claude Initial Analysis

Claude analyzes the user's goal and identifies what information is needed.
"""

import json
from dataclasses import is_dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from orchestrator.v4.stages.base_stage import BaseStage
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult, InformationRequest
from orchestrator.claude_cli_executor import ClaudeCLIExecutor


def _serialize_for_json(obj: Any) -> Any:
    """Convert dataclasses and other non-JSON-serializable objects to dicts"""
    if is_dataclass(obj) and not isinstance(obj, type):
        return asdict(obj)
    elif isinstance(obj, dict):
        return {k: _serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_serialize_for_json(item) for item in obj]
    return obj


class Stage1ClaudeAnalysis(BaseStage):
    """
    Stage 1: Claude analyzes goal and identifies information needs.

    This stage has Claude analyze the user's goal to determine what
    information or research is needed to complete the task effectively.
    """

    def __init__(
        self,
        claude_cli: ClaudeCLIExecutor,
        verbose: bool = True,
        agent_activity_callback: Optional[callable] = None
    ):
        super().__init__(
            stage_id="stage-1-analysis",
            stage_type="analysis",
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
        """Execute Claude initial analysis stage"""

        self._log("─" * 80)
        self._log("STAGE 1: Claude Initial Analysis")
        self._log("─" * 80)

        stage = DialogueStage(
            stage_id=self.stage_id,
            stage_type=self.stage_type,
            claude_action="Analyze goal and identify information needs",
            start_time=datetime.now(timezone.utc).isoformat()
        )
        stage.status = "in_progress"

        # Log PP agent spawn
        await self._emit_agent_activity("PP", "spawn", f"Analyzing goal: {user_goal[:100]}")
        await self._emit_agent_activity("PP", "status", "running", {"task": "Goal analysis"})

        # Claude analyzes the goal
        info_request = await self._claude_initial_analysis(user_goal, context)

        # Log PP agent output
        await self._emit_agent_activity("PP", "output", f"Identified need: {info_request.query[:100]}")

        stage.metadata["info_request"] = {
            "request_id": info_request.request_id,
            "request_type": info_request.request_type,
            "query": info_request.query  # NO TRUNCATION
        }
        stage.status = "completed"
        stage.end_time = datetime.now(timezone.utc).isoformat()

        # Log PP agent completion
        await self._emit_agent_activity("PP", "complete", f"Analysis complete: {info_request.request_type}")
        await self._emit_agent_activity("PP", "status", "completed", {"task": "Goal analysis"})

        self._log(f"✓ Claude identified information needs", "SUCCESS")
        self._log(f"  Request Type: {info_request.request_type}")
        self._log(f"  Query: {info_request.query}")

        return stage

    async def _claude_initial_analysis(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]]
    ) -> InformationRequest:
        """
        Claude analyzes the user goal and identifies what information it needs.

        Returns InformationRequest describing what Claude needs from ChatGPT.
        """

        analysis_prompt = f"""You are analyzing a user's request to determine what information you need to complete it effectively.

USER GOAL:
{user_goal}

ADDITIONAL CONTEXT:
{json.dumps(_serialize_for_json(context or {}), indent=2)}

YOUR TASK:
1. Analyze the goal to understand what's being asked
2. Identify what information would help you complete this goal
3. Formulate a specific request for the information system

AVAILABLE REQUEST TYPES:
- **web_search**: Search the internet for current information, documentation, tutorials, or best practices
- **research**: Deep research on technologies, concepts, or approaches
- **context**: Background information about project structure or existing code
- **advice**: Strategic guidance on implementation approach
- **examples**: Code examples or templates for similar implementations

WHEN TO USE WEB_SEARCH:
- Need current/latest information (APIs, libraries, frameworks)
- Looking for documentation or tutorials
- Researching best practices or common patterns
- Finding solutions to specific technical problems
- Discovering tools or libraries for a task

OUTPUT FORMAT (JSON):
{{
  "request_type": "web_search|research|context|advice|examples",
  "query": "Specific search query or question",
  "details": {{
    "why_needed": "Explanation of why this info is needed",
    "expected_help": "How this info will help complete the goal"
  }}
}}

IMPORTANT: Use web_search when you need current, specific information from the internet.

Respond ONLY with the JSON, no other text."""

        # Use Claude CLI for analysis
        success, output, metadata = await self.claude_cli.execute_prompt(
            analysis_prompt,
            timeout=120
        )

        if not success:
            # Fallback: create basic research request
            self._log("Analysis failed, using fallback request", "WARNING")

            return InformationRequest(
                request_id="req-fallback",
                requested_by="claude-analysis",
                request_type="context",
                query=f"Provide general guidance and best practices for: {user_goal}",
                details={"fallback": True}
            )

        # Parse Claude's response
        try:
            # Extract JSON from output (might have markdown code blocks)
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                request_data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in output")

            return InformationRequest(
                request_id="req-initial",
                requested_by="claude-analysis",
                request_type=request_data.get("request_type", "research"),
                query=request_data.get("query", ""),
                details=request_data.get("details", {})
            )

        except Exception as e:
            self._log(f"Failed to parse analysis: {e}", "WARNING")
            self._log("Using fallback request", "WARNING")

            return InformationRequest(
                request_id="req-fallback",
                requested_by="claude-analysis",
                request_type="context",
                query=f"Provide context and guidance for: {user_goal}",
                details={"parse_error": str(e)}
            )
