"""
Fraud detection engine.

Four rules are evaluated for every provider:

1. MONTHLY SPIKE RULE
   For each (provider, category, month/year), compute the 6-month rolling
   median of claim amounts (the 6 months *before* the current month).
   If current_amount > 5 × median  →  flag, score +20.

2. DUAL PRODUCT RULE
   If a provider bills both Lunettes AND Lentilles in the same calendar
   month  →  flag, score scales with co-billing rate (max +25).

3. REPEATED AMOUNT RULE
   If the same euro amount (exact float equality) appears ≥ 3 times within
   a rolling 12-month window for the same (provider, category)  →  flag,
   score +15.

4. ROUND NUMBER RULE
   If ≥ 70% of a provider's claims for a given category are round numbers
   (whole euros, no cents) across ≥ 3 claims, flag it.
   Real optical purchases have irregular amounts (e.g. 349.91€).
   Systematic whole-euro billing suggests fabricated charges.
   Score: +15.

Final risk_score = sum of all score_contributions, capped at 100.

Routing thresholds:
  score = 0    →  auto_approved
  0 < score ≤ 70  →  needs_review
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
        "round_number_flags": 0,
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
        round_flags = _rule_round_number(provider, claims)

        all_flags = spike_flags + dual_flags + repeat_flags + round_flags
        flags_to_create.extend(all_flags)

        total_score = sum(f.score_contribution for f in all_flags)
        score_accumulator[provider_id] = min(total_score, 100.0)

        summary["monthly_spike_flags"] += len(spike_flags)
        summary["dual_product_flags"] += len(dual_flags)
        summary["repeated_amount_flags"] += len(repeat_flags)
        summary["round_number_flags"] += len(round_flags)

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
        elif new_score == 0:
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
                        score_contribution=20.0,
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
    Detect providers who SYSTEMATICALLY bill both Lunettes AND Lentilles in
    the same calendar month.

    The intended fraud pattern: an optician adds fictitious contact-lens charges
    alongside a glasses sale to reduce the patient's "reste à charge" — the
    insurance absorbs the extra amount while the patient pays less out-of-pocket.

    The ideal check is whether the SAME MEMBER is billed for both products in
    the same month. However the source data is monthly aggregate totals per
    provider — individual member IDs are unavailable — so we detect the scheme
    at the provider level instead.

    A legitimate optician who happens to serve both glasses and contacts
    customers in the same month will have occasional dual-category months but
    not systematically. A provider committing this fraud at scale will show both
    categories together in the vast majority of their active months.

    We therefore only flag months where both categories appear IF the provider's
    dual-billing rate is ≥ 50 % of their active months. Below that threshold,
    the co-occurrence is likely coincidental.

    Score: +30 per qualifying dual-billing month.
    """
    flags: list[FraudFlag] = []

    # month_categories[(year, month)] = {category: total_amount}
    month_categories: dict[tuple[int, int], dict[str, float]] = defaultdict(
        lambda: defaultdict(float)
    )
    for claim in claims:
        month_categories[(claim.year, claim.month)][claim.category] += claim.amount

    active_months = len(month_categories)
    if active_months == 0:
        return flags

    dual_months = [
        (year, month, cats)
        for (year, month), cats in sorted(month_categories.items())
        if "Lunettes" in cats and "Lentilles" in cats
        and cats["Lunettes"] > 0 and cats["Lentilles"] > 0
    ]

    dual_ratio = len(dual_months) / active_months

    # Only flag if co-billing is systematic, not occasional
    if dual_ratio < 0.5:
        return flags

    # One summary flag for the whole pattern.
    # Score scales with how systematic the co-billing is (50 % → 12 pts, 100 % → 25 pts).
    score = min(25, round(dual_ratio * 25))

    # Anchor the flag's period to the most recent qualifying month.
    last_year, last_month, _ = dual_months[-1]

    flags.append(
        FraudFlag(
            provider=provider,
            rule_triggered="dual_product",
            score_contribution=float(score),
            month=last_month,
            year=last_year,
            details={
                "dual_ratio": round(dual_ratio, 2),
                "dual_count": len(dual_months),
                "active_months": active_months,
                "months": [
                    {
                        "year": y,
                        "month": m,
                        "lunettes": round(cats["Lunettes"], 2),
                        "lentilles": round(cats["Lentilles"], 2),
                    }
                    for y, m, cats in dual_months
                ],
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
        if amount == 0:
            continue  # Zero-amount claims are billing artifacts, not a fraud signal
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
                        score_contribution=15.0,
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


# ---------------------------------------------------------------------------
# Rule 4 — Round Number Billing
# ---------------------------------------------------------------------------

def _rule_round_number(provider: Provider, claims: list[Claim]) -> list[FraudFlag]:
    """
    Detect providers who systematically bill round numbers for a category.

    A "round number" is an amount that is a whole number of euros (no cents)
    — e.g. 200.00, 633.00, 2326.00.
    Real optical purchases have irregular amounts (e.g. 349.91€, 127.50€).

    If ≥ 70% of a provider's claims for a given category are round numbers,
    AND there are at least 3 such claims, raise a flag (+25).

    One flag per category that meets the threshold.
    """
    flags: list[FraudFlag] = []

    # Group by category
    by_category: dict[str, list[Claim]] = defaultdict(list)
    for claim in claims:
        by_category[claim.category].append(claim)

    for category, cat_claims in by_category.items():
        if len(cat_claims) < 3:
            continue

        round_claims = [
            c for c in cat_claims
            if c.amount > 0 and c.amount % 1 == 0
        ]
        round_rate = len(round_claims) / len(cat_claims)

        if round_rate < 0.70:
            continue

        # Anchor to the most recent claim
        latest = max(cat_claims, key=lambda c: (c.year, c.month))

        flags.append(
            FraudFlag(
                provider=provider,
                rule_triggered="round_number",
                score_contribution=15.0,
                month=latest.month,
                year=latest.year,
                details={
                    "category": category,
                    "round_count": len(round_claims),
                    "total_count": len(cat_claims),
                    "round_rate": round(round_rate, 2),
                    "round_amounts": sorted(
                        {c.amount for c in round_claims}
                    ),
                    "months_seen": [
                        {"year": c.year, "month": c.month, "amount": c.amount}
                        for c in sorted(round_claims, key=lambda c: (c.year, c.month))
                    ],
                },
            )
        )

    return flags
