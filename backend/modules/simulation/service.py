from __future__ import annotations

import json
import logging
import os
import re
import uuid
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

MAX_INTAKE_USER_TURNS = 3

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


def _extract_intake_updates(
    draft: Dict[str, Any],
    user_message: str,
    history: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    history = history or []
    fallback = {"updates": {}}

    if not user_message.strip():
        return fallback["updates"]

    if client is None:
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
    return updates if isinstance(updates, dict) else {}


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


def _count_user_turns(history: List[Dict[str, str]] | None, user_message: str) -> int:
    history = history or []
    turns = sum(1 for item in history if str(item.get("role", "")).lower() == "user")
    if user_message.strip():
        if not history:
            turns += 1
        else:
            last = history[-1]
            last_role = str(last.get("role", "")).lower()
            last_content = str(last.get("content", "")).strip()
            if last_role != "user" or last_content != user_message.strip():
                turns += 1
    return turns


def _classify_intake_intent(
    user_message: str,
    history: List[Dict[str, str]] | None = None,
) -> str:
    history = history or []
    text = user_message.strip()
    if not text:
        return "EMPTY"
    if client is None:
        return "STARTUP"

    system_prompt = (
        "Classify the user's latest message for a startup intake assistant.\n"
        "Return JSON only: {\"intent\":\"STARTUP|SOCIAL|OFFTOPIC_PERSONAL\"}.\n"
        "STARTUP: message relates to startup/business idea or simulation fields.\n"
        "SOCIAL: greeting/small-talk/acknowledgement.\n"
        "OFFTOPIC_PERSONAL: unrelated personal/health/life question."
    )
    user_prompt = (
        f"Recent conversation:\n{json.dumps(history[-8:], ensure_ascii=True)}\n\n"
        f"Latest user message:\n{text}"
    )
    result = _invoke_json(system_prompt, user_prompt, {"intent": "STARTUP"})
    intent = str(result.get("intent", "STARTUP")).upper() if isinstance(result, dict) else "STARTUP"
    return intent if intent in {"STARTUP", "SOCIAL", "OFFTOPIC_PERSONAL"} else "STARTUP"


def _classify_run_decision(
    user_message: str,
    history: List[Dict[str, str]] | None = None,
) -> str:
    text = user_message.strip()
    if not text:
        return "UNKNOWN"
    history = history or []

    if client is None:
        lowered = text.lower()
        if "run" in lowered and ("yes" in lowered or "go" in lowered or "start" in lowered):
            return "CONFIRM_RUN"
        if "more" in lowered or "add" in lowered:
            return "ADD_MORE"
        return "UNKNOWN"

    system_prompt = (
        "Classify the user's latest message about startup simulation execution.\n"
        "Return JSON only: {\"decision\":\"CONFIRM_RUN|ADD_MORE|UNKNOWN\"}.\n"
        "CONFIRM_RUN: user clearly wants to run now.\n"
        "ADD_MORE: user clearly wants to add more before running.\n"
        "UNKNOWN: unclear."
    )
    user_prompt = (
        f"Recent conversation:\n{json.dumps(history[-10:], ensure_ascii=True)}\n\n"
        f"Latest user message:\n{text}"
    )
    result = _invoke_json(system_prompt, user_prompt, {"decision": "UNKNOWN"})
    decision = str(result.get("decision", "UNKNOWN")).upper() if isinstance(result, dict) else "UNKNOWN"
    return decision if decision in {"CONFIRM_RUN", "ADD_MORE", "UNKNOWN"} else "UNKNOWN"


def _build_add_more_suggestions(draft: Dict[str, Any]) -> str:
    optional_priority = [
        "elevatorPitch",
        "marketSizeEstimate",
        "competitorPatterns",
        "estimatedCac",
        "problemUrgency",
    ]
    ideas = [FIELD_LABELS.get(field, field) for field in optional_priority if _is_blank(draft.get(field))]
    if not ideas:
        return "competitor edge, pricing assumptions, and first 90-day milestones"
    return ", ".join(ideas[:3])


def _autofill_required_fields(draft: Dict[str, Any]) -> Dict[str, Any]:
    filled = {**draft}
    defaults = {
        "startupName": "Untitled Startup",
        "problemStatement": "Problem details are still being refined for this simulation run.",
        "targetAudience": "Early adopters in the intended target market.",
        "primaryTargetSegment": "General Market",
        "geography": "Global",
        "customerBehaviorPainPoints": "Pain points are under validation with target users.",
        "monthlyBurn": "$0",
        "currentCashInHand": "$0",
        "marketingStrategy": "Initial go-to-market assumptions will be validated after this run.",
    }
    for key, default_value in defaults.items():
        if _is_blank(filled.get(key)):
            filled[key] = default_value
    if _is_blank(filled.get("problemUrgency")):
        filled["problemUrgency"] = "HIGH"
    return filled


def run_intake_turn(
    draft: Dict[str, Any] | None,
    user_message: str = "",
    history: List[Dict[str, str]] | None = None,
) -> SimulationIntakeTurnResponse:
    normalized = _normalize_intake_draft(draft)
    updates = _extract_intake_updates(normalized, user_message, history)
    merged = _merge_updates(normalized, updates)

    intent = _classify_intake_intent(user_message, history)
    social_message = intent == "SOCIAL"
    off_topic_personal = intent == "OFFTOPIC_PERSONAL"

    startup_like_input = bool(user_message.strip()) and intent == "STARTUP"
    effective_user_turns = _count_user_turns(history, user_message) if startup_like_input else 0
    force_run = effective_user_turns >= MAX_INTAKE_USER_TURNS

    if force_run:
        merged = _autofill_required_fields(merged)

    missing = [field for field in INTAKE_REQUIRED_FIELDS if _is_blank(merged.get(field))]
    required_done = len(INTAKE_REQUIRED_FIELDS) - len(missing)
    completion = _clamp((required_done / len(INTAKE_REQUIRED_FIELDS)) * 100)
    candidate_ready = len(missing) == 0 or force_run
    run_decision = _classify_run_decision(user_message, history) if user_message.strip() else "UNKNOWN"
    early_confirm_gate = startup_like_input and effective_user_turns >= 2 and not candidate_ready

    # If user explicitly asks to run, proceed with assumptions even when required fields are incomplete.
    if startup_like_input and run_decision == "CONFIRM_RUN" and not candidate_ready:
        merged = _autofill_required_fields(merged)
        missing = [field for field in INTAKE_REQUIRED_FIELDS if _is_blank(merged.get(field))]
        required_done = len(INTAKE_REQUIRED_FIELDS) - len(missing)
        completion = _clamp((required_done / len(INTAKE_REQUIRED_FIELDS)) * 100)
        candidate_ready = True

    ready = candidate_ready and run_decision == "CONFIRM_RUN"

    if not user_message.strip():
        assistant_message = (
            "Hi. Share your startup idea in one message. "
            "I can run with assumptions after up to 3 replies."
        )
    elif off_topic_personal:
        assistant_message = (
            "Sorry you're dealing with that. I'm not a medical provider, "
            "but I can continue the startup simulation whenever you're ready."
        )
    elif social_message and not ready:
        assistant_message = (
            "Hey. Share your startup idea whenever you are ready, "
            "and I will simulate it quickly."
        )
    elif force_run:
        if run_decision == "CONFIRM_RUN":
            assistant_message = "Great, confirmed. Running first-pass simulation now."
        elif run_decision == "ADD_MORE":
            suggestions = _build_add_more_suggestions(merged)
            assistant_message = (
                f"Perfect. Add anything else you want before we run. "
                f"Useful extras: {suggestions}. "
                "When ready, tell me to run simulation."
            )
        else:
            assistant_message = (
                "I have enough context for a first-pass run. "
                "Do you want me to run simulation now, or do you want to add more details first?"
            )
    elif early_confirm_gate:
        if run_decision == "ADD_MORE":
            suggestions = _build_add_more_suggestions(merged)
            assistant_message = (
                f"Got it. Add anything else you want and I will include it. "
                f"Useful extras: {suggestions}. "
                "When you're ready, tell me to run simulation."
            )
        else:
            assistant_message = (
                "I can run a first-pass simulation now with assumptions, or we can keep refining. "
                "Do you want to run now or add more details first?"
            )
    elif candidate_ready and ready:
        assistant_message = "Great, I have enough context. Running simulation now."
    elif candidate_ready:
        if run_decision == "ADD_MORE":
            suggestions = _build_add_more_suggestions(merged)
            assistant_message = (
                f"Sure, add more context and I'll include it. "
                f"Useful extras: {suggestions}. "
                "Tell me when to run simulation."
            )
        else:
            assistant_message = (
                "I have enough context to run. "
                "Do you want me to run simulation now, or do you want to add more first?"
            )
    else:
        remaining = _remaining_required_summary(missing)
        turns_left = max(0, MAX_INTAKE_USER_TURNS - effective_user_turns)
        assistant_message = (
            f"Need these to improve accuracy: {remaining}. "
            f"Reply once with what you can ({turns_left} turn(s) left before auto-run)."
        )

    return SimulationIntakeTurnResponse(
        assistant_message=assistant_message,
        collected_fields=merged,
        missing_fields=missing,
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
