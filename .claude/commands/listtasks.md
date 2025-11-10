---
description: List all tasks in the orchestration system, optionally filtered by status
---

# List Tasks - View Task Queue

List all tasks in the autonomous agent system, optionally filtered by status.

**Usage:** `/listtasks [status] [limit]`

## What This Does

Displays a list of tasks with:
- Task ID
- Title and description
- Status (pending/active/completed/failed)
- Priority level
- Creation time
- Brief result summary (if completed)

## Examples

```bash
/listtasks                    # List all tasks
/listtasks pending            # Only pending tasks
/listtasks completed 10       # Last 10 completed tasks
/listtasks active             # Currently running tasks
```

## Now Execute

Parse the user's request and list tasks from the project directories:

```bash
# Check for tasks in the Smart Market Solutions project
TASKS_DIR="projects/Smart Market Solutions/tasks"

# Function to list tasks
list_tasks() {
    STATUS="${1:-all}"
    LIMIT="${2:-50}"

    if [ ! -d "$TASKS_DIR" ]; then
        echo "📋 No tasks directory found at $TASKS_DIR"
        return
    fi

    echo "📋 TASK QUEUE - ${STATUS^^}"
    echo ""

    # Find task files
    if [ "$STATUS" = "all" ]; then
        PATTERN="$TASKS_DIR/**/*.json"
    else
        PATTERN="$TASKS_DIR/$STATUS/*.json"
    fi

    # List and parse task files
    find "$TASKS_DIR" -name "*.json" -type f | head -n "$LIMIT" | while read -r task_file; do
        if [ -f "$task_file" ]; then
            echo "Task: $(basename "$task_file" .json)"
            # Use jq if available, otherwise cat
            if command -v jq &> /dev/null; then
                jq -r '"  Status: \(.status // "unknown")\n  Created: \(.created_at // "unknown")\n  Priority: \(.priority // "normal")"' "$task_file" 2>/dev/null || cat "$task_file"
            else
                cat "$task_file" | python3 -m json.tool 2>/dev/null || cat "$task_file"
            fi
            echo ""
        fi
    done
}

# Execute
list_tasks {{ status }} {{ limit }}
```

Valid statuses:
- `all` - All tasks (default)
- `pending` - Waiting to be processed
- `active` - Currently running
- `completed` - Successfully finished
- `failed` - Encountered errors

---

## Display Format

Present the output in an organized way:

```
📋 TASK QUEUE - <STATUS>

Found <N> task(s):

1. [STATUS] Title
   ID: abc-123-def
   Priority: high | Created: 2025-10-10 12:34
   Description: Brief description...
   [Result summary if completed]

2. [STATUS] Another Task
   ...
```

## Quick Actions

Offer relevant follow-up actions:

**For pending tasks:**
- Check when they'll be processed
- Verify task monitor is running
- Suggest priority adjustment if urgent

**For active tasks:**
- Watch progress: `/taskstatus <id>`
- Check agent activity

**For completed tasks:**
- Review results
- View artifacts created
- Check metrics

**For failed tasks:**
- Review error details
- Suggest retry if appropriate
- Debug using logs
