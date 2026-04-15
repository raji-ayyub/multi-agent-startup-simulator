from __future__ import annotations

import json
import hashlib
import html as html_lib
import os
import re
import textwrap
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from uuid import uuid4

import openai
from sqlalchemy.orm import Session

from modules.simulation.reporting import StartupSimulationReportGenerator
from models import (
    AppNotification,
    BusinessInsightReport,
    BusinessInsightReportVersion,
    CalendarEvent,
    ManagementPlanRun,
    ManagementWorkspace,
    SimulationRun,
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
report_generator = StartupSimulationReportGenerator()
_SUPPORTED_REPORT_TYPES = {
    "viability_report",
    "feasibility_report",
    "market_analysis_report",
    "investment_analysis_report",
    "business_report",
}
_REPORT_TYPE_ALIASES = {
    "viability": "viability_report",
    "feasibility": "feasibility_report",
    "market": "market_analysis_report",
    "financial": "investment_analysis_report",
    "comprehensive": "business_report",
}
_REPORT_TYPE_TO_GENERATOR_PROFILE = {
    "viability_report": "viability",
    "feasibility_report": "feasibility",
    "market_analysis_report": "market",
    "investment_analysis_report": "financial",
    "business_report": "comprehensive",
}
_REPORT_TYPE_DISPLAY_NAMES = {
    "viability_report": "Viability Report",
    "feasibility_report": "Feasibility Report",
    "market_analysis_report": "Market Analysis Report",
    "investment_analysis_report": "Investment Analysis Report",
    "business_report": "Business Report",
}

_REPORT_TEMPLATE_CATALOG: List[Dict[str, Any]] = [
    {
        "template_id": "obsidian_board",
        "name": "Obsidian Board",
        "description": "Dark executive style with strong section emphasis and decision panels.",
        "supported_report_types": [
            "viability_report",
            "feasibility_report",
            "market_analysis_report",
            "investment_analysis_report",
            "business_report",
        ],
        "layout_family": "board",
        "pro_required": False,
        "preview_image_url": "/images/report-template-obsidian-board.png",
        "default_quality": "premium",
        "theme_tokens": {
            "primary_color": "#0ea5e9",
            "secondary_color": "#111827",
            "accent_color": "#22d3ee",
            "text_color": "#e5e7eb",
            "page_background": "#0b1220",
            "page_border": "#1f2937",
        },
    },
    {
        "template_id": "signal_compact",
        "name": "Signal Compact",
        "description": "Fast-scanning compact layout for weekly founder operating reviews.",
        "supported_report_types": [
            "viability_report",
            "market_analysis_report",
            "investment_analysis_report",
        ],
        "layout_family": "compact",
        "pro_required": False,
        "preview_image_url": "/images/report-template-signal-compact.png",
        "default_quality": "standard",
        "theme_tokens": {
            "primary_color": "#0f172a",
            "secondary_color": "#334155",
            "accent_color": "#38bdf8",
        },
    },
    {
        "template_id": "market_storyline",
        "name": "Market Storyline",
        "description": "Narrative-heavy market report layout with trend and segment spotlight blocks.",
        "supported_report_types": [
            "market_analysis_report",
            "business_report",
        ],
        "layout_family": "narrative",
        "pro_required": False,
        "preview_image_url": "/images/report-template-market-storyline.png",
        "default_quality": "premium",
        "theme_tokens": {
            "primary_color": "#0b3a5d",
            "secondary_color": "#1e293b",
            "accent_color": "#f59e0b",
        },
    },
    {
        "template_id": "capital_thesis",
        "name": "Capital Thesis",
        "description": "Investment memo style optimized for return thesis, risk, and capital use.",
        "supported_report_types": [
            "investment_analysis_report",
            "business_report",
        ],
        "layout_family": "investment",
        "pro_required": False,
        "preview_image_url": "/images/report-template-capital-thesis.png",
        "default_quality": "premium",
        "theme_tokens": {
            "primary_color": "#1d4ed8",
            "secondary_color": "#1f2937",
            "accent_color": "#f97316",
        },
    },
    {
        "template_id": "feasibility_blueprint",
        "name": "Feasibility Blueprint",
        "description": "Operations and execution oriented layout for feasibility deep dives.",
        "supported_report_types": [
            "feasibility_report",
            "business_report",
        ],
        "layout_family": "blueprint",
        "pro_required": False,
        "preview_image_url": "/images/report-template-feasibility-blueprint.png",
        "default_quality": "standard",
        "theme_tokens": {
            "primary_color": "#0f766e",
            "secondary_color": "#134e4a",
            "accent_color": "#f59e0b",
        },
    },
]


def _normalize_report_type(report_type: str | None) -> str:
    normalized = (report_type or "").strip().lower()
    normalized = _REPORT_TYPE_ALIASES.get(normalized, normalized)
    if normalized not in _SUPPORTED_REPORT_TYPES:
        return "business_report"
    return normalized


def _generator_report_profile(report_type: str | None) -> str:
    normalized = _normalize_report_type(report_type)
    return _REPORT_TYPE_TO_GENERATOR_PROFILE.get(normalized, "comprehensive")


def _report_title_profile(report_type: str | None) -> Dict[str, str]:
    normalized = _normalize_report_type(report_type)
    profiles = {
        "viability_report": {
            "report_title": "Startup Viability Report",
            "subtitle": "Commercial traction, model strength, and go/no-go viability view",
        },
        "feasibility_report": {
            "report_title": "Startup Feasibility Report",
            "subtitle": "Execution readiness across market, operations, and delivery constraints",
        },
        "market_analysis_report": {
            "report_title": "Market Analysis Report",
            "subtitle": "Demand shape, segment opportunity, and positioning pressure map",
        },
        "investment_analysis_report": {
            "report_title": "Investment Analysis Report",
            "subtitle": "Capital thesis, return profile, risk bands, and funding readiness",
        },
        "business_report": {
            "report_title": "Business Report",
            "subtitle": "Integrated founder brief across viability, feasibility, market, and capital",
        },
    }
    return {"report_type": normalized, **profiles[normalized]}


def suggest_report_name(
    *,
    startup_name: str | None,
    report_type: str | None,
    provided_name: str | None = None,
) -> str:
    normalized_type = _normalize_report_type(report_type)
    cleaned_name = str(provided_name or "").strip()
    lowered_name = cleaned_name.lower()
    generic_inputs = {
        "",
        "report",
        "business report",
        "business insight report",
        "founder decision report",
        "startup report",
    }
    startup_clean = str(startup_name or "").strip() or "Startup"
    suggested = f"{startup_clean} {_REPORT_TYPE_DISPLAY_NAMES.get(normalized_type, 'Business Report')}".strip()
    if lowered_name in generic_inputs:
        return suggested
    return cleaned_name or suggested


def get_report_renderer_health() -> Dict[str, Any]:
    html_ready = True
    pdf_ready = True
    html_error = ""
    pdf_error = ""

    try:
        report_generator._ensure_template_engine()
    except Exception as exc:
        html_ready = False
        html_error = str(exc)

    try:
        report_generator._render_pdf_bytes("<html><body><p>renderer-health</p></body></html>")
    except Exception as exc:
        pdf_ready = False
        pdf_error = str(exc)

    return {
        "html_renderer_ready": html_ready,
        "pdf_renderer_ready": pdf_ready,
        "ready": html_ready and pdf_ready,
        "html_error": html_error,
        "pdf_error": pdf_error,
    }


def ensure_report_renderer_ready(*, strict: bool) -> Dict[str, Any]:
    status = get_report_renderer_health()
    if strict and not status["ready"]:
        raise RuntimeError(
            "Report rendering stack is not ready. "
            f"html_ready={status['html_renderer_ready']} pdf_ready={status['pdf_renderer_ready']} "
            f"html_error={status['html_error']} pdf_error={status['pdf_error']}"
        )
    return status


def list_report_templates() -> List[Dict[str, Any]]:
    return [dict(item) for item in _REPORT_TEMPLATE_CATALOG]


def get_report_template(template_id: str | None) -> Dict[str, Any]:
    normalized = (template_id or "").strip().lower()
    for item in _REPORT_TEMPLATE_CATALOG:
        if item["template_id"] == normalized:
            return dict(item)
    return dict(_REPORT_TEMPLATE_CATALOG[0])


def resolve_template_for_report_type(report_type: str | None, template_id: str | None) -> Dict[str, Any]:
    normalized_type = _normalize_report_type(report_type)
    candidate = get_report_template(template_id)
    supported = candidate.get("supported_report_types") if isinstance(candidate, dict) else None
    if isinstance(supported, list) and normalized_type in supported:
        return candidate
    for item in _REPORT_TEMPLATE_CATALOG:
        item_supported = item.get("supported_report_types")
        if isinstance(item_supported, list) and normalized_type in item_supported:
            return dict(item)
    return dict(_REPORT_TEMPLATE_CATALOG[0])


def template_requires_pro(template_id: str | None) -> bool:
    return bool(get_report_template(template_id).get("pro_required"))


def _new_block(block_type: str, order: int, data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "block_id": str(uuid4()),
        "type": block_type,
        "order": order,
        "layout": {
            "span": 12,
            "align": "left",
            "flow": "full-width",
        },
        "data": data,
    }


def report_payload_to_document_json(
    report: Dict[str, Any],
    report_type: str = "viability_report",
    template_id: str = "obsidian_board",
) -> Dict[str, Any]:
    summary = str(report.get("summary") or "").strip()
    sections = report.get("sections") if isinstance(report.get("sections"), list) else []
    key_findings = [str(item).strip() for item in (report.get("key_findings") or []) if str(item).strip()]
    recommended_actions = [
        str(item).strip() for item in (report.get("recommended_actions") or []) if str(item).strip()
    ]

    normalized_sections: List[Dict[str, Any]] = []
    order = 0

    if summary:
        normalized_sections.append(
            {
                "section_id": str(uuid4()),
                "title": "Executive Summary",
                "order": order,
                "blocks": [
                    _new_block(
                        "rich_text",
                        0,
                        {
                            "type": "doc",
                            "content": [{"type": "paragraph", "content": [{"type": "text", "text": summary}]}],
                        },
                    )
                ],
            }
        )
        order += 1

    for section_index, section in enumerate(sections):
        if not isinstance(section, dict):
            continue
        heading = str(section.get("heading") or f"Section {section_index + 1}").strip()
        body = str(section.get("body") or "").strip()
        if not body:
            continue
        normalized_sections.append(
            {
                "section_id": str(uuid4()),
                "title": heading,
                "order": order,
                "blocks": [
                    _new_block(
                        "rich_text",
                        0,
                        {
                            "type": "doc",
                            "content": [{"type": "paragraph", "content": [{"type": "text", "text": body}]}],
                        },
                    )
                ],
            }
        )
        order += 1

    if key_findings:
        normalized_sections.append(
            {
                "section_id": str(uuid4()),
                "title": "Key Findings",
                "order": order,
                "blocks": [
                    _new_block(
                        "card",
                        0,
                        {
                            "title": "Key Findings",
                            "items": key_findings,
                            "border": "soft",
                        },
                    )
                ],
            }
        )
        order += 1

    if recommended_actions:
        normalized_sections.append(
            {
                "section_id": str(uuid4()),
                "title": "Recommended Actions",
                "order": order,
                "blocks": [
                    _new_block(
                        "card",
                        0,
                        {
                            "title": "Recommended Actions",
                            "items": recommended_actions,
                            "border": "strong",
                        },
                    )
                ],
            }
        )

    template = get_report_template(template_id)
    return {
        "meta": {
            "report_name": str(report.get("report_name") or "Business Insight Report"),
            "report_type": _normalize_report_type(report_type),
            "template_id": template["template_id"],
            "page_setup": {
                "size": "A4",
                "margins": {"top": 40, "right": 40, "bottom": 40, "left": 40},
                "header": "",
                "footer": "",
                "background": "#ffffff",
                "font_scale": 100,
                "font_family": "Source Serif 4",
            },
            "theme_tokens": dict(template.get("theme_tokens") or {}),
        },
        "sections": normalized_sections,
    }


def _flatten_text_from_tiptap(node: Any) -> str:
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return " ".join(_flatten_text_from_tiptap(item) for item in node).strip()
    if not isinstance(node, dict):
        return str(node)
    if node.get("type") == "text":
        return str(node.get("text") or "")
    return " ".join(_flatten_text_from_tiptap(item) for item in (node.get("content") or [])).strip()


def _extract_block_text(block: Dict[str, Any]) -> str:
    data = block.get("data")
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, dict):
        if "text" in data and str(data.get("text") or "").strip():
            return str(data.get("text")).strip()
        if "content" in data:
            extracted = _flatten_text_from_tiptap(data)
            return extracted.strip()
        if "items" in data and isinstance(data.get("items"), list):
            return "\n".join(str(item).strip() for item in data["items"] if str(item).strip())
    return ""


def document_json_to_report_payload(document_json: Dict[str, Any]) -> Dict[str, Any]:
    meta = document_json.get("meta") if isinstance(document_json.get("meta"), dict) else {}
    sections = document_json.get("sections") if isinstance(document_json.get("sections"), list) else []

    report_sections: List[Dict[str, str]] = []
    key_findings: List[str] = []
    recommended_actions: List[str] = []
    summary = ""

    for section in sections:
        if not isinstance(section, dict):
            continue
        title = str(section.get("title") or "Section").strip()
        blocks = section.get("blocks") if isinstance(section.get("blocks"), list) else []
        block_texts: List[str] = []
        section_items: List[str] = []
        for block in sorted(blocks, key=lambda item: int(item.get("order", 0)) if isinstance(item, dict) else 0):
            if not isinstance(block, dict):
                continue
            text_value = _extract_block_text(block)
            if text_value:
                block_texts.append(text_value)
            if block.get("type") == "card" and isinstance(block.get("data"), dict):
                data_items = block["data"].get("items")
                if isinstance(data_items, list):
                    section_items.extend([str(item).strip() for item in data_items if str(item).strip()])
        body = "\n\n".join(value for value in block_texts if value).strip()
        if body:
            report_sections.append({"heading": title, "body": body[:4000]})
        lowered = title.lower()
        if "finding" in lowered and section_items:
            key_findings.extend(section_items)
        if "action" in lowered and section_items:
            recommended_actions.extend(section_items)

    if report_sections:
        summary = report_sections[0]["body"][:4000]

    return {
        "report_name": str(meta.get("report_name") or "Business Insight Report"),
        "summary": summary,
        "sections": report_sections[:8],
        "key_findings": list(dict.fromkeys(key_findings))[:12],
        "recommended_actions": list(dict.fromkeys(recommended_actions))[:12],
    }


def compute_document_hash(document_json: Dict[str, Any]) -> str:
    payload = json.dumps(document_json, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def serialize_report_version(row: BusinessInsightReportVersion) -> Dict[str, Any]:
    return {
        "version_id": row.id,
        "report_id": row.report_id,
        "version_number": int(row.version_number or 1),
        "status": str(row.status or "DRAFT").upper(),
        "content_hash": row.content_hash or "",
        "created_by_user_id": row.created_by_user_id,
        "created_at": row.created_at,
        "published_at": row.published_at,
    }


def _next_report_version_number(db: Session, report_id: str) -> int:
    latest = (
        db.query(BusinessInsightReportVersion)
        .filter(BusinessInsightReportVersion.report_id == report_id)
        .order_by(BusinessInsightReportVersion.version_number.desc())
        .first()
    )
    return int(latest.version_number or 0) + 1 if latest else 1


def ensure_report_versions_initialized(
    db: Session,
    report: BusinessInsightReport,
    created_by_user_id: int | None = None,
) -> BusinessInsightReportVersion:
    published = (
        db.query(BusinessInsightReportVersion)
        .filter(
            BusinessInsightReportVersion.report_id == report.id,
            BusinessInsightReportVersion.status == "PUBLISHED",
        )
        .order_by(BusinessInsightReportVersion.version_number.asc())
        .first()
    )
    if published is None:
        document_json = report_payload_to_document_json(
            {
                "report_name": report.report_name,
                "summary": report.summary,
                "sections": report.sections or [],
                "key_findings": report.key_findings or [],
                "recommended_actions": report.recommended_actions or [],
            },
            report_type="viability_report",
            template_id="obsidian_board",
        )
        published = BusinessInsightReportVersion(
            report_id=report.id,
            version_number=1,
            status="PUBLISHED",
            document_json=document_json,
            content_hash=compute_document_hash(document_json),
            created_by_user_id=created_by_user_id or report.owner_user_id,
            published_at=datetime.utcnow(),
        )
        db.add(published)
        db.flush()

    if not report.published_version_id:
        report.published_version_id = published.id
        db.add(report)
    return published


def save_report_draft_version(
    db: Session,
    report: BusinessInsightReport,
    document_json: Dict[str, Any],
    created_by_user_id: int | None = None,
) -> tuple[BusinessInsightReportVersion, bool]:
    content_hash = compute_document_hash(document_json)
    latest_draft = None
    if report.latest_draft_version_id:
        latest_draft = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == report.latest_draft_version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )

    if latest_draft and latest_draft.content_hash == content_hash:
        return latest_draft, True

    version = BusinessInsightReportVersion(
        report_id=report.id,
        version_number=_next_report_version_number(db, report.id),
        status="DRAFT",
        document_json=document_json,
        content_hash=content_hash,
        created_by_user_id=created_by_user_id,
    )
    db.add(version)
    db.flush()

    report.latest_draft_version_id = version.id
    report.updated_at = datetime.utcnow()
    db.add(report)
    return version, False


def publish_report_version(
    db: Session,
    report: BusinessInsightReport,
    source_version: BusinessInsightReportVersion,
    created_by_user_id: int | None = None,
) -> BusinessInsightReportVersion:
    document_json = source_version.document_json if isinstance(source_version.document_json, dict) else {}
    content_hash = compute_document_hash(document_json)
    published = BusinessInsightReportVersion(
        report_id=report.id,
        version_number=_next_report_version_number(db, report.id),
        status="PUBLISHED",
        document_json=document_json,
        content_hash=content_hash,
        created_by_user_id=created_by_user_id,
        published_at=datetime.utcnow(),
    )
    db.add(published)
    db.flush()

    payload = document_json_to_report_payload(document_json)
    report.report_name = payload["report_name"]
    report.summary = payload["summary"]
    report.sections = payload["sections"]
    report.key_findings = payload["key_findings"]
    report.recommended_actions = payload["recommended_actions"]
    report.published_version_id = published.id
    report.status = "READY"
    report.updated_at = datetime.utcnow()
    db.add(report)
    return published


def create_notification(
    db: Session,
    *,
    category: str,
    title: str,
    message: str,
    link: str = "",
    target_user_id: int | None = None,
    target_role: str | None = None,
    metadata: Dict[str, Any] | None = None,
) -> AppNotification:
    normalized_role = (target_role or "").strip().upper()
    if target_user_id is None and not normalized_role:
        raise ValueError("Notification audience must be explicit.")
    if target_user_id is not None and not normalized_role:
        normalized_role = "DIRECT"

    row = AppNotification(
        target_user_id=target_user_id,
        target_role=normalized_role,
        category=(category or "GENERAL").upper(),
        title=(title or "").strip()[:255],
        message=(message or "").strip()[:5000],
        link=(link or "").strip()[:255],
        notification_payload=metadata or {},
        is_read=False,
    )
    db.add(row)
    return row


def serialize_notification(
    row: AppNotification,
    *,
    viewer_read_at: datetime | None = None,
    target_user_email: str | None = None,
) -> Dict[str, Any]:
    if row.target_user_id is not None:
        audience_scope = "DIRECT"
    elif (row.target_role or "").upper() == "ALL":
        audience_scope = "SYSTEM"
    else:
        audience_scope = "ROLE"

    return {
        "notification_id": row.id,
        "category": row.category or "GENERAL",
        "title": row.title or "",
        "message": row.message or "",
        "link": row.link or "",
        "metadata": row.notification_payload if isinstance(row.notification_payload, dict) else {},
        "target_user_id": row.target_user_id,
        "target_user_email": target_user_email,
        "target_role": row.target_role or "",
        "audience_scope": audience_scope,
        "is_read": viewer_read_at is not None,
        "created_at": row.created_at,
        "read_at": viewer_read_at,
    }


def serialize_report(row: BusinessInsightReport, include_content: bool = True) -> Dict[str, Any]:
    sections = row.sections if isinstance(row.sections, list) else []
    key_findings = row.key_findings if isinstance(row.key_findings, list) else []
    recommended_actions = row.recommended_actions if isinstance(row.recommended_actions, list) else []
    return {
        "report_id": row.id,
        "simulation_id": row.simulation_id,
        "workspace_id": row.workspace_id,
        "report_name": row.report_name or "Business Insight Report",
        "report_type": _normalize_report_type(getattr(row, "report_type", None)),
        "template_id": str(getattr(row, "template_id", "") or "obsidian_board"),
        "status": row.status or "READY",
        "summary": row.summary or "",
        "sections": sections if include_content else [],
        "key_findings": key_findings if include_content else [],
        "recommended_actions": recommended_actions if include_content else [],
        "published_version_id": row.published_version_id,
        "latest_draft_version_id": row.latest_draft_version_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def serialize_report_list_item(row: BusinessInsightReport) -> Dict[str, Any]:
    sections = row.sections if isinstance(row.sections, list) else []
    key_findings = row.key_findings if isinstance(row.key_findings, list) else []
    recommended_actions = row.recommended_actions if isinstance(row.recommended_actions, list) else []
    return {
        "report_id": row.id,
        "simulation_id": row.simulation_id,
        "workspace_id": row.workspace_id,
        "report_name": row.report_name or "Business Insight Report",
        "report_type": _normalize_report_type(getattr(row, "report_type", None)),
        "template_id": str(getattr(row, "template_id", "") or "obsidian_board"),
        "status": row.status or "READY",
        "summary": row.summary or "",
        "sections_count": len(sections),
        "key_findings_count": len(key_findings),
        "recommended_actions_count": len(recommended_actions),
        "published_version_id": row.published_version_id,
        "latest_draft_version_id": row.latest_draft_version_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def serialize_calendar_event(row: CalendarEvent) -> Dict[str, Any]:
    return {
        "event_id": row.id,
        "workspace_id": row.workspace_id,
        "simulation_id": row.simulation_id,
        "title": row.title or "",
        "description": row.description or "",
        "event_type": row.event_type or "TASK",
        "priority": row.priority or "MEDIUM",
        "source": row.source or "USER",
        "permission_status": row.permission_status or "APPROVED",
        "starts_at": row.starts_at,
        "ends_at": row.ends_at,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _simulation_context(simulation: SimulationRun) -> str:
    agents = simulation.agents if isinstance(simulation.agents, list) else []
    agent_lines = []
    for agent in agents[:3]:
        if not isinstance(agent, dict):
            continue
        perspective = agent.get("perspective") or "Agent"
        summary = agent.get("summary") or ""
        risks = ", ".join(str(item) for item in (agent.get("risks") or [])[:2])
        ops = ", ".join(str(item) for item in (agent.get("opportunities") or [])[:2])
        agent_lines.append(f"- {perspective}: {summary} Risks: {risks or 'None'}. Opportunities: {ops or 'None'}.")
    payload = simulation.input_payload if isinstance(simulation.input_payload, dict) else {}
    return "\n".join(
        [
            f"Startup: {simulation.startup_name}",
            f"Overall score: {simulation.overall_score}",
            f"Metrics: {json.dumps(simulation.metrics or {})}",
            f"Synthesis: {simulation.synthesis or ''}",
            f"Problem statement: {payload.get('problem_statement') or ''}",
            f"Target audience: {payload.get('target_audience') or ''}",
            f"Go-to-market: {payload.get('marketing_strategy') or ''}",
            "Agent signals:",
            "\n".join(agent_lines) or "- None",
        ]
    )


def _workspace_context(workspace: ManagementWorkspace | None) -> str:
    if workspace is None:
        return "No management workspace selected."
    members = []
    for member in workspace.team_members or []:
        quals = ", ".join(str(item) for item in (member.qualifications or [])[:5])
        members.append(f"- {member.name or 'Unnamed'} ({member.role or 'Role pending'}): {quals or 'No skills listed'}")
    return "\n".join(
        [
            f"Workspace: {workspace.workspace_name}",
            f"Company: {workspace.company_name}",
            f"Stage: {workspace.stage or 'N/A'}",
            f"Revenue: {workspace.annual_revenue or 'N/A'}",
            f"Employee count: {workspace.employee_count or 0}",
            f"Management context: {workspace.description or ''}",
            "Team:",
            "\n".join(members) or "- None",
        ]
    )


def _report_section_blueprint(report_type: str) -> List[str]:
    normalized = _normalize_report_type(report_type)
    blueprints = {
        "viability_report": [
            "Viability Snapshot",
            "Demand and Revenue Signals",
            "Go-To-Market Friction Points",
            "Execution Risks and Triggers",
        ],
        "feasibility_report": [
            "Feasibility Scope",
            "Capability and Delivery Requirements",
            "Operational Readiness",
            "Constraint and Dependency Map",
        ],
        "market_analysis_report": [
            "Market Landscape",
            "Segment Opportunities",
            "Competitive Pressure",
            "Positioning and Narrative Edge",
        ],
        "investment_analysis_report": [
            "Investment Thesis",
            "Return and Cash Dynamics",
            "Capital Allocation Path",
            "Downside Risk Guardrails",
        ],
        "business_report": [
            "Executive Business Pulse",
            "Commercial and Market Outlook",
            "Operational and Team Readiness",
            "Capital and Risk Posture",
        ],
    }
    return blueprints.get(normalized, blueprints["business_report"])


def _fallback_report(
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None,
    report_name: str,
    report_type: str,
) -> Dict[str, Any]:
    metrics = simulation.metrics or {}
    agents = simulation.agents if isinstance(simulation.agents, list) else []
    opportunities = []
    risks = []
    for agent in agents:
        if not isinstance(agent, dict):
            continue
        opportunities.extend(str(item) for item in (agent.get("opportunities") or [])[:2])
        risks.extend(str(item) for item in (agent.get("risks") or [])[:2])

    section_titles = _report_section_blueprint(report_type)
    strongest_metric = max(metrics, key=metrics.get) if metrics else "core execution"
    sections = []
    for index, heading in enumerate(section_titles):
        if index == 0:
            body = (
                f"{simulation.startup_name} currently scores {simulation.overall_score}/100 with strongest momentum in {strongest_metric}. "
                "The current profile suggests a focused execution window where a few disciplined decisions can materially improve founder confidence."
            )
        elif index == 1:
            body = (
                "Signal analysis shows demand and positioning momentum, but outcome quality will depend on how tightly the team prioritizes "
                "one high-confidence segment and converts signals into measurable weekly movement."
            )
        elif index == 2:
            body = (
                f"{workspace.workspace_name if workspace else 'The operating team'} should convert strategy into accountable ownership, "
                "explicit milestones, and short feedback loops to reduce wasted cycles."
            )
        else:
            body = (
                "Risk and capital posture improves when downside assumptions are explicit, mitigation owners are named, "
                "and milestone evidence is linked to each next funding or scaling decision."
            )
        sections.append({"heading": heading, "body": body})

    key_findings = list(dict.fromkeys((opportunities + risks)[:6]))
    recommended_actions = [
        "Lock one primary objective for this report type and attach weekly measurable targets.",
        "Assign every top risk and constraint to a named owner with due date and mitigation signal.",
        "Convert top opportunities into calendar commitments with explicit review checkpoints.",
    ]
    summary = sections[0]["body"]
    return {
        "report_name": report_name,
        "report_type": _normalize_report_type(report_type),
        "summary": summary,
        "sections": sections,
        "key_findings": key_findings,
        "recommended_actions": recommended_actions,
    }


def generate_business_report(
    *,
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None,
    report_name: str,
    report_type: str,
) -> Dict[str, Any]:
    normalized_report_type = _normalize_report_type(report_type)
    fallback = _fallback_report(simulation, workspace, report_name, normalized_report_type)
    if client is None:
        return fallback

    try:
        section_titles = _report_section_blueprint(normalized_report_type)
        response = client.chat.completions.create(
            model=os.getenv("SIMULATION_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert startup operating partner. Return strict JSON with keys: "
                        "summary (string), sections (array of exactly 4 objects with heading and body), "
                        "key_findings (array up to 8), recommended_actions (array up to 6)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Report type: {normalized_report_type}\n"
                        f"Required section headings: {json.dumps(section_titles)}\n\n"
                        f"Report title: {report_name}\n\n"
                        f"Simulation context:\n{_simulation_context(simulation)}\n\n"
                        f"Management context:\n{_workspace_context(workspace)}"
                    ),
                },
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(raw) if raw else {}
        if not isinstance(parsed, dict):
            return fallback
        sections = parsed.get("sections")
        if not isinstance(sections, list) or len(sections) < 4:
            return fallback
        normalized_sections = []
        for item in sections[:4]:
            if not isinstance(item, dict):
                continue
            heading = str(item.get("heading") or "").strip()
            body = str(item.get("body") or "").strip()
            if heading and body:
                normalized_sections.append({"heading": heading[:120], "body": body[:4000]})
        if len(normalized_sections) < 4:
            return fallback
        return {
            "report_name": report_name,
            "report_type": normalized_report_type,
            "summary": str(parsed.get("summary") or fallback["summary"])[:4000],
            "sections": normalized_sections,
            "key_findings": [str(item) for item in parsed.get("key_findings", []) if str(item).strip()][:8]
            or fallback["key_findings"],
            "recommended_actions": [
                str(item) for item in parsed.get("recommended_actions", []) if str(item).strip()
            ][:6]
            or fallback["recommended_actions"],
        }
    except Exception:
        return fallback


def _split_text_points(value: str | None, *, max_items: int = 6) -> List[str]:
    if not value:
        return []
    parts = re.split(r"\n+|[.;]\s+", str(value))
    normalized = [segment.strip(" -\t\r\n") for segment in parts if str(segment).strip(" -\t\r\n")]
    return normalized[:max_items]


def _find_section_body(report: Dict[str, Any], keywords: List[str]) -> str:
    sections = report.get("sections") or []
    lowered_keywords = [item.lower() for item in keywords]
    for section in sections:
        if not isinstance(section, dict):
            continue
        heading = str(section.get("heading") or "").lower()
        if any(keyword in heading for keyword in lowered_keywords):
            return str(section.get("body") or "").strip()
    return ""


def _metric_label(key: str) -> str:
    parts = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z])|\d+", key.replace("_", " "))
    if not parts:
        return key.replace("_", " ").title()
    return " ".join(part.upper() if part.isupper() else part.title() for part in parts)


def _simulation_metric_cards(simulation: SimulationRun) -> List[Dict[str, Any]]:
    metrics = simulation.metrics if isinstance(simulation.metrics, dict) else {}
    return [{"label": _metric_label(key), "value": value} for key, value in metrics.items()]


def _assumption_items_from_payload(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    mapping = [
        ("Market", "Target geography", payload.get("geography")),
        ("Market", "Target audience", payload.get("target_audience")),
        ("Market", "Primary target segment", payload.get("primary_target_segment")),
        ("Market", "Market size estimate", payload.get("market_size_estimate")),
        ("Growth", "Marketing strategy", payload.get("marketing_strategy")),
        ("Growth", "Estimated CAC", payload.get("estimated_cac")),
        ("Finance", "Monthly burn", payload.get("monthly_burn")),
        ("Finance", "Current cash in hand", payload.get("current_cash_in_hand")),
    ]
    items = []
    for category, label, value in mapping:
        if value is None or str(value).strip() == "":
            continue
        items.append(
            {
                "category": category,
                "assumption": label,
                "value": str(value),
                "rationale": "Provided during simulation intake.",
                "source": "Simulation input payload",
            }
        )
    return items


def _agent_lookup(simulation: SimulationRun) -> Dict[str, Dict[str, Any]]:
    agents = simulation.agents if isinstance(simulation.agents, list) else []
    lookup: Dict[str, Dict[str, Any]] = {}
    for agent in agents:
        if not isinstance(agent, dict):
            continue
        perspective = str(agent.get("perspective") or "").strip()
        if perspective:
            lookup[perspective.lower()] = agent
    return lookup


def _workspace_resource_rows(workspace: ManagementWorkspace | None) -> List[Dict[str, Any]]:
    if workspace is None:
        return []
    rows = []
    for member in workspace.team_members or []:
        qualifications = ", ".join(str(item) for item in (member.qualifications or [])[:3])
        rows.append(
            {
                "role": member.role or member.name or "Team member",
                "quantity": "1",
                "timing": "Current team",
                "note": qualifications or member.qualification_notes or "",
            }
        )
    return rows


def _risk_items_from_simulation(simulation: SimulationRun) -> List[Dict[str, Any]]:
    risks: List[Dict[str, Any]] = []
    for agent in simulation.agents if isinstance(simulation.agents, list) else []:
        if not isinstance(agent, dict):
            continue
        perspective = str(agent.get("perspective") or "Agent")
        for item in (agent.get("risks") or [])[:2]:
            text = str(item).strip()
            if not text:
                continue
            risks.append(
                {
                    "name": text[:120],
                    "description": f"Raised by {perspective}.",
                    "severity": "high" if "investor" in perspective.lower() else "medium",
                    "likelihood": "Medium",
                    "impact": "Can materially change execution confidence and near-term traction.",
                    "mitigation": "",
                    "owner": "",
                }
            )
    return risks[:6]


def _appendix_tables(simulation: SimulationRun, report: Dict[str, Any], workspace: ManagementWorkspace | None) -> List[Dict[str, Any]]:
    payload = simulation.input_payload if isinstance(simulation.input_payload, dict) else {}
    tables: List[Dict[str, Any]] = []

    assumption_rows = [[item["assumption"], item["value"], item["source"]] for item in _assumption_items_from_payload(payload)]
    if assumption_rows:
        tables.append(
            {
                "title": "Simulation Assumption Register",
                "columns": ["Assumption", "Value", "Source"],
                "rows": assumption_rows,
                "note": "Captured from the intake and simulation pipeline inputs available today.",
            }
        )

    agent_rows = []
    for agent in simulation.agents if isinstance(simulation.agents, list) else []:
        if not isinstance(agent, dict):
            continue
        agent_rows.append(
            [
                str(agent.get("perspective") or "Agent"),
                str(agent.get("confidence") or ""),
                str(agent.get("summary") or ""),
            ]
        )
    if agent_rows:
        tables.append(
            {
                "title": "Agent Confidence Summary",
                "columns": ["Agent", "Confidence", "Summary"],
                "rows": agent_rows,
                "note": "Generated by the current multi-agent board workflow.",
            }
        )

    if workspace is not None:
        team_rows = []
        for member in workspace.team_members or []:
            team_rows.append(
                [
                    member.name or "",
                    member.role or "",
                    ", ".join(str(item) for item in (member.qualifications or [])[:4]),
                ]
            )
        if team_rows:
            tables.append(
                {
                    "title": "Workspace Team Context",
                    "columns": ["Name", "Role", "Qualifications"],
                    "rows": team_rows,
                    "note": "Pulled from the linked management workspace.",
                }
            )

    return tables


def _glossary_items(simulation: SimulationRun) -> List[Dict[str, str]]:
    payload = simulation.input_payload if isinstance(simulation.input_payload, dict) else {}
    items = []
    if payload.get("market_size_estimate"):
        items.append({"term": "TAM/SAM/SOM", "definition": "Layered market-sizing estimates used to frame reachable demand."})
    if payload.get("estimated_cac"):
        items.append({"term": "CAC", "definition": "Customer acquisition cost used to evaluate early channel efficiency."})
    if payload.get("monthly_burn"):
        items.append({"term": "Burn", "definition": "The monthly cash consumption level assumed for the startup."})
    if simulation.metrics:
        items.append({"term": "Overall Score", "definition": "Composite score synthesized from the active simulation agents."})
    return items


def _build_professional_report_input(
    report: Dict[str, Any],
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None = None,
    report_type: str = "business_report",
) -> Dict[str, Any]:
    profile = _report_title_profile(report_type)
    normalized_report_type = profile["report_type"]
    generator_profile = _generator_report_profile(normalized_report_type)
    payload = simulation.input_payload if isinstance(simulation.input_payload, dict) else {}
    agent_lookup = _agent_lookup(simulation)
    market_agent = agent_lookup.get("market analyst", {})
    customer_agent = agent_lookup.get("customer agent", {})
    investor_agent = agent_lookup.get("investor agent", {})
    key_findings = [str(item) for item in report.get("key_findings", []) if str(item).strip()]
    recommended_actions = [str(item) for item in report.get("recommended_actions", []) if str(item).strip()]
    target_segments = [
        value
        for value in [
            payload.get("target_audience"),
            payload.get("primary_target_segment"),
            payload.get("geography"),
        ]
        if value and str(value).strip()
    ]
    assumptions = _assumption_items_from_payload(payload)
    simulation_metric_cards = _simulation_metric_cards(simulation)
    workspace_resources = _workspace_resource_rows(workspace)
    simulation_risks = _risk_items_from_simulation(simulation)
    appendix_tables = _appendix_tables(simulation, report, workspace) if generator_profile == "comprehensive" else []
    glossary_items = _glossary_items(simulation) if generator_profile == "comprehensive" else []

    financial_inputs_rows = []
    for label, value in [
        ("Monthly Burn", payload.get("monthly_burn")),
        ("Estimated CAC", payload.get("estimated_cac")),
        ("Current Cash in Hand", payload.get("current_cash_in_hand")),
    ]:
        if value and str(value).strip():
            financial_inputs_rows.append([label, str(value)])

    methodology_notes = ["Current simulation combines multi-agent market, customer, and investor reviews."]
    if not report.get("sections"):
        methodology_notes.append("Narrative report sections were generated from fallback report logic.")
    if not payload.get("market_size_estimate"):
        methodology_notes.append("No numeric market size model was provided in the current input payload.")

    return {
        "startup_name": simulation.startup_name,
        "report_title": profile["report_title"],
        "subtitle": profile["subtitle"],
        "report_type": generator_profile,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "executive_summary": {
            "idea_overview": report.get("summary") or simulation.synthesis or payload.get("elevator_pitch") or "",
            "viability_score": simulation.overall_score,
            "success_probability": (simulation.overall_score or 0) / 100 if simulation.overall_score is not None else None,
            "biggest_risks": [item["name"] for item in simulation_risks[:3]],
            "call_to_action": recommended_actions[0] if recommended_actions else "",
            "highlights": simulation_metric_cards,
        },
        "business_idea": {
            "problem_statement": payload.get("problem_statement") or "",
            "solution_summary": payload.get("elevator_pitch") or "",
            "idea_overview": report.get("summary") or "",
            "value_proposition": simulation.synthesis or "",
            "target_customer_segments": target_segments,
            "key_assumptions": assumptions,
        },
        "methodology": {
            "summary": "This report uses the current agentic simulation pipeline outputs and any linked workspace context to produce an execution-oriented feasibility narrative.",
            "simulation_types": [agent.get("perspective") for agent in simulation.agents or [] if isinstance(agent, dict) and agent.get("perspective")],
            "parameters_varied": [item["assumption"] for item in assumptions],
            "data_sources": [
                "Simulation input payload",
                "Agent summaries, risks, and opportunities",
                "Management workspace context" if workspace is not None else "No workspace context attached",
            ],
            "transparency_notes": methodology_notes,
        },
        "market_feasibility": {
            "summary": _find_section_body(report, ["market", "demand"]) or str(market_agent.get("summary") or ""),
            "tam": payload.get("market_size_estimate"),
            "target_audience_insights": list(
                dict.fromkeys(
                    target_segments
                    + [str(item) for item in (customer_agent.get("opportunities") or []) if str(item).strip()]
                )
            )[:6],
            "competitive_landscape": _split_text_points(payload.get("competitor_patterns"), max_items=4)
            or [str(item) for item in (market_agent.get("risks") or [])[:4]],
            "key_metrics": simulation_metric_cards,
        },
        "technical_feasibility": {
            "summary": _find_section_body(report, ["technical"]) or "",
            "tech_stack": [],
            "build_requirements": [],
            "resource_needs": workspace_resources,
            "technical_risks": [],
            "mitigations": [],
        },
        "financial_viability": {
            "summary": _find_section_body(report, ["capital", "financial", "risk"]) or str(investor_agent.get("summary") or ""),
            "break_even_analysis": "Break-even timing was not explicitly modeled in the current simulation payload.",
            "unit_economics": [
                {"label": "Estimated CAC", "value": payload.get("estimated_cac")}
                for _ in [0]
                if payload.get("estimated_cac")
            ]
            + [
                {"label": "Monthly Burn", "value": payload.get("monthly_burn")}
                for _ in [0]
                if payload.get("monthly_burn")
            ]
            + [
                {"label": "Current Cash", "value": payload.get("current_cash_in_hand")}
                for _ in [0]
                if payload.get("current_cash_in_hand")
            ],
            "tables": [
                {
                    "title": "Current Financial Inputs",
                    "columns": ["Metric", "Value"],
                    "rows": financial_inputs_rows,
                    "note": "These figures were available in the source simulation payload.",
                }
            ]
            if financial_inputs_rows
            else [],
        },
        "operational_feasibility": {
            "summary": _find_section_body(report, ["operations", "team"]) or _workspace_context(workspace),
            "team_requirements": workspace_resources,
            "operations_plan_results": recommended_actions[:4],
            "scalability_assessment": simulation.synthesis or "",
        },
        "risk_assessment": {
            "summary": str(investor_agent.get("summary") or simulation.synthesis or ""),
            "top_risks": simulation_risks,
            "mitigation_strategies": recommended_actions[:6],
        },
        "legal_regulatory": {
            "summary": "",
            "key_flags": [],
            "next_steps": [],
            "sustainability_considerations": [],
        },
        "conclusions": {
            "overall_verdict": simulation.synthesis or report.get("summary") or "",
            "prioritized_next_steps": [
                {
                    "action": action,
                    "priority": "High" if index < 2 else "Medium",
                    "owner": "",
                    "timeline": "Next 30-90 days",
                    "rationale": "",
                }
                for index, action in enumerate(recommended_actions[:6])
            ],
            "investor_pitch_summary": key_findings[:6],
        },
        "appendices": {
            "raw_data_tables": appendix_tables,
            "glossary": glossary_items,
        },
        "key_metrics": simulation_metric_cards,
        "assumptions": assumptions,
        "simulation_results": {
            "overall_score": simulation.overall_score,
            "metrics": simulation.metrics or {},
            "recommendations": simulation.recommendations or [],
            "report_sections": report.get("sections") or [],
            "workspace": {
                "workspace_name": workspace.workspace_name if workspace else None,
                "company_name": workspace.company_name if workspace else None,
            },
        },
    }


def _build_legacy_report_html(report: Dict[str, Any], simulation: SimulationRun) -> str:
    sections = report.get("sections") or []
    findings = report.get("key_findings") or []
    actions = report.get("recommended_actions") or []
    section_html = "".join(
        f"<section><h2>{str(item.get('heading') or 'Section')}</h2><p>{str(item.get('body') or '')}</p></section>"
        for item in sections
        if isinstance(item, dict)
    )
    findings_html = "".join(f"<li>{str(item)}</li>" for item in findings)
    actions_html = "".join(f"<li>{str(item)}</li>" for item in actions)
    return (
        "<html><head><meta charset='utf-8'><title>"
        f"{str(report.get('report_name') or 'Business Insight Report')}</title>"
        "<style>body{font-family:Arial,sans-serif;line-height:1.55;margin:40px;color:#16202c}"
        "h1,h2{color:#0b365d}h1{margin-bottom:0}p.meta{color:#5b6573;font-size:13px}"
        "section{margin:24px 0}ul{padding-left:20px}</style></head><body>"
        f"<h1>{str(report.get('report_name') or 'Business Insight Report')}</h1>"
        f"<p class='meta'>Startup: {simulation.startup_name} | Generated: {datetime.now(timezone.utc).isoformat()}</p>"
        f"<p>{str(report.get('summary') or '')}</p>"
        f"{section_html}"
        "<section><h2>Key Findings</h2><ul>"
        f"{findings_html}"
        "</ul></section>"
        "<section><h2>Recommended Actions</h2><ul>"
        f"{actions_html}"
        "</ul></section>"
        "</body></html>"
    )


def _template_branding_overrides(
    template_id: str | None,
    quality: str = "standard",
    theme_tokens: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    template = get_report_template(template_id)
    tokens = dict(template.get("theme_tokens") or {})
    if isinstance(theme_tokens, dict):
        tokens.update({k: v for k, v in theme_tokens.items() if v is not None})
    if quality == "premium":
        tokens.setdefault("accent_color", "#D97706")
    return {
        "primary_color": tokens.get("primary_color"),
        "secondary_color": tokens.get("secondary_color"),
        "accent_color": tokens.get("accent_color"),
    }


def _inject_template_css(html: str, template_id: str | None, quality: str = "standard") -> str:
    template = get_report_template(template_id)
    template_key = template["template_id"]
    premium_rules = ""
    if quality == "premium":
        premium_rules = """
        html { font-size: 10.8pt; }
        .metric-card, .detail-card, .chart-card { box-shadow: 0 12px 28px rgba(24, 37, 50, 0.08); }
        .section-header { border-bottom-width: 2.5px; }
        """
    template_rules = {
        "signal_compact": """
        h1, h2, h3 { font-family: 'Segoe UI', Arial, sans-serif; }
        .metric-card, .detail-card, .chart-card { border-radius: 8px; }
        .section { margin-bottom: 18px; }
        """,
        "obsidian_board": """
        body { background: #0b1220; color: #e5e7eb; }
        .section, .metric-card, .detail-card, .chart-card, .summary-card { background: #0f172a; border-color: #1f2937; }
        .section-title, h1, h2, h3 { color: #e2e8f0; }
        .section-header { border-bottom-color: #334155; }
        .pill { background: rgba(14, 165, 233, 0.12); color: #7dd3fc; border-color: rgba(125, 211, 252, 0.45); }
        """,
        "market_storyline": """
        h1, h2, h3 { letter-spacing: 0.01em; }
        .section-title { color: #0b3a5d; }
        .pill { font-size: 8pt; color: #0b3a5d; }
        """,
        "capital_thesis": """
        .metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .metric-value { font-size: 19pt; }
        .section-title { color: #1d4ed8; }
        """,
        "feasibility_blueprint": """
        .section-title { color: #0f766e; }
        .detail-card, .metric-card { border-style: dashed; }
        """,
    }.get(template_key, "")
    style = f"<style id=\"report-template-overrides\">{template_rules}{premium_rules}</style>"
    return html.replace("</head>", f"{style}</head>") if "</head>" in html else f"{style}{html}"


def _inject_document_theme_css(
    html: str,
    theme_tokens: Dict[str, Any] | None,
    page_setup: Dict[str, Any] | None = None,
) -> str:
    if not isinstance(theme_tokens, dict):
        theme_tokens = {}
    if not isinstance(page_setup, dict):
        page_setup = {}

    css_rules: List[str] = []
    page_background = str(page_setup.get("background") or theme_tokens.get("page_background") or "").strip()
    text_color = str(theme_tokens.get("text_color") or "").strip()
    page_border = str(theme_tokens.get("page_border") or "").strip()
    font_scale = page_setup.get("font_scale")
    font_family = str(page_setup.get("font_family") or "").strip()
    page_size = str(page_setup.get("size") or "").strip()
    if page_size.lower() in {"fluid", "full", "auto"}:
        page_size = "A4"
    margins = page_setup.get("margins") if isinstance(page_setup.get("margins"), dict) else {}
    page_margin = theme_tokens.get("page_margin")

    if page_background:
        css_rules.append(f"body {{ background: {page_background} !important; }}")
    if text_color:
        css_rules.append(f"body {{ color: {text_color} !important; }}")
    if page_border:
        css_rules.append(
            f".section, .detail-card, .metric-card, .chart-card, .summary-card {{ border-color: {page_border} !important; }}"
        )
    if font_family:
        css_rules.append(f"body, h1, h2, h3, h4 {{ font-family: '{font_family}', 'Segoe UI', Arial, sans-serif !important; }}")
    try:
        if font_scale is not None:
            scale = max(85, min(130, int(font_scale)))
            css_rules.append(f"html {{ font-size: {scale / 100:.3f}em; }}")
    except (TypeError, ValueError):
        pass

    try:
        if margins:
            top = max(12, min(120, int(margins.get("top", 40))))
            right = max(12, min(120, int(margins.get("right", 40))))
            bottom = max(12, min(120, int(margins.get("bottom", 40))))
            left = max(12, min(120, int(margins.get("left", 40))))
            if page_size:
                css_rules.append(f"@page {{ size: {page_size}; margin: {top}px {right}px {bottom}px {left}px; }}")
            else:
                css_rules.append(f"@page {{ margin: {top}px {right}px {bottom}px {left}px; }}")
        elif page_margin is not None:
            margin_px = max(16, min(96, int(page_margin)))
            if page_size:
                css_rules.append(f"@page {{ size: {page_size}; margin: {margin_px}px; }}")
            else:
                css_rules.append(f"@page {{ margin: {margin_px}px; }}")
        elif page_size:
            css_rules.append(f"@page {{ size: {page_size}; }}")
    except (TypeError, ValueError):
        pass

    if not css_rules:
        return html

    style = "<style id=\"report-document-theme-overrides\">" + " ".join(css_rules) + "</style>"
    return html.replace("</head>", f"{style}</head>") if "</head>" in html else f"{style}{html}"


def _inject_page_chrome(html: str, header_text: str = "", footer_text: str = "") -> str:
    normalized_header = str(header_text or "").strip()
    normalized_footer = str(footer_text or "").strip()
    if not normalized_header and not normalized_footer:
        return html

    style = """
    <style id="report-document-chrome">
      .report-document-header {
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;
        text-align: center;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #64748b;
      }
      .report-document-footer {
        margin-top: 24px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 10px;
        letter-spacing: 0.08em;
        color: #64748b;
      }
    </style>
    """
    patched = html.replace("</head>", f"{style}</head>") if "</head>" in html else f"{style}{html}"

    if normalized_header:
        header_markup = f'<div class="report-document-header">{html_lib.escape(normalized_header)}</div>'
        body_start = patched.find("<body")
        if body_start >= 0:
            body_open_end = patched.find(">", body_start)
            if body_open_end >= 0:
                patched = patched[: body_open_end + 1] + header_markup + patched[body_open_end + 1 :]
            else:
                patched = header_markup + patched
        else:
            patched = header_markup + patched

    if normalized_footer:
        footer_markup = f'<div class="report-document-footer">{html_lib.escape(normalized_footer)}</div>'
        if "</body>" in patched:
            patched = patched.replace("</body>", f"{footer_markup}</body>", 1)
        else:
            patched = patched + footer_markup

    return patched


def build_report_html(
    report: Dict[str, Any],
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None = None,
    report_type: str = "business_report",
    template_id: str = "obsidian_board",
    quality: str = "standard",
    theme_tokens: Dict[str, Any] | None = None,
    allow_legacy_fallback: bool = False,
) -> str:
    normalized_report_type = _normalize_report_type(report_type)
    report_input = _build_professional_report_input(
        report,
        simulation,
        workspace,
        report_type=normalized_report_type,
    )
    branding = {
        "company_name": simulation.startup_name,
        "report_title": report_input.get("report_title") or "Startup Idea Simulation & Feasibility Report",
        "subtitle": report_input.get("subtitle") or "",
        "system_name": "PetraAI",
        **_template_branding_overrides(template_id=template_id, quality=quality, theme_tokens=theme_tokens),
    }
    try:
        html = report_generator.preview_html(
            report_input,
            branding=branding,
            report_type=normalized_report_type,
        )
        return _inject_template_css(html, template_id=template_id, quality=quality)
    except Exception:
        if not allow_legacy_fallback:
            raise
        return _build_legacy_report_html(report, simulation)


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_legacy_report_pdf(report: Dict[str, Any], simulation: SimulationRun) -> bytes:
    lines = [
        str(report.get("report_name") or "Business Insight Report"),
        f"Startup: {simulation.startup_name}",
        f"Generated: {datetime.utcnow().isoformat()}",
        "",
    ]
    lines.extend(textwrap.wrap(str(report.get("summary") or ""), width=90))
    lines.append("")
    for section in report.get("sections") or []:
        lines.append(str(section.get("heading") or "Section"))
        lines.extend(textwrap.wrap(str(section.get("body") or ""), width=90))
        lines.append("")
    if report.get("key_findings"):
        lines.append("Key Findings")
        for item in report["key_findings"]:
            lines.extend(textwrap.wrap(f"- {item}", width=90))
        lines.append("")
    if report.get("recommended_actions"):
        lines.append("Recommended Actions")
        for item in report["recommended_actions"]:
            lines.extend(textwrap.wrap(f"- {item}", width=90))

    page_size = 44
    pages = [lines[index:index + page_size] for index in range(0, len(lines), page_size)] or [[]]
    objects: List[str] = []
    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{3 + index * 2} 0 R" for index in range(len(pages)))
    objects.append(f"<< /Type /Pages /Count {len(pages)} /Kids [{kids}] >>")
    font_id = 3 + len(pages) * 2

    for index, page in enumerate(pages):
        page_obj_id = 3 + index * 2
        content_obj_id = page_obj_id + 1
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_obj_id} 0 R >>"
        )
        y = 760
        content_lines = ["BT", "/F1 11 Tf", "50 0 0 50 0 0 Tm"]
        for line in page:
            escaped_line = _pdf_escape(line[:120])
            content_lines.append(f"1 0 0 1 50 {y} Tm ({escaped_line}) Tj")
            y -= 16
        content_lines.append("ET")
        stream = "\n".join(content_lines)
        objects.append(f"<< /Length {len(stream.encode('latin-1', errors='ignore'))} >>\nstream\n{stream}\nendstream")

    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    parts = ["%PDF-1.4\n"]
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(sum(len(part.encode("latin-1")) for part in parts))
        parts.append(f"{index} 0 obj\n{obj}\nendobj\n")
    xref_offset = sum(len(part.encode("latin-1")) for part in parts)
    parts.append(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n")
    for offset in offsets[1:]:
        parts.append(f"{offset:010d} 00000 n \n")
    parts.append(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF")
    return "".join(parts).encode("latin-1", errors="ignore")


def build_report_pdf(
    report: Dict[str, Any],
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None = None,
    report_type: str = "business_report",
    template_id: str = "obsidian_board",
    quality: str = "standard",
    theme_tokens: Dict[str, Any] | None = None,
    allow_legacy_fallback: bool = False,
) -> bytes:
    normalized_report_type = _normalize_report_type(report_type)
    report_input = _build_professional_report_input(
        report,
        simulation,
        workspace,
        report_type=normalized_report_type,
    )
    branding = {
        "company_name": simulation.startup_name,
        "report_title": report_input.get("report_title") or "Startup Idea Simulation & Feasibility Report",
        "subtitle": report_input.get("subtitle") or "",
        "system_name": "PetraAI",
        **_template_branding_overrides(template_id=template_id, quality=quality, theme_tokens=theme_tokens),
    }
    try:
        html = report_generator.preview_html(
            report_input,
            branding=branding,
            report_type=normalized_report_type,
        )
        html = _inject_template_css(html, template_id=template_id, quality=quality)
        return build_report_pdf_from_html(html)
    except Exception:
        if not allow_legacy_fallback:
            raise
        return _build_legacy_report_pdf(report, simulation)


def build_report_pdf_from_html(
    html: str,
) -> bytes:
    try:
        return report_generator._render_pdf_bytes(html)
    except Exception:
        raise


def build_report_html_from_document(
    document_json: Dict[str, Any],
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None = None,
    template_id: str | None = None,
    quality: str = "standard",
) -> str:
    payload = document_json_to_report_payload(document_json if isinstance(document_json, dict) else {})
    meta = document_json.get("meta") if isinstance(document_json, dict) and isinstance(document_json.get("meta"), dict) else {}
    resolved_template_id = (template_id or meta.get("template_id") or "obsidian_board").strip().lower()
    report_type = _normalize_report_type(meta.get("report_type"))
    theme_tokens = meta.get("theme_tokens") if isinstance(meta.get("theme_tokens"), dict) else {}
    page_setup = meta.get("page_setup") if isinstance(meta.get("page_setup"), dict) else {}
    html = build_report_html(
        payload,
        simulation,
        workspace,
        report_type=report_type,
        template_id=resolved_template_id,
        quality=quality,
        theme_tokens=theme_tokens,
    )
    html = _inject_document_theme_css(html, theme_tokens, page_setup=page_setup)
    html = _inject_page_chrome(
        html,
        header_text=str(page_setup.get("header") or theme_tokens.get("page_header") or ""),
        footer_text=str(page_setup.get("footer") or theme_tokens.get("page_footer") or ""),
    )
    return html


def build_calendar_suggestions(
    *,
    workspace: ManagementWorkspace,
    plan_run: ManagementPlanRun | None,
    simulation: SimulationRun | None,
    prompt: str = "",
) -> List[Dict[str, Any]]:
    created_at = plan_run.created_at if plan_run else datetime.utcnow()
    activities = plan_run.activities if plan_run and isinstance(plan_run.activities, list) else []
    suggestions: List[Dict[str, Any]] = []

    for activity in activities[:3]:
        if not isinstance(activity, dict):
            continue
        week_target = max(1, int(activity.get("week_target") or 1))
        start_at = created_at + timedelta(days=(week_target - 1) * 7)
        title = str(activity.get("title") or "Execution checkpoint")
        description = str(activity.get("rationale") or prompt or "Agent suggested execution checkpoint.")
        suggestions.append(
            {
                "title": title,
                "description": description[:5000],
                "event_type": "TASK",
                "priority": str(activity.get("priority") or "MEDIUM").upper(),
                "starts_at": start_at,
                "ends_at": start_at + timedelta(hours=1),
                "source": "AGENT",
                "permission_status": "PENDING",
                "workspace_id": workspace.id,
                "simulation_id": simulation.id if simulation else None,
            }
        )

    if not suggestions and simulation is not None:
        suggestions.append(
            {
                "title": f"Review {simulation.startup_name} simulation insights",
                "description": prompt or "Agent suggested review session based on latest simulation output.",
                "event_type": "REVIEW",
                "priority": "HIGH",
                "starts_at": datetime.utcnow() + timedelta(days=1),
                "ends_at": datetime.utcnow() + timedelta(days=1, hours=1),
                "source": "AGENT",
                "permission_status": "PENDING",
                "workspace_id": workspace.id,
                "simulation_id": simulation.id,
            }
        )

    return suggestions[:3]
