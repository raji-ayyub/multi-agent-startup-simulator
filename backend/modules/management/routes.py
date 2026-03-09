from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import (
    ManagementActivityMonitor,
    ManagementAgentMemory,
    ManagementPlanRun,
    ManagementTeamMember,
    ManagementWorkspace,
)
from .schemas import (
    ManagementActivityPlanRequest,
    ManagementActivityPlanResponse,
    ManagementCvParseResponse,
    ManagementMemoryResponse,
    ManagementMonitorItemResponse,
    ManagementMonitorUpdate,
    ManagementTeamMemberCreate,
    ManagementTeamMemberResponse,
    ManagementTeamMemberUpdate,
    ManagementWorkspaceCreate,
    ManagementWorkspaceResponse,
    ManagementWorkspaceUpdate,
)
from .cv_parser import extract_cv_text, parse_cv_profile
from .service import (
    build_agent_memory_context,
    compute_monitor_signal_score,
    extract_member_memory_payload,
    generate_management_plan,
    serialize_memory_item,
    serialize_monitor_item,
    serialize_plan_run,
    serialize_workspace,
)

management_router = APIRouter(prefix="/api/v1/management", tags=["management"])


def _clean_list(items):
    values = []
    for item in items or []:
        value = str(item or "").strip()
        if value:
            values.append(value[:120])
    return values[:100]


def _persist_team_member_memory(db: Session, member: ManagementTeamMember):
    payload = extract_member_memory_payload(
        member_name=member.name or "",
        role=member.role or "",
        qualifications=_clean_list(member.qualifications),
        qualification_notes=(member.qualification_notes or "")[:12000],
    )
    memory = ManagementAgentMemory(
        workspace_id=member.workspace_id,
        memory_type="TEAM_PROFILE",
        title=f"Team profile: {member.name}",
        payload={
            "member_id": member.id,
            "member_name": member.name,
            "role": member.role or "",
            **payload,
        },
    )
    db.add(memory)


def _persist_plan_monitor_items(db: Session, workspace_id: str, plan_run: ManagementPlanRun):
    activities = plan_run.activities if isinstance(plan_run.activities, list) else []
    for item in activities:
        if not isinstance(item, dict):
            continue
        week_target = max(1, int(item.get("week_target") or 1))
        due_date = plan_run.created_at + timedelta(days=(week_target - 1) * 7)
        priority = str(item.get("priority") or "MEDIUM").upper()
        status = "PLANNED"
        signal_score = compute_monitor_signal_score(status=status, due_date=due_date, priority=priority)
        monitor = ManagementActivityMonitor(
            workspace_id=workspace_id,
            plan_id=plan_run.id,
            title=str(item.get("title") or "Planned activity"),
            owner=str(item.get("owner") or "Unassigned"),
            priority=priority,
            due_date=due_date,
            status=status,
            progress_note="",
            signal_score=signal_score,
        )
        db.add(monitor)


@management_router.post("/cv/parse", response_model=ManagementCvParseResponse)
async def parse_management_cv(file: UploadFile = File(...)):
    file_name = file.filename or "cv-upload"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded CV file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="CV file exceeds 10MB limit.")

    try:
        text, _ = extract_cv_text(file_name, content)
        profile = parse_cv_profile(file_name=file_name, text=text)
        return ManagementCvParseResponse(**profile)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to parse CV file.")


@management_router.post("/workspaces", response_model=ManagementWorkspaceResponse)
def create_management_workspace(payload: ManagementWorkspaceCreate, db: Session = Depends(get_db)):
    workspace = ManagementWorkspace(
        owner_email=payload.owner_email,
        company_name=payload.company_name.strip(),
        workspace_name=payload.workspace_name.strip(),
        description=(payload.description or "").strip(),
        industry=(payload.industry or "").strip(),
        stage=(payload.stage or "").strip(),
        annual_revenue=(payload.annual_revenue or "").strip(),
        employee_count=payload.employee_count,
        qualifications=_clean_list(payload.qualifications),
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    if payload.team_members:
        for member in payload.team_members:
            member_row = ManagementTeamMember(
                workspace_id=workspace.id,
                name=member.name.strip(),
                role=(member.role or "").strip(),
                qualifications=_clean_list(member.qualifications),
                qualification_notes=(member.qualification_notes or "").strip()[:20000],
            )
            db.add(member_row)
            db.flush()
            _persist_team_member_memory(db, member_row)
        db.commit()
        db.refresh(workspace)

    return serialize_workspace(workspace)


@management_router.get("/workspaces", response_model=list[ManagementWorkspaceResponse])
def list_management_workspaces(
    owner_email: str = Query(..., min_length=5),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ManagementWorkspace)
        .filter(ManagementWorkspace.owner_email == owner_email)
        .order_by(ManagementWorkspace.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_workspace(item) for item in rows]


@management_router.get("/workspaces/{workspace_id}", response_model=ManagementWorkspaceResponse)
def get_management_workspace(workspace_id: str, db: Session = Depends(get_db)):
    row = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Management workspace not found.")
    return serialize_workspace(row)


@management_router.patch("/workspaces/{workspace_id}", response_model=ManagementWorkspaceResponse)
def update_management_workspace(
    workspace_id: str,
    payload: ManagementWorkspaceUpdate,
    db: Session = Depends(get_db),
):
    row = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    updates = payload.model_dump(exclude_none=True)
    if "workspace_name" in updates:
        row.workspace_name = updates["workspace_name"].strip()
    if "description" in updates:
        row.description = updates["description"].strip()
    if "industry" in updates:
        row.industry = updates["industry"].strip()
    if "stage" in updates:
        row.stage = updates["stage"].strip()
    if "annual_revenue" in updates:
        row.annual_revenue = updates["annual_revenue"].strip()
    if "employee_count" in updates:
        row.employee_count = updates["employee_count"]
    if "qualifications" in updates:
        row.qualifications = _clean_list(updates["qualifications"])

    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_workspace(row)


@management_router.get(
    "/workspaces/{workspace_id}/team",
    response_model=list[ManagementTeamMemberResponse],
)
def list_workspace_team_members(workspace_id: str, db: Session = Depends(get_db)):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")
    return serialize_workspace(workspace).get("team_members", [])


@management_router.post(
    "/workspaces/{workspace_id}/team",
    response_model=ManagementTeamMemberResponse,
)
def add_workspace_team_member(
    workspace_id: str,
    payload: ManagementTeamMemberCreate,
    db: Session = Depends(get_db),
):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    row = ManagementTeamMember(
        workspace_id=workspace_id,
        name=payload.name.strip(),
        role=(payload.role or "").strip(),
        qualifications=_clean_list(payload.qualifications),
        qualification_notes=(payload.qualification_notes or "").strip()[:20000],
    )
    db.add(row)
    db.flush()
    _persist_team_member_memory(db, row)
    db.commit()
    db.refresh(row)
    return ManagementTeamMemberResponse(
        member_id=row.id,
        name=row.name,
        role=row.role or "",
        qualifications=_clean_list(row.qualifications),
        qualification_notes=row.qualification_notes or "",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@management_router.patch(
    "/workspaces/{workspace_id}/team/{member_id}",
    response_model=ManagementTeamMemberResponse,
)
def update_workspace_team_member(
    workspace_id: str,
    member_id: str,
    payload: ManagementTeamMemberUpdate,
    db: Session = Depends(get_db),
):
    row = (
        db.query(ManagementTeamMember)
        .filter(ManagementTeamMember.workspace_id == workspace_id, ManagementTeamMember.id == member_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found.")

    updates = payload.model_dump(exclude_none=True)
    if "name" in updates:
        row.name = updates["name"].strip()
    if "role" in updates:
        row.role = updates["role"].strip()
    if "qualifications" in updates:
        row.qualifications = _clean_list(updates["qualifications"])
    if "qualification_notes" in updates:
        row.qualification_notes = updates["qualification_notes"].strip()[:20000]
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.flush()
    _persist_team_member_memory(db, row)
    db.commit()
    db.refresh(row)
    return ManagementTeamMemberResponse(
        member_id=row.id,
        name=row.name,
        role=row.role or "",
        qualifications=_clean_list(row.qualifications),
        qualification_notes=row.qualification_notes or "",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@management_router.delete("/workspaces/{workspace_id}/team/{member_id}")
def delete_workspace_team_member(
    workspace_id: str,
    member_id: str,
    db: Session = Depends(get_db),
):
    row = (
        db.query(ManagementTeamMember)
        .filter(ManagementTeamMember.workspace_id == workspace_id, ManagementTeamMember.id == member_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Team member not found.")

    db.delete(row)
    db.commit()
    return {"status": "deleted", "member_id": member_id}


@management_router.post(
    "/workspaces/{workspace_id}/plan",
    response_model=ManagementActivityPlanResponse,
)
def generate_workspace_plan(
    workspace_id: str,
    payload: ManagementActivityPlanRequest,
    db: Session = Depends(get_db),
):
    row = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    memory_rows = (
        db.query(ManagementAgentMemory)
        .filter(ManagementAgentMemory.workspace_id == workspace_id)
        .order_by(ManagementAgentMemory.created_at.desc())
        .limit(30)
        .all()
    )
    memory_context = build_agent_memory_context(memory_rows)

    plan = generate_management_plan(
        workspace=row,
        objective=payload.objective,
        time_horizon_weeks=payload.time_horizon_weeks,
        memory_context=memory_context,
    )
    plan_run = ManagementPlanRun(
        workspace_id=row.id,
        objective=payload.objective,
        plan_summary=plan.get("plan_summary", ""),
        activities=plan.get("activities", []),
    )
    db.add(plan_run)
    db.flush()
    _persist_plan_monitor_items(db, workspace_id=row.id, plan_run=plan_run)
    db.add(
        ManagementAgentMemory(
            workspace_id=row.id,
            memory_type="PLAN_RUN",
            title=f"Plan run: {payload.objective[:80]}",
            payload={
                "plan_id": plan_run.id,
                "objective": payload.objective,
                "plan_summary": plan.get("plan_summary", ""),
                "key_points": [
                    str(item.get("title"))
                    for item in (plan.get("activities") or [])
                    if isinstance(item, dict) and item.get("title")
                ][:5],
            },
        )
    )
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(plan_run)
    return ManagementActivityPlanResponse(**serialize_plan_run(plan_run))


@management_router.get(
    "/workspaces/{workspace_id}/plans",
    response_model=list[ManagementActivityPlanResponse],
)
def list_workspace_plans(
    workspace_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    rows = (
        db.query(ManagementPlanRun)
        .filter(ManagementPlanRun.workspace_id == workspace_id)
        .order_by(ManagementPlanRun.created_at.desc())
        .limit(limit)
        .all()
    )
    return [ManagementActivityPlanResponse(**serialize_plan_run(item)) for item in rows]


@management_router.get(
    "/workspaces/{workspace_id}/memory",
    response_model=list[ManagementMemoryResponse],
)
def list_workspace_memory(
    workspace_id: str,
    limit: int = Query(default=30, ge=1, le=200),
    db: Session = Depends(get_db),
):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    rows = (
        db.query(ManagementAgentMemory)
        .filter(ManagementAgentMemory.workspace_id == workspace_id)
        .order_by(ManagementAgentMemory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [ManagementMemoryResponse(**serialize_memory_item(item)) for item in rows]


@management_router.get(
    "/workspaces/{workspace_id}/monitor",
    response_model=list[ManagementMonitorItemResponse],
)
def list_workspace_monitor(
    workspace_id: str,
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")

    query = db.query(ManagementActivityMonitor).filter(ManagementActivityMonitor.workspace_id == workspace_id)
    if status:
        query = query.filter(ManagementActivityMonitor.status == status.upper())

    rows = query.order_by(ManagementActivityMonitor.due_date.asc()).limit(limit).all()
    return [ManagementMonitorItemResponse(**serialize_monitor_item(item)) for item in rows]


@management_router.patch(
    "/workspaces/{workspace_id}/monitor/{item_id}",
    response_model=ManagementMonitorItemResponse,
)
def update_monitor_item(
    workspace_id: str,
    item_id: str,
    payload: ManagementMonitorUpdate,
    db: Session = Depends(get_db),
):
    row = (
        db.query(ManagementActivityMonitor)
        .filter(ManagementActivityMonitor.workspace_id == workspace_id, ManagementActivityMonitor.id == item_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Monitor item not found.")

    updates = payload.model_dump(exclude_none=True)
    if "status" in updates:
        row.status = str(updates["status"]).upper()
    if "progress_note" in updates:
        row.progress_note = str(updates["progress_note"]).strip()[:5000]

    row.signal_score = compute_monitor_signal_score(
        status=row.status,
        due_date=row.due_date,
        priority=row.priority,
    )
    row.updated_at = datetime.utcnow()
    db.add(row)
    db.add(
        ManagementAgentMemory(
            workspace_id=workspace_id,
            memory_type="MONITOR_SIGNAL",
            title=f"Monitor update: {row.title[:80]}",
            payload={
                "monitor_item_id": row.id,
                "status": row.status,
                "signal_score": row.signal_score,
                "key_points": [row.progress_note] if row.progress_note else [],
            },
        )
    )
    db.commit()
    db.refresh(row)
    return ManagementMonitorItemResponse(**serialize_monitor_item(row))
