from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, TypedDict

import openai

from .schemas import (
    AgentFeedback,
    SimulationLog,
    SimulationIntakeTurnResponse,
    SimulationRunRequest,
    SimulationRunResponse,
)


logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

try:
    from langgraph.graph import END, START, StateGraph
except Exception:
    END = START = StateGraph = None


class BoardState(TypedDict, total=False):
    startup_name: str
    strategy: str
    assumption_profile: Dict[str, Any]
    deterministic_signals: Dict[str, Any]
    retrieved_context: Dict[str, str]
    market_analyst_feedback: Dict[str, Any]
    customer_feedback: Dict[str, Any]
    investor_feedback: Dict[str, Any]
    board_chair_feedback: Dict[str, Any]


INTAKE_FIELDS = [
    "startupName",
    "elevatorPitch",
    "problemStatement",
    "targetAudience",
    "problemUrgency",
    "primaryTargetSegment",
    "geography",
    "marketSizeEstimate",
    "customerBehaviorPainPoints",
    "competitorPatterns",
    "monthlyBurn",
    "estimatedCac",
    "currentCashInHand",
    "marketingStrategy",
]





def _num(text: str | None) -> float:
    if not text:
        return 0.0
    raw = str(text).strip().lower().replace(",", "")
    multiplier = 1.0
    if re.search(r"\b(b|bn|billion)\b", raw) or raw.endswith("b"):
        multiplier = 1_000_000_000.0
    elif re.search(r"\b(m|mm|million)\b", raw) or raw.endswith("m"):
        multiplier = 1_000_000.0
    elif re.search(r"\b(k|thousand)\b", raw) or raw.endswith("k"):
        multiplier = 1_000.0
    normalized = re.sub(r"[^0-9.]", "", raw)
    try:
        return float(normalized) * multiplier if normalized else 0.0
    except ValueError:
        return 0.0


def _clamp_score(value: float | int | None, default: int = 0) -> int:
    try:
        numeric = float(value if value is not None else default)
    except (TypeError, ValueError):
        numeric = float(default)
    return int(max(0, min(100, round(numeric))))


def _text_quality(value: str | None, *, weak: int = 24, strong: int = 140) -> int:
    length = len(str(value or "").strip())
    if length <= 0:
        return 0
    if length <= weak:
        return 35
    if length >= strong:
        return 90
    return _clamp_score(35 + ((length - weak) / max(1, strong - weak)) * 55)


def _new_log(
    logs: List[SimulationLog],
    role: str,
    message: str,
    *,
    phase: str,
    status: str = "done",
    metadata: Dict[str, Any] | None = None,
) -> None:
    logs.append(
        SimulationLog(
            role=role,
            message=message,
            status=status,
            phase=phase,
            sequence=len(logs) + 1,
            metadata={
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **(metadata or {}),
            },
        )
    )


def _assumption_register(payload: SimulationRunRequest) -> List[Dict[str, Any]]:
    items = [
        ("Problem", "Pain being solved", payload.problem_statement, True),
        ("Customer", "Target audience", payload.target_audience, True),
        ("Customer", "Primary target segment", payload.primary_target_segment, True),
        ("Market", "Geography", payload.geography, True),
        ("Market", "Market size estimate", payload.market_size_estimate, False),
        ("Customer", "Behavior and pain points", payload.customer_behavior_pain_points, True),
        ("Competition", "Competitor patterns", payload.competitor_patterns, False),
        ("Growth", "Marketing strategy", payload.marketing_strategy, False),
        ("Finance", "Monthly burn", payload.monthly_burn, False),
        ("Finance", "Estimated CAC", payload.estimated_cac, False),
        ("Finance", "Current cash in hand", payload.current_cash_in_hand, False),
    ]
    register = []
    for category, name, value, required in items:
        text = str(value or "").strip()
        quality = _text_quality(text, weak=18, strong=120)
        register.append(
            {
                "category": category,
                "name": name,
                "value": text,
                "provided": bool(text),
                "required": required,
                "quality": quality,
                "risk": "high" if required and quality < 45 else "medium" if quality < 45 else "low",
            }
        )
    return register


def _assumption_profile(register: List[Dict[str, Any]]) -> Dict[str, Any]:
    required = [item for item in register if item.get("required")]
    provided_required = [item for item in required if item.get("provided")]
    missing_required = [item["name"] for item in required if not item.get("provided")]
    quality_scores = [int(item.get("quality") or 0) for item in register if item.get("provided")]
    completeness = int(round((len(provided_required) / max(1, len(required))) * 100))
    evidence_readiness = int(round(sum(quality_scores) / max(1, len(quality_scores)))) if quality_scores else 0
    return {
        "completeness": completeness,
        "evidence_readiness": evidence_readiness,
        "missing_required": missing_required,
        "weak_assumptions": [
            item["name"]
            for item in register
            if item.get("provided") and int(item.get("quality") or 0) < 45
        ],
    }


def _deterministic_signals(payload: SimulationRunRequest, assumption_profile: Dict[str, Any]) -> Dict[str, Any]:
    urgency_scores = {"LOW": 35, "MEDIUM": 55, "HIGH": 75, "CRITICAL": 90}
    burn = _num(payload.monthly_burn)
    cash = _num(payload.current_cash_in_hand)
    cac = _num(payload.estimated_cac)
    runway_months = round(cash / burn, 1) if burn > 0 and cash > 0 else None
    runway_score = 45
    if runway_months is not None:
        runway_score = _clamp_score(min(100, runway_months * 8))
    finance_clarity = _clamp_score(
        (35 if burn > 0 else 0)
        + (35 if cash > 0 else 0)
        + (20 if cac > 0 else 0)
        + (10 if runway_months is not None else 0)
    )
    segment_specificity = _clamp_score(
        (_text_quality(payload.primary_target_segment, weak=12, strong=80) * 0.45)
        + (_text_quality(payload.target_audience, weak=12, strong=100) * 0.35)
        + (20 if payload.geography and payload.geography.strip().lower() not in {"global", "worldwide"} else 5)
    )
    market_clarity = _clamp_score(
        segment_specificity * 0.45
        + _text_quality(payload.market_size_estimate, weak=8, strong=40) * 0.2
        + _text_quality(payload.competitor_patterns, weak=20, strong=140) * 0.2
        + urgency_scores.get(payload.problem_urgency, 55) * 0.15
    )
    customer_pain = _clamp_score(
        _text_quality(payload.problem_statement, weak=35, strong=180) * 0.35
        + _text_quality(payload.customer_behavior_pain_points, weak=35, strong=180) * 0.45
        + urgency_scores.get(payload.problem_urgency, 55) * 0.2
    )
    return {
        "assumption_completeness": assumption_profile["completeness"],
        "evidence_readiness": assumption_profile["evidence_readiness"],
        "market_clarity": market_clarity,
        "segment_specificity": segment_specificity,
        "customer_pain_signal": customer_pain,
        "finance_clarity": finance_clarity,
        "runway_months": runway_months,
        "runway_score": runway_score,
        "cac_provided": cac > 0,
        "burn_provided": burn > 0,
        "cash_provided": cash > 0,
    }


def _uncertainty_profile(
    assumption_profile: Dict[str, Any],
    deterministic_signals: Dict[str, Any],
    context_counts: Dict[str, int],
) -> Dict[str, Any]:
    penalties = 0
    if assumption_profile["completeness"] < 80:
        penalties += 25
    if assumption_profile["evidence_readiness"] < 55:
        penalties += 20
    if deterministic_signals.get("finance_clarity", 0) < 50:
        penalties += 15
    if sum(context_counts.values()) == 0:
        penalties += 20
    confidence = _clamp_score(100 - penalties)
    if confidence >= 75:
        label = "moderate"
    elif confidence >= 55:
        label = "elevated"
    else:
        label = "high"
    drivers = [
        *[f"Missing required assumption: {item}" for item in assumption_profile["missing_required"]],
        *[f"Weak assumption detail: {item}" for item in assumption_profile["weak_assumptions"][:3]],
        "No retrieved evidence was available." if sum(context_counts.values()) == 0 else "",
        "Financial model inputs are incomplete." if deterministic_signals.get("finance_clarity", 0) < 50 else "",
    ]
    return {
        "assessment_confidence": confidence,
        "uncertainty_level": label,
        "drivers": [driver for driver in drivers if driver],
    }



def _build_logs(
    market_confidence: int | None = None,
    customer_confidence: int | None = None,
    investor_confidence: int | None = None,
) -> List[SimulationLog]:
    return [
        SimulationLog(role="IDENTITY DETECTED", message="Board session initialized.", status="done"),
        SimulationLog(role="MARKET ANALYST", message="Retrieved market context and TAM signals.", status="done"),
        SimulationLog(
            role="MARKET ANALYST",
            message=f"Market confidence scored at {market_confidence if market_confidence is not None else '--'}/100.",
            status="done",
        ),
        SimulationLog(role="CUSTOMER AGENT", message="Assessed customer pain, behavior, and adoption risks.", status="done"),
        SimulationLog(
            role="CUSTOMER AGENT",
            message=f"Customer confidence scored at {customer_confidence if customer_confidence is not None else '--'}/100.",
            status="done",
        ),
        SimulationLog(role="INVESTOR AGENT", message="Stress-tested economics, CAC, and scale risks.", status="done"),
        SimulationLog(
            role="INVESTOR AGENT",
            message=f"Investor confidence scored at {investor_confidence if investor_confidence is not None else '--'}/100.",
            status="done",
        ),
        SimulationLog(role="BOARD CHAIR", message="Merged advisor outputs and conflict points.", status="done"),
        SimulationLog(role="BOARD CHAIR", message="Issued final recommendation and next steps.", status="done"),
    ]


def _build_strategy(payload: SimulationRunRequest) -> str:
    return "\n".join(
        [
            f"Startup: {payload.startup_name}",
            f"Elevator Pitch: {payload.elevator_pitch or 'N/A'}",
            f"Problem Statement: {payload.problem_statement}",
            f"Target Audience: {payload.target_audience}",
            f"Urgency: {payload.problem_urgency}",
            f"Primary Segment: {payload.primary_target_segment}",
            f"Geography: {payload.geography}",
            f"Market Size Estimate: {payload.market_size_estimate or 'N/A'}",
            f"Pain Points: {payload.customer_behavior_pain_points}",
            f"Competitor Patterns: {payload.competitor_patterns or 'N/A'}",
            f"Marketing Strategy: {payload.marketing_strategy or 'N/A'}",
            f"Monthly Burn: {payload.monthly_burn or 'N/A'}",
            f"Estimated CAC: {payload.estimated_cac or 'N/A'}",
            f"Current Cash: {payload.current_cash_in_hand or 'N/A'}",
        ]
    )


def _is_blank(value: Any) -> bool:
    return not str(value or "").strip()


def _normalize_intake_draft(draft: Dict[str, Any] | None) -> Dict[str, Any]:
    if not draft:
        return {key: "" for key in INTAKE_FIELDS}

    normalized = {}
    for key in INTAKE_FIELDS:
        value = draft.get(key, "")
        normalized[key] = str(value).strip() if value is not None else ""

    return normalized


def _merge_updates(draft: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    merged = {**draft}
    for key in INTAKE_FIELDS:
        value = updates.get(key)
        if value is None:
            continue
        value_str = str(value).strip()
        if value_str:
            merged[key] = value_str
    return merged


def _extract_intake_updates(
    draft: Dict[str, Any],
    user_message: str,
    history: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    history = history or []
    empty_updates = {"updates": {}}

    if not user_message.strip():
        return empty_updates["updates"]

    if client is None:
        return {}

    system_prompt = (
        "Extract startup information from the user's message. "
        "Return JSON with an 'updates' object containing any fields you can identify: "
        "startupName, elevatorPitch, problemStatement, targetAudience, problemUrgency, "
        "primaryTargetSegment, geography, marketSizeEstimate, customerBehaviorPainPoints, competitorPatterns, "
        "monthlyBurn, estimatedCac, currentCashInHand, marketingStrategy. "
        "Include what you find naturally from the conversation."
    )
    user_prompt = (
        f"Current draft:\n{json.dumps(draft, ensure_ascii=True)}\n\n"
        f"Recent conversation:\n{json.dumps(history[-8:], ensure_ascii=True)}\n\n"
        f"Latest user message:\n{user_message}\n\n"
        "Extract updates now."
    )
    try:
        result = _invoke_json(system_prompt, user_prompt)
        updates = result.get("updates", {}) if isinstance(result, dict) else {}
        return updates if isinstance(updates, dict) else {}
    except Exception as exc:
        logger.warning("Intake extraction failed. error=%s", exc)
        return {}








def _classify_intake_intent(user_message: str) -> str:
    text = user_message.strip().lower()
    if not text:
        return "EMPTY"

    # Simple keyword-based classification
    social_keywords = ["hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "cool", "great"]
    if any(text == keyword or text.startswith(f"{keyword} ") for keyword in social_keywords):
        return "SOCIAL"

    offtopic_keywords = ["health", "medical", "doctor", "sick", "feeling", "personal"]
    if any(keyword in text for keyword in offtopic_keywords):
        return "OFFTOPIC_PERSONAL"

    return "STARTUP"


def _classify_run_decision(user_message: str) -> str:
    text = user_message.strip().lower()
    if not text:
        return "UNKNOWN"

    # Keywords indicating user wants to run
    run_keywords = ["run", "start", "go", "simulate", "execute", "ready", "let's go", "do it"]
    if any(keyword in text for keyword in run_keywords):
        if not any(neg in text for neg in ["don't", "not", "wait", "hold"]):
            return "CONFIRM_RUN"

    # Keywords indicating user wants to add more
    add_keywords = ["add", "more", "also", "another", "plus", "additionally", "wait"]
    if any(keyword in text for keyword in add_keywords):
        return "ADD_MORE"

    return "UNKNOWN"






def run_intake_turn(
    draft: Dict[str, Any] | None,
    user_message: str = "",
    history: List[Dict[str, str]] | None = None,
) -> SimulationIntakeTurnResponse:
    normalized = _normalize_intake_draft(draft)
    updates = _extract_intake_updates(normalized, user_message, history)
    merged = _merge_updates(normalized, updates)

    intent = _classify_intake_intent(user_message)
    run_decision = _classify_run_decision(user_message) if user_message.strip() else "UNKNOWN"

    # Calculate completion based on filled fields
    filled_count = sum(1 for field in INTAKE_FIELDS if not _is_blank(merged.get(field)))
    completion = int(round((filled_count / len(INTAKE_FIELDS)) * 100))

    # Determine readiness - user explicitly wants to run
    ready = run_decision == "CONFIRM_RUN"

    # Generate response message
    if not user_message.strip():
        assistant_message = "Hi. Share your startup idea and I'll help you simulate it."
    elif intent == "OFFTOPIC_PERSONAL":
        assistant_message = "I'm here for startup simulation. Let me know when you'd like to continue."
    elif intent == "SOCIAL":
        assistant_message = "Hey. Share your startup idea whenever you're ready."
    elif ready:
        assistant_message = "Running simulation now with the context you've provided."
    elif run_decision == "ADD_MORE":
        assistant_message = "Sure, add whatever else you'd like me to consider."
    elif intent == "STARTUP":
        assistant_message = "Got it. Want to run the simulation now, or add more context first?"
    else:
        assistant_message = "Share more about your startup, or tell me when you're ready to run."

    return SimulationIntakeTurnResponse(
        assistant_message=assistant_message,
        collected_fields=merged,
        missing_fields=[],
        ready_to_run=ready,
        completion_percent=completion,
    )


def _tool_context(query: str, top_k: int = 4) -> str:
    try:
        from tools import build_context, rerank_with_mmr, retrieve_docs
    except Exception as exc:
        logger.warning("Tool context helpers unavailable. error=%s", exc)
        return ""
    try:
        docs = retrieve_docs(query, top_k=max(top_k, 5))
        if not docs:
            return ""
        ranked = rerank_with_mmr(query, docs, top_k=top_k)
        return build_context(ranked)
    except Exception as exc:
        logger.warning("Tool context retrieval failed. error=%s", exc)
        return ""


def _context_with_count(query: str, top_k: int = 4) -> tuple[str, int]:
    context = _tool_context(query, top_k=top_k)
    if not context:
        return "", 0
    return context, len(re.findall(r"^\[\d+\.", context, flags=re.MULTILINE)) or 1


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\\s*", "", cleaned)
        cleaned = re.sub(r"\\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_json_or_default(raw: str, default: Dict[str, Any]) -> Dict[str, Any]:
    try:
        loaded = json.loads(_strip_code_fences(raw))
        return loaded if isinstance(loaded, dict) else default
    except Exception:
        return default




def _invoke_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    if client is None:
        raise RuntimeError("OpenAI client not initialized. Check OPENAI_API_KEY.")

    response = client.chat.completions.create(
        model=os.getenv("SIMULATION_MODEL", "gpt-4o-mini"),
        temperature=0.2,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    raw = (response.choices[0].message.content or "").strip()
    parsed = json.loads(_strip_code_fences(raw)) if raw else {}
    return parsed if isinstance(parsed, dict) else {}


def market_analyst_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    market_context = state.get("retrieved_context", {}).get("market", "")
    system_prompt = (
        "You are a rigorous Market Analyst for an early-stage startup simulation. "
        "Do not grade optimism; grade market believability. Test segment narrowness, urgency, "
        "TAM realism, competitive pressure, and reachable wedge quality. "
        "Return JSON with: summary, risks (array), opportunities (array), pressure_points (array), "
        "evidence_notes (array), rubric_scores (object with segment, urgency, competition, market_size), "
        "confidence_rationale (string), confidence (0-100)."
    )
    user_prompt = (
        "Pressure-test this strategy on market quality.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Deterministic signals:\n{json.dumps(state.get('deterministic_signals', {}), ensure_ascii=True)}\n\n"
        f"Assumption profile:\n{json.dumps(state.get('assumption_profile', {}), ensure_ascii=True)}\n\n"
        f"Retrieved context (may be empty):\n{market_context or 'No context retrieved.'}"
    )
    return {
        "market_analyst_feedback": _invoke_json(system_prompt, user_prompt)
    }


def customer_agent_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    customer_context = state.get("retrieved_context", {}).get("customer", "")
    system_prompt = (
        "You are a Target Customer simulation agent. Think like the buyer/user, not the founder. "
        "Evaluate job-to-be-done pain, current workaround inertia, adoption friction, time-to-value, "
        "and willingness to pay. "
        "Return JSON with: summary, risks (array), opportunities (array), pressure_points (array), "
        "evidence_notes (array), rubric_scores (object with pain, urgency, adoption, willingness_to_pay), "
        "confidence_rationale (string), confidence (0-100)."
    )
    user_prompt = (
        "Pressure-test this strategy from the customer point of view.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Deterministic signals:\n{json.dumps(state.get('deterministic_signals', {}), ensure_ascii=True)}\n\n"
        f"Assumption profile:\n{json.dumps(state.get('assumption_profile', {}), ensure_ascii=True)}\n\n"
        f"Retrieved context (may be empty):\n{customer_context or 'No context retrieved.'}"
    )
    return {
        "customer_feedback": _invoke_json(system_prompt, user_prompt)
    }


def investor_agent_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    investor_context = state.get("retrieved_context", {}).get("investor", "")
    system_prompt = (
        "You are an Investment Evaluation agent for a startup simulation. "
        "Evaluate capital efficiency, runway, CAC clarity, scalability, defensibility, and funding readiness. "
        "Penalize missing or vague financial assumptions. "
        "Return JSON with: summary, risks (array), opportunities (array), pressure_points (array), "
        "evidence_notes (array), rubric_scores (object with capital_efficiency, runway, scalability, defensibility), "
        "confidence_rationale (string), confidence (0-100)."
    )
    user_prompt = (
        "Pressure-test this strategy as an investor.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Deterministic signals:\n{json.dumps(state.get('deterministic_signals', {}), ensure_ascii=True)}\n\n"
        f"Assumption profile:\n{json.dumps(state.get('assumption_profile', {}), ensure_ascii=True)}\n\n"
        f"Retrieved context (may be empty):\n{investor_context or 'No context retrieved.'}"
    )
    return {
        "investor_feedback": _invoke_json(system_prompt, user_prompt)
    }


def board_chair_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    system_prompt = (
        "You are the Board Chair for a startup simulation. "
        "Reconcile contradictions between advisors and deterministic signals. "
        "Do not overclaim precision. Separate viability from evidence confidence. "
        "Return JSON with: go_no_go (GO, GO-WITH-CAVEATS, PIVOT, or NO-GO), synthesis (string), "
        "red_flags (array), upside (array), contradictions (array), next_steps (array)."
    )
    user_prompt = (
        f"Original Strategy:\n{state['strategy']}\n\n"
        f"Deterministic signals:\n{json.dumps(state.get('deterministic_signals', {}), ensure_ascii=True)}\n\n"
        f"Assumption profile:\n{json.dumps(state.get('assumption_profile', {}), ensure_ascii=True)}\n\n"
        f"Market Analyst Feedback:\n{json.dumps(state.get('market_analyst_feedback', {}), ensure_ascii=True)}\n\n"
        f"Customer Feedback:\n{json.dumps(state.get('customer_feedback', {}), ensure_ascii=True)}\n\n"
        f"Investor Feedback:\n{json.dumps(state.get('investor_feedback', {}), ensure_ascii=True)}"
    )

    return {"board_chair_feedback": _invoke_json(system_prompt, user_prompt)}


def _build_graph():
    if StateGraph is None:
        return None

    builder = StateGraph(BoardState)
    builder.add_node("Market_Analyst", market_analyst_node)
    builder.add_node("Customer", customer_agent_node)
    builder.add_node("Investor", investor_agent_node)
    builder.add_node("Board_Chair", board_chair_node)

    builder.add_edge(START, "Market_Analyst")
    builder.add_edge(START, "Customer")
    builder.add_edge(START, "Investor")
    builder.add_edge("Market_Analyst", "Board_Chair")
    builder.add_edge("Customer", "Board_Chair")
    builder.add_edge("Investor", "Board_Chair")
    builder.add_edge("Board_Chair", END)

    return builder.compile()


virtual_board = _build_graph()


def _normalize_feedback(data: Dict[str, Any], perspective: str) -> AgentFeedback:
    if not isinstance(data, dict):
        raise ValueError(f"{perspective} returned invalid feedback.")
    summary = str(data.get("summary") or "").strip()
    if not summary:
        raise ValueError(f"{perspective} did not return a summary.")
    if data.get("confidence") is None:
        raise ValueError(f"{perspective} did not return a confidence score.")

    risks = data.get("risks") if isinstance(data.get("risks"), list) else []
    opportunities = data.get("opportunities") if isinstance(data.get("opportunities"), list) else []
    pressure_points = data.get("pressure_points") if isinstance(data.get("pressure_points"), list) else []
    evidence_notes = data.get("evidence_notes") if isinstance(data.get("evidence_notes"), list) else []
    rubric_scores_raw = data.get("rubric_scores") if isinstance(data.get("rubric_scores"), dict) else {}

    confidence = _clamp_score(data.get("confidence"))

    return AgentFeedback(
        perspective=perspective,
        summary=summary,
        risks=[str(item) for item in risks if str(item).strip()],
        opportunities=[str(item) for item in opportunities if str(item).strip()],
        confidence=confidence,
        pressure_points=[str(item) for item in pressure_points if str(item).strip()],
        evidence_notes=[str(item) for item in evidence_notes if str(item).strip()],
        rubric_scores={str(key): _clamp_score(value) for key, value in rubric_scores_raw.items()},
        confidence_rationale=str(data.get("confidence_rationale") or ""),
    )




def run_simulation(payload: SimulationRunRequest) -> SimulationRunResponse:
    logs: List[SimulationLog] = []
    _new_log(
        logs,
        "SIMULATION ROOM",
        "Board session opened. Normalizing founder brief into testable assumptions.",
        phase="briefing",
    )
    strategy = _build_strategy(payload)
    assumptions = _assumption_register(payload)
    assumption_profile = _assumption_profile(assumptions)
    deterministic_signals = _deterministic_signals(payload, assumption_profile)
    _new_log(
        logs,
        "ASSUMPTION ENGINE",
        (
            f"Assumption completeness is {assumption_profile['completeness']}/100; "
            f"evidence readiness is {assumption_profile['evidence_readiness']}/100."
        ),
        phase="assumption_check",
        metadata={
            "missing_required": assumption_profile["missing_required"],
            "weak_assumptions": assumption_profile["weak_assumptions"],
        },
    )
    _new_log(
        logs,
        "MODEL ENGINE",
        (
            "Computed baseline signals for market clarity, customer pain, finance clarity, "
            "and runway before asking advisors to judge the idea."
        ),
        phase="deterministic_model",
        metadata=deterministic_signals,
    )

    context_counts: Dict[str, int] = {}
    retrieved_context: Dict[str, str] = {}

    _new_log(
        logs,
        "MARKET ANALYST",
        "Scanning for market benchmarks, competitive patterns, and segment evidence.",
        phase="context_scan",
        status="running",
    )
    retrieved_context["market"], context_counts["market"] = _context_with_count(
        f"{strategy}\n\nFind TAM benchmarks, market trends, and competitor positioning signals."
    )
    _new_log(
        logs,
        "MARKET ANALYST",
        (
            f"Retrieved {context_counts['market']} market evidence item(s). "
            "Testing whether the target segment is narrow enough to support a credible wedge."
        ),
        phase="context_scan",
        metadata={"retrieved_items": context_counts["market"]},
    )

    _new_log(
        logs,
        "CUSTOMER AGENT",
        "Looking for buyer pain, current workarounds, adoption friction, and willingness-to-pay clues.",
        phase="context_scan",
        status="running",
    )
    retrieved_context["customer"], context_counts["customer"] = _context_with_count(
        f"{strategy}\n\nFind customer behavior insights, adoption friction, and willingness-to-pay clues."
    )
    _new_log(
        logs,
        "CUSTOMER AGENT",
        (
            f"Retrieved {context_counts['customer']} customer evidence item(s). "
            "Simulating the buyer's resistance to switching from the current workaround."
        ),
        phase="context_scan",
        metadata={"retrieved_items": context_counts["customer"]},
    )

    _new_log(
        logs,
        "INVESTOR AGENT",
        "Checking capital efficiency, unit economics clarity, runway, and funding-readiness signals.",
        phase="context_scan",
        status="running",
    )
    retrieved_context["investor"], context_counts["investor"] = _context_with_count(
        f"{strategy}\n\nFind unit economics norms, funding signals, and scale risks for this domain."
    )
    _new_log(
        logs,
        "INVESTOR AGENT",
        (
            f"Retrieved {context_counts['investor']} investor evidence item(s). "
            "Stress-testing whether growth can outrun burn and acquisition cost."
        ),
        phase="context_scan",
        metadata={"retrieved_items": context_counts["investor"]},
    )

    state: BoardState = {
        "startup_name": payload.startup_name,
        "strategy": strategy,
        "assumption_profile": assumption_profile,
        "deterministic_signals": deterministic_signals,
        "retrieved_context": retrieved_context,
    }

    _new_log(
        logs,
        "MARKET ANALYST",
        "Evaluating market believability against segment specificity, urgency, competition, and TAM realism.",
        phase="analysis",
        status="running",
    )
    try:
        state.update(market_analyst_node(state))
        _new_log(
            logs,
            "MARKET ANALYST",
            "Market pressure test complete. Captured risks, opportunities, pressure points, and confidence rationale.",
            phase="analysis",
            metadata={"confidence": state.get("market_analyst_feedback", {}).get("confidence")},
        )
    except Exception as exc:
        logger.exception("Market analyst simulation failed. error=%s", exc)
        _new_log(
            logs,
            "MARKET ANALYST",
            "Market advisor failed. The simulation was stopped rather than producing a partial score.",
            phase="analysis",
            status="error",
            metadata={"error": str(exc)},
        )
        raise RuntimeError("Market analyst failed during simulation. No score was produced.") from exc

    _new_log(
        logs,
        "CUSTOMER AGENT",
        "Evaluating whether the problem is urgent enough to overcome adoption friction.",
        phase="analysis",
        status="running",
    )
    try:
        state.update(customer_agent_node(state))
        _new_log(
            logs,
            "CUSTOMER AGENT",
            "Customer simulation complete. Captured buyer objections, value hooks, and adoption risks.",
            phase="analysis",
            metadata={"confidence": state.get("customer_feedback", {}).get("confidence")},
        )
    except Exception as exc:
        logger.exception("Customer agent simulation failed. error=%s", exc)
        _new_log(
            logs,
            "CUSTOMER AGENT",
            "Customer advisor failed. The simulation was stopped rather than producing a partial score.",
            phase="analysis",
            status="error",
            metadata={"error": str(exc)},
        )
        raise RuntimeError("Customer agent failed during simulation. No score was produced.") from exc

    _new_log(
        logs,
        "INVESTOR AGENT",
        "Evaluating runway, CAC clarity, scalability, defensibility, and funding readiness.",
        phase="analysis",
        status="running",
    )
    try:
        state.update(investor_agent_node(state))
        _new_log(
            logs,
            "INVESTOR AGENT",
            "Investment pressure test complete. Captured capital risks and funding-readiness upside.",
            phase="analysis",
            metadata={"confidence": state.get("investor_feedback", {}).get("confidence")},
        )
    except Exception as exc:
        logger.exception("Investor agent simulation failed. error=%s", exc)
        _new_log(
            logs,
            "INVESTOR AGENT",
            "Investor advisor failed. The simulation was stopped rather than producing a partial score.",
            phase="analysis",
            status="error",
            metadata={"error": str(exc)},
        )
        raise RuntimeError("Investor agent failed during simulation. No score was produced.") from exc

    market_agent = _normalize_feedback(
        state.get("market_analyst_feedback", {}),
        "Market Analyst",
    )
    customer_agent = _normalize_feedback(
        state.get("customer_feedback", {}),
        "Customer Agent",
    )
    investor_agent = _normalize_feedback(
        state.get("investor_feedback", {}),
        "Investor Agent",
    )

    uncertainty = _uncertainty_profile(assumption_profile, deterministic_signals, context_counts)
    agent_mean = (market_agent.confidence + customer_agent.confidence + investor_agent.confidence) / 3
    model_mean = (
        deterministic_signals["market_clarity"]
        + deterministic_signals["customer_pain_signal"]
        + deterministic_signals["finance_clarity"]
        + deterministic_signals["assumption_completeness"]
    ) / 4
    uncertainty_penalty = max(0, (70 - uncertainty["assessment_confidence"]) * 0.2)
    overall_score = _clamp_score((agent_mean * 0.7) + (model_mean * 0.3) - uncertainty_penalty)

    state.update(
        {
            "market_analyst_feedback": market_agent.model_dump(),
            "customer_feedback": customer_agent.model_dump(),
            "investor_feedback": investor_agent.model_dump(),
        }
    )
    _new_log(
        logs,
        "BOARD CHAIR",
        "Reconciling advisor disagreements with deterministic signals and assessment uncertainty.",
        phase="synthesis",
        status="running",
        metadata={"agent_mean": round(agent_mean, 1), "model_mean": round(model_mean, 1)},
    )
    try:
        state.update(board_chair_node(state))
        chair = state.get("board_chair_feedback", {})
    except Exception as exc:
        logger.exception("Board chair synthesis failed. error=%s", exc)
        _new_log(
            logs,
            "BOARD CHAIR",
            "Board chair synthesis failed. The simulation was stopped rather than producing an incomplete verdict.",
            phase="synthesis",
            status="error",
            metadata={"error": str(exc)},
        )
        raise RuntimeError("Board chair synthesis failed. No final verdict was produced.") from exc
    next_steps = chair.get("next_steps") if isinstance(chair.get("next_steps"), list) else []
    recommendations = [str(item) for item in next_steps]
    if not recommendations:
        recommendations = [
            "Narrow the initial customer segment and define the fastest path to a paid pilot.",
            "Validate CAC, sales cycle, and onboarding friction before scaling spend.",
            "Refresh the simulation with stronger market-size and competitor evidence.",
        ]

    go_no_go = str(chair.get("go_no_go", "GO-WITH-CAVEATS")).upper()
    synthesis_text = str(chair.get("synthesis") or "").strip()
    if not synthesis_text:
        raise RuntimeError("Board chair synthesis did not include a synthesis. No final verdict was produced.")
    uncertainty_text = (
        f"Assessment confidence: {uncertainty['assessment_confidence']}/100 "
        f"({uncertainty['uncertainty_level']} uncertainty)."
    )
    synthesis = f"Go/No-Go Recommendation: {go_no_go}.\n{uncertainty_text}\n{synthesis_text}"
    _new_log(
        logs,
        "BOARD CHAIR",
        (
            f"Final recommendation issued: {go_no_go}. "
            f"Overall score {overall_score}/100 with {uncertainty['uncertainty_level']} uncertainty."
        ),
        phase="synthesis",
        metadata={
            "overall_score": overall_score,
            "assessment_confidence": uncertainty["assessment_confidence"],
            "uncertainty_level": uncertainty["uncertainty_level"],
            "red_flags": chair.get("red_flags", []),
            "contradictions": chair.get("contradictions", []),
        },
    )

    return SimulationRunResponse(
        simulation_id=str(uuid.uuid4()),
        startup_name=payload.startup_name,
        metrics={
            "marketViability": market_agent.confidence,
            "customerDemand": customer_agent.confidence,
            "investorConfidence": investor_agent.confidence,
            "assumptionCompleteness": deterministic_signals["assumption_completeness"],
            "evidenceReadiness": deterministic_signals["evidence_readiness"],
            "assessmentConfidence": uncertainty["assessment_confidence"],
        },
        overall_score=overall_score,
        recommendations=recommendations,
        agents=[market_agent, customer_agent, investor_agent],
        synthesis=synthesis,
        logs=logs,
        assumptions=assumptions,
        deterministic_signals=deterministic_signals,
        uncertainty=uncertainty,
    )
