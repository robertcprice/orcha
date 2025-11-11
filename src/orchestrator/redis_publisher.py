"""
Redis Event Publisher for Orchestration System

Publishes orchestration events to Redis for real-time dashboard updates.
The module now exposes both a reusable publisher class and an async helper
function (`publish_event`) that other agents can await when broadcasting
real-time status messages.
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

import redis

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DEFAULT_EVENT_CHANNEL = os.getenv("AGENT_EVENT_CHANNEL", "algomind.agent.events")
DEFAULT_SOURCE_APP = os.getenv("ORCHESTRATION_SOURCE_APP", "orchestrator")
STRUCTURED_DATA_KEYS = [
    "agent",
    "agent_id",
    "agent_label",
    "agent_type",
    "parent_agent_id",
    "parent_task_id",
    "status",
    "message",
    "goal",
    "summary",
    "stage_id",
    "stage_type",
    "ai_name",
    "ai_provider",
    "request_data",
    "response_data",
    "success",
    "error",
    "plan_id",  # ✅ FIX: Add plan_id for frontend filtering
]


def _prepare_event_payload(event: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize outbound event payloads for websocket consumers."""
    payload: Dict[str, Any] = dict(event)

    # Derive event type from common keys (`type`, `event_type`, or `action`)
    event_type = (
        payload.get("event_type")
        or payload.get("type")
        or payload.get("action")
        or "agent_event"
    )
    payload["event_type"] = event_type
    payload.setdefault("type", event_type)

    # Timestamp and source metadata
    payload.setdefault("timestamp", datetime.now().isoformat())
    payload.setdefault(
        "source_app",
        payload.get("actor")
        or payload.get("agent_id")
        or payload.get("source")
        or DEFAULT_SOURCE_APP,
    )
    payload.setdefault("task_id", payload.get("task_id", "unknown"))
    payload.setdefault("session_id", payload.get("session_id", payload["task_id"]))

    # Ensure additional metadata is preserved for dashboards
    meta = payload.get("meta")
    if meta and "data" not in payload:
        payload["data"] = dict(meta)

    # Always carry a data section so dashboards have structured content
    existing_data = payload.get("data")
    if not isinstance(existing_data, dict):
        existing_data = {}

    # Merge meta into data without overwriting explicit fields
    if isinstance(meta, dict):
        for key, value in meta.items():
            existing_data.setdefault(key, value)

    # Ensure foundational identifiers are present
    if payload.get("task_id") is not None:
        existing_data.setdefault("task_id", payload.get("task_id"))
    if payload.get("status") is not None:
        existing_data.setdefault("status", payload.get("status"))
    if payload.get("actor") is not None:
        existing_data.setdefault("actor", payload.get("actor"))

    # Promote commonly-used fields into data for UI consumers
    for key in STRUCTURED_DATA_KEYS:
        if payload.get(key) is not None:
            existing_data.setdefault(key, payload.get(key))

    payload["data"] = existing_data

    # ✅ FIX: Also set payload key for frontend compatibility (OrchestratorCanvas looks for both)
    payload["payload"] = existing_data

    # ✅ FIX: Ensure hook_event_type is set for frontend filtering
    if "hook_event_type" not in payload and payload.get("type"):
        payload["hook_event_type"] = payload["type"]

    return payload


def _publish_event_sync(payload: Dict[str, Any], channel: str) -> None:
    """Synchronously publish an event to Redis."""
    client = None
    try:
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.publish(channel, json.dumps(payload, default=str))
    except Exception as exc:  # pragma: no cover - best-effort logging
        print(f"⚠️  Failed to publish event to Redis: {exc}")
    finally:
        if client:
            try:
                client.close()
            except Exception:
                pass


async def publish_event(event: Dict[str, Any], channel: Optional[str] = None) -> None:
    """
    Asynchronously publish a rich event payload to Redis.

    Agents and orchestration helpers should await this function to ensure
    live dashboards receive updates even when running inside async workflows.
    """
    target_channel = channel or DEFAULT_EVENT_CHANNEL
    payload = _prepare_event_payload(event)
    await asyncio.to_thread(_publish_event_sync, payload, target_channel)


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

    def __init__(
        self,
        redis_url: str = REDIS_URL,
        channel: str = DEFAULT_EVENT_CHANNEL,
    ):

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
        base_event = {
            "type": action,
            "action": action,
            "status": status,
            "actor": actor,
            "task_id": task_id or "unknown",
            "meta": meta or {},
        }

        payload = _prepare_event_payload(base_event)
        payload.setdefault("ts", payload["timestamp"])

        try:
            self.redis_client.publish(self.channel, json.dumps(payload, default=str))
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
