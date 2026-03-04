from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from management_schemas import (
    ManagementActivityPlanRequest,
    ManagementActivityPlanResponse,
    ManagementWorkspaceCreate,
    ManagementWorkspaceResponse,
    ManagementWorkspaceUpdate,
)
from management_service import generate_management_plan, serialize_workspace
from models import ManagementWorkspace

management_router = APIRouter(prefix="/api/v1/management", tags=["management"])


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
        qualifications=[str(item).strip() for item in payload.qualifications if str(item).strip()],
    )
    db.add(workspace)
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
        row.qualifications = [str(item).strip() for item in updates["qualifications"] if str(item).strip()]

    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_workspace(row)


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
