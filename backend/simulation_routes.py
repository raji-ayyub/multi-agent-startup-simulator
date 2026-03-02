from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import SimulationRun
from simulation_schemas import (
    SimulationRunDetail,
    SimulationRunRequest,
    SimulationRunResponse,
    SimulationRunSummary,
)
from simulation_service import run_simulation

simulation_router = APIRouter(prefix="/api/v1/simulations", tags=["simulations"])


@simulation_router.post("/run", response_model=SimulationRunResponse)
def run_simulation_endpoint(payload: SimulationRunRequest, db: Session = Depends(get_db)):
    try:
        result = run_simulation(payload)
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
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(exc)}")


@simulation_router.get("", response_model=list[SimulationRunSummary])
def list_simulations(
    email: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(SimulationRun)
    if email:
        query = query.filter(SimulationRun.owner_email == email)

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
def get_simulation(simulation_id: str, db: Session = Depends(get_db)):
    row = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found.")

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
