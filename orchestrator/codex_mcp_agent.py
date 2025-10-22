#!/usr/bin/env python3
"""
Codex MCP Agent - Uses Codex CLI as an MCP server

This is the CORRECT implementation using codex mcp-server.

Workflow:
1. Start codex mcp-server subprocess
2. Connect via MCP protocol
3. Use 'codex' tool to start a session
4. Use 'codex-reply' tool to iterate
5. Return results
"""

import asyncio
import json
import subprocess
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime

# MCP SDK
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


@dataclass
class CodexTask:
    """Task for Codex to execute"""
    task_id: str
    title: str
    description: str
    requirements: List[str]
    cwd: str = "."
    sandbox: str = "workspace-write"
    approval_policy: str = "never"


@dataclass
class CodexResult:
    """Result from Codex execution"""
    success: bool
    conversation_id: Optional[str] = None
    output: Optional[str] = None
    files_created: List[str] = None
    error: Optional[str] = None
    iterations: int = 0


class CodexMCPAgent:
    """
    Agent that uses Codex CLI MCP server for implementation.

    Uses the official codex mcp-server with:
    - codex tool: Start a session
    - codex-reply tool: Continue a session
    """

    def __init__(self, agent_id: str, task: CodexTask):
        self.agent_id = agent_id
        self.task = task
        self.conversation_id: Optional[str] = None
        self.iterations = 0
        self.max_iterations = 3

    async def execute(self) -> CodexResult:
        """
        Execute the task using Codex MCP server.

        Returns:
            CodexResult with code and outputs
        """
        print(f"[Codex-MCP-{self.agent_id}] Starting Codex session...")

        start_time = datetime.now()

        try:
            # Create initial prompt
            prompt = self._create_initial_prompt()

            # Start Codex MCP server and execute
            result = await self._run_codex_session(prompt)

            execution_time = (datetime.now() - start_time).total_seconds()
            print(f"[Codex-MCP-{self.agent_id}] Completed in {execution_time:.1f}s")

            return result

        except Exception as e:
            print(f"[Codex-MCP-{self.agent_id}] Error: {e}")
            return CodexResult(
                success=False,
                error=str(e)
            )

    async def refine_with_feedback(self, feedback: str) -> CodexResult:
        """
        Refine implementation based on Claude review feedback.

        Args:
            feedback: Feedback from Claude review

        Returns:
            Updated CodexResult
        """
        self.iterations += 1

        if self.iterations >= self.max_iterations:
            return CodexResult(
                success=False,
                error=f"Max iterations ({self.max_iterations}) reached",
                conversation_id=self.conversation_id,
                iterations=self.iterations
            )

        if not self.conversation_id:
            return CodexResult(
                success=False,
                error="No conversation ID - cannot continue session",
                iterations=self.iterations
            )

        print(f"[Codex-MCP-{self.agent_id}] Refining (iteration {self.iterations})...")

        try:
            # Create refinement prompt
            prompt = self._create_refinement_prompt(feedback)

            # Continue Codex session
            result = await self._continue_codex_session(prompt)
            result.iterations = self.iterations

            return result

        except Exception as e:
            return CodexResult(
                success=False,
                error=str(e),
                conversation_id=self.conversation_id,
                iterations=self.iterations
            )

    def _create_initial_prompt(self) -> str:
        """Create initial prompt for Codex."""
        return f"""Task: {self.task.title}

Description: {self.task.description}

Requirements:
{chr(10).join(f'- {req}' for req in self.task.requirements)}

Please implement this task completely. Write all necessary code, test it, and ensure it works correctly."""

    def _create_refinement_prompt(self, feedback: str) -> str:
        """Create refinement prompt based on feedback."""
        return f"""Based on the code review feedback below, please improve the implementation:

Feedback:
{feedback}

Please address all the issues and improve the code accordingly."""

    async def _run_codex_session(self, prompt: str) -> CodexResult:
        """
        Run a Codex session using the MCP server.

        This connects to 'codex mcp-server' and uses the 'codex' tool.
        """
        # Server parameters for codex mcp-server
        server_params = StdioServerParameters(
            command="codex",
            args=["mcp-server"],
            env=None  # Use current environment
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    # Initialize the session
                    await session.initialize()

                    # Call the 'codex' tool
                    # Note: Don't specify model to use account default
                    # ChatGPT accounts don't support o3
                    result = await session.call_tool(
                        "codex",
                        arguments={
                            "prompt": prompt,
                            "approval-policy": self.task.approval_policy,
                            "sandbox": self.task.sandbox,
                            "cwd": self.task.cwd
                        }
                    )

                    # Parse result
                    return self._parse_codex_result(result)

        except Exception as e:
            print(f"[Codex-MCP-{self.agent_id}] MCP error: {e}")
            return CodexResult(
                success=False,
                error=f"MCP connection failed: {str(e)}"
            )

    async def _continue_codex_session(self, prompt: str) -> CodexResult:
        """
        Continue a Codex session using the 'codex-reply' tool.
        """
        server_params = StdioServerParameters(
            command="codex",
            args=["mcp-server"],
            env=None
        )

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    # Call the 'codex-reply' tool
                    result = await session.call_tool(
                        "codex-reply",
                        arguments={
                            "conversationId": self.conversation_id,
                            "prompt": prompt
                        }
                    )

                    return self._parse_codex_result(result)

        except Exception as e:
            return CodexResult(
                success=False,
                error=f"Failed to continue session: {str(e)}",
                conversation_id=self.conversation_id
            )

    def _parse_codex_result(self, result: Any) -> CodexResult:
        """
        Parse result from Codex MCP tool.

        The result contains the conversation output and ID.
        """
        try:
            # Result is a list of content items
            output_text = ""
            conversation_id = None

            if hasattr(result, 'content'):
                for item in result.content:
                    if hasattr(item, 'text'):
                        output_text += item.text

            # Try to extract conversation ID from output
            # Codex typically includes it in the response
            if "conversation" in output_text.lower():
                # Extract conversation ID
                import re
                match = re.search(r'conversation[_\s]*id[:\s]+([a-zA-Z0-9-]+)', output_text, re.IGNORECASE)
                if match:
                    conversation_id = match.group(1)

            # Store conversation ID for future iterations
            if conversation_id:
                self.conversation_id = conversation_id

            # Determine success
            success = "error" not in output_text.lower() or "successfully" in output_text.lower()

            return CodexResult(
                success=success,
                conversation_id=self.conversation_id,
                output=output_text,
                files_created=[],  # Codex will create files in cwd
                error=None if success else "Execution may have had errors"
            )

        except Exception as e:
            return CodexResult(
                success=False,
                error=f"Failed to parse result: {str(e)}",
                output=str(result)
            )


# Convenience function
async def run_codex_mcp_agent(task: CodexTask) -> CodexResult:
    """
    Run a Codex MCP agent on a task.

    Args:
        task: CodexTask to execute

    Returns:
        CodexResult with implementation
    """
    import uuid
    agent_id = str(uuid.uuid4())[:8]
    agent = CodexMCPAgent(agent_id, task)
    return await agent.execute()
