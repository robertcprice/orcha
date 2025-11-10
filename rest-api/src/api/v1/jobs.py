"""
Jobs API endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from ...models.orchestration import JobListResponse
from ...services.orchestration_service import OrchestrationService

router = APIRouter()
logger = logging.getLogger(__name__)

orchestration_service = OrchestrationService()


@router.get("/", response_model=JobListResponse)
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status: queued, running, completed, failed"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size")
):
    """
    List all jobs with pagination and filtering.

    Args:
        status: Optional status filter
        page: Page number (starting from 1)
        page_size: Number of items per page

    Returns:
        JobListResponse with paginated job list
    """
    try:
        result = orchestration_service.list_jobs(
            status=status,
            page=page,
            page_size=page_size
        )
        return JobListResponse(**result)

    except Exception as e:
        logger.error(f"Failed to list jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
async def delete_job(task_id: str):
    """
    Delete a job and its artifacts.

    Args:
        task_id: Task ID

    Returns:
        Success message
    """
    try:
        success = orchestration_service.delete_job(task_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Job {task_id} not found")

        return {"success": True, "message": f"Job {task_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_job_stats():
    """
    Get job statistics.

    Returns:
        Job statistics including counts by status, total cost, etc.
    """
    try:
        stats = orchestration_service.get_job_stats()
        return stats

    except Exception as e:
        logger.error(f"Failed to get job stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
