from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


UrgencyLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class SimulationRunRequest(BaseModel):
    startup_name: str = Field(..., min_length=2, max_length=255)
    elevator_pitch: Optional[str] = ""
    problem_statement: str = Field(..., min_length=10, max_length=5000)
    target_audience: str = Field(..., min_length=2, max_length=500)
    problem_urgency: UrgencyLevel = "HIGH"
    primary_target_segment: str = Field("General Market", min_length=2, max_length=500)
    geography: str = Field("Global", min_length=2, max_length=255)
    market_size_estimate: Optional[str] = ""
    customer_behavior_pain_points: str = Field("User pain points under validation.", min_length=5, max_length=5000)
    competitor_patterns: Optional[str] = ""
    monthly_burn: Optional[str] = ""
    estimated_cac: Optional[str] = ""
    current_cash_in_hand: Optional[str] = ""
    marketing_strategy: Optional[str] = ""


class AgentFeedback(BaseModel):
    perspective: str
    summary: str
    risks: List[str]
    opportunities: List[str]
    confidence: int = Field(..., ge=0, le=100)


class SimulationLog(BaseModel):
    role: str
    message: str
    status: Literal["pending", "running", "done"] = "done"


class SimulationRunResponse(BaseModel):
    simulation_id: str
    startup_name: str
    status: Literal["completed"] = "completed"
    metrics: Dict[str, int]
    overall_score: int = Field(..., ge=0, le=100)
    recommendations: List[str]
    agents: List[AgentFeedback]
    synthesis: str
    logs: List[SimulationLog]
