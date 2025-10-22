#!/usr/bin/env python3
"""
ChatGPT Codex MCP Server

Provides code execution capabilities through ChatGPT's Code Interpreter
to Claude Code via the Model Context Protocol (MCP).

This server allows Claude Code to:
- Execute Python code in a sandboxed environment
- Run shell commands safely
- Process data and generate outputs
- Create files and visualizations
"""

import os
import sys
import json
import asyncio
from typing import Any, Optional
from openai import AsyncOpenAI

# MCP SDK
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent, ImageContent
except ImportError:
    print("Error: MCP SDK not installed. Run: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create MCP server
mcp_server = Server("chatgpt-codex")


@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools provided by this MCP server."""

    return [
        Tool(
            name="execute_code",
            description="Execute Python code using ChatGPT's Code Interpreter. "
                       "The code runs in a sandboxed environment with access to "
                       "common libraries (numpy, pandas, matplotlib, etc.). "
                       "Returns the execution output, any generated files, and visualizations.",
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute"
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief description of what the code does"
                    }
                },
                "required": ["code"]
            }
        ),
        Tool(
            name="run_shell_command",
            description="Run a shell command using ChatGPT's Code Interpreter. "
                       "Safer than direct shell access as it runs in a sandboxed environment. "
                       "Supports common Unix commands.",
            inputSchema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Shell command to execute"
                    },
                    "description": {
                        "type": "string",
                        "description": "What this command does"
                    }
                },
                "required": ["command"]
            }
        ),
        Tool(
            name="analyze_data",
            description="Analyze data using ChatGPT's Code Interpreter. "
                       "Provide data and analysis requirements, and get back "
                       "statistical analysis, visualizations, and insights.",
            inputSchema={
                "type": "object",
                "properties": {
                    "data": {
                        "type": "string",
                        "description": "Data to analyze (CSV, JSON, or description of data location)"
                    },
                    "analysis_type": {
                        "type": "string",
                        "description": "Type of analysis (statistical, visualization, pattern detection, etc.)"
                    },
                    "requirements": {
                        "type": "string",
                        "description": "Specific analysis requirements or questions to answer"
                    }
                },
                "required": ["data", "analysis_type"]
            }
        )
    ]


@mcp_server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent | ImageContent]:
    """Handle tool calls from Claude Code."""

    if name == "execute_code":
        return await execute_code(
            code=arguments["code"],
            description=arguments.get("description", "Execute code")
        )

    elif name == "run_shell_command":
        return await run_shell_command(
            command=arguments["command"],
            description=arguments.get("description", "Run command")
        )

    elif name == "analyze_data":
        return await analyze_data(
            data=arguments["data"],
            analysis_type=arguments["analysis_type"],
            requirements=arguments.get("requirements", "")
        )

    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]


async def execute_code(code: str, description: str) -> list[TextContent]:
    """Execute Python code using ChatGPT's Code Interpreter."""

    try:
        # Create a thread with Code Interpreter enabled
        thread = await openai_client.beta.threads.create()

        # Send the code execution request
        message = await openai_client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"""Execute this Python code and return the output:

Description: {description}

```python
{code}
```

Return:
1. Any output from the code
2. Any errors that occurred
3. Any files or visualizations created
"""
        )

        # Run with Code Interpreter
        run = await openai_client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=await get_or_create_assistant(),
            instructions="Execute the code and return all outputs, errors, and generated files."
        )

        # Wait for completion
        while run.status in ["queued", "in_progress"]:
            await asyncio.sleep(1)
            run = await openai_client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )

        # Get the response
        messages = await openai_client.beta.threads.messages.list(
            thread_id=thread.id
        )

        # Extract the output
        output = []
        for msg in messages.data:
            if msg.role == "assistant":
                for content in msg.content:
                    if content.type == "text":
                        output.append(TextContent(
                            type="text",
                            text=content.text.value
                        ))

        # Clean up
        await openai_client.beta.threads.delete(thread.id)

        return output if output else [TextContent(
            type="text",
            text="Code executed but no output was generated."
        )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error executing code: {str(e)}"
        )]


async def run_shell_command(command: str, description: str) -> list[TextContent]:
    """Run a shell command using ChatGPT's Code Interpreter."""

    # Wrap command in Python subprocess
    code = f"""import subprocess
result = subprocess.run({repr(command)}, shell=True, capture_output=True, text=True)
print("STDOUT:")
print(result.stdout)
print("\\nSTDERR:")
print(result.stderr)
print("\\nReturn code:", result.returncode)
"""

    return await execute_code(code, f"Run shell command: {description}")


async def analyze_data(data: str, analysis_type: str, requirements: str) -> list[TextContent]:
    """Analyze data using ChatGPT's Code Interpreter."""

    try:
        thread = await openai_client.beta.threads.create()

        message = await openai_client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"""Analyze this data:

Data: {data}

Analysis Type: {analysis_type}
Requirements: {requirements}

Please:
1. Load and inspect the data
2. Perform the requested analysis
3. Create visualizations if appropriate
4. Provide insights and findings
"""
        )

        run = await openai_client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=await get_or_create_assistant(),
            instructions="Analyze the data thoroughly and provide detailed insights."
        )

        while run.status in ["queued", "in_progress"]:
            await asyncio.sleep(1)
            run = await openai_client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )

        messages = await openai_client.beta.threads.messages.list(
            thread_id=thread.id
        )

        output = []
        for msg in messages.data:
            if msg.role == "assistant":
                for content in msg.content:
                    if content.type == "text":
                        output.append(TextContent(
                            type="text",
                            text=content.text.value
                        ))

        await openai_client.beta.threads.delete(thread.id)

        return output if output else [TextContent(
            type="text",
            text="Analysis completed but no output was generated."
        )]

    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error analyzing data: {str(e)}"
        )]


# Cache for assistant ID
_assistant_id: Optional[str] = None


async def get_or_create_assistant() -> str:
    """Get or create the Code Interpreter assistant."""

    global _assistant_id

    if _assistant_id:
        return _assistant_id

    # Create assistant with Code Interpreter
    assistant = await openai_client.beta.assistants.create(
        name="Codex Execution Assistant",
        instructions="You are a code execution assistant. Execute code accurately and return all outputs.",
        tools=[{"type": "code_interpreter"}],
        model="gpt-4o"
    )

    _assistant_id = assistant.id
    return _assistant_id


async def main():
    """Run the MCP server."""

    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    # Run server
    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
