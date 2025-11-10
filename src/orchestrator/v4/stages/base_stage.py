"""
Base stage interface for orchestrator stages

All stages inherit from BaseStage to ensure consistent interface.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Callable
from orchestrator.v4.types import DialogueStage, IterativeExecutionResult


class BaseStage(ABC):
    """
    Base class for all orchestrator stages.

    Each stage represents a distinct phase in the orchestration pipeline:
    - Stage 0: Multi-AI Planning
    - Stage 1: Claude Analysis
    - Stage 3: Iterative Execution
    - Stage 3.5: Code Review
    - Stage 4: Final Summary
    """

    def __init__(
        self,
        stage_id: str,
        stage_type: str,
        verbose: bool = True,
        agent_activity_callback: Optional[Callable] = None
    ):
        """
        Initialize base stage.

        Args:
            stage_id: Unique identifier for this stage (e.g., "stage-0-planning")
            stage_type: Type of stage (e.g., "planning", "execution", "review")
            verbose: Enable verbose logging
            agent_activity_callback: Async callback for agent activity events
        """
        self.stage_id = stage_id
        self.stage_type = stage_type
        self.verbose = verbose
        self.agent_activity_callback = agent_activity_callback

    @abstractmethod
    async def execute(
        self,
        user_goal: str,
        context: Dict[str, Any],
        execution_result: IterativeExecutionResult,
        **kwargs
    ) -> DialogueStage:
        """
        Execute this stage and return stage result.

        Args:
            user_goal: User's goal/task description
            context: Additional context from previous stages
            execution_result: Current execution result (accumulates stages)
            **kwargs: Stage-specific parameters

        Returns:
            DialogueStage with execution results and metadata

        Raises:
            Exception: If stage execution fails critically
        """
        pass

    def _log(self, message: str, level: str = "INFO"):
        """
        Log message if verbose enabled.

        Args:
            message: Message to log
            level: Log level (INFO, WARNING, ERROR)
        """
        if self.verbose:
            prefix = {
                "INFO": "ℹ️",
                "WARNING": "⚠️",
                "ERROR": "❌",
                "SUCCESS": "✅"
            }.get(level, "📝")
            print(f"{prefix} [{self.stage_id}] {message}")

    async def _emit_agent_activity(
        self,
        agent_role: str,
        activity_type: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Emit agent activity event via callback.

        Args:
            agent_role: Agent identifier (PP, IM, AR, RD, CHATGPT, etc.)
            activity_type: Type of activity (spawn, output, complete, error, status)
            message: Activity message
            metadata: Additional metadata
        """
        if self.agent_activity_callback:
            await self.agent_activity_callback(
                agent_role,
                activity_type,
                message,
                metadata or {}
            )
