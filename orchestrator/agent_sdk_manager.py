"""
Claude Agent SDK Manager
Provides high-level abstraction for managing Claude agents using the Anthropic SDK.
Handles agent lifecycle, tool integration, conversation context, and concurrent execution.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum
import anthropic
from anthropic.types import (
    Message,
    TextBlock,
    ToolUseBlock,
    MessageParam,
    MessageStreamEvent,
)


class AgentStatus(Enum):
    """Agent execution status"""
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"


class ToolPermission(Enum):
    """Tool permission levels"""
    ALLOW = "allow"
    DENY = "deny"
    REQUIRE_APPROVAL = "require_approval"


@dataclass
class AgentConfig:
    """Configuration for an agent"""
    role: str
    system_prompt: str
    model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 8192
    temperature: float = 1.0
    tools_enabled: List[str] = field(default_factory=list)
    tool_permissions: Dict[str, ToolPermission] = field(default_factory=dict)
    memory_enabled: bool = True
    max_conversation_history: int = 20


@dataclass
class AgentTask:
    """Task for an agent to execute"""
    task_id: str
    goal: str
    acceptance_criteria: List[str] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
    context_paths: List[str] = field(default_factory=list)
    context_data: Dict[str, Any] = field(default_factory=dict)
    priority: int = 0
    timeout: int = 300


@dataclass
class AgentExecution:
    """Execution context for an agent"""
    task: AgentTask
    status: AgentStatus = AgentStatus.IDLE
    conversation_history: List[MessageParam] = field(default_factory=list)
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    output: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class ToolRegistry:
    """Registry of available tools for agents"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self._tools = {}
        self._register_default_tools()

    def _register_default_tools(self):
        """Register default file and shell tools"""

        # Read file tool
        self._tools["read_file"] = {
            "name": "read_file",
            "description": "Read contents of a file from the project directory",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file relative to project root"
                    },
                    "offset": {
                        "type": "integer",
                        "description": "Line offset to start reading from (optional)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of lines to read (optional)"
                    }
                },
                "required": ["path"]
            }
        }

        # Write file tool
        self._tools["write_file"] = {
            "name": "write_file",
            "description": "Write content to a file in the project directory",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file relative to project root"
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to write to the file"
                    }
                },
                "required": ["path", "content"]
            }
        }

        # Edit file tool
        self._tools["edit_file"] = {
            "name": "edit_file",
            "description": "Edit a file by replacing old_string with new_string",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file relative to project root"
                    },
                    "old_string": {
                        "type": "string",
                        "description": "The exact string to replace"
                    },
                    "new_string": {
                        "type": "string",
                        "description": "The new string to insert"
                    },
                    "replace_all": {
                        "type": "boolean",
                        "description": "Replace all occurrences (default: false)"
                    }
                },
                "required": ["path", "old_string", "new_string"]
            }
        }

        # Run shell command tool
        self._tools["run_shell"] = {
            "name": "run_shell",
            "description": "Run a shell command in the project directory",
            "input_schema": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Shell command to execute"
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Timeout in seconds (default: 30)"
                    }
                },
                "required": ["command"]
            }
        }

        # Search files tool (grep)
        self._tools["search_files"] = {
            "name": "search_files",
            "description": "Search for a pattern in files using regex",
            "input_schema": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Regex pattern to search for"
                    },
                    "path": {
                        "type": "string",
                        "description": "Directory or file to search in"
                    },
                    "file_type": {
                        "type": "string",
                        "description": "File type filter (e.g., 'py', 'js')"
                    }
                },
                "required": ["pattern"]
            }
        }

        # List files tool (glob)
        self._tools["list_files"] = {
            "name": "list_files",
            "description": "List files matching a glob pattern",
            "input_schema": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Glob pattern (e.g., '**/*.py')"
                    },
                    "path": {
                        "type": "string",
                        "description": "Directory to search in"
                    }
                },
                "required": ["pattern"]
            }
        }

    def get_tools(self, tool_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Get tool definitions for the API"""
        if tool_names:
            return [self._tools[name] for name in tool_names if name in self._tools]
        return list(self._tools.values())

    def get_tool_names(self) -> List[str]:
        """Get list of available tool names"""
        return list(self._tools.keys())


class ToolExecutor:
    """Executes tool calls requested by agents"""

    def __init__(self, project_root: Path):
        self.project_root = project_root

    async def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return the result"""
        try:
            if tool_name == "read_file":
                return await self._read_file(tool_input)
            elif tool_name == "write_file":
                return await self._write_file(tool_input)
            elif tool_name == "edit_file":
                return await self._edit_file(tool_input)
            elif tool_name == "run_shell":
                return await self._run_shell(tool_input)
            elif tool_name == "search_files":
                return await self._search_files(tool_input)
            elif tool_name == "list_files":
                return await self._list_files(tool_input)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}

    async def _read_file(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read file implementation"""
        try:
            file_path = self.project_root / params["path"]
            content = file_path.read_text()

            # Apply offset and limit if provided
            lines = content.split('\n')
            offset = params.get("offset", 0)
            limit = params.get("limit")

            if limit:
                lines = lines[offset:offset + limit]
            elif offset:
                lines = lines[offset:]

            return {"content": '\n'.join(lines)}
        except Exception as e:
            return {"error": str(e)}

    async def _write_file(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write file implementation"""
        try:
            file_path = self.project_root / params["path"]
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(params["content"])
            return {"status": "success", "path": str(file_path)}
        except Exception as e:
            return {"error": str(e)}

    async def _edit_file(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Edit file implementation"""
        try:
            file_path = self.project_root / params["path"]
            content = file_path.read_text()

            old_string = params["old_string"]
            new_string = params["new_string"]
            replace_all = params.get("replace_all", False)

            if replace_all:
                new_content = content.replace(old_string, new_string)
                count = content.count(old_string)
            else:
                new_content = content.replace(old_string, new_string, 1)
                count = 1 if old_string in content else 0

            if count == 0:
                return {"error": "String not found in file"}

            file_path.write_text(new_content)
            return {"status": "success", "replacements": count}
        except Exception as e:
            return {"error": str(e)}

    async def _run_shell(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Run shell command implementation"""
        import subprocess

        try:
            command = params["command"]
            timeout = params.get("timeout", 30)

            # Safety: block dangerous commands
            blocked = ["curl", "wget", "nc", "telnet", "ssh", "scp", "rm -rf /"]
            if any(b in command for b in blocked):
                return {"error": "Blocked command for safety"}

            result = subprocess.run(
                command,
                shell=True,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {"error": f"Command timeout after {timeout}s"}
        except Exception as e:
            return {"error": str(e)}

    async def _search_files(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Search files implementation (basic grep)"""
        import subprocess

        try:
            pattern = params["pattern"]
            path = params.get("path", ".")
            file_type = params.get("file_type")

            cmd_parts = ["rg", "--json", pattern, path]
            if file_type:
                cmd_parts.extend(["-t", file_type])

            result = subprocess.run(
                cmd_parts,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30
            )

            return {
                "output": result.stdout,
                "matches": result.stdout.count('\n')
            }
        except Exception as e:
            return {"error": str(e)}

    async def _list_files(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List files implementation (glob)"""
        try:
            pattern = params["pattern"]
            path = self.project_root / params.get("path", ".")

            files = list(path.glob(pattern))
            file_paths = [str(f.relative_to(self.project_root)) for f in files]

            return {
                "files": file_paths,
                "count": len(file_paths)
            }
        except Exception as e:
            return {"error": str(e)}


class AgentSDKManager:
    """
    High-level manager for Claude agents using the Anthropic SDK.
    Provides agent lifecycle management, tool integration, and execution control.
    """

    def __init__(
        self,
        project_root: Path,
        anthropic_api_key: Optional[str] = None,
        max_concurrent: int = 4
    ):
        self.project_root = project_root
        self.api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.max_concurrent = max_concurrent

        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not provided and not in environment")

        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.tool_registry = ToolRegistry(project_root)
        self.tool_executor = ToolExecutor(project_root)
        self.semaphore = asyncio.Semaphore(max_concurrent)

        # Active executions
        self.executions: Dict[str, AgentExecution] = {}

        # Event callbacks
        self.on_status_change: Optional[Callable] = None
        self.on_tool_call: Optional[Callable] = None
        self.on_completion: Optional[Callable] = None

    async def execute_task(
        self,
        config: AgentConfig,
        task: AgentTask,
        stream: bool = False
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Execute a task with an agent.

        Args:
            config: Agent configuration
            task: Task to execute
            stream: Whether to stream responses (future feature)

        Returns:
            Tuple of (success, output, metadata)
        """
        async with self.semaphore:
            execution = AgentExecution(task=task)
            self.executions[task.task_id] = execution

            try:
                execution.start_time = datetime.now(timezone.utc)
                execution.status = AgentStatus.THINKING
                self._emit_status_change(config.role, task.task_id, execution.status)

                # Build initial message
                user_message = self._build_task_prompt(task)
                execution.conversation_history.append({
                    "role": "user",
                    "content": user_message
                })

                # Execute conversation loop
                max_iterations = 10
                for iteration in range(max_iterations):
                    # Call Claude API
                    response = await self._call_claude(config, execution)

                    # Process response
                    has_tool_calls = False
                    response_text = ""

                    for block in response.content:
                        if isinstance(block, TextBlock):
                            response_text += block.text
                        elif isinstance(block, ToolUseBlock):
                            has_tool_calls = True
                            # Execute tool
                            tool_result = await self._execute_tool_call(
                                config.role,
                                task.task_id,
                                block
                            )
                            execution.tool_calls.append({
                                "tool": block.name,
                                "input": block.input,
                                "result": tool_result
                            })

                            # Add tool result to conversation
                            execution.conversation_history.append({
                                "role": "user",
                                "content": [{
                                    "type": "tool_result",
                                    "tool_use_id": block.id,
                                    "content": json.dumps(tool_result)
                                }]
                            })

                    # Add assistant response to history
                    execution.conversation_history.append({
                        "role": "assistant",
                        "content": response.content
                    })

                    execution.output += response_text

                    # Check for completion
                    if not has_tool_calls:
                        # No more tool calls, task is complete
                        execution.status = AgentStatus.COMPLETED
                        execution.end_time = datetime.now(timezone.utc)

                        success = "TASK COMPLETE" in response_text.upper()
                        metadata = {
                            "iterations": iteration + 1,
                            "tool_calls": len(execution.tool_calls),
                            "duration": (execution.end_time - execution.start_time).total_seconds()
                        }

                        self._emit_completion(config.role, task.task_id, success)
                        return success, execution.output, metadata

                # Max iterations reached
                execution.status = AgentStatus.FAILED
                execution.error = "Max iterations reached"
                execution.end_time = datetime.now(timezone.utc)

                return False, execution.output, {
                    "error": "max_iterations_exceeded",
                    "iterations": max_iterations
                }

            except Exception as e:
                execution.status = AgentStatus.FAILED
                execution.error = str(e)
                execution.end_time = datetime.now(timezone.utc)

                return False, f"Agent error: {str(e)}", {"error": str(e)}

            finally:
                # Cleanup
                if task.task_id in self.executions:
                    del self.executions[task.task_id]

    async def _call_claude(
        self,
        config: AgentConfig,
        execution: AgentExecution
    ) -> Message:
        """Call Claude API with current conversation history"""

        # Get tools for this agent
        tools = self.tool_registry.get_tools(config.tools_enabled)

        # Make API call
        response = self.client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=config.system_prompt,
            messages=execution.conversation_history,
            tools=tools if tools else None
        )

        return response

    async def _execute_tool_call(
        self,
        role: str,
        task_id: str,
        tool_block: ToolUseBlock
    ) -> Dict[str, Any]:
        """Execute a tool call and return the result"""

        execution = self.executions.get(task_id)
        if execution:
            execution.status = AgentStatus.EXECUTING
            self._emit_status_change(role, task_id, execution.status)

        # Emit tool call event
        if self.on_tool_call:
            self.on_tool_call(role, task_id, tool_block.name, tool_block.input)

        # Execute tool
        result = await self.tool_executor.execute(tool_block.name, tool_block.input)

        if execution:
            execution.status = AgentStatus.THINKING
            self._emit_status_change(role, task_id, execution.status)

        return result

    def _build_task_prompt(self, task: AgentTask) -> str:
        """Build the initial task prompt"""
        parts = [
            f"# Task: {task.task_id}",
            "",
            f"## Goal",
            task.goal,
            "",
        ]

        if task.acceptance_criteria:
            parts.extend([
                "## Acceptance Criteria",
                *[f"- {criterion}" for criterion in task.acceptance_criteria],
                "",
            ])

        if task.constraints:
            parts.extend([
                "## Constraints",
                json.dumps(task.constraints, indent=2),
                "",
            ])

        if task.context_paths:
            parts.extend([
                "## Relevant Files",
                *[f"- {path}" for path in task.context_paths],
                "",
            ])

        if task.context_data:
            parts.extend([
                "## Context Data",
                json.dumps(task.context_data, indent=2),
                "",
            ])

        parts.extend([
            "## Instructions",
            "Complete the goal stated above using the available tools.",
            "Use read_file to examine files, edit_file or write_file to make changes.",
            "When the task is complete, respond with 'TASK COMPLETE' in your message.",
            "",
            "Begin your work now.",
        ])

        return "\n".join(parts)

    def _emit_status_change(self, role: str, task_id: str, status: AgentStatus):
        """Emit status change event"""
        if self.on_status_change:
            self.on_status_change(role, task_id, status.value)

    def _emit_completion(self, role: str, task_id: str, success: bool):
        """Emit completion event"""
        if self.on_completion:
            self.on_completion(role, task_id, success)

    def get_execution_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a task execution"""
        execution = self.executions.get(task_id)
        if not execution:
            return None

        return {
            "task_id": task_id,
            "status": execution.status.value,
            "start_time": execution.start_time.isoformat() if execution.start_time else None,
            "tool_calls": len(execution.tool_calls),
            "output_length": len(execution.output),
            "error": execution.error
        }
