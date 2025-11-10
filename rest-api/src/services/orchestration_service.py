"""
Orchestration service for managing tasks and execution
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
import json
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.orchestrator.mcp_orchestrator import MCPOrchestrator, create_orchestrator
from src.orchestrator.engine.dag import create_standard_dag
from .job_store import JobStore

logger = logging.getLogger(__name__)


class OrchestrationService:
    """
    Service for managing orchestration tasks.

    Responsibilities:
    - Task queue management
    - MCP orchestrator execution
    - Job state persistence
    - Telemetry collection
    """

    _instance = None

    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize orchestration service."""
        if self._initialized:
            return

        self.job_store = JobStore()
        self.active_tasks: Dict[str, MCPOrchestrator] = {}

        logger.info("OrchestrationService initialized")
        self._initialized = True

    def create_task(
        self,
        task_name: str,
        task_description: str,
        metadata: Optional[Dict[str, Any]] = None,
        budget_limit: Optional[float] = None,
        confidence_threshold: float = 95.0
    ) -> str:
        """
        Create a new task.

        Args:
            task_name: Human-readable task name
            task_description: Task description
            metadata: Optional metadata
            budget_limit: Optional budget limit in USD
            confidence_threshold: Confidence threshold

        Returns:
            Task ID
        """
        task_id = f"mcp_{int(datetime.now().timestamp() * 1000)}"

        job_data = {
            'task_id': task_id,
            'task_name': task_name,
            'task_description': task_description,
            'metadata': metadata or {},
            'budget_limit': budget_limit,
            'confidence_threshold': confidence_threshold,
            'status': 'queued',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }

        self.job_store.save_job(task_id, job_data)
        logger.info(f"Task {task_id} created")

        return task_id

    def execute_task(self, task_id: str):
        """
        Execute a task (called as background task).

        Args:
            task_id: Task ID
        """
        try:
            logger.info(f"Starting execution of task {task_id}")

            # Load job
            job = self.job_store.get_job(task_id)
            if not job:
                logger.error(f"Task {task_id} not found")
                return

            # Update status
            job['status'] = 'running'
            job['started_at'] = datetime.now().isoformat()
            job['updated_at'] = datetime.now().isoformat()
            self.job_store.save_job(task_id, job)

            # Create orchestrator
            orchestrator = create_orchestrator(
                mcp_servers=None,  # Will use defaults
                confidence_threshold=job['confidence_threshold'],
                budget_limit=job.get('budget_limit')
            )

            self.active_tasks[task_id] = orchestrator

            # Execute
            result = orchestrator.execute_task(
                task_name=job['task_name'],
                user_task=job['task_description'],
                metadata=job.get('metadata')
            )

            # Update job with result
            job['status'] = 'completed' if result['success'] else 'failed'
            job['completed_at'] = datetime.now().isoformat()
            job['updated_at'] = datetime.now().isoformat()
            job['result'] = result
            self.job_store.save_job(task_id, job)

            # Cleanup
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]

            logger.info(f"Task {task_id} completed with status: {job['status']}")

        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}", exc_info=True)

            # Update job status
            job = self.job_store.get_job(task_id)
            if job:
                job['status'] = 'failed'
                job['error'] = str(e)
                job['completed_at'] = datetime.now().isoformat()
                job['updated_at'] = datetime.now().isoformat()
                self.job_store.save_job(task_id, job)

            # Cleanup
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]

    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get task status.

        Args:
            task_id: Task ID

        Returns:
            Task status dict or None
        """
        job = self.job_store.get_job(task_id)
        if not job:
            return None

        status = {
            'task_id': task_id,
            'task_name': job['task_name'],
            'status': job['status'],
            'progress': None,
            'artifacts': None,
            'telemetry': None,
            'error': job.get('error')
        }

        # Add result data if completed
        if job.get('result'):
            result = job['result']
            status['artifacts'] = result.get('artifacts')
            status['telemetry'] = result.get('telemetry')

        return status

    def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get task result.

        Args:
            task_id: Task ID

        Returns:
            Task result dict or None
        """
        job = self.job_store.get_job(task_id)
        if not job:
            return None

        if job['status'] not in ['completed', 'failed']:
            return {
                'success': False,
                'error': 'task_not_completed',
                'status': job['status']
            }

        return job.get('result')

    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running task.

        Args:
            task_id: Task ID

        Returns:
            True if cancelled, False if not found or already completed
        """
        job = self.job_store.get_job(task_id)
        if not job or job['status'] in ['completed', 'failed']:
            return False

        job['status'] = 'cancelled'
        job['updated_at'] = datetime.now().isoformat()
        self.job_store.save_job(task_id, job)

        # Cleanup active task
        if task_id in self.active_tasks:
            del self.active_tasks[task_id]

        logger.info(f"Task {task_id} cancelled")
        return True

    def execute_node(
        self,
        node_id: str,
        inputs: Dict[str, Any],
        confidence_threshold: float = 95.0
    ) -> Dict[str, Any]:
        """
        Execute a single node independently.

        Args:
            node_id: Node ID
            inputs: Node inputs
            confidence_threshold: Confidence threshold

        Returns:
            Node execution result
        """
        orchestrator = create_orchestrator(
            confidence_threshold=confidence_threshold
        )

        try:
            result = orchestrator._execute_node(node_id, inputs)
            return {
                'success': result.get('success', True),
                'node_id': node_id,
                'outputs': result.get('outputs'),
                'metadata': result.get('metadata'),
                'logs': result.get('logs'),
                'error': result.get('error')
            }
        except Exception as e:
            logger.error(f"Node execution failed: {e}", exc_info=True)
            return {
                'success': False,
                'node_id': node_id,
                'error': str(e)
            }

    def get_dag_structure(self) -> Dict[str, Any]:
        """
        Get DAG structure.

        Returns:
            DAG structure with nodes, edges, and execution order
        """
        dag = create_standard_dag("example")

        return {
            'nodes': list(dag.nodes.keys()),
            'edges': [
                {'from': dep, 'to': node}
                for node, deps in dag.nodes.items()
                for dep in deps
            ],
            'execution_order': dag.get_execution_order()
        }

    def get_task_telemetry(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get telemetry for a task.

        Args:
            task_id: Task ID

        Returns:
            Telemetry dict or None
        """
        job = self.job_store.get_job(task_id)
        if not job or not job.get('result'):
            return None

        return job['result'].get('telemetry')

    def get_telemetry_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get aggregate telemetry summary.

        Args:
            start_date: Optional start date
            end_date: Optional end date

        Returns:
            Aggregate telemetry
        """
        jobs = self.job_store.list_jobs()

        total_cost = 0
        total_tokens = 0
        total_calls = 0

        for job in jobs:
            if job.get('result') and job['result'].get('telemetry'):
                telemetry = job['result']['telemetry']
                total_cost += telemetry.get('total_cost', 0)
                total_tokens += telemetry.get('total_tokens', 0)
                total_calls += telemetry.get('total_calls', 0)

        return {
            'total_cost': total_cost,
            'total_tokens': total_tokens,
            'total_calls': total_calls,
            'total_jobs': len(jobs)
        }

    def get_cost_ledger(self, task_id: str, format: str = 'json') -> Optional[Any]:
        """
        Get cost ledger for a task.

        Args:
            task_id: Task ID
            format: Export format (json or csv)

        Returns:
            Cost ledger data
        """
        job = self.job_store.get_job(task_id)
        if not job or not job.get('result'):
            return None

        # TODO: Load from actual cost ledger file
        return job['result'].get('telemetry')

    def list_jobs(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        List jobs with pagination.

        Args:
            status: Optional status filter
            page: Page number
            page_size: Page size

        Returns:
            Paginated job list
        """
        jobs = self.job_store.list_jobs(status=status)

        # Pagination
        total = len(jobs)
        start = (page - 1) * page_size
        end = start + page_size
        paginated = jobs[start:end]

        return {
            'jobs': paginated,
            'total': total,
            'page': page,
            'page_size': page_size
        }

    def delete_job(self, task_id: str) -> bool:
        """
        Delete a job.

        Args:
            task_id: Task ID

        Returns:
            True if deleted, False if not found
        """
        return self.job_store.delete_job(task_id)

    def get_job_stats(self) -> Dict[str, Any]:
        """
        Get job statistics.

        Returns:
            Job statistics
        """
        jobs = self.job_store.list_jobs()

        stats = {
            'total': len(jobs),
            'by_status': {
                'queued': 0,
                'running': 0,
                'completed': 0,
                'failed': 0,
                'cancelled': 0
            },
            'total_cost': 0,
            'total_tokens': 0
        }

        for job in jobs:
            status = job.get('status', 'unknown')
            if status in stats['by_status']:
                stats['by_status'][status] += 1

            if job.get('result') and job['result'].get('telemetry'):
                telemetry = job['result']['telemetry']
                stats['total_cost'] += telemetry.get('total_cost', 0)
                stats['total_tokens'] += telemetry.get('total_tokens', 0)

        return stats
