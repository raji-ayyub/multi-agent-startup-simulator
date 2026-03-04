import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import declarative_base
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
