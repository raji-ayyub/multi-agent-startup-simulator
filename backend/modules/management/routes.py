from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ManagementTeamMember, ManagementWorkspace
from .schemas import (
    ManagementActivityPlanRequest,
    ManagementActivityPlanResponse,
    ManagementTeamMemberCreate,
    ManagementTeamMemberResponse,
    ManagementTeamMemberUpdate,
    ManagementWorkspaceCreate,
    ManagementWorkspaceResponse,
    ManagementWorkspaceUpdate,
)
from .service import generate_management_plan, serialize_workspace

management_router = APIRouter(prefix="/api/v1/management", tags=["management"])


def _clean_list(items):
    values = []
    for item in items or []:
        value = str(item or "").strip()
        if value:
            values.append(value[:120])
    return values[:100]


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
            db.add(
                ManagementTeamMember(
                    workspace_id=workspace.id,
                    name=member.name.strip(),
                    role=(member.role or "").strip(),
                    qualifications=_clean_list(member.qualifications),
                    qualification_notes=(member.qualification_notes or "").strip()[:20000],
                )
            )
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

    plan = generate_management_plan(
        workspace=row,
        objective=payload.objective,
        time_horizon_weeks=payload.time_horizon_weeks,
    )
    return ManagementActivityPlanResponse(
        workspace_id=row.id,
        objective=payload.objective,
        plan_summary=plan.get("plan_summary", ""),
        activities=plan.get("activities", []),
    )
