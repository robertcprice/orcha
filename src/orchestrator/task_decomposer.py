#!/usr/bin/env python3
"""
Task Decomposer - Breaks down complex tasks into subtasks using ChatGPT-5

Uses ChatGPT-5 to analyze a high-level task and decompose it into:
- Main tasks (high-level components)
- Subtasks (specific work items for each main task)
- Dependencies between tasks
- Execution strategy
"""

import os
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

try:
    from openai import OpenAI
except ImportError:
    print("⚠️  OpenAI library not installed. Install with: pip install openai")
    OpenAI = None


@dataclass
class Subtask:
    """Represents a subtask within a main task"""

    subtask_id: str
    title: str
    description: str
    estimated_complexity: str  # low, medium, high
    required_agents: List[str]  # e.g., ["CODE", "QA"]
    dependencies: List[str] = field(default_factory=list)  # subtask_ids


@dataclass
class MainTask:
    """Represents a main task component"""

    task_id: str
    title: str
    description: str
    subtasks: List[Subtask]
    estimated_time: str  # e.g., "2 hours", "1 day"
    priority: int  # 1 (highest) to 5 (lowest)
    dependencies: List[str] = field(default_factory=list)  # task_ids
    requires_research: bool = False
    research_topics: List[str] = field(default_factory=list)


@dataclass
class DecomposedTask:
    """Complete task decomposition"""

    original_task_id: str
    original_title: str
    original_description: str
    main_tasks: List[MainTask]
    execution_strategy: str
    estimated_total_time: str
    risks: List[str]
    success_criteria: List[str]
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TaskDecomposer:
    """
    Decomposes complex tasks into executable subtasks using ChatGPT-5.
    """

    def __init__(self, openai_api_key: Optional[str] = None):

        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required")

        if OpenAI is None:
            raise ImportError("OpenAI library not installed")

        self.client = OpenAI(api_key=self.api_key)

    def decompose_task(
        self,
        task_id: str,
        title: str,
        description: str,
        context: Optional[Dict] = None,
        architectural_plan: Optional[str] = None,
        verbose: bool = True
    ) -> DecomposedTask:
        """
        Decompose a high-level task into main tasks and subtasks.

        Args:
            task_id: Unique task identifier
            title: Task title
            description: Detailed task description
            context: Additional context (files, dependencies, etc.)
            architectural_plan: Detailed architectural plan from planning layer
            verbose: Print progress

        Returns:
            DecomposedTask with full breakdown
        """

        if verbose:
            print(f"\n{'='*80}")
            print(f"TASK DECOMPOSITION - Using ChatGPT-5")
            print(f"{'='*80}")
            print(f"\nOriginal Task: {title}")
            print(f"Description: {description[:100]}...")
            print(f"\nAnalyzing with ChatGPT-5...\n")

        # Build decomposition prompt
        prompt = self._build_decomposition_prompt(title, description, context, architectural_plan)

        # Call ChatGPT-5 for decomposition
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",  # Will use gpt-5 when available, fallback to gpt-4
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert project planner and task decomposition specialist. You break down complex tasks into clear, actionable subtasks with realistic estimates."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            decomposition_json = response.choices[0].message.content
            decomposition_data = json.loads(decomposition_json)

        except Exception as e:
            if verbose:
                print(f"❌ Decomposition failed: {e}")
            raise

        # Parse response into structured format
        decomposed = self._parse_decomposition(
            task_id,
            title,
            description,
            decomposition_data
        )

        if verbose:
            self._print_decomposition(decomposed)

        return decomposed

    def _build_decomposition_prompt(
        self,
        title: str,
        description: str,
        context: Optional[Dict],
        architectural_plan: Optional[str] = None
    ) -> str:
        """Build the ChatGPT prompt for task decomposition with hyper-specific examples"""

        context_str = ""
        if context:
            context_str = f"\n\nADDITIONAL CONTEXT:\n{json.dumps(context, indent=2)}"

        arch_plan_str = ""
        if architectural_plan:
            arch_plan_str = f"\n\nARCHITECTURAL PLAN:\n{architectural_plan}\n"

        prompt = f"""You are decomposing a complex task into HYPER-SPECIFIC, EXECUTABLE components.

TASK TITLE:
{title}

TASK DESCRIPTION:
{description}{context_str}{arch_plan_str}

YOUR GOAL:
Break this down into a comprehensive execution plan with EXTREME SPECIFICITY.

⚠️ CRITICAL: Your subtask descriptions MUST be hyper-specific with exact implementation details:

✅ GOOD EXAMPLE (Database):
"Create Posts table with exact schema:
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- content: VARCHAR(280) NOT NULL CHECK (char_length(content) > 0)
- created_at: TIMESTAMP NOT NULL DEFAULT NOW()
- likes_count: INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0)
- shares_count: INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0)
- is_deleted: BOOLEAN NOT NULL DEFAULT false
Indexes: CREATE INDEX idx_posts_user_id ON posts(user_id); CREATE INDEX idx_posts_created_at ON posts(created_at DESC);"

❌ BAD EXAMPLE: "Create database schema for posts"

✅ GOOD EXAMPLE (API Endpoint):
"Implement POST /api/posts endpoint:
- Request body: {{ content: string (1-280 chars), media_urls?: string[] }}
- Validation: Trim content, reject if empty or >280 chars, validate URLs with regex
- Authentication: Require JWT token in Authorization header, extract user_id from token
- Database: INSERT INTO posts (user_id, content, created_at) VALUES ($1, $2, NOW()) RETURNING *
- Response: 201 with {{ id, user_id, content, created_at, likes_count: 0, shares_count: 0 }}
- Error handling: 400 for validation errors, 401 for missing/invalid token, 500 for DB errors"

❌ BAD EXAMPLE: "Create API endpoint for posting"

✅ GOOD EXAMPLE (Frontend Component):
"Create PostCard.tsx component with exact structure:
- Props: {{ post: {{ id: string, user_id: string, content: string, created_at: string, likes_count: number, is_liked: boolean }}, onLike: (id: string) => void, onComment: (id: string) => void }}
- Layout: User avatar (40x40 circle), username (bold), timestamp (gray, relative format), content (word-wrap), action buttons (like with heart icon showing likes_count, comment with icon, share)
- State: Optimistic like updates (toggle is_liked immediately, increment/decrement likes_count)
- Styling: Tailwind CSS, hover effects on buttons, truncate username if >20 chars
- Accessibility: aria-labels on buttons, keyboard navigation support"

❌ BAD EXAMPLE: "Create post display component"

AVAILABLE AGENT TYPES:
- PP (Product Planner) - Requirements, planning
- AR (Architect/Reviewer) - Design, code review
- IM (Implementer) - Core implementation
- RD (Researcher/Documenter) - Research, documentation
- CODE (Coding Specialist) - Advanced implementation
- QA (Testing Specialist) - Testing, debugging
- RES (Research Specialist) - Web research, information gathering
- DOC (Documentation Specialist) - Technical writing
- DATA (Data Engineering) - Data pipelines
- TRAIN (Training Specialist) - Model training
- DEVOPS (DevOps) - Deployment, infrastructure

OUTPUT FORMAT (JSON):
{{
  "main_tasks": [
    {{
      "task_id": "task-1",
      "title": "Clear, specific task name (e.g., 'Implement Posts Database Schema and Migrations')",
      "description": "What this task accomplishes with specific deliverables",
      "estimated_time": "2 hours" or "1 day" etc,
      "priority": 1-5 (1=highest),
      "dependencies": ["task-id-this-depends-on"],
      "requires_research": true/false,
      "research_topics": ["specific topic1", "specific topic2"],
      "subtasks": [
        {{
          "subtask_id": "task-1-sub-1",
          "title": "Hyper-specific work item (e.g., 'Create Posts table with exact schema and indexes')",
          "description": "HYPER-DETAILED description with exact field names, types, constraints, validation rules, error handling, etc. See examples above.",
          "estimated_complexity": "low|medium|high",
          "required_agents": ["CODE", "QA"],
          "dependencies": ["task-1-sub-0"]
        }}
      ]
    }}
  ],
  "execution_strategy": "How to approach this (sequential, parallel, etc) with specific reasoning",
  "estimated_total_time": "Overall time estimate with breakdown",
  "risks": ["Specific, concrete risk with mitigation strategy"],
  "success_criteria": ["Specific, measurable criterion (e.g., 'All API endpoints return proper status codes and JSON responses')"]
}}

CRITICAL REQUIREMENTS:
1. ⚠️ EVERY subtask description MUST include exact implementation details:
   - Database: Exact column names, types, constraints, indexes
   - APIs: Exact endpoint paths, request/response formats, validation rules, status codes
   - Frontend: Exact component props, state, styling approach, interactions
   - Auth: Exact token format, validation steps, error responses

2. ⚠️ Be RUTHLESSLY specific - assume the agent has never seen this codebase:
   - Don't say "handle errors" → Say "Return 400 with {{ error: 'Content exceeds 280 characters', field: 'content' }} for validation errors"
   - Don't say "create database" → Say "Create PostgreSQL table with exact schema: id UUID PRIMARY KEY..."
   - Don't say "add styling" → Say "Use Tailwind classes: 'flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600...'"

3. ⚠️ Include ALL work - no hidden assumptions:
   - Database migrations, indexes, constraints
   - Input validation, sanitization, error messages
   - Loading states, error states, empty states
   - Edge cases (empty data, network errors, unauthorized access)

4. ⚠️ Dependencies MUST be explicit:
   - "This requires the Posts table to exist" → Add dependency on database creation subtask
   - "This needs JWT middleware" → Add dependency on auth middleware subtask

Generate the HYPER-SPECIFIC decomposition now:"""

        return prompt

    def _parse_decomposition(
        self,
        task_id: str,
        title: str,
        description: str,
        data: Dict
    ) -> DecomposedTask:
        """Parse ChatGPT response into DecomposedTask"""

        main_tasks = []

        for task_data in data.get("main_tasks", []):

            # Parse subtasks
            subtasks = []
            for subtask_data in task_data.get("subtasks", []):
                subtask = Subtask(
                    subtask_id=subtask_data.get("subtask_id", f"sub-{uuid.uuid4().hex[:8]}"),
                    title=subtask_data.get("title", "Untitled subtask"),
                    description=subtask_data.get("description", ""),
                    estimated_complexity=subtask_data.get("estimated_complexity", "medium"),
                    required_agents=subtask_data.get("required_agents", []),
                    dependencies=subtask_data.get("dependencies", [])
                )
                subtasks.append(subtask)

            # Create main task
            main_task = MainTask(
                task_id=task_data.get("task_id", f"task-{uuid.uuid4().hex[:8]}"),
                title=task_data.get("title", "Untitled task"),
                description=task_data.get("description", ""),
                subtasks=subtasks,
                estimated_time=task_data.get("estimated_time", "unknown"),
                priority=task_data.get("priority", 3),
                dependencies=task_data.get("dependencies", []),
                requires_research=task_data.get("requires_research", False),
                research_topics=task_data.get("research_topics", [])
            )
            main_tasks.append(main_task)

        return DecomposedTask(
            original_task_id=task_id,
            original_title=title,
            original_description=description,
            main_tasks=main_tasks,
            execution_strategy=data.get("execution_strategy", "Sequential execution"),
            estimated_total_time=data.get("estimated_total_time", "unknown"),
            risks=data.get("risks", []),
            success_criteria=data.get("success_criteria", [])
        )

    def _print_decomposition(self, decomposed: DecomposedTask):
        """Print decomposition in readable format"""

        print(f"\n{'='*80}")
        print(f"TASK DECOMPOSITION COMPLETE")
        print(f"{'='*80}\n")

        print(f"📋 Original Task: {decomposed.original_title}")
        print(f"⏱️  Estimated Total Time: {decomposed.estimated_total_time}")
        print(f"📊 Main Tasks: {len(decomposed.main_tasks)}")
        print(f"🎯 Strategy: {decomposed.execution_strategy}\n")

        print(f"{'─'*80}")
        print("MAIN TASKS & SUBTASKS")
        print(f"{'─'*80}\n")

        for i, task in enumerate(decomposed.main_tasks, 1):
            print(f"{i}. [{task.task_id}] {task.title}")
            print(f"   Priority: {task.priority} | Time: {task.estimated_time}")

            if task.dependencies:
                print(f"   Dependencies: {', '.join(task.dependencies)}")

            if task.requires_research:
                print(f"   🔍 Research: {', '.join(task.research_topics)}")

            print(f"   Subtasks ({len(task.subtasks)}):")

            for j, subtask in enumerate(task.subtasks, 1):
                print(f"      {i}.{j} {subtask.title}")
                print(f"          Complexity: {subtask.estimated_complexity}")
                print(f"          Agents: {', '.join(subtask.required_agents)}")

            print()

        if decomposed.risks:
            print(f"{'─'*80}")
            print("⚠️  RISKS:")
            for risk in decomposed.risks:
                print(f"   - {risk}")
            print()

        if decomposed.success_criteria:
            print(f"{'─'*80}")
            print("✅ SUCCESS CRITERIA:")
            for criterion in decomposed.success_criteria:
                print(f"   - {criterion}")
            print()

        print(f"{'='*80}\n")


async def main():
    """Test task decomposer"""

    decomposer = TaskDecomposer()

    # Test task
    test_task = {
        "task_id": "test-001",
        "title": "Implement User Authentication System",
        "description": """
        Create a complete user authentication system with:
        - User registration and login
        - JWT token-based authentication
        - Password reset functionality
        - Email verification
        - Role-based access control
        - Session management
        """,
        "context": {
            "tech_stack": "Node.js, Express, PostgreSQL",
            "existing_files": ["server/index.ts", "database/schema.sql"]
        }
    }

    decomposed = decomposer.decompose_task(
        task_id=test_task["task_id"],
        title=test_task["title"],
        description=test_task["description"],
        context=test_task["context"],
        verbose=True
    )

    # Save decomposition
    output_file = "test_decomposition.json"
    with open(output_file, 'w') as f:
        json.dump({
            "original_task": test_task,
            "decomposed": {
                "main_tasks": [
                    {
                        "task_id": t.task_id,
                        "title": t.title,
                        "description": t.description,
                        "estimated_time": t.estimated_time,
                        "priority": t.priority,
                        "requires_research": t.requires_research,
                        "research_topics": t.research_topics,
                        "subtasks": [
                            {
                                "subtask_id": s.subtask_id,
                                "title": s.title,
                                "description": s.description,
                                "complexity": s.estimated_complexity,
                                "agents": s.required_agents
                            }
                            for s in t.subtasks
                        ]
                    }
                    for t in decomposed.main_tasks
                ],
                "strategy": decomposed.execution_strategy,
                "total_time": decomposed.estimated_total_time,
                "risks": decomposed.risks,
                "success_criteria": decomposed.success_criteria
            }
        }, f, indent=2)

    print(f"✅ Decomposition saved to {output_file}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
