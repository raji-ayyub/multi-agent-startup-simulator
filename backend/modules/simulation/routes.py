import asyncio
import os
import re
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user, get_or_create_access_profile
from database import get_db
from models import SimulationIntakeDocument, SimulationRun, User
from modules.management.cv_parser import extract_cv_text
from platform_service import create_notification
from .schemas import (
    SimulationIntakeFileResponse,
    SimulationIntakeTurnRequest,
    SimulationIntakeTurnResponse,
    SimulationRerunRequest,
    SimulationRunDetail,
    SimulationRunRequest,
    SimulationRunResponse,
    SimulationRunSummary,
)
from .service import run_intake_turn, run_simulation

simulation_router = APIRouter(prefix="/api/v1/simulations", tags=["simulations"])
MAX_SIMULATION_VERSION = 3
MAX_SIMULATION_INTAKE_TEXT_CHARS = int(os.getenv("SIMULATION_INTAKE_MAX_DOCUMENT_CHARS", "250000"))


@simulation_router.get("/intake/requirements")
def simulation_intake_requirements():
    schema = SimulationRunRequest.model_json_schema()
    fields = schema.get("properties", {})
    user_fields = [
        {
            "key": key,
            "label": value.get("title") or key.replace("_", " ").title(),
            "description": value.get("description", ""),
        }
        for key, value in fields.items()
        if value.get("user_input", True)
    ]
    return {
        "required": user_fields,
        "additional_context": [],
    }


def _persist_simulation_run(db: Session, payload: SimulationRunRequest, result: SimulationRunResponse) -> SimulationRun:
    analysis_bundle = {
        "assumptions": result.assumptions,
        "deterministic_signals": result.deterministic_signals,
        "uncertainty": result.uncertainty,
    }
    record = SimulationRun(
        id=result.simulation_id,
        owner_email=payload.owner_email,
        startup_name=result.startup_name,
        status=result.status,
        input_payload={**payload.model_dump(), "_simulation_analysis": analysis_bundle},
        metrics=result.metrics,
        overall_score=result.overall_score,
        recommendations=result.recommendations,
        agents=[item.model_dump() for item in result.agents],
        synthesis=result.synthesis,
        logs=[item.model_dump() for item in result.logs],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _split_startup_name_version(name: str | None) -> tuple[str, int]:
    value = (name or "").strip()
    if not value:
        return "Startup", 1
    match = re.match(r"^(?P<base>.+?)_v(?P<version>\d+)$", value, flags=re.IGNORECASE)
    if not match:
        return value, 1
    base = (match.group("base") or "").strip() or "Startup"
    version = max(1, int(match.group("version") or 1))
    return base, version


def _next_versioned_startup_name(
    db: Session,
    owner_email: str | None,
    original_name: str,
) -> str:
    base, _ = _split_startup_name_version(original_name)
    query = db.query(SimulationRun.startup_name)
    if owner_email:
        query = query.filter(SimulationRun.owner_email == owner_email)
    names = [row[0] for row in query.filter(SimulationRun.startup_name.like(f"{base}%")).all() if row and row[0]]

    max_version = 1
    for name in names:
        candidate_base, candidate_version = _split_startup_name_version(name)
        if candidate_base.lower() == base.lower():
            max_version = max(max_version, candidate_version)

    if max_version >= MAX_SIMULATION_VERSION:
        raise HTTPException(
            status_code=400,
            detail=f"New version reruns are limited to v{MAX_SIMULATION_VERSION}. Use standard rerun for further iterations.",
        )
    return f"{base}_v{max_version + 1}"


@simulation_router.post("/intake/file", response_model=SimulationIntakeFileResponse)
async def simulation_intake_file_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_name = file.filename or "simulation-upload"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 10MB limit.")

    extension = Path(file_name).suffix.lower().lstrip(".")
    try:
        try:
            extracted_text, _ = await asyncio.to_thread(extract_cv_text, file_name, content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not str(extracted_text or "").strip():
            raise HTTPException(status_code=400, detail="Uploaded file does not contain readable text.")
        if len(extracted_text) > MAX_SIMULATION_INTAKE_TEXT_CHARS:
            raise HTTPException(
                status_code=413,
                detail=(
                    "The extracted document is too large to send to the intake model in full. "
                    "Please split it into smaller documents and upload them separately."
                ),
            )
        document_id = str(uuid.uuid4())
        db.add(
            SimulationIntakeDocument(
                document_id=document_id,
                owner_user_id=current_user.id,
                file_name=file_name,
                extracted_text=extracted_text,
            )
        )
        db.commit()
        return SimulationIntakeFileResponse(
            file_name=file_name,
            extension=extension,
            document_id=document_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Unable to store the extracted document for intake.") from exc


@simulation_router.post("/intake/turn", response_model=SimulationIntakeTurnResponse)
def simulation_intake_turn(
    payload: SimulationIntakeTurnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        document_ids = list(dict.fromkeys(payload.document_ids))
        document_context = ""
        if document_ids:
            documents = (
                db.query(SimulationIntakeDocument)
                .filter(
                    SimulationIntakeDocument.owner_user_id == current_user.id,
                    SimulationIntakeDocument.document_id.in_(document_ids),
                )
                .all()
            )
            documents_by_id = {row.document_id: row for row in documents}
            if set(documents_by_id) != set(document_ids):
                raise HTTPException(status_code=404, detail="An uploaded proposal was not found for this account.")
            if any(not str(documents_by_id[document_id].extracted_text or "").strip() for document_id in document_ids):
                raise HTTPException(
                    status_code=410,
                    detail="A saved upload has no extracted text. Remove it and upload the document again.",
                )
            document_context = "\n\n".join(
                f"--- Full extracted document: {documents_by_id[document_id].file_name} ---\n"
                f"{documents_by_id[document_id].extracted_text}"
                for document_id in document_ids
            )
            if len(document_context) > MAX_SIMULATION_INTAKE_TEXT_CHARS:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "The combined extracted documents are too large to send to the intake model in full. "
                        "Remove some documents or split them into smaller parts."
                    ),
                )
        return run_intake_turn(
            draft=payload.draft,
            user_message=payload.user_message,
            history=payload.history,
            document_context=document_context,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Intake turn failed: {str(exc)}")


@simulation_router.post("/run", response_model=SimulationRunResponse)
def run_simulation_endpoint(
    payload: SimulationRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        scoped_payload = payload.model_copy(update={"owner_email": current_user.email})
        intake_fields = {
            key: value
            for key, value in SimulationRunRequest.model_fields.items()
            if value.json_schema_extra and value.json_schema_extra.get("user_input", True)
        }
        missing_fields = [
            key
            for key in intake_fields
            if not str(getattr(scoped_payload, key) or "").strip()
            or (key == "problem_urgency" and scoped_payload.problem_urgency == "UNKNOWN")
        ]
        unknown_override_fields = set(scoped_payload.override_missing_fields) - set(intake_fields)
        if unknown_override_fields:
            raise HTTPException(
                status_code=422,
                detail={"message": "Unknown fields were listed for override.", "fields": sorted(unknown_override_fields)},
            )
        if missing_fields and not scoped_payload.run_override:
            raise HTTPException(
                status_code=422,
                detail={"message": "Complete every simulation field or explicitly ask the intake agent to run with missing details.", "fields": missing_fields},
            )
        if scoped_payload.run_override:
            scoped_payload = scoped_payload.model_copy(
                update={
                    "override_missing_fields": sorted(
                        set(scoped_payload.override_missing_fields) | set(missing_fields)
                    )
                }
            )
        result = run_simulation(scoped_payload)
        _persist_simulation_run(db, scoped_payload, result)
        create_notification(
            db,
            category="SIMULATION",
            title="Simulation completed",
            message=f"{result.startup_name} finished with score {result.overall_score}/100.",
            link="/simulation/results",
            target_user_id=current_user.id,
            metadata={"simulation_id": result.simulation_id},
        )
        db.commit()
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(exc)}")


@simulation_router.get("", response_model=list[SimulationRunSummary])
def list_simulations(
    email: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = get_or_create_access_profile(db, current_user)
    query = db.query(SimulationRun)
    if profile.role.upper() == "ADMIN" and email:
        query = query.filter(SimulationRun.owner_email == email)
    elif profile.role.upper() != "ADMIN":
        query = query.filter(SimulationRun.owner_email == current_user.email)

    rows = query.order_by(SimulationRun.created_at.desc()).limit(limit).all()
    return [
        SimulationRunSummary(
            simulation_id=row.id,
            startup_name=row.startup_name,
            status=row.status,
            overall_score=row.overall_score,
            metrics=row.metrics or {},
            created_at=row.created_at,
        )
        for row in rows
    ]


@simulation_router.get("/{simulation_id}", response_model=SimulationRunDetail)
def get_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and row.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="You do not have access to this simulation.")

    return SimulationRunDetail(
        simulation_id=row.id,
        startup_name=row.startup_name,
        status=row.status,
        metrics=row.metrics or {},
        overall_score=row.overall_score,
        recommendations=row.recommendations or [],
        agents=row.agents or [],
        synthesis=row.synthesis or "",
        logs=row.logs or [],
        created_at=row.created_at,
        input_payload=row.input_payload or {},
        assumptions=((row.input_payload or {}).get("_simulation_analysis") or {}).get("assumptions", []),
        deterministic_signals=((row.input_payload or {}).get("_simulation_analysis") or {}).get("deterministic_signals", {}),
        uncertainty=((row.input_payload or {}).get("_simulation_analysis") or {}).get("uncertainty", {}),
    )


@simulation_router.post("/{simulation_id}/rerun", response_model=SimulationRunResponse)
def rerun_simulation(
    simulation_id: str,
    payload: SimulationRerunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and original.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="You do not have access to this simulation.")

    base_payload = original.input_payload or {}
    overrides = payload.model_dump(exclude_none=True)
    run_as_new_version = bool(overrides.pop("run_as_new_version", False))
    merged = {**base_payload, **overrides, "owner_email": current_user.email}

    if run_as_new_version:
        merged["startup_name"] = _next_versioned_startup_name(
            db=db,
            owner_email=merged.get("owner_email") or original.owner_email,
            original_name=merged.get("startup_name") or original.startup_name,
        )

    try:
        run_payload = SimulationRunRequest.model_validate(merged)
        result = run_simulation(run_payload)
        _persist_simulation_run(db, run_payload, result)
        create_notification(
            db,
            category="SIMULATION",
            title="Simulation rerun completed",
            message=f"{result.startup_name} rerun finished with score {result.overall_score}/100.",
            link="/simulation/results",
            target_user_id=current_user.id,
            metadata={"simulation_id": result.simulation_id},
        )
        db.commit()
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation rerun failed: {str(exc)}")


@simulation_router.delete("/{simulation_id}")
def delete_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    profile = get_or_create_access_profile(db, current_user)
    if profile.role.upper() != "ADMIN" and row.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="You do not have access to this simulation.")

    db.delete(row)
    db.commit()
    return {"status": "deleted", "simulation_id": simulation_id}
