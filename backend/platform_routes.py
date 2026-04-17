from __future__ import annotations

from datetime import datetime
from math import ceil
import re
from urllib.parse import quote

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
    BusinessInsightReportVersion,
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
    build_report_html_from_document,
    build_report_pdf,
    build_report_pdf_from_html,
    create_notification,
    ensure_report_versions_initialized,
    enrich_document_with_generated_visuals,
    generate_business_report,
    list_report_templates,
    plan_report_outline,
    publish_report_version,
    report_payload_to_document_json,
    resolve_template_for_report_type,
    save_report_draft_version,
    serialize_calendar_event,
    serialize_notification,
    serialize_report,
    serialize_report_version,
    serialize_report_list_item,
    suggest_report_name,
)
from schemas import (
    BusinessReportDraftSaveRequest,
    BusinessReportDraftSaveResponse,
    BusinessReportEditorResponse,
    BusinessReportGenerateRequest,
    BusinessReportListItem,
    BusinessReportListResponse,
    BusinessReportPublishRequest,
    BusinessReportPublishResponse,
    BusinessReportPreviewRequest,
    BusinessReportUpdateRequest,
    BusinessReportVersionResponse,
    PlanOutlineRequest,
    PlanOutlineResponse,
    ReportTemplateItem,
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


def _slugify_filename(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "-", (value or "").strip()).strip("-_.").lower()
    return normalized or "business-insight-report"


def _build_export_filename_base(row: BusinessInsightReport, simulation: SimulationRun) -> str:
    stamp = (row.created_at or datetime.utcnow()).strftime("%Y%m%d")
    title = row.report_name or "Business Insight Report"
    startup = simulation.startup_name or "startup"
    return _slugify_filename(f"{title}-{startup}-{stamp}")


def _content_disposition_attachment(filename: str) -> str:
    encoded = quote(filename)
    return f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded}'


def _serialize_user(user: User, profile: UserAccessProfile | None) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        role=(profile.role if profile else "FOUNDER"),
        title=(profile.title if profile else ""),
        is_pro=(profile.is_pro if profile else False),
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


def _ensure_report_access(db: Session, current_user: User, report: BusinessInsightReport):
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and report.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this report.")


def _load_report_with_context(
    db: Session,
    current_user: User,
    report_id: str,
) -> tuple[BusinessInsightReport, SimulationRun, ManagementWorkspace | None]:
    report = db.query(BusinessInsightReport).filter(BusinessInsightReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    _ensure_report_access(db, current_user, report)

    simulation = db.query(SimulationRun).filter(SimulationRun.id == report.simulation_id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    workspace = None
    if report.workspace_id:
        workspace = db.query(ManagementWorkspace).filter(ManagementWorkspace.id == report.workspace_id).first()
    return report, simulation, workspace


def _select_report_document_json(
    db: Session,
    report: BusinessInsightReport,
    *,
    version_id: str | None = None,
) -> dict | None:
    version = None
    if version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    if version is None and report.latest_draft_version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == report.latest_draft_version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    if version is None and report.published_version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == report.published_version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    if version is None:
        return None
    return version.document_json if isinstance(version.document_json, dict) else None


def _select_report_version_row(
    db: Session,
    report: BusinessInsightReport,
    *,
    version_id: str | None = None,
) -> BusinessInsightReportVersion | None:
    version = None
    if version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    if version is None and report.latest_draft_version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == report.latest_draft_version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    if version is None and report.published_version_id:
        version = (
            db.query(BusinessInsightReportVersion)
            .filter(
                BusinessInsightReportVersion.id == report.published_version_id,
                BusinessInsightReportVersion.report_id == report.id,
            )
            .first()
        )
    return version


def _document_is_sparse(document_json: dict | None) -> bool:
    if not isinstance(document_json, dict):
        return True
    sections = document_json.get("sections")
    if not isinstance(sections, list) or not sections:
        return True
    chart_count = 0
    metric_count = 0
    table_count = 0
    rich_count = 0
    for section in sections:
        if not isinstance(section, dict):
            continue
        blocks = section.get("blocks")
        if not isinstance(blocks, list):
            continue
        for block in blocks:
            if not isinstance(block, dict):
                continue
            block_type = str(block.get("type") or "").strip().lower()
            if block_type == "chart":
                chart_count += 1
            elif block_type == "metric_grid":
                metric_count += 1
            elif block_type == "table":
                table_count += 1
            elif block_type == "rich_text":
                rich_count += 1
    if table_count > 0 or metric_count > 0:
        return False
    if chart_count >= 2:
        return False
    return rich_count < 6


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


@platform_router.get("/reports", response_model=BusinessReportListResponse)
def list_reports(
    workspace_id: str | None = Query(default=None),
    simulation_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=50),
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
    total = query.count()
    offset = (page - 1) * page_size
    rows = (
        query.order_by(BusinessInsightReport.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    total_pages = max(1, ceil(total / page_size)) if page_size > 0 else 1
    items = [BusinessReportListItem(**serialize_report_list_item(row)) for row in rows]
    return BusinessReportListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@platform_router.get("/reports/templates", response_model=list[ReportTemplateItem])
def get_report_templates():
    return [ReportTemplateItem(**item) for item in list_report_templates()]


@platform_router.post("/reports/plan-outline", response_model=PlanOutlineResponse)
def plan_report_outline_endpoint(
    payload: PlanOutlineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    simulation = db.query(SimulationRun).filter(SimulationRun.id == payload.simulation_id).first()
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    _ensure_simulation_access(db, current_user, simulation)
    outline = plan_report_outline(
        simulation=simulation,
        report_name=payload.report_name,
        report_type=payload.report_type,
    )
    return PlanOutlineResponse(outline=outline)


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
    selected_template = resolve_template_for_report_type(payload.report_type, payload.template_id)
    resolved_report_name = suggest_report_name(
        startup_name=simulation.startup_name,
        report_type=payload.report_type,
        provided_name=payload.report_name,
    )

    approved_outline = [s.model_dump() for s in payload.outline] if payload.outline else None
    report_payload = generate_business_report(
        simulation=simulation,
        workspace=workspace,
        report_name=resolved_report_name,
        report_type=payload.report_type,
        outline=approved_outline,
    )
    document_json = report_payload_to_document_json(
        report_payload,
        report_type=payload.report_type,
        template_id=selected_template["template_id"],
        simulation=simulation,
        workspace=workspace,
        layout_guidance=report_payload.get("layout_guidance"),
    )
    document_json = enrich_document_with_generated_visuals(
        document_json,
        simulation,
        report_type=payload.report_type,
    )
    try:
        export_html = build_report_html_from_document(
            document_json,
            simulation,
            workspace,
            template_id=selected_template["template_id"],
            quality="standard",
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Report HTML renderer is unavailable on the backend. "
                "Check report renderer dependencies before generating production reports."
            ),
        )
    row = BusinessInsightReport(
        owner_user_id=current_user.id,
        simulation_id=simulation.id,
        workspace_id=workspace.id if workspace else None,
        report_name=report_payload["report_name"],
        report_type=str(report_payload.get("report_type") or payload.report_type),
        template_id=selected_template["template_id"],
        status="READY",
        summary=report_payload["summary"],
        sections=report_payload["sections"],
        key_findings=report_payload["key_findings"],
        recommended_actions=report_payload["recommended_actions"],
        export_html=export_html,
    )
    db.add(row)
    db.flush()
    ensure_report_versions_initialized(
        db,
        row,
        created_by_user_id=current_user.id,
        initial_document_json=document_json,
    )
    create_notification(
        db,
        category="REPORT",
        title="Business report ready",
        message=f"{row.report_name} was generated from {simulation.startup_name}.",
        link=f"/reports/{row.id}",
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
    row, _, _ = _load_report_with_context(db, current_user, report_id)
    return BusinessReportResponse(**serialize_report(row))


@platform_router.get("/reports/{report_id}/editor", response_model=BusinessReportEditorResponse)
def get_report_editor(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)
    ensure_report_versions_initialized(db, row, created_by_user_id=current_user.id)

    version = _select_report_version_row(db, row)
    document_json = (
        version.document_json
        if version and isinstance(version.document_json, dict)
        else report_payload_to_document_json(
            serialize_report(row),
            report_type=getattr(row, "report_type", "business_report"),
            template_id=getattr(row, "template_id", "obsidian_board"),
            simulation=simulation,
            workspace=workspace,
        )
    )
    if _document_is_sparse(document_json):
        generated_document = report_payload_to_document_json(
            serialize_report(row),
            report_type=getattr(row, "report_type", "business_report"),
            template_id=getattr(row, "template_id", "obsidian_board"),
            simulation=simulation,
            workspace=workspace,
        )
        if isinstance(generated_document, dict) and generated_document.get("sections"):
            document_json = generated_document
    document_json = enrich_document_with_generated_visuals(
        document_json,
        simulation,
        report_type=getattr(row, "report_type", "business_report"),
    )

    return BusinessReportEditorResponse(
        report=BusinessReportResponse(**serialize_report(row)),
        active_version_id=version.id if version else row.published_version_id,
        document_json=document_json,
    )


@platform_router.get("/reports/{report_id}/versions", response_model=list[BusinessReportVersionResponse])
def list_report_versions(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, _, _ = _load_report_with_context(db, current_user, report_id)
    rows = (
        db.query(BusinessInsightReportVersion)
        .filter(BusinessInsightReportVersion.report_id == row.id)
        .order_by(BusinessInsightReportVersion.version_number.desc())
        .all()
    )
    return [BusinessReportVersionResponse(**serialize_report_version(item)) for item in rows]


@platform_router.post("/reports/{report_id}/drafts", response_model=BusinessReportDraftSaveResponse)
def save_report_draft(
    report_id: str,
    payload: BusinessReportDraftSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)
    ensure_report_versions_initialized(db, row, created_by_user_id=current_user.id)

    working_document = payload.document_json if isinstance(payload.document_json, dict) else {}
    if not working_document:
        working_document = report_payload_to_document_json(
            serialize_report(row),
            report_type=getattr(row, "report_type", "business_report"),
            template_id=getattr(row, "template_id", "obsidian_board"),
            simulation=simulation,
            workspace=workspace,
        )

    meta = working_document.get("meta")
    if not isinstance(meta, dict):
        meta = {}
        working_document["meta"] = meta
    meta.setdefault("report_name", row.report_name or "Business Insight Report")
    meta.setdefault("report_type", getattr(row, "report_type", "business_report"))
    meta.setdefault("template_id", getattr(row, "template_id", "obsidian_board"))
    meta.setdefault(
        "page_setup",
        {
            "size": "A4",
            "margins": {"top": 40, "right": 40, "bottom": 40, "left": 40},
            "background": "#ffffff",
            "font_scale": 100,
            "font_family": "Source Serif 4",
        },
    )

    working_document = enrich_document_with_generated_visuals(
        working_document,
        simulation,
        report_type=str(meta.get("report_type") or getattr(row, "report_type", "business_report")),
    )

    version, deduplicated = save_report_draft_version(
        db,
        row,
        working_document,
        created_by_user_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return BusinessReportDraftSaveResponse(
        report=BusinessReportResponse(**serialize_report(row)),
        version=BusinessReportVersionResponse(**serialize_report_version(version)),
        deduplicated=deduplicated,
    )


@platform_router.post("/reports/{report_id}/publish", response_model=BusinessReportPublishResponse)
def publish_report(
    report_id: str,
    payload: BusinessReportPublishRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)
    ensure_report_versions_initialized(db, row, created_by_user_id=current_user.id)

    source_version = _select_report_version_row(db, row, version_id=payload.version_id)
    if source_version is None:
        raise HTTPException(status_code=404, detail="No report version available to publish.")

    published = publish_report_version(
        db,
        row,
        source_version,
        created_by_user_id=current_user.id,
    )
    try:
        row.export_html = build_report_html_from_document(
            published.document_json if isinstance(published.document_json, dict) else {},
            simulation,
            workspace,
            template_id=getattr(row, "template_id", "obsidian_board"),
            quality="standard",
        )
    except Exception:
        pass

    db.add(row)
    db.commit()
    db.refresh(row)

    return BusinessReportPublishResponse(
        report=BusinessReportResponse(**serialize_report(row)),
        version=BusinessReportVersionResponse(**serialize_report_version(published)),
    )


@platform_router.delete("/reports/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(BusinessInsightReport).filter(BusinessInsightReport.id == report_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found.")
    _ensure_report_access(db, current_user, row)

    # Explicitly clear versions to avoid residual records when FK cascade is not enforced.
    db.query(BusinessInsightReportVersion).filter(BusinessInsightReportVersion.report_id == row.id).delete()
    db.delete(row)
    db.commit()
    return {"deleted": True, "report_id": report_id}


@platform_router.patch("/reports/{report_id}", response_model=BusinessReportResponse)
def update_report(
    report_id: str,
    payload: BusinessReportUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)
    updates = payload.model_dump(exclude_none=True)

    if "report_name" in updates:
        row.report_name = str(updates["report_name"]).strip()
    if "summary" in updates:
        row.summary = str(updates["summary"] or "").strip()
    if "sections" in updates:
        row.sections = [section.model_dump(mode="json") for section in (payload.sections or [])]
    if "key_findings" in updates:
        row.key_findings = [str(item).strip() for item in (payload.key_findings or []) if str(item).strip()]
    if "recommended_actions" in updates:
        row.recommended_actions = [str(item).strip() for item in (payload.recommended_actions or []) if str(item).strip()]
    if "template_id" in updates:
        template = resolve_template_for_report_type(getattr(row, "report_type", "business_report"), payload.template_id)
        row.template_id = template["template_id"]

    try:
        row.export_html = build_report_html(
            serialize_report(row),
            simulation,
            workspace,
            report_type=getattr(row, "report_type", "business_report"),
            template_id=getattr(row, "template_id", "obsidian_board"),
            quality="standard",
        )
    except Exception:
        # Keep content update functional even if renderer dependencies are missing.
        pass

    row.updated_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return BusinessReportResponse(**serialize_report(row))


@platform_router.get("/reports/{report_id}/export")
def export_report(
    report_id: str,
    format: str = Query(default="pdf"),
    report_type: str | None = Query(default=None),
    quality: str = Query(default="standard"),
    template_id: str | None = Query(default=None),
    version_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)

    normalized_quality = str(quality or "standard").strip().lower()
    if normalized_quality not in {"standard", "premium"}:
        normalized_quality = "standard"

    payload = serialize_report(row)
    normalized_report_type = (report_type or "").strip().lower()
    if not normalized_report_type:
        normalized_report_type = payload.get("report_type") or "business_report"
    export_base_name = _build_export_filename_base(row, simulation)
    if normalized_report_type and normalized_report_type != "viability_report":
        export_base_name = f"{export_base_name}-{_slugify_filename(normalized_report_type)}"

    document_json = _select_report_document_json(db, row, version_id=version_id)
    if version_id and document_json is None:
        raise HTTPException(status_code=404, detail="Report version not found.")
    doc_meta = document_json.get("meta") if isinstance(document_json, dict) and isinstance(document_json.get("meta"), dict) else {}
    if document_json is not None and not (report_type or "").strip():
        normalized_report_type = str(doc_meta.get("report_type") or normalized_report_type).strip().lower() or normalized_report_type

    selected_template = resolve_template_for_report_type(
        normalized_report_type,
        (template_id or "").strip().lower() or str(doc_meta.get("template_id") or payload.get("template_id") or ""),
    )
    final_template_id = selected_template["template_id"]

    if format.lower() == "gdocs":
        try:
            if document_json is not None:
                html_source = build_report_html_from_document(
                    document_json,
                    simulation,
                    workspace,
                    template_id=final_template_id,
                    quality=normalized_quality,
                )
            else:
                html_source = build_report_html(
                    payload,
                    simulation,
                    workspace,
                    report_type=normalized_report_type,
                    template_id=final_template_id,
                    quality=normalized_quality,
                )
        except Exception:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Report HTML renderer is unavailable on the backend. "
                    "Cannot export Google Docs HTML until renderer dependencies are fixed."
                ),
            )
        html_bytes = html_source.encode("utf-8")
        return Response(
            content=html_bytes,
            media_type="text/html; charset=utf-8",
            headers={
                "Content-Disposition": _content_disposition_attachment(
                    f"{export_base_name}-google-docs-import.html"
                )
            },
        )

    try:
        if document_json is not None:
            html_source = build_report_html_from_document(
                document_json,
                simulation,
                workspace,
                template_id=final_template_id,
                quality=normalized_quality,
            )
        else:
            html_source = build_report_html(
                payload,
                simulation,
                workspace,
                report_type=normalized_report_type,
                template_id=final_template_id,
                quality=normalized_quality,
            )
        pdf_bytes = build_report_pdf_from_html(html_source)
    except Exception:
        try:
            pdf_bytes = build_report_pdf(
                payload,
                simulation,
                workspace,
                report_type=normalized_report_type,
                template_id=final_template_id,
                quality=normalized_quality,
                allow_legacy_fallback=False,
            )
        except Exception:
            raise HTTPException(
                status_code=503,
                detail=(
                    "High-quality PDF renderer is unavailable on the backend. "
                    "Install WeasyPrint in the backend environment or export as Google Docs HTML."
                ),
            )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition_attachment(f"{export_base_name}.pdf")},
    )


@platform_router.get("/reports/{report_id}/preview")
def preview_report(
    report_id: str,
    quality: str = Query(default="standard"),
    template_id: str | None = Query(default=None),
    version_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)

    normalized_quality = str(quality or "standard").strip().lower()
    if normalized_quality not in {"standard", "premium"}:
        normalized_quality = "standard"

    payload = serialize_report(row)
    normalized_report_type = (payload.get("report_type") or "business_report").strip().lower()
    document_json = _select_report_document_json(db, row, version_id=version_id)
    if version_id and document_json is None:
        raise HTTPException(status_code=404, detail="Report version not found.")
    doc_meta = document_json.get("meta") if isinstance(document_json, dict) and isinstance(document_json.get("meta"), dict) else {}
    if document_json is not None:
        normalized_report_type = str(doc_meta.get("report_type") or normalized_report_type).strip().lower() or normalized_report_type

    selected_template = resolve_template_for_report_type(
        normalized_report_type,
        (template_id or "").strip().lower() or str(doc_meta.get("template_id") or payload.get("template_id") or ""),
    )
    final_template_id = selected_template["template_id"]

    html_source = ""
    try:
        if document_json is not None:
            html_source = build_report_html_from_document(
                document_json,
                simulation,
                workspace,
                template_id=final_template_id,
                quality=normalized_quality,
            )
        else:
            html_source = build_report_html(
                payload,
                simulation,
                workspace,
                report_type=normalized_report_type,
                template_id=final_template_id,
                quality=normalized_quality,
            )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Report renderer is unavailable on the backend. "
                "Cannot produce HTML preview until renderer dependencies are fixed."
            ),
        )

    return Response(content=html_source, media_type="text/html; charset=utf-8")


@platform_router.post("/reports/{report_id}/preview")
def preview_report_draft(
    report_id: str,
    payload: BusinessReportPreviewRequest,
    quality: str = Query(default="standard"),
    template_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, simulation, workspace = _load_report_with_context(db, current_user, report_id)
    normalized_quality = str(quality or "standard").strip().lower()
    if normalized_quality not in {"standard", "premium"}:
        normalized_quality = "standard"

    working_payload = serialize_report(row)
    updates = payload.model_dump(exclude_none=True)

    if "report_name" in updates:
        working_payload["report_name"] = str(updates["report_name"] or "").strip() or working_payload["report_name"]
    if "report_type" in updates:
        working_payload["report_type"] = str(updates["report_type"] or "").strip().lower() or working_payload["report_type"]
    if "summary" in updates:
        working_payload["summary"] = str(updates["summary"] or "").strip()
    if payload.sections is not None:
        working_payload["sections"] = [section.model_dump(mode="json") for section in (payload.sections or [])]
    if payload.key_findings is not None:
        working_payload["key_findings"] = [str(item).strip() for item in (payload.key_findings or []) if str(item).strip()]
    if payload.recommended_actions is not None:
        working_payload["recommended_actions"] = [str(item).strip() for item in (payload.recommended_actions or []) if str(item).strip()]

    selected_template = resolve_template_for_report_type(
        working_payload.get("report_type"),
        (template_id or "").strip().lower() or updates.get("template_id") or working_payload.get("template_id"),
    )
    final_template_id = selected_template["template_id"]

    try:
        html_source = build_report_html(
            working_payload,
            simulation,
            workspace,
            report_type=working_payload.get("report_type"),
            template_id=final_template_id,
            quality=normalized_quality,
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Report renderer is unavailable on the backend. "
                "Cannot produce HTML preview until renderer dependencies are fixed."
            ),
        )

    return Response(content=html_source, media_type="text/html; charset=utf-8")


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
    if "is_pro" in updates:
        profile.is_pro = bool(updates["is_pro"])

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
