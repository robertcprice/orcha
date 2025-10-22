# Autonomous Agent System - Complete Documentation

## Overview

The Autonomous Agent System is a comprehensive infrastructure for automated AI-powered task execution. It provides:

- **File-based task queue** - Submit tasks via files, web app, or terminal
- **Automatic processing** - Tasks are automatically assigned to Claude orchestrators
- **Hierarchical agents** - Agents can spawn sub-agents for complex task decomposition
- **Multi-source submission** - Tasks can be submitted from web UI, terminal, or API
- **Real-time monitoring** - Track task status and agent activity
- **Graceful handling** - Priority queuing, timeouts, retries, and error handling

---

## Architecture

```
User Submission
    ↓
orchestrator/tasks/pending/
    ↓
Task Monitor Service (continuously scanning)
    ↓
Auto Orchestrator (spawns for each task)
    ↓
Hybrid Orchestrator V4 (Claude + ChatGPT dialogue)
    ↓
Hierarchical Agents (can spawn sub-agents)
    ↓
orchestrator/tasks/completed|failed/
```

### Core Components

1. **Task Queue** (`orchestrator/tasks/`)
   - `pending/` - New tasks waiting to be processed
   - `active/` - Tasks currently being executed
   - `completed/` - Successfully completed tasks
   - `failed/` - Failed tasks with error logs
   - `archived/` - Old tasks (auto-archived after 30 days)

2. **Task Monitor** (`orchestrator/task_monitor.py`)
   - Continuously scans for new tasks
   - Prioritizes tasks (critical > high > normal > low)
   - Spawns orchestrators with concurrency limits
   - Handles graceful shutdown

3. **Auto Orchestrator** (`orchestrator/auto_orchestrator.py`)
   - Executes individual tasks using HybridOrchestratorV4
   - Tracks agent hierarchy
   - Enforces timeouts and limits
   - Records detailed results

4. **Hierarchical Agent Framework** (`orchestrator/hierarchical_agent.py`)
   - Enables agents to spawn specialized sub-agents
   - Supports multi-level task decomposition
   - Context sharing across hierarchy
   - Automatic depth limiting

---

## Task File Format

Tasks are JSON files with this structure:

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication...",
  "priority": "high",
  "created_at": "2025-10-10T00:00:00Z",
  "created_by": "web-app",
  "context": {
    "project": "api-server",
    "files": ["server/auth.ts"]
  },
  "config": {
    "max_dialogue_turns": 20,
    "timeout_minutes": 60,
    "gpt_model": "gpt-4",
    "allow_sub_agents": true,
    "max_agent_depth": 3
  },
  "status": "pending"
}
```

See `orchestrator/task_schema.json` for complete specification.

---

## Usage

### 1. Start the Task Monitor

```bash
./start_task_monitor.sh
```

This starts the continuous monitoring service that will automatically process tasks.

**Monitor output:**
```
Starting Autonomous Agent Task Monitor...
This service will continuously monitor orchestrator/tasks/pending/
Press Ctrl+C to stop
============================================

2025-10-10 00:00:00 - TaskMonitor - INFO - Task Monitor initialized
2025-10-10 00:00:00 - TaskMonitor - INFO - Waiting for tasks...
```

### 2. Submit Tasks

#### Option A: Terminal Submission

```bash
# Simple task
./scripts/submit_task.py "Fix bug" "Fix the login bug in auth.py"

# High priority task
./scripts/submit_task.py "Critical fix" "Fix production crash" --priority critical

# Task with custom config
./scripts/submit_task.py "Complex task" "Implement feature X" \
  --config '{"max_dialogue_turns": 30, "timeout_minutes": 120}'
```

#### Option B: Web App Submission

```bash
cd ui-agent-console
npm run dev  # Start web app on http://localhost:3000
```

Then use the web UI to submit tasks (API: `POST /api/tasks/submit`).

#### Option C: Direct File Creation

Create a JSON file in `orchestrator/tasks/pending/` following the task schema.

### 3. Monitor Tasks

#### Check specific task status:

```bash
./scripts/check_task.py <TASK_ID>
```

Output:
```
══════════════════════════════════════════════════════════════════
TASK STATUS: COMPLETED
══════════════════════════════════════════════════════════════════

📋 Task ID: 550e8400-e29b-41d4-a716-446655440000
📌 Title: Implement user authentication
⚡ Priority: high
📂 Location: completed/
👤 Created by: web-app
🕐 Created at: 2025-10-10T00:00:00Z
▶️  Started at: 2025-10-10T00:01:00Z
✅ Completed at: 2025-10-10T00:15:00Z

📝 Description:
   Add JWT-based authentication to the API...

──────────────────────────────────────────────────────────────────
RESULT:
──────────────────────────────────────────────────────────────────

  Status: success

  Summary:
    Successfully implemented JWT authentication with login/logout...

  Artifacts Created:
    - server/auth.ts
    - server/middleware/auth.ts
    - tests/auth.test.ts

  Metrics:
    - Dialogue turns: 12
    - Execution time: 840.5s
    - Agents spawned: 3
    - Max agent depth: 2
```

#### Watch task status (updates every 5 seconds):

```bash
./scripts/check_task.py <TASK_ID> --watch
```

#### List all tasks:

```bash
# List all tasks
./scripts/list_tasks.py

# List only pending tasks
./scripts/list_tasks.py --status pending

# List only completed tasks, limit to 10
./scripts/list_tasks.py --status completed --limit 10
```

---

## Web API Endpoints

### Submit Task
**POST** `/api/tasks/submit`

```json
{
  "title": "Fix authentication bug",
  "description": "The login endpoint returns 500...",
  "priority": "high",
  "context": {
    "files": ["server/auth.ts"]
  },
  "config": {
    "max_dialogue_turns": 15
  }
}
```

Response:
```json
{
  "success": true,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Task submitted successfully"
}
```

### Get Task Status
**GET** `/api/tasks/status?task_id=<TASK_ID>`

Returns full task object with current status and results.

### List Tasks
**GET** `/api/tasks/list?status=pending`

Returns array of tasks filtered by status.

---

## Agent Hierarchy

Agents can spawn specialized sub-agents to handle complex tasks:

```
Root Orchestrator
├── PP (Product Planner) - Creates execution plan
├── IM (Implementer) - Executes implementation
│   ├── CODE (Coding Specialist) - Advanced implementation
│   └── QA (Testing Specialist) - Creates and runs tests
├── AR (Architect/Reviewer) - Reviews implementation
└── RD (Researcher/Documenter) - Generates documentation
    └── DOC (Documentation Specialist) - Technical writing
```

### Available Agent Types

**Core Team (4)**:
- `PP` - Product Planner (requirements & planning)
- `AR` - Architect/Reviewer (code review & design)
- `IM` - Implementer (code implementation)
- `RD` - Researcher/Documenter (documentation & research)

**Specialists (8)**:
- `DOC` - Documentation Specialist
- `CODE` - Coding Specialist
- `QA` - QA & Testing Specialist
- `RES` - Research Specialist
- `DATA` - Data Engineering Specialist
- `TRAIN` - Training Specialist
- `DEVOPS` - DevOps Specialist
- `COORD` - Coordinator (multi-agent coordination)

### Hierarchical Features

- **Automatic Task Decomposition** - Agents analyze tasks and decide whether to spawn sub-agents
- **Context Sharing** - Parent agents can share context with children
- **Result Aggregation** - Parent agents synthesize results from sub-agents
- **Depth Limiting** - Maximum nesting depth prevents infinite recursion (default: 3 levels)

---

## Configuration

### Task Configuration

Each task can specify custom config:

```json
{
  "config": {
    "max_dialogue_turns": 20,      // Max orchestrator dialogue iterations
    "timeout_minutes": 60,          // Max task execution time
    "gpt_model": "gpt-4",          // GPT model for planning
    "allow_sub_agents": true,       // Enable hierarchical agents
    "max_agent_depth": 3            // Max sub-agent nesting
  }
}
```

### Monitor Configuration

Edit `orchestrator/task_monitor.py`:

```python
config = TaskMonitorConfig(
    task_dir=PROJECT_ROOT / "orchestrator" / "tasks",
    max_concurrent_tasks=3,        // Concurrent task limit
    scan_interval_seconds=5,       // Queue scan frequency
    max_retries=2,                 // Max retry attempts
    cleanup_days=30                // Archive tasks after N days
)
```

---

## Testing

Run the comprehensive test suite:

```bash
./test_autonomous_system.sh
```

This tests:
- ✓ Directory structure
- ✓ Core components exist
- ✓ Scripts are executable
- ✓ API endpoints exist
- ✓ Python syntax validation
- ✓ Task submission works
- ✓ Task file validation
- ✓ Task management commands

---

## Troubleshooting

### Task Monitor Won't Start

**Problem**: `ModuleNotFoundError` when starting monitor

**Solution**:
```bash
# Ensure venv is activated
source venv/bin/activate

# Install dependencies
pip install asyncio
```

### Tasks Stay in Pending

**Problem**: Tasks not being processed

**Check**:
1. Is task monitor running? (`ps aux | grep task_monitor`)
2. Are there errors in logs? (`tail -f logs/task_monitor.log`)
3. Is OPENAI_API_KEY set? (`echo $OPENAI_API_KEY`)

### Agent Execution Fails

**Problem**: Tasks move to `failed/` directory

**Debug**:
1. Check task result in failed task file:
   ```bash
   cat orchestrator/tasks/failed/<TASK_ID>.json | jq '.result.error'
   ```

2. Check monitor logs:
   ```bash
   tail -100 logs/task_monitor.log
   ```

3. Verify Claude CLI works:
   ```bash
   echo "test" | claude --print
   ```

### Web API Not Working

**Problem**: API returns 500 errors

**Solution**:
```bash
cd ui-agent-console
npm install uuid @types/uuid  # Ensure dependencies installed
npm run dev                   # Restart dev server
```

---

## Examples

### Example 1: Simple Bug Fix

```bash
./scripts/submit_task.py \
  "Fix login bug" \
  "The login endpoint in server/auth.ts returns 500 when username is empty. Add validation." \
  --priority high
```

Expected Result:
- IM agent analyzes the bug
- Spawns CODE sub-agent to implement fix
- Spawns QA sub-agent to add test
- AR agent reviews the implementation
- RD agent updates documentation

### Example 2: Feature Implementation

```bash
./scripts/submit_task.py \
  "Add dark mode" \
  "Implement dark mode toggle in settings with CSS theming support" \
  --priority normal \
  --context '{"files": ["src/App.tsx", "src/theme.ts"]}'
```

Expected Result:
- PP agent creates implementation plan
- IM agent implements feature
- CODE sub-agent handles complex styling
- QA sub-agent creates tests
- DOC sub-agent documents usage

### Example 3: Complex Multi-Step Task

```bash
./scripts/submit_task.py \
  "Migrate database schema" \
  "Migrate user table from MySQL to PostgreSQL, update all queries, add migration script" \
  --priority critical \
  --config '{"max_dialogue_turns": 30, "timeout_minutes": 120}'
```

Expected Result:
- PP agent breaks down migration steps
- DATA sub-agent analyzes schema differences
- CODE sub-agents update queries
- DEVOPS sub-agent creates migration script
- QA sub-agent validates data integrity

---

## File Locations

```
AlgoMind-PPM/
├── orchestrator/
│   ├── tasks/                          # Task queue directories
│   │   ├── pending/                   # New tasks
│   │   ├── active/                    # Running tasks
│   │   ├── completed/                 # Completed tasks
│   │   ├── failed/                    # Failed tasks
│   │   └── archived/                  # Old tasks
│   ├── task_schema.json               # Task file specification
│   ├── task_monitor.py                # Continuous monitoring service
│   ├── auto_orchestrator.py           # Task executor
│   ├── hierarchical_agent.py          # Sub-agent framework
│   └── hybrid_orchestrator_v4_iterative.py  # Claude+GPT orchestration
├── scripts/
│   ├── submit_task.py                 # Submit tasks from terminal
│   ├── check_task.py                  # Check task status
│   └── list_tasks.py                  # List all tasks
├── ui-agent-console/app/api/tasks/
│   ├── submit/route.ts                # Web API: Submit task
│   ├── status/route.ts                # Web API: Get status
│   └── list/route.ts                  # Web API: List tasks
├── start_task_monitor.sh              # Start monitoring service
├── test_autonomous_system.sh          # Comprehensive test suite
└── logs/
    └── task_monitor.log               # Monitor logs
```

---

## Advanced Usage

### Custom Agent Types

Create custom sub-agents by defining new agent types in task prompts:

```json
{
  "description": "Analyze cryptocurrency market trends",
  "context": {
    "custom_agents": {
      "CRYPTO": {
        "role": "Cryptocurrency Analysis Specialist",
        "capabilities": ["market data analysis", "trend prediction"]
      }
    }
  }
}
```

### Batch Task Submission

Submit multiple tasks at once:

```bash
for task in task1.json task2.json task3.json; do
  cp $task orchestrator/tasks/pending/
done
```

### Integration with CI/CD

Add to GitHub Actions:

```yaml
- name: Submit automated task
  run: |
    ./scripts/submit_task.py \
      "Daily code review" \
      "Review all commits from the last 24 hours" \
      --priority normal
```

---

## System Requirements

- **Python 3.8+**
- **Claude Code CLI** (authenticated session)
- **OpenAI API Key** (for ChatGPT planning)
- **Node.js 18+** (for web app)
- **Operating System**: macOS, Linux (tested on M4 Mac)

---

## Performance

### Benchmarks (M4 Mac)

- **Task Queue Scan**: ~5ms for 100 pending tasks
- **Task Submission**: ~10ms (file write)
- **Simple Task Execution**: 30-120 seconds
- **Complex Multi-Agent Task**: 5-15 minutes
- **Maximum Concurrent Tasks**: 3 (configurable)

### Resource Usage

- **Memory**: ~500MB per active orchestrator
- **CPU**: Minimal (mostly I/O-bound)
- **Disk**: ~10KB per task file

---

## Security Considerations

1. **API Key Protection** - Store OPENAI_API_KEY in environment, never in code
2. **Task Validation** - Schema validation prevents malformed tasks
3. **Sandboxing** - Tasks execute in project context only
4. **Audit Trail** - All tasks logged with timestamps and results
5. **Rate Limiting** - Concurrent task limits prevent resource exhaustion

---

## Roadmap

Future enhancements:

- [ ] Task dependencies (task B waits for task A)
- [ ] Scheduled tasks (cron-like execution)
- [ ] Task templates (reusable task configurations)
- [ ] Real-time web UI (live status updates)
- [ ] Metrics dashboard (task completion rates, agent performance)
- [ ] Task priority adjustment (change priority of pending tasks)
- [ ] Multi-tenancy (separate queues per user/project)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test results: `./test_autonomous_system.sh`
3. Check logs: `logs/task_monitor.log`
4. Open an issue in the project repository

---

## License

This autonomous agent system is part of the AlgoMind-PPM project.
