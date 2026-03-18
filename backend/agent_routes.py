from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_or_create_access_profile, require_roles
from database import get_db
from models import AgentRequest, BusinessInsightReport, CalendarEvent, ManagementWorkspace, SimulationRun, User, UserAccessProfile
from platform_service import create_notification
from schemas import (
    AdminOverviewResponse,
    AgentAccessResponse,
    AgentCatalogItem,
    AgentRequestCreate,
    AgentRequestDecision,
    AgentRequestResponse,
)

agent_router = APIRouter(prefix="/api/v1", tags=["agents"])

AGENT_CATALOG = [
    {
        "agent_type": "simulation_copilot",
        "display_name": "Simulation Copilot",
        "workspace_mode": "simulation",
        "description": "Helps founders sharpen startup briefs before running a board simulation.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "market_radar",
        "display_name": "Market Radar",
        "workspace_mode": "simulation",
        "description": "Focuses on market signals, positioning pressure, and category movement.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "execution_planner",
        "display_name": "Execution Planner",
        "workspace_mode": "management",
        "description": "Turns workspace context into actionable management plans and execution notes.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "business_report_agent",
        "display_name": "Business Insight Reporter",
        "workspace_mode": "management",
        "description": "Builds board-ready insight reports from simulation outcomes and operating context.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "ops_calendar_agent",
        "display_name": "Ops Calendar Agent",
        "workspace_mode": "management",
        "description": "Suggests execution checkpoints, review meetings, and due dates from management plans.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "talent_architect",
        "display_name": "Talent Architect",
        "workspace_mode": "management",
        "description": "Maps team capability, hiring gaps, and role fit from uploaded documents and CV signals.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
    {
        "agent_type": "platform_support",
        "display_name": "Platform Support",
        "workspace_mode": "platform",
        "description": "Guides users to the right area of the simulator, management vault, or settings flow.",
        "allowed_roles": ["FOUNDER", "OPERATOR"],
    },
]


def _serialize_agent_request(
    row: AgentRequest,
    *,
    requester_name: str | None = None,
    approved_by_email: str | None = None,
) -> AgentRequestResponse:
    return AgentRequestResponse(
        request_id=row.id,
        requester_name=(requester_name or row.requester_email or "").strip(),
        requester_email=row.requester_email,
        requester_role=row.requester_role,
        workspace_mode=row.workspace_mode,
        agent_type=row.agent_type,
        title=row.title,
        notes=row.notes or "",
        status=row.status,
        admin_notes=row.admin_notes or "",
        approved_by_email=approved_by_email,
        approved_at=row.approved_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@agent_router.get("/agents/catalog", response_model=list[AgentCatalogItem])
def list_agent_catalog(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_or_create_access_profile(db, current_user)
    return [
        AgentCatalogItem(**item)
        for item in AGENT_CATALOG
        if profile.role.upper() == "ADMIN" or profile.role.upper() in item["allowed_roles"]
    ]


@agent_router.get("/agents/requests", response_model=list[AgentRequestResponse])
def list_agent_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_or_create_access_profile(db, current_user)
    query = db.query(AgentRequest).order_by(AgentRequest.created_at.desc())
    if profile.role.upper() != "ADMIN":
        query = query.filter(AgentRequest.requester_user_id == current_user.id)

    rows = query.limit(100).all()
    related_user_ids = {
        user_id
        for user_id in [*(row.requester_user_id for row in rows if row.requester_user_id), *(row.approved_by_user_id for row in rows if row.approved_by_user_id)]
    }
    users_by_id = {}
    if related_user_ids:
        users_by_id = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(related_user_ids)).all()
        }
    return [
        _serialize_agent_request(
            row,
            requester_name=users_by_id.get(row.requester_user_id).full_name if users_by_id.get(row.requester_user_id) else None,
            approved_by_email=users_by_id.get(row.approved_by_user_id).email if users_by_id.get(row.approved_by_user_id) else None,
        )
        for row in rows
    ]


@agent_router.post("/agents/requests", response_model=AgentRequestResponse)
def create_agent_request(
    payload: AgentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_or_create_access_profile(db, current_user)
    catalog_item = next((item for item in AGENT_CATALOG if item["agent_type"] == payload.agent_type.strip()), None)
    if not catalog_item:
        raise HTTPException(status_code=400, detail="Unknown agent type.")
    request_row = AgentRequest(
        requester_user_id=current_user.id,
        requester_email=current_user.email,
        requester_role=profile.role.upper(),
        workspace_mode=payload.workspace_mode,
        agent_type=payload.agent_type.strip(),
        title=payload.title.strip(),
        notes=(payload.notes or "").strip(),
        status="PENDING",
    )
    db.add(request_row)
    db.flush()
    create_notification(
        db,
        category="AGENT_APPROVAL",
        title="New agent approval request",
        message=f"{current_user.full_name} ({current_user.email}) requested {catalog_item['display_name']} access.",
        link="/admin/dashboard",
        target_role="ADMIN",
        metadata={
            "request_id": request_row.id,
            "agent_type": request_row.agent_type,
            "requester_name": current_user.full_name,
            "requester_email": current_user.email,
            "requester_role": profile.role.upper(),
            "workspace_mode": payload.workspace_mode,
        },
    )
    db.commit()
    db.refresh(request_row)
    return _serialize_agent_request(request_row, requester_name=current_user.full_name)


@agent_router.patch("/agents/requests/{request_id}", response_model=AgentRequestResponse)
def decide_agent_request(
    request_id: str,
    payload: AgentRequestDecision,
    current_user: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(AgentRequest).filter(AgentRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Agent request not found.")

    row.status = payload.status
    row.admin_notes = (payload.admin_notes or "").strip()
    row.approved_by_user_id = current_user.id
    row.approved_at = datetime.utcnow() if payload.status == "APPROVED" else None
    row.updated_at = datetime.utcnow()
    db.add(row)
    create_notification(
        db,
        category="AGENT_APPROVAL",
        title=f"Agent request {payload.status.lower()}",
        message=f"Your request for {row.title} was {payload.status.lower()} by admin review.",
        link="/agents",
        target_user_id=row.requester_user_id,
        metadata={"request_id": row.id, "status": row.status},
    )
    db.commit()
    db.refresh(row)
    return _serialize_agent_request(row, requester_name=row.requester_email, approved_by_email=current_user.email)


@agent_router.get("/agents/active", response_model=list[AgentAccessResponse])
def list_active_agent_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_or_create_access_profile(db, current_user)
    query = db.query(AgentRequest).filter(AgentRequest.status == "APPROVED")
    if profile.role.upper() != "ADMIN":
        query = query.filter(AgentRequest.requester_user_id == current_user.id)
    rows = query.order_by(AgentRequest.updated_at.desc()).limit(100).all()
    deduped = {}
    for row in rows:
        key = (row.requester_user_id, row.workspace_mode, row.agent_type)
        deduped.setdefault(key, row)
    return [
        AgentAccessResponse(
            request_id=row.id,
            workspace_mode=row.workspace_mode,
            agent_type=row.agent_type,
            title=row.title,
            notes=row.notes or "",
            status=row.status,
            approved_at=row.approved_at,
            admin_notes=row.admin_notes or "",
        )
        for row in deduped.values()
    ]


@agent_router.get("/admin/overview", response_model=AdminOverviewResponse)
def get_admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    profiles = db.query(UserAccessProfile).all()
    total_users = db.query(User).count()
    operators = sum(1 for item in profiles if item.role.upper() == "OPERATOR")
    admins = sum(1 for item in profiles if item.role.upper() == "ADMIN")
    counts = {
        "total_users": total_users,
        "founders": max(0, total_users - operators - admins),
        "operators": operators,
        "admins": admins,
        "simulations": db.query(SimulationRun).count(),
        "workspaces": db.query(ManagementWorkspace).count(),
        "pending_agent_requests": db.query(AgentRequest).filter(AgentRequest.status == "PENDING").count(),
        "approved_agents": db.query(AgentRequest).filter(AgentRequest.status == "APPROVED").count(),
        "reports": db.query(BusinessInsightReport).count(),
        "calendar_items": db.query(CalendarEvent).count(),
    }

    recent_rows = (
        db.query(AgentRequest)
        .order_by(AgentRequest.created_at.desc())
        .limit(8)
        .all()
    )
    related_user_ids = {
        user_id
        for user_id in [*(row.requester_user_id for row in recent_rows if row.requester_user_id), *(row.approved_by_user_id for row in recent_rows if row.approved_by_user_id)]
    }
    users_by_id = {}
    if related_user_ids:
        users_by_id = {
            user.id: user
            for user in db.query(User).filter(User.id.in_(related_user_ids)).all()
        }
    recent_requests = [
        _serialize_agent_request(
            row,
            requester_name=users_by_id.get(row.requester_user_id).full_name if users_by_id.get(row.requester_user_id) else None,
            approved_by_email=users_by_id.get(row.approved_by_user_id).email if users_by_id.get(row.approved_by_user_id) else None,
        )
        for row in recent_rows
    ]

    return AdminOverviewResponse(counts=counts, recent_agent_requests=recent_requests)
