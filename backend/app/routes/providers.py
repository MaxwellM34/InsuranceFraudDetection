"""
Provider routes.

GET  /api/providers          — list all providers with risk_score and status
GET  /api/providers/{id}     — single provider detail + claims + flags
POST /api/providers/{id}/review — submit a review action
"""
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import ActionEnum, Claim, FraudFlag, Provider, ReviewAction

router = APIRouter(prefix="/api/providers", tags=["providers"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ProviderListItem(BaseModel):
    id: str
    name: str
    risk_score: float
    status: str
    is_blacklisted: bool
    created_at: str

    model_config = {"from_attributes": True}


class ClaimOut(BaseModel):
    id: str
    member_id: str
    month: int
    year: int
    category: str
    amount: float
    created_at: str


class FraudFlagOut(BaseModel):
    id: str
    rule_triggered: str
    score_contribution: float
    month: int
    year: int
    details: dict[str, Any]
    created_at: str


class ReviewActionOut(BaseModel):
    id: str
    action: str
    note: str
    reviewed_by: str
    created_at: str


class ProviderDetail(BaseModel):
    id: str
    name: str
    risk_score: float
    status: str
    is_blacklisted: bool
    created_at: str
    claims: list[ClaimOut]
    flags: list[FraudFlagOut]
    review_actions: list[ReviewActionOut]


class ReviewRequest(BaseModel):
    action: ActionEnum
    note: Optional[str] = ""
    reviewed_by: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _provider_status(provider: Provider) -> str:
    return provider.get_status()


def _fmt_provider(p: Provider) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "name": p.name,
        "risk_score": p.risk_score,
        "status": _provider_status(p),
        "is_blacklisted": p.is_blacklisted,
        "created_at": p.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ProviderListItem])
async def list_providers(
    _: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    providers = await Provider.all().order_by("-risk_score")
    return [_fmt_provider(p) for p in providers]


@router.get("/{provider_id}", response_model=ProviderDetail)
async def get_provider(
    provider_id: str,
    _: dict = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        uid = uuid.UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid UUID")

    provider = await Provider.get_or_none(id=uid)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    claims = await Claim.filter(provider=provider).order_by("year", "month")
    flags = await FraudFlag.filter(provider=provider).order_by("-created_at")
    actions = await ReviewAction.filter(provider=provider).order_by("-created_at")

    def _fmt_claim(c: Claim) -> dict[str, Any]:
        return {
            "id": str(c.id),
            "member_id": c.member_id,
            "month": c.month,
            "year": c.year,
            "category": c.category,
            "amount": c.amount,
            "created_at": c.created_at.isoformat(),
        }

    def _fmt_flag(f: FraudFlag) -> dict[str, Any]:
        return {
            "id": str(f.id),
            "rule_triggered": f.rule_triggered,
            "score_contribution": f.score_contribution,
            "month": f.month,
            "year": f.year,
            "details": f.details,
            "created_at": f.created_at.isoformat(),
        }

    def _fmt_action(a: ReviewAction) -> dict[str, Any]:
        return {
            "id": str(a.id),
            "action": a.action,
            "note": a.note,
            "reviewed_by": a.reviewed_by,
            "created_at": a.created_at.isoformat(),
        }

    return {
        **_fmt_provider(provider),
        "claims": [_fmt_claim(c) for c in claims],
        "flags": [_fmt_flag(f) for f in flags],
        "review_actions": [_fmt_action(a) for a in actions],
    }


@router.post("/{provider_id}/review", response_model=ReviewActionOut)
async def submit_review(
    provider_id: str,
    body: ReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        uid = uuid.UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid UUID")

    provider = await Provider.get_or_none(id=uid)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    # If the action is "blacklisted", update the provider flag
    if body.action == ActionEnum.blacklisted:
        provider.is_blacklisted = True
        await provider.save()
    elif body.action == ActionEnum.approved:
        # Approving a blacklisted provider lifts the blacklist
        if provider.is_blacklisted:
            provider.is_blacklisted = False
            await provider.save()

    reviewed_by = body.reviewed_by or current_user.get("user_id", "unknown")
    action = await ReviewAction.create(
        provider=provider,
        action=body.action,
        note=body.note or "",
        reviewed_by=reviewed_by,
    )

    return {
        "id": str(action.id),
        "action": action.action,
        "note": action.note,
        "reviewed_by": action.reviewed_by,
        "created_at": action.created_at.isoformat(),
    }
