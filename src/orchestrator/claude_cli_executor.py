#!/usr/bin/env python3
"""
Claude CLI Executor - Uses Claude Code CLI instead of Anthropic API
For users with Claude Pro subscription who want to use Claude CLI.
"""

import asyncio
import os
from pathlib import Path
from typing import Dict, Any, Tuple


def shell_quote(text: str) -> str:
    """Quote text for safe shell usage"""
    return "'" + text.replace("'", "'\\''") + "'"


class ClaudeCLIExecutor:
    """Executes tasks using Claude Code CLI (no API key required)"""

    def __init__(self, project_root: Path, working_directory: Path = None):
        self.project_root = project_root
        # ✅ CONSTRAINT: Allow custom working directory for project isolation
        self.working_directory = working_directory or project_root

    async def execute_prompt(
        self,
        prompt: str,
        timeout: int = 300
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Execute a prompt using Claude CLI

        Args:
            prompt: The prompt to send to Claude
            timeout: Timeout in seconds

        Returns:
            Tuple of (success, output, metadata)
        """

        try:
            # Remove ANTHROPIC_API_KEY if present - we want to use Claude CLI session
            env = {**os.environ}
            env.pop('ANTHROPIC_API_KEY', None)

            # Spawn Claude CLI process directly (feed prompt via stdin)
            # ✅ CONSTRAINT: Execute in custom working directory for project isolation
            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--dangerously-skip-permissions",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.working_directory,
                env=env
            )

            # Write prompt to stdin
            if process.stdin:
                process.stdin.write(prompt.encode('utf-8'))
                process.stdin.close()

            # Read output with timeout
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return False, "", {"error": f"Timeout after {timeout}s"}

            stdout = stdout_bytes.decode('utf-8', errors='replace')
            stderr = stderr_bytes.decode('utf-8', errors='replace')

            success = process.returncode == 0

            # Combine output
            output = stdout
            if stderr.strip():
                output += f"\n\n--- Errors ---\n{stderr}"

            metadata = {
                "returncode": process.returncode,
                "stderr": stderr if not success else ""
            }

            return success, output, metadata

        except Exception as e:
            return False, "", {"error": str(e)}

    async def execute_prompt_streaming(
        self,
        prompt: str,
        output_callback=None,
        timeout: int = 300
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Execute a prompt using Claude CLI with streaming output

        Args:
            prompt: The prompt to send to Claude
            output_callback: Async callback function(line) called for each output line
            timeout: Timeout in seconds

        Returns:
            Tuple of (success, output, metadata)
        """

        try:
            # Remove ANTHROPIC_API_KEY if present - we want to use Claude CLI session
            env = {**os.environ}
            env.pop('ANTHROPIC_API_KEY', None)

            # Spawn Claude CLI process
            # ✅ CONSTRAINT: Execute in custom working directory for project isolation
            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--dangerously-skip-permissions",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.working_directory,
                env=env
            )

            # Write prompt to stdin
            if process.stdin:
                process.stdin.write(prompt.encode('utf-8'))
                await process.stdin.drain()
                process.stdin.close()

            # Stream stdout line by line
            output_lines = []
            error_lines = []

            async def read_stream(stream, lines_list, is_error=False):
                """Read stream line by line"""
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    line_str = line.decode('utf-8', errors='replace')
                    lines_list.append(line_str)

                    # Call callback for stdout lines
                    if not is_error and output_callback:
                        await output_callback(line_str.rstrip())

            # Read both streams concurrently with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(process.stdout, output_lines, False),
                        read_stream(process.stderr, error_lines, True)
                    ),
                    timeout=timeout
                )
                await process.wait()
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return False, ''.join(output_lines), {"error": f"Timeout after {timeout}s"}

            success = process.returncode == 0
            output = ''.join(output_lines)
            stderr = ''.join(error_lines)

            if stderr.strip():
                output += f"\n\n--- Errors ---\n{stderr}"

            metadata = {
                "returncode": process.returncode,
                "stderr": stderr if not success else "",
                "lines_streamed": len(output_lines)
            }

            return success, output, metadata

        except Exception as e:
            return False, "", {"error": str(e)}
