#!/usr/bin/env python3
"""
Agent Dispatcher - Routes tasks to appropriate agents

Routes execution tasks based on task type and agent capabilities:
- Codex agents: Heavy code implementation (cost-efficient)
- Claude agents: Code review, testing, refinement
- Gemini agent: Documentation and final review

Uses bash subprocess execution to avoid context overhead.
"""

import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, TYPE_CHECKING
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import agents
try:
    from orchestrator.codex_mcp_agent import CodexMCPAgent, CodexTask, CodexResult
except (ImportError, SyntaxError):  # pragma: no cover - optional dependency
    CodexMCPAgent = None  # type: ignore[assignment]
    CodexTask = None  # type: ignore[assignment]
    CodexResult = None  # type: ignore[assignment]

try:
    from orchestrator.claude_code_agent import ClaudeCodeAgent, ReviewRequest, ReviewResult
except (ImportError, SyntaxError):  # pragma: no cover - optional dependency
    ClaudeCodeAgent = None  # type: ignore[assignment]
    ReviewRequest = None  # type: ignore[assignment]
    ReviewResult = None  # type: ignore[assignment]

try:
    from orchestrator.gemini_agent import GeminiAgent, DocumentationRequest, DocumentationResult
except (ImportError, SyntaxError):  # pragma: no cover - optional dependency
    GeminiAgent = None  # type: ignore[assignment]
    DocumentationRequest = None  # type: ignore[assignment]
    DocumentationResult = None  # type: ignore[assignment]

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from orchestrator.codex_mcp_agent import CodexMCPAgent as _CodexMCPAgent
    from orchestrator.codex_mcp_agent import CodexTask as _CodexTask
    from orchestrator.codex_mcp_agent import CodexResult as _CodexResult
    from orchestrator.claude_code_agent import ClaudeCodeAgent as _ClaudeCodeAgent
    from orchestrator.claude_code_agent import ReviewRequest as _ReviewRequest
    from orchestrator.claude_code_agent import ReviewResult as _ReviewResult
    from orchestrator.gemini_agent import GeminiAgent as _GeminiAgent
    from orchestrator.gemini_agent import DocumentationRequest as _DocumentationRequest
    from orchestrator.gemini_agent import DocumentationResult as _DocumentationResult

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


class AgentType(Enum):
    """Types of agents available for task execution"""
    CODEX = "codex"  # Cost-efficient heavy code work
    CLAUDE = "claude"  # Code review and refinement
    GEMINI = "gemini"  # Documentation and final review


class TaskType(Enum):
    """Types of tasks that can be routed"""
    IMPLEMENTATION = "implementation"  # Code implementation
    REVIEW = "review"  # Code review
    TESTING = "testing"  # Test creation/improvement
    DOCUMENTATION = "documentation"  # Documentation generation
    REFACTORING = "refactoring"  # Code refactoring


@dataclass
class TaskRoute:
    """Defines routing for a task"""
    task_id: str
    task_type: TaskType
    primary_agent: AgentType
    fallback_agent: Optional[AgentType] = None
    requires_review: bool = True
    requires_tests: bool = True


@dataclass
class AgentResult:
    """Standardized result from any agent"""
    agent_type: AgentType
    task_id: str
    success: bool
    output: Optional[str] = None
    files_created: List[str] = field(default_factory=list)
    files_modified: List[str] = field(default_factory=list)
    tests_created: List[str] = field(default_factory=list)
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class AgentDispatcher:
    """
    Routes tasks to appropriate agents based on task type and requirements.

    Routing Strategy:
    - Implementation tasks → Codex (cost-efficient)
    - Review tasks → Claude (quality-focused)
    - Documentation → Gemini (comprehensive)
    - Testing → Both Codex and Claude
    - Refactoring → Codex with Claude review

    Cost Optimization:
    - Uses Codex for heavy lifting (cheaper)
    - Uses Claude for critical review
    - Tracks cost per agent
    """

    def __init__(
        self,
        project_root: Path = PROJECT_ROOT,
        enable_cost_tracking: bool = True,
        max_codex_retries: int = 2,
        max_claude_retries: int = 1,
        verbose: bool = True
    ):
        """
        Initialize Agent Dispatcher.

        Args:
            project_root: Project root directory
            enable_cost_tracking: Track costs per agent
            max_codex_retries: Maximum retries for Codex agent
            max_claude_retries: Maximum retries for Claude agent
            verbose: Enable verbose logging
        """
        self.project_root = project_root
        self.enable_cost_tracking = enable_cost_tracking
        self.max_codex_retries = max_codex_retries
        self.max_claude_retries = max_claude_retries
        self.verbose = verbose

        # Cost tracking
        self.costs = {
            AgentType.CODEX: 0.0,
            AgentType.CLAUDE: 0.0,
            AgentType.GEMINI: 0.0
        }

        # Agent instances cache
        self.claude_agent: Optional[ClaudeCodeAgent] = None
        self.gemini_agent: Optional[GeminiAgent] = None

        self._log("Agent Dispatcher initialized")

    def _log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            print(f"[AgentDispatcher] {message}")

    def determine_route(self, task: Dict[str, Any]) -> TaskRoute:
        """
        Determine the appropriate agent routing for a task.

        Args:
            task: Task dict with 'task_id', 'agent', 'description', etc.

        Returns:
            TaskRoute defining agent selection
        """
        task_id = str(task.get('task_id') or 'unknown')

        raw_description = task.get('description')
        description = raw_description.lower() if isinstance(raw_description, str) else ''

        raw_agent_hint = task.get('agent')
        agent_hint = raw_agent_hint.lower() if isinstance(raw_agent_hint, str) else ''

        # Determine task type from description and agent hint
        if any(keyword in description for keyword in ['implement', 'create', 'build', 'develop', 'code']):
            task_type = TaskType.IMPLEMENTATION
            primary_agent = AgentType.CODEX  # Cost-efficient for heavy work
            requires_review = True
            requires_tests = True

        elif any(keyword in description for keyword in ['review', 'check', 'validate', 'audit']):
            task_type = TaskType.REVIEW
            primary_agent = AgentType.CLAUDE  # Quality-focused
            requires_review = False  # Already a review task
            requires_tests = False

        elif any(keyword in description for keyword in ['test', 'unittest', 'integration test', 'e2e']):
            task_type = TaskType.TESTING
            primary_agent = AgentType.CODEX  # Can generate tests
            requires_review = True  # Claude should review tests
            requires_tests = False  # Is a testing task

        elif any(keyword in description for keyword in ['document', 'readme', 'docs', 'api doc']):
            task_type = TaskType.DOCUMENTATION
            primary_agent = AgentType.GEMINI  # Specialized for docs
            requires_review = False
            requires_tests = False

        elif any(keyword in description for keyword in ['refactor', 'optimize', 'clean up', 'restructure']):
            task_type = TaskType.REFACTORING
            primary_agent = AgentType.CODEX  # Can handle refactoring
            requires_review = True  # Claude should review changes
            requires_tests = True  # Ensure tests still pass

        else:
            # Default: implementation
            task_type = TaskType.IMPLEMENTATION
            primary_agent = AgentType.CODEX
            requires_review = True
            requires_tests = True

        # Override with agent hint if provided
        if 'claude' in agent_hint:
            primary_agent = AgentType.CLAUDE
        elif 'code' in agent_hint or 'codex' in agent_hint:
            primary_agent = AgentType.CODEX
        elif 'doc' in agent_hint or 'gemini' in agent_hint:
            primary_agent = AgentType.GEMINI

        return TaskRoute(
            task_id=task_id,
            task_type=task_type,
            primary_agent=primary_agent,
            fallback_agent=AgentType.CLAUDE if primary_agent == AgentType.CODEX else None,
            requires_review=requires_review,
            requires_tests=requires_tests
        )

    async def execute_task(
        self,
        task: Dict[str, Any],
        route: Optional[TaskRoute] = None
    ) -> AgentResult:
        """
        Execute a task using the appropriate agent.

        Args:
            task: Task dictionary
            route: Optional pre-determined route (will auto-determine if not provided)

        Returns:
            AgentResult with execution outcome
        """
        if route is None:
            route = self.determine_route(task)

        self._log(f"Executing task {route.task_id} with {route.primary_agent.value} agent")

        # Publish agent_spawned event for frontend visualization
        agent_id = f"{route.primary_agent.value}:{route.task_id}"
        await publish_event({
            "type": "agent_spawned",
            "hook_event_type": "agent_spawned",
            "source_app": "unified_orchestrator",
            "session_id": route.task_id,
            "agent_id": agent_id,
            "parent_agent_id": "orchestrator-root",
            "agent": route.primary_agent.value,
            "agent_type": route.primary_agent.value,
            "task_type": route.task_type.value,
            "payload": {
                "agent_id": agent_id,
                "parent_agent_id": "orchestrator-root",
                "agent": route.primary_agent.value,
                "agent_type": route.primary_agent.value,
                "task_type": route.task_type.value
            }
        })

        # Publish agent_started event
        await publish_event({
            "type": "agent_started",
            "hook_event_type": "agent_started",
            "source_app": "unified_orchestrator",
            "session_id": route.task_id,
            "agent_id": agent_id,
            "agent": route.primary_agent.value,
            "payload": {
                "agent_id": agent_id,
                "agent": route.primary_agent.value
            }
        })

        # Execute based on agent type
        if route.primary_agent == AgentType.CODEX:
            result = await self._execute_with_codex(task)
        elif route.primary_agent == AgentType.CLAUDE:
            result = await self._execute_with_claude(task)
        elif route.primary_agent == AgentType.GEMINI:
            result = await self._execute_with_gemini(task)
        else:
            result = AgentResult(
                agent_type=route.primary_agent,
                task_id=route.task_id,
                success=False,
                error=f"Unknown agent type: {route.primary_agent}"
            )

        # Track cost
        if self.enable_cost_tracking:
            self._update_cost(result)

        # Publish agent_completed event for frontend visualization
        await publish_event({
            "type": "agent_completed",
            "hook_event_type": "agent_completed",
            "source_app": "unified_orchestrator",
            "session_id": route.task_id,
            "agent_id": agent_id,
            "agent": route.primary_agent.value,
            "success": result.success,
            "payload": {
                "agent_id": agent_id,
                "agent": route.primary_agent.value,
                "success": result.success
            }
        })

        return result

    @staticmethod
    def _normalize_requirements(raw_requirements: Any) -> List[str]:
        """Coerce requirements input into a list of strings."""
        if not raw_requirements:
            return []
        if isinstance(raw_requirements, str):
            return [raw_requirements]
        if isinstance(raw_requirements, (list, tuple, set)):
            return [str(item) for item in raw_requirements]
        return [str(raw_requirements)]

    async def _execute_with_codex(self, task: Dict[str, Any]) -> AgentResult:
        """Execute task with Codex agent."""
        task_id = str(task.get('task_id') or 'unknown')

        if CodexTask is None or CodexMCPAgent is None or CodexResult is None:
            error = "Codex agent dependencies are not available."
            self._log(error)
            return AgentResult(
                agent_type=AgentType.CODEX,
                task_id=task_id,
                success=False,
                error=error
            )

        try:
            # Create Codex task
            codex_task = CodexTask(
                task_id=task_id,
                title=(task.get('description') or 'Unnamed task'),
                description=(task.get('description') or ''),
                requirements=self._normalize_requirements(task.get('acceptance_criteria')),
                cwd=str(self.project_root)
            )

            # Create and execute Codex agent
            codex_agent = CodexMCPAgent(
                agent_id=f"codex-{task_id}",
                task=codex_task
            )

            codex_result: CodexResult = await codex_agent.execute()

            return AgentResult(
                agent_type=AgentType.CODEX,
                task_id=task_id,
                success=codex_result.success,
                output=codex_result.output,
                files_created=codex_result.files_created or [],
                error=codex_result.error,
                metadata={
                    "conversation_id": codex_result.conversation_id,
                    "iterations": codex_result.iterations
                }
            )

        except Exception as e:
            self._log(f"Codex execution failed: {e}")
            return AgentResult(
                agent_type=AgentType.CODEX,
                task_id=task_id,
                success=False,
                error=str(e)
            )

    async def _execute_with_claude(self, task: Dict[str, Any]) -> AgentResult:
        """Execute task with Claude agent."""
        task_id = str(task.get('task_id') or 'unknown')

        if ClaudeCodeAgent is None or ReviewRequest is None or ReviewResult is None:
            error = "Claude agent dependencies are not available."
            self._log(error)
            return AgentResult(
                agent_type=AgentType.CLAUDE,
                task_id=task_id,
                success=False,
                error=error
            )

        try:
            # Initialize Claude agent if needed
            if self.claude_agent is None:
                self.claude_agent = ClaudeCodeAgent(
                    agent_id="claude-reviewer",
                    project_root=self.project_root
                )

            # For review tasks, we need the code to review
            # This would typically come from a previous Codex execution
            review_request = ReviewRequest(
                task_title=(task.get('description') or 'Code Review'),
                task_description=(task.get('description') or ''),
                requirements=self._normalize_requirements(task.get('acceptance_criteria')),
                code="",  # Would be populated from previous execution
                output="",
                iteration=0
            )

            review_result: ReviewResult = await self.claude_agent.review(review_request)

            return AgentResult(
                agent_type=AgentType.CLAUDE,
                task_id=task_id,
                success=review_result.approved,
                output=review_result.feedback,
                metadata={
                    "quality_score": review_result.quality_score,
                    "suggestions": review_result.suggestions,
                    "issues_found": review_result.issues_found
                }
            )

        except Exception as e:
            self._log(f"Claude execution failed: {e}")
            return AgentResult(
                agent_type=AgentType.CLAUDE,
                task_id=task_id,
                success=False,
                error=str(e)
            )

    async def _execute_with_gemini(self, task: Dict[str, Any]) -> AgentResult:
        """Execute task with Gemini agent."""
        task_id = str(task.get('task_id') or 'unknown')

        if GeminiAgent is None or DocumentationRequest is None or DocumentationResult is None:
            error = "Gemini agent dependencies are not available."
            self._log(error)
            return AgentResult(
                agent_type=AgentType.GEMINI,
                task_id=task_id,
                success=False,
                error=error
            )

        try:
            # Initialize Gemini agent if needed
            if self.gemini_agent is None:
                self.gemini_agent = GeminiAgent(agent_id="gemini-documenter")

            # For documentation tasks
            doc_request = DocumentationRequest(
                task_title=(task.get('description') or 'Generate Documentation'),
                task_description=(task.get('description') or ''),
                code_files={},  # Would be populated from execution results
                test_files={},
                implementation_notes=""
            )

            doc_result: DocumentationResult = await self.gemini_agent.document(doc_request)

            return AgentResult(
                agent_type=AgentType.GEMINI,
                task_id=task_id,
                success=doc_result.success,
                output=doc_result.documentation,
                metadata={
                    "readme": doc_result.readme_content,
                    "architecture": doc_result.architecture_notes,
                    "examples": doc_result.usage_examples
                }
            )

        except Exception as e:
            self._log(f"Gemini execution failed: {e}")
            return AgentResult(
                agent_type=AgentType.GEMINI,
                task_id=task_id,
                success=False,
                error=str(e)
            )

    def _update_cost(self, result: AgentResult):
        """Update cost tracking for agent execution."""
        # Rough cost estimates (adjust based on actual API pricing)
        cost_estimates = {
            AgentType.CODEX: 0.02,  # Codex is cheaper
            AgentType.CLAUDE: 0.10,  # Claude Sonnet pricing
            AgentType.GEMINI: 0.01   # Gemini is very cheap
        }

        if result.success:
            self.costs[result.agent_type] += cost_estimates.get(result.agent_type, 0.0)

    def get_cost_summary(self) -> Dict[str, float]:
        """Get cost summary by agent type."""
        total = sum(self.costs.values())
        return {
            "codex": self.costs[AgentType.CODEX],
            "claude": self.costs[AgentType.CLAUDE],
            "gemini": self.costs[AgentType.GEMINI],
            "total": total
        }


# Example usage
async def main():
    """Example usage of Agent Dispatcher."""
    dispatcher = AgentDispatcher(verbose=True)

    # Example tasks
    tasks = [
        {
            "task_id": "task-1",
            "agent": "CODE",
            "description": "Implement user authentication with JWT",
            "acceptance_criteria": [
                "JWT token generation",
                "Token validation",
                "Refresh token support"
            ]
        },
        {
            "task_id": "task-2",
            "agent": "QA",
            "description": "Review authentication implementation",
            "acceptance_criteria": [
                "Security check",
                "Code quality",
                "Best practices"
            ]
        },
        {
            "task_id": "task-3",
            "agent": "DOC",
            "description": "Document authentication API endpoints",
            "acceptance_criteria": [
                "API documentation",
                "Usage examples",
                "Security notes"
            ]
        }
    ]

    for task in tasks:
        route = dispatcher.determine_route(task)
        print(f"\nTask: {task['task_id']}")
        print(f"  Type: {route.task_type.value}")
        print(f"  Agent: {route.primary_agent.value}")
        print(f"  Requires Review: {route.requires_review}")
        print(f"  Requires Tests: {route.requires_tests}")

        # Execute task
        # result = await dispatcher.execute_task(task, route)
        # print(f"  Result: {result.success}")

    # Show cost summary
    costs = dispatcher.get_cost_summary()
    print(f"\nCost Summary:")
    print(f"  Codex: ${costs['codex']:.3f}")
    print(f"  Claude: ${costs['claude']:.3f}")
    print(f"  Gemini: ${costs['gemini']:.3f}")
    print(f"  Total: ${costs['total']:.3f}")


if __name__ == "__main__":
    asyncio.run(main())
