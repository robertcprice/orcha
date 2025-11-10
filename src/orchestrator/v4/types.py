"""
Type definitions for Hybrid Orchestrator V4

All dataclasses and type definitions used across orchestrator stages.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone


@dataclass
class InformationRequest:
    """Request for information from Claude to ChatGPT"""
    request_id: str
    requested_by: str  # Which Claude agent
    request_type: str  # "research", "context", "web_search", "advice"
    query: str
    details: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class InformationResponse:
    """Response from ChatGPT to Claude's request"""
    request_id: str
    response_type: str
    content: str
    sources: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class DialogueStage:
    """Represents one stage in the iterative dialogue"""
    stage_id: str
    stage_type: str  # "analysis", "planning", "execution", "verification", "review", "summary"
    claude_action: str
    chatgpt_response: Optional[str] = None
    status: str = "pending"  # "pending", "in_progress", "completed", "failed"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IterativeExecutionResult:
    """Result of iterative dialogue execution"""
    goal: str
    status: str  # "completed", "partial", "failed", "running"
    stages: List[DialogueStage]
    total_dialogue_turns: int
    total_time: float
    final_summary: str
    artifacts: List[str] = field(default_factory=list)  # Files created/modified
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
