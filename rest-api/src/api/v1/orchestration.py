"""
Orchestration API endpoints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any
import logging
from pathlib import Path

from ...models.orchestration import (
    TaskSubmitRequest,
    TaskSubmitResponse,
    TaskStatusResponse,
    TaskResultResponse,
    NodeExecutionRequest,
    NodeExecutionResponse
)
from ...services.orchestration_service import OrchestrationService
from ...core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize orchestration service
orchestration_service = OrchestrationService()


@router.post("/tasks", response_model=TaskSubmitResponse)
async def submit_task(
    request: TaskSubmitRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit a new orchestration task.

    This endpoint queues a task for execution through the 11-node MCP DAG workflow.
    The task will be processed asynchronously in the background.

    Args:
        request: Task submission request
        background_tasks: FastAPI background tasks

    Returns:
        TaskSubmitResponse with task_id and status
    """
    try:
        logger.info(f"Submitting task: {request.task_name}")

        # Validate budget
        budget_limit = request.budget_limit or settings.DEFAULT_BUDGET_LIMIT
        if budget_limit <= 0:
            raise HTTPException(status_code=400, detail="Budget limit must be positive")

        # Create task
        task_id = orchestration_service.create_task(
            task_name=request.task_name,
            task_description=request.task_description,
            metadata=request.metadata,
            budget_limit=budget_limit,
            confidence_threshold=request.confidence_threshold
        )

        # Queue task for background execution
        background_tasks.add_task(
            orchestration_service.execute_task,
            task_id
        )

        logger.info(f"Task {task_id} queued successfully")

        return TaskSubmitResponse(
            success=True,
            task_id=task_id,
            message=f"Task {task_id} queued for execution",
            status="queued"
        )

    except Exception as e:
        logger.error(f"Failed to submit task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get status of a task.

    Args:
        task_id: Task ID

    Returns:
        TaskStatusResponse with current status and progress
    """
    try:
        status = orchestration_service.get_task_status(task_id)

        if not status:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        return TaskStatusResponse(**status)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}/result", response_model=TaskResultResponse)
async def get_task_result(task_id: str):
    """
    Get result of a completed task.

    Args:
        task_id: Task ID

    Returns:
        TaskResultResponse with complete results

    Raises:
        404: Task not found
        400: Task not completed yet
    """
    try:
        result = orchestration_service.get_task_result(task_id)

        if not result:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        if not result.get('success') and result.get('error') == 'task_not_completed':
            raise HTTPException(status_code=400, detail="Task not completed yet")

        return TaskResultResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task result: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """
    Cancel a running task.

    Args:
        task_id: Task ID

    Returns:
        Success message
    """
    try:
        success = orchestration_service.cancel_task(task_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found or already completed")

        return {"success": True, "message": f"Task {task_id} cancelled"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel task: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/nodes/execute", response_model=NodeExecutionResponse)
async def execute_node(request: NodeExecutionRequest):
    """
    Execute a single node independently (for testing/debugging).

    Args:
        request: Node execution request

    Returns:
        NodeExecutionResponse with node outputs
    """
    try:
        logger.info(f"Executing node {request.node_id}")

        result = orchestration_service.execute_node(
            node_id=request.node_id,
            inputs=request.inputs,
            confidence_threshold=request.confidence_threshold
        )

        return NodeExecutionResponse(**result)

    except Exception as e:
        logger.error(f"Failed to execute node: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dag/structure")
async def get_dag_structure():
    """
    Get DAG structure and execution order.

    Returns:
        DAG structure with nodes, edges, and execution order
    """
    try:
        structure = orchestration_service.get_dag_structure()
        return structure

    except Exception as e:
        logger.error(f"Failed to get DAG structure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nodes")
async def list_nodes():
    """
    List all available nodes.

    Returns:
        List of node IDs and descriptions
    """
    return {
        "nodes": [
            {"id": "P0", "name": "Interactive Intake", "description": "Confidence-driven Q&A"},
            {"id": "P1", "name": "Multi-AI Planning", "description": "Sequential AI planning committee"},
            {"id": "S1", "name": "Security Planning", "description": "STRIDE threat modeling"},
            {"id": "P2", "name": "Implementation", "description": "Code generation"},
            {"id": "T1", "name": "Testing", "description": "Test generation with coverage"},
            {"id": "S2", "name": "Security Review", "description": "SAST and SBOM generation"},
            {"id": "S3", "name": "Security Fix", "description": "Vulnerability patching"},
            {"id": "P4", "name": "Refinement", "description": "Iterative improvement"},
            {"id": "D1", "name": "Documentation", "description": "Comprehensive documentation"},
            {"id": "O1", "name": "Final Ops", "description": "E2E testing"},
            {"id": "P6", "name": "Persistence", "description": "Artifact persistence"}
        ]
    }
