# Quick Start Guide - Autonomous Agent System

Get started with the autonomous agent system in 5 minutes.

## Prerequisites

- Python 3.8+
- Claude Code CLI (authenticated)
- OpenAI API key

## Step 1: Verify Setup

Run the test suite to ensure everything is configured:

```bash
./test_autonomous_system.sh
```

You should see: "ALL TESTS PASSED! ✓"

## Step 2: Set Environment Variables

```bash
# Add to your ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="your-openai-api-key-here"
```

## Step 3: Start the Task Monitor

Open a terminal and start the monitoring service:

```bash
./start_task_monitor.sh
```

Leave this running. You should see:
```
Starting Autonomous Agent Task Monitor...
Waiting for tasks...
```

## Step 4: Submit Your First Task

In a new terminal, submit a test task:

```bash
./scripts/submit_task.py \
  "Create Hello World Script" \
  "Create a simple Python script that prints 'Hello from Autonomous Agents!'" \
  --priority normal
```

You'll get a task ID. Copy it.

## Step 5: Monitor Task Progress

Watch the task being processed:

```bash
./scripts/check_task.py <YOUR_TASK_ID> --watch
```

This will update every 5 seconds showing the task status.

## Step 6: Check Results

Once complete, view the final status:

```bash
./scripts/check_task.py <YOUR_TASK_ID>
```

You should see:
- Status: COMPLETED
- Summary of what was done
- Files that were created
- Metrics (dialogue turns, execution time, agents spawned)

## Common Commands

### Submit a task:
```bash
./scripts/submit_task.py "Title" "Description" [--priority PRIORITY]
```

### Check task status:
```bash
./scripts/check_task.py <TASK_ID>
```

### Watch task (live updates):
```bash
./scripts/check_task.py <TASK_ID> --watch
```

### List all tasks:
```bash
./scripts/list_tasks.py [--status pending|active|completed|failed]
```

### Stop the monitor:
Press `Ctrl+C` in the task monitor terminal

## Web Interface

For a visual interface:

```bash
cd ui-agent-console
npm install  # First time only
npm run dev  # Start on http://localhost:3000
```

Then navigate to the Tasks section to submit and monitor tasks.

## Examples

### Bug Fix:
```bash
./scripts/submit_task.py \
  "Fix login validation" \
  "Add email validation to the login form in auth.js" \
  --priority high
```

### Feature Implementation:
```bash
./scripts/submit_task.py \
  "Add dark mode" \
  "Implement a dark mode toggle in the settings page with CSS theming" \
  --priority normal
```

### Documentation:
```bash
./scripts/submit_task.py \
  "Document API endpoints" \
  "Create comprehensive documentation for all REST API endpoints in docs/api.md" \
  --priority low
```

## Troubleshooting

**Task stays in pending:**
- Ensure task monitor is running
- Check `OPENAI_API_KEY` is set: `echo $OPENAI_API_KEY`
- Check logs: `tail -f logs/task_monitor.log`

**Monitor won't start:**
- Activate venv: `source venv/bin/activate`
- Check Claude CLI works: `echo "test" | claude --print`

**Task failed:**
- Check error: `cat orchestrator/tasks/failed/<TASK_ID>.json | jq '.result.error'`
- Review logs: `tail -100 logs/task_monitor.log`

## Next Steps

- Read full documentation: `AUTONOMOUS_AGENT_SYSTEM.md`
- Explore task schema: `orchestrator/task_schema.json`
- Review agent types: See "Agent Hierarchy" in main docs
- Try web API: See "Web API Endpoints" in main docs

## Getting Help

1. Run tests: `./test_autonomous_system.sh`
2. Check logs: `logs/task_monitor.log`
3. Review documentation: `AUTONOMOUS_AGENT_SYSTEM.md`

---

**You're now ready to use autonomous agents! Happy automating! 🤖**
