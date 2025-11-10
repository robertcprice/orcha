# Codex MCP Integration - CORRECTED

## ✅ Proper Integration Using `codex mcp-server`

I've corrected the integration to use Codex CLI's built-in MCP server mode, which is the right way to do this.

---

## 🎯 What Codex MCP Server Provides

When you run `codex mcp-server`, it exposes **2 MCP tools**:

### 1. `codex` - Start a Codex Session
Runs a complete Codex session with full configuration.

**Parameters**:
- `prompt` (required) - The task/question for Codex
- `approval-policy` - `untrusted`, `on-failure`, or `never`
- `sandbox` - `read-only`, `workspace-write`, or `danger-full-access`
- `cwd` - Working directory
- `model` - Model override (e.g., `o3`, `o4-mini`)
- `config` - Override config.toml settings
- `base-instructions` - Custom instructions
- `include-plan-tool` - Include planning tool

**Returns**: Conversation ID + results

### 2. `codex-reply` - Continue a Session
Continue an existing Codex conversation.

**Parameters**:
- `conversationId` (required) - The conversation to continue
- `prompt` (required) - Next instruction for Codex

---

## 🔧 Configuration for Claude Code

**File**: `~/.claude/mcp.json`

```json
{
  "mcpServers": {
    "codex": {
      "command": "codex",
      "args": ["mcp-server"]
    }
  }
}
```

**Status**: ✅ Already configured!

---

## 🚀 How to Use in Claude Code

After you restart Claude Code, the Codex MCP tools will be available:

### Start a Codex Session

```
Can you use Codex to build a simple calculator?

<use mcp__codex__codex with
  prompt="Create a Python calculator with add, subtract, multiply, divide operations. Include error handling and tests."
  sandbox="workspace-write"
  approval-policy="never"
  cwd="/Users/bobbyprice/projects/test"
>
```

### Continue a Session

```
<use mcp__codex__codex-reply with
  conversationId="<id-from-previous-response>"
  prompt="Now add support for exponents and square roots"
>
```

---

## 🔄 Integration with Orchestration System

Now let me update the orchestrator to use the Codex MCP server properly.

### Architecture

```
Orchestration System
    ↓
Codex MCP Client (Python)
    ↓
codex mcp-server (STDIO)
    ↓
Codex CLI with o3/o4
    ↓
Generated Code
```

### Workflow

1. **Task arrives** → Orchestrator decides to use Codex
2. **Spawn Codex session** → Use `codex` MCP tool via MCP client
3. **Get results** → Codex returns code + conversation ID
4. **Claude reviews** → Claude review agent checks the code
5. **If needs changes** → Use `codex-reply` with feedback
6. **Repeat** until approved

---

## 📝 Updated Files

I'll create:
1. `orchestrator/codex_mcp_agent.py` - Proper MCP client for Codex
2. `orchestrator/hybrid_codex_claude_v2.py` - Updated hybrid workflow
3. Remove the incorrect API-based implementation

---

## ✅ What You Get

### For Claude Code (You):
- Direct access to Codex via MCP tools
- Can start/continue Codex sessions
- Full configuration control

### For Orchestration:
- Python MCP client connects to `codex mcp-server`
- Spawns Codex sessions for implementation
- Claude reviews the output
- Iterates via `codex-reply` until approved

---

## 🧪 Testing

### Test Codex MCP Server Directly

```bash
# Start MCP inspector
npx @modelcontextprotocol/inspector codex mcp-server

# In the inspector:
# 1. Set Request timeout to 600000ms (10 minutes)
# 2. Set Total timeout to 600000ms
# 3. Use the "codex" tool with:
{
  "prompt": "Create a simple tic-tac-toe game in a single HTML file",
  "approval-policy": "never",
  "sandbox": "workspace-write"
}
```

### Test from Claude Code

After restart:
```
Can you use the Codex MCP server to create a TODO list app?
<use mcp__codex__codex with prompt="..." sandbox="workspace-write">
```

---

## 🎯 Next Steps

1. ✅ MCP config updated to use `codex mcp-server`
2. 🔄 Update orchestrator to use MCP client (in progress)
3. ⏳ Test integration
4. ⏳ Document usage patterns

---

**This is the correct approach** - using Codex's built-in MCP server instead of wrapping APIs!
