#!/usr/bin/env python3
"""
Codex Agent - Uses ChatGPT's Code Interpreter for implementation tasks

This agent:
- Receives implementation tasks from the orchestrator
- Uses ChatGPT o1 for planning
- Uses ChatGPT Code Interpreter for execution
- Returns code, outputs, and files
- Works with Claude review agents for iterative improvement
"""

import os
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from openai import AsyncOpenAI


@dataclass
class CodexTask:
    """Task for Codex agent to execute"""
    task_id: str
    title: str
    description: str
    requirements: List[str]
    context: Dict[str, Any]
    project_path: Optional[str] = None


@dataclass
class CodexResult:
    """Result from Codex agent execution"""
    success: bool
    code: Optional[str] = None
    output: Optional[str] = None
    files_created: List[str] = None
    error: Optional[str] = None
    iterations: int = 0
    execution_time: float = 0.0


class CodexAgent:
    """
    Agent that uses ChatGPT's Code Interpreter for implementation.

    Workflow:
    1. Receive task from orchestrator
    2. Use GPT-o1 to create implementation plan
    3. Use Code Interpreter to execute implementation
    4. Return code and outputs to orchestrator
    5. Iterate based on Claude review feedback
    """

    def __init__(self, agent_id: str, task: CodexTask):

        self.agent_id = agent_id
        self.task = task
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Assistant IDs (cached)
        self.planning_assistant_id: Optional[str] = None
        self.execution_assistant_id: Optional[str] = None

        # Execution state
        self.current_plan: Optional[str] = None
        self.iterations = 0
        self.max_iterations = 3

    async def execute(self) -> CodexResult:
        """
        Execute the task using ChatGPT Codex.

        Returns:
            CodexResult with code, outputs, and execution details
        """

        start_time = datetime.now()

        try:
            # Step 1: Create implementation plan using o1
            print(f"[Codex-{self.agent_id}] Creating implementation plan...")
            plan = await self._create_plan()
            self.current_plan = plan

            # Step 2: Execute implementation using Code Interpreter
            print(f"[Codex-{self.agent_id}] Executing implementation...")
            result = await self._execute_implementation(plan)

            # Step 3: Return result
            execution_time = (datetime.now() - start_time).total_seconds()
            result.execution_time = execution_time
            result.iterations = self.iterations

            return result

        except Exception as e:
            print(f"[Codex-{self.agent_id}] Error: {e}")
            return CodexResult(
                success=False,
                error=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )

    async def refine_with_feedback(self, feedback: str) -> CodexResult:
        """
        Refine implementation based on Claude review feedback.

        Args:
            feedback: Feedback from Claude review agent

        Returns:
            Updated CodexResult
        """

        self.iterations += 1

        if self.iterations >= self.max_iterations:
            return CodexResult(
                success=False,
                error=f"Max iterations ({self.max_iterations}) reached",
                iterations=self.iterations
            )

        print(f"[Codex-{self.agent_id}] Refining based on feedback (iteration {self.iterations})...")

        start_time = datetime.now()

        try:
            # Create refined plan based on feedback
            refined_plan = await self._refine_plan(feedback)
            self.current_plan = refined_plan

            # Re-execute with refined plan
            result = await self._execute_implementation(refined_plan)
            result.execution_time = (datetime.now() - start_time).total_seconds()
            result.iterations = self.iterations

            return result

        except Exception as e:
            return CodexResult(
                success=False,
                error=str(e),
                execution_time=(datetime.now() - start_time).total_seconds(),
                iterations=self.iterations
            )

    async def _create_plan(self) -> str:
        """Create implementation plan using ChatGPT o1."""

        response = await self.client.chat.completions.create(
            model="o1",
            messages=[
                {
                    "role": "user",
                    "content": f"""Create a detailed implementation plan for this task:

Title: {self.task.title}
Description: {self.task.description}

Requirements:
{chr(10).join(f'- {req}' for req in self.task.requirements)}

Context:
{self.task.context}

Provide a step-by-step implementation plan that:
1. Breaks down the task into concrete steps
2. Identifies required code/files to create
3. Specifies testing approach
4. Considers edge cases
5. Is implementable using Python and standard libraries

Format as clear, actionable steps."""
                }
            ]
        )

        plan = response.choices[0].message.content
        print(f"[Codex-{self.agent_id}] Plan created ({len(plan)} chars)")
        return plan

    async def _refine_plan(self, feedback: str) -> str:
        """Refine plan based on review feedback."""

        response = await self.client.chat.completions.create(
            model="o1",
            messages=[
                {
                    "role": "user",
                    "content": f"""Refine this implementation plan based on review feedback:

Original Plan:
{self.current_plan}

Review Feedback:
{feedback}

Create an improved implementation plan that addresses all the feedback while maintaining the original goals.
"""
                }
            ]
        )

        refined_plan = response.choices[0].message.content
        print(f"[Codex-{self.agent_id}] Plan refined based on feedback")
        return refined_plan

    async def _execute_implementation(self, plan: str) -> CodexResult:
        """Execute implementation using Code Interpreter."""

        try:
            # Create thread
            thread = await self.client.beta.threads.create()

            # Send implementation request
            await self.client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=f"""Implement this plan:

{plan}

Task: {self.task.title}
Description: {self.task.description}

Please:
1. Write all necessary code
2. Execute the code to verify it works
3. Create all required files
4. Test the implementation
5. Return:
   - All code you wrote
   - Execution output
   - List of files created
   - Test results

Be thorough and ensure the implementation is complete and working."""
            )

            # Get or create execution assistant
            assistant_id = await self._get_execution_assistant()

            # Run with Code Interpreter
            run = await self.client.beta.threads.runs.create(
                thread_id=thread.id,
                assistant_id=assistant_id,
                instructions="Implement the task completely and thoroughly. Execute code to verify it works."
            )

            # Wait for completion
            while run.status in ["queued", "in_progress"]:
                await asyncio.sleep(2)
                run = await self.client.beta.threads.runs.retrieve(
                    thread_id=thread.id,
                    run_id=run.id
                )

            # Get results
            messages = await self.client.beta.threads.messages.list(
                thread_id=thread.id
            )

            # Extract code, output, and files
            code = None
            output = []
            files_created = []

            for message in messages.data:
                if message.role == "assistant":
                    for content in message.content:
                        if content.type == "text":
                            text = content.text.value
                            output.append(text)

                            # Try to extract code blocks
                            if "```python" in text:
                                code_blocks = text.split("```python")[1:]
                                for block in code_blocks:
                                    if "```" in block:
                                        code = block.split("```")[0].strip()

            # Cleanup
            await self.client.beta.threads.delete(thread.id)

            # Determine success
            success = run.status == "completed"

            return CodexResult(
                success=success,
                code=code,
                output="\n\n".join(output),
                files_created=files_created,
                error=None if success else f"Run status: {run.status}"
            )

        except Exception as e:
            return CodexResult(
                success=False,
                error=str(e)
            )

    async def _get_execution_assistant(self) -> str:
        """Get or create Code Interpreter assistant."""

        if self.execution_assistant_id:
            return self.execution_assistant_id

        # Create assistant
        assistant = await self.client.beta.assistants.create(
            name=f"Codex Agent {self.agent_id}",
            instructions="""You are a code implementation assistant. You:
- Write clean, well-documented code
- Test your implementations thoroughly
- Follow best practices
- Create all necessary files
- Return complete, working solutions""",
            tools=[{"type": "code_interpreter"}],
            model="gpt-4o"
        )

        self.execution_assistant_id = assistant.id
        return assistant.id


# Convenience function for orchestrator
async def run_codex_agent(task: CodexTask) -> CodexResult:
    """
    Run a Codex agent on a task.

    Args:
        task: CodexTask to execute

    Returns:
        CodexResult with implementation
    """

    import uuid
    agent_id = str(uuid.uuid4())[:8]
    agent = CodexAgent(agent_id, task)
    return await agent.execute()
