from __future__ import annotations

import json
import os
from typing import Any, Dict, List

import openai

from models import ManagementPlanRun, ManagementWorkspace
from .schemas import PlannedActivity

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _clean_qualifications(values: List[str] | None) -> List[str]:
    if not values:
        return []
    cleaned = []
    for item in values:
        value = str(item or "").strip()
        if value:
            cleaned.append(value[:120])
    return cleaned[:100]


def _workspace_to_response_payload(workspace: ManagementWorkspace) -> Dict[str, Any]:
    members = []
    for member in workspace.team_members or []:
        qualifications = _clean_qualifications(member.qualifications or [])
        members.append(
            {
                "member_id": member.id,
                "name": member.name or "",
                "role": member.role or "",
                "qualifications": qualifications,
                "qualification_notes": (member.qualification_notes or "")[:20000],
                "created_at": member.created_at,
                "updated_at": member.updated_at,
            }
        )

    return {
        "workspace_id": workspace.id,
        "owner_email": workspace.owner_email,
        "company_name": workspace.company_name,
        "workspace_name": workspace.workspace_name,
        "description": workspace.description or "",
        "industry": workspace.industry or "",
        "stage": workspace.stage or "",
        "annual_revenue": workspace.annual_revenue or "",
        "employee_count": int(workspace.employee_count or 0),
        "qualifications": _clean_qualifications(workspace.qualifications or []),
        "team_members": members,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
    }


def serialize_workspace(workspace: ManagementWorkspace) -> Dict[str, Any]:
    return _workspace_to_response_payload(workspace)


def serialize_plan_run(plan_run: ManagementPlanRun) -> Dict[str, Any]:
    activities = plan_run.activities if isinstance(plan_run.activities, list) else []
    return {
        "plan_id": plan_run.id,
        "workspace_id": plan_run.workspace_id,
        "objective": plan_run.objective or "",
        "plan_summary": plan_run.plan_summary or "",
        "activities": activities,
        "created_at": plan_run.created_at,
    }


def build_workspace_prompt_context(workspace: ManagementWorkspace) -> str:
    quals = _clean_qualifications(workspace.qualifications or [])
    member_lines: List[str] = []
    for member in workspace.team_members or []:
        member_quals = _clean_qualifications(member.qualifications or [])
        member_lines.append(
            f"- {member.name or 'Unnamed'} ({member.role or 'Role pending'}): "
            f"{', '.join(member_quals) if member_quals else 'No qualifications listed'}"
        )

    return "\n".join(
        [
            f"Company: {workspace.company_name}",
            f"Workspace: {workspace.workspace_name}",
            f"Industry: {workspace.industry or 'N/A'}",
            f"Stage: {workspace.stage or 'N/A'}",
            f"Annual Revenue: {workspace.annual_revenue or 'N/A'}",
            f"Employee Count: {workspace.employee_count or 0}",
            f"Team Qualifications: {', '.join(quals) if quals else 'Not specified'}",
            f"Team Members:\n{chr(10).join(member_lines) if member_lines else 'None listed'}",
            f"Current Context: {workspace.description or 'N/A'}",
        ]
    )


def _fallback_plan(objective: str, time_horizon_weeks: int, workspace: ManagementWorkspace) -> Dict[str, Any]:
    quals = _clean_qualifications(workspace.qualifications or [])
    team_owner = "Ops Lead"
    if any("sales" in q.lower() for q in quals):
        team_owner = "Sales Lead"
    elif any("marketing" in q.lower() for q in quals):
        team_owner = "Marketing Lead"
    elif any("finance" in q.lower() for q in quals):
        team_owner = "Finance Lead"

    summary = (
        f"Execution plan for {workspace.company_name} focused on '{objective}' "
        f"over {time_horizon_weeks} week(s), paced to current team capacity."
    )
    return {
        "plan_summary": summary,
        "activities": [
            {
                "title": "Baseline and target setting",
                "owner": "Founder",
                "priority": "HIGH",
                "rationale": "Align team on current metrics, constraints, and expected outcome.",
                "week_target": 1,
                "success_metric": "Baseline dashboard and target approved.",
            },
            {
                "title": "Run focused execution sprint",
                "owner": team_owner,
                "priority": "HIGH",
                "rationale": "Prioritize the highest-leverage initiative tied to the objective.",
                "week_target": max(2, min(time_horizon_weeks - 1, 3)),
                "success_metric": "Primary KPI improves by at least 10%.",
            },
            {
                "title": "Review results and rebalance roadmap",
                "owner": "Founder",
                "priority": "MEDIUM",
                "rationale": "Convert outcomes into next-cycle decisions and resource allocation.",
                "week_target": time_horizon_weeks,
                "success_metric": "Next 30-day plan published with owners and milestones.",
            },
        ],
    }


def _invoke_plan_llm(
    objective: str,
    time_horizon_weeks: int,
    workspace: ManagementWorkspace,
) -> Dict[str, Any]:
    fallback = _fallback_plan(objective, time_horizon_weeks, workspace)
    if client is None:
        return fallback

    try:
        system_prompt = (
            "You are a startup management planning agent. "
            "Return strict JSON with keys: plan_summary (string), activities (array of exactly 3 items). "
            "Each activity must include title, owner, priority (LOW|MEDIUM|HIGH), rationale, week_target, success_metric."
        )
        user_prompt = (
            f"Objective: {objective}\n"
            f"Time horizon (weeks): {time_horizon_weeks}\n\n"
            f"Workspace context:\n{build_workspace_prompt_context(workspace)}"
        )
        response = client.chat.completions.create(
            model=os.getenv("SIMULATION_MODEL", "gpt-4o-mini"),
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(raw) if raw else {}
        if not isinstance(parsed, dict):
            return fallback
        if not isinstance(parsed.get("activities"), list) or not parsed.get("plan_summary"):
            return fallback
        activities = []
        for item in parsed["activities"][:3]:
            if not isinstance(item, dict):
                continue
            activities.append(
                PlannedActivity(
                    title=str(item.get("title") or "Planned activity"),
                    owner=str(item.get("owner") or "Founder"),
                    priority=str(item.get("priority") or "MEDIUM").upper(),
                    rationale=str(item.get("rationale") or "Execution rationale not specified."),
                    week_target=max(1, int(item.get("week_target") or 1)),
                    success_metric=str(item.get("success_metric") or "Metric not specified."),
                ).model_dump()
            )
        if len(activities) < 3:
            return fallback
        return {
            "plan_summary": str(parsed["plan_summary"]),
            "activities": activities,
        }
    except Exception:
        return fallback


def generate_management_plan(
    workspace: ManagementWorkspace,
    objective: str,
    time_horizon_weeks: int,
) -> Dict[str, Any]:
    return _invoke_plan_llm(objective, time_horizon_weeks, workspace)
