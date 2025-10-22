#!/usr/bin/env python3
"""
Hierarchical Agent Framework - Supports agents spawning sub-agents

Features:
- Agents can spawn specialized sub-agents for complex tasks
- Context sharing between parent and child agents
- Automatic depth limiting to prevent infinite recursion
- Agent lifecycle management (spawn, execute, complete)
- Result aggregation from child agents
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
import uuid
import logging

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from orchestrator.claude_cli_executor import ClaudeCLIExecutor

logger = logging.getLogger('HierarchicalAgent')


@dataclass
class AgentContext:
    """Shared context for agent and its children"""

    task_goal: str
    parent_context: Optional[Dict] = None
    shared_data: Dict[str, Any] = field(default_factory=dict)
    child_results: List[Dict] = field(default_factory=list)


class HierarchicalAgent:
    """
    Agent that can spawn and manage sub-agents.

    Supports multi-level agent hierarchies for complex task decomposition.
    """

    def __init__(
        self,
        agent_id: str,
        agent_type: str,
        task_description: str,
        context: AgentContext,
        parent_id: Optional[str] = None,
        depth: int = 0,
        max_depth: int = 3,
        project_root: Path = PROJECT_ROOT
    ):

        self.agent_id = agent_id
        self.agent_type = agent_type
        self.task_description = task_description
        self.context = context
        self.parent_id = parent_id
        self.depth = depth
        self.max_depth = max_depth
        self.project_root = project_root

        self.children: List[HierarchicalAgent] = []
        self.status = "pending"
        self.result: Optional[Dict] = None

        # Claude executor for this agent
        self.claude = ClaudeCLIExecutor(project_root)

        logger.info(f"Agent created: {agent_type} (depth={depth}, id={agent_id})")

    async def execute(self) -> Dict[str, Any]:
        """
        Execute this agent's task.

        The agent will:
        1. Analyze the task
        2. Decide if it needs to spawn sub-agents
        3. Execute work directly or delegate to sub-agents
        4. Aggregate results
        """

        logger.info(f"Executing {self.agent_type} agent: {self.task_description[:80]}")

        self.status = "active"

        try:
            # Step 1: Analyze task and decide on approach
            task_plan = await self._plan_execution()

            # Step 2: Check if we need sub-agents
            if task_plan.get("needs_sub_agents") and self.depth < self.max_depth:
                # Spawn and execute sub-agents
                result = await self._execute_with_sub_agents(task_plan)

            else:
                # Execute directly
                result = await self._execute_directly(task_plan)

            self.result = result
            self.status = "completed"

            logger.info(f"{self.agent_type} agent completed successfully")

            return result

        except Exception as e:
            logger.error(f"{self.agent_type} agent failed: {e}", exc_info=True)

            self.status = "failed"
            self.result = {
                "status": "failure",
                "error": str(e)
            }

            return self.result

    async def _plan_execution(self) -> Dict[str, Any]:
        """
        Analyze task and create execution plan.

        Returns:
            Dict with:
            - needs_sub_agents: bool
            - sub_agent_tasks: List[Dict] (if needs_sub_agents)
            - direct_approach: str (if not needs_sub_agents)
        """

        planning_prompt = f"""You are a {self.agent_type} agent analyzing a task to determine the best execution approach.

TASK:
{self.task_description}

CONTEXT:
{json.dumps(self.context.shared_data, indent=2)}

CURRENT DEPTH: {self.depth}
MAX DEPTH: {self.max_depth}
CAN SPAWN SUB-AGENTS: {self.depth < self.max_depth}

YOUR GOAL:
Determine if this task should be:
1. Executed directly by you, OR
2. Decomposed into sub-tasks for specialized sub-agents

WHEN TO SPAWN SUB-AGENTS:
- Task has multiple distinct components requiring different expertise
- Task complexity benefits from divide-and-conquer approach
- You're at depth < {self.max_depth}

AVAILABLE SUB-AGENT TYPES:
- CODE: Advanced code implementation
- DOC: Documentation creation
- QA: Testing and quality assurance
- RES: Web research and information gathering
- DATA: Data processing and analysis
- Any custom type you define

OUTPUT FORMAT (JSON):
{{
  "needs_sub_agents": true/false,
  "reasoning": "Why you chose this approach",
  "sub_agent_tasks": [
    {{
      "agent_type": "CODE|DOC|QA|RES|DATA|custom",
      "task_description": "Specific task for this sub-agent",
      "context": {{"any": "additional context"}}
    }}
  ],
  "direct_approach": "How you'll execute this yourself (if not using sub-agents)"
}}

Respond ONLY with JSON, no other text."""

        # Execute planning
        success, output, metadata = await self.claude.execute_prompt(
            planning_prompt,
            timeout=60
        )

        if not success:
            logger.warning(f"Planning failed, will execute directly")

            return {
                "needs_sub_agents": False,
                "direct_approach": "Execute task directly due to planning failure"
            }

        # Parse plan
        try:
            json_start = output.find("{")
            json_end = output.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                plan = json.loads(json_str)

                return plan

            else:
                raise ValueError("No JSON in output")

        except Exception as e:
            logger.warning(f"Failed to parse plan: {e}")

            return {
                "needs_sub_agents": False,
                "direct_approach": "Execute directly (plan parse failed)"
            }

    async def _execute_with_sub_agents(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute by spawning and coordinating sub-agents.
        """

        sub_agent_tasks = plan.get("sub_agent_tasks", [])

        logger.info(f"Spawning {len(sub_agent_tasks)} sub-agent(s)")

        # Spawn sub-agents
        sub_agents = []

        for task_spec in sub_agent_tasks:

            agent_type = task_spec.get("agent_type", "HELPER")
            task_desc = task_spec.get("task_description", "")

            # Create child context
            child_context = AgentContext(
                task_goal=task_desc,
                parent_context=self.context.shared_data,
                shared_data=task_spec.get("context", {})
            )

            # Create sub-agent
            sub_agent = HierarchicalAgent(
                agent_id=f"{agent_type}-{uuid.uuid4().hex[:8]}",
                agent_type=agent_type,
                task_description=task_desc,
                context=child_context,
                parent_id=self.agent_id,
                depth=self.depth + 1,
                max_depth=self.max_depth,
                project_root=self.project_root
            )

            self.children.append(sub_agent)
            sub_agents.append(sub_agent)

        # Execute all sub-agents concurrently
        sub_agent_results = await asyncio.gather(
            *[agent.execute() for agent in sub_agents],
            return_exceptions=True
        )

        # Aggregate results
        successful_results = []
        failed_count = 0

        for i, result in enumerate(sub_agent_results):

            if isinstance(result, Exception):
                logger.error(f"Sub-agent {sub_agents[i].agent_type} failed: {result}")
                failed_count += 1

            elif isinstance(result, dict) and result.get("status") == "failure":
                logger.error(f"Sub-agent {sub_agents[i].agent_type} failed")
                failed_count += 1

            else:
                successful_results.append(result)
                self.context.child_results.append(result)

        # Synthesize final result
        synthesis_result = await self._synthesize_results(successful_results)

        return {
            "status": "success" if failed_count == 0 else "partial",
            "summary": synthesis_result.get("summary", "Sub-agent tasks completed"),
            "sub_agents_spawned": len(sub_agents),
            "sub_agents_succeeded": len(successful_results),
            "sub_agents_failed": failed_count,
            "artifacts": synthesis_result.get("artifacts", []),
            "child_results": successful_results
        }

    async def _synthesize_results(self, sub_results: List[Dict]) -> Dict[str, Any]:
        """
        Synthesize results from sub-agents into coherent summary.
        """

        synthesis_prompt = f"""You are a {self.agent_type} agent synthesizing results from sub-agents.

YOUR TASK:
{self.task_description}

SUB-AGENT RESULTS:
{json.dumps(sub_results, indent=2)}

YOUR GOAL:
Create a cohesive summary of what was accomplished across all sub-agents.

OUTPUT FORMAT (JSON):
{{
  "summary": "Clear description of overall accomplishment",
  "artifacts": ["list", "of", "files", "created"],
  "key_outcomes": ["outcome1", "outcome2", ...]
}}

Respond with JSON only."""

        success, output, metadata = await self.claude.execute_prompt(
            synthesis_prompt,
            timeout=60
        )

        if not success:
            return {
                "summary": f"Completed {len(sub_results)} sub-tasks",
                "artifacts": []
            }

        try:
            json_start = output.find("{")
            json_end = output.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                synthesis = json.loads(json_str)

                return synthesis

            else:
                raise ValueError("No JSON")

        except:
            return {
                "summary": f"Completed {len(sub_results)} sub-tasks",
                "artifacts": []
            }

    async def _execute_directly(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute task directly without sub-agents.
        """

        logger.info(f"Executing directly: {plan.get('direct_approach', 'No approach specified')}")

        execution_prompt = f"""You are a {self.agent_type} agent executing a task directly.

TASK:
{self.task_description}

CONTEXT:
{json.dumps(self.context.shared_data, indent=2)}

EXECUTION APPROACH:
{plan.get('direct_approach', 'Execute as appropriate')}

YOUR GOAL:
Complete the task and provide detailed results.

IMPORTANT:
- Actually perform the work (create files, modify code, etc.)
- Don't just plan - execute!
- Document what you created/modified

OUTPUT FORMAT (JSON):
{{
  "status": "success|failure",
  "summary": "What you accomplished",
  "artifacts": ["files", "created", "or", "modified"],
  "details": "Additional details about the work",
  "error": "Error message if failed"
}}

Execute now and respond with JSON:"""

        success, output, metadata = await self.claude.execute_prompt(
            execution_prompt,
            timeout=300
        )

        if not success:
            return {
                "status": "failure",
                "error": metadata.get("error", "Execution failed"),
                "summary": "Failed to execute task"
            }

        # Parse result
        try:
            json_start = output.find("{")
            json_end = output.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                result = json.loads(json_str)

                return result

            else:
                raise ValueError("No JSON in output")

        except Exception as e:
            logger.warning(f"Failed to parse execution result: {e}")

            return {
                "status": "success",
                "summary": "Task executed (result parsing failed)",
                "raw_output": output[:500]
            }


async def main():
    """Test hierarchical agent"""

    # Create test context
    context = AgentContext(
        task_goal="Create a complete Python project with tests",
        shared_data={"project_name": "test_hierarchy"}
    )

    # Create root agent
    root_agent = HierarchicalAgent(
        agent_id="root-test",
        agent_type="IM",
        task_description="Create a Python project with calculator.py (add/subtract functions) and test_calculator.py with unit tests",
        context=context,
        depth=0,
        max_depth=2
    )

    # Execute
    result = await root_agent.execute()

    print("\n" + "=" * 80)
    print("HIERARCHICAL AGENT TEST RESULT")
    print("=" * 80)
    print(json.dumps(result, indent=2))
    print(f"\nTotal agents spawned: {len(root_agent.children)}")

    for child in root_agent.children:
        print(f"  - {child.agent_type}: {child.status}")


if __name__ == "__main__":
    asyncio.run(main())
