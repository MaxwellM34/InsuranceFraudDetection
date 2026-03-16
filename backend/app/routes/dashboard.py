"""
Dashboard routes.

GET /api/dashboard/stats   — summary statistics (flat format for frontend)
GET /api/dashboard/alerts  — providers needing review, sorted by risk_score desc
GET /api/reviews           — recent review actions across all providers
"""
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.models import Claim, FraudFlag, Provider, ReviewAction

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/stats")
async def dashboard_stats(
    _: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Returns flat aggregate statistics for the frontend dashboard.
    Includes monthly_totals for the line chart.
    """
    providers = await Provider.all()

    total_flagged = sum(1 for p in providers if p.get_status() == "needs_review")
    total_held = sum(1 for p in providers if p.get_status() == "auto_held")
    total_providers = len(providers)

    # Claims stats + monthly totals
    all_claims = await Claim.all()
    total_amount = round(sum(c.amount for c in all_claims), 2)

    # Build monthly totals for chart: {YYYY-MM → amount}
    monthly_map: dict[str, float] = defaultdict(float)
    for c in all_claims:
        key = f"{c.year}-{c.month:02d}"
        monthly_map[key] += c.amount

    monthly_totals = [
        {"month": k, "amount": round(v, 2)}
        for k, v in sorted(monthly_map.items())
    ]

    return {
        "total_providers": total_providers,
        "total_flagged": total_flagged,
        "total_held": total_held,
        "total_claims_amount": total_amount,
        "monthly_totals": monthly_totals,
    }


@router.get("/api/reviews")
async def list_reviews(
    limit: int = Query(10, ge=1, le=100),
    _: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Recent review actions across all providers, newest first."""
    actions = (
        await ReviewAction.all()
        .select_related("provider")
        .order_by("-created_at")
        .limit(limit)
    )
    return [
        {
            "id": str(a.id),
            "provider_id": str(a.provider_id),
            "provider_name": a.provider.name,
            "action": a.action,
            "note": a.note,
            "reviewed_by": a.reviewed_by,
            "created_at": a.created_at.isoformat(),
        }
        for a in actions
    ]


@router.get("/api/dashboard/alerts")
async def dashboard_alerts(
    _: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """
    Returns providers that need attention (needs_review or auto_held),
    sorted by risk_score descending.

    Each item includes the provider's current flags for quick inspection.
    """
    providers = await Provider.all()

    alert_providers = [
        p for p in providers
        if p.get_status() in ("needs_review", "auto_held")
    ]
    alert_providers.sort(key=lambda p: p.risk_score, reverse=True)

    result = []
    for p in alert_providers:
        flags = await p.flags.all()  # type: ignore[attr-defined]
        result.append(
            {
                "id": str(p.id),
                "name": p.name,
                "risk_score": p.risk_score,
                "status": p.get_status(),
                "is_blacklisted": p.is_blacklisted,
                "created_at": p.created_at.isoformat(),
                "flag_count": len(flags),
                "flags": [
                    {
                        "id": str(f.id),
                        "rule_triggered": f.rule_triggered,
                        "score_contribution": f.score_contribution,
                        "month": f.month,
                        "year": f.year,
                        "details": f.details,
                    }
                    for f in flags
                ],
            }
        )

    return result
