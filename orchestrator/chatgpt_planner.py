"""
ChatGPT Planning Orchestrator
High-level task planner using OpenAI API that creates execution plans for Claude Code orchestrator.
"""

import os
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field
import openai


@dataclass
class ExecutionPlan:
    """Structured execution plan from ChatGPT"""
    plan_id: str
    goal: str
    reasoning: str
    tasks: List[Dict[str, Any]]
    dependencies: Dict[str, List[str]] = field(default_factory=dict)
    estimated_time: Optional[str] = None
    risks: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ChatGPTPlanner:
    """
    High-level planning orchestrator using ChatGPT.
    Analyzes user goals, creates detailed execution plans, and coordinates Claude Code execution.
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        model: str = "gpt-4o",
        reasoning_model: Optional[str] = None,
        timeout: float = 60.0
    ):
        """
        Initialize ChatGPT Planner

        Args:
            openai_api_key: OpenAI API key
            model: Model for JSON formatting (default: gpt-4o)
            reasoning_model: Optional advanced model for planning (e.g., gpt-5, o3, o3-mini)
                           If set, this model creates the plan, then 'model' formats it as JSON
            timeout: API request timeout in seconds (default: 60.0)
        """
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not provided and not in environment")

        self.client = openai.OpenAI(api_key=self.api_key)
        self.model = model
        self.reasoning_model = reasoning_model  # e.g., "gpt-5", "o3", "o3-mini"
        self.timeout = timeout  # API timeout
        self.conversation_history: List[Dict[str, str]] = []

        # System prompt for planning
        self.system_prompt = self._load_planning_prompt()

    def _load_planning_prompt(self) -> str:
        """Load or generate the planning system prompt"""
        return """You are the Planning Orchestrator for AlgoMind-PPM, an AI system coordinator.

Your role is to:
1. Analyze high-level user goals
2. Break down complex tasks into concrete, executable steps
3. Create detailed execution plans for Claude Code agents
4. Identify task dependencies and optimal execution order
5. Assess risks and suggest mitigation strategies

Available Claude Code Agents:
- **DOC** (Documentation Specialist): Technical writing, ADRs, API docs, user guides
- **CODE** (Coding Specialist): Feature implementation, refactoring, design patterns
- **QA** (Quality Assurance): Testing, debugging, code review, quality checks
- **RES** (Research Specialist): Web research, API exploration, technology evaluation
- **DATA** (Data Engineer): Pipelines, ETL, data processing, validation
- **TRAIN** (ML Training): Model training, hyperparameter tuning, evaluation
- **DEVOPS** (DevOps): Deployment, monitoring, CI/CD, infrastructure
- **COORD** (Coordinator): Task routing, dependency management, workflow orchestration

Agent Capabilities Summary:
- DOC: Can read/write/edit files, create documentation in obsidian-vault
- CODE: Can read/write/edit code, run shell commands, implement features
- QA: Can read code, run tests, execute linters, find bugs
- RES: Can search files, read docs, research topics (web access via custom tool)
- DATA: Full file access + shell, process data, run pipelines
- TRAIN: Full file access + shell, train models, run experiments
- DEVOPS: Full file access + shell, deploy, monitor, manage infrastructure
- COORD: Read-only access, routes tasks to appropriate agents

Project Context:
- **Project**: AlgoMind-PPM (NQ futures trading system)
- **Tech Stack**: Python, PyTorch, Redis, Next.js, TypeScript
- **Structure**: See PROJECT_STRUCTURE.md for file organization
- **Documentation**: Obsidian vault in obsidian-vault/
- **Code Style**: See CLAUDE.md for standards

When creating execution plans, output JSON in this format:

```json
{
  "plan_id": "unique-plan-id",
  "goal": "Brief description of what we're trying to achieve",
  "reasoning": "Why this approach and agent selection",
  "tasks": [
    {
      "task_id": "task-1",
      "agent": "AGENT_ROLE",
      "description": "What this task accomplishes",
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "depends_on": [],
      "priority": "high|medium|low",
      "estimated_time": "5 minutes"
    }
  ],
  "dependencies": {
    "task-2": ["task-1"],
    "task-3": ["task-1", "task-2"]
  },
  "estimated_time": "Total estimated time",
  "risks": ["Risk 1", "Risk 2"]
}
```

Guidelines:
1. **Be specific**: Tasks should be concrete and actionable
2. **Single responsibility**: Each task does one thing well
3. **Proper sequencing**: Respect dependencies (can't test before implementing)
4. **Choose right agents**: Match task to agent capabilities
5. **Include acceptance criteria**: How to verify success
6. **Assess risks**: What could go wrong and how to mitigate

Begin planning when given a user goal."""

    async def create_plan(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ExecutionPlan:
        """
        Create an execution plan for a user goal.

        Args:
            user_goal: High-level description of what the user wants
            context: Additional context (current files, state, etc.)

        Returns:
            ExecutionPlan object with structured task breakdown
        """

        # Build the planning request
        planning_request = self._build_planning_request(user_goal, context)

        # Step 1: If reasoning_model is set, use it for planning first
        if self.reasoning_model:
            print(f"  🧠 Step 1: Using {self.reasoning_model} for advanced reasoning...")

            # Call reasoning model
            # Note: GPT-5 and o3 models support system prompts, but o1 models don't
            if self.reasoning_model.startswith('o1'):
                # o1 models: no system prompt
                reasoning_response = self.client.chat.completions.create(
                    model=self.reasoning_model,
                    messages=[
                        {"role": "user", "content": planning_request}
                    ],
                    timeout=self.timeout
                )
            else:
                # GPT-5, o3, etc: use system prompt
                reasoning_response = self.client.chat.completions.create(
                    model=self.reasoning_model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": planning_request}
                    ],
                    timeout=self.timeout
                )

            raw_plan = reasoning_response.choices[0].message.content
            print(f"  ✅ Reasoning complete ({len(raw_plan)} chars)")

            # Step 2: Format the reasoning output as JSON using gpt-4o
            print(f"  📋 Step 2: Formatting with {self.model} as JSON...")

            format_prompt = f"""You are a JSON formatter. Convert the following execution plan into the exact JSON format specified.

ORIGINAL PLAN (from reasoning model):
{raw_plan}

REQUIRED JSON FORMAT:
```json
{{
  "plan_id": "unique-plan-id",
  "goal": "Brief description of what we're trying to achieve",
  "reasoning": "Why this approach and agent selection",
  "tasks": [
    {{
      "task_id": "task-1",
      "agent": "AGENT_ROLE",
      "description": "What this task accomplishes",
      "acceptance_criteria": ["criterion 1", "criterion 2"],
      "depends_on": [],
      "priority": "high|medium|low",
      "estimated_time": "5 minutes"
    }}
  ],
  "dependencies": {{
    "task-2": ["task-1"],
    "task-3": ["task-1", "task-2"]
  }},
  "estimated_time": "Total estimated time",
  "risks": ["Risk 1", "Risk 2"]
}}
```

Convert the plan above into this exact JSON format. Only output valid JSON, nothing else."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": format_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                timeout=self.timeout
            )

            response_text = response.choices[0].message.content
            print(f"  ✅ JSON formatting complete\n")

        else:
            # Original single-step approach with gpt-4o
            self.conversation_history.append({
                "role": "user",
                "content": planning_request
            })

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    *self.conversation_history
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                timeout=self.timeout
            )

            response_text = response.choices[0].message.content
            self.conversation_history.append({
                "role": "assistant",
                "content": response_text
            })

        # Parse JSON plan
        plan_data = json.loads(response_text)

        # Convert to ExecutionPlan
        execution_plan = ExecutionPlan(
            plan_id=plan_data.get("plan_id", f"plan-{datetime.now().timestamp()}"),
            goal=plan_data.get("goal", user_goal),
            reasoning=plan_data.get("reasoning", ""),
            tasks=plan_data.get("tasks", []),
            dependencies=plan_data.get("dependencies", {}),
            estimated_time=plan_data.get("estimated_time"),
            risks=plan_data.get("risks", [])
        )

        return execution_plan

    def _build_planning_request(
        self,
        user_goal: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the planning request message"""

        parts = [
            "# Planning Request",
            "",
            f"## User Goal",
            user_goal,
            ""
        ]

        if context:
            parts.extend([
                "## Context",
                json.dumps(context, indent=2),
                ""
            ])

        parts.extend([
            "## Instructions",
            "Create a detailed execution plan with:",
            "1. Task breakdown (each task assigned to appropriate agent)",
            "2. Dependencies (what must complete before what)",
            "3. Acceptance criteria (how to verify success)",
            "4. Risk assessment",
            "",
            "Output the plan as JSON following the specified format.",
        ])

        return "\n".join(parts)

    async def refine_plan(
        self,
        plan: ExecutionPlan,
        feedback: str
    ) -> ExecutionPlan:
        """
        Refine an existing plan based on feedback.

        Args:
            plan: The original execution plan
            feedback: Feedback or issues encountered

        Returns:
            Refined ExecutionPlan
        """

        refinement_request = f"""# Plan Refinement Request

## Original Plan
{json.dumps({
    "plan_id": plan.plan_id,
    "goal": plan.goal,
    "tasks": plan.tasks,
    "dependencies": plan.dependencies
}, indent=2)}

## Feedback / Issues
{feedback}

## Instructions
Based on the feedback, create a revised execution plan that addresses the issues.
Output as JSON in the same format."""

        self.conversation_history.append({
            "role": "user",
            "content": refinement_request
        })

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                *self.conversation_history
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
            timeout=self.timeout
        )

        response_text = response.choices[0].message.content
        self.conversation_history.append({
            "role": "assistant",
            "content": response_text
        })

        plan_data = json.loads(response_text)

        return ExecutionPlan(
            plan_id=plan_data.get("plan_id", f"{plan.plan_id}-revised"),
            goal=plan_data.get("goal", plan.goal),
            reasoning=plan_data.get("reasoning", ""),
            tasks=plan_data.get("tasks", []),
            dependencies=plan_data.get("dependencies", {}),
            estimated_time=plan_data.get("estimated_time"),
            risks=plan_data.get("risks", [])
        )

    async def summarize_results(
        self,
        plan: ExecutionPlan,
        results: List[Dict[str, Any]]
    ) -> str:
        """
        Summarize execution results for the user.

        Args:
            plan: The execution plan that was run
            results: Results from each task execution

        Returns:
            User-friendly summary
        """

        summary_request = f"""# Execution Summary Request

## Original Plan
Goal: {plan.goal}
Tasks: {len(plan.tasks)} total

## Execution Results
{json.dumps(results, indent=2)}

## Instructions
Create a clear, user-friendly summary of:
1. What was accomplished
2. Which tasks succeeded/failed
3. Any issues encountered
4. Next recommended steps

Output as plain text (not JSON)."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": summary_request}
            ],
            temperature=0.7,
            timeout=self.timeout
        )

        return response.choices[0].message.content

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []

    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get conversation history"""
        return self.conversation_history.copy()


class PlanValidator:
    """Validates execution plans before sending to Claude Code"""

    @staticmethod
    def validate_plan(plan: ExecutionPlan) -> Tuple[bool, List[str]]:
        """
        Validate an execution plan.

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check required fields
        if not plan.plan_id:
            errors.append("Missing plan_id")
        if not plan.goal:
            errors.append("Missing goal")
        if not plan.tasks:
            errors.append("No tasks in plan")

        # Validate each task
        valid_agents = {"DOC", "CODE", "QA", "RES", "DATA", "TRAIN", "DEVOPS", "COORD",
                       "PP", "AR", "IM", "RD"}  # Include core agents

        for i, task in enumerate(plan.tasks):
            task_id = task.get("task_id", f"task-{i}")

            if not task.get("agent"):
                errors.append(f"{task_id}: Missing agent")
            elif task["agent"] not in valid_agents:
                errors.append(f"{task_id}: Invalid agent '{task['agent']}'")

            if not task.get("description"):
                errors.append(f"{task_id}: Missing description")

            if not task.get("acceptance_criteria"):
                errors.append(f"{task_id}: Missing acceptance criteria")

        # Validate dependencies
        task_ids = {task.get("task_id") for task in plan.tasks}
        for task_id, deps in plan.dependencies.items():
            if task_id not in task_ids:
                errors.append(f"Dependency references non-existent task: {task_id}")
            for dep in deps:
                if dep not in task_ids:
                    errors.append(f"{task_id} depends on non-existent task: {dep}")

        return len(errors) == 0, errors

    @staticmethod
    def check_circular_dependencies(plan: ExecutionPlan) -> Tuple[bool, Optional[List[str]]]:
        """
        Check for circular dependencies in the plan.

        Returns:
            Tuple of (has_circular_deps, cycle_if_found)
        """

        # Build dependency graph
        graph = {task["task_id"]: [] for task in plan.tasks}
        for task_id, deps in plan.dependencies.items():
            if task_id in graph:
                graph[task_id] = deps

        # DFS to detect cycles
        def has_cycle(node, visited, rec_stack, path):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor, visited, rec_stack, path):
                        return True
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    return path[cycle_start:]

            path.pop()
            rec_stack.remove(node)
            return False

        visited = set()
        for node in graph:
            if node not in visited:
                rec_stack = set()
                path = []
                result = has_cycle(node, visited, rec_stack, path)
                if result:
                    return True, result

        return False, None
