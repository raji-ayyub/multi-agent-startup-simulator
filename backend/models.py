import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    password_reset_token = Column(String(255), nullable=True, unique=True, index=True)
    password_reset_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    access_profile = relationship(
        "UserAccessProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )


class UserAccessProfile(Base):
    __tablename__ = "user_access_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    role = Column(String(32), nullable=False, default="FOUNDER", index=True)
    title = Column(String(120), nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="access_profile")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_email = Column(String(255), nullable=True, index=True)
    startup_name = Column(String(255), nullable=False)
    status = Column(String(30), default="completed", nullable=False)
    input_payload = Column(JSON, nullable=False, default=dict)
    metrics = Column(JSON, nullable=False, default=dict)
    overall_score = Column(Integer, nullable=False, default=0)
    recommendations = Column(JSON, nullable=False, default=list)
    agents = Column(JSON, nullable=False, default=list)
    synthesis = Column(Text, nullable=True)
    logs = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ManagementWorkspace(Base):
    __tablename__ = "management_workspaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_email = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    workspace_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    industry = Column(String(120), nullable=True, default="")
    stage = Column(String(80), nullable=True, default="")
    annual_revenue = Column(String(80), nullable=True, default="")
    employee_count = Column(Integer, nullable=True, default=0)
    qualifications = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    team_members = relationship(
        "ManagementTeamMember",
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="ManagementTeamMember.created_at",
    )


class ManagementTeamMember(Base):
    __tablename__ = "management_team_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=True, default="")
    qualifications = Column(JSON, nullable=False, default=list)
    qualification_notes = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("ManagementWorkspace", back_populates="team_members")


class ManagementPlanRun(Base):
    __tablename__ = "management_plan_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    objective = Column(Text, nullable=False)
    plan_summary = Column(Text, nullable=False, default="")
    activities = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ManagementAgentMemory(Base):
    __tablename__ = "management_agent_memory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    memory_type = Column(String(80), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="")
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ManagementActivityMonitor(Base):
    __tablename__ = "management_activity_monitor"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id = Column(
        String(36),
        ForeignKey("management_plan_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False, default="Unassigned")
    priority = Column(String(20), nullable=False, default="MEDIUM")
    due_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(40), nullable=False, default="PLANNED", index=True)
    progress_note = Column(Text, nullable=False, default="")
    signal_score = Column(Integer, nullable=False, default=50)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentRequest(Base):
    __tablename__ = "agent_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requester_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_email = Column(String(255), nullable=False, index=True)
    requester_role = Column(String(32), nullable=False, index=True)
    workspace_mode = Column(String(32), nullable=False, default="simulation", index=True)
    agent_type = Column(String(80), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    notes = Column(Text, nullable=False, default="")
    status = Column(String(32), nullable=False, default="PENDING", index=True)
    admin_notes = Column(Text, nullable=False, default="")
    approved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AppNotification(Base):
    __tablename__ = "app_notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    target_role = Column(String(32), nullable=False, default="ALL", index=True)
    category = Column(String(64), nullable=False, default="GENERAL", index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False, default="")
    link = Column(String(255), nullable=False, default="")
    notification_payload = Column("metadata", JSON, nullable=False, default=dict)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class NotificationReadReceipt(Base):
    __tablename__ = "notification_read_receipts"
    __table_args__ = (
        UniqueConstraint("notification_id", "user_id", name="uq_notification_read_receipts_notification_user"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    notification_id = Column(
        String(36),
        ForeignKey("app_notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    read_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class BusinessInsightReport(Base):
    __tablename__ = "business_insight_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    simulation_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    report_name = Column(String(255), nullable=False, default="Business Insight Report")
    status = Column(String(32), nullable=False, default="READY", index=True)
    summary = Column(Text, nullable=False, default="")
    sections = Column(JSON, nullable=False, default=list)
    key_findings = Column(JSON, nullable=False, default=list)
    recommended_actions = Column(JSON, nullable=False, default=list)
    export_html = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(
        String(36),
        ForeignKey("management_workspaces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    simulation_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False, default="")
    event_type = Column(String(64), nullable=False, default="TASK", index=True)
    priority = Column(String(16), nullable=False, default="MEDIUM", index=True)
    source = Column(String(16), nullable=False, default="USER", index=True)
    permission_status = Column(String(16), nullable=False, default="APPROVED", index=True)
    starts_at = Column(DateTime, nullable=False, index=True)
    ends_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
