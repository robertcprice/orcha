---
description: Check the current status of a task in the autonomous agent system
---

# Task Status - Check Task Progress

Check the current status of a task in the autonomous agent system.

**Usage:** `/taskstatus <task_id>`

## What This Does

Retrieves and displays:
- Current task status (pending/active/completed/failed)
- Task details (title, description, priority)
- Progress information (when started, who's working on it)
- Results (if completed)
- Metrics (dialogue turns, execution time, agents spawned)
- Error details (if failed)

## Examples

```bash
/taskstatus abc-123-def-456
/taskstatus 550e8400-e29b-41d4-a716-446655440000
```

## Now Execute

Extract the task ID from the user's input, then search for the task file:

```bash
TASK_ID="{{ task_id }}"
TASKS_DIR="projects/Smart Market Solutions/tasks"

# Function to check task status
check_task() {
    local task_id="$1"

    # Search for task file in all subdirectories
    task_file=$(find "$TASKS_DIR" -name "${task_id}.json" -type f 2>/dev/null | head -n 1)

    if [ -z "$task_file" ]; then
        echo "❌ Task not found: $task_id"
        echo ""
        echo "Try: /listtasks to see available tasks"
        return 1
    fi

    echo "📊 TASK STATUS REPORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Parse and display task details
    if command -v jq &> /dev/null; then
        # Use jq for pretty formatting
        STATUS=$(jq -r '.status // "unknown"' "$task_file")

        echo "Task ID: $task_id"
        echo "Status: $STATUS"
        echo ""

        jq -r '"Title: \(.title // .description // "No title")\nPriority: \(.priority // "normal")\nCreated: \(.created_at // "unknown")\nAgent: \(.agent // "unknown")"' "$task_file"

        if [ "$STATUS" = "completed" ]; then
            echo ""
            echo "✅ COMPLETED"
            jq -r '"Finished: \(.completed_at // "unknown")\nResult: \(.result // "No result")"' "$task_file"
        elif [ "$STATUS" = "failed" ]; then
            echo ""
            echo "❌ FAILED"
            jq -r '"Error: \(.error // "No error details")"' "$task_file"
        elif [ "$STATUS" = "active" ]; then
            echo ""
            echo "🔵 ACTIVE - Task in progress"
        elif [ "$STATUS" = "pending" ]; then
            echo ""
            echo "🟡 PENDING - Waiting to be processed"
        fi
    else
        # Fallback to Python json parsing
        echo "Task File: $task_file"
        echo ""
        python3 -m json.tool "$task_file"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Execute
check_task "$TASK_ID"
```

---

## Status Indicators

- 🟡 **PENDING** - Waiting to be processed
- 🔵 **ACTIVE** - Currently being executed
- 🟢 **COMPLETED** - Successfully finished
- 🔴 **FAILED** - Encountered an error
- ⚪ **CANCELLED** - User cancelled

## Quick Actions

Based on status, suggest:

**If PENDING:**
- Wait for task monitor to pick it up
- Check priority (high priority tasks go first)
- Verify orchestrator is running

**If ACTIVE:**
- Check web UI monitor at http://localhost:3000/monitor
- Review logs: `tail -f web-ui/dev.log`
- Watch Redis events

**If COMPLETED:**
- Review results and artifacts
- Check files created/modified
- Review metrics

**If FAILED:**
- Read error message
- Check if retry is needed
- Review logs for debugging
- Check agent logs in obsidian vault
