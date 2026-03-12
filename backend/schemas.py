from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional


UserRole = Literal["FOUNDER", "OPERATOR", "ADMIN"]
AgentRequestStatus = Literal["PENDING", "APPROVED", "REJECTED"]


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=255)
    role: Literal["FOUNDER", "OPERATOR"] = "FOUNDER"


class PrivateAdminCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=255)
    admin_setup_secret: str = Field(..., min_length=6, max_length=255)
    role: Literal["ADMIN"] = "ADMIN"


class UserSignIn(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole = "FOUNDER"
    title: str = ""
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerify(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=255)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=255)


class PasswordResetResponse(BaseModel):
    message: str
    email: EmailStr


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(default=None, max_length=255)
    title: Optional[str] = Field(default=None, max_length=120)


class AgentRequestCreate(BaseModel):
    workspace_mode: Literal["simulation", "management", "platform"] = "simulation"
    agent_type: str = Field(..., min_length=3, max_length=80)
    title: str = Field(..., min_length=3, max_length=255)
    notes: str = Field(default="", max_length=5000)


class AgentRequestResponse(BaseModel):
    request_id: str
    requester_email: EmailStr
    requester_role: UserRole
    workspace_mode: str
    agent_type: str
    title: str
    notes: str
    status: AgentRequestStatus
    admin_notes: str
    approved_by_email: Optional[EmailStr] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AgentRequestDecision(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    admin_notes: str = Field(default="", max_length=5000)


class AgentCatalogItem(BaseModel):
    agent_type: str
    display_name: str
    workspace_mode: str
    description: str
    allowed_roles: List[UserRole]


class AdminOverviewResponse(BaseModel):
    counts: Dict[str, int]
    recent_agent_requests: List[AgentRequestResponse]


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    title: Optional[str] = Field(default=None, max_length=120)
    is_active: Optional[bool] = None


class NotificationResponse(BaseModel):
    notification_id: str
    category: str
    title: str
    message: str
    link: str
    metadata: Dict[str, Any]
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None


class NotificationReadResponse(BaseModel):
    updated: int


class ReportSection(BaseModel):
    heading: str
    body: str


class BusinessReportGenerateRequest(BaseModel):
    simulation_id: str = Field(..., min_length=3, max_length=64)
    workspace_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    report_name: str = Field(default="Business Insight Report", min_length=3, max_length=255)


class BusinessReportResponse(BaseModel):
    report_id: str
    simulation_id: str
    workspace_id: Optional[str] = None
    report_name: str
    status: str
    summary: str
    sections: List[ReportSection]
    key_findings: List[str]
    recommended_actions: List[str]
    created_at: datetime
    updated_at: datetime


class CalendarEventCreate(BaseModel):
    workspace_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    simulation_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(default="", max_length=5000)
    event_type: str = Field(default="TASK", max_length=64)
    priority: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    starts_at: datetime
    ends_at: Optional[datetime] = None


class CalendarSuggestionRequest(BaseModel):
    workspace_id: str = Field(..., min_length=3, max_length=64)
    plan_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    simulation_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    prompt: str = Field(default="", max_length=1000)


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=255)
    description: Optional[str] = Field(default=None, max_length=5000)
    event_type: Optional[str] = Field(default=None, max_length=64)
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    permission_status: Optional[Literal["PENDING", "APPROVED", "REJECTED"]] = None


class CalendarEventResponse(BaseModel):
    event_id: str
    workspace_id: Optional[str] = None
    simulation_id: Optional[str] = None
    title: str
    description: str
    event_type: str
    priority: str
    source: str
    permission_status: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AgentAccessResponse(BaseModel):
    request_id: str
    workspace_mode: str
    agent_type: str
    title: str
    notes: str
    status: AgentRequestStatus
    approved_at: Optional[datetime] = None
    admin_notes: str
