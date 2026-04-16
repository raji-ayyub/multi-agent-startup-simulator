from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

import modules.simulation.reporting.generator as generator_module
from models import ManagementTeamMember, ManagementWorkspace, SimulationRun
from modules.simulation.reporting.generator import StartupSimulationReportGenerator
from platform_service import build_report_html, build_report_pdf


def build_structured_report_data() -> dict:
    return {
        "startup_name": "Atlas Finance",
        "report_type": "comprehensive",
        "report_id": "SSR-20260402-ATLAS-001",
        "generated_at": "2026-04-02T09:30:00Z",
        "metadata": {
            "company_name": "Atlas Finance",
            "prepared_for": "Founding Team",
            "prepared_by": "PetraAI",
            "version": "1.0",
        },
        "executive_summary": {
            "idea_overview": "Atlas Finance helps African SMEs automate treasury, cash forecasting, and FX exposure management.",
            "viability_score": 78,
            "recommendation": "Go",
            "success_probability": 0.67,
            "expected_roi": 1.84,
            "break_even_months": 19,
            "biggest_risks": [
                "Long enterprise procurement cycles could delay revenue ramp-up.",
                "Regulatory requirements vary by market and may slow expansion.",
            ],
            "call_to_action": "Proceed to a focused pilot with 5 design-partner customers and validate retention before broad scaling.",
        },
        "business_idea": {
            "problem_statement": "SMEs struggle to manage fragmented cash positions and unpredictable FX exposure across multiple markets.",
            "solution_summary": "A workflow platform for treasury visibility, forecasting, and scenario planning with built-in banking integrations.",
            "value_proposition": "Cut treasury admin time, improve liquidity planning, and reduce FX losses for multi-market operators.",
            "target_customer_segments": [
                "VC-backed SMEs with cross-border supplier payments",
                "Export-oriented businesses with FX volatility exposure",
            ],
            "key_assumptions": [
                {
                    "category": "Adoption",
                    "assumption": "Finance teams will adopt workflow automation within 45 days.",
                    "value": "45 days",
                    "rationale": "Interview data from target ICPs",
                    "source": "Founders' customer discovery notes",
                }
            ],
        },
        "methodology": {
            "summary": "The report combines multi-agent qualitative review, scenario planning, and sensitivity framing from the simulation pipeline.",
            "simulation_types": ["Market Analyst", "Customer Agent", "Investor Agent"],
            "iteration_count": 10000,
            "parameters_varied": ["CAC", "Conversion Rate", "Gross Margin", "Churn", "Sales Cycle"],
            "data_sources": ["Internal assumptions", "Comparable fintech benchmarks", "Founder interviews"],
            "transparency_notes": ["Financial assumptions remain pre-revenue and should be refreshed after pilot data."],
        },
        "market_feasibility": {
            "summary": "The reachable SME treasury tooling gap remains under-served in West and East Africa, with a clear need for local compliance workflows.",
            "tam": 1250000000,
            "sam": 220000000,
            "som": 18000000,
            "growth_rate": 0.18,
            "target_audience_insights": [
                "Finance leads value cash visibility over feature breadth in the early buying cycle.",
                "Trust, data security, and bank integrations materially shape close rates.",
            ],
            "competitive_landscape": [
                "Large global treasury platforms are too expensive for mid-market SMEs.",
                "Local fintech tools often lack forecasting depth and workflow automation.",
            ],
            "key_metrics": [
                {"label": "Addressable buyers", "value": 4300},
                {"label": "Expected win rate", "value": "17%"},
            ],
        },
        "financial_viability": {
            "summary": "Financial upside is attractive if onboarding friction stays low and gross margins remain above 75% after banking costs.",
            "break_even_analysis": "Break-even is reached in month 19 in the base case, driven by improved expansion revenue from existing customers.",
            "roi": 1.84,
            "npv": 2150000,
            "irr": 0.31,
            "payback_period": "19 months",
            "cash_flow_summary": "Peak negative cash flow occurs in month 11 before subscription renewals materially improve runway resilience.",
            "unit_economics": [
                {"label": "CAC", "value": "$620"},
                {"label": "LTV", "value": "$8,700"},
                {"label": "LTV/CAC", "value": "14.0x"},
                {"label": "Gross Margin", "value": "78%"},
            ],
        },
        "conclusions": {
            "overall_verdict": "The startup is investable if the team validates implementation friction and closes design-partner logos quickly.",
            "prioritized_next_steps": [
                {
                    "action": "Close five pilot customers",
                    "priority": "High",
                    "owner": "CEO",
                    "timeline": "0-60 days",
                    "rationale": "Improves retention and onboarding confidence before scaling spend.",
                }
            ],
            "investor_pitch_summary": [
                "Large underserved treasury tooling gap for African SMEs.",
                "Strong efficiency story with attractive LTV/CAC profile in the base case.",
            ],
        },
    }


def build_platform_report_payload() -> dict:
    return {
        "report_name": "Board Insight Report",
        "summary": "Atlas Finance shows promising investor-grade upside if the team validates design-partner adoption and keeps CAC disciplined.",
        "sections": [
            {
                "heading": "Executive Summary",
                "body": "The startup has strong early strategic promise and should proceed with structured validation.",
            },
            {
                "heading": "Market and Demand",
                "body": "Demand signals are strongest among multi-market SMEs that already feel treasury pain and FX volatility.",
            },
            {
                "heading": "Operations and Team Readiness",
                "body": "Execution strength depends on clear ownership, onboarding playbooks, and a credible pilot motion.",
            },
            {
                "heading": "Capital and Risk Outlook",
                "body": "Capital efficiency improves materially if the company proves retention before expanding hiring and paid channels.",
            },
        ],
        "key_findings": [
            "Demand is strongest in cross-border SME finance operations.",
            "The team needs pilot proof to de-risk fundraising timing.",
        ],
        "recommended_actions": [
            "Close five design-partner customers in the next 60 days.",
            "Instrument onboarding and retention metrics before paid acquisition.",
            "Refine the investor narrative around treasury workflow ROI.",
        ],
    }


def build_simulation() -> SimulationRun:
    return SimulationRun(
        id="sim-123",
        startup_name="Atlas Finance",
        overall_score=78,
        input_payload={
            "startup_name": "Atlas Finance",
            "elevator_pitch": "Treasury workflow software for African SMEs.",
            "problem_statement": "SMEs struggle to manage fragmented cash positions and FX exposure.",
            "target_audience": "African SMEs with cross-border supplier payments",
            "primary_target_segment": "Finance teams in high-growth SMEs",
            "geography": "Nigeria, Kenya, South Africa",
            "market_size_estimate": "$1.25B",
            "competitor_patterns": "Global treasury platforms are expensive; local tools lack forecasting depth.",
            "monthly_burn": "$55,000",
            "estimated_cac": "$620",
            "current_cash_in_hand": "$480,000",
            "marketing_strategy": "Partnership-led GTM with accountants and VC portfolios",
        },
        metrics={
            "marketViability": 82,
            "customerDemand": 76,
            "investorConfidence": 78,
        },
        recommendations=[
            "Close five pilot customers.",
            "Tighten onboarding to under 21 days.",
            "Use retention proof before scaling spend.",
        ],
        agents=[
            {
                "perspective": "Market Analyst",
                "summary": "The market is promising if the team focuses on a clearly defined SME treasury pain point.",
                "risks": ["Category education may slow enterprise close cycles."],
                "opportunities": ["Cross-border payment pain creates strong urgency."],
                "confidence": 82,
            },
            {
                "perspective": "Customer Agent",
                "summary": "Customer demand is real if onboarding is fast and value is obvious in the first week.",
                "risks": ["Teams may resist switching from spreadsheet workflows."],
                "opportunities": ["Treasury visibility is a high-value hook."],
                "confidence": 76,
            },
            {
                "perspective": "Investor Agent",
                "summary": "The startup is investable if CAC discipline and retention proof stay strong.",
                "risks": ["Procurement drag can pressure burn before revenue ramps."],
                "opportunities": ["Strong LTV/CAC could unlock attractive seed economics."],
                "confidence": 78,
            },
        ],
        synthesis="Go/No-Go Recommendation: GO. Signals are encouraging, but the team should validate onboarding friction and retention before broad expansion.",
    )


def build_workspace() -> ManagementWorkspace:
    workspace = ManagementWorkspace(
        id="ws-123",
        owner_email="founder@example.com",
        company_name="Atlas Finance",
        workspace_name="Atlas Operating Workspace",
        description="Operating plan and hiring context for Atlas Finance.",
        stage="Seed",
        annual_revenue="$0",
        employee_count=4,
    )
    workspace.team_members = [
        ManagementTeamMember(name="Amina", role="CEO", qualifications=["Sales", "Fintech strategy"]),
        ManagementTeamMember(name="Tunde", role="CTO", qualifications=["Python", "Integrations", "Security"]),
    ]
    return workspace


class FakeHTML:
    def __init__(self, string: str, base_url: str | None = None) -> None:
        self.string = string
        self.base_url = base_url

    def write_pdf(self, target=None, **kwargs):
        payload = b"%PDF-1.4\n%fake-report"
        if target is None:
            return payload
        Path(target).write_bytes(payload)
        return None


class StartupSimulationReportGeneratorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.generator = StartupSimulationReportGenerator()

    def test_preview_html_contains_required_sections(self) -> None:
        html = self.generator.preview_html(
            build_structured_report_data(),
            branding={
                "company_name": "Atlas Finance",
                "primary_color": "#0F3557",
            },
        )

        self.assertIn("Startup Idea Simulation &amp; Feasibility Report", html)
        self.assertIn("Table of Contents", html)
        self.assertIn("Executive Summary", html)
        self.assertIn("1. Business Idea Overview", html)
        self.assertIn("Financial Viability", html)
        self.assertIn("Conclusions &amp; Actionable Recommendations", html)
        self.assertIn("Atlas Finance", html)

    def test_preview_html_skips_empty_sections_for_clean_layout(self) -> None:
        html = self.generator.preview_html(
            {
                "startup_name": "Lean Labs",
                "executive_summary": {
                    "idea_overview": "Focused MVP workflow for founders.",
                    "viability_score": 72,
                },
            }
        )

        self.assertIn("Executive Summary", html)
        self.assertNotIn("Business Idea Overview", html)
        self.assertNotIn("Technical Feasibility", html)
        self.assertNotIn(">Appendices<", html)

    def test_platform_report_html_uses_professional_template(self) -> None:
        html = build_report_html(build_platform_report_payload(), build_simulation(), build_workspace())

        self.assertIn("Startup Idea Simulation &amp; Feasibility Report", html)
        self.assertIn("Comprehensive Feasibility &amp; Viability Assessment Based on Advanced Simulations", html)
        self.assertIn("Go-to-Market Simulation Results", html)
        self.assertIn("Atlas Finance", html)
        self.assertIn("Close five design-partner customers in the next 60 days.", html)

    def test_platform_report_html_viability_profile_hides_non_viability_sections(self) -> None:
        html = build_report_html(
            build_platform_report_payload(),
            build_simulation(),
            build_workspace(),
            report_type="viability",
        )

        self.assertIn("Startup Viability Report", html)
        self.assertIn("3. Financial Viability", html)
        self.assertIn("4. Risk Assessment &amp; Sensitivity Analysis", html)
        self.assertNotIn("Technical Feasibility", html)
        self.assertNotIn("Operational &amp; Organizational Feasibility", html)
        self.assertNotIn(">Appendices<", html)

    def test_generate_report_writes_pdf_when_renderer_is_available(self) -> None:
        output_dir = Path("tests") / ".tmp"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "atlas-report.pdf"
        if output_path.exists():
            output_path.unlink()

        try:
            with patch.object(generator_module, "HTML", FakeHTML):
                generated_path = self.generator.generate_report(build_structured_report_data(), str(output_path))

            self.assertEqual(Path(generated_path), output_path.resolve())
            self.assertTrue(output_path.exists())
            self.assertGreater(output_path.stat().st_size, 0)
        finally:
            if output_path.exists():
                output_path.unlink()

    def test_platform_report_pdf_returns_pdf_bytes(self) -> None:
        with patch.object(generator_module, "HTML", FakeHTML):
            pdf_bytes = build_report_pdf(build_platform_report_payload(), build_simulation(), build_workspace())

        self.assertTrue(pdf_bytes.startswith(b"%PDF-1.4"))


if __name__ == "__main__":
    unittest.main()
