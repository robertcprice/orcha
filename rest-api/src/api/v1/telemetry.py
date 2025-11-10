"""
Telemetry API endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from ...models.orchestration import TelemetryResponse
from ...services.orchestration_service import OrchestrationService

router = APIRouter()
logger = logging.getLogger(__name__)

orchestration_service = OrchestrationService()


@router.get("/tasks/{task_id}", response_model=TelemetryResponse)
async def get_task_telemetry(task_id: str):
    """
    Get telemetry data for a specific task.

    Args:
        task_id: Task ID

    Returns:
        TelemetryResponse with cost, tokens, and breakdown
    """
    try:
        telemetry = orchestration_service.get_task_telemetry(task_id)

        if not telemetry:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        return TelemetryResponse(**telemetry)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get telemetry: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_telemetry_summary(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)")
):
    """
    Get aggregate telemetry summary.

    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter

    Returns:
        Aggregate telemetry data
    """
    try:
        summary = orchestration_service.get_telemetry_summary(
            start_date=start_date,
            end_date=end_date
        )
        return summary

    except Exception as e:
        logger.error(f"Failed to get telemetry summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cost-ledger/{task_id}")
async def get_cost_ledger(
    task_id: str,
    format: str = Query("json", description="Export format: json or csv")
):
    """
    Get detailed cost ledger for a task.

    Args:
        task_id: Task ID
        format: Export format (json or csv)

    Returns:
        Cost ledger data
    """
    try:
        if format not in ["json", "csv"]:
            raise HTTPException(status_code=400, detail="Format must be 'json' or 'csv'")

        ledger = orchestration_service.get_cost_ledger(task_id, format=format)

        if not ledger:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        if format == "csv":
            from fastapi.responses import Response
            return Response(
                content=ledger,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=cost_ledger_{task_id}.csv"}
            )
        else:
            return ledger

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cost ledger: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
