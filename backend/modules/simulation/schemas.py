from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


UrgencyLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]


class SimulationRunRequest(BaseModel):
    owner_email: Optional[EmailStr] = Field(default=None, json_schema_extra={"user_input": False})
    run_override: bool = Field(default=False, json_schema_extra={"user_input": False})
    override_missing_fields: List[str] = Field(default_factory=list, json_schema_extra={"user_input": False})
    startup_name: str = Field(..., min_length=2, max_length=255, description="The name of the startup being evaluated.")
    elevator_pitch: Optional[str] = Field(..., description="A short explanation of the product and how it helps customers.")
    problem_statement: str = Field(..., min_length=10, max_length=5000, description="The customer problem the startup intends to solve.")
    target_audience: str = Field(..., min_length=2, max_length=500, description="The people or organizations that experience this problem.")
    problem_urgency: UrgencyLevel = Field(..., description="How urgent the problem is for the target customer, or unknown if it has not been assessed.")
    primary_target_segment: str = Field(..., min_length=2, max_length=500, description="The specific first customer group to focus on.")
    geography: str = Field(..., min_length=2, max_length=255, description="The country or region where the startup will operate.")
    market_size_estimate: Optional[str] = Field(..., description="An estimate of the addressable market, such as TAM or number of potential customers.")
    customer_behavior_pain_points: str = Field(..., min_length=5, max_length=5000, description="How customers currently handle the problem and what frustrates them.")
    competitor_patterns: Optional[str] = Field(..., description="Known alternatives, competitors, and how customers choose between them.")
    monthly_burn: Optional[str] = Field(..., description="Expected monthly operating costs.")
    estimated_cac: Optional[str] = Field(..., description="Estimated cost to acquire one customer.")
    current_cash_in_hand: Optional[str] = Field(..., description="Available funds for operating and growth.")
    marketing_strategy: Optional[str] = Field(..., description="How the startup plans to reach and convert customers.")


class SimulationRerunRequest(BaseModel):
    run_as_new_version: bool = False
    startup_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    elevator_pitch: Optional[str] = None
    problem_statement: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    target_audience: Optional[str] = Field(default=None, min_length=2, max_length=500)
    problem_urgency: Optional[UrgencyLevel] = None
    primary_target_segment: Optional[str] = Field(default=None, min_length=2, max_length=500)
    geography: Optional[str] = Field(default=None, min_length=2, max_length=255)
    market_size_estimate: Optional[str] = None
    customer_behavior_pain_points: Optional[str] = Field(default=None, min_length=5, max_length=5000)
    competitor_patterns: Optional[str] = None
    monthly_burn: Optional[str] = None
    estimated_cac: Optional[str] = None
    current_cash_in_hand: Optional[str] = None
    marketing_strategy: Optional[str] = None


class AgentFeedback(BaseModel):
    perspective: str
    summary: str
    risks: List[str]
    opportunities: List[str]
    confidence: int = Field(..., ge=0, le=100)
    pressure_points: List[str] = Field(default_factory=list)
    evidence_notes: List[str] = Field(default_factory=list)
    rubric_scores: Dict[str, int] = Field(default_factory=dict)
    confidence_rationale: str = ""


class SimulationLog(BaseModel):
    role: str
    message: str
    status: Literal["pending", "running", "done", "error"] = "done"
    phase: str = ""
    sequence: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


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
    assumptions: List[Dict[str, Any]] = Field(default_factory=list)
    deterministic_signals: Dict[str, Any] = Field(default_factory=dict)
    uncertainty: Dict[str, Any] = Field(default_factory=dict)


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
    document_ids: List[str] = Field(default_factory=list, max_length=20)


class SimulationIntakeFileResponse(BaseModel):
    file_name: str
    extension: str
    document_id: str


class SimulationIntakeTurnResponse(BaseModel):
    assistant_message: str
    collected_fields: Dict[str, Any]
    missing_fields: List[str]
    ready_to_run: bool
    completion_percent: int = Field(..., ge=0, le=100)
    conversation_mode: str = "COLLECTING_CONTEXT"
    detected_intent: str = "UNKNOWN"
    suggested_replies: List[str] = Field(default_factory=list)
    run_override: bool = False
