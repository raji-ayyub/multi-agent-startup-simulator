from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


RecommendationLabel = Literal["Go", "Go with caveats", "Pivot", "No-Go"]
RiskLevel = Literal["low", "medium", "high", "critical"]


class ReportBaseModel(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)


class KeyMetric(ReportBaseModel):
    label: str
    value: Any
    benchmark: Optional[str] = None
    status: Optional[str] = None
    note: Optional[str] = None


class AssumptionItem(ReportBaseModel):
    category: str = "General"
    assumption: str
    value: Optional[Any] = None
    rationale: Optional[str] = None
    source: Optional[str] = None


class ChartAsset(ReportBaseModel):
    title: str
    source: str = Field(..., description="Filesystem path, URL, or base64/data URI.")
    caption: Optional[str] = None
    section: Optional[str] = None
    large_format: bool = False


class TableData(ReportBaseModel):
    title: str
    columns: List[str] = Field(default_factory=list)
    rows: List[List[Any]] = Field(default_factory=list)
    note: Optional[str] = None


class ScenarioResult(ReportBaseModel):
    name: str
    summary: Optional[str] = None
    probability: Optional[float] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class RiskItem(ReportBaseModel):
    name: str
    description: Optional[str] = None
    severity: RiskLevel = "medium"
    likelihood: Optional[str] = None
    impact: Optional[str] = None
    mitigation: Optional[str] = None
    owner: Optional[str] = None


class TimelineItem(ReportBaseModel):
    phase: str
    timeline: str
    owner: Optional[str] = None
    summary: Optional[str] = None


class ResourceNeed(ReportBaseModel):
    role: str
    quantity: Optional[str] = None
    timing: Optional[str] = None
    note: Optional[str] = None


class GlossaryItem(ReportBaseModel):
    term: str
    definition: str


class ExecutiveSummarySection(ReportBaseModel):
    idea_overview: Optional[str] = None
    viability_score: Optional[float] = None
    recommendation: Optional[RecommendationLabel] = None
    success_probability: Optional[float] = None
    expected_roi: Optional[float] = None
    break_even_months: Optional[float] = None
    biggest_risks: List[str] = Field(default_factory=list)
    call_to_action: Optional[str] = None
    highlights: List[KeyMetric] = Field(default_factory=list)


class BusinessIdeaSection(ReportBaseModel):
    problem_statement: Optional[str] = None
    solution_summary: Optional[str] = None
    idea_overview: Optional[str] = None
    value_proposition: Optional[str] = None
    target_customer_segments: List[str] = Field(default_factory=list)
    key_assumptions: List[AssumptionItem] = Field(default_factory=list)


class MethodologySection(ReportBaseModel):
    summary: Optional[str] = None
    simulation_types: List[str] = Field(default_factory=list)
    iteration_count: Optional[int] = None
    parameters_varied: List[str] = Field(default_factory=list)
    data_sources: List[str] = Field(default_factory=list)
    transparency_notes: List[str] = Field(default_factory=list)


class MarketFeasibilitySection(ReportBaseModel):
    summary: Optional[str] = None
    tam: Optional[Any] = None
    sam: Optional[Any] = None
    som: Optional[Any] = None
    growth_rate: Optional[float] = None
    target_audience_insights: List[str] = Field(default_factory=list)
    competitive_landscape: List[str] = Field(default_factory=list)
    go_to_market_results: List[ScenarioResult] = Field(default_factory=list)
    key_metrics: List[KeyMetric] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)


class TechnicalFeasibilitySection(ReportBaseModel):
    summary: Optional[str] = None
    tech_stack: List[str] = Field(default_factory=list)
    build_requirements: List[str] = Field(default_factory=list)
    development_timeline: List[TimelineItem] = Field(default_factory=list)
    resource_needs: List[ResourceNeed] = Field(default_factory=list)
    technical_risks: List[RiskItem] = Field(default_factory=list)
    mitigations: List[str] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)


class FinancialViabilitySection(ReportBaseModel):
    summary: Optional[str] = None
    revenue_cost_scenarios: List[ScenarioResult] = Field(default_factory=list)
    break_even_analysis: Optional[str] = None
    roi: Optional[float] = None
    npv: Optional[Any] = None
    irr: Optional[float] = None
    payback_period: Optional[str] = None
    cash_flow_summary: Optional[str] = None
    unit_economics: List[KeyMetric] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)


class OperationalFeasibilitySection(ReportBaseModel):
    summary: Optional[str] = None
    team_requirements: List[ResourceNeed] = Field(default_factory=list)
    operations_plan_results: List[str] = Field(default_factory=list)
    scalability_assessment: Optional[str] = None
    tables: List[TableData] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)


class RiskAssessmentSection(ReportBaseModel):
    summary: Optional[str] = None
    top_risks: List[RiskItem] = Field(default_factory=list)
    sensitivity_notes: List[str] = Field(default_factory=list)
    mitigation_strategies: List[str] = Field(default_factory=list)
    tables: List[TableData] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)


class LegalRegulatorySection(ReportBaseModel):
    summary: Optional[str] = None
    key_flags: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    sustainability_considerations: List[str] = Field(default_factory=list)


class RecommendationItem(ReportBaseModel):
    action: str
    priority: str = "Medium"
    owner: Optional[str] = None
    timeline: Optional[str] = None
    rationale: Optional[str] = None


class ConclusionsSection(ReportBaseModel):
    overall_verdict: Optional[str] = None
    prioritized_next_steps: List[RecommendationItem] = Field(default_factory=list)
    investor_pitch_summary: List[str] = Field(default_factory=list)


class AppendicesSection(ReportBaseModel):
    raw_data_tables: List[TableData] = Field(default_factory=list)
    large_format_charts: List[ChartAsset] = Field(default_factory=list)
    glossary: List[GlossaryItem] = Field(default_factory=list)


class ReportMetadata(ReportBaseModel):
    company_name: Optional[str] = None
    prepared_for: Optional[str] = None
    prepared_by: Optional[str] = None
    version: str = "1.0"
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReportBranding(ReportBaseModel):
    company_name: Optional[str] = None
    logo_path: Optional[str] = None
    primary_color: str = "#123B5D"
    secondary_color: str = "#43566A"
    accent_color: str = "#C8A055"
    report_title: str = "Startup Idea Simulation & Feasibility Report"
    subtitle: str = "Comprehensive Feasibility & Viability Assessment Based on Advanced Simulations"
    page_size: Literal["A4", "Letter"] = "A4"
    confidential_label: str = "Confidential"
    system_name: str = "PetraAI"
    report_id: Optional[str] = None


class StartupSimulationReportInput(ReportBaseModel):
    startup_name: str = Field(..., min_length=2, max_length=255)
    report_type: Literal[
        "comprehensive",
        "feasibility",
        "viability",
        "market",
        "financial",
        "technical",
        "operations",
        "risk",
    ] = "viability"
    report_id: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    report_title: str = "Startup Idea Simulation & Feasibility Report"
    subtitle: str = "Comprehensive Feasibility & Viability Assessment Based on Advanced Simulations"
    metadata: ReportMetadata = Field(default_factory=ReportMetadata)
    executive_summary: ExecutiveSummarySection = Field(default_factory=ExecutiveSummarySection)
    business_idea: BusinessIdeaSection = Field(default_factory=BusinessIdeaSection)
    methodology: MethodologySection = Field(default_factory=MethodologySection)
    market_feasibility: MarketFeasibilitySection = Field(default_factory=MarketFeasibilitySection)
    technical_feasibility: TechnicalFeasibilitySection = Field(default_factory=TechnicalFeasibilitySection)
    financial_viability: FinancialViabilitySection = Field(default_factory=FinancialViabilitySection)
    operational_feasibility: OperationalFeasibilitySection = Field(default_factory=OperationalFeasibilitySection)
    risk_assessment: RiskAssessmentSection = Field(default_factory=RiskAssessmentSection)
    legal_regulatory: LegalRegulatorySection = Field(default_factory=LegalRegulatorySection)
    conclusions: ConclusionsSection = Field(default_factory=ConclusionsSection)
    appendices: AppendicesSection = Field(default_factory=AppendicesSection)
    key_metrics: List[KeyMetric] = Field(default_factory=list)
    assumptions: List[AssumptionItem] = Field(default_factory=list)
    scenarios: List[ScenarioResult] = Field(default_factory=list)
    charts: List[ChartAsset] = Field(default_factory=list)
    simulation_results: Dict[str, Any] = Field(default_factory=dict)
