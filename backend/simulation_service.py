from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Any, Dict, List, TypedDict

import openai

from simulation_schemas import (
    AgentFeedback,
    SimulationLog,
    SimulationIntakeTurnResponse,
    SimulationRunRequest,
    SimulationRunResponse,
)

try:
    from tools import build_context, rerank_with_mmr, retrieve_docs
except Exception:
    build_context = rerank_with_mmr = retrieve_docs = None


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

INTAKE_REQUIRED_FIELDS = [
    "startupName",
    "problemStatement",
    "targetAudience",
    "primaryTargetSegment",
    "geography",
    "customerBehaviorPainPoints",
    "monthlyBurn",
    "currentCashInHand",
    "marketingStrategy",
]

INTAKE_QUESTIONS = {
    "startupName": "Startup name?",
    "problemStatement": "What exact problem are you solving?",
    "targetAudience": "Who is the target audience?",
    "primaryTargetSegment": "Primary segment?",
    "geography": "Target geography?",
    "customerBehaviorPainPoints": "Current behavior and key pain points?",
    "monthlyBurn": "Monthly burn estimate?",
    "currentCashInHand": "Current cash in hand?",
    "marketingStrategy": "Initial marketing strategy?",
    "elevatorPitch": "One-line elevator pitch?",
    "problemUrgency": "Urgency: LOW, MEDIUM, HIGH, or CRITICAL?",
    "marketSizeEstimate": "Market size estimate (TAM/SAM)?",
    "competitorPatterns": "Main competitors?",
    "estimatedCac": "Estimated CAC?",
}

FIELD_LABELS = {
    "startupName": "startup name",
    "elevatorPitch": "elevator pitch",
    "problemStatement": "problem statement",
    "targetAudience": "target audience",
    "problemUrgency": "problem urgency",
    "primaryTargetSegment": "target segment",
    "geography": "geography",
    "marketSizeEstimate": "market size estimate",
    "customerBehaviorPainPoints": "customer behavior and pain points",
    "competitorPatterns": "competitor patterns",
    "monthlyBurn": "monthly burn",
    "estimatedCac": "estimated CAC",
    "currentCashInHand": "current cash in hand",
    "marketingStrategy": "marketing strategy",
}


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
    normalized = {key: "" for key in INTAKE_FIELDS}
    if not draft:
        normalized["problemUrgency"] = "HIGH"
        return normalized

    for key in INTAKE_FIELDS:
        value = draft.get(key, "")
        normalized[key] = str(value).strip() if value is not None else ""

    if not normalized["problemUrgency"]:
        normalized["problemUrgency"] = "HIGH"
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


def _first_sentence(text: str) -> str:
    sentence = re.split(r"[.!?]\s+", text.strip(), maxsplit=1)[0].strip()
    return sentence[:240]


def _extract_numeric_phrase(message: str, keywords: List[str]) -> str:
    lines = [segment.strip() for segment in re.split(r"[\n;]", message) if segment.strip()]
    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in keywords):
            amount = re.search(r"(\$?\s?\d[\d,]*(?:\.\d+)?\s*[kKmMbB]?)", line)
            if amount:
                return amount.group(1).replace(" ", "")
            return line[:120]
    return ""


def _extract_geography(message: str) -> str:
    patterns = [
        r"(?:geography|region|market|launch(?:ing)? in|starting in|focus(?:ed)? on)\s*[:\-]?\s*([^\n,.]+)",
        r"\b(?:in|across)\s+((?:north america|europe|africa|asia|global|worldwide|usa|us|uk|canada|nigeria|india|latam)[^,.\n]*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ""


def _extract_target_audience(message: str) -> str:
    patterns = [
        r"(?:target audience|ideal customer|icp|for)\s*[:\-]?\s*([^\n.]+)",
        r"(?:serv(?:e|ing)|help(?:s|ing))\s+([^\n.]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            if len(value) > 3:
                return value[:220]
    return ""


def _regex_intake_updates(draft: Dict[str, Any], user_message: str) -> Dict[str, Any]:
    if not user_message.strip():
        return {}

    updates: Dict[str, Any] = {}
    text = user_message.strip()
    lowered = text.lower()

    if _is_blank(draft.get("elevatorPitch")) and len(text) > 20:
        updates["elevatorPitch"] = _first_sentence(text)

    if _is_blank(draft.get("problemStatement")):
        prob_match = re.search(
            r"(?:problem(?: statement)?|we solve|solving)\s*[:\-]?\s*([^\n]+)",
            text,
            flags=re.IGNORECASE,
        )
        if prob_match:
            updates["problemStatement"] = prob_match.group(1).strip()[:500]

    if _is_blank(draft.get("targetAudience")):
        target = _extract_target_audience(text)
        if target:
            updates["targetAudience"] = target

    if _is_blank(draft.get("primaryTargetSegment")):
        seg_match = re.search(
            r"(?:segment|primary segment|target segment)\s*[:\-]?\s*([^\n.]+)",
            text,
            flags=re.IGNORECASE,
        )
        if seg_match:
            updates["primaryTargetSegment"] = seg_match.group(1).strip()[:220]
        elif "b2b" in lowered or "b2c" in lowered:
            updates["primaryTargetSegment"] = "B2B" if "b2b" in lowered else "B2C"

    if _is_blank(draft.get("geography")):
        geography = _extract_geography(text)
        if geography:
            updates["geography"] = geography

    if _is_blank(draft.get("monthlyBurn")):
        burn = _extract_numeric_phrase(text, ["monthly burn", "burn rate", "burn"])
        if burn:
            updates["monthlyBurn"] = burn

    if _is_blank(draft.get("currentCashInHand")):
        cash = _extract_numeric_phrase(text, ["cash in hand", "cash runway", "cash on hand", "cash"])
        if cash:
            updates["currentCashInHand"] = cash

    if _is_blank(draft.get("estimatedCac")):
        cac = _extract_numeric_phrase(text, ["cac", "customer acquisition cost", "acquisition cost"])
        if cac:
            updates["estimatedCac"] = cac

    if _is_blank(draft.get("marketingStrategy")):
        gtm_match = re.search(
            r"(?:marketing strategy|go[- ]to[- ]market|gtm|acquisition channel)\s*[:\-]?\s*([^\n]+)",
            text,
            flags=re.IGNORECASE,
        )
        if gtm_match:
            updates["marketingStrategy"] = gtm_match.group(1).strip()[:400]

    if _is_blank(draft.get("problemUrgency")) or draft.get("problemUrgency", "").upper() not in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }:
        urgency_match = re.search(r"\b(low|medium|high|critical)\b", lowered)
        if urgency_match:
            updates["problemUrgency"] = urgency_match.group(1).upper()

    if _is_blank(draft.get("startupName")):
        name_match = re.search(
            r"(?:startup(?: name)?|company(?: name)?|called|building)\s*[:\-]?\s*([A-Za-z0-9][^\n,.]{1,80})",
            text,
            flags=re.IGNORECASE,
        )
        if name_match:
            updates["startupName"] = name_match.group(1).strip()

    return updates


def _extract_intake_updates(
    draft: Dict[str, Any],
    user_message: str,
    history: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    history = history or []
    fallback = {"updates": {}}

    if not user_message.strip():
        return fallback["updates"]

    heuristic_updates = _regex_intake_updates(draft, user_message)
    if client is None:
        if heuristic_updates:
            return heuristic_updates
        # Deterministic fallback for first question in environments without LLM.
        first_missing = next((f for f in INTAKE_REQUIRED_FIELDS if _is_blank(draft.get(f))), "")
        if first_missing == "startupName":
            return {"startupName": user_message.strip()[:120]}
        if first_missing == "problemStatement":
            return {"problemStatement": user_message.strip()[:800]}
        return {}

    system_prompt = (
        "You are an intake parser for a startup simulation form. "
        "Extract explicit or clearly implied facts from the user's latest message into JSON.\n"
        "Return JSON object with shape: {\"updates\": {<camelCase fields>}}.\n"
        "Valid keys are: startupName, elevatorPitch, problemStatement, targetAudience, problemUrgency, "
        "primaryTargetSegment, geography, marketSizeEstimate, customerBehaviorPainPoints, competitorPatterns, "
        "monthlyBurn, estimatedCac, currentCashInHand, marketingStrategy.\n"
        "Do not invent values. If user says 'for X', map to targetAudience. "
        "If user mentions countries/regions, map to geography. "
        "If user includes burn/cash/CAC numbers, map them. "
        "Keep existing draft values unless user clearly updates them."
    )
    user_prompt = (
        f"Current draft:\n{json.dumps(draft, ensure_ascii=True)}\n\n"
        f"Recent conversation:\n{json.dumps(history[-8:], ensure_ascii=True)}\n\n"
        f"Latest user message:\n{user_message}\n\n"
        "Extract updates now."
    )
    result = _invoke_json(system_prompt, user_prompt, fallback)
    updates = result.get("updates", {}) if isinstance(result, dict) else {}
    llm_updates = updates if isinstance(updates, dict) else {}
    return {**heuristic_updates, **llm_updates}


def _next_intake_question(draft: Dict[str, Any], newly_filled: List[str] | None = None) -> str:
    newly_filled = newly_filled or []
    if newly_filled:
        readable = ", ".join(FIELD_LABELS.get(field, field) for field in newly_filled[:4])
        for field in INTAKE_REQUIRED_FIELDS:
            if _is_blank(draft.get(field)):
                return f"Captured: {readable}. Next: {INTAKE_QUESTIONS[field]}"

    for field in INTAKE_REQUIRED_FIELDS:
        if _is_blank(draft.get(field)):
            return INTAKE_QUESTIONS[field]

    for field in INTAKE_FIELDS:
        if _is_blank(draft.get(field)):
            return f"Optional: {INTAKE_QUESTIONS[field]}"
    return "Core data captured. Running simulation."


def _remaining_required_summary(missing: List[str]) -> str:
    if not missing:
        return ""
    labels = [FIELD_LABELS.get(field, field) for field in missing]
    return ", ".join(labels)


def run_intake_turn(
    draft: Dict[str, Any] | None,
    user_message: str = "",
    history: List[Dict[str, str]] | None = None,
) -> SimulationIntakeTurnResponse:
    normalized = _normalize_intake_draft(draft)
    updates = _extract_intake_updates(normalized, user_message, history)
    merged = _merge_updates(normalized, updates)
    newly_filled = [field for field in INTAKE_FIELDS if _is_blank(normalized.get(field)) and not _is_blank(merged.get(field))]

    missing = [field for field in INTAKE_REQUIRED_FIELDS if _is_blank(merged.get(field))]
    required_done = len(INTAKE_REQUIRED_FIELDS) - len(missing)
    completion = _clamp((required_done / len(INTAKE_REQUIRED_FIELDS)) * 100)
    ready = len(missing) == 0

    if not user_message.strip():
        assistant_message = (
            "Hi, share your startup idea in one message: what you are building, who it is for, "
            "problem, segment, geography, burn, cash, and go-to-market."
        )
    elif ready:
        assistant_message = "Core data complete. Running simulation now."
    else:
        captured = ", ".join(FIELD_LABELS.get(field, field) for field in newly_filled[:6])
        remaining = _remaining_required_summary(missing)
        if captured:
            assistant_message = (
                f"Captured: {captured}. Remaining required fields: {remaining}. "
                "Reply with any or all remaining fields in one message."
            )
        else:
            assistant_message = (
                f"Remaining required fields: {remaining}. "
                "Reply with any or all remaining fields in one message."
            )

    return SimulationIntakeTurnResponse(
        assistant_message=assistant_message,
        collected_fields=merged,
        missing_fields=missing,
        ready_to_run=ready,
        completion_percent=completion,
    )


def _tool_context(query: str, top_k: int = 4) -> str:
    if retrieve_docs is None or rerank_with_mmr is None or build_context is None:
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


def _fallback_feedback(label: str) -> Dict[str, Any]:
    return {
        "summary": f"{label} assessment unavailable; used fallback simulation logic.",
        "risks": ["Model output unavailable for this agent."],
        "opportunities": ["Collect more user and market evidence before scaling."],
        "confidence": 50,
    }


def _invoke_json(system_prompt: str, user_prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    if client is None:
        return fallback

    try:
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
        return _parse_json_or_default(raw, fallback)
    except Exception as exc:
        logger.warning("LLM invocation failed, using fallback. error=%s", exc)
        return fallback


def market_analyst_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    market_context = _tool_context(
        f"{state['strategy']}\n\nFind TAM benchmarks, market trends, and competitor positioning signals."
    )
    system_prompt = (
        "You are a ruthless but brilliant Market Analyst. "
        "Return only JSON with keys: summary (string), risks (array of 2-4 strings), "
        "opportunities (array of 2-4 strings), confidence (integer 0-100)."
    )
    user_prompt = (
        "Evaluate this strategy on TAM realism, market trend tailwinds/headwinds, and competition. "
        "Be concise and actionable.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Retrieved context (may be empty):\n{market_context or 'No context retrieved.'}"
    )
    return {
        "market_analyst_feedback": _invoke_json(
            system_prompt,
            user_prompt,
            _fallback_feedback("Market Analyst"),
        )
    }


def customer_agent_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    customer_context = _tool_context(
        f"{state['strategy']}\n\nFind customer behavior insights, adoption friction, and willingness-to-pay clues."
    )
    system_prompt = (
        "You are a skeptical but open-minded Target Customer. "
        "Return only JSON with keys: summary (string), risks (array of 2-4 strings), "
        "opportunities (array of 2-4 strings), confidence (integer 0-100)."
    )
    user_prompt = (
        "Evaluate whether this solves a painful job-to-be-done, UX friction risks, and willingness to pay. "
        "Be brutally honest and specific.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Retrieved context (may be empty):\n{customer_context or 'No context retrieved.'}"
    )
    return {
        "customer_feedback": _invoke_json(
            system_prompt,
            user_prompt,
            _fallback_feedback("Customer Agent"),
        )
    }


def investor_agent_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    investor_context = _tool_context(
        f"{state['strategy']}\n\nFind unit economics norms, funding signals, and scale risks for this domain."
    )
    system_prompt = (
        "You are a hard-nosed Venture Capital Investor. "
        "Return only JSON with keys: summary (string), risks (array of 2-4 strings), "
        "opportunities (array of 2-4 strings), confidence (integer 0-100)."
    )
    user_prompt = (
        "Evaluate ROI potential, unit economics assumptions, scalability quality, and execution risk. "
        "State if 100x is plausible and why.\n\n"
        f"Strategy:\n{state['strategy']}\n\n"
        f"Retrieved context (may be empty):\n{investor_context or 'No context retrieved.'}"
    )
    return {
        "investor_feedback": _invoke_json(
            system_prompt,
            user_prompt,
            _fallback_feedback("Investor Agent"),
        )
    }


def board_chair_node(state: BoardState) -> Dict[str, Dict[str, Any]]:
    system_prompt = (
        "You are the Board Chair. Synthesize all advisor feedback and return only JSON with keys: "
        "go_no_go (GO or NO-GO), synthesis (string), red_flags (array of 2-4 strings), "
        "upside (array of 2-4 strings), next_steps (array of exactly 3 strings)."
    )
    user_prompt = (
        f"Original Strategy:\n{state['strategy']}\n\n"
        f"Market Analyst Feedback:\n{json.dumps(state.get('market_analyst_feedback', {}), ensure_ascii=True)}\n\n"
        f"Customer Feedback:\n{json.dumps(state.get('customer_feedback', {}), ensure_ascii=True)}\n\n"
        f"Investor Feedback:\n{json.dumps(state.get('investor_feedback', {}), ensure_ascii=True)}"
    )

    fallback = {
        "go_no_go": "NO-GO",
        "synthesis": "Signals are mixed; more validation is required before aggressive scaling.",
        "red_flags": [
            "Evidence quality is insufficient for confident market entry.",
            "Economic assumptions need stronger validation.",
        ],
        "upside": [
            "Clear pain points suggest potential demand.",
            "Focused segment strategy can unlock efficient GTM.",
        ],
        "next_steps": [
            "Run 10 customer interviews and document objections.",
            "Validate pricing with at least 3 willingness-to-pay tests.",
            "Model 12-month runway under worst-case CAC assumptions.",
        ],
    }

    return {"board_chair_feedback": _invoke_json(system_prompt, user_prompt, fallback)}


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


def _normalize_feedback(data: Dict[str, Any], perspective: str, fallback_score: int) -> AgentFeedback:
    risks = data.get("risks") if isinstance(data.get("risks"), list) else []
    opportunities = data.get("opportunities") if isinstance(data.get("opportunities"), list) else []

    return AgentFeedback(
        perspective=perspective,
        summary=str(data.get("summary") or f"{perspective} feedback unavailable."),
        risks=[str(item) for item in risks[:4]] or ["No explicit risks returned."],
        opportunities=[str(item) for item in opportunities[:4]] or ["No explicit opportunities returned."],
        confidence=_clamp(float(data.get("confidence", fallback_score))),
    )


def _fallback_run(payload: SimulationRunRequest) -> SimulationRunResponse:
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

    return SimulationRunResponse(
        simulation_id=str(uuid.uuid4()),
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
        logs=_build_logs(market_viability, customer_demand, investor_confidence),
    )


def run_simulation(payload: SimulationRunRequest) -> SimulationRunResponse:
    if virtual_board is None:
        return _fallback_run(payload)

    try:
        strategy = _build_strategy(payload)
        output = virtual_board.invoke(
            {
                "startup_name": payload.startup_name,
                "strategy": strategy,
            }
        )

        market_agent = _normalize_feedback(
            output.get("market_analyst_feedback", {}),
            "Market Analyst",
            55,
        )
        customer_agent = _normalize_feedback(
            output.get("customer_feedback", {}),
            "Customer Agent",
            55,
        )
        investor_agent = _normalize_feedback(
            output.get("investor_feedback", {}),
            "Investor Agent",
            55,
        )

        overall_score = _clamp(
            (market_agent.confidence + customer_agent.confidence + investor_agent.confidence) / 3
        )

        chair = output.get("board_chair_feedback", {})
        next_steps = chair.get("next_steps") if isinstance(chair.get("next_steps"), list) else []
        recommendations = [str(item) for item in next_steps[:3]]

        if len(recommendations) < 3:
            recommendations.extend(
                [
                    "Run 10 customer interviews this week to validate demand assumptions.",
                    "Validate one paid acquisition channel with strict CAC guardrails.",
                    "Build a 12-month runway model with best/base/worst-case scenarios.",
                ][0 : 3 - len(recommendations)]
            )

        go_no_go = str(chair.get("go_no_go", "NO-GO")).upper()
        synthesis_text = str(chair.get("synthesis") or "Synthesis unavailable.")
        synthesis = f"Go/No-Go Recommendation: {go_no_go}.\n{synthesis_text}"

        return SimulationRunResponse(
            simulation_id=str(uuid.uuid4()),
            startup_name=payload.startup_name,
            metrics={
                "marketViability": market_agent.confidence,
                "customerDemand": customer_agent.confidence,
                "investorConfidence": investor_agent.confidence,
            },
            overall_score=overall_score,
            recommendations=recommendations,
            agents=[market_agent, customer_agent, investor_agent],
            synthesis=synthesis,
            logs=_build_logs(
                market_agent.confidence,
                customer_agent.confidence,
                investor_agent.confidence,
            ),
        )
    except Exception as exc:
        logger.exception("Agentic simulation failed, returning fallback output. error=%s", exc)
        return _fallback_run(payload)
