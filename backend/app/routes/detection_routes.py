"""
Detection routes.

POST /api/detection/run  — trigger the fraud detection engine
"""
from typing import Any

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.detection import run_detection

router = APIRouter(prefix="/api/detection", tags=["detection"])


@router.post("/run")
async def trigger_detection(
    _: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Run the full fraud detection pipeline.

    This is idempotent: existing fraud flags are cleared before re-evaluation.
    Returns a summary of flags raised and the resulting provider score
    distribution.
    """
    summary = await run_detection()
    return {
        "status": "ok",
        "providers_updated": summary["providers_evaluated"],
        "summary": summary,
    }
