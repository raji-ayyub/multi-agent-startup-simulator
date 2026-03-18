import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user, get_or_create_access_profile
from database import get_db
from models import SimulationRun, User
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


def _persist_simulation_run(db: Session, payload: SimulationRunRequest, result: SimulationRunResponse) -> SimulationRun:
    record = SimulationRun(
        id=result.simulation_id,
        owner_email=payload.owner_email,
        startup_name=result.startup_name,
        status=result.status,
        input_payload=payload.model_dump(),
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


def _next_versioned_startup_name(
    db: Session,
    owner_email: str | None,
    original_name: str,
) -> str:
    base = re.sub(r"_v\d+$", "", (original_name or "").strip(), flags=re.IGNORECASE) or "Startup"
    query = db.query(SimulationRun.startup_name)
    if owner_email:
        query = query.filter(SimulationRun.owner_email == owner_email)
    names = [row[0] for row in query.filter(SimulationRun.startup_name.like(f"{base}%")).all() if row and row[0]]

    max_version = 1
    for name in names:
        if name == base:
            max_version = max(max_version, 1)
            continue
        match = re.match(rf"^{re.escape(base)}_v(\d+)$", name, flags=re.IGNORECASE)
        if match:
            max_version = max(max_version, int(match.group(1)))

    return f"{base}_v{max_version + 1}"


@simulation_router.post("/intake/file", response_model=SimulationIntakeFileResponse)
async def simulation_intake_file_upload(file: UploadFile = File(...)):
    file_name = file.filename or "simulation-upload"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Uploaded file exceeds 10MB limit.")

    try:
        text, extension = extract_cv_text(file_name, content)
        normalized = re.sub(r"\r\n?", "\n", str(text or ""))
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
        if not normalized:
            raise HTTPException(status_code=400, detail="Uploaded file does not contain readable text.")
        return SimulationIntakeFileResponse(
            file_name=file_name,
            extension=extension,
            extracted_text=normalized[:20000],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to extract text from uploaded file.")


@simulation_router.post("/intake/turn", response_model=SimulationIntakeTurnResponse)
def simulation_intake_turn(payload: SimulationIntakeTurnRequest):
    try:
        return run_intake_turn(
            draft=payload.draft,
            user_message=payload.user_message,
            history=payload.history,
        )
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
