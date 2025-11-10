#!/usr/bin/env python3
"""
Task Status Checker - Check status and details of a specific task

Usage:
    python3 scripts/check_task.py <task_id> [--watch] [--format FORMAT]

Examples:
    python3 scripts/check_task.py abc-123-def-456
    python3 scripts/check_task.py abc-123 --watch     # Watch status updates
    python3 scripts/check_task.py abc-123 --format json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Optional, Dict

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

def find_task_file(task_id: str) -> Optional[Path]:
    """Find task file by ID, searching all status directories."""
    if not TASKS_BASE_DIR.exists():
        return None

    # Try to find the task file
    for task_file in TASKS_BASE_DIR.rglob(f"{task_id}.json"):
        return task_file

    # Also try partial ID match
    for task_file in TASKS_BASE_DIR.rglob("*.json"):
        if task_id in task_file.stem:
            return task_file

    return None


def load_task(task_file: Path) -> Optional[Dict]:
    """Load task data from JSON file."""
    try:
        with open(task_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {task_file}: {e}", file=sys.stderr)
        return None


def format_task_text(task_data: Dict, task_file: Path) -> str:
    """Format task status for text output."""
    status = task_data.get('status', 'unknown')
    emoji = STATUS_EMOJI.get(status, "❓")

    task_id = task_file.stem

    output = "📊 TASK STATUS REPORT\n"
    output += "━" * 50 + "\n\n"

    output += f"Task ID: {task_id}\n"
    output += f"Status: {emoji} {status.upper()}\n"
    output += f"File: {task_file}\n\n"

    # Basic info
    if 'title' in task_data or 'description' in task_data:
        title = task_data.get('title', task_data.get('description', 'No title'))
        output += f"Title: {title}\n"

    if 'priority' in task_data:
        output += f"Priority: {task_data['priority']}\n"

    if 'created_at' in task_data:
        output += f"Created: {task_data['created_at']}\n"

    if 'agent' in task_data:
        output += f"Agent: {task_data['agent']}\n"

    # Status-specific info
    if status == "active":
        output += "\n🔵 ACTIVE - Task in progress\n"
        if 'started_at' in task_data:
            output += f"Started: {task_data['started_at']}\n"
        if 'progress' in task_data:
            output += f"Progress: {task_data['progress']}\n"

    elif status == "completed":
        output += "\n✅ COMPLETED - Task finished successfully\n"
        if 'completed_at' in task_data:
            output += f"Completed: {task_data['completed_at']}\n"
        if 'result' in task_data:
            output += f"\nResult:\n{task_data['result']}\n"
        if 'metrics' in task_data:
            metrics = task_data['metrics']
            output += f"\nMetrics:\n"
            for key, value in metrics.items():
                output += f"  {key}: {value}\n"

    elif status == "failed":
        output += "\n❌ FAILED - Task encountered an error\n"
        if 'error' in task_data:
            output += f"\nError:\n{task_data['error']}\n"
        if 'traceback' in task_data:
            output += f"\nTraceback:\n{task_data['traceback']}\n"

    elif status == "pending":
        output += "\n🟡 PENDING - Waiting to be processed\n"
        output += "   Tip: Verify orchestrator is running\n"

    output += "\n" + "━" * 50 + "\n"

    return output


def watch_task(task_file: Path, interval: int = 5):
    """Watch task status with periodic updates."""
    print("👁️  Watching task status (Ctrl+C to stop)...\n")

    try:
        while True:
            os.system('clear' if os.name == 'posix' else 'cls')

            task_data = load_task(task_file)
            if task_data:
                print(format_task_text(task_data, task_file))

                status = task_data.get('status', 'unknown')
                if status in ['completed', 'failed', 'cancelled']:
                    print(f"\n✅ Task finished with status: {status}")
                    break
            else:
                print(f"❌ Error loading task file: {task_file}")
                break

            print(f"\nUpdating every {interval} seconds...")
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\n⏹️  Stopped watching")


def main():
    parser = argparse.ArgumentParser(description='Check status of a specific task')
    parser.add_argument('task_id', help='Task ID to check')
    parser.add_argument('--watch', action='store_true', help='Watch task status with live updates')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--interval', type=int, default=5, help='Update interval for watch mode (seconds)')

    args = parser.parse_args()

    # Find task file
    task_file = find_task_file(args.task_id)

    if not task_file:
        print(f"❌ Task not found: {args.task_id}")
        print(f"\nSearched in: {TASKS_BASE_DIR}")
        print("\nTip: Use /listtasks to see available tasks")
        sys.exit(1)

    # Load task
    task_data = load_task(task_file)
    if not task_data:
        print(f"❌ Error loading task: {args.task_id}")
        sys.exit(1)

    # Output
    if args.watch:
        if args.format == 'json':
            print("Error: --watch mode not supported with JSON format", file=sys.stderr)
            sys.exit(1)
        watch_task(task_file, args.interval)
    else:
        if args.format == 'json':
            task_data['id'] = task_file.stem
            task_data['file_path'] = str(task_file)
            print(json.dumps(task_data, indent=2))
        else:
            print(format_task_text(task_data, task_file))


if __name__ == "__main__":
    main()
