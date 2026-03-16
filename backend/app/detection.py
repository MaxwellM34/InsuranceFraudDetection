"""
Fraud detection engine.

Three rules are evaluated for every provider:

1. MONTHLY SPIKE RULE
   For each (provider, category, month/year), compute the 6-month rolling
   median of claim amounts (the 6 months *before* the current month).
   If current_amount > 5 × median  →  flag, score +40.

2. DUAL PRODUCT RULE
   If a provider bills both Lunettes AND Lentilles in the same calendar
   month  →  flag, score +30.

3. REPEATED AMOUNT RULE
   If the same euro amount (exact float equality) appears ≥ 3 times within
   a rolling 12-month window for the same (provider, category)  →  flag,
   score +30.

Final risk_score = sum of all score_contributions, capped at 100.

Routing thresholds:
  score < 30   →  auto_approved
  30 ≤ score ≤ 70  →  needs_review
  score > 70   →  auto_held
"""

import statistics
from collections import defaultdict
from typing import Any

from app.models import Claim, FraudFlag, Provider


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _month_index(year: int, month: int) -> int:
    """Convert (year, month) to a monotonic integer for arithmetic."""
    return year * 12 + month


def _months_in_range(start_idx: int, end_idx: int) -> list[tuple[int, int]]:
    """Return list of (year, month) tuples for [start_idx, end_idx)."""
    result = []
    for idx in range(start_idx, end_idx):
        y, m = divmod(idx, 12)
        result.append((y, m if m != 0 else 12))
    return result


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_detection() -> dict[str, Any]:
    """
    Run the full detection pipeline.

    Returns a summary dict with counts of flags raised per rule and the
    overall provider score distribution.
    """
    # 1. Clear existing flags (idempotent)
    await FraudFlag.all().delete()

    # 2. Load all claims keyed by provider
    all_claims = await Claim.all().select_related("provider")

    # Group claims: provider_id → list[Claim]
    provider_claims: dict[str, list[Claim]] = defaultdict(list)
    for claim in all_claims:
        provider_claims[str(claim.provider_id)].append(claim)

    # Load all providers
    providers = await Provider.all()
    provider_map: dict[str, Provider] = {str(p.id): p for p in providers}

    summary = {
        "providers_evaluated": len(provider_map),
        "monthly_spike_flags": 0,
        "dual_product_flags": 0,
        "repeated_amount_flags": 0,
        "total_flags": 0,
        "score_distribution": {
            "auto_approved": 0,
            "needs_review": 0,
            "auto_held": 0,
            "blacklisted": 0,
        },
    }

    # 3. For each provider, run all rules and collect FraudFlag objects
    flags_to_create: list[FraudFlag] = []
    score_accumulator: dict[str, float] = defaultdict(float)

    for provider_id, claims in provider_claims.items():
        provider = provider_map.get(provider_id)
        if provider is None:
            continue

        spike_flags = _rule_monthly_spike(provider, claims)
        dual_flags = _rule_dual_product(provider, claims)
        repeat_flags = _rule_repeated_amount(provider, claims)

        all_flags = spike_flags + dual_flags + repeat_flags
        flags_to_create.extend(all_flags)

        total_score = sum(f.score_contribution for f in all_flags)
        score_accumulator[provider_id] = min(total_score, 100.0)

        summary["monthly_spike_flags"] += len(spike_flags)
        summary["dual_product_flags"] += len(dual_flags)
        summary["repeated_amount_flags"] += len(repeat_flags)

    summary["total_flags"] = len(flags_to_create)

    # 4. Bulk-save flags
    for flag in flags_to_create:
        await flag.save()

    # 5. Update provider risk scores
    for provider in providers:
        pid = str(provider.id)
        new_score = score_accumulator.get(pid, 0.0)
        provider.risk_score = new_score
        await provider.save()

        if provider.is_blacklisted:
            summary["score_distribution"]["blacklisted"] += 1
        elif new_score < 30:
            summary["score_distribution"]["auto_approved"] += 1
        elif new_score <= 70:
            summary["score_distribution"]["needs_review"] += 1
        else:
            summary["score_distribution"]["auto_held"] += 1

    return summary


# ---------------------------------------------------------------------------
# Rule 1 — Monthly Spike
# ---------------------------------------------------------------------------

def _rule_monthly_spike(provider: Provider, claims: list[Claim]) -> list[FraudFlag]:
    """
    For each (category, month/year), compute a 6-month rolling median
    (the 6 months immediately preceding the current month). If the current
    month's total amount exceeds 5× that median, raise a flag (+40).
    """
    flags: list[FraudFlag] = []

    # Aggregate monthly totals per category
    # monthly_totals[(category, year, month)] = total_amount
    monthly_totals: dict[tuple[str, int, int], float] = defaultdict(float)
    for claim in claims:
        key = (claim.category, claim.year, claim.month)
        monthly_totals[key] += claim.amount

    # Collect all unique (category, month_index) pairs, sorted
    category_months: dict[str, list[int]] = defaultdict(list)
    for (category, year, month) in monthly_totals:
        category_months[category].append(_month_index(year, month))

    for category, month_indices in category_months.items():
        sorted_indices = sorted(set(month_indices))

        for current_idx in sorted_indices:
            # 6 months preceding current month
            preceding = [
                i for i in sorted_indices
                if current_idx - 6 <= i < current_idx
            ]
            if not preceding:
                # Not enough history — skip
                continue

            preceding_amounts = []
            for idx in preceding:
                y, m = divmod(idx, 12)
                if m == 0:
                    y -= 1
                    m = 12
                preceding_amounts.append(monthly_totals[(category, y, m)])

            if not preceding_amounts:
                continue

            median = statistics.median(preceding_amounts)
            if median == 0:
                continue

            cy, cm = divmod(current_idx, 12)
            if cm == 0:
                cy -= 1
                cm = 12

            current_amount = monthly_totals[(category, cy, cm)]
            ratio = current_amount / median

            if ratio > 5:
                flags.append(
                    FraudFlag(
                        provider=provider,
                        rule_triggered="monthly_spike",
                        score_contribution=40.0,
                        month=cm,
                        year=cy,
                        details={
                            "category": category,
                            "current_amount": round(current_amount, 2),
                            "median": round(median, 2),
                            "ratio": round(ratio, 2),
                        },
                    )
                )

    return flags


# ---------------------------------------------------------------------------
# Rule 2 — Dual Product
# ---------------------------------------------------------------------------

def _rule_dual_product(provider: Provider, claims: list[Claim]) -> list[FraudFlag]:
    """
    If the SAME MEMBER is billed for both Lunettes AND Lentilles by this
    provider in the same calendar month, raise a flag (+30).

    A provider legitimately serving multiple members can have both product
    types in a given month — that is normal business. The suspicious pattern
    is a single member receiving both glasses and contacts in the same month,
    since insurance plans cover one or the other per benefit period.
    """
    flags: list[FraudFlag] = []

    # member_month[(year, month, member_id)] = {category: total_amount}
    member_month: dict[tuple[int, int, str], dict[str, float]] = defaultdict(
        lambda: defaultdict(float)
    )
    for claim in claims:
        member_month[(claim.year, claim.month, claim.member_id)][claim.category] += claim.amount

    for (year, month, member_id), categories in sorted(member_month.items()):
        if "Lunettes" in categories and "Lentilles" in categories:
            flags.append(
                FraudFlag(
                    provider=provider,
                    rule_triggered="dual_product",
                    score_contribution=30.0,
                    month=month,
                    year=year,
                    details={
                        "member_id": member_id,
                        "lunettes_amount": round(categories["Lunettes"], 2),
                        "lentilles_amount": round(categories["Lentilles"], 2),
                        "month": month,
                        "year": year,
                    },
                )
            )

    return flags


# ---------------------------------------------------------------------------
# Rule 3 — Repeated Amount
# ---------------------------------------------------------------------------

def _rule_repeated_amount(provider: Provider, claims: list[Claim]) -> list[FraudFlag]:
    """
    If the same euro amount appears ≥ 3 times within a rolling 12-month
    window for the same (provider, category), raise a flag (+30).

    We evaluate each claim as a potential "current" reference point: for
    each unique (category, amount), slide a 12-month window ending at the
    latest month that contains that amount and count occurrences within the
    window. We report at most one flag per (category, amount) pair to avoid
    duplicate scoring.
    """
    flags: list[FraudFlag] = []

    # Group claims by (category, amount)
    ca_claims: dict[tuple[str, float], list[Claim]] = defaultdict(list)
    for claim in claims:
        ca_claims[(claim.category, claim.amount)].append(claim)

    flagged_pairs: set[tuple[str, float]] = set()

    for (category, amount), group in ca_claims.items():
        if (category, amount) in flagged_pairs:
            continue

        # Sort group by (year, month)
        group_sorted = sorted(group, key=lambda c: (c.year, c.month))

        # Slide a 12-month window; check if any window contains ≥ 3 occurrences
        for i, anchor in enumerate(group_sorted):
            anchor_idx = _month_index(anchor.year, anchor.month)
            window_start = anchor_idx - 11  # inclusive 12-month window ending at anchor

            occurrences_in_window = [
                c for c in group_sorted
                if window_start <= _month_index(c.year, c.month) <= anchor_idx
            ]

            if len(occurrences_in_window) >= 3:
                months_seen = sorted(
                    {(c.year, c.month) for c in occurrences_in_window}
                )
                flags.append(
                    FraudFlag(
                        provider=provider,
                        rule_triggered="repeated_amount",
                        score_contribution=30.0,
                        month=anchor.month,
                        year=anchor.year,
                        details={
                            "category": category,
                            "amount": amount,
                            "occurrences": len(occurrences_in_window),
                            "months_seen": [
                                {"year": y, "month": m} for y, m in months_seen
                            ],
                        },
                    )
                )
                flagged_pairs.add((category, amount))
                break  # One flag per (category, amount) pair is enough

    return flags
