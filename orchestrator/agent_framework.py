"""
Agent Orchestration Framework with Hierarchical Agent Spawning

This framework allows agents to spawn sub-agents for complex tasks, with all agents
following the rules defined in CLAUDE.md.

Features:
- Hierarchical agent spawning (agents can create sub-agents)
- Automatic rule enforcement (documentation, testing, verification)
- Task delegation and result aggregation
- Agent memory and context management
- Parallel and sequential execution modes
"""

import json
import os
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Callable


class AgentType(Enum):
    """Types of agents that can be spawned"""

    # Core orchestration agents
    PROJECT_PLANNER = "project_planner"  # High-level planning
    IMPLEMENTATION_MANAGER = "implementation_manager"  # Manages implementation tasks
    CODE_REVIEWER = "code_reviewer"  # Reviews and validates code
    RESEARCH_AGENT = "research_agent"  # Investigates and researches

    # Specialized task agents
    DATA_PROCESSOR = "data_processor"  # Data processing tasks
    MODEL_TRAINER = "model_trainer"  # Model training tasks
    TESTING_AGENT = "testing_agent"  # Testing and validation
    DOCUMENTATION_AGENT = "documentation_agent"  # Creates documentation

    # Infrastructure agents
    FILE_ORGANIZER = "file_organizer"  # Manages file organization
    DEPENDENCY_CHECKER = "dependency_checker"  # Checks dependencies
    DEPLOYMENT_AGENT = "deployment_agent"  # Handles deployments

    # General purpose
    GENERAL_AGENT = "general_agent"  # General-purpose agent


class ExecutionMode(Enum):
    """How to execute sub-tasks"""
    PARALLEL = "parallel"  # Run sub-tasks in parallel
    SEQUENTIAL = "sequential"  # Run sub-tasks sequentially
    ADAPTIVE = "adaptive"  # Decide based on dependencies


@dataclass
class AgentTask:
    """Represents a task for an agent"""

    task_id: str
    description: str
    agent_type: AgentType
    priority: int = 0
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, in_progress, completed, failed
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


@dataclass
class Agent:
    """Represents an agent in the system"""

    agent_id: str
    agent_type: AgentType
    parent_id: Optional[str] = None
    level: int = 0  # Depth in hierarchy (0 = root)
    context: Dict[str, Any] = field(default_factory=dict)
    tasks: List[AgentTask] = field(default_factory=list)
    sub_agents: List['Agent'] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def spawn_sub_agent(self, agent_type: AgentType, context: Dict[str, Any] = None) -> 'Agent':
        """Spawn a sub-agent to handle a specific task"""

        sub_agent = Agent(
            agent_id=f"{self.agent_id}.{len(self.sub_agents) + 1}",
            agent_type=agent_type,
            parent_id=self.agent_id,
            level=self.level + 1,
            context=context or {}
        )

        self.sub_agents.append(sub_agent)

        return sub_agent

    def add_task(self, description: str, agent_type: AgentType = None,
                 priority: int = 0, dependencies: List[str] = None,
                 metadata: Dict[str, Any] = None) -> AgentTask:
        """Add a task to this agent's queue"""

        task = AgentTask(
            task_id=f"{self.agent_id}.task.{len(self.tasks) + 1}",
            description=description,
            agent_type=agent_type or self.agent_type,
            priority=priority,
            dependencies=dependencies or [],
            metadata=metadata or {}
        )

        self.tasks.append(task)

        return task


class AgentOrchestrator:
    """
    Orchestrates hierarchical agent execution with rule enforcement

    This is the main interface for spawning and managing agents.
    """

    def __init__(self, project_root: Path = None):

        self.project_root = project_root or Path.cwd()
        self.agents: Dict[str, Agent] = {}
        self.rules = self._load_rules()
        self.session_log_path = self._create_session_log()

    def _load_rules(self) -> Dict[str, Any]:
        """Load agent rules from CLAUDE.md"""

        claude_md_path = self.project_root / "CLAUDE.md"

        if not claude_md_path.exists():
            return self._default_rules()

        # Parse CLAUDE.md to extract rules
        # For now, return default rules with reference to CLAUDE.md
        rules = self._default_rules()
        rules['claude_md_path'] = str(claude_md_path)

        return rules

    def _default_rules(self) -> Dict[str, Any]:
        """Default rules that all agents must follow"""

        return {
            'mandatory_checks': [
                'verification_checklist',
                'file_placement',
                'naming_conventions',
                'testing',
                'documentation',
                'self_review'
            ],
            'status_files': [
                'obsidian-vault/00-Index/CURRENT_WORK_STATUS.md',
                'obsidian-vault/00-Index/CURRENT_PROJECT_STATUS.md'
            ],
            'extended_testing_required': True,
            'agent_learning_search_required': True,
            'training_report_required_for': ['model_training', 'hyperparameter_tuning'],
            'file_organization_rules': 'PROJECT_STRUCTURE.md',
            'naming_conventions': 'obsidian-vault/00-Index/FILE_NAMING_CONVENTIONS.md'
        }

    def _create_session_log(self) -> Path:
        """Create session log for this orchestration session"""

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        log_dir = self.project_root / "obsidian-vault" / "05-Agent-Sessions"
        log_dir.mkdir(parents=True, exist_ok=True)

        log_path = log_dir / f"agent_orchestration_{timestamp}.md"

        with open(log_path, 'w') as f:
            f.write(f"# Agent Orchestration Session\n\n")
            f.write(f"**Started**: {datetime.now()}\n\n")
            f.write(f"## Agents Spawned\n\n")

        return log_path

    def spawn_agent(self, agent_type: AgentType, context: Dict[str, Any] = None,
                    parent_agent: Agent = None) -> Agent:
        """
        Spawn a new agent

        Args:
            agent_type: Type of agent to spawn
            context: Context information for the agent
            parent_agent: Parent agent (if this is a sub-agent)

        Returns:
            Created Agent instance
        """

        if parent_agent:
            agent = parent_agent.spawn_sub_agent(agent_type, context)
        else:
            agent = Agent(
                agent_id=f"agent.{len(self.agents) + 1}",
                agent_type=agent_type,
                context=context or {},
                level=0
            )

        self.agents[agent.agent_id] = agent

        self._log_agent_spawn(agent)

        return agent

    def _log_agent_spawn(self, agent: Agent):
        """Log agent spawn to session log"""

        with open(self.session_log_path, 'a') as f:
            f.write(f"\n### Agent {agent.agent_id} ({agent.agent_type.value})\n")
            f.write(f"- **Level**: {agent.level}\n")
            f.write(f"- **Parent**: {agent.parent_id or 'None (root)'}\n")
            f.write(f"- **Created**: {agent.created_at}\n")
            if agent.context:
                f.write(f"- **Context**: {json.dumps(agent.context, indent=2)}\n")
            f.write("\n")

    def execute_agent(self, agent: Agent, task_description: str,
                      execution_mode: ExecutionMode = ExecutionMode.SEQUENTIAL,
                      callback: Optional[Callable] = None) -> Dict[str, Any]:
        """
        Execute an agent with a task

        Args:
            agent: Agent to execute
            task_description: Description of the task
            execution_mode: How to execute sub-tasks
            callback: Optional callback for progress updates

        Returns:
            Dictionary with execution results
        """

        # Create task
        task = agent.add_task(task_description)
        task.status = "in_progress"

        # Apply mandatory pre-execution checks
        self._pre_execution_checks(agent, task)

        # Execute task (this would integrate with Claude Code API or CLI)
        # For now, this is a placeholder that shows the structure
        result = self._execute_task(agent, task, execution_mode, callback)

        # Apply mandatory post-execution checks
        self._post_execution_checks(agent, task, result)

        # Update task status
        task.status = "completed" if result.get('success') else "failed"
        task.result = result
        task.completed_at = datetime.now()

        # Log to session
        self._log_task_completion(agent, task, result)

        return result

    def _pre_execution_checks(self, agent: Agent, task: AgentTask):
        """Mandatory checks before execution (from CLAUDE.md)"""

        checks = []

        # Check 1: Search agent learning system
        if self.rules['agent_learning_search_required']:
            checks.append({
                'name': 'agent_learning_search',
                'description': 'Search obsidian-vault/11-Agent-Learning/ for related errors/successes',
                'status': 'required'
            })

        # Check 2: Verify file organization knowledge
        checks.append({
            'name': 'file_organization',
            'description': 'Read PROJECT_STRUCTURE.md for file placement rules',
            'status': 'required'
        })

        # Check 3: Verify naming conventions
        checks.append({
            'name': 'naming_conventions',
            'description': 'Read FILE_NAMING_CONVENTIONS.md for naming rules',
            'status': 'required'
        })

        task.metadata['pre_checks'] = checks

        return checks

    def _execute_task(self, agent: Agent, task: AgentTask,
                      execution_mode: ExecutionMode, callback: Optional[Callable]) -> Dict[str, Any]:
        """
        Execute the actual task

        This is where you would integrate with Claude Code CLI or API
        """

        # Placeholder implementation
        # In real implementation, this would call Claude Code with the task

        result = {
            'success': True,
            'agent_id': agent.agent_id,
            'task_id': task.task_id,
            'execution_mode': execution_mode.value,
            'message': f'Task execution for {agent.agent_type.value}: {task.description}'
        }

        if callback:
            callback(agent, task, result)

        return result

    def _post_execution_checks(self, agent: Agent, task: AgentTask, result: Dict[str, Any]):
        """Mandatory checks after execution (from CLAUDE.md)"""

        checks = []

        # Check 1: Self-review
        checks.append({
            'name': 'self_review',
            'description': 'Verify all specifications followed',
            'required_items': [
                'All requirements addressed',
                'Files in correct locations',
                'Naming conventions followed',
                'Code tested',
                'Documentation updated'
            ],
            'status': 'required'
        })

        # Check 2: Documentation updates
        checks.append({
            'name': 'documentation',
            'description': 'Update CURRENT_WORK_STATUS.md and CURRENT_PROJECT_STATUS.md',
            'files_to_update': self.rules['status_files'],
            'status': 'required'
        })

        # Check 3: Testing (if code was written)
        if 'code_changes' in result:
            checks.append({
                'name': 'testing',
                'description': 'Run tests for code changes',
                'test_types': ['unit', 'integration', 'manual'],
                'status': 'required'
            })

        # Check 4: Extended parameter testing (if training)
        if agent.agent_type == AgentType.MODEL_TRAINER:
            checks.append({
                'name': 'extended_testing',
                'description': 'Test full parameter range (not just obvious values)',
                'min_configurations': 4,
                'status': 'required'
            })

        task.metadata['post_checks'] = checks

        return checks

    def _log_task_completion(self, agent: Agent, task: AgentTask, result: Dict[str, Any]):
        """Log task completion to session log"""

        with open(self.session_log_path, 'a') as f:
            f.write(f"\n#### Task {task.task_id}\n")
            f.write(f"- **Description**: {task.description}\n")
            f.write(f"- **Status**: {task.status}\n")
            f.write(f"- **Duration**: {(task.completed_at - task.created_at).total_seconds():.2f}s\n")
            f.write(f"- **Result**: {json.dumps(result, indent=2)}\n")
            f.write("\n")

    def create_agent_workflow(self, workflow_name: str, root_agent_type: AgentType) -> Agent:
        """
        Create a multi-agent workflow

        Example:
            orchestrator = AgentOrchestrator()
            workflow = orchestrator.create_agent_workflow("NQ Processing", AgentType.DATA_PROCESSOR)

            # Spawn sub-agents
            validator = workflow.spawn_sub_agent(AgentType.TESTING_AGENT)
            documenter = workflow.spawn_sub_agent(AgentType.DOCUMENTATION_AGENT)
        """

        root_agent = self.spawn_agent(
            agent_type=root_agent_type,
            context={'workflow_name': workflow_name}
        )

        return root_agent

    def get_workflow_status(self, agent_id: str) -> Dict[str, Any]:
        """Get status of a workflow (agent and all sub-agents)"""

        agent = self.agents.get(agent_id)

        if not agent:
            return {'error': f'Agent {agent_id} not found'}

        return {
            'agent_id': agent.agent_id,
            'agent_type': agent.agent_type.value,
            'level': agent.level,
            'tasks': [
                {
                    'task_id': t.task_id,
                    'description': t.description,
                    'status': t.status,
                    'priority': t.priority
                }
                for t in agent.tasks
            ],
            'sub_agents': [
                self.get_workflow_status(sa.agent_id)
                for sa in agent.sub_agents
            ]
        }

    def save_workflow_state(self, filepath: Path = None):
        """Save workflow state to JSON"""

        if not filepath:
            filepath = self.project_root / "orchestrator" / "state" / f"workflow_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        filepath.parent.mkdir(parents=True, exist_ok=True)

        state = {
            'timestamp': datetime.now().isoformat(),
            'agents': {
                agent_id: {
                    'agent_type': agent.agent_type.value,
                    'level': agent.level,
                    'parent_id': agent.parent_id,
                    'tasks': [
                        {
                            'task_id': t.task_id,
                            'description': t.description,
                            'status': t.status,
                            'created_at': t.created_at.isoformat(),
                            'completed_at': t.completed_at.isoformat() if t.completed_at else None
                        }
                        for t in agent.tasks
                    ]
                }
                for agent_id, agent in self.agents.items()
            }
        }

        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)

        return filepath


# Example usage and CLI interface
if __name__ == "__main__":

    # Example 1: Simple agent spawn
    orchestrator = AgentOrchestrator()

    # Spawn a data processor agent
    data_agent = orchestrator.spawn_agent(
        agent_type=AgentType.DATA_PROCESSOR,
        context={'task': 'Process NQ futures data'}
    )

    # The data agent spawns sub-agents for specific tasks
    validator = data_agent.spawn_sub_agent(
        agent_type=AgentType.TESTING_AGENT,
        context={'validate': 'processed data quality'}
    )

    documenter = data_agent.spawn_sub_agent(
        agent_type=AgentType.DOCUMENTATION_AGENT,
        context={'document': 'processing pipeline'}
    )

    # Execute the workflow
    result = orchestrator.execute_agent(
        agent=data_agent,
        task_description="Process all 293 NQ weekly CSV files",
        execution_mode=ExecutionMode.PARALLEL
    )

    # Get workflow status
    status = orchestrator.get_workflow_status(data_agent.agent_id)
    print(json.dumps(status, indent=2))

    # Save workflow state
    state_path = orchestrator.save_workflow_state()
    print(f"\nWorkflow state saved to: {state_path}")
