# Hybrid Codex-Claude Workflow - Usage Guide

**Status**: ✅ READY TO USE
**Date**: 2025-10-22

---

## Overview

The Orchestration System now supports **two workflow modes**:

1. **Auto Mode** (default) - Uses AutoOrchestrator
2. **Hybrid Mode** - Uses Codex MCP for implementation + Claude for code review

---

## How It Works

### Hybrid Mode Workflow

```
Task Submitted
    ↓
Codex MCP Agent (via codex mcp-server)
    ├── Receives task requirements
    ├── Plans implementation
    ├── Writes code
    └── Returns implementation
    ↓
Claude Review Agent (via Anthropic API)
    ├── Reviews code quality
    ├── Checks requirements
    ├── Scores quality (0-10)
    └── Approves or provides feedback
    ↓
If NOT approved:
    Codex Refinement (via codex-reply tool)
        ├── Receives Claude's feedback
        ├── Improves implementation
        └── Returns updated code
    ↓
    Back to Claude Review
    ↓
Repeat until approved or max iterations (default: 3)
    ↓
Task Completed ✅
```

---

## Creating Tasks with Hybrid Workflow

### Option 1: Via Web UI

When creating a task in the web UI, set the `orchestrator_mode` field:

```json
{
  "task_id": "unique-id",
  "title": "Create Weather App",
  "description": "Build a simple weather app with current conditions",
  "priority": "normal",
  "orchestrator_mode": "hybrid",
  "requirements": [
    "Use OpenWeatherMap API",
    "Show temperature, humidity, conditions",
    "Include error handling",
    "Add loading states"
  ],
  "max_iterations": 3,
  "cwd": "/path/to/project"
}
```

### Option 2: Via Task File

Create a JSON file in `orchestrator/tasks/pending/`:

```json
{
  "task_id": "weather-app-001",
  "title": "Weather App",
  "description": "Create a weather application",
  "priority": "high",
  "orchestrator_mode": "hybrid",
  "requirements": [
    "Fetch weather data",
    "Display current conditions",
    "Handle API errors"
  ],
  "max_iterations": 2,
  "cwd": ".",
  "created_at": "2025-10-22T16:00:00Z"
}
```

The task monitor will automatically pick it up and process it using the hybrid workflow.

### Option 3: Via Python Code

```python
from orchestrator.hybrid_codex_claude_mcp import run_hybrid_mcp_workflow

result = await run_hybrid_mcp_workflow(
    task_id="my-task",
    title="Create Calculator",
    description="Build a Python calculator",
    requirements=[
        "Support add, subtract, multiply, divide",
        "Handle division by zero",
        "Include docstrings",
        "Add unit tests"
    ],
    cwd=".",
    max_iterations=3
)

print(f"Success: {result.success}")
print(f"Quality Score: {result.quality_score}/10")
print(f"Iterations: {result.iterations}")
print(f"Output: {result.final_output}")
```

---

## Task Fields

### Required Fields

- `task_id` (string): Unique identifier
- `title` (string): Task title
- `description` (string): Task description
- `priority` (string): "critical", "high", "normal", or "low"

### Optional Fields for Hybrid Mode

- `orchestrator_mode` (string): "hybrid" or "auto" (default: "auto")
- `requirements` (array): List of specific requirements
- `max_iterations` (number): Max refinement cycles (default: 3)
- `cwd` (string): Working directory for Codex (default: project root)
- `context` (object): Additional context for the task

---

## Modes Comparison

| Feature | Auto Mode | Hybrid Mode |
|---------|-----------|-------------|
| **Orchestrator** | AutoOrchestrator | Codex MCP + Claude Review |
| **Implementation** | Claude/ChatGPT | Codex (gpt-5-codex) |
| **Review** | None | Claude Review Agent |
| **Iterations** | N/A | Yes, until approved |
| **Quality Score** | N/A | 0-10 rating |
| **Best For** | Research, planning | Code implementation |
| **API Keys Required** | OPENAI_API_KEY | None for Codex* + ANTHROPIC_API_KEY |

*Codex uses ChatGPT subscription via MCP, no API key needed for Codex itself

---

## Result Format

### Auto Mode Result

```json
{
  "success": true,
  "summary": "Task completed successfully",
  "...": "other fields from AutoOrchestrator"
}
```

### Hybrid Mode Result

```json
{
  "success": true,
  "summary": "Implementation approved after 2 iterations",
  "iterations": 2,
  "quality_score": 8.5,
  "conversation_id": "codex-session-id",
  "codex_iterations": 2,
  "claude_reviews": 2,
  "total_time": 45.2,
  "error": null
}
```

---

## Examples

### Example 1: Simple Calculator

```json
{
  "task_id": "calc-001",
  "title": "Python Calculator",
  "description": "Create a command-line calculator",
  "priority": "normal",
  "orchestrator_mode": "hybrid",
  "requirements": [
    "Functions: add, subtract, multiply, divide",
    "Handle invalid input",
    "Use argparse for CLI",
    "Include help text"
  ]
}
```

**Expected workflow**:
1. Codex implements calculator
2. Claude reviews, checks requirements
3. If issues found, Codex refines
4. Repeat until approved

### Example 2: API Integration

```json
{
  "task_id": "api-integration-001",
  "title": "GitHub API Client",
  "description": "Create a GitHub API client for fetching repos",
  "priority": "high",
  "orchestrator_mode": "hybrid",
  "requirements": [
    "Use requests library",
    "Authenticate with token",
    "Fetch user repositories",
    "Handle rate limiting",
    "Return JSON response",
    "Include error handling"
  ],
  "max_iterations": 4
}
```

### Example 3: React Component

```json
{
  "task_id": "react-component-001",
  "title": "User Profile Card",
  "description": "Create a reusable React user profile card component",
  "priority": "normal",
  "orchestrator_mode": "hybrid",
  "requirements": [
    "TypeScript with interfaces",
    "Display: avatar, name, email, bio",
    "Responsive design",
    "Dark mode support",
    "Props validation",
    "Styled with Tailwind CSS"
  ],
  "cwd": "/path/to/react/project"
}
```

---

## Monitoring Tasks

### Via Web UI

Navigate to http://localhost:3000 and check:
- **Tasks** tab - See all tasks (pending, active, completed)
- **Timeline** tab - See real-time event stream
- **EventTimeline** component - Visual task progress

### Via Task Monitor Logs

```bash
tail -f /path/to/Orchestration-System/logs/task_monitor.log
```

You'll see:
```
INFO - Starting orchestrator for: Python Calculator (mode: hybrid)
INFO - Using Codex-Claude hybrid workflow
INFO - [Codex-MCP-xxx] Starting Codex session...
INFO - [Claude-Review-xxx] Reviewing implementation...
INFO - Task completed successfully: Python Calculator
INFO - Quality Score: 8.5/10
```

### Via Files

- **Pending**: `orchestrator/tasks/pending/` or `projects/{project}/tasks/pending/`
- **Active**: `orchestrator/tasks/active/` or `projects/{project}/tasks/active/`
- **Completed**: `orchestrator/tasks/completed/` or `projects/{project}/tasks/completed/`
- **Failed**: `orchestrator/tasks/failed/` or `projects/{project}/tasks/failed/`

---

## Configuration

### API Keys

**For Hybrid Mode**, you need:

1. **ANTHROPIC_API_KEY** - For Claude review agent

```bash
# Option 1: Environment variable
export ANTHROPIC_API_KEY="sk-ant-your-key"

# Option 2: Add to shell profile
echo 'export ANTHROPIC_API_KEY="sk-ant-your-key"' >> ~/.zshrc
source ~/.zshrc

# Option 3: .env file
echo 'ANTHROPIC_API_KEY=sk-ant-your-key' >> .env
```

**Codex** uses your ChatGPT subscription via MCP - no API key needed!

### Max Iterations

Control how many refinement cycles are allowed:

```json
{
  "orchestrator_mode": "hybrid",
  "max_iterations": 5  // Default is 3
}
```

- Iteration 1: Initial Codex implementation
- Iteration 2-N: Refinements based on Claude feedback

### Working Directory

Specify where Codex should work:

```json
{
  "orchestrator_mode": "hybrid",
  "cwd": "/Users/you/projects/my-app"  // Absolute path
}
```

Codex will:
- Create files in this directory
- Read existing files from this directory
- Execute commands in this directory

---

## Troubleshooting

### Task Not Processing

**Check**:
1. Is task monitor running? `ps aux | grep task_monitor`
2. Is task file in `pending/` directory?
3. Is task file valid JSON? `python -m json.tool task.json`
4. Check logs: `tail -f logs/task_monitor.log`

### Hybrid Mode Failing

**Common issues**:

1. **ANTHROPIC_API_KEY not set**
   - Error: `ValueError: ANTHROPIC_API_KEY not set`
   - Fix: Set the API key (see Configuration)

2. **Codex MCP connection fails**
   - Error: `MCP connection failed`
   - Fix: Ensure `codex` CLI is installed: `codex --version`

3. **Model not supported**
   - Error: `o3 model is not supported`
   - Fix: Don't specify model (uses gpt-5-codex automatically)

### Quality Score Too Low

If Claude consistently rejects:
- Check requirements are clear and achievable
- Increase `max_iterations` to allow more refinement
- Provide more context in task description
- Review Codex's output to see what's missing

---

## Best Practices

### 1. Clear Requirements

❌ **Bad**:
```json
{
  "description": "Make an app"
}
```

✅ **Good**:
```json
{
  "description": "Create a todo list app",
  "requirements": [
    "Add, edit, delete todos",
    "Mark as complete",
    "Persistent storage",
    "Responsive UI"
  ]
}
```

### 2. Appropriate Max Iterations

- Simple tasks: 2-3 iterations
- Complex tasks: 3-5 iterations
- Very complex: 5+ iterations

### 3. Specific Working Directory

Always specify `cwd` for Codex to avoid confusion:

```json
{
  "cwd": "/Users/you/projects/my-app/src/components"
}
```

### 4. Use Hybrid Mode for Implementation

| Task Type | Recommended Mode |
|-----------|------------------|
| Code implementation | **hybrid** |
| Bug fixes | **hybrid** |
| Feature additions | **hybrid** |
| Research/planning | auto |
| Documentation | auto |

---

## Next Steps

1. **Set API Keys**: Configure ANTHROPIC_API_KEY
2. **Create Test Task**: Try a simple calculator task
3. **Monitor Progress**: Watch the web UI and logs
4. **Iterate**: Adjust requirements and max_iterations based on results

---

## FAQ

**Q: Can I use hybrid mode without Claude review?**
A: Not currently. Hybrid mode requires both Codex and Claude. For Codex-only, use the Python API directly.

**Q: What model does Codex use?**
A: With ChatGPT subscription: `gpt-5-codex`. With OpenAI API: depends on your configuration.

**Q: Can I review Codex's code before Claude does?**
A: Yes, check the active task file while it's processing. The implementation will be in `result.output`.

**Q: What if Claude keeps rejecting?**
A: Either the requirements are too strict, or the implementation needs major changes. Check the feedback in the failed task file.

**Q: Can I use both modes in one task?**
A: No, choose either "auto" or "hybrid" mode per task.

---

For technical details, see:
- `CODEX_MCP_INTEGRATION_SUCCESS.md` - Integration details
- `CODEX_INTEGRATION_CORRECTED.md` - Architecture explanation
- `orchestrator/task_monitor.py` - Task processing code
