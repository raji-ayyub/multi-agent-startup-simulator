from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


PriorityLevel = Literal["LOW", "MEDIUM", "HIGH"]


class ManagementWorkspaceCreate(BaseModel):
    owner_email: EmailStr
    company_name: str = Field(..., min_length=2, max_length=255)
    workspace_name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(default="", max_length=2000)
    industry: Optional[str] = Field(default="", max_length=120)
    stage: Optional[str] = Field(default="", max_length=80)
    annual_revenue: Optional[str] = Field(default="", max_length=80)
    employee_count: int = Field(default=0, ge=0, le=500000)
    qualifications: List[str] = Field(default_factory=list, max_length=100)


class ManagementWorkspaceUpdate(BaseModel):
    workspace_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    industry: Optional[str] = Field(default=None, max_length=120)
    stage: Optional[str] = Field(default=None, max_length=80)
    annual_revenue: Optional[str] = Field(default=None, max_length=80)
    employee_count: Optional[int] = Field(default=None, ge=0, le=500000)
    qualifications: Optional[List[str]] = Field(default=None, max_length=100)


class ManagementWorkspaceResponse(BaseModel):
    workspace_id: str
    owner_email: EmailStr
    company_name: str
    workspace_name: str
    description: str
    industry: str
    stage: str
    annual_revenue: str
    employee_count: int
    qualifications: List[str]
    created_at: datetime
    updated_at: datetime


class ManagementActivityPlanRequest(BaseModel):
    objective: str = Field(..., min_length=8, max_length=600)
    time_horizon_weeks: int = Field(default=4, ge=1, le=52)


class PlannedActivity(BaseModel):
    title: str
    owner: str
    priority: PriorityLevel
    rationale: str
    week_target: int = Field(..., ge=1)
    success_metric: str


class ManagementActivityPlanResponse(BaseModel):
    workspace_id: str
    objective: str
    plan_summary: str
    activities: List[PlannedActivity]
