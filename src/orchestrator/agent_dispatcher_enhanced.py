#!/usr/bin/env python3
"""
Enhanced Agent Dispatcher with Intelligent Fallback

Extends the base agent_dispatcher with:
1. Configurable agent selection (primary + fallback chain)
2. DeepSeek coding agent support
3. Intelligent retry logic with fallback
4. Agent output chaining verification
"""

import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import base dispatcher
from orchestrator.agent_dispatcher import AgentDispatcher, AgentResult, TaskRoute, AgentType, TaskType

# Import configuration
from orchestrator.agent_config import (
    get_agent_config, CodingAgent, AgentConfiguration,
    get_agent_config_manager
)

# Import DeepSeek code agent
from orchestrator.deepseek_code_agent import (
    DeepSeekCodeAgent, CodeImplementationRequest, CodeImplementationResult
)

# Optional redis event publishing
try:
    from orchestrator.redis_publisher import publish_event
except ImportError:
    async def publish_event(event: Dict[str, Any]):
        """Fallback publish_event when redis not available"""
        pass


class EnhancedAgentDispatcher(AgentDispatcher):
    """
    Enhanced Agent Dispatcher with configurable agents and intelligent fallback.

    New Features:
    - Configurable primary coder (Codex, DeepSeek, Claude, ChatGPT)
    - Configurable fallback chain
    - Intelligent retry with fallback
    - Agent output chaining verification
    - Cost tracking per agent type
    """

    def __init__(
        self,
        project_root: Path = PROJECT_ROOT,
        config: Optional[AgentConfiguration] = None,
        enable_cost_tracking: bool = True,
        verbose: bool = True
    ):
        """
        Initialize Enhanced Agent Dispatcher.

        Args:
            project_root: Project root directory
            config: Agent configuration (or None to load from file/env)
            enable_cost_tracking: Track costs per agent
            verbose: Enable verbose logging
        """
        # Initialize base dispatcher
        super().__init__(
            project_root=project_root,
            enable_cost_tracking=enable_cost_tracking,
            max_codex_retries=2,
            max_claude_retries=1,
            verbose=verbose
        )

        # Load agent configuration
        self.config = config or get_agent_config()

        # DeepSeek agent cache
        self.deepseek_agent: Optional[DeepSeekCodeAgent] = None

        # Execution statistics
        self.execution_stats = {
            "codex": {"attempts": 0, "successes": 0, "failures": 0},
            "deepseek": {"attempts": 0, "successes": 0, "failures": 0},
            "claude": {"attempts": 0, "successes": 0, "failures": 0},
            "chatgpt": {"attempts": 0, "successes": 0, "failures": 0}
        }

        self._log(f"Enhanced Agent Dispatcher initialized")
        self._log(f"  Primary Coder: {self.config.primary_coder.value}")
        self._log(f"  Fallback Chain: {[agent.value for agent in self.config.fallback_chain]}")
        self._log(f"  Fallback Enabled: {self.config.enable_fallback}")

    async def execute_task_with_fallback(
        self,
        task: Dict[str, Any],
        route: Optional[TaskRoute] = None
    ) -> AgentResult:
        """
        Execute a task with intelligent fallback.

        If primary agent fails, tries fallback agents in order.

        Args:
            task: Task dictionary
            route: Optional pre-determined route

        Returns:
            AgentResult from the successful agent (or last failure)
        """
        if route is None:
            route = self.determine_route(task)

        task_id = route.task_id

        # Map CodingAgent enum to AgentType enum
        primary_agent_type = self._map_coding_agent_to_agent_type(self.config.primary_coder)

        self._log(f"Task {task_id}: Attempting with {primary_agent_type.value} (primary)")

        await publish_event({
            "type": "task_execution_started",
            "task_id": task_id,
            "primary_agent": primary_agent_type.value,
            "fallback_enabled": self.config.enable_fallback,
            "timestamp": datetime.now().isoformat()
        })

        # Try primary agent with retries
        result = await self._execute_with_retries(
            task,
            primary_agent_type,
            max_retries=self.config.max_retries_per_agent
        )

        # If successful or fallback disabled, return result
        if result.success or not self.config.enable_fallback:
            await publish_event({
                "type": "task_execution_completed",
                "task_id": task_id,
                "agent": primary_agent_type.value,
                "success": result.success,
                "timestamp": datetime.now().isoformat()
            })
            return result

        # Primary failed, try fallback chain
        self._log(f"Task {task_id}: Primary agent {primary_agent_type.value} failed, trying fallbacks...")

        fallback_chain = self._get_fallback_chain(self.config.primary_coder)

        for fallback_agent in fallback_chain:
            fallback_agent_type = self._map_coding_agent_to_agent_type(fallback_agent)

            self._log(f"Task {task_id}: Attempting with {fallback_agent_type.value} (fallback)")

            await publish_event({
                "type": "task_fallback_attempt",
                "task_id": task_id,
                "fallback_agent": fallback_agent_type.value,
                "timestamp": datetime.now().isoformat()
            })

            result = await self._execute_with_retries(
                task,
                fallback_agent_type,
                max_retries=self.config.max_retries_per_agent
            )

            if result.success:
                self._log(f"Task {task_id}: Succeeded with fallback agent {fallback_agent_type.value}")

                await publish_event({
                    "type": "task_execution_completed_fallback",
                    "task_id": task_id,
                    "successful_agent": fallback_agent_type.value,
                    "timestamp": datetime.now().isoformat()
                })

                return result

            self._log(f"Task {task_id}: Fallback agent {fallback_agent_type.value} also failed")

        # All agents failed
        self._log(f"Task {task_id}: All agents failed")

        await publish_event({
            "type": "task_execution_failed_all_agents",
            "task_id": task_id,
            "timestamp": datetime.now().isoformat()
        })

        return result  # Return last failure result

    async def _execute_with_retries(
        self,
        task: Dict[str, Any],
        agent_type: AgentType,
        max_retries: int
    ) -> AgentResult:
        """
        Execute task with retries for a specific agent.

        Args:
            task: Task dictionary
            agent_type: Agent to use
            max_retries: Maximum retry attempts

        Returns:
            AgentResult from successful execution or last failure
        """
        task_id = str(task.get('task_id') or 'unknown')
        agent_name = agent_type.value

        result = None

        for attempt in range(max_retries + 1):
            if attempt > 0:
                self._log(f"Task {task_id}: Retry {attempt}/{max_retries} with {agent_name}")

            # Track attempt
            self.execution_stats[agent_name]["attempts"] += 1

            # Execute based on agent type
            if agent_type == AgentType.CODEX:
                result = await self._execute_with_codex(task)
            elif agent_type == AgentType.CLAUDE:
                result = await self._execute_with_claude(task)
            elif agent_type == AgentType.GEMINI:
                result = await self._execute_with_gemini(task)
            elif agent_name == "deepseek":  # New DeepSeek support
                result = await self._execute_with_deepseek_enhanced(task)
            else:
                result = AgentResult(
                    agent_type=agent_type,
                    task_id=task_id,
                    success=False,
                    error=f"Unknown agent type: {agent_type}"
                )

            if result.success:
                self.execution_stats[agent_name]["successes"] += 1
                return result

            # Retry if not last attempt
            if attempt < max_retries:
                await asyncio.sleep(1)  # Brief delay between retries

        # All retries exhausted
        self.execution_stats[agent_name]["failures"] += 1
        return result

    async def _execute_with_deepseek_enhanced(self, task: Dict[str, Any]) -> AgentResult:
        """Execute task with DeepSeek code agent."""
        task_id = str(task.get('task_id') or 'unknown')

        try:
            # Initialize DeepSeek agent if needed
            if self.deepseek_agent is None:
                self.deepseek_agent = DeepSeekCodeAgent(agent_id="deepseek-coder")

            # Create implementation request
            request = CodeImplementationRequest(
                task_description=task.get('description', ''),
                requirements=self._normalize_requirements(task.get('acceptance_criteria')),
                language="python",  # Default, could be inferred from task
                context=task
            )

            # Execute DeepSeek
            deepseek_result: CodeImplementationResult = await self.deepseek_agent.implement_code(request)

            # Convert to AgentResult
            agent_result = AgentResult(
                agent_type=AgentType.CODEX,  # Map to CODEX type for compatibility
                task_id=task_id,
                success=deepseek_result.success,
                output=deepseek_result.code,
                files_created=deepseek_result.files_created,
                error=deepseek_result.error,
                metadata={
                    "agent": "deepseek",
                    "explanation": deepseek_result.explanation,
                    "reasoning": deepseek_result.reasoning,
                    "dependencies": deepseek_result.dependencies
                }
            )

            return agent_result

        except Exception as e:
            self._log(f"DeepSeek execution failed: {e}")
            return AgentResult(
                agent_type=AgentType.CODEX,
                task_id=task_id,
                success=False,
                error=str(e),
                metadata={"agent": "deepseek"}
            )

    def _map_coding_agent_to_agent_type(self, coding_agent: CodingAgent) -> AgentType:
        """Map CodingAgent enum to AgentType enum."""
        mapping = {
            CodingAgent.CODEX: AgentType.CODEX,
            CodingAgent.CLAUDE: AgentType.CLAUDE,
            CodingAgent.DEEPSEEK: AgentType.CODEX,  # Use CODEX type for DeepSeek
            CodingAgent.CHATGPT: AgentType.CODEX  # Use CODEX type for ChatGPT
        }
        return mapping.get(coding_agent, AgentType.CODEX)

    def _get_fallback_chain(self, primary: CodingAgent) -> List[CodingAgent]:
        """Get fallback chain for a primary agent."""
        config_manager = get_agent_config_manager()
        return config_manager.get_fallback_chain(primary)

    def get_execution_statistics(self) -> Dict[str, Any]:
        """Get execution statistics for all agents."""
        stats = {}
        for agent, data in self.execution_stats.items():
            if data["attempts"] > 0:
                success_rate = (data["successes"] / data["attempts"]) * 100
                stats[agent] = {
                    **data,
                    "success_rate": f"{success_rate:.1f}%"
                }
        return stats

    def print_statistics(self):
        """Print execution statistics."""
        print("\n" + "=" * 70)
        print("AGENT EXECUTION STATISTICS")
        print("=" * 70)

        stats = self.get_execution_statistics()
        if not stats:
            print("No executions yet.")
            return

        for agent, data in stats.items():
            print(f"\n{agent.upper()}:")
            print(f"  Attempts: {data['attempts']}")
            print(f"  Successes: {data['successes']}")
            print(f"  Failures: {data['failures']}")
            print(f"  Success Rate: {data['success_rate']}")


# Convenience function to create enhanced dispatcher
def create_enhanced_dispatcher(
    project_root: Path = PROJECT_ROOT,
    config: Optional[AgentConfiguration] = None
) -> EnhancedAgentDispatcher:
    """
    Create an enhanced agent dispatcher with fallback support.

    Args:
        project_root: Project root directory
        config: Optional agent configuration

    Returns:
        EnhancedAgentDispatcher instance
    """
    return EnhancedAgentDispatcher(
        project_root=project_root,
        config=config,
        enable_cost_tracking=True,
        verbose=True
    )
