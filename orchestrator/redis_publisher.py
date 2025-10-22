"""
Redis Event Publisher for Orchestration System

Publishes orchestration events to Redis for real-time dashboard updates.
"""

import os
import redis
import json
from datetime import datetime
from typing import Dict, Optional, Any
import traceback


# Redis configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
EVENT_CHANNEL = 'orchestration.events'


class RedisEventPublisher:
    """
    Publishes orchestration events to Redis for real-time dashboard consumption.

    Event format:
    {
        'ts': ISO timestamp,
        'actor': Agent/system name,
        'task_id': Task identifier,
        'action': Action type,
        'status': 'started|completed|failed|in_progress',
        'meta': Additional metadata
    }
    """

    def __init__(self, redis_url: str = REDIS_URL, channel: str = EVENT_CHANNEL):

        self.redis_url = redis_url
        self.channel = channel
        self.redis_client = None

        # Try to connect to Redis
        self._connect()

    def _connect(self):

        """Connect to Redis server."""

        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            self.redis_client.ping()
            print(f"✅ Redis event publisher connected to {self.redis_url}")
            return True
        except Exception as e:
            print(f"⚠️  Redis connection failed: {e}")
            print(f"    Events will not be published to dashboard")
            self.redis_client = None
            return False

    def publish_event(
        self,
        action: str,
        status: str,
        actor: str = "Orchestration System",
        task_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None
    ):

        """
        Publish an event to Redis.

        Args:
            action: Action type (e.g., 'orchestrator_start', 'task_decomposed', 'agent_spawned')
            status: Status ('started', 'completed', 'failed', 'in_progress')
            actor: Name of the agent/system performing the action
            task_id: Task identifier (optional)
            meta: Additional metadata dictionary
        """

        if not self.redis_client:
            return  # Silently skip if Redis unavailable

        event = {
            'ts': datetime.now().isoformat(),
            'actor': actor,
            'task_id': task_id or 'unknown',
            'action': action,
            'status': status,
            'meta': meta or {}
        }

        try:
            self.redis_client.publish(self.channel, json.dumps(event))
        except Exception as e:
            print(f"⚠️  Failed to publish event to Redis: {e}")

    def publish_orchestrator_start(self, user_request: str):

        """Publish orchestrator start event."""

        self.publish_event(
            action='orchestrator_start',
            status='started',
            meta={'user_request': user_request}
        )

    def publish_planning_complete(self, task_id: str, plan: Dict[str, Any]):

        """Publish planning phase completion."""

        self.publish_event(
            action='planning_complete',
            status='completed',
            task_id=task_id,
            actor='Planning Layer',
            meta={
                'components': plan.get('components', []),
                'requirements': plan.get('requirements', {})
            }
        )

    def publish_task_decomposed(self, task_id: str, num_tasks: int, strategy: str):

        """Publish task decomposition event."""

        self.publish_event(
            action='task_decomposed',
            status='completed',
            task_id=task_id,
            actor='Task Decomposer',
            meta={
                'num_main_tasks': num_tasks,
                'execution_strategy': strategy
            }
        )

    def publish_manager_started(self, task_id: str, manager_name: str, num_subtasks: int):

        """Publish manager agent start event."""

        self.publish_event(
            action='manager_started',
            status='started',
            task_id=task_id,
            actor=manager_name,
            meta={'num_subtasks': num_subtasks}
        )

    def publish_manager_complete(self, task_id: str, manager_name: str, success: bool):

        """Publish manager agent completion event."""

        self.publish_event(
            action='manager_complete',
            status='completed' if success else 'failed',
            task_id=task_id,
            actor=manager_name
        )

    def publish_agent_spawned(self, task_id: str, agent_id: str, agent_type: str):

        """Publish Claude agent spawn event."""

        self.publish_event(
            action='agent_spawned',
            status='started',
            task_id=task_id,
            actor=f'Claude Agent ({agent_type})',
            meta={'agent_id': agent_id}
        )

    def publish_agent_complete(
        self,
        task_id: str,
        agent_id: str,
        agent_type: str,
        success: bool,
        duration_seconds: Optional[float] = None
    ):

        """Publish Claude agent completion event."""

        meta = {'agent_id': agent_id}
        if duration_seconds:
            meta['duration_seconds'] = round(duration_seconds, 2)

        self.publish_event(
            action='agent_complete',
            status='completed' if success else 'failed',
            task_id=task_id,
            actor=f'Claude Agent ({agent_type})',
            meta=meta
        )

    def publish_validation_start(self, task_id: str):

        """Publish validation phase start event."""

        self.publish_event(
            action='validation_start',
            status='started',
            task_id=task_id,
            actor='Feedback Validator'
        )

    def publish_validation_complete(
        self,
        task_id: str,
        alignment_score: float,
        passed: bool
    ):

        """Publish validation completion event."""

        self.publish_event(
            action='validation_complete',
            status='completed' if passed else 'failed',
            task_id=task_id,
            actor='Feedback Validator',
            meta={
                'alignment_score': alignment_score,
                'passed': passed
            }
        )

    def publish_orchestrator_complete(
        self,
        task_id: str,
        success: bool,
        duration_seconds: Optional[float] = None,
        artifacts: Optional[list] = None
    ):

        """Publish orchestrator completion event."""

        meta = {}
        if duration_seconds:
            meta['duration_seconds'] = round(duration_seconds, 2)
        if artifacts:
            meta['artifacts_count'] = len(artifacts)

        self.publish_event(
            action='orchestrator_complete',
            status='completed' if success else 'failed',
            task_id=task_id,
            meta=meta
        )

    def publish_error(
        self,
        task_id: str,
        error_message: str,
        actor: str = "Orchestration System",
        error_details: Optional[str] = None
    ):

        """Publish error event."""

        meta = {'error_message': error_message}
        if error_details:
            meta['error_details'] = error_details

        self.publish_event(
            action='error',
            status='failed',
            task_id=task_id,
            actor=actor,
            meta=meta
        )

    def close(self):

        """Close Redis connection."""

        if self.redis_client:
            self.redis_client.close()


# Global singleton instance
_global_publisher = None


def get_publisher() -> RedisEventPublisher:

    """Get or create the global Redis event publisher instance."""

    global _global_publisher
    if _global_publisher is None:
        _global_publisher = RedisEventPublisher()
    return _global_publisher
