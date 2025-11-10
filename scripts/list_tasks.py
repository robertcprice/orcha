#!/usr/bin/env python3
"""
Task List Utility - List and filter tasks in the orchestration system

Usage:
    python3 scripts/list_tasks.py [--status STATUS] [--limit N] [--format FORMAT]

Examples:
    python3 scripts/list_tasks.py                    # List all tasks
    python3 scripts/list_tasks.py --status pending   # Only pending tasks
    python3 scripts/list_tasks.py --limit 10         # First 10 tasks
    python3 scripts/list_tasks.py --format json      # JSON output
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

TASKS_BASE_DIR = PROJECT_ROOT / "projects" / "Smart Market Solutions" / "tasks"

# Status emoji mapping
STATUS_EMOJI = {
    "pending": "🟡",
    "active": "🔵",
    "completed": "🟢",
    "failed": "🔴",
    "cancelled": "⚪"
}

def find_task_files(status: Optional[str] = None, limit: Optional[int] = None) -> List[Path]:
    """Find task files, optionally filtered by status."""
    if not TASKS_BASE_DIR.exists():
        return []

    task_files = []

    if status and status != "all":
        # Search in specific status directory
        status_dir = TASKS_BASE_DIR / status
        if status_dir.exists():
            task_files = list(status_dir.glob("*.json"))
    else:
        # Search all subdirectories
        task_files = list(TASKS_BASE_DIR.rglob("*.json"))

    # Sort by modification time (most recent first)
    task_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    if limit:
        task_files = task_files[:limit]

    return task_files


def load_task(task_file: Path) -> Optional[Dict]:
    """Load task data from JSON file."""
    try:
        with open(task_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {task_file}: {e}", file=sys.stderr)
        return None


def format_task_text(task_data: Dict, task_file: Path) -> str:
    """Format task for text output."""
    status = task_data.get('status', 'unknown')
    emoji = STATUS_EMOJI.get(status, "❓")

    task_id = task_file.stem
    title = task_data.get('title', task_data.get('description', 'No title'))[:60]
    priority = task_data.get('priority', 'normal')
    created = task_data.get('created_at', 'unknown')
    agent = task_data.get('agent', 'unknown')

    output = f"{emoji} [{status.upper()}] {title}\n"
    output += f"   ID: {task_id}\n"
    output += f"   Priority: {priority} | Agent: {agent}\n"
    output += f"   Created: {created}\n"

    if status == "completed":
        result = task_data.get('result', '')
        if result:
            result_preview = result[:100] + "..." if len(result) > 100 else result
            output += f"   Result: {result_preview}\n"

    if status == "failed":
        error = task_data.get('error', '')
        if error:
            error_preview = error[:100] + "..." if len(error) > 100 else error
            output += f"   Error: {error_preview}\n"

    return output


def format_task_json(task_data: Dict, task_file: Path) -> Dict:
    """Format task for JSON output."""
    task_data['id'] = task_file.stem
    task_data['file_path'] = str(task_file)
    return task_data


def main():
    parser = argparse.ArgumentParser(description='List tasks in the orchestration system')
    parser.add_argument('--status', choices=['all', 'pending', 'active', 'completed', 'failed', 'cancelled'],
                        default='all', help='Filter by task status')
    parser.add_argument('--limit', type=int, help='Limit number of results')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')

    args = parser.parse_args()

    # Find tasks
    task_files = find_task_files(status=args.status, limit=args.limit)

    if not task_files:
        if args.format == 'json':
            print(json.dumps({"tasks": [], "count": 0}))
        else:
            print(f"📋 No tasks found")
            if not TASKS_BASE_DIR.exists():
                print(f"   Tasks directory does not exist: {TASKS_BASE_DIR}")
        return

    # Load and format tasks
    tasks_output = []
    for task_file in task_files:
        task_data = load_task(task_file)
        if task_data:
            if args.format == 'json':
                tasks_output.append(format_task_json(task_data, task_file))
            else:
                tasks_output.append(format_task_text(task_data, task_file))

    # Output
    if args.format == 'json':
        print(json.dumps({
            "tasks": tasks_output,
            "count": len(tasks_output),
            "filter": args.status
        }, indent=2))
    else:
        status_label = args.status.upper() if args.status != "all" else "ALL"
        print(f"📋 TASK QUEUE - {status_label}")
        print(f"   Found {len(tasks_output)} task(s)\n")
        for i, task_output in enumerate(tasks_output, 1):
            print(f"{i}. {task_output}")
            print()


if __name__ == "__main__":
    main()
