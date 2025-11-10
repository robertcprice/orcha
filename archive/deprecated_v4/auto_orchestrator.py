#!/usr/bin/env python3
"""
Auto Orchestrator - Automated task execution with hierarchical agent spawning

Features:
- Executes tasks from task queue automatically
- Supports hierarchical agent spawning (agents can create sub-agents)
- Tracks agent hierarchy and context sharing
- Integrates with HybridOrchestratorV4
- Provides real-time progress updates
"""

import asyncio
import os
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

from orchestrator.hybrid_orchestrator_v4_iterative import HybridOrchestratorV4
from orchestrator.chatgpt_planner import ChatGPTPlanner

logger = logging.getLogger('AutoOrchestrator')


@dataclass
class AgentNode:
    """Represents an agent in the hierarchy"""

    agent_id: str
    agent_type: str  # "orchestrator", "PP", "IM", "AR", "RD", etc.
    parent_id: Optional[str] = None
    depth: int = 0
    task_description: str = ""
    status: str = "pending"  # pending, active, completed, failed
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    children: List[str] = field(default_factory=list)
    result: Optional[Dict] = None


@dataclass
class AgentHierarchy:
    """Tracks the full agent hierarchy for a task"""

    root_agent_id: str
    agents: Dict[str, AgentNode] = field(default_factory=dict)
    max_depth_reached: int = 0

    def add_agent(self, agent: AgentNode):
        """Add agent to hierarchy"""

        self.agents[agent.agent_id] = agent

        if agent.depth > self.max_depth_reached:
            self.max_depth_reached = agent.depth

        # Update parent's children list
        if agent.parent_id and agent.parent_id in self.agents:
            parent = self.agents[agent.parent_id]

            if agent.agent_id not in parent.children:
                parent.children.append(agent.agent_id)

    def get_agent(self, agent_id: str) -> Optional[AgentNode]:
        """Get agent by ID"""

        return self.agents.get(agent_id)

    def get_active_agents(self) -> List[AgentNode]:
        """Get all currently active agents"""

        return [a for a in self.agents.values() if a.status == "active"]

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""

        return {
            "root_agent_id": self.root_agent_id,
            "max_depth_reached": self.max_depth_reached,
            "total_agents": len(self.agents),
            "agents": {
                aid: {
                    "agent_id": a.agent_id,
                    "agent_type": a.agent_type,
                    "parent_id": a.parent_id,
                    "depth": a.depth,
                    "task_description": a.task_description,
                    "status": a.status,
                    "created_at": a.created_at,
                    "completed_at": a.completed_at,
                    "children": a.children,
                    "result": a.result
                }
                for aid, a in self.agents.items()
            }
        }


class AutoOrchestrator:
    """
    Automated orchestrator that executes tasks from the queue.

    Supports:
    - Automatic task execution via HybridOrchestratorV4
    - Hierarchical agent spawning (agents can create sub-agents)
    - Agent context sharing across hierarchy
    - Progress tracking and logging
    """

    def __init__(
        self,
        project_root: Path,
        task_data: Dict[str, Any]
    ):

        self.project_root = project_root
        self.task_data = task_data
        self.task_id = task_data["task_id"]

        # Agent hierarchy tracking
        root_agent_id = f"orchestrator-{self.task_id}"
        self.hierarchy = AgentHierarchy(root_agent_id=root_agent_id)

        # Create root orchestrator agent
        root_agent = AgentNode(
            agent_id=root_agent_id,
            agent_type="orchestrator",
            depth=0,
            task_description=task_data.get("title", "")
        )
        self.hierarchy.add_agent(root_agent)

        # Configuration
        config = task_data.get("config", {})
        self.max_dialogue_turns = config.get("max_dialogue_turns", 20)
        self.timeout_minutes = config.get("timeout_minutes", 60)
        self.gpt_model = config.get("gpt_model", "gpt-4")
        self.allow_sub_agents = config.get("allow_sub_agents", True)
        self.max_agent_depth = config.get("max_agent_depth", 3)

        # Get API key
        self.openai_key = os.getenv("OPENAI_API_KEY")

        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY not set in environment")

        logger.info(f"AutoOrchestrator initialized for task: {self.task_id}")

    async def execute_task(self) -> Dict[str, Any]:
        """
        Execute the task using hybrid orchestrator.

        Returns:
            Dict with execution results
        """

        logger.info(f"Executing task: {self.task_data.get('title')}")

        start_time = datetime.now(timezone.utc)

        # Update root agent status
        root_agent = self.hierarchy.get_agent(self.hierarchy.root_agent_id)
        root_agent.status = "active"

        # Agent activity callback for hierarchy tracking
        async def agent_activity_callback(role: str, action: str, message: str, metadata: Dict = None):

            """Track agent spawns and activity"""

            if action == "spawn":
                # New agent spawned
                agent_id = f"{role}-{uuid.uuid4().hex[:8]}"
                parent_id = self.hierarchy.root_agent_id

                # Determine depth based on role type
                depth = 1  # Default for core agents (PP, AR, IM, RD)

                agent = AgentNode(
                    agent_id=agent_id,
                    agent_type=role,
                    parent_id=parent_id,
                    depth=depth,
                    task_description=message,
                    status="active"
                )

                self.hierarchy.add_agent(agent)

                logger.info(f"Agent spawned: {role} ({agent_id}) - {message[:80]}")

            elif action == "complete":
                # Find agent by role and mark completed
                for agent in self.hierarchy.agents.values():
                    if agent.agent_type == role and agent.status == "active":
                        agent.status = "completed"
                        agent.completed_at = datetime.now(timezone.utc).isoformat()

                        logger.info(f"Agent completed: {role} - {message[:80]}")
                        break

            elif action == "error":
                # Mark agent as failed
                for agent in self.hierarchy.agents.values():
                    if agent.agent_type == role and agent.status == "active":
                        agent.status = "failed"
                        agent.completed_at = datetime.now(timezone.utc).isoformat()
                        agent.result = {"error": message}

                        logger.error(f"Agent failed: {role} - {message[:80]}")
                        break

        try:
            # Create hybrid orchestrator
            orchestrator = HybridOrchestratorV4(
                project_root=self.project_root,
                openai_api_key=self.openai_key,
                gpt_model=self.gpt_model
            )

            # Execute with timeout
            result = await asyncio.wait_for(
                orchestrator.execute_goal_iterative(
                    user_goal=self.task_data["description"],
                    context=self.task_data.get("context", {}),
                    max_dialogue_turns=self.max_dialogue_turns,
                    verbose=True,
                    agent_activity_callback=agent_activity_callback
                ),
                timeout=self.timeout_minutes * 60
            )

            # Update root agent
            root_agent.status = "completed"
            root_agent.completed_at = datetime.now(timezone.utc).isoformat()
            root_agent.result = result

            end_time = datetime.now(timezone.utc)
            execution_time = (end_time - start_time).total_seconds()

            # Compile final result
            final_result = {
                "status": "success",
                "summary": result.get("final_summary", "Task completed"),
                "artifacts": result.get("artifacts", []),
                "metrics": {
                    "dialogue_turns": result.get("total_dialogue_turns", 0),
                    "execution_time_seconds": execution_time,
                    "agents_spawned": len(self.hierarchy.agents) - 1,  # Exclude root
                    "max_agent_depth": self.hierarchy.max_depth_reached
                },
                "agent_hierarchy": self.hierarchy.to_dict(),
                "orchestrator_result": result
            }

            logger.info(f"Task completed successfully: {self.task_id}")
            logger.info(f"Agents spawned: {final_result['metrics']['agents_spawned']}")
            logger.info(f"Execution time: {execution_time:.1f}s")

            return final_result

        except asyncio.TimeoutError:
            logger.error(f"Task timed out after {self.timeout_minutes} minutes")

            root_agent.status = "failed"
            root_agent.completed_at = datetime.now(timezone.utc).isoformat()

            return {
                "status": "failure",
                "error": f"Task timed out after {self.timeout_minutes} minutes",
                "summary": "Task execution exceeded time limit",
                "metrics": {
                    "agents_spawned": len(self.hierarchy.agents) - 1,
                    "execution_time_seconds": self.timeout_minutes * 60
                }
            }

        except Exception as e:
            logger.error(f"Task execution failed: {e}", exc_info=True)

            root_agent.status = "failed"
            root_agent.completed_at = datetime.now(timezone.utc).isoformat()

            return {
                "status": "failure",
                "error": str(e),
                "summary": f"Task failed with error: {str(e)}",
                "metrics": {
                    "agents_spawned": len(self.hierarchy.agents) - 1
                }
            }


async def main():
    """Test auto orchestrator"""

    # Create test task
    test_task = {
        "task_id": str(uuid.uuid4()),
        "title": "Test Auto Orchestrator",
        "description": "Create a simple Python script that prints 'Hello from Auto Orchestrator!'",
        "priority": "normal",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "test",
        "config": {
            "max_dialogue_turns": 5,
            "timeout_minutes": 5,
            "gpt_model": "gpt-4"
        }
    }

    # Run orchestrator
    orchestrator = AutoOrchestrator(
        project_root=PROJECT_ROOT,
        task_data=test_task
    )

    result = await orchestrator.execute_task()

    print("\n" + "=" * 80)
    print("AUTO ORCHESTRATOR TEST RESULT")
    print("=" * 80)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
