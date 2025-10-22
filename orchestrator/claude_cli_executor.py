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

    def __init__(self, project_root: Path):
        self.project_root = project_root

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
            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--dangerously-skip-permissions",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root,
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
