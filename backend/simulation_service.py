from __future__ import annotations

from datetime import datetime, timezone
import re
from typing import List

from simulation_schemas import (
    AgentFeedback,
    SimulationLog,
    SimulationRunRequest,
    SimulationRunResponse,
)


def _num(text: str | None) -> float:
    if not text:
        return 0.0
    normalized = re.sub(r"[^0-9.]", "", str(text))
    try:
        return float(normalized) if normalized else 0.0
    except ValueError:
        return 0.0


def _clamp(value: float, min_value: int = 0, max_value: int = 100) -> int:
    return int(max(min_value, min(max_value, round(value))))


def _build_logs() -> List[SimulationLog]:
    return [
        SimulationLog(role="IDENTITY DETECTED", message="All agents on board.", status="done"),
        SimulationLog(role="MARKET ANALYST", message="Calculating market scenarios and TAM pressure.", status="done"),
        SimulationLog(role="CUSTOMER AGENT", message="Simulating user pain-point and adoption fit.", status="done"),
        SimulationLog(role="INVESTOR AGENT", message="Stress-testing economics and scalability.", status="done"),
        SimulationLog(role="BOARD CHAIR", message="Synthesizing conflicts and issuing recommendation.", status="done"),
    ]


def run_simulation(payload: SimulationRunRequest) -> SimulationRunResponse:
    urgency_bonus = {"LOW": 2, "MEDIUM": 6, "HIGH": 10, "CRITICAL": 14}[payload.problem_urgency]
    burn = _num(payload.monthly_burn)
    cash = _num(payload.current_cash_in_hand)
    cac = _num(payload.estimated_cac)

    market_viability = _clamp(
        45
        + urgency_bonus
        + (10 if payload.primary_target_segment else 0)
        + (8 if payload.market_size_estimate else 0)
        + (6 if payload.competitor_patterns else 0)
        + (5 if payload.geography else 0)
    )

    customer_demand = _clamp(
        48
        + (12 if payload.target_audience else 0)
        + (12 if payload.customer_behavior_pain_points else 0)
        + (8 if payload.elevator_pitch else 0)
        + (0 if cac <= 0 else max(0, 12 - (cac / 120)))
    )

    runway_months = (cash / burn) if burn > 0 else 0
    investor_confidence = _clamp(
        40
        + (12 if payload.marketing_strategy else 0)
        + (12 if payload.elevator_pitch else 0)
        + (0 if runway_months <= 0 else min(runway_months * 5, 24))
    )

    overall_score = _clamp((market_viability + customer_demand + investor_confidence) / 3)

    agents = [
        AgentFeedback(
            perspective="Market Analyst",
            summary=(
                f"{payload.startup_name} targets {payload.primary_target_segment} in {payload.geography}. "
                "Positioning is viable if differentiation stays evidence-led."
            ),
            risks=[
                "Competitive switching costs may be higher than expected.",
                "Market size assumptions need source-backed validation.",
            ],
            opportunities=[
                "Strong urgency signal supports faster category entry.",
                "Segment clarity can improve GTM efficiency early.",
            ],
            confidence=market_viability,
        ),
        AgentFeedback(
            perspective="Customer Agent",
            summary=(
                "Problem framing maps to real pain points, but onboarding friction and pricing sensitivity "
                "should be validated with direct user interviews."
            ),
            risks=[
                "Users may not switch from current manual workflows quickly.",
                "Perceived value must be demonstrated in first session.",
            ],
            opportunities=[
                "Pain-point specificity improves conversion potential.",
                "Clear user persona enables sharper product iteration.",
            ],
            confidence=customer_demand,
        ),
        AgentFeedback(
            perspective="Investor Agent",
            summary=(
                "Economics are potentially investable if CAC discipline and runway management are maintained. "
                "Execution quality remains the key multiplier."
            ),
            risks=[
                "Burn-to-revenue ratio may expand before PMF lock-in.",
                "Scaling too early can compress operational efficiency.",
            ],
            opportunities=[
                "If retention validates, model can compound quickly.",
                "Focused channel strategy can de-risk early growth.",
            ],
            confidence=investor_confidence,
        ),
    ]

    recommendation_pool = [
        "Run 10 customer interviews this week to validate the top pain-point assumption.",
        "Create a segment-specific competitor matrix and update positioning by next sprint.",
        "Stress-test runway with a worst-case CAC scenario before scaling spend.",
        "Prioritize one acquisition channel and track payback period weekly.",
    ]

    synthesis = (
        f"Go/No-Go Recommendation: {'GO' if overall_score >= 65 else 'HOLD'}.\n"
        f"Market ({market_viability}), Customer ({customer_demand}), and Investor ({investor_confidence}) signals "
        "show promise, but execution risk remains around validation cadence and capital efficiency."
    )

    simulation_id = f"sim-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    return SimulationRunResponse(
        simulation_id=simulation_id,
        startup_name=payload.startup_name,
        metrics={
            "marketViability": market_viability,
            "customerDemand": customer_demand,
            "investorConfidence": investor_confidence,
        },
        overall_score=overall_score,
        recommendations=recommendation_pool[:3],
        agents=agents,
        synthesis=synthesis,
        logs=_build_logs(),
    )
