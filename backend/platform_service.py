from __future__ import annotations

import json
import hashlib
import html as html_lib
import math
import os
import re
import textwrap
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from urllib.parse import quote
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
_DOCUMENT_FONT_FAMILIES = {
    "Source Serif 4",
    "Inter",
    "Merriweather",
    "Lora",
    "IBM Plex Sans",
    "Georgia",
}
_DOCUMENT_PAGE_SIZES = {"A4", "LETTER"}

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


def _legacy_report_payload_to_document_json(
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


def enrich_document_with_generated_visuals(
    document_json: Dict[str, Any],
    simulation: SimulationRun,
    report_type: str | None = None,
) -> Dict[str, Any]:
    if not isinstance(document_json, dict):
        return {}

    sections = document_json.get("sections")
    if not isinstance(sections, list):
        sections = []
        document_json["sections"] = sections

    has_chart = False
    for section in sections:
        if not isinstance(section, dict):
            continue
        blocks = section.get("blocks")
        if not isinstance(blocks, list):
            continue
        if any(isinstance(block, dict) and str(block.get("type") or "").lower() == "chart" for block in blocks):
            has_chart = True
            break

    if has_chart:
        return document_json

    metrics = simulation.metrics if isinstance(simulation.metrics, dict) else {}
    labels: List[str] = []
    values: List[float] = []
    for key, raw_value in metrics.items():
        numeric = _to_number(raw_value)
        if numeric is None:
            continue
        labels.append(_metric_label(str(key)))
        values.append(float(numeric))
        if len(labels) >= 5:
            break

    if not labels:
        labels = ["Overall Score", "Execution", "Market", "Capital"]
        overall = float(_to_number(simulation.overall_score) or 0.0)
        values = [
            overall,
            max(0.0, min(100.0, overall * 0.92 + 4)),
            max(0.0, min(100.0, overall * 0.96 + 2)),
            max(0.0, min(100.0, overall * 0.88 + 6)),
        ]

    normalized_type = _normalize_report_type(report_type)
    chart_titles = {
        "viability_report": "Viability Signal Snapshot",
        "feasibility_report": "Feasibility Signal Snapshot",
        "market_analysis_report": "Market Signal Snapshot",
        "investment_analysis_report": "Investment Signal Snapshot",
        "business_report": "Business Signal Snapshot",
    }
    chart_title = chart_titles.get(normalized_type, "Signal Snapshot")

    target_section = None
    if sections:
        target_section = sections[0] if isinstance(sections[0], dict) else None
    if target_section is None:
        target_section = {
            "section_id": str(uuid4()),
            "title": "Executive Summary",
            "order": 0,
            "blocks": [],
        }
        sections.append(target_section)

    target_blocks = target_section.get("blocks")
    if not isinstance(target_blocks, list):
        target_blocks = []
        target_section["blocks"] = target_blocks

    chart_block = _new_block(
        "chart",
        len(target_blocks),
        {
            "title": chart_title,
            "chart_type": "bar",
            "labels": labels,
            "series": [
                {
                    "name": "Score",
                    "values": [round(value, 2) for value in values],
                }
            ],
            "legend": True,
            "notes": "Generated from simulation metrics and score signals.",
            "colors": ["#0ea5e9", "#22c55e", "#f59e0b", "#f97316", "#8b5cf6"],
        },
    )
    target_blocks.append(chart_block)

    return document_json


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
    initial_document_json: Dict[str, Any] | None = None,
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
        if isinstance(initial_document_json, dict) and isinstance(initial_document_json.get("sections"), list) and initial_document_json.get("sections"):
            document_json = initial_document_json
        else:
            document_json = report_payload_to_document_json(
                {
                    "report_name": report.report_name,
                    "summary": report.summary,
                    "sections": report.sections or [],
                    "key_findings": report.key_findings or [],
                    "recommended_actions": report.recommended_actions or [],
                },
                report_type=getattr(report, "report_type", "business_report"),
                template_id=getattr(report, "template_id", "obsidian_board"),
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


def plan_report_outline(
    *,
    simulation: SimulationRun,
    report_name: str,
    report_type: str,
) -> List[Dict[str, str]]:
    """Lightweight LLM call that returns a 4-page outline: [{heading, description}].
    Falls back to blueprint headings with empty descriptions when LLM is unavailable."""
    normalized = _normalize_report_type(report_type)
    fallback_headings = _report_section_blueprint(normalized)
    fallback = [{"heading": h, "description": ""} for h in fallback_headings]

    if client is None:
        return fallback

    try:
        response = client.chat.completions.create(
            model=os.getenv("SIMULATION_MODEL", "gpt-4o-mini"),
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strategic report architect. "
                        "Return strict JSON with key 'outline': an array of exactly 4 objects, each with "
                        "'heading' (max 80 chars — specific to this startup, not generic) and "
                        "'description' (1-2 sentences about what this page will cover, max 200 chars). "
                        "Headings must feel tailored to the startup context, not generic section titles."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Report type: {normalized}\n"
                        f"Report title: {report_name}\n\n"
                        f"Startup context:\n{_simulation_context(simulation)}\n\n"
                        "Generate a 4-page report outline with specific, insight-driven headings "
                        "and brief descriptions of what each page will cover."
                    ),
                },
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(raw) if raw else {}
        outline = parsed.get("outline")
        if not isinstance(outline, list) or len(outline) < 2:
            return fallback
        result = []
        for item in outline[:6]:
            if not isinstance(item, dict):
                continue
            heading = str(item.get("heading") or "").strip()[:120]
            description = str(item.get("description") or "").strip()[:500]
            if heading:
                result.append({"heading": heading, "description": description})
        return result if len(result) >= 2 else fallback
    except Exception:
        return fallback


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


def _clamp_int(value: Any, *, minimum: int, maximum: int, fallback: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = fallback
    return max(minimum, min(maximum, parsed))


def _safe_hex_color(value: Any) -> str:
    token = str(value or "").strip()
    return token if re.fullmatch(r"#[0-9a-fA-F]{6}", token) else ""


def _sanitize_layout_guidance(layout_guidance: Any) -> Dict[str, Any]:
    if not isinstance(layout_guidance, dict):
        return {}

    sanitized: Dict[str, Any] = {}

    page_setup = layout_guidance.get("page_setup")
    if isinstance(page_setup, dict):
        normalized_page_setup: Dict[str, Any] = {}
        size = str(page_setup.get("size") or "").strip().upper()
        if size in _DOCUMENT_PAGE_SIZES:
            normalized_page_setup["size"] = size
        font_family = str(page_setup.get("font_family") or "").strip()
        if font_family in _DOCUMENT_FONT_FAMILIES:
            normalized_page_setup["font_family"] = font_family
        if page_setup.get("font_scale") is not None:
            normalized_page_setup["font_scale"] = _clamp_int(
                page_setup.get("font_scale"),
                minimum=85,
                maximum=130,
                fallback=100,
            )
        background = _safe_hex_color(page_setup.get("background"))
        if background:
            normalized_page_setup["background"] = background

        margins = page_setup.get("margins")
        if isinstance(margins, dict):
            normalized_page_setup["margins"] = {
                "top": _clamp_int(margins.get("top"), minimum=16, maximum=120, fallback=40),
                "right": _clamp_int(margins.get("right"), minimum=16, maximum=120, fallback=40),
                "bottom": _clamp_int(margins.get("bottom"), minimum=16, maximum=120, fallback=40),
                "left": _clamp_int(margins.get("left"), minimum=16, maximum=120, fallback=40),
            }

        header = str(page_setup.get("header") or "").strip()
        footer = str(page_setup.get("footer") or "").strip()
        if header:
            normalized_page_setup["header"] = header[:120]
        if footer:
            normalized_page_setup["footer"] = footer[:120]
        if normalized_page_setup:
            sanitized["page_setup"] = normalized_page_setup

    section_titles = layout_guidance.get("section_titles")
    if isinstance(section_titles, list):
        sanitized_titles = [str(item).strip()[:120] for item in section_titles if str(item).strip()]
        if sanitized_titles:
            sanitized["section_titles"] = sanitized_titles

    section_order = layout_guidance.get("section_order")
    if isinstance(section_order, list):
        normalized_order = []
        for item in section_order:
            try:
                normalized_order.append(int(item))
            except (TypeError, ValueError):
                continue
        if normalized_order:
            sanitized["section_order"] = normalized_order

    theme_tokens = layout_guidance.get("theme_tokens")
    if isinstance(theme_tokens, dict):
        normalized_theme: Dict[str, Any] = {}
        for key in ["primary_color", "secondary_color", "accent_color", "text_color", "page_border"]:
            safe_value = _safe_hex_color(theme_tokens.get(key))
            if safe_value:
                normalized_theme[key] = safe_value
        if normalized_theme:
            sanitized["theme_tokens"] = normalized_theme

    cover = layout_guidance.get("cover")
    if isinstance(cover, dict):
        normalized_cover: Dict[str, Any] = {}
        for key, max_len in {
            "kicker": 120,
            "title": 180,
            "subtitle": 240,
            "startup_name": 180,
            "generated_on": 80,
            "report_id": 120,
            "prepared_by": 120,
        }.items():
            value = str(cover.get(key) or "").strip()
            if value:
                normalized_cover[key] = value[:max_len]
        if normalized_cover:
            sanitized["cover"] = normalized_cover

    return sanitized


def _apply_layout_guidance_to_document(document_json: Dict[str, Any], layout_guidance: Dict[str, Any] | None) -> Dict[str, Any]:
    if not isinstance(document_json, dict) or not isinstance(layout_guidance, dict) or not layout_guidance:
        return document_json

    meta = document_json.get("meta")
    if not isinstance(meta, dict):
        meta = {}
        document_json["meta"] = meta

    page_setup = meta.get("page_setup")
    if not isinstance(page_setup, dict):
        page_setup = {}
        meta["page_setup"] = page_setup

    guidance_page_setup = layout_guidance.get("page_setup")
    if isinstance(guidance_page_setup, dict):
        page_setup.update(guidance_page_setup)

    theme_tokens = meta.get("theme_tokens")
    if not isinstance(theme_tokens, dict):
        theme_tokens = {}
        meta["theme_tokens"] = theme_tokens
    guidance_tokens = layout_guidance.get("theme_tokens")
    if isinstance(guidance_tokens, dict):
        theme_tokens.update(guidance_tokens)

    cover = meta.get("cover")
    if not isinstance(cover, dict):
        cover = {}
        meta["cover"] = cover
    guidance_cover = layout_guidance.get("cover")
    if isinstance(guidance_cover, dict):
        cover.update(guidance_cover)

    sections = document_json.get("sections")
    if not isinstance(sections, list) or not sections:
        return document_json

    titles = layout_guidance.get("section_titles")
    if isinstance(titles, list):
        for index, title in enumerate(titles[: len(sections)]):
            if not isinstance(sections[index], dict):
                continue
            sanitized_title = str(title).strip()
            if sanitized_title:
                sections[index]["title"] = sanitized_title

    order = layout_guidance.get("section_order")
    if isinstance(order, list):
        valid_indices = [index for index in order if isinstance(index, int) and 0 <= index < len(sections)]
        seen: set[int] = set()
        unique = []
        for index in valid_indices:
            if index in seen:
                continue
            seen.add(index)
            unique.append(index)
        if unique:
            remaining = [index for index in range(len(sections)) if index not in seen]
            reordered = [sections[index] for index in unique + remaining]
            for idx, section in enumerate(reordered):
                if isinstance(section, dict):
                    section["order"] = idx
            document_json["sections"] = reordered

    return document_json


def generate_business_report(
    *,
    simulation: SimulationRun,
    workspace: ManagementWorkspace | None,
    report_name: str,
    report_type: str,
    outline: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    normalized_report_type = _normalize_report_type(report_type)
    # Derive section titles from approved outline if provided, else use blueprint
    if outline and len(outline) >= 2:
        section_titles = [item["heading"] for item in outline]
    else:
        section_titles = _report_section_blueprint(normalized_report_type)

    fallback = _fallback_report(simulation, workspace, report_name, normalized_report_type)
    # Override fallback headings with outline titles when provided
    if outline and len(outline) >= 2:
        for i, item in enumerate(outline[:len(fallback["sections"])]):
            if i < len(fallback["sections"]):
                fallback["sections"][i]["heading"] = item["heading"]

    if client is None:
        return fallback

    try:
        # Build outline context string for the LLM when an approved outline exists
        outline_context = ""
        if outline and len(outline) >= 2:
            lines = [f"  {i+1}. {item['heading']}" + (f" — {item['description']}" if item.get('description') else "")
                     for i, item in enumerate(outline)]
            outline_context = "Approved outline (use these headings verbatim):\n" + "\n".join(lines) + "\n\n"

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
                        "key_findings (array up to 8), recommended_actions (array up to 6), "
                        "layout_guidance (object, optional). "
                        "layout_guidance may include: page_setup {size(A4|LETTER), margins{top,right,bottom,left}, "
                        "font_family, font_scale, background, header, footer}, "
                        "section_titles(array of 4 strings), section_order(array of 4 indices), "
                        "theme_tokens{primary_color,secondary_color,accent_color,text_color,page_border}, "
                        "cover{kicker,title,subtitle,startup_name,generated_on,report_id,prepared_by}."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Report type: {normalized_report_type}\n"
                        f"Required section headings: {json.dumps(section_titles)}\n\n"
                        f"{outline_context}"
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
        layout_guidance = _sanitize_layout_guidance(parsed.get("layout_guidance"))
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
            "layout_guidance": layout_guidance,
        }
    except Exception:
        return fallback


def _split_text_points(value: str | None, *, max_items: int = 6) -> List[str]:
    if not value:
        return []
    parts = re.split(r"\n+|[.;]\s+", str(value))
    normalized = [segment.strip(" -\t\r\n") for segment in parts if str(segment).strip(" -\t\r\n")]
    return normalized[:max_items]


def _to_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    normalized = re.sub(r"[^0-9.\-]", "", text)
    if normalized in {"", "-", ".", "-."}:
        return None
    try:
        return float(normalized)
    except ValueError:
        return None


def _format_chart_number(value: float) -> str:
    magnitude = abs(value)
    if magnitude >= 1_000_000_000:
        return f"{value / 1_000_000_000:.1f}B"
    if magnitude >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if magnitude >= 1_000:
        return f"{value / 1_000:.1f}K"
    if value.is_integer():
        return f"{int(value)}"
    return f"{value:.1f}"


def _svg_data_uri(svg_markup: str) -> str:
    return f"data:image/svg+xml;utf8,{quote(svg_markup)}"


def _build_bar_chart_uri(
    title: str,
    labels: List[str],
    values: List[float | None],
    *,
    colors: List[str] | None = None,
) -> str | None:
    points: List[tuple[str, float]] = []
    for index, label in enumerate(labels):
        if index >= len(values):
            continue
        raw = values[index]
        if raw is None:
            continue
        safe_value = max(0.0, float(raw))
        points.append((str(label), safe_value))
    if not points:
        return None

    width = 920
    height = 520
    left = 78
    right = 34
    top = 72
    bottom = 94
    chart_width = width - left - right
    chart_height = height - top - bottom
    max_value = max([point[1] for point in points] + [1.0])
    count = len(points)
    gap = 20 if count <= 4 else 14
    raw_bar_width = (chart_width - (gap * max(0, count - 1))) / max(1, count)
    bar_width = max(28, raw_bar_width)
    total_width = (bar_width * count) + (gap * max(0, count - 1))
    start_x = left + max(0, (chart_width - total_width) / 2)
    palette = colors or ["#0ea5e9", "#1d4ed8", "#22c55e", "#f59e0b", "#f97316", "#8b5cf6"]

    bars_markup: List[str] = []
    label_markup: List[str] = []
    value_markup: List[str] = []
    for index, (label, value) in enumerate(points):
        x = start_x + index * (bar_width + gap)
        normalized = value / max_value if max_value > 0 else 0
        bar_height = max(4, chart_height * normalized)
        y = top + (chart_height - bar_height)
        fill = palette[index % len(palette)]
        bars_markup.append(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{bar_width:.2f}" height="{bar_height:.2f}" rx="8" fill="{fill}" />'
        )
        short_label = label if len(label) <= 20 else f"{label[:17]}..."
        label_markup.append(
            f'<text x="{x + (bar_width / 2):.2f}" y="{height - 42}" font-size="14" text-anchor="middle" fill="#64748b">{html_lib.escape(short_label)}</text>'
        )
        value_markup.append(
            f'<text x="{x + (bar_width / 2):.2f}" y="{max(top + 16, y - 10):.2f}" font-size="13" text-anchor="middle" fill="#334155">{html_lib.escape(_format_chart_number(value))}</text>'
        )

    y_ticks: List[str] = []
    y_grid: List[str] = []
    for tick in range(0, 5):
        ratio = tick / 4
        y_pos = top + chart_height - (chart_height * ratio)
        tick_value = max_value * ratio
        y_ticks.append(
            f'<text x="{left - 12}" y="{y_pos + 5:.2f}" font-size="12" text-anchor="end" fill="#94a3b8">{html_lib.escape(_format_chart_number(tick_value))}</text>'
        )
        y_grid.append(
            f'<line x1="{left}" y1="{y_pos:.2f}" x2="{width - right}" y2="{y_pos:.2f}" stroke="#e2e8f0" stroke-width="1" />'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        '<rect width="100%" height="100%" fill="#ffffff" />'
        f'<text x="{left}" y="38" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#0f172a">{html_lib.escape(title)}</text>'
        + "".join(y_grid)
        + f'<line x1="{left}" y1="{top + chart_height}" x2="{width - right}" y2="{top + chart_height}" stroke="#94a3b8" stroke-width="1.2" />'
        + "".join(bars_markup)
        + "".join(value_markup)
        + "".join(label_markup)
        + "".join(y_ticks)
        + "</svg>"
    )
    return _svg_data_uri(svg)


def _build_report_chart_bundle(
    *,
    simulation: SimulationRun,
    payload: Dict[str, Any],
    simulation_risks: List[Dict[str, Any]],
    workspace_resources: List[Dict[str, Any]],
    recommended_actions: List[str],
) -> Dict[str, List[Dict[str, Any]]]:
    metrics = simulation.metrics if isinstance(simulation.metrics, dict) else {}
    agent_rows = simulation.agents if isinstance(simulation.agents, list) else []

    def _agent_confidence(*keywords: str) -> float | None:
        lowered_keywords = [keyword.lower() for keyword in keywords]
        for agent in agent_rows:
            if not isinstance(agent, dict):
                continue
            perspective = str(agent.get("perspective") or "").strip().lower()
            if not perspective:
                continue
            if any(keyword in perspective for keyword in lowered_keywords):
                confidence = _to_number(agent.get("confidence"))
                if confidence is not None:
                    return confidence
        return None

    market_confidence = _to_number(metrics.get("marketViability") or metrics.get("market_viability"))
    customer_confidence = _to_number(metrics.get("customerDemand") or metrics.get("customer_demand"))
    investor_confidence = _to_number(metrics.get("investorConfidence") or metrics.get("investor_confidence"))
    if market_confidence is None:
        market_confidence = _agent_confidence("market")
    if customer_confidence is None:
        customer_confidence = _agent_confidence("customer")
    if investor_confidence is None:
        investor_confidence = _agent_confidence("investor")
    overall_score = _to_number(simulation.overall_score)

    charts: Dict[str, List[Dict[str, Any]]] = {
        "market": [],
        "technical": [],
        "financial": [],
        "operational": [],
        "risk": [],
        "appendix": [],
    }

    confidence_uri = _build_bar_chart_uri(
        "Agent Confidence Signals",
        ["Market", "Customer", "Investor"],
        [market_confidence, customer_confidence, investor_confidence],
        colors=["#0ea5e9", "#14b8a6", "#f59e0b"],
    )
    if confidence_uri:
        confidence_chart = {
            "title": "Agent Confidence Signals",
            "source": confidence_uri,
            "caption": "Direct outputs from market, customer, and investor agents.",
            "section": "market",
            "chart_type": "bar",
            "labels": ["Market", "Customer", "Investor"],
            "series": [
                {
                    "name": "Confidence",
                    "values": [
                        float(market_confidence or 0.0),
                        float(customer_confidence or 0.0),
                        float(investor_confidence or 0.0),
                    ],
                }
            ],
            "colors": ["#0ea5e9", "#14b8a6", "#f59e0b"],
        }
        charts["market"].append(confidence_chart)
        charts["appendix"].append({**confidence_chart, "title": "Appendix: Agent Confidence Signals", "large_format": True})

    burn = _to_number(payload.get("monthly_burn"))
    cash = _to_number(payload.get("current_cash_in_hand"))
    runway_months = (cash / burn) if (cash is not None and burn and burn > 0) else 0.0
    runway_score = max(0.0, min(100.0, runway_months * 8.0))
    investor_score = investor_confidence if investor_confidence is not None else 0.0
    score_chart_uri = _build_bar_chart_uri(
        "Capital Readiness Snapshot",
        ["Runway Cushion", "Investor Confidence", "Overall Score"],
        [runway_score, investor_score, overall_score],
        colors=["#22c55e", "#f97316", "#0ea5e9"],
    )
    if score_chart_uri:
        capital_chart = {
            "title": "Capital Readiness Snapshot",
            "source": score_chart_uri,
            "caption": "Runway score is scaled from current cash versus monthly burn.",
            "section": "financial",
            "chart_type": "bar",
            "labels": ["Runway Cushion", "Investor Confidence", "Overall Score"],
            "series": [
                {
                    "name": "Score",
                    "values": [runway_score, investor_score, float(overall_score or 0.0)],
                }
            ],
            "colors": ["#22c55e", "#f97316", "#0ea5e9"],
        }
        charts["financial"].append(capital_chart)
        charts["appendix"].append({**capital_chart, "title": "Appendix: Capital Readiness Snapshot", "large_format": True})

    team_count = len(workspace_resources)
    action_count = len(recommended_actions)
    execution_readiness = min(100.0, 35.0 + (team_count * 14.0))
    action_clarity = min(100.0, 30.0 + (action_count * 12.0))
    operating_signal = min(100.0, (overall_score or 0.0) * 0.9 + 8.0)
    operations_uri = _build_bar_chart_uri(
        "Execution Readiness Pulse",
        ["Team Coverage", "Action Clarity", "Operating Signal"],
        [execution_readiness, action_clarity, operating_signal],
        colors=["#06b6d4", "#6366f1", "#16a34a"],
    )
    if operations_uri:
        operations_chart = {
            "title": "Execution Readiness Pulse",
            "source": operations_uri,
            "caption": "Composite execution indicators inferred from team structure and action density.",
            "section": "operational",
            "chart_type": "bar",
            "labels": ["Team Coverage", "Action Clarity", "Operating Signal"],
            "series": [
                {
                    "name": "Readiness",
                    "values": [execution_readiness, action_clarity, operating_signal],
                }
            ],
            "colors": ["#06b6d4", "#6366f1", "#16a34a"],
        }
        charts["operational"].append(operations_chart)
        charts["technical"].append(
            {
                "title": "Capability and Delivery Readiness",
                "source": operations_uri,
                "caption": "Technical delivery readiness inferred from operating-team context.",
                "section": "technical",
                "chart_type": "bar",
                "labels": ["Team Coverage", "Action Clarity", "Operating Signal"],
                "series": [
                    {
                        "name": "Readiness",
                        "values": [execution_readiness, action_clarity, operating_signal],
                    }
                ],
                "colors": ["#06b6d4", "#6366f1", "#16a34a"],
            }
        )

    severity_map = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for risk in simulation_risks:
        severity = str(risk.get("severity") or "medium").strip().lower()
        if severity not in severity_map:
            severity = "medium"
        severity_map[severity] += 1
    risk_uri = _build_bar_chart_uri(
        "Risk Severity Distribution",
        ["Critical", "High", "Medium", "Low"],
        [
            float(severity_map["critical"]),
            float(severity_map["high"]),
            float(severity_map["medium"]),
            float(severity_map["low"]),
        ],
        colors=["#dc2626", "#ea580c", "#d97706", "#16a34a"],
    )
    if risk_uri:
        risk_chart = {
            "title": "Risk Severity Distribution",
            "source": risk_uri,
            "caption": "Count of currently detected risk items by severity band.",
            "section": "risk",
            "chart_type": "bar",
            "labels": ["Critical", "High", "Medium", "Low"],
            "series": [
                {
                    "name": "Count",
                    "values": [
                        float(severity_map["critical"]),
                        float(severity_map["high"]),
                        float(severity_map["medium"]),
                        float(severity_map["low"]),
                    ],
                }
            ],
            "colors": ["#dc2626", "#ea580c", "#d97706", "#16a34a"],
        }
        charts["risk"].append(risk_chart)
        charts["appendix"].append({**risk_chart, "title": "Appendix: Risk Severity Distribution", "large_format": True})

    return charts


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
    chart_bundle = _build_report_chart_bundle(
        simulation=simulation,
        payload=payload,
        simulation_risks=simulation_risks,
        workspace_resources=workspace_resources,
        recommended_actions=recommended_actions,
    )
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
            "charts": chart_bundle["market"],
        },
        "technical_feasibility": {
            "summary": _find_section_body(report, ["technical"]) or "",
            "tech_stack": [],
            "build_requirements": [],
            "resource_needs": workspace_resources,
            "technical_risks": [],
            "mitigations": [],
            "charts": chart_bundle["technical"],
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
            "charts": chart_bundle["financial"],
        },
        "operational_feasibility": {
            "summary": _find_section_body(report, ["operations", "team"]) or _workspace_context(workspace),
            "team_requirements": workspace_resources,
            "operations_plan_results": recommended_actions[:4],
            "scalability_assessment": simulation.synthesis or "",
            "charts": chart_bundle["operational"],
        },
        "risk_assessment": {
            "summary": str(investor_agent.get("summary") or simulation.synthesis or ""),
            "top_risks": simulation_risks,
            "mitigation_strategies": recommended_actions[:6],
            "charts": chart_bundle["risk"],
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
            "large_format_charts": chart_bundle["appendix"] if generator_profile == "comprehensive" else [],
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


def _title_from_key(key: str) -> str:
    words = str(key or "").replace("_", " ").strip().split()
    return " ".join(word[:1].upper() + word[1:] for word in words if word) or "Untitled"


def _doc_block_from_text(text: str, order: int) -> Dict[str, Any]:
    normalized = str(text or "").strip()
    paragraphs = [item.strip() for item in re.split(r"\n{2,}", normalized) if item.strip()]
    if not paragraphs:
        paragraphs = [""]
    return _new_block(
        "rich_text",
        order,
        {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": paragraph}]}
                for paragraph in paragraphs
            ],
        },
    )


def _coerce_table(value: Dict[str, Any], fallback_title: str = "Table") -> Dict[str, Any]:
    columns = value.get("columns") if isinstance(value.get("columns"), list) else []
    rows = value.get("rows") if isinstance(value.get("rows"), list) else []
    return {
        "title": str(value.get("title") or fallback_title).strip() or fallback_title,
        "columns": [str(item or "") for item in columns],
        "rows": [
            [str(cell or "") for cell in row]
            for row in rows
            if isinstance(row, list)
        ],
        "note": str(value.get("note") or "").strip(),
    }


def _list_of_dict_rows_to_table(items: List[Dict[str, Any]], fallback_title: str) -> Dict[str, Any]:
    columns: List[str] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in item.keys():
            normalized = _title_from_key(str(key))
            if normalized not in columns:
                columns.append(normalized)
            if len(columns) >= 6:
                break
        if len(columns) >= 6:
            break
    if not columns:
        columns = ["Value"]

    rows: List[List[str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        row: List[str] = []
        for column in columns:
            original_key = column.lower().replace(" ", "_")
            matched = None
            for key, value in item.items():
                normalized_key = str(key).lower().replace(" ", "_")
                if normalized_key == original_key:
                    matched = value
                    break
            row.append("" if matched is None else str(matched))
        rows.append(row)
    return {
        "title": fallback_title,
        "columns": columns,
        "rows": rows,
        "note": "",
    }


def _normalize_metric_items(items: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    metrics: List[Dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or item.get("term") or item.get("assumption") or "").strip()
        value = item.get("value")
        delta = item.get("delta") or item.get("benchmark") or item.get("status") or ""
        note = item.get("note") or item.get("rationale") or ""
        if not label:
            continue
        metrics.append(
            {
                "label": label,
                "value": "" if value is None else str(value),
                "delta": str(delta or ""),
                "note": str(note or ""),
            }
        )
    return metrics


def _build_document_from_professional_input(
    *,
    report_input: Dict[str, Any],
    report: Dict[str, Any],
    report_type: str,
    template_id: str,
) -> Dict[str, Any]:
    template = get_report_template(template_id)
    page_setup = {
        "size": "A4",
        "margins": {"top": 40, "right": 40, "bottom": 40, "left": 40},
        "header": "",
        "footer": "",
        "background": "#ffffff",
        "font_scale": 100,
        "font_family": "Source Serif 4",
    }
    sections: List[Dict[str, Any]] = []

    section_map = [
        ("executive_summary", "Executive Summary"),
        ("business_idea", "Business Idea Overview"),
        ("methodology", "Simulation Methodology"),
        ("market_feasibility", "Market Feasibility"),
        ("technical_feasibility", "Technical Feasibility"),
        ("financial_viability", "Financial Viability"),
        ("operational_feasibility", "Operational Feasibility"),
        ("risk_assessment", "Risk Assessment"),
        ("legal_regulatory", "Legal & Regulatory"),
        ("conclusions", "Conclusions"),
        ("appendices", "Appendices"),
    ]
    summary_keys = {
        "summary",
        "idea_overview",
        "problem_statement",
        "solution_summary",
        "value_proposition",
        "overall_verdict",
        "break_even_analysis",
        "cash_flow_summary",
        "scalability_assessment",
    }

    for section_key, section_title in section_map:
        payload = report_input.get(section_key)
        if not isinstance(payload, dict):
            continue
        blocks: List[Dict[str, Any]] = []
        block_order = 0

        summary_parts = [
            str(payload.get(key) or "").strip()
            for key in summary_keys
            if str(payload.get(key) or "").strip()
        ]
        if summary_parts:
            blocks.append(_doc_block_from_text("\n\n".join(summary_parts), block_order))
            block_order += 1

        for key, value in payload.items():
            if key in summary_keys:
                continue
            if value is None:
                continue

            if key in {"tables", "raw_data_tables"} and isinstance(value, list):
                for raw_table in value:
                    if not isinstance(raw_table, dict):
                        continue
                    table_data = _coerce_table(raw_table, fallback_title="Data Table")
                    if table_data["rows"] or table_data["columns"]:
                        blocks.append(_new_block("table", block_order, table_data))
                        block_order += 1
                continue

            if key in {"charts", "large_format_charts"} and isinstance(value, list):
                for raw_chart in value:
                    if not isinstance(raw_chart, dict):
                        continue
                    labels = raw_chart.get("labels") if isinstance(raw_chart.get("labels"), list) else []
                    series = raw_chart.get("series") if isinstance(raw_chart.get("series"), list) else []
                    chart_block_data = {
                        "title": str(raw_chart.get("title") or "Chart").strip() or "Chart",
                        "chart_type": str(raw_chart.get("chart_type") or "bar").strip().lower() or "bar",
                        "labels": [str(item) for item in labels],
                        "series": series,
                        "legend": True,
                        "notes": str(raw_chart.get("caption") or "").strip(),
                        "colors": raw_chart.get("colors") if isinstance(raw_chart.get("colors"), list) else [],
                        "image_source": str(raw_chart.get("source") or "").strip(),
                    }
                    blocks.append(_new_block("chart", block_order, chart_block_data))
                    block_order += 1
                continue

            if isinstance(value, list):
                string_items = [str(item).strip() for item in value if isinstance(item, str) and str(item).strip()]
                dict_items = [item for item in value if isinstance(item, dict)]

                if string_items:
                    blocks.append(
                        _new_block(
                            "card",
                            block_order,
                            {
                                "title": _title_from_key(key),
                                "items": string_items,
                                "border": "soft",
                            },
                        )
                    )
                    block_order += 1
                    continue

                if dict_items:
                    metrics = _normalize_metric_items(dict_items)
                    if metrics and key in {"highlights", "key_metrics", "unit_economics"}:
                        blocks.append(
                            _new_block(
                                "metric_grid",
                                block_order,
                                {"title": _title_from_key(key), "metrics": metrics},
                            )
                        )
                        block_order += 1
                    else:
                        table_data = _list_of_dict_rows_to_table(dict_items, fallback_title=_title_from_key(key))
                        if table_data["rows"]:
                            blocks.append(_new_block("table", block_order, table_data))
                            block_order += 1
                continue

            if isinstance(value, (str, int, float)):
                text_value = str(value).strip()
                if text_value:
                    blocks.append(
                        _new_block(
                            "card",
                            block_order,
                            {
                                "title": _title_from_key(key),
                                "items": [text_value],
                                "border": "soft",
                            },
                        )
                    )
                    block_order += 1

        if not blocks:
            continue
        sections.append(
            {
                "section_id": str(uuid4()),
                "title": section_title,
                "order": len(sections),
                "blocks": blocks,
            }
        )

    narrative_sections = report.get("sections") if isinstance(report.get("sections"), list) else []
    for item in narrative_sections:
        if not isinstance(item, dict):
            continue
        heading = str(item.get("heading") or "").strip()
        body = str(item.get("body") or "").strip()
        if not heading or not body:
            continue
        sections.append(
            {
                "section_id": str(uuid4()),
                "title": heading,
                "order": len(sections),
                "blocks": [_doc_block_from_text(body, 0)],
            }
        )

    if not sections:
        return {}

    return {
        "meta": {
            "report_name": str(report.get("report_name") or "Business Insight Report"),
            "report_type": _normalize_report_type(report_type),
            "template_id": template["template_id"],
            "page_setup": page_setup,
            "theme_tokens": dict(template.get("theme_tokens") or {}),
        },
        "sections": sections,
    }


def _ensure_document_cover_meta(
    document_json: Dict[str, Any],
    *,
    report: Dict[str, Any],
    report_type: str,
    simulation: SimulationRun | None = None,
) -> Dict[str, Any]:
    if not isinstance(document_json, dict):
        return {}

    meta = document_json.get("meta")
    if not isinstance(meta, dict):
        meta = {}
        document_json["meta"] = meta

    normalized_type = _normalize_report_type(report_type or meta.get("report_type"))
    profile = _report_title_profile(normalized_type)
    cover = meta.get("cover")
    if not isinstance(cover, dict):
        cover = {}
        meta["cover"] = cover

    generated_on = datetime.now(timezone.utc).strftime("%B %d, %Y")
    startup_name = str(getattr(simulation, "startup_name", "") or "").strip()
    cover.setdefault("kicker", "Professional Startup Simulation Report")
    cover.setdefault("title", str(meta.get("report_name") or report.get("report_name") or "Business Insight Report"))
    cover.setdefault("subtitle", str(profile.get("subtitle") or "Strategic startup report"))
    cover.setdefault("startup_name", startup_name)
    cover.setdefault("generated_on", generated_on)
    cover.setdefault("prepared_by", "PetraAI")
    cover.setdefault("report_id", str(meta.get("report_id") or report.get("report_id") or ""))

    return document_json


def report_payload_to_document_json(
    report: Dict[str, Any],
    report_type: str = "viability_report",
    template_id: str = "obsidian_board",
    simulation: SimulationRun | None = None,
    workspace: ManagementWorkspace | None = None,
    layout_guidance: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    normalized_guidance = _sanitize_layout_guidance(layout_guidance)
    if simulation is not None:
        try:
            report_input = _build_professional_report_input(
                report,
                simulation,
                workspace,
                report_type=report_type,
            )
            generated_document = _build_document_from_professional_input(
                report_input=report_input,
                report=report,
                report_type=report_type,
                template_id=template_id,
            )
            if isinstance(generated_document, dict) and generated_document.get("sections"):
                with_layout = _apply_layout_guidance_to_document(generated_document, normalized_guidance)
                return _ensure_document_cover_meta(
                    with_layout,
                    report=report,
                    report_type=report_type,
                    simulation=simulation,
                )
        except Exception:
            pass
    legacy_document = _legacy_report_payload_to_document_json(
        report,
        report_type=report_type,
        template_id=template_id,
    )
    with_layout = _apply_layout_guidance_to_document(legacy_document, normalized_guidance)
    return _ensure_document_cover_meta(
        with_layout,
        report=report,
        report_type=report_type,
        simulation=simulation,
    )


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

    def _px_to_in(value: Any, minimum: int = 12, maximum: int = 120, fallback: int = 40) -> str:
        try:
            px_value = int(value)
        except (TypeError, ValueError):
            px_value = fallback
        bounded = max(minimum, min(maximum, px_value))
        return f"{bounded / 96:.3f}in"

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
            top = _px_to_in(margins.get("top", 40))
            right = _px_to_in(margins.get("right", 40))
            bottom = _px_to_in(margins.get("bottom", 40))
            left = _px_to_in(margins.get("left", 40))
            if page_size:
                css_rules.append(f"@page {{ size: {page_size}; margin: {top} {right} {bottom} {left}; }}")
            else:
                css_rules.append(f"@page {{ margin: {top} {right} {bottom} {left}; }}")
        elif page_margin is not None:
            margin_in = _px_to_in(page_margin, minimum=16, maximum=96, fallback=40)
            if page_size:
                css_rules.append(f"@page {{ size: {page_size}; margin: {margin_in}; }}")
            else:
                css_rules.append(f"@page {{ margin: {margin_in}; }}")
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

    def _escape_css_string(value: str) -> str:
        return value.replace("\\", "\\\\").replace('"', '\\"')

    page_boxes: List[str] = []
    if normalized_header:
        page_boxes.append(
            "@top-center { "
            f'content: "{_escape_css_string(normalized_header)}"; '
            "font-size: 10px; letter-spacing: 0.06em; color: #64748b; "
            "font-weight: 600; text-transform: uppercase; }"
        )
    if normalized_footer:
        page_boxes.append(
            "@bottom-center { "
            f'content: "{_escape_css_string(normalized_footer)}"; '
            "font-size: 10px; letter-spacing: 0.05em; color: #64748b; }"
        )

    if not page_boxes:
        return html

    style = f'<style id="report-document-chrome">@page {{ {" ".join(page_boxes)} }}</style>'
    return html.replace("</head>", f"{style}</head>") if "</head>" in html else f"{style}{html}"


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
    safe_document = document_json if isinstance(document_json, dict) else {}
    meta = safe_document.get("meta") if isinstance(safe_document.get("meta"), dict) else {}
    sections = safe_document.get("sections") if isinstance(safe_document.get("sections"), list) else []
    if not sections:
        payload = document_json_to_report_payload(safe_document)
        return build_report_html(
            payload,
            simulation,
            workspace,
            report_type=_normalize_report_type(meta.get("report_type")),
            template_id=(template_id or meta.get("template_id") or "obsidian_board"),
            quality=quality,
            theme_tokens=meta.get("theme_tokens") if isinstance(meta.get("theme_tokens"), dict) else {},
        )

    resolved_template = get_report_template(template_id or meta.get("template_id"))
    tokens = dict(resolved_template.get("theme_tokens") or {})
    if isinstance(meta.get("theme_tokens"), dict):
        tokens.update({key: value for key, value in meta["theme_tokens"].items() if value is not None})

    page_setup = meta.get("page_setup") if isinstance(meta.get("page_setup"), dict) else {}
    margins = page_setup.get("margins") if isinstance(page_setup.get("margins"), dict) else {}
    margin_top = _clamp_int(margins.get("top"), minimum=16, maximum=120, fallback=40)
    margin_right = _clamp_int(margins.get("right"), minimum=16, maximum=120, fallback=40)
    margin_bottom = _clamp_int(margins.get("bottom"), minimum=16, maximum=120, fallback=40)
    margin_left = _clamp_int(margins.get("left"), minimum=16, maximum=120, fallback=40)
    font_scale = _clamp_int(page_setup.get("font_scale"), minimum=85, maximum=130, fallback=100)
    font_family = str(page_setup.get("font_family") or "Source Serif 4").strip()
    if font_family not in _DOCUMENT_FONT_FAMILIES:
        font_family = "Source Serif 4"
    page_size = str(page_setup.get("size") or "A4").strip().upper()
    if page_size not in _DOCUMENT_PAGE_SIZES:
        page_size = "A4"
    page_background = _safe_hex_color(page_setup.get("background")) or "#ffffff"

    primary = _safe_hex_color(tokens.get("primary_color")) or "#0f172a"
    secondary = _safe_hex_color(tokens.get("secondary_color")) or "#334155"
    accent = _safe_hex_color(tokens.get("accent_color")) or "#0ea5e9"
    text_color = _safe_hex_color(tokens.get("text_color")) or "#0f172a"
    border_color = _safe_hex_color(tokens.get("page_border")) or "#dbe3ee"

    header_text = str(page_setup.get("header") or tokens.get("page_header") or "").strip()
    footer_text = str(page_setup.get("footer") or tokens.get("page_footer") or "").strip()

    def _render_inline_text(node: Any) -> str:
        if node is None:
            return ""
        if isinstance(node, str):
            return html_lib.escape(node)
        if isinstance(node, list):
            return "".join(_render_inline_text(item) for item in node)
        if not isinstance(node, dict):
            return html_lib.escape(str(node))

        node_type = str(node.get("type") or "")
        if node_type == "text":
            text = html_lib.escape(str(node.get("text") or ""))
            marks = node.get("marks") if isinstance(node.get("marks"), list) else []
            for mark in marks:
                if not isinstance(mark, dict):
                    continue
                mark_type = str(mark.get("type") or "").lower()
                if mark_type == "bold":
                    text = f"<strong>{text}</strong>"
                elif mark_type == "italic":
                    text = f"<em>{text}</em>"
                elif mark_type == "underline":
                    text = f"<span style=\"text-decoration:underline\">{text}</span>"
                elif mark_type == "link":
                    href = str((mark.get("attrs") or {}).get("href") or "").strip()
                    if href:
                        text = f"<a href=\"{html_lib.escape(href)}\" target=\"_blank\" rel=\"noreferrer\">{text}</a>"
            return text

        children = node.get("content") if isinstance(node.get("content"), list) else []
        return "".join(_render_inline_text(item) for item in children)

    def _rich_text_html(data: Any) -> str:
        if isinstance(data, str):
            lines = [line.strip() for line in re.split(r"\n{2,}", data) if line.strip()]
            return "".join(f"<p>{html_lib.escape(line)}</p>" for line in lines)
        if not isinstance(data, dict):
            return ""
        content = data.get("content") if isinstance(data.get("content"), list) else []
        html_chunks: List[str] = []
        for node in content:
            if not isinstance(node, dict):
                continue
            node_type = str(node.get("type") or "").lower()
            if node_type == "heading":
                level = _clamp_int((node.get("attrs") or {}).get("level"), minimum=1, maximum=4, fallback=2)
                html_chunks.append(f"<h{level}>{_render_inline_text(node.get('content') or [])}</h{level}>")
            elif node_type == "bullet_list":
                items = node.get("content") if isinstance(node.get("content"), list) else []
                rendered_items = []
                for item in items:
                    child = item.get("content") if isinstance(item, dict) and isinstance(item.get("content"), list) else []
                    rendered_items.append(f"<li>{_render_inline_text(child)}</li>")
                if rendered_items:
                    html_chunks.append("<ul>" + "".join(rendered_items) + "</ul>")
            elif node_type == "ordered_list":
                items = node.get("content") if isinstance(node.get("content"), list) else []
                rendered_items = []
                for item in items:
                    child = item.get("content") if isinstance(item, dict) and isinstance(item.get("content"), list) else []
                    rendered_items.append(f"<li>{_render_inline_text(child)}</li>")
                if rendered_items:
                    html_chunks.append("<ol>" + "".join(rendered_items) + "</ol>")
            else:
                paragraph = _render_inline_text(node.get("content") if isinstance(node, dict) else node)
                if paragraph.strip():
                    html_chunks.append(f"<p>{paragraph}</p>")
        return "".join(html_chunks)

    def _series_rows(labels: List[str], series: List[Dict[str, Any]]) -> List[Dict[str, float | str]]:
        count = max(
            len(labels),
            *[
                len(item.get("values") if isinstance(item.get("values"), list) else [])
                for item in series
                if isinstance(item, dict)
            ],
            0,
        )
        rows: List[Dict[str, float | str]] = []
        for index in range(count):
            row: Dict[str, float | str] = {"label": labels[index] if index < len(labels) else f"Item {index + 1}"}
            for series_item in series:
                if not isinstance(series_item, dict):
                    continue
                name = str(series_item.get("name") or "Series")
                values = series_item.get("values") if isinstance(series_item.get("values"), list) else []
                numeric = _to_number(values[index]) if index < len(values) else 0.0
                row[name] = float(numeric or 0.0)
            rows.append(row)
        return rows

    def _line_or_area_chart_uri(
        title: str,
        labels: List[str],
        series: List[Dict[str, Any]],
        colors: List[str],
        *,
        area: bool = False,
    ) -> str | None:
        rows = _series_rows(labels, series)
        if not rows or not series:
            return None
        width = 920
        height = 520
        left = 72
        right = 32
        top = 66
        bottom = 86
        chart_width = width - left - right
        chart_height = height - top - bottom
        values: List[float] = []
        for row in rows:
            for series_item in series:
                key = str(series_item.get("name") or "Series")
                values.append(float(row.get(key) or 0.0))
        max_value = max(values + [1.0])
        min_value = min(values + [0.0])
        span = max(1.0, max_value - min_value)

        def _x(index: int) -> float:
            if len(rows) == 1:
                return left + chart_width / 2
            return left + (chart_width * index / max(1, len(rows) - 1))

        def _y(value: float) -> float:
            return top + chart_height - ((value - min_value) / span * chart_height)

        grid_lines = []
        y_ticks = []
        for tick in range(0, 5):
            ratio = tick / 4
            y_pos = top + chart_height - ratio * chart_height
            value = min_value + (span * ratio)
            grid_lines.append(
                f'<line x1="{left}" y1="{y_pos:.2f}" x2="{width - right}" y2="{y_pos:.2f}" stroke="#e2e8f0" stroke-width="1"/>'
            )
            y_ticks.append(
                f'<text x="{left - 10}" y="{y_pos + 4:.2f}" font-size="12" text-anchor="end" fill="#94a3b8">{html_lib.escape(_format_chart_number(value))}</text>'
            )

        x_labels = []
        for index, row in enumerate(rows):
            label = str(row.get("label") or f"Item {index + 1}")
            short = label if len(label) <= 20 else f"{label[:17]}..."
            x_labels.append(
                f'<text x="{_x(index):.2f}" y="{height - 40}" font-size="12" text-anchor="middle" fill="#64748b">{html_lib.escape(short)}</text>'
            )

        path_markup = []
        for series_index, series_item in enumerate(series):
            if not isinstance(series_item, dict):
                continue
            key = str(series_item.get("name") or f"Series {series_index + 1}")
            color = colors[series_index % len(colors)]
            points = [(_x(index), _y(float(row.get(key) or 0.0))) for index, row in enumerate(rows)]
            if not points:
                continue
            d = " ".join(
                [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
                + [f"L {point[0]:.2f} {point[1]:.2f}" for point in points[1:]]
            )
            if area:
                area_d = (
                    f"{d} L {points[-1][0]:.2f} {top + chart_height:.2f} "
                    f"L {points[0][0]:.2f} {top + chart_height:.2f} Z"
                )
                path_markup.append(
                    f'<path d="{area_d}" fill="{color}" fill-opacity="0.16" stroke="none" />'
                )
            path_markup.append(
                f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />'
            )
            for point in points:
                path_markup.append(
                    f'<circle cx="{point[0]:.2f}" cy="{point[1]:.2f}" r="3.5" fill="{color}" />'
                )

        legend_markup = []
        legend_x = left
        legend_y = top - 26
        for series_index, series_item in enumerate(series):
            if not isinstance(series_item, dict):
                continue
            key = str(series_item.get("name") or f"Series {series_index + 1}")
            color = colors[series_index % len(colors)]
            legend_markup.append(
                f'<rect x="{legend_x:.2f}" y="{legend_y:.2f}" width="12" height="12" rx="2" fill="{color}" />'
                f'<text x="{legend_x + 18:.2f}" y="{legend_y + 10:.2f}" font-size="12" fill="#475569">{html_lib.escape(key)}</text>'
            )
            legend_x += 152

        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
            '<rect width="100%" height="100%" fill="#ffffff" />'
            f'<text x="{left}" y="34" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#0f172a">{html_lib.escape(title)}</text>'
            + "".join(grid_lines)
            + f'<line x1="{left}" y1="{top + chart_height:.2f}" x2="{width - right}" y2="{top + chart_height:.2f}" stroke="#94a3b8" stroke-width="1.2"/>'
            + "".join(path_markup)
            + "".join(y_ticks)
            + "".join(x_labels)
            + "".join(legend_markup)
            + "</svg>"
        )
        return _svg_data_uri(svg)

    def _pie_chart_uri(title: str, labels: List[str], values: List[float], colors: List[str]) -> str | None:
        points = []
        for index, label in enumerate(labels):
            if index >= len(values):
                continue
            value = max(0.0, float(values[index]))
            if value <= 0:
                continue
            points.append((label, value))
        if not points:
            return None

        width = 920
        height = 520
        cx = 320
        cy = 280
        radius = 150
        total = sum(value for _, value in points) or 1.0
        current_angle = -math.pi / 2
        slices = []
        legend = []
        for index, (label, value) in enumerate(points):
            sweep = (value / total) * 2 * math.pi
            next_angle = current_angle + sweep
            x1 = cx + radius * math.cos(current_angle)
            y1 = cy + radius * math.sin(current_angle)
            x2 = cx + radius * math.cos(next_angle)
            y2 = cy + radius * math.sin(next_angle)
            large_arc = 1 if sweep > math.pi else 0
            color = colors[index % len(colors)]
            slices.append(
                f'<path d="M {cx} {cy} L {x1:.2f} {y1:.2f} A {radius} {radius} 0 {large_arc} 1 {x2:.2f} {y2:.2f} Z" fill="{color}" />'
            )
            legend.append(
                f'<rect x="560" y="{132 + index * 30}" width="14" height="14" rx="2" fill="{color}" />'
                f'<text x="582" y="{144 + index * 30}" font-size="13" fill="#334155">{html_lib.escape(label)} ({value:.1f})</text>'
            )
            current_angle = next_angle

        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
            '<rect width="100%" height="100%" fill="#ffffff" />'
            f'<text x="72" y="40" font-size="22" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#0f172a">{html_lib.escape(title)}</text>'
            + "".join(slices)
            + f'<circle cx="{cx}" cy="{cy}" r="62" fill="#ffffff" />'
            + "".join(legend)
            + "</svg>"
        )
        return _svg_data_uri(svg)

    def _chart_uri_for_block(data: Dict[str, Any]) -> str:
        image_source = str(data.get("image_source") or "").strip()
        if image_source:
            return image_source
        labels = [str(item) for item in (data.get("labels") or []) if str(item).strip()]
        series = [item for item in (data.get("series") or []) if isinstance(item, dict)]
        if not series:
            return ""
        values = [float(_to_number(value) or 0.0) for value in (series[0].get("values") or [])]
        chart_type = str(data.get("chart_type") or "bar").strip().lower()
        palette = [color for color in (data.get("colors") or []) if _safe_hex_color(color)] or [
            "#0ea5e9",
            "#22c55e",
            "#f59e0b",
            "#f97316",
            "#6366f1",
        ]
        if chart_type == "line":
            return _line_or_area_chart_uri(
                str(data.get("title") or "Chart"),
                labels,
                series,
                palette,
                area=False,
            ) or ""
        if chart_type == "area":
            return _line_or_area_chart_uri(
                str(data.get("title") or "Chart"),
                labels,
                series,
                palette,
                area=True,
            ) or ""
        if chart_type == "pie":
            return _pie_chart_uri(
                str(data.get("title") or "Chart"),
                labels,
                values,
                palette,
            ) or ""
        return _build_bar_chart_uri(
            str(data.get("title") or "Chart"),
            labels,
            values,
            colors=palette,
        ) or ""

    def _render_block(block: Dict[str, Any]) -> str:
        block_type = str(block.get("type") or "rich_text").strip().lower()
        data = block.get("data") if isinstance(block.get("data"), dict) else {}

        if block_type == "divider":
            return '<hr class="doc-divider" />'

        if block_type == "card":
            title = html_lib.escape(str(data.get("title") or ""))
            items = data.get("items") if isinstance(data.get("items"), list) else []
            rendered_items = "".join(
                f"<li>{html_lib.escape(str(item))}</li>" for item in items if str(item).strip()
            )
            return (
                '<section class="doc-card">'
                + (f"<h3>{title}</h3>" if title else "")
                + (f"<ul>{rendered_items}</ul>" if rendered_items else "")
                + "</section>"
            )

        if block_type == "metric_grid":
            title = html_lib.escape(str(data.get("title") or "Metrics"))
            metrics = data.get("metrics") if isinstance(data.get("metrics"), list) else []
            metric_cards = []
            for item in metrics:
                if not isinstance(item, dict):
                    continue
                label = html_lib.escape(str(item.get("label") or "Metric"))
                value = html_lib.escape(str(item.get("value") or ""))
                delta = html_lib.escape(str(item.get("delta") or item.get("note") or ""))
                metric_cards.append(
                    '<article class="doc-metric-card">'
                    f"<p class=\"doc-metric-label\">{label}</p>"
                    f"<p class=\"doc-metric-value\">{value}</p>"
                    f"<p class=\"doc-metric-delta\">{delta}</p>"
                    "</article>"
                )
            return (
                '<section class="doc-metric-grid">'
                f"<h3>{title}</h3>"
                f"<div class=\"doc-metric-grid-inner\">{''.join(metric_cards)}</div>"
                "</section>"
            )

        if block_type == "table":
            title = html_lib.escape(str(data.get("title") or "Table"))
            columns = data.get("columns") if isinstance(data.get("columns"), list) else []
            rows = data.get("rows") if isinstance(data.get("rows"), list) else []
            head = "".join(f"<th>{html_lib.escape(str(column))}</th>" for column in columns)
            body_rows = []
            for row in rows:
                if not isinstance(row, list):
                    continue
                cells = "".join(f"<td>{html_lib.escape(str(cell))}</td>" for cell in row)
                body_rows.append(f"<tr>{cells}</tr>")
            note = html_lib.escape(str(data.get("note") or "").strip())
            return (
                '<section class="doc-table-wrap">'
                f"<h3>{title}</h3>"
                "<div class=\"doc-table-scroll\"><table class=\"doc-table\">"
                + (f"<thead><tr>{head}</tr></thead>" if head else "")
                + f"<tbody>{''.join(body_rows)}</tbody>"
                + "</table></div>"
                + (f"<p class=\"doc-note\">{note}</p>" if note else "")
                + "</section>"
            )

        if block_type == "chart":
            title = html_lib.escape(str(data.get("title") or "Chart"))
            notes = html_lib.escape(str(data.get("notes") or "").strip())
            chart_uri = _chart_uri_for_block(data)
            image_html = (
                f"<img src=\"{chart_uri}\" alt=\"{title}\" class=\"doc-chart-image\" />"
                if chart_uri
                else "<div class=\"doc-chart-empty\">No chart data available.</div>"
            )
            return (
                '<section class="doc-chart-wrap">'
                f"<h3>{title}</h3>"
                f"{image_html}"
                + (f"<p class=\"doc-note\">{notes}</p>" if notes else "")
                + "</section>"
            )

        content_html = _rich_text_html(data)
        return f'<section class="doc-rich-text">{content_html or "<p></p>"}</section>'

    section_markup = []
    for section_index, section in enumerate(
        sorted(
            [entry for entry in sections if isinstance(entry, dict)],
            key=lambda item: int(item.get("order", 0)),
        )
    ):
        section_title = html_lib.escape(str(section.get("title") or f"Section {section_index + 1}"))
        blocks = section.get("blocks") if isinstance(section.get("blocks"), list) else []
        rendered_blocks = [
            _render_block(block)
            for block in sorted(
                [entry for entry in blocks if isinstance(entry, dict)],
                key=lambda item: int(item.get("order", 0)),
            )
        ]
        section_markup.append(
            "<section class=\"doc-section\">"
            f"<h2>{section_title}</h2>"
            f"{''.join(rendered_blocks)}"
            "</section>"
        )

    report_name = html_lib.escape(str(meta.get("report_name") or "Business Insight Report"))
    report_type_display_raw = _REPORT_TYPE_DISPLAY_NAMES.get(_normalize_report_type(meta.get("report_type")), "Business Report")
    report_type_display = html_lib.escape(report_type_display_raw)
    generated_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    footer_label_raw = str(simulation.startup_name or "Startup")
    footer_label = html_lib.escape(footer_label_raw)
    cover_meta = meta.get("cover") if isinstance(meta.get("cover"), dict) else {}
    cover_kicker = html_lib.escape(str(cover_meta.get("kicker") or "Professional Startup Simulation Report"))
    cover_title = html_lib.escape(str(cover_meta.get("title") or meta.get("report_name") or "Business Insight Report"))
    cover_subtitle = html_lib.escape(str(cover_meta.get("subtitle") or report_type_display_raw))
    cover_startup_name = html_lib.escape(str(cover_meta.get("startup_name") or footer_label_raw))
    cover_generated_on = html_lib.escape(str(cover_meta.get("generated_on") or generated_date))
    cover_report_id = html_lib.escape(str(cover_meta.get("report_id") or ""))
    cover_prepared_by = html_lib.escape(str(cover_meta.get("prepared_by") or "PetraAI"))
    escaped_header_text = header_text.replace("\\", "\\\\").replace('"', '\\"')
    escaped_footer_text = footer_text.replace("\\", "\\\\").replace('"', '\\"')
    header_page_rule = (
        f'@top-center {{ content: "{escaped_header_text}"; font-size: 10px; color: #64748b; }}'
        if header_text
        else ""
    )
    footer_page_rule = (
        f'@bottom-center {{ content: "{escaped_footer_text}"; font-size: 10px; color: #64748b; }}'
        if footer_text
        else ""
    )

    html = f"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{report_name}</title>
  <style>
    :root {{
      --doc-primary: {primary};
      --doc-secondary: {secondary};
      --doc-accent: {accent};
      --doc-text: {text_color};
      --doc-border: {border_color};
      --doc-paper: {page_background};
    }}
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; padding: 0; color: var(--doc-text); background: #0f172a; font-family: '{font_family}', Georgia, serif; font-size: {font_scale / 100:.3f}rem; }}
    body {{ padding: 24px; }}
    .doc-shell {{ max-width: 900px; margin: 0 auto; }}
    .doc-paper {{
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-radius: 10px;
      box-shadow: 0 20px 48px rgba(15, 23, 42, 0.35);
      padding: 0;
      overflow: hidden;
    }}
    .doc-cover {{
      border-bottom: 1px solid var(--doc-border);
      padding: 42px {margin_right}px 28px {margin_left}px;
      background: linear-gradient(135deg, rgba(148,163,184,0.06), rgba(148,163,184,0.01));
    }}
    .doc-kicker {{ margin: 0; font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--doc-accent); font-weight: 700; }}
    .doc-title {{ margin: 12px 0 0; font-size: 2.75rem; line-height: 1.05; color: var(--doc-primary); max-width: 96%; }}
    .doc-subtitle {{ margin: 10px 0 0; font-size: 1.28rem; color: #475569; max-width: 85%; line-height: 1.35; }}
    .doc-meta-grid {{ margin-top: 22px; border-top: 1px solid var(--doc-border); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 24px; padding-top: 18px; }}
    .doc-meta-item {{ border: 1px solid var(--doc-border); border-radius: 10px; background: #f8fafc; padding: 12px; }}
    .doc-meta-label {{ margin: 0; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }}
    .doc-meta-value {{ margin: 7px 0 0; font-size: 1.08rem; font-weight: 700; color: #0f172a; line-height: 1.35; word-break: break-word; }}
    .doc-content {{ padding: {margin_top}px {margin_right}px {margin_bottom}px {margin_left}px; }}
    .doc-section {{ break-inside: avoid; margin: 0 0 24px; page-break-inside: avoid; }}
    .doc-section h2 {{
      margin: 0 0 12px;
      font-size: 1.45rem;
      line-height: 1.25;
      color: var(--doc-primary);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--doc-border);
    }}
    .doc-rich-text p {{ margin: 0 0 14px; line-height: 1.7; font-size: 1.04rem; color: #0f172a; }}
    .doc-rich-text ul, .doc-rich-text ol {{ margin: 0 0 14px 18px; line-height: 1.7; }}
    .doc-card, .doc-chart-wrap, .doc-table-wrap, .doc-metric-grid {{
      border: 1px solid var(--doc-border);
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px;
      margin: 0 0 14px;
    }}
    .doc-card h3, .doc-chart-wrap h3, .doc-table-wrap h3, .doc-metric-grid h3 {{
      margin: 0 0 8px;
      font-size: 1.12rem;
      color: #0f172a;
    }}
    .doc-card ul {{ margin: 0; padding-left: 18px; line-height: 1.6; }}
    .doc-divider {{ border: 0; border-top: 1px dashed #c9d4e1; margin: 14px 0; }}
    .doc-metric-grid-inner {{ display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }}
    .doc-metric-card {{ border: 1px solid var(--doc-border); background: #ffffff; border-radius: 8px; padding: 10px; }}
    .doc-metric-label {{ margin: 0; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.11em; color: #64748b; font-weight: 700; }}
    .doc-metric-value {{ margin: 6px 0 0; font-size: 1.6rem; font-weight: 700; color: #0f172a; }}
    .doc-metric-delta {{ margin: 4px 0 0; font-size: 0.82rem; color: #047857; }}
    .doc-table-scroll {{ overflow-x: auto; }}
    .doc-table {{ width: 100%; border-collapse: collapse; font-size: 0.92rem; }}
    .doc-table th, .doc-table td {{ border: 1px solid #dbe3ee; padding: 8px; text-align: left; vertical-align: top; }}
    .doc-table thead th {{ background: #eef2f7; font-weight: 700; }}
    .doc-chart-image {{ width: 100%; border: 1px solid #dbe3ee; border-radius: 8px; background: #ffffff; }}
    .doc-chart-empty {{ border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; color: #64748b; background: #ffffff; }}
    .doc-note {{ margin: 8px 0 0; font-size: 0.78rem; color: #64748b; }}
    .doc-footer {{ margin-top: 14px; font-size: 0.72rem; color: #94a3b8; text-align: center; }}
    @media print {{
      body {{ background: #ffffff; padding: 0; }}
      .doc-shell {{ max-width: none; margin: 0; }}
      .doc-paper {{ border: 0; border-radius: 0; box-shadow: none; }}
      .doc-footer {{ display: none; }}
    }}
    @page {{
      size: {page_size};
      margin: {margin_top / 96:.3f}in {margin_right / 96:.3f}in {margin_bottom / 96:.3f}in {margin_left / 96:.3f}in;
      {header_page_rule}
      {footer_page_rule}
    }}
  </style>
</head>
<body>
  <div class="doc-shell">
    <article class="doc-paper">
      <header class="doc-cover">
        <p class="doc-kicker">{cover_kicker}</p>
        <h1 class="doc-title">{cover_title}</h1>
        <p class="doc-subtitle">{cover_subtitle}</p>
        <div class="doc-meta-grid">
          <article class="doc-meta-item">
            <p class="doc-meta-label">Startup</p>
            <p class="doc-meta-value">{cover_startup_name}</p>
          </article>
          <article class="doc-meta-item">
            <p class="doc-meta-label">Generated</p>
            <p class="doc-meta-value">{cover_generated_on}</p>
          </article>
          <article class="doc-meta-item">
            <p class="doc-meta-label">Report ID</p>
            <p class="doc-meta-value">{cover_report_id}</p>
          </article>
          <article class="doc-meta-item">
            <p class="doc-meta-label">Prepared By</p>
            <p class="doc-meta-value">{cover_prepared_by}</p>
          </article>
        </div>
      </header>
      <main class="doc-content">
        {''.join(section_markup)}
      </main>
    </article>
    <p class="doc-footer">Generated by PetraAI for {footer_label}</p>
  </div>
</body>
</html>
"""
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
