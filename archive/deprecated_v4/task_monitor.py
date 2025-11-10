#!/usr/bin/env python3
"""
Task Monitor Service - Automated Agent Task Queue

Monitors the tasks/ directory for new task files and automatically
assigns them to Claude orchestrators for execution.

Features:
- File-based task queue (pending → active → completed/failed)
- Priority-based task scheduling
- Concurrent task execution with limits
- Automatic orchestrator spawning
- Health monitoring and logging
- Graceful shutdown handling
"""

import asyncio
import json
import os
import signal
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
import logging
from dataclasses import dataclass, asdict
import uuid
import shutil

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Lazy imports to avoid requiring API keys at startup
# from orchestrator.auto_orchestrator import AutoOrchestrator  # Imported when needed
from orchestrator.hybrid_codex_claude_mcp import run_hybrid_mcp_workflow


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(PROJECT_ROOT / 'logs' / 'task_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('TaskMonitor')


@dataclass
class TaskMonitorConfig:
    """Configuration for task monitor"""

    task_dir: Path
    max_concurrent_tasks: int = 3
    scan_interval_seconds: int = 5
    max_retries: int = 2
    cleanup_days: int = 30


class TaskMonitor:
    """
    Monitors task queue and automatically executes tasks using orchestrators.
    """

    def __init__(self, config: TaskMonitorConfig):

        self.config = config
        self.running = False
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.processing_tasks: Set[str] = set()

        # Task directories
        self.pending_dir = config.task_dir / "pending"
        self.active_dir = config.task_dir / "active"
        self.completed_dir = config.task_dir / "completed"
        self.failed_dir = config.task_dir / "failed"
        self.archived_dir = config.task_dir / "archived"

        # Ensure directories exist
        for dir_path in [self.pending_dir, self.active_dir,
                         self.completed_dir, self.failed_dir, self.archived_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Statistics
        self.stats = {
            "tasks_processed": 0,
            "tasks_completed": 0,
            "tasks_failed": 0,
            "started_at": datetime.now(timezone.utc).isoformat()
        }

        logger.info("Task Monitor initialized")
        logger.info(f"Task directory: {config.task_dir}")
        logger.info(f"Max concurrent tasks: {config.max_concurrent_tasks}")

    async def start(self):
        """Start the task monitor service"""

        logger.info("Starting Task Monitor Service...")
        self.running = True

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        logger.info("Task Monitor Service started")
        logger.info("Waiting for tasks...")

        try:
            while self.running:
                await self._scan_and_process_tasks()
                await asyncio.sleep(self.config.scan_interval_seconds)

        except Exception as e:
            logger.error(f"Task Monitor error: {e}", exc_info=True)

        finally:
            await self._shutdown()

    def _handle_shutdown(self, signum, frame):
        """Handle shutdown signals"""

        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.running = False

    async def _shutdown(self):
        """Graceful shutdown - wait for active tasks to complete"""

        logger.info("Shutting down Task Monitor...")

        if self.active_tasks:
            logger.info(f"Waiting for {len(self.active_tasks)} active tasks to complete...")

            # Give tasks 30 seconds to finish
            try:
                await asyncio.wait_for(
                    asyncio.gather(*self.active_tasks.values(), return_exceptions=True),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                logger.warning("Some tasks did not complete in time")

        logger.info("Task Monitor shutdown complete")
        logger.info(f"Final stats: {json.dumps(self.stats, indent=2)}")

    async def _scan_and_process_tasks(self):
        """
        Scan pending directories (orchestrator and all projects) for new tasks.
        """

        # Check if we can accept more tasks
        if len(self.active_tasks) >= self.config.max_concurrent_tasks:
            return

        # Get pending task files from all sources
        pending_tasks = self._get_all_pending_tasks()

        if not pending_tasks:
            return

        logger.info(f"Found {len(pending_tasks)} pending task(s) across all projects")

        # Process tasks up to concurrent limit
        slots_available = self.config.max_concurrent_tasks - len(self.active_tasks)

        for task_file in pending_tasks[:slots_available]:

            # Avoid processing the same file multiple times
            if task_file.stem in self.processing_tasks:
                continue

            task_data = await self._load_task(task_file)

            if task_data:
                await self._process_task(task_file, task_data)

    def _get_all_pending_tasks(self) -> List[Path]:
        """
        Get pending tasks from orchestrator and all project directories.
        """
        all_pending = []

        # Scan orchestrator tasks directory
        orchestrator_pending = self._get_pending_tasks_from_dir(self.pending_dir)
        all_pending.extend(orchestrator_pending)

        # Scan all project task directories
        projects_dir = PROJECT_ROOT / "projects"
        if projects_dir.exists():
            for project_dir in projects_dir.iterdir():
                if project_dir.is_dir():
                    project_pending_dir = project_dir / "tasks" / "pending"
                    if project_pending_dir.exists():
                        project_pending = self._get_pending_tasks_from_dir(project_pending_dir)
                        all_pending.extend(project_pending)
                        if project_pending:
                            logger.info(f"Found {len(project_pending)} task(s) in project: {project_dir.name}")

        # Sort all tasks by priority
        if all_pending:
            priority_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}

            def sort_key(task_file: Path):
                try:
                    with open(task_file, 'r') as f:
                        data = json.load(f)
                    priority = priority_order.get(data.get("priority", "normal"), 2)
                    created_at = data.get("created_at", "")
                    return (priority, created_at)
                except Exception as e:
                    logger.error(f"Error reading task {task_file}: {e}")
                    return (99, "")

            all_pending.sort(key=sort_key)

        return all_pending

    def _get_pending_tasks_from_dir(self, pending_dir: Path) -> List[Path]:
        """Get pending tasks from a specific directory."""
        if not pending_dir.exists():
            return []

        try:
            return list(pending_dir.glob("*.json"))
        except Exception as e:
            logger.error(f"Error scanning directory {pending_dir}: {e}")
            return []

    def _get_pending_tasks(self) -> List[Path]:
        """
        Get list of pending task files sorted by priority.

        Priority order: critical > high > normal > low
        Within same priority: oldest first (by creation time)
        """

        task_files = list(self.pending_dir.glob("*.json"))

        if not task_files:
            return []

        # Load and sort by priority
        priority_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}

        def sort_key(task_file: Path):

            try:
                with open(task_file, 'r') as f:
                    data = json.load(f)

                priority = priority_order.get(data.get("priority", "normal"), 2)
                created_at = data.get("created_at", "")

                return (priority, created_at)

            except Exception as e:
                logger.error(f"Error reading task {task_file}: {e}")
                return (99, "")  # Put errored tasks at end

        task_files.sort(key=sort_key)

        return task_files

    async def _load_task(self, task_file: Path) -> Optional[Dict]:
        """Load and validate task file"""

        try:
            with open(task_file, 'r') as f:
                task_data = json.load(f)

            # Basic validation
            required_fields = ["task_id", "title", "description", "priority"]

            for field in required_fields:
                if field not in task_data:
                    logger.error(f"Task {task_file} missing required field: {field}")
                    await self._move_to_failed(task_file, f"Missing field: {field}")
                    return None

            return task_data

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in task {task_file}: {e}")
            await self._move_to_failed(task_file, f"Invalid JSON: {e}")
            return None

        except Exception as e:
            logger.error(f"Error loading task {task_file}: {e}")
            return None

    async def _process_task(self, task_file: Path, task_data: Dict):
        """
        Process a single task by spawning an orchestrator.
        """

        task_id = task_data["task_id"]
        title = task_data["title"]

        logger.info(f"Processing task: {title} ({task_id})")

        # Mark as processing
        self.processing_tasks.add(task_file.stem)

        # Determine which project this task belongs to
        task_base_dir = self._get_task_base_dir(task_file)
        active_dir = task_base_dir / "active"
        active_dir.mkdir(parents=True, exist_ok=True)

        # Move to active directory
        active_file = active_dir / task_file.name

        try:
            shutil.move(str(task_file), str(active_file))
        except Exception as e:
            logger.error(f"Failed to move task to active: {e}")
            self.processing_tasks.discard(task_file.stem)
            return

        # Update task status
        task_data["status"] = "active"
        task_data["started_at"] = datetime.now(timezone.utc).isoformat()

        with open(active_file, 'w') as f:
            json.dump(task_data, f, indent=2)

        # Create and start orchestrator task
        orchestrator_task = asyncio.create_task(
            self._run_orchestrator(active_file, task_data, task_base_dir)
        )

        self.active_tasks[task_id] = orchestrator_task
        self.stats["tasks_processed"] += 1

        # Add completion callback
        orchestrator_task.add_done_callback(
            lambda t: self._task_completed(task_id, task_file.stem)
        )

    def _get_task_base_dir(self, task_file: Path) -> Path:
        """Determine the base tasks directory for a task file."""
        # Check if task is in a project directory
        try:
            parts = task_file.parts
            if "projects" in parts:
                # Find project name
                projects_idx = parts.index("projects")
                if projects_idx + 1 < len(parts):
                    project_name = parts[projects_idx + 1]
                    return PROJECT_ROOT / "projects" / project_name / "tasks"
        except:
            pass

        # Default to orchestrator tasks directory
        return self.config.task_dir

    def _task_completed(self, task_id: str, file_stem: str):
        """Callback when orchestrator task completes"""

        self.active_tasks.pop(task_id, None)
        self.processing_tasks.discard(file_stem)

        logger.info(f"Task {task_id} completed")

    async def _run_orchestrator(self, task_file: Path, task_data: Dict, task_base_dir: Path):
        """
        Run orchestrator for a task.

        Supports two modes:
        - 'auto': Uses AutoOrchestrator (default, existing behavior)
        - 'hybrid': Uses Codex-Claude hybrid workflow (Codex implements, Claude reviews)
        """

        task_id = task_data["task_id"]
        title = task_data["title"]
        orchestrator_mode = task_data.get("orchestrator_mode", "auto")

        logger.info(f"Starting orchestrator for: {title} (mode: {orchestrator_mode})")

        # Get project-specific directories
        completed_dir = task_base_dir / "completed"
        failed_dir = task_base_dir / "failed"
        completed_dir.mkdir(parents=True, exist_ok=True)
        failed_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Choose orchestrator based on mode
            if orchestrator_mode == "hybrid":
                # Use Codex-Claude hybrid workflow
                logger.info("Using Codex-Claude hybrid workflow")

                result = await run_hybrid_mcp_workflow(
                    task_id=task_id,
                    title=title,
                    description=task_data.get("description", ""),
                    requirements=task_data.get("requirements", []),
                    cwd=task_data.get("cwd", str(PROJECT_ROOT)),
                    context=task_data.get("context", {}),
                    max_iterations=task_data.get("max_iterations", 3)
                )

                # Convert hybrid result to standard result format
                result = {
                    "success": result.success,
                    "summary": result.final_output if result.success else result.error,
                    "iterations": result.iterations,
                    "quality_score": result.quality_score,
                    "conversation_id": result.conversation_id,
                    "codex_iterations": result.codex_iterations,
                    "claude_reviews": result.claude_reviews,
                    "total_time": result.total_time,
                    "error": result.error
                }
            else:
                # Use Auto Orchestrator (default)
                logger.info("Using AutoOrchestrator")

                # Lazy import to avoid requiring API key at startup
                from orchestrator.auto_orchestrator import AutoOrchestrator

                orchestrator = AutoOrchestrator(
                    project_root=PROJECT_ROOT,
                    task_data=task_data
                )

                # Execute task
                result = await orchestrator.execute_task()

            # Update task with results
            task_data["status"] = "completed"
            task_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            task_data["result"] = result

            # Move to completed directory
            completed_file = completed_dir / task_file.name

            with open(completed_file, 'w') as f:
                json.dump(task_data, f, indent=2)

            # Remove from active
            task_file.unlink(missing_ok=True)

            self.stats["tasks_completed"] += 1

            logger.info(f"Task completed successfully: {title}")
            logger.info(f"Results: {result.get('summary', 'No summary')[:200]}")

        except Exception as e:
            logger.error(f"Task execution failed: {title}", exc_info=True)

            # Update task with error
            task_data["status"] = "failed"
            task_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            task_data["result"] = {
                "status": "failure",
                "error": str(e),
                "summary": f"Task failed with error: {str(e)}"
            }

            # Move to failed directory
            failed_file = failed_dir / task_file.name

            with open(failed_file, 'w') as f:
                json.dump(task_data, f, indent=2)

            # Remove from active
            task_file.unlink(missing_ok=True)

            self.stats["tasks_failed"] += 1

    async def _move_to_failed(self, task_file: Path, error: str):
        """Move malformed task to failed directory"""

        try:
            # Try to load what we can
            try:
                with open(task_file, 'r') as f:
                    task_data = json.load(f)
            except:
                task_data = {"error": "Could not parse task file"}

            task_data["status"] = "failed"
            task_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            task_data["result"] = {
                "status": "failure",
                "error": error
            }

            failed_file = self.failed_dir / task_file.name

            with open(failed_file, 'w') as f:
                json.dump(task_data, f, indent=2)

            task_file.unlink(missing_ok=True)

        except Exception as e:
            logger.error(f"Failed to move task to failed directory: {e}")


async def main():
    """Main entry point for task monitor service"""

    # Ensure logs directory exists
    logs_dir = PROJECT_ROOT / "logs"
    logs_dir.mkdir(exist_ok=True)

    # Create config
    config = TaskMonitorConfig(
        task_dir=PROJECT_ROOT / "orchestrator" / "tasks",
        max_concurrent_tasks=3,
        scan_interval_seconds=5
    )

    # Create and start monitor
    monitor = TaskMonitor(config)

    try:
        await monitor.start()
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    finally:
        logger.info("Task Monitor Service stopped")


if __name__ == "__main__":
    asyncio.run(main())
