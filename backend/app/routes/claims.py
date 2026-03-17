"""
Claims routes.

GET  /api/claims          — list claims, filterable by provider_id/year/month/category
POST /api/claims/import   — import claims from a CSV file
"""
import csv
import io
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import CategoryEnum, Claim, Provider

router = APIRouter(prefix="/api/claims", tags=["claims"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ClaimOut(BaseModel):
    id: str
    provider_id: str
    provider_name: str
    member_id: str
    month: int
    year: int
    category: str
    amount: float
    created_at: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ClaimOut])
async def list_claims(
    provider_id: Optional[str] = Query(None, description="Filter by provider UUID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    month: Optional[int] = Query(None, description="Filter by month (1-12)"),
    category: Optional[str] = Query(None, description="Filter by category: Lunettes or Lentilles"),
    limit: int = Query(500, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    _: dict = Depends(get_current_user),
) -> list[dict[str, Any]]:
    qs = Claim.all().select_related("provider")

    if provider_id is not None:
        try:
            uid = uuid.UUID(provider_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid provider_id UUID",
            )
        qs = qs.filter(provider_id=uid)

    if year is not None:
        qs = qs.filter(year=year)

    if month is not None:
        if not 1 <= month <= 12:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="month must be between 1 and 12",
            )
        qs = qs.filter(month=month)

    if category is not None:
        if category not in ("Lunettes", "Lentilles"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="category must be 'Lunettes' or 'Lentilles'",
            )
        qs = qs.filter(category=category)

    claims = await qs.order_by("year", "month").offset(offset).limit(limit)

    return [
        {
            "id": str(c.id),
            "provider_id": str(c.provider_id),
            "provider_name": c.provider.name,
            "member_id": c.member_id,
            "month": c.month,
            "year": c.year,
            "category": c.category,
            "amount": c.amount,
            "created_at": c.created_at.isoformat(),
        }
        for c in claims
    ]


@router.post("/import", response_model=ImportResult)
async def import_claims(
    file: UploadFile = File(...),
    _: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Import claims from a CSV file.

    Expected columns (case-insensitive headers):
        provider_name, member_id, month, year, category, amount

    Rows with unknown providers are created on-the-fly.
    Rows with validation errors are skipped and reported.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File must be a CSV (.csv extension required)",
        )

    raw_bytes = await file.read()
    try:
        content = raw_bytes.decode("utf-8-sig")  # handle BOM if present
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1")

    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CSV file is empty or has no headers",
        )

    # Normalise header names to lowercase
    fieldnames_lower = [f.strip().lower() for f in reader.fieldnames]

    # Detect original case CSV format (HEALTH_PROFESSIONAL_NAME, MONTH_NB, etc.)
    is_original_format = "health_professional_name" in fieldnames_lower

    if is_original_format:
        required_columns = {"health_professional_name", "month_nb", "year", "primary_level_1", "sum(alan_covered)"}
    else:
        required_columns = {"provider_name", "month", "year", "category", "amount"}

    missing = required_columns - set(fieldnames_lower)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV missing required columns: {', '.join(sorted(missing))}",
        )

    # Cache providers to avoid repeated DB hits
    provider_cache: dict[str, Provider] = {}

    imported = 0
    skipped = 0
    errors: list[str] = []

    for line_no, raw_row in enumerate(reader, start=2):
        # Normalise keys
        row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}

        # --- Map original format columns to standard names ---
        if is_original_format:
            row["provider_name"] = row.get("health_professional_name", "")
            row["month"] = row.get("month_nb", "")
            row["category"] = row.get("primary_level_1", "")
            # Amount uses French decimal comma format e.g. "64,3"
            raw_amount = row.get("sum(alan_covered)", "").replace(",", ".")
            row["amount"] = raw_amount
            row.setdefault("member_id", "")

        # --- Validate fields ---
        provider_name = row.get("provider_name", "").strip()
        if not provider_name:
            errors.append(f"Row {line_no}: missing provider_name")
            skipped += 1
            continue

        member_id = row.get("member_id", "").strip() or f"imported-{line_no}"

        try:
            month = int(row.get("month", ""))
            if not 1 <= month <= 12:
                raise ValueError("out of range")
        except (ValueError, TypeError):
            errors.append(f"Row {line_no}: invalid month '{row.get('month')}'")
            skipped += 1
            continue

        try:
            year = int(row.get("year", ""))
            if not 2000 <= year <= 2100:
                raise ValueError("out of range")
        except (ValueError, TypeError):
            errors.append(f"Row {line_no}: invalid year '{row.get('year')}'")
            skipped += 1
            continue

        raw_category = row.get("category", "").strip()
        if raw_category not in ("Lunettes", "Lentilles"):
            errors.append(
                f"Row {line_no}: invalid category '{raw_category}' "
                "(must be 'Lunettes' or 'Lentilles')"
            )
            skipped += 1
            continue

        try:
            amount = float(row.get("amount", ""))
            if amount < 0:
                raise ValueError("negative amount")
        except (ValueError, TypeError):
            errors.append(f"Row {line_no}: invalid amount '{row.get('amount')}'")
            skipped += 1
            continue

        # --- Resolve provider ---
        if provider_name not in provider_cache:
            provider_obj, _ = await Provider.get_or_create(name=provider_name)
            provider_cache[provider_name] = provider_obj
        provider_obj = provider_cache[provider_name]

        # --- Skip duplicates ---
        exists = await Claim.filter(
            provider=provider_obj,
            member_id=member_id,
            month=month,
            year=year,
            category=CategoryEnum(raw_category),
        ).exists()
        if exists:
            skipped += 1
            continue

        # --- Create claim ---
        await Claim.create(
            provider=provider_obj,
            member_id=member_id,
            month=month,
            year=year,
            category=CategoryEnum(raw_category),
            amount=amount,
        )
        imported += 1

    return {"imported": imported, "skipped": skipped, "errors": errors}


@router.delete("/clear", tags=["claims"])
async def clear_all_data(
    _: dict = Depends(get_current_user),
) -> dict[str, str]:
    """Delete all claims, fraud flags, review actions, and providers."""
    from app.models import FraudFlag, ReviewAction
    await ReviewAction.all().delete()
    await FraudFlag.all().delete()
    await Claim.all().delete()
    await Provider.all().delete()
    return {"message": "All data cleared"}
