# ChatGPT Codex MCP Server

**Status: ✅ CONFIGURED AND READY**

This MCP server provides ChatGPT's Code Interpreter capabilities to Claude Code through the Model Context Protocol.

## What It Does

Gives Claude Code access to:
- **Execute Python code** in a sandboxed environment
- **Run shell commands** safely
- **Analyze data** with automatic visualizations
- **Generate files** and outputs

## Available Tools

### 1. `execute_code`
Execute Python code using ChatGPT's Code Interpreter.

**Example**:
```
Execute this code to analyze the data:
<use tool="mcp__chatgpt-codex__execute_code" with code="
import pandas as pd
data = pd.read_csv('sales.csv')
print(data.describe())
" and description="Analyze sales data">
```

### 2. `run_shell_command`
Run shell commands in a sandboxed environment.

**Example**:
```
<use tool="mcp__chatgpt-codex__run_shell_command" with command="ls -la" and description="List files">
```

### 3. `analyze_data`
Comprehensive data analysis with visualizations.

**Example**:
```
<use tool="mcp__chatgpt-codex__analyze_data" with
  data="CSV data here or path to file"
  analysis_type="statistical"
  requirements="Find correlations and outliers">
```

## Configuration

**Location**: `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "chatgpt-codex": {
      "command": "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/venv/bin/python",
      "args": [
        "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System/mcp-servers/chatgpt-codex/server.py"
      ],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

## Requirements

**Already installed in venv**:
- ✅ `mcp>=0.9.0`
- ✅ `openai>=1.54.0`

## How to Use

### In Claude Code

The tools are automatically available in any Claude Code session. Just reference them:

```
Can you execute this Python code using the Codex MCP server:
<tool request for mcp__chatgpt-codex__execute_code>
```

Claude Code will automatically:
1. Detect the MCP server
2. Start it when needed
3. Execute the tool
4. Return results

### Testing

Test the server directly:
```bash
cd "/Users/bobbyprice/projects/Smart Market Solutions/Orchestration-System"
export OPENAI_API_KEY="your-key-here"
./venv/bin/python mcp-servers/chatgpt-codex/server.py
```

## Integration with Orchestration System

The Codex MCP server is now integrated into the orchestration system, allowing:

1. **Codex Agents** - Spawn agents that use ChatGPT Code Interpreter for implementation
2. **Claude Review Agents** - Spawn Claude agents to review, fix, and improve Codex output
3. **Hybrid Workflow** - Codex implements → Claude reviews → Codex fixes → Claude approves

See `orchestrator/codex_agent.py` for implementation details.

## Architecture

```
Claude Code Session
    ↓
MCP Protocol
    ↓
ChatGPT Codex MCP Server (this)
    ↓
OpenAI Assistants API
    ↓
Code Interpreter
```

## Troubleshooting

### Server Not Starting

```bash
# Check if Python venv is accessible
/Users/bobbyprice/projects/Smart\ Market\ Solutions/Orchestration-System/venv/bin/python --version

# Check if MCP is installed
/Users/bobbyprice/projects/Smart\ Market\ Solutions/Orchestration-System/venv/bin/python -c "import mcp; print(mcp.__version__)"
```

### API Key Not Found

Make sure `OPENAI_API_KEY` is set in your environment:
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

Or add it to `~/.zshrc`:
```bash
echo 'export OPENAI_API_KEY="sk-your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### Tool Not Available in Claude Code

1. Restart Claude Code
2. Check `~/.claude/mcp.json` exists and is valid JSON
3. Check file paths in config are correct

## Next Steps

1. **Set OPENAI_API_KEY** environment variable
2. **Restart Claude Code** to load the MCP server
3. **Test in a new session** - tools should appear automatically
4. **Use in orchestrator** - Codex agents can now execute code

---

**Status**: ✅ Configured and ready to use once OPENAI_API_KEY is set!
