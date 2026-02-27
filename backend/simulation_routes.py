from fastapi import APIRouter, HTTPException

from simulation_schemas import SimulationRunRequest, SimulationRunResponse
from simulation_service import run_simulation

simulation_router = APIRouter(prefix="/api/v1/simulations", tags=["simulations"])


@simulation_router.post("/run", response_model=SimulationRunResponse)
def run_simulation_endpoint(payload: SimulationRunRequest):
    try:
        return run_simulation(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(exc)}")
