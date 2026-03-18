from __future__ import annotations

import html
import json
import os
import textwrap
from datetime import datetime, timedelta
from typing import Any, Dict, List

import openai
from sqlalchemy.orm import Session

from models import (
    AppNotification,
    BusinessInsightReport,
    CalendarEvent,
    ManagementPlanRun,
    ManagementWorkspace,
    SimulationRun,
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


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


def serialize_report(row: BusinessInsightReport) -> Dict[str, Any]:
    sections = row.sections if isinstance(row.sections, list) else []
    return {
        "report_id": row.id,
        "simulation_id": row.simulation_id,
        "workspace_id": row.workspace_id,
        "report_name": row.report_name or "Business Insight Report",
        "status": row.status or "READY",
        "summary": row.summary or "",
        "sections": sections,
        "key_findings": row.key_findings if isinstance(row.key_findings, list) else [],
        "recommended_actions": row.recommended_actions if isinstance(row.recommended_actions, list) else [],
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


def _fallback_report(simulation: SimulationRun, workspace: ManagementWorkspace | None, report_name: str) -> Dict[str, Any]:
    metrics = simulation.metrics or {}
    agents = simulation.agents if isinstance(simulation.agents, list) else []
    opportunities = []
    risks = []
    for agent in agents:
        if not isinstance(agent, dict):
            continue
        opportunities.extend(str(item) for item in (agent.get("opportunities") or [])[:2])
        risks.extend(str(item) for item in (agent.get("risks") or [])[:2])

    sections = [
        {
            "heading": "Executive Summary",
            "body": (
                f"{simulation.startup_name} scored {simulation.overall_score}/100. "
                f"The simulation indicates strongest traction in {max(metrics, key=metrics.get) if metrics else 'core execution'} "
                f"and requires focused follow-through before scale."
            ),
        },
        {
            "heading": "Market and Demand",
            "body": "Customer and market signals suggest the team should validate the most promising segment, tighten positioning, and remove adoption friction early.",
        },
        {
            "heading": "Operations and Team Readiness",
            "body": (
                f"{workspace.workspace_name if workspace else 'The current operating model'} should turn simulation findings into owner-based execution. "
                "Convert strategy into weekly deliverables, clear accountability, and measurable targets."
            ),
        },
        {
            "heading": "Capital and Risk Outlook",
            "body": "Investor confidence improves when the company can show disciplined spend, proof of demand, and a credible milestone path for the next 30 to 90 days.",
        },
    ]
    key_findings = list(dict.fromkeys((opportunities + risks)[:6]))
    recommended_actions = [
        "Prioritize one measurable commercial objective for the next operating cycle.",
        "Assign each major simulation risk to a named owner and due date.",
        "Translate top opportunities into calendar commitments and review checkpoints.",
    ]
    summary = sections[0]["body"]
    return {
        "report_name": report_name,
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
) -> Dict[str, Any]:
    fallback = _fallback_report(simulation, workspace, report_name)
    if client is None:
        return fallback

    try:
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


def build_report_html(report: Dict[str, Any], simulation: SimulationRun) -> str:
    sections = report.get("sections") or []
    findings = report.get("key_findings") or []
    actions = report.get("recommended_actions") or []
    section_html = "".join(
        f"<section><h2>{html.escape(str(item.get('heading') or 'Section'))}</h2><p>{html.escape(str(item.get('body') or ''))}</p></section>"
        for item in sections
    )
    findings_html = "".join(f"<li>{html.escape(str(item))}</li>" for item in findings)
    actions_html = "".join(f"<li>{html.escape(str(item))}</li>" for item in actions)
    return (
        "<html><head><meta charset='utf-8'><title>"
        f"{html.escape(report.get('report_name') or 'Business Insight Report')}</title>"
        "<style>body{font-family:Arial,sans-serif;line-height:1.55;margin:40px;color:#16202c}"
        "h1,h2{color:#0b365d}h1{margin-bottom:0}p.meta{color:#5b6573;font-size:13px}"
        "section{margin:24px 0}ul{padding-left:20px}</style></head><body>"
        f"<h1>{html.escape(report.get('report_name') or 'Business Insight Report')}</h1>"
        f"<p class='meta'>Startup: {html.escape(simulation.startup_name)} | Generated: {html.escape(datetime.utcnow().isoformat())}</p>"
        f"<p>{html.escape(report.get('summary') or '')}</p>"
        f"{section_html}"
        "<section><h2>Key Findings</h2><ul>"
        f"{findings_html}"
        "</ul></section>"
        "<section><h2>Recommended Actions</h2><ul>"
        f"{actions_html}"
        "</ul></section>"
        "</body></html>"
    )


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_report_pdf(report: Dict[str, Any], simulation: SimulationRun) -> bytes:
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
