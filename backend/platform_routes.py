from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from auth import get_current_user, get_or_create_access_profile, require_roles
from database import get_db
from models import (
    AgentRequest,
    AppNotification,
    BusinessInsightReport,
    CalendarEvent,
    ManagementPlanRun,
    ManagementWorkspace,
    NotificationReadReceipt,
    SimulationRun,
    User,
    UserAccessProfile,
)
from platform_service import (
    build_calendar_suggestions,
    build_report_html,
    build_report_pdf,
    create_notification,
    generate_business_report,
    serialize_calendar_event,
    serialize_notification,
    serialize_report,
)
from schemas import (
    BusinessReportGenerateRequest,
    BusinessReportResponse,
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
    CalendarSuggestionRequest,
    NotificationReadResponse,
    NotificationResponse,
    UserAdminUpdate,
    UserResponse,
)

platform_router = APIRouter(prefix="/api/v1", tags=["platform"])


def _serialize_user(user: User, profile: UserAccessProfile | None) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        role=(profile.role if profile else "FOUNDER"),
        title=(profile.title if profile else ""),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _ensure_workspace_access(db: Session, current_user: User, workspace: ManagementWorkspace):
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and workspace.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="You do not have access to this workspace.")


def _ensure_simulation_access(db: Session, current_user: User, simulation: SimulationRun):
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and simulation.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="You do not have access to this simulation.")


def _notification_query(db: Session, current_user: User, profile: UserAccessProfile):
    query = db.query(AppNotification)
    if profile.role.upper() == "ADMIN":
        return query

    role = (profile.role or "").upper()
    return query.filter(
        or_(
            AppNotification.target_user_id == current_user.id,
            and_(
                AppNotification.target_user_id.is_(None),
                AppNotification.target_role == role,
            ),
        )
    )


def _notification_read_exists(db: Session, user_id: int):
    return (
        db.query(NotificationReadReceipt.id)
        .filter(
            NotificationReadReceipt.notification_id == AppNotification.id,
            NotificationReadReceipt.user_id == user_id,
        )
        .exists()
    )


def _notification_receipt_map(db: Session, user_id: int, notification_ids: list[str]) -> dict[str, datetime]:
    if not notification_ids:
        return {}

    rows = (
        db.query(NotificationReadReceipt.notification_id, NotificationReadReceipt.read_at)
        .filter(
            NotificationReadReceipt.user_id == user_id,
            NotificationReadReceipt.notification_id.in_(notification_ids),
        )
        .all()
    )
    return {notification_id: read_at for notification_id, read_at in rows if notification_id}


def _notification_user_email_map(db: Session, target_user_ids: list[int]) -> dict[int, str]:
    if not target_user_ids:
        return {}

    rows = db.query(User.id, User.email).filter(User.id.in_(target_user_ids)).all()
    return {user_id: email for user_id, email in rows if user_id is not None and email}


def _serialize_notifications_for_viewer(
    db: Session,
    current_user: User,
    rows: list[AppNotification],
) -> list[NotificationResponse]:
    notification_ids = [row.id for row in rows if row.id]
    target_user_ids = list({row.target_user_id for row in rows if row.target_user_id is not None})
    receipt_map = _notification_receipt_map(db, current_user.id, notification_ids)
    email_map = _notification_user_email_map(db, target_user_ids)

    return [
        NotificationResponse(
            **serialize_notification(
                row,
                viewer_read_at=receipt_map.get(row.id),
                target_user_email=email_map.get(row.target_user_id) if row.target_user_id is not None else None,
            )
        )
        for row in rows
    ]


@platform_router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    query = _notification_query(db, current_user, profile)
    if unread_only:
        query = query.filter(~_notification_read_exists(db, current_user.id))
    rows = query.order_by(AppNotification.created_at.desc()).limit(limit).all()
    return _serialize_notifications_for_viewer(db, current_user, rows)


@platform_router.patch("/notifications/{notification_id}/read", response_model=NotificationReadResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    row = (
        _notification_query(db, current_user, profile)
        .filter(AppNotification.id == notification_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found.")

    receipt = (
        db.query(NotificationReadReceipt)
        .filter(
            NotificationReadReceipt.notification_id == row.id,
            NotificationReadReceipt.user_id == current_user.id,
        )
        .first()
    )
    if not receipt:
        receipt = NotificationReadReceipt(
            notification_id=row.id,
            user_id=current_user.id,
            read_at=datetime.utcnow(),
        )
    else:
        receipt.read_at = datetime.utcnow()
    db.add(receipt)
    db.commit()
    return NotificationReadResponse(updated=1)


@platform_router.post("/notifications/read-all", response_model=NotificationReadResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    rows = (
        _notification_query(db, current_user, profile)
        .filter(~_notification_read_exists(db, current_user.id))
        .all()
    )
    now = datetime.utcnow()
    for row in rows:
        db.add(
            NotificationReadReceipt(
                notification_id=row.id,
                user_id=current_user.id,
                read_at=now,
            )
        )
    db.commit()
    return NotificationReadResponse(updated=len(rows))


@platform_router.get("/reports", response_model=list[BusinessReportResponse])
def list_reports(
    workspace_id: str | None = Query(default=None),
    simulation_id: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    query = db.query(BusinessInsightReport)
    if profile.role.upper() != "ADMIN":
        query = query.filter(BusinessInsightReport.owner_user_id == current_user.id)
    if workspace_id:
        query = query.filter(BusinessInsightReport.workspace_id == workspace_id)
    if simulation_id:
        query = query.filter(BusinessInsightReport.simulation_id == simulation_id)
    rows = query.order_by(BusinessInsightReport.created_at.desc()).limit(limit).all()
    return [BusinessReportResponse(**serialize_report(row)) for row in rows]


@platform_router.post("/reports/generate", response_model=BusinessReportResponse)
def generate_report(
    payload: BusinessReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    simulation = db.query(SimulationRun).filter(SimulationRun.id == payload.simulation_id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    _ensure_simulation_access(db, current_user, simulation)

    workspace = None
    if payload.workspace_id:
        workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == payload.workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Management workspace not found.")
        _ensure_workspace_access(db, current_user, workspace)

    report_payload = generate_business_report(
        simulation=simulation,
        workspace=workspace,
        report_name=payload.report_name.strip(),
    )
    export_html = build_report_html(report_payload, simulation)
    row = BusinessInsightReport(
        owner_user_id=current_user.id,
        simulation_id=simulation.id,
        workspace_id=workspace.id if workspace else None,
        report_name=report_payload["report_name"],
        status="READY",
        summary=report_payload["summary"],
        sections=report_payload["sections"],
        key_findings=report_payload["key_findings"],
        recommended_actions=report_payload["recommended_actions"],
        export_html=export_html,
    )
    db.add(row)
    db.flush()
    create_notification(
        db,
        category="REPORT",
        title="Business report ready",
        message=f"{row.report_name} was generated from {simulation.startup_name}.",
        link=f"/reports?report={row.id}",
        target_user_id=current_user.id,
        metadata={"report_id": row.id, "simulation_id": simulation.id},
    )
    db.commit()
    db.refresh(row)
    return BusinessReportResponse(**serialize_report(row))


@platform_router.get("/reports/{report_id}", response_model=BusinessReportResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(BusinessInsightReport).filter(BusinessInsightReport.id == report_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and row.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this report.")
    return BusinessReportResponse(**serialize_report(row))


@platform_router.get("/reports/{report_id}/export")
def export_report(
    report_id: str,
    format: str = Query(default="pdf"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(BusinessInsightReport).filter(BusinessInsightReport.id == report_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and row.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this report.")
    simulation = db.query(SimulationRun).filter(SimulationRun.id == row.simulation_id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    payload = serialize_report(row)
    safe_name = (row.report_name or "business-insight-report").replace(" ", "-").lower()
    if format.lower() == "gdocs":
        html_bytes = (row.export_html or build_report_html(payload, simulation)).encode("utf-8")
        return Response(
            content=html_bytes,
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={safe_name}-google-docs-import.html"},
        )

    pdf_bytes = build_report_pdf(payload, simulation)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.pdf"},
    )


@platform_router.get("/calendar/events", response_model=list[CalendarEventResponse])
def list_calendar_events(
    workspace_id: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    query = db.query(CalendarEvent)
    if profile.role.upper() != "ADMIN":
        query = query.filter(CalendarEvent.owner_user_id == current_user.id)
    if workspace_id:
        query = query.filter(CalendarEvent.workspace_id == workspace_id)
    if date_from:
        query = query.filter(CalendarEvent.starts_at >= date_from)
    if date_to:
        query = query.filter(CalendarEvent.starts_at <= date_to)
    rows = query.order_by(CalendarEvent.starts_at.asc()).limit(limit).all()
    return [CalendarEventResponse(**serialize_calendar_event(row)) for row in rows]


@platform_router.post("/calendar/events", response_model=CalendarEventResponse)
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.ends_at and payload.ends_at < payload.starts_at:
        raise HTTPException(status_code=400, detail="Event end time cannot be before the start time.")

    workspace = None
    if payload.workspace_id:
        workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == payload.workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Management workspace not found.")
        _ensure_workspace_access(db, current_user, workspace)

    if payload.simulation_id:
        simulation = db.query(SimulationRun).filter(SimulationRun.id == payload.simulation_id).first()
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found.")
        _ensure_simulation_access(db, current_user, simulation)

    row = CalendarEvent(
        creator_user_id=current_user.id,
        owner_user_id=current_user.id,
        workspace_id=payload.workspace_id,
        simulation_id=payload.simulation_id,
        title=payload.title.strip(),
        description=(payload.description or "").strip(),
        event_type=(payload.event_type or "TASK").upper(),
        priority=payload.priority,
        source="USER",
        permission_status="APPROVED",
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
    )
    db.add(row)
    db.flush()
    create_notification(
        db,
        category="CALENDAR",
        title="Calendar item created",
        message=f"{row.title} was added to your management calendar.",
        link="/calendar",
        target_user_id=current_user.id,
        metadata={"event_id": row.id},
    )
    db.commit()
    db.refresh(row)
    return CalendarEventResponse(**serialize_calendar_event(row))


@platform_router.post("/calendar/events/suggest", response_model=list[CalendarEventResponse])
def suggest_calendar_events(
    payload: CalendarSuggestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Management workspace not found.")
    _ensure_workspace_access(db, current_user, workspace)

    plan_run = None
    if payload.plan_id:
        plan_run = (
            db.query(ManagementPlanRun)
            .filter(ManagementPlanRun.id == payload.plan_id, ManagementPlanRun.workspace_id == workspace.id)
            .first()
        )
    if plan_run is None:
        plan_run = (
            db.query(ManagementPlanRun)
            .filter(ManagementPlanRun.workspace_id == workspace.id)
            .order_by(ManagementPlanRun.created_at.desc())
            .first()
        )

    simulation = None
    if payload.simulation_id:
        simulation = db.query(SimulationRun).filter(SimulationRun.id == payload.simulation_id).first()
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found.")
        _ensure_simulation_access(db, current_user, simulation)

    suggestions = build_calendar_suggestions(
        workspace=workspace,
        plan_run=plan_run,
        simulation=simulation,
        prompt=payload.prompt,
    )
    rows = []
    for item in suggestions:
        row = CalendarEvent(
            creator_user_id=current_user.id,
            owner_user_id=current_user.id,
            workspace_id=item["workspace_id"],
            simulation_id=item["simulation_id"],
            title=item["title"],
            description=item["description"],
            event_type=item["event_type"],
            priority=item["priority"],
            source=item["source"],
            permission_status=item["permission_status"],
            starts_at=item["starts_at"],
            ends_at=item["ends_at"],
        )
        db.add(row)
        rows.append(row)

    create_notification(
        db,
        category="CALENDAR",
        title="Agent event suggestions ready",
        message="Review and approve the new agent-suggested tasks in your calendar.",
        link="/calendar",
        target_user_id=current_user.id,
        metadata={"workspace_id": workspace.id, "count": len(rows)},
    )
    db.commit()
    for row in rows:
        db.refresh(row)
    return [CalendarEventResponse(**serialize_calendar_event(row)) for row in rows]


@platform_router.patch("/calendar/events/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: str,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and row.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this calendar item.")

    updates = payload.model_dump(exclude_none=True)
    for field in ["title", "description", "event_type", "priority", "starts_at", "ends_at", "permission_status"]:
        if field in updates:
            value = updates[field]
            if isinstance(value, str):
                value = value.strip()
            setattr(row, field, value)
    if row.ends_at and row.ends_at < row.starts_at:
        raise HTTPException(status_code=400, detail="Event end time cannot be before the start time.")
    row.updated_at = datetime.utcnow()
    db.add(row)
    if "permission_status" in updates:
        create_notification(
            db,
            category="CALENDAR",
            title="Calendar permission updated",
            message=f"{row.title} is now {row.permission_status.lower()}.",
            link="/calendar",
            target_user_id=row.owner_user_id,
            metadata={"event_id": row.id, "permission_status": row.permission_status},
        )
    db.commit()
    db.refresh(row)
    return CalendarEventResponse(**serialize_calendar_event(row))


@platform_router.patch("/admin/users/{user_id}", response_model=UserResponse)
def update_admin_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    profile = get_or_create_access_profile(db, user)
    updates = payload.model_dump(exclude_none=True)

    if "role" in updates:
        profile.role = str(updates["role"]).upper()
    if "title" in updates:
        profile.title = str(updates["title"] or "").strip()
    if "is_active" in updates:
        user.is_active = bool(updates["is_active"])

    user.updated_at = datetime.utcnow()
    db.add(user)
    db.add(profile)
    create_notification(
        db,
        category="ADMIN",
        title="Account access updated",
        message=f"An admin updated your access profile. Role: {profile.role}.",
        link="/settings",
        target_user_id=user.id,
        metadata={"updated_by": current_user.email, "role": profile.role, "is_active": user.is_active},
    )
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _serialize_user(user, profile)
