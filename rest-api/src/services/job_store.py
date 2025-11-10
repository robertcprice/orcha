"""
Job store for persisting job state
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class JobStore:
    """
    Simple file-based job store.

    Stores job state as JSON files in ./workspace/jobs/
    """

    def __init__(self, storage_dir: Optional[Path] = None):
        """Initialize job store."""
        self.storage_dir = storage_dir or Path("./workspace/jobs")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"JobStore initialized at {self.storage_dir}")

    def save_job(self, task_id: str, job_data: Dict[str, Any]):
        """
        Save job data.

        Args:
            task_id: Task ID
            job_data: Job data dict
        """
        file_path = self.storage_dir / f"{task_id}.json"

        with open(file_path, 'w') as f:
            json.dump(job_data, f, indent=2)

        logger.debug(f"Job {task_id} saved")

    def get_job(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get job data.

        Args:
            task_id: Task ID

        Returns:
            Job data dict or None
        """
        file_path = self.storage_dir / f"{task_id}.json"

        if not file_path.exists():
            return None

        with open(file_path, 'r') as f:
            return json.load(f)

    def list_jobs(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all jobs.

        Args:
            status: Optional status filter

        Returns:
            List of job data dicts
        """
        jobs = []

        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, 'r') as f:
                    job = json.load(f)

                if status is None or job.get('status') == status:
                    jobs.append(job)

            except Exception as e:
                logger.error(f"Failed to load job {file_path}: {e}")

        # Sort by created_at descending
        jobs.sort(key=lambda j: j.get('created_at', ''), reverse=True)

        return jobs

    def delete_job(self, task_id: str) -> bool:
        """
        Delete a job.

        Args:
            task_id: Task ID

        Returns:
            True if deleted, False if not found
        """
        file_path = self.storage_dir / f"{task_id}.json"

        if not file_path.exists():
            return False

        file_path.unlink()
        logger.info(f"Job {task_id} deleted")
        return True
