---
description: Spawn a specialized sub-agent to handle a specific subtask
---

# Spawn Agent - Create Sub-Agent for Task

**For agents:** Spawn a specialized sub-agent to handle a specific subtask.

**Usage:** `/spawn-agent <agent_type> <task_description>`

## What This Does

Creates a hierarchical sub-agent to:
1. Handle specialized work (coding, testing, documentation, research, etc.)
2. Work independently with shared context
3. Report results back to parent agent
4. Stay within recursion depth limits

## Available Agent Types

**Core Team:**
- `claude` - Claude Code Agent (MCP-based, code implementation)
- `codex` - Codex MCP Agent (OpenAI-based coding)
- `planner` - ChatGPT Planner (task planning & coordination)

**Specialists:**
- `deepseek` - DeepSeek Agent (code analysis & reasoning)
- `gemini` - Gemini Agent (multimodal analysis)
- `grok` - Grok Agent (research & real-time data)

**Specialized Roles:**
- `research` - Research Specialist (web research, analysis)
- `doc` - Documentation Specialist (technical writing)
- `test` - Testing Specialist (QA, debugging)
- `data` - Data Engineering (pipelines, processing)

## Examples

```bash
/spawn-agent claude "Implement JWT authentication in web-ui/server/auth.ts"
/spawn-agent codex "Create unit tests for authentication endpoints"
/spawn-agent planner "Plan the implementation of real-time monitoring dashboard"
/spawn-agent research "Research best practices for Redis pub/sub patterns"
```

## Now Execute

**Step 1: Verify Agent Type**

Validate the requested agent type is available:

```python
# Available agents in the system
AVAILABLE_AGENTS = {
    'claude': 'orchestrator/claude_code_agent.py',
    'codex': 'orchestrator/codex_mcp_agent.py',
    'planner': 'orchestrator/chatgpt_planner.py',
    'deepseek': 'orchestrator/deepseek_agent.py',
    'gemini': 'orchestrator/gemini_agent.py',
    'grok': 'orchestrator/grok_agent.py',
}
```

**Step 2: Create Task for Sub-Agent**

Use the hybrid orchestrator to spawn the sub-agent:

```python
# Example: Spawning a sub-agent via Python
import asyncio
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

async def spawn_sub_agent():
    orchestrator = HybridOrchestratorV5()

    # Create sub-task
    result = await orchestrator.execute_task(
        task_description="{{ task_description }}",
        agent_preference="{{ agent_type }}",
        parent_context={
            "parent_agent": "current_agent",
            "recursion_depth": 1,
            "shared_context": "relevant context"
        }
    )

    return result

# Run the spawn
asyncio.run(spawn_sub_agent())
```

**Step 3: Alternative - Direct Agent Invocation**

For simpler cases, invoke the agent directly:

```bash
# Claude Code Agent
python3 orchestrator/claude_code_agent.py "{{ task_description }}"

# Codex Agent
python3 orchestrator/codex_mcp_agent.py "{{ task_description }}"

# Planner
python3 orchestrator/chatgpt_planner.py "{{ task_description }}"
```

**Step 4: Monitor Progress**

Track the sub-agent's work:

```bash
# Watch the task status
/taskstatus <spawned_task_id>

# Monitor logs
tail -f web-ui/dev.log

# Check Redis events (if pub/sub enabled)
redis-cli SUBSCRIBE "orchestrator:*"
```

---

## Best Practices

**When to spawn:**
- Task has distinct, specialized components
- Expertise beyond current agent's role needed
- Parallel work can improve efficiency
- Within recursion depth limit (max 3 levels)

**When NOT to spawn:**
- Simple tasks that current agent can handle
- Already at max recursion depth
- Would create unnecessary overhead
- Task requires tight coordination (better to handle directly)

**Context Sharing:**
- Always pass relevant context to sub-agent
- Include project structure info
- Share relevant documentation
- Pass dependencies and constraints

**Result Aggregation:**
- Sub-agent results are returned to parent
- Parent integrates sub-results into final output
- Parent maintains overall task coordination

## Integration with Orchestrator

This command leverages the hybrid_orchestrator_v5.py system:

```python
# The orchestrator handles:
- Agent selection and routing
- Task decomposition
- Context management
- Result aggregation
- Error handling and retry logic
```

View the orchestrator architecture:
```bash
cat V5_ARCHITECTURE.md
```
