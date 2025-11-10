"""
Pydantic models for orchestration API
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime


class TaskSubmitRequest(BaseModel):
    """Request model for task submission."""

    task_name: str = Field(..., description="Human-readable task name")
    task_description: str = Field(..., description="Task description from user")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")
    budget_limit: Optional[float] = Field(None, description="Budget limit in USD")
    confidence_threshold: Optional[float] = Field(95.0, description="Confidence threshold (0-100)")

    class Config:
        json_schema_extra = {
            "example": {
                "task_name": "Build REST API",
                "task_description": "Create a FastAPI REST API with authentication and CRUD endpoints for users",
                "metadata": {"priority": "high"},
                "budget_limit": 5.0,
                "confidence_threshold": 95.0
            }
        }


class TaskSubmitResponse(BaseModel):
    """Response model for task submission."""

    success: bool
    task_id: str
    message: str
    status: str = "queued"


class TaskStatusResponse(BaseModel):
    """Response model for task status."""

    task_id: str
    task_name: str
    status: str
    progress: Optional[Dict[str, Any]] = None
    artifacts: Optional[Dict[str, Any]] = None
    telemetry: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class TaskResultResponse(BaseModel):
    """Response model for task result."""

    success: bool
    task_id: str
    task_name: str
    completed_at: str
    artifacts: Dict[str, Any]
    telemetry: Dict[str, Any]
    quality: Dict[str, Any]
    learning: Optional[Dict[str, Any]] = None


class NodeExecutionRequest(BaseModel):
    """Request model for single node execution."""

    node_id: str = Field(..., description="Node ID (P0, P1, S1, etc.)")
    inputs: Dict[str, Any] = Field(..., description="Node inputs")
    confidence_threshold: Optional[float] = Field(95.0, description="Confidence threshold")


class NodeExecutionResponse(BaseModel):
    """Response model for node execution."""

    success: bool
    node_id: str
    outputs: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    logs: Optional[List[str]] = None
    error: Optional[str] = None


class TelemetryResponse(BaseModel):
    """Response model for telemetry data."""

    total_cost: float
    total_tokens: int
    total_calls: int
    breakdown: Dict[str, Any]
    cost_ledger: Optional[List[Dict[str, Any]]] = None


class JobListResponse(BaseModel):
    """Response model for job listing."""

    jobs: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
