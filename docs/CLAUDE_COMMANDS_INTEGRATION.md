# Claude Commands & Skills Integration Guide

Complete guide for the slash commands, skills, and agentic workflow enhancements integrated from AlgoMind-PPM into the Orchestration-System.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Slash Commands](#slash-commands)
3. [Skills](#skills)
4. [Utility Scripts](#utility-scripts)
5. [Agentic Workflow Integration](#agentic-workflow-integration)
6. [Usage Examples](#usage-examples)
7. [Configuration](#configuration)

## Overview

This integration brings powerful agent management, multi-AI orchestration, and workflow automation capabilities to Claude Code CLI.

### What's New

**Slash Commands:**
- `/contextualize` - Learn project environment and structure
- `/push` - Intelligent git workflow (analyze, commit, push)
- `/listtasks` - List and filter tasks
- `/taskstatus` - Check task progress
- `/spawn-agent` - Create specialized sub-agents

**Skills:**
- `multi-ai` - Invoke multiple AI models (Gemini, DeepSeek, Grok)
- `orchestration` - Master multi-agent orchestration patterns

**Utility Scripts:**
- `scripts/list_tasks.py` - Task management
- `scripts/check_task.py` - Task status checking
- `scripts/spawn_agent.py` - Agent spawning

## Slash Commands

### /contextualize

**Purpose:** Help newly spawned agents quickly understand the project.

**Usage:**
```bash
/contextualize
```

**What it does:**
1. Reads key documentation (README, architecture docs)
2. Shows current work status from Obsidian vault
3. Lists active tasks
4. Displays recent git activity
5. Shows project structure
6. Lists available commands and skills
7. Checks environment configuration

**Output:** Comprehensive project overview for agent orientation

---

### /push

**Purpose:** Intelligent git workflow automation.

**Usage:**
```bash
/push
```

**What it does:**
1. Analyzes all changes with `git status` and `git diff`
2. Generates intelligent commit message with:
   - Conventional commit prefix (feat/fix/docs/etc.)
   - Detailed bullet points
   - File counts and areas affected
   - Claude Code footer
3. Stages all changes
4. Commits with generated message
5. Pushes to remote branch

**Features:**
- Smart commit message generation
- Conventional commit standards
- Detects sensitive files
- Handles push errors gracefully

---

### /listtasks

**Purpose:** List and filter tasks in the orchestration system.

**Usage:**
```bash
/listtasks                    # All tasks
/listtasks pending            # Only pending
/listtasks completed 10       # Last 10 completed
/listtasks active             # Currently running
```

**Statuses:**
- `pending` 🟡 - Waiting to be processed
- `active` 🔵 - Currently executing
- `completed` 🟢 - Successfully finished
- `failed` 🔴 - Encountered error
- `cancelled` ⚪ - User cancelled

**Output:** Formatted list with ID, status, priority, agent, timestamps

---

### /taskstatus

**Purpose:** Check detailed status of a specific task.

**Usage:**
```bash
/taskstatus <task_id>
```

**What it shows:**
- Current status
- Task details (title, priority, agent)
- Progress information
- Results (if completed)
- Metrics (execution time, tokens, etc.)
- Error details (if failed)

**Features:**
- Partial ID matching
- Suggests actions based on status
- Links to relevant logs

---

### /spawn-agent

**Purpose:** Spawn specialized sub-agents for specific tasks.

**Usage:**
```bash
/spawn-agent <agent_type> <task_description>
```

**Available Agent Types:**

**Core Agents:**
- `claude` - MCP-based code implementation
- `codex` - OpenAI-based coding
- `planner` - Task planning & coordination

**Specialized AI:**
- `gemini` - Multimodal analysis
- `deepseek` - Deep code analysis
- `grok` - Research & real-time data

**Role Aliases:**
- `research` → grok
- `doc` → claude
- `test` → codex

**Examples:**
```bash
/spawn-agent claude "Implement JWT authentication"
/spawn-agent gemini "Analyze this architecture diagram"
/spawn-agent grok "Research Redis pub/sub best practices"
```

## Skills

### multi-ai Skill

**Purpose:** Invoke multiple AI models for specialized tasks.

**How to use:**
```bash
# In Claude Code CLI
Use the multi-ai skill to analyze this image with Gemini

# Or invoke directly in conversation
I need to use Gemini's multimodal capabilities to analyze this PDF
```

**Available Models:**

1. **Gemini** - Multimodal, long context, real-time info
2. **DeepSeek** - Advanced code reasoning, math
3. **Grok** - Web research, current events

**Use Cases:**
- Image/video analysis → Gemini
- Code optimization → DeepSeek
- Web research → Grok
- Multi-perspective analysis → All three

**Script Usage:**
```bash
# Direct invocation
python3 orchestrator/gemini_agent.py "Your prompt"
python3 orchestrator/deepseek_agent.py "Your prompt"
python3 orchestrator/grok_agent.py "Your prompt"

# Via spawn script
python3 scripts/spawn_agent.py gemini "Your task"
```

---

### orchestration Skill

**Purpose:** Master multi-agent orchestration patterns.

**Key Concepts:**

1. **Sequential Execution** - Tasks in order
2. **Parallel Execution** - Independent tasks simultaneously
3. **Hierarchical Delegation** - Parent agents spawn sub-agents
4. **Consensus Building** - Multiple AI perspectives

**Orchestration Patterns:**

```python
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5

# Pattern 1: Sequential
async def sequential():
    orchestrator = HybridOrchestratorV5()

    # Step by step with context passing
    plan = await orchestrator.execute_task(
        "Plan the feature",
        agent_preference="planner"
    )

    impl = await orchestrator.execute_task(
        "Implement based on plan",
        agent_preference="claude",
        context={"plan": plan}
    )

    return impl

# Pattern 2: Parallel
async def parallel():
    orchestrator = HybridOrchestratorV5()

    # Run multiple agents simultaneously
    tasks = [
        orchestrator.execute_task("Frontend", agent_preference="claude"),
        orchestrator.execute_task("Backend", agent_preference="codex"),
        orchestrator.execute_task("Research", agent_preference="grok")
    ]

    results = await asyncio.gather(*tasks)
    return results

# Pattern 3: Hierarchical
async def hierarchical():
    orchestrator = HybridOrchestratorV5()

    # Orchestrator auto-spawns sub-agents
    result = await orchestrator.execute_task(
        "Build complete authentication system",
        decomposition_strategy="hierarchical",
        max_depth=3
    )

    return result
```

**Integration with Web UI:**
```bash
# Start UI
cd web-ui && npm run dev

# Monitor at:
http://localhost:3000/agents      # Agent status
http://localhost:3000/monitor     # Live monitoring
http://localhost:3000/vault       # Obsidian outputs
```

## Utility Scripts

### scripts/list_tasks.py

List and filter tasks with rich formatting.

**Usage:**
```bash
# List all tasks
python3 scripts/list_tasks.py

# Filter by status
python3 scripts/list_tasks.py --status pending

# Limit results
python3 scripts/list_tasks.py --limit 10

# JSON output
python3 scripts/list_tasks.py --format json
```

**Options:**
- `--status` - Filter: all, pending, active, completed, failed
- `--limit N` - Show first N results
- `--format` - Output: text (default), json

---

### scripts/check_task.py

Check detailed status of a specific task.

**Usage:**
```bash
# Check task status
python3 scripts/check_task.py <task_id>

# Watch with live updates
python3 scripts/check_task.py <task_id> --watch

# JSON output
python3 scripts/check_task.py <task_id> --format json
```

**Features:**
- Partial ID matching
- Live watch mode with auto-refresh
- Detailed metrics and error info
- Status-specific tips

---

### scripts/spawn_agent.py

Spawn specialized agents programmatically.

**Usage:**
```bash
# List available agents
python3 scripts/spawn_agent.py --list

# Spawn agent via orchestrator (default)
python3 scripts/spawn_agent.py claude "Implement feature"

# Spawn agent directly
python3 scripts/spawn_agent.py --direct codex "Create tests"

# JSON output
python3 scripts/spawn_agent.py gemini "Analyze image" --format json
```

**Options:**
- `--list` - Show available agent types
- `--use-orchestrator` - Use hybrid orchestrator (default)
- `--direct` - Bypass orchestrator
- `--format` - Output: text, json

## Agentic Workflow Integration

### Agent Contextualization

All spawned agents should contextualize on startup:

```python
# In agent initialization
async def initialize():
    # Run contextualize to learn environment
    context = await run_contextualize()

    # Agent now knows:
    # - Project structure
    # - Active tasks
    # - Available tools
    # - Recent changes
```

### Hierarchical Agent Spawning

Agents can spawn sub-agents up to 3 levels deep:

```
Coordinator Agent (Level 0)
├── Planning Agent (Level 1)
│   ├── Research Agent (Level 2)
│   └── Analysis Agent (Level 2)
├── Implementation Agent (Level 1)
│   ├── Frontend Agent (Level 2)
│   │   └── Testing Agent (Level 3) [MAX DEPTH]
│   └── Backend Agent (Level 2)
└── Documentation Agent (Level 1)
```

**Depth Management:**
```python
# Track recursion depth
def spawn_agent(agent_type, task, parent_depth=0):
    if parent_depth >= 3:
        raise MaxDepthError("Cannot spawn beyond level 3")

    agent = create_agent(
        agent_type=agent_type,
        task=task,
        context={"depth": parent_depth + 1}
    )

    return agent
```

### Task Coordination

Agents communicate via:

1. **Task files** - JSON in `projects/Smart Market Solutions/tasks/`
2. **Redis pub/sub** - Real-time events
3. **Obsidian vault** - Documentation and results
4. **WebSocket** - Live UI updates

### Result Aggregation

Parent agents aggregate sub-agent results:

```python
async def coordinate_task():
    results = {}

    # Spawn sub-agents
    sub_agents = [
        spawn_agent("claude", "Subtask 1"),
        spawn_agent("codex", "Subtask 2"),
        spawn_agent("gemini", "Subtask 3")
    ]

    # Collect results
    for agent in sub_agents:
        result = await agent.execute()
        results[agent.type] = result

    # Synthesize final result
    final = synthesize_results(results)

    return final
```

## Usage Examples

### Example 1: Complex Feature Development

```bash
# 1. Contextualize as new agent
/contextualize

# 2. Spawn planner to design feature
/spawn-agent planner "Design user authentication system with JWT"

# 3. List tasks to see what was created
/listtasks pending

# 4. Spawn implementation agents (orchestrator handles)
# (Orchestrator spawns Claude for backend, Codex for frontend)

# 5. Monitor progress
/taskstatus <task_id>

# 6. Commit when done
/push
```

### Example 2: Multi-AI Research

```python
# Use multiple AI perspectives for research
from orchestrator.hybrid_orchestrator_v5 import HybridOrchestratorV5
import asyncio

async def research_task():
    orchestrator = HybridOrchestratorV5()

    question = "What are best practices for WebSocket scalability?"

    # Get multiple perspectives
    perspectives = await asyncio.gather(
        orchestrator.execute_task(question, agent_preference="grok"),
        orchestrator.execute_task(question, agent_preference="gemini"),
        orchestrator.execute_task(question, agent_preference="deepseek")
    )

    # Synthesize
    synthesis = await orchestrator.execute_task(
        f"Synthesize these research findings:\n{perspectives}",
        agent_preference="planner"
    )

    return synthesis

result = asyncio.run(research_task())
```

### Example 3: Automated Code Review

```bash
# Spawn multiple agents for comprehensive review
/spawn-agent claude "Review code for quality and best practices"
/spawn-agent deepseek "Review code for performance optimization opportunities"
/spawn-agent gemini "Review architecture and suggest improvements"

# Check all review results
/listtasks completed

# Commit improvements
/push
```

## Configuration

### Environment Variables

```bash
# Required for multi-AI
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_API_KEY="your-gemini-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export XAI_API_KEY="your-grok-key"

# Redis for pub/sub
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
```

### Project Structure

```
.claude/
├── commands/           # Slash commands
│   ├── contextualize.md
│   ├── push.md
│   ├── listtasks.md
│   ├── taskstatus.md
│   └── spawn-agent.md
└── skills/            # Skills
    ├── multi-ai.md
    └── orchestration.md

scripts/               # Utility scripts
├── list_tasks.py
├── check_task.py
└── spawn_agent.py

orchestrator/          # Agent implementations
├── hybrid_orchestrator_v5.py
├── claude_code_agent.py
├── codex_mcp_agent.py
├── chatgpt_planner.py
├── gemini_agent.py
├── deepseek_agent.py
└── grok_agent.py
```

### Testing

```bash
# Test slash commands
/contextualize
/listtasks
/spawn-agent --list

# Test utility scripts
python3 scripts/list_tasks.py
python3 scripts/spawn_agent.py --list

# Test orchestration
python3 test_v5_simple_task.py
```

## Best Practices

### 1. Always Contextualize

When a new agent spawns, run `/contextualize` first to understand the environment.

### 2. Choose the Right AI

- **Code implementation** → Claude or Codex
- **Planning** → Planner or Gemini
- **Research** → Grok
- **Analysis** → DeepSeek
- **Multimodal** → Gemini

### 3. Use Parallel Execution

For independent tasks, spawn agents in parallel:

```python
# Good - parallel
results = await asyncio.gather(
    task1(), task2(), task3()
)

# Avoid - sequential when not needed
result1 = await task1()
result2 = await task2()
result3 = await task3()
```

### 4. Manage Recursion Depth

Stay within 3 levels to avoid excessive complexity.

### 5. Document in Obsidian

Save all agent outputs to Obsidian vault for knowledge retention.

### 6. Monitor with Web UI

Use http://localhost:3000 to track agent activity and progress.

## Troubleshooting

### Commands Not Found

```bash
# Ensure commands directory exists
ls -la .claude/commands/

# Check command files
cat .claude/commands/contextualize.md
```

### Scripts Not Executable

```bash
chmod +x scripts/*.py
```

### Agent Not Found

```bash
# List available agents
python3 scripts/spawn_agent.py --list

# Check agent file exists
ls -la orchestrator/*_agent.py
```

### Redis Connection Issues

```bash
# Check Redis running
redis-cli ping

# Start Redis if needed
redis-server
```

### Task Files Not Found

```bash
# Check tasks directory
ls -la "projects/Smart Market Solutions/tasks/"

# Create directories if needed
mkdir -p "projects/Smart Market Solutions/tasks"/{pending,active,completed,failed}
```

## Resources

- **Documentation**: `DOCUMENTATION.md`, `V5_ARCHITECTURE.md`
- **Examples**: `test_v5_*.py`, `test_multi_ai_research.py`
- **Web UI**: `web-ui/README.md`
- **Skills**: `.claude/skills/README.md`

## Next Steps

1. Try `/contextualize` to learn the project
2. Experiment with `/spawn-agent` for different tasks
3. Use `/listtasks` and `/taskstatus` for task management
4. Explore multi-AI skills for complex problems
5. Monitor agents in the web UI
6. Build hierarchical agent workflows

Happy orchestrating! 🤖✨
