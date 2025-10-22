"""
Manager Agents - Domain-specific task coordinators

Manager agents sit between the orchestrator and Claude coding agents.
They group related subtasks by domain and assign 1-2 Claude agents per specific function.

Hierarchy:
    Orchestrator
        ↓
    Manager Agents (Database, Frontend, Infrastructure, etc.)
        ↓
    Claude Coding Agents (1-2 per specific task)

Author: AlgoMind Orchestration System
Date: 2025-10-11
"""

import logging
import asyncio
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class ManagerType(Enum):
    """Types of manager agents"""
    DATABASE = "database"
    FRONTEND = "frontend"
    BACKEND = "backend"
    INFRASTRUCTURE = "infrastructure"
    TESTING = "testing"
    DOCUMENTATION = "documentation"


@dataclass
class ManagedTask:
    """Task being managed by a manager agent"""

    task_id: str
    title: str
    description: str
    complexity: str
    assigned_agents: List[str] = field(default_factory=list)
    status: str = "pending"  # pending, in_progress, completed, failed
    result: Optional[Dict] = None


class ManagerAgent:
    """
    Base class for manager agents.

    Manager agents:
    1. Receive related subtasks from orchestrator
    2. Group tasks by specific functions
    3. Assign 1-2 Claude agents per function
    4. Coordinate agent execution
    5. Collect and validate results
    """

    def __init__(self, manager_type: ManagerType, verbose: bool = True):
        """
        Initialize manager agent

        Args:
            manager_type: Type of manager (database, frontend, etc.)
            verbose: Enable verbose logging
        """

        self.manager_type = manager_type
        self.verbose = verbose
        self.logger = logging.getLogger(f"{__name__}.{manager_type.value}")
        self.managed_tasks: List[ManagedTask] = []

    async def manage_tasks(
        self,
        subtasks: List[Dict],
        spawn_agent_func: callable
    ) -> List[Dict]:
        """
        Manage a group of related subtasks

        Args:
            subtasks: List of subtask dictionaries
            spawn_agent_func: Function to spawn Claude agents

        Returns:
            List of results from all managed tasks
        """

        if self.verbose:
            self.logger.info(f"\n{'='*80}")
            self.logger.info(f"{self.manager_type.value.upper()} MANAGER - Managing {len(subtasks)} tasks")
            self.logger.info(f"{'='*80}\n")

        # Convert subtasks to managed tasks
        for subtask in subtasks:

            managed = ManagedTask(
                task_id=subtask.get('subtask_id', 'unknown'),
                title=subtask.get('title', 'Untitled'),
                description=subtask.get('description', ''),
                complexity=subtask.get('complexity', 'medium')
            )
            self.managed_tasks.append(managed)

        # Group tasks by function (domain-specific logic)
        task_groups = self._group_tasks_by_function(self.managed_tasks)

        if self.verbose:
            self.logger.info(f"Grouped {len(self.managed_tasks)} tasks into {len(task_groups)} functional groups\n")

        # Assign and execute agents for each group
        results = []

        for group_name, tasks in task_groups.items():

            if self.verbose:
                self.logger.info(f"\n{'-'*80}")
                self.logger.info(f"Processing group: {group_name} ({len(tasks)} tasks)")
                self.logger.info(f"{'-'*80}\n")

            # Assign 1-2 agents per task group
            group_results = await self._execute_task_group(
                group_name,
                tasks,
                spawn_agent_func
            )

            results.extend(group_results)

        if self.verbose:
            self.logger.info(f"\n{'='*80}")
            self.logger.info(f"{self.manager_type.value.upper()} MANAGER - Completed {len(results)} tasks")
            self.logger.info(f"{'='*80}\n")

        return results

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """
        Group tasks by specific functions.
        Override in subclasses for domain-specific grouping.

        Args:
            tasks: List of managed tasks

        Returns:
            Dictionary of function_name -> tasks
        """

        # Default: One task per group
        return {task.title: [task] for task in tasks}

    async def _execute_task_group(
        self,
        group_name: str,
        tasks: List[ManagedTask],
        spawn_agent_func: callable
    ) -> List[Dict]:
        """
        Execute a group of related tasks with 1-2 Claude agents

        Args:
            group_name: Name of the functional group
            tasks: Tasks in this group
            spawn_agent_func: Function to spawn Claude agents

        Returns:
            List of results
        """

        if self.verbose:
            self.logger.info(f"Assigning agents for: {group_name}")

        # Decide agent assignment (1 or 2 agents based on complexity)
        num_agents = self._determine_agent_count(tasks)

        if num_agents == 1:

            # Single agent handles all tasks in group
            combined_prompt = self._build_combined_prompt(group_name, tasks)

            if self.verbose:
                self.logger.info(f"  → Assigning 1 agent for {len(tasks)} tasks")

            result = await spawn_agent_func(combined_prompt)

            for task in tasks:
                task.status = "completed"
                task.assigned_agents = ["agent-1"]
                task.result = result

            return [result]

        else:

            # Split tasks between 2 agents (parallel execution)
            if self.verbose:
                self.logger.info(f"  → Assigning 2 agents for {len(tasks)} tasks (parallel)")

            split_index = len(tasks) // 2
            tasks_agent1 = tasks[:split_index]
            tasks_agent2 = tasks[split_index:]

            prompt1 = self._build_combined_prompt(f"{group_name} (Part 1)", tasks_agent1)
            prompt2 = self._build_combined_prompt(f"{group_name} (Part 2)", tasks_agent2)

            # Execute in parallel
            results = await asyncio.gather(
                spawn_agent_func(prompt1),
                spawn_agent_func(prompt2)
            )

            # Mark tasks as completed
            for task in tasks_agent1:
                task.status = "completed"
                task.assigned_agents = ["agent-1"]
                task.result = results[0]

            for task in tasks_agent2:
                task.status = "completed"
                task.assigned_agents = ["agent-2"]
                task.result = results[1]

            return results

    def _determine_agent_count(self, tasks: List[ManagedTask]) -> int:
        """
        Determine if 1 or 2 agents should handle this group

        Args:
            tasks: Tasks in group

        Returns:
            1 or 2
        """

        # Use 2 agents if:
        # - More than 2 tasks in group
        # - Any task is high complexity
        # - Total estimated work > threshold

        if len(tasks) > 2:
            return 2

        if any(task.complexity == "high" for task in tasks):
            return 2

        return 1

    def _build_combined_prompt(self, group_name: str, tasks: List[ManagedTask]) -> str:
        """
        Build prompt for Claude agent(s) handling this task group

        Args:
            group_name: Name of functional group
            tasks: Tasks to include

        Returns:
            Prompt string
        """

        prompt = f"""You are a coding agent working on: {group_name}

You have been assigned {len(tasks)} related task(s) to complete. Complete ALL tasks in order.

"""

        for i, task in enumerate(tasks, 1):

            prompt += f"""
{'='*80}
TASK {i}/{len(tasks)}: {task.title}
{'='*80}

{task.description}

Complexity: {task.complexity}

"""

        prompt += f"""
{'='*80}

INSTRUCTIONS:
1. Complete each task in the order listed above
2. Verify your implementation works correctly
3. Handle errors and edge cases
4. Follow best practices for {self.manager_type.value} development
5. Report completion status for each task

Begin implementation now.
"""

        return prompt


class DatabaseManager(ManagerAgent):
    """
    Manages database-related tasks:
    - Schema design and migrations
    - Table creation
    - Index optimization
    - Query implementation
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.DATABASE, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group database tasks by logical functions"""

        groups = {
            'schema_design': [],
            'table_creation': [],
            'indexes_and_constraints': [],
            'migrations': [],
            'queries': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # Schema design
            if 'schema' in title_lower or 'design' in title_lower:
                groups['schema_design'].append(task)

            # Table creation
            elif 'table' in title_lower or 'create' in desc_lower:
                groups['table_creation'].append(task)

            # Indexes and constraints
            elif 'index' in title_lower or 'constraint' in title_lower:
                groups['indexes_and_constraints'].append(task)

            # Migrations
            elif 'migration' in title_lower:
                groups['migrations'].append(task)

            # Queries
            elif 'query' in title_lower or 'select' in desc_lower:
                groups['queries'].append(task)

            else:
                # Default to table creation
                groups['table_creation'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


class FrontendManager(ManagerAgent):
    """
    Manages frontend-related tasks:
    - Component creation
    - State management
    - UI/UX implementation
    - Styling
    - Client-side routing
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.FRONTEND, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group frontend tasks by logical functions"""

        groups = {
            'core_components': [],
            'state_management': [],
            'styling_and_layout': [],
            'routing': [],
            'forms_and_validation': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # State management
            if 'state' in title_lower or 'redux' in title_lower or 'context' in title_lower:
                groups['state_management'].append(task)

            # Styling
            elif 'style' in title_lower or 'css' in title_lower or 'tailwind' in desc_lower:
                groups['styling_and_layout'].append(task)

            # Routing
            elif 'route' in title_lower or 'navigation' in title_lower:
                groups['routing'].append(task)

            # Forms
            elif 'form' in title_lower or 'validation' in title_lower or 'input' in title_lower:
                groups['forms_and_validation'].append(task)

            # Components (default)
            else:
                groups['core_components'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


class BackendManager(ManagerAgent):
    """
    Manages backend-related tasks:
    - API endpoints
    - Business logic
    - Middleware
    - Authentication/Authorization
    - Request/Response handling
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.BACKEND, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group backend tasks by logical functions"""

        groups = {
            'authentication': [],
            'api_endpoints': [],
            'middleware': [],
            'business_logic': [],
            'error_handling': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # Authentication
            if 'auth' in title_lower or 'login' in title_lower or 'jwt' in desc_lower:
                groups['authentication'].append(task)

            # Middleware
            elif 'middleware' in title_lower or 'interceptor' in title_lower:
                groups['middleware'].append(task)

            # Error handling
            elif 'error' in title_lower or 'validation' in title_lower:
                groups['error_handling'].append(task)

            # Business logic
            elif 'logic' in title_lower or 'service' in title_lower:
                groups['business_logic'].append(task)

            # API endpoints (default)
            else:
                groups['api_endpoints'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


class InfrastructureManager(ManagerAgent):
    """
    Manages infrastructure-related tasks:
    - Deployment
    - CI/CD pipelines
    - Environment configuration
    - Monitoring and logging
    - Security
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.INFRASTRUCTURE, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group infrastructure tasks by logical functions"""

        groups = {
            'deployment': [],
            'cicd': [],
            'configuration': [],
            'monitoring': [],
            'security': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # Deployment
            if 'deploy' in title_lower or 'docker' in desc_lower or 'kubernetes' in desc_lower:
                groups['deployment'].append(task)

            # CI/CD
            elif 'ci' in title_lower or 'cd' in title_lower or 'pipeline' in title_lower:
                groups['cicd'].append(task)

            # Monitoring
            elif 'monitor' in title_lower or 'logging' in title_lower or 'metrics' in desc_lower:
                groups['monitoring'].append(task)

            # Security
            elif 'security' in title_lower or 'ssl' in title_lower or 'https' in desc_lower:
                groups['security'].append(task)

            # Configuration (default)
            else:
                groups['configuration'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


class TestingManager(ManagerAgent):
    """
    Manages testing-related tasks:
    - Unit tests
    - Integration tests
    - E2E tests
    - Test infrastructure
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.TESTING, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group testing tasks by logical functions"""

        groups = {
            'unit_tests': [],
            'integration_tests': [],
            'e2e_tests': [],
            'test_infrastructure': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # E2E tests
            if 'e2e' in title_lower or 'end-to-end' in title_lower or 'cypress' in desc_lower:
                groups['e2e_tests'].append(task)

            # Integration tests
            elif 'integration' in title_lower or 'api test' in desc_lower:
                groups['integration_tests'].append(task)

            # Test infrastructure
            elif 'setup' in title_lower or 'config' in title_lower or 'infrastructure' in title_lower:
                groups['test_infrastructure'].append(task)

            # Unit tests (default)
            else:
                groups['unit_tests'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


class DocumentationManager(ManagerAgent):
    """
    Manages documentation-related tasks:
    - API documentation
    - User guides
    - Technical documentation
    - Code comments
    """

    def __init__(self, verbose: bool = True):

        super().__init__(ManagerType.DOCUMENTATION, verbose)

    def _group_tasks_by_function(self, tasks: List[ManagedTask]) -> Dict[str, List[ManagedTask]]:
        """Group documentation tasks by logical functions"""

        groups = {
            'api_docs': [],
            'user_guides': [],
            'technical_docs': [],
            'code_comments': []
        }

        for task in tasks:

            title_lower = task.title.lower()
            desc_lower = task.description.lower()

            # API docs
            if 'api' in title_lower or 'swagger' in desc_lower or 'openapi' in desc_lower:
                groups['api_docs'].append(task)

            # User guides
            elif 'user' in title_lower or 'guide' in title_lower or 'tutorial' in desc_lower:
                groups['user_guides'].append(task)

            # Code comments
            elif 'comment' in title_lower or 'docstring' in desc_lower:
                groups['code_comments'].append(task)

            # Technical docs (default)
            else:
                groups['technical_docs'].append(task)

        # Remove empty groups
        return {k: v for k, v in groups.items() if v}


def create_manager_for_task(main_task: Dict, verbose: bool = True) -> Optional[ManagerAgent]:
    """
    Factory function to create appropriate manager for a main task

    Args:
        main_task: Main task dictionary
        verbose: Enable verbose logging

    Returns:
        Appropriate ManagerAgent instance or None
    """

    title = main_task.get('title', '').lower()
    description = main_task.get('description', '').lower()

    # Database
    if any(word in title or word in description for word in ['database', 'schema', 'table', 'migration', 'sql']):
        return DatabaseManager(verbose)

    # Frontend
    if any(word in title or word in description for word in ['frontend', 'ui', 'component', 'react', 'vue', 'angular']):
        return FrontendManager(verbose)

    # Backend
    if any(word in title or word in description for word in ['backend', 'api', 'endpoint', 'server', 'middleware']):
        return BackendManager(verbose)

    # Infrastructure
    if any(word in title or word in description for word in ['deploy', 'infra', 'cicd', 'docker', 'kubernetes', 'aws']):
        return InfrastructureManager(verbose)

    # Testing
    if any(word in title or word in description for word in ['test', 'qa', 'testing', 'e2e', 'unit', 'integration']):
        return TestingManager(verbose)

    # Documentation
    if any(word in title or word in description for word in ['document', 'docs', 'readme', 'guide']):
        return DocumentationManager(verbose)

    # No specific manager (use generic)
    return None


async def main():
    """Example usage"""

    logging.basicConfig(level=logging.INFO)

    # Example database tasks
    db_tasks = [
        {
            'subtask_id': 'db-1',
            'title': 'Create Users table',
            'description': 'Create Users table with id, username, email, created_at',
            'complexity': 'medium'
        },
        {
            'subtask_id': 'db-2',
            'title': 'Create Posts table',
            'description': 'Create Posts table with id, user_id, content, likes_count',
            'complexity': 'medium'
        },
        {
            'subtask_id': 'db-3',
            'title': 'Add indexes',
            'description': 'Add indexes on user_id and created_at columns',
            'complexity': 'low'
        }
    ]

    # Mock agent spawn function
    async def mock_spawn_agent(prompt: str) -> Dict:

        print(f"\n[MOCK AGENT] Received prompt:\n{prompt[:200]}...\n")
        await asyncio.sleep(0.5)  # Simulate work
        return {'status': 'completed', 'output': 'Mock agent completed task'}

    # Create and run database manager
    db_manager = DatabaseManager(verbose=True)
    results = await db_manager.manage_tasks(db_tasks, mock_spawn_agent)

    print(f"\n✅ Manager completed with {len(results)} results")


if __name__ == "__main__":
    asyncio.run(main())
