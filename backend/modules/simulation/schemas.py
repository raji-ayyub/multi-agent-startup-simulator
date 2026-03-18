from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


UrgencyLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class SimulationRunRequest(BaseModel):
    owner_email: Optional[EmailStr] = None
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


class SimulationRerunRequest(BaseModel):
    run_as_new_version: bool = False
    startup_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    elevator_pitch: Optional[str] = ""
    problem_statement: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    target_audience: Optional[str] = Field(default=None, min_length=2, max_length=500)
    problem_urgency: Optional[UrgencyLevel] = None
    primary_target_segment: Optional[str] = Field(default=None, min_length=2, max_length=500)
    geography: Optional[str] = Field(default=None, min_length=2, max_length=255)
    market_size_estimate: Optional[str] = ""
    customer_behavior_pain_points: Optional[str] = Field(default=None, min_length=5, max_length=5000)
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


class SimulationRunSummary(BaseModel):
    simulation_id: str
    startup_name: str
    status: str
    overall_score: int
    metrics: Dict[str, int]
    created_at: datetime


class SimulationRunDetail(SimulationRunResponse):
    created_at: datetime
    input_payload: Dict[str, Any]


class SimulationIntakeTurnRequest(BaseModel):
    draft: Dict[str, Any] = Field(default_factory=dict)
    user_message: str = ""
    history: List[Dict[str, str]] = Field(default_factory=list)


class SimulationIntakeFileResponse(BaseModel):
    file_name: str
    extension: str
    extracted_text: str


class SimulationIntakeTurnResponse(BaseModel):
    assistant_message: str
    collected_fields: Dict[str, Any]
    missing_fields: List[str]
    ready_to_run: bool
    completion_percent: int = Field(..., ge=0, le=100)
