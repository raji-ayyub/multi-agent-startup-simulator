from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except Exception as exc:
    Environment = None
    FileSystemLoader = None
    select_autoescape = None
    JINJA2_IMPORT_ERROR = exc
else:
    JINJA2_IMPORT_ERROR = None

from .schemas import (
    AssumptionItem,
    ChartAsset,
    KeyMetric,
    RecommendationItem,
    ReportBranding,
    RiskItem,
    ScenarioResult,
    StartupSimulationReportInput,
    TableData,
)

try:
    from weasyprint import HTML
except Exception as exc:
    HTML = None
    WEASYPRINT_IMPORT_ERROR = exc
else:
    WEASYPRINT_IMPORT_ERROR = None

try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    sync_playwright = None
    PLAYWRIGHT_IMPORT_ERROR = exc
else:
    PLAYWRIGHT_IMPORT_ERROR = None


class StartupSimulationReportGenerator:
    """Render startup simulation outputs into branded HTML and PDF reports."""

    _SECTION_LAYOUT: list[tuple[str, str, str]] = [
        ("business_idea", "business-idea-overview", "Business Idea Overview"),
        ("methodology", "simulation-methodology", "Simulation Methodology"),
        ("market_feasibility", "market-feasibility", "Market Feasibility"),
        ("technical_feasibility", "technical-feasibility", "Technical Feasibility"),
        ("financial_viability", "financial-viability", "Financial Viability"),
        (
            "operational_feasibility",
            "operational-feasibility",
            "Operational & Organizational Feasibility",
        ),
        ("risk_assessment", "risk-assessment", "Risk Assessment & Sensitivity Analysis"),
        (
            "legal_regulatory",
            "legal-regulatory",
            "Legal, Regulatory & Sustainability Considerations",
        ),
        ("conclusions", "conclusions", "Conclusions & Actionable Recommendations"),
        ("appendices", "appendices", "Appendices"),
    ]

    _SECTION_PROFILES: dict[str, set[str]] = {
        "comprehensive": {
            "business_idea",
            "methodology",
            "market_feasibility",
            "technical_feasibility",
            "financial_viability",
            "operational_feasibility",
            "risk_assessment",
            "legal_regulatory",
            "conclusions",
            "appendices",
        },
        "feasibility": {
            "business_idea",
            "methodology",
            "market_feasibility",
            "technical_feasibility",
            "operational_feasibility",
            "risk_assessment",
            "legal_regulatory",
            "conclusions",
        },
        "viability": {
            "business_idea",
            "market_feasibility",
            "financial_viability",
            "risk_assessment",
            "conclusions",
        },
        "market": {
            "business_idea",
            "market_feasibility",
            "risk_assessment",
            "conclusions",
        },
        "financial": {
            "business_idea",
            "financial_viability",
            "risk_assessment",
            "conclusions",
        },
        "technical": {
            "business_idea",
            "technical_feasibility",
            "operational_feasibility",
            "risk_assessment",
            "conclusions",
        },
        "operations": {
            "business_idea",
            "operational_feasibility",
            "risk_assessment",
            "conclusions",
        },
        "risk": {
            "business_idea",
            "risk_assessment",
            "conclusions",
        },
    }

    def __init__(
        self,
        template_dir: str | Path | None = None,
        system_name: str = "PetraAI",
        default_page_size: str = "A4",
        pdf_renderer: str | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.logger = logger or logging.getLogger(__name__)
        self.system_name = system_name
        self.default_page_size = default_page_size
        self.pdf_renderer = (pdf_renderer or os.getenv("REPORT_PDF_RENDERER", "auto")).strip().lower()
        self.template_dir = Path(template_dir) if template_dir else Path(__file__).resolve().parent / "templates"
        if Environment is None or FileSystemLoader is None or select_autoescape is None:
            self.environment = None
        else:
            self.environment = Environment(
                loader=FileSystemLoader(str(self.template_dir)),
                autoescape=select_autoescape(("html", "xml")),
                trim_blocks=True,
                lstrip_blocks=True,
            )

    def validate_input(self, simulation_data: dict[str, Any] | StartupSimulationReportInput) -> StartupSimulationReportInput:
        if isinstance(simulation_data, StartupSimulationReportInput):
            return simulation_data
        return StartupSimulationReportInput.model_validate(simulation_data)

    def build_context(
        self,
        simulation_data: dict[str, Any] | StartupSimulationReportInput,
        branding: dict[str, Any] | ReportBranding | None = None,
        report_type: str | None = None,
    ) -> dict[str, Any]:
        report = self.validate_input(simulation_data)
        branding_model = self._resolve_branding(report, branding)
        normalized_report_type = self._normalize_report_type(report_type or report.report_type)
        section_visibility = self._build_section_visibility(report, normalized_report_type)
        section_titles, section_kickers = self._build_section_headers(section_visibility)
        report_id = report.report_id or branding_model.report_id or self._build_report_id(report.startup_name)
        generated_at = report.generated_at.astimezone(timezone.utc)
        global_charts = self._serialize_charts(report.charts)

        context = {
            "branding": {
                "company_name": branding_model.company_name or report.metadata.company_name or report.startup_name,
                "primary_color": branding_model.primary_color,
                "secondary_color": branding_model.secondary_color,
                "accent_color": branding_model.accent_color,
                "page_size": branding_model.page_size or self.default_page_size,
                "system_name": branding_model.system_name,
            },
            "cover": {
                "report_title": branding_model.report_title or report.report_title,
                "startup_name": report.startup_name,
                "subtitle": branding_model.subtitle or report.subtitle,
                "generated_date": generated_at.strftime("%B %d, %Y"),
                "generated_datetime_iso": generated_at.isoformat(),
                "report_id": report_id,
                "logo_uri": self._resolve_asset_uri(branding_model.logo_path),
            },
            "footer_text": f"{branding_model.confidential_label} - Generated by {branding_model.system_name}",
            "footer_date": generated_at.strftime("%Y-%m-%d"),
            "css_content": self._load_css(),
            "report_profile": {"report_type": normalized_report_type},
            "section_visibility": section_visibility,
            "section_titles": section_titles,
            "section_kickers": section_kickers,
            "toc": self._build_toc(section_visibility, section_titles),
            "executive_summary": {
                "idea_overview": self._coalesce(
                    report.executive_summary.idea_overview,
                    report.business_idea.idea_overview,
                    report.business_idea.problem_statement,
                ),
                "recommendation": report.executive_summary.recommendation
                or self._score_to_recommendation(report.executive_summary.viability_score),
                "viability_score": self._format_number(report.executive_summary.viability_score, style="score"),
                "call_to_action": report.executive_summary.call_to_action,
                "highlight_cards": self._build_highlight_cards(report),
                "biggest_risks": report.executive_summary.biggest_risks
                or [risk["name"] for risk in self._serialize_risks(report.risk_assessment.top_risks)[:3]],
            },
            "business_idea": {
                "problem_statement": report.business_idea.problem_statement,
                "solution_summary": report.business_idea.solution_summary,
                "value_proposition": report.business_idea.value_proposition,
                "target_customer_segments": report.business_idea.target_customer_segments,
                "key_assumptions": self._serialize_assumptions(
                    report.business_idea.key_assumptions or report.assumptions
                ),
            },
            "methodology": {
                "summary": report.methodology.summary,
                "simulation_types": report.methodology.simulation_types,
                "iteration_count": self._format_number(report.methodology.iteration_count, style="integer"),
                "parameters_varied": report.methodology.parameters_varied,
                "data_sources": report.methodology.data_sources,
                "transparency_notes": report.methodology.transparency_notes,
            },
            "market_feasibility": {
                "summary": report.market_feasibility.summary,
                "market_size_cards": [
                    {"label": "TAM", "display_value": self._format_number(report.market_feasibility.tam, style="compact")},
                    {"label": "SAM", "display_value": self._format_number(report.market_feasibility.sam, style="compact")},
                    {"label": "SOM", "display_value": self._format_number(report.market_feasibility.som, style="compact")},
                    {
                        "label": "Growth Rate",
                        "display_value": self._format_number(report.market_feasibility.growth_rate, style="percent"),
                    },
                ],
                "target_audience_insights": report.market_feasibility.target_audience_insights,
                "competitive_landscape": report.market_feasibility.competitive_landscape,
                "go_to_market_results": self._serialize_scenarios(report.market_feasibility.go_to_market_results),
                "key_metrics": self._serialize_metrics(report.market_feasibility.key_metrics),
                "tables": self._serialize_tables(report.market_feasibility.tables),
                "charts": self._merge_section_charts("market", report.market_feasibility.charts, global_charts),
            },
            "technical_feasibility": {
                "summary": report.technical_feasibility.summary,
                "tech_stack": report.technical_feasibility.tech_stack,
                "build_requirements": report.technical_feasibility.build_requirements,
                "development_timeline": [
                    item.model_dump(mode="json") for item in report.technical_feasibility.development_timeline
                ],
                "resource_needs": [
                    item.model_dump(mode="json") for item in report.technical_feasibility.resource_needs
                ],
                "technical_risks": self._serialize_risks(report.technical_feasibility.technical_risks),
                "mitigations": report.technical_feasibility.mitigations,
                "tables": self._serialize_tables(report.technical_feasibility.tables),
                "charts": self._merge_section_charts("technical", report.technical_feasibility.charts, global_charts),
            },
            "financial_viability": {
                "summary": report.financial_viability.summary,
                "summary_cards": [
                    {"label": "ROI", "display_value": self._format_number(report.financial_viability.roi, style="percent")},
                    {"label": "NPV", "display_value": self._format_number(report.financial_viability.npv, style="currency")},
                    {"label": "IRR", "display_value": self._format_number(report.financial_viability.irr, style="percent")},
                    {
                        "label": "Payback Period",
                        "display_value": self._coalesce(report.financial_viability.payback_period, "Not provided"),
                    },
                ],
                "revenue_cost_scenarios": self._serialize_scenarios(
                    report.financial_viability.revenue_cost_scenarios or report.scenarios
                ),
                "break_even_analysis": report.financial_viability.break_even_analysis,
                "cash_flow_summary": report.financial_viability.cash_flow_summary,
                "unit_economics": self._serialize_metrics(report.financial_viability.unit_economics or report.key_metrics),
                "tables": self._serialize_tables(report.financial_viability.tables),
                "charts": self._merge_section_charts("financial", report.financial_viability.charts, global_charts),
            },
            "operational_feasibility": {
                "summary": report.operational_feasibility.summary,
                "team_requirements": [item.model_dump(mode="json") for item in report.operational_feasibility.team_requirements],
                "operations_plan_results": report.operational_feasibility.operations_plan_results,
                "scalability_assessment": report.operational_feasibility.scalability_assessment,
                "tables": self._serialize_tables(report.operational_feasibility.tables),
                "charts": self._merge_section_charts("operational", report.operational_feasibility.charts, global_charts),
            },
            "risk_assessment": {
                "summary": report.risk_assessment.summary,
                "top_risks": self._serialize_risks(report.risk_assessment.top_risks),
                "sensitivity_notes": report.risk_assessment.sensitivity_notes,
                "mitigation_strategies": report.risk_assessment.mitigation_strategies,
                "tables": self._serialize_tables(report.risk_assessment.tables),
                "charts": self._merge_section_charts("risk", report.risk_assessment.charts, global_charts),
            },
            "legal_regulatory": {
                "summary": report.legal_regulatory.summary,
                "key_flags": report.legal_regulatory.key_flags,
                "next_steps": report.legal_regulatory.next_steps,
                "sustainability_considerations": report.legal_regulatory.sustainability_considerations,
            },
            "conclusions": {
                "overall_verdict": report.conclusions.overall_verdict,
                "prioritized_next_steps": self._serialize_recommendations(report.conclusions.prioritized_next_steps),
                "investor_pitch_summary": report.conclusions.investor_pitch_summary,
            },
            "appendices": {
                "raw_data_tables": self._serialize_tables(report.appendices.raw_data_tables),
                "large_format_charts": self._build_appendix_charts(report, global_charts),
                "glossary": [item.model_dump(mode="json") for item in report.appendices.glossary],
            },
            "raw_simulation_results": report.simulation_results,
        }
        return context

    def preview_html(
        self,
        simulation_data: dict[str, Any] | StartupSimulationReportInput,
        branding: dict[str, Any] | ReportBranding | None = None,
        report_type: str | None = None,
    ) -> str:
        self._ensure_template_engine()
        context = self.build_context(simulation_data, branding=branding, report_type=report_type)
        template = self.environment.get_template("report.html")
        return template.render(**context)

    def generate_report(
        self,
        simulation_data: dict[str, Any],
        output_path: str,
        branding: dict[str, Any] | None = None,
        report_type: str | None = None,
    ) -> str:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        pdf_bytes = self.render_pdf_bytes(simulation_data, branding=branding, report_type=report_type)
        destination.write_bytes(pdf_bytes)
        self.logger.info("Simulation report generated at %s", destination)
        return str(destination.resolve())

    def render_pdf_bytes(
        self,
        simulation_data: dict[str, Any] | StartupSimulationReportInput,
        branding: dict[str, Any] | ReportBranding | None = None,
        report_type: str | None = None,
    ) -> bytes:
        html = self.preview_html(simulation_data, branding=branding, report_type=report_type)
        return self._render_pdf_bytes(html)

    def _resolve_branding(
        self,
        report: StartupSimulationReportInput,
        branding: dict[str, Any] | ReportBranding | None,
    ) -> ReportBranding:
        base = {
            "company_name": report.metadata.company_name or report.startup_name,
            "report_title": report.report_title,
            "subtitle": report.subtitle,
            "system_name": self.system_name,
            "page_size": self.default_page_size,
            "report_id": report.report_id,
        }
        if isinstance(branding, ReportBranding):
            return ReportBranding.model_validate({**base, **branding.model_dump(mode="json", exclude_none=True)})
        if isinstance(branding, dict):
            return ReportBranding.model_validate({**base, **branding})
        return ReportBranding.model_validate(base)

    def _write_pdf(self, html: str, output_path: Path) -> None:
        output_path.write_bytes(self._render_pdf_bytes(html))

    def _render_pdf_bytes(self, html: str) -> bytes:
        renderer = self._select_pdf_renderer()
        if renderer == "weasyprint":
            document = HTML(string=html, base_url=str(self.template_dir))
            try:
                return document.write_pdf(optimize_images=True, presentational_hints=True)
            except TypeError:
                return document.write_pdf()
        if renderer == "playwright":
            try:
                return self._render_pdf_bytes_with_playwright(html)
            except RuntimeError as exc:
                if HTML is not None:
                    self.logger.warning(
                        "Playwright PDF rendering failed; falling back to WeasyPrint. reason=%s",
                        exc,
                    )
                    document = HTML(string=html, base_url=str(self.template_dir))
                    try:
                        return document.write_pdf(optimize_images=True, presentational_hints=True)
                    except TypeError:
                        return document.write_pdf()
                raise
        raise RuntimeError(f"Unsupported PDF renderer selected: {renderer}")

    def _select_pdf_renderer(self) -> str:
        preferred = self.pdf_renderer if self.pdf_renderer in {"auto", "weasyprint", "playwright"} else "auto"
        if preferred == "weasyprint":
            if HTML is None:
                message = "REPORT_PDF_RENDERER is set to weasyprint, but WeasyPrint is unavailable."
                if WEASYPRINT_IMPORT_ERROR is not None:
                    message = f"{message} Import error: {WEASYPRINT_IMPORT_ERROR}"
                raise RuntimeError(message)
            return "weasyprint"

        if preferred == "playwright":
            if sync_playwright is None:
                message = "REPORT_PDF_RENDERER is set to playwright, but Playwright is unavailable."
                if PLAYWRIGHT_IMPORT_ERROR is not None:
                    message = f"{message} Import error: {PLAYWRIGHT_IMPORT_ERROR}"
                raise RuntimeError(message)
            return "playwright"

        # auto mode
        if HTML is not None:
            return "weasyprint"
        if sync_playwright is not None:
            return "playwright"

        message = (
            "No supported PDF renderer is available. Install WeasyPrint runtime dependencies "
            "or Playwright with Chromium in the backend environment."
        )
        if WEASYPRINT_IMPORT_ERROR is not None:
            message = f"{message} WeasyPrint error: {WEASYPRINT_IMPORT_ERROR}"
        if PLAYWRIGHT_IMPORT_ERROR is not None:
            message = f"{message} Playwright error: {PLAYWRIGHT_IMPORT_ERROR}"
        raise RuntimeError(message)

    def _render_pdf_bytes_with_playwright(self, html: str) -> bytes:
        if sync_playwright is None:
            message = "Playwright is required to generate PDF reports with Chromium."
            if PLAYWRIGHT_IMPORT_ERROR is not None:
                message = f"{message} Import error: {PLAYWRIGHT_IMPORT_ERROR}"
            raise RuntimeError(message)

        temp_path: Path | None = None
        try:
            # On Windows, Playwright needs an asyncio policy that supports subprocess.
            if sys.platform.startswith("win"):
                try:
                    current_policy = asyncio.get_event_loop_policy()
                except Exception:
                    current_policy = None
                if current_policy is not None and not isinstance(
                    current_policy, asyncio.WindowsProactorEventLoopPolicy
                ):
                    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

            self._assert_asyncio_subprocess_supported_for_playwright()

            with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as handle:
                handle.write(html)
                temp_path = Path(handle.name)

            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                )
                page = browser.new_page()
                page.goto(temp_path.resolve().as_uri(), wait_until="networkidle")
                page.emulate_media(media="print")
                pdf_bytes = page.pdf(
                    format=self.default_page_size,
                    print_background=True,
                    prefer_css_page_size=True,
                )
                browser.close()
                return pdf_bytes
        except NotImplementedError as exc:
            raise RuntimeError(
                "Playwright PDF rendering is unavailable in this runtime loop configuration. "
                "Use Windows ProactorEventLoopPolicy (default), run via Docker, "
                "or install/fix WeasyPrint dependencies."
            ) from exc
        except Exception as exc:
            raise RuntimeError(f"Playwright PDF rendering failed: {exc}")
        finally:
            if temp_path is not None and temp_path.exists():
                temp_path.unlink(missing_ok=True)

    def _assert_asyncio_subprocess_supported_for_playwright(self) -> None:
        async def _probe() -> int:
            process = await asyncio.create_subprocess_exec(
                sys.executable,
                "-c",
                "print('ok')",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()
            if process.returncode != 0:
                stderr_text = (stderr or b"").decode("utf-8", errors="ignore").strip()
                raise RuntimeError(
                    "Async subprocess preflight returned non-zero status. "
                    f"stderr={stderr_text}"
                )
            return process.returncode

        try:
            asyncio.run(_probe())
        except RuntimeError as exc:
            if "asyncio.run() cannot be called" not in str(exc):
                raise RuntimeError(f"Playwright async-subprocess preflight failed: {exc}") from exc
            loop = asyncio.new_event_loop()
            try:
                asyncio.set_event_loop(loop)
                loop.run_until_complete(_probe())
            except Exception as nested_exc:
                raise RuntimeError(
                    f"Playwright async-subprocess preflight failed: {nested_exc}"
                ) from nested_exc
            finally:
                loop.close()
                asyncio.set_event_loop(None)
        except Exception as exc:
            raise RuntimeError(f"Playwright async-subprocess preflight failed: {exc}") from exc

    def _load_css(self) -> str:
        return (self.template_dir / "report.css").read_text(encoding="utf-8")

    def _ensure_template_engine(self) -> None:
        if self.environment is not None:
            return
        message = "Jinja2 is required to render startup simulation report templates. Install it in the backend environment."
        if JINJA2_IMPORT_ERROR is not None:
            message = f"{message} Import error: {JINJA2_IMPORT_ERROR}"
        raise RuntimeError(message)

    def _normalize_report_type(self, report_type: str | None) -> str:
        normalized = (report_type or "").strip().lower()
        if normalized not in self._SECTION_PROFILES:
            return "comprehensive"
        return normalized

    def _build_section_visibility(self, report: StartupSimulationReportInput, report_type: str) -> dict[str, bool]:
        active = self._SECTION_PROFILES[self._normalize_report_type(report_type)]
        return {
            key: (key in active and self._section_has_content(report, key))
            for key, _, _ in self._SECTION_LAYOUT
        }

    def _section_has_content(self, report: StartupSimulationReportInput, section_key: str) -> bool:
        if section_key == "business_idea":
            section = report.business_idea
            return any(
                [
                    self._has_text(section.problem_statement),
                    self._has_text(section.solution_summary),
                    self._has_text(section.value_proposition),
                    self._has_items(section.target_customer_segments),
                    self._has_items(section.key_assumptions or report.assumptions),
                ]
            )
        if section_key == "methodology":
            section = report.methodology
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.simulation_types),
                    section.iteration_count is not None,
                    self._has_items(section.parameters_varied),
                    self._has_items(section.data_sources),
                    self._has_items(section.transparency_notes),
                ]
            )
        if section_key == "market_feasibility":
            section = report.market_feasibility
            return any(
                [
                    self._has_text(section.summary),
                    section.tam is not None,
                    section.sam is not None,
                    section.som is not None,
                    section.growth_rate is not None,
                    self._has_items(section.target_audience_insights),
                    self._has_items(section.competitive_landscape),
                    self._has_items(section.go_to_market_results),
                    self._has_items(section.key_metrics),
                    self._has_items(section.tables),
                    self._has_items(section.charts),
                ]
            )
        if section_key == "technical_feasibility":
            section = report.technical_feasibility
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.tech_stack),
                    self._has_items(section.build_requirements),
                    self._has_items(section.development_timeline),
                    self._has_items(section.resource_needs),
                    self._has_items(section.technical_risks),
                    self._has_items(section.mitigations),
                    self._has_items(section.tables),
                    self._has_items(section.charts),
                ]
            )
        if section_key == "financial_viability":
            section = report.financial_viability
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.revenue_cost_scenarios),
                    self._has_text(section.break_even_analysis),
                    section.roi is not None,
                    section.npv is not None,
                    section.irr is not None,
                    self._has_text(section.payback_period),
                    self._has_text(section.cash_flow_summary),
                    self._has_items(section.unit_economics or report.key_metrics),
                    self._has_items(section.tables),
                    self._has_items(section.charts),
                ]
            )
        if section_key == "operational_feasibility":
            section = report.operational_feasibility
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.team_requirements),
                    self._has_items(section.operations_plan_results),
                    self._has_text(section.scalability_assessment),
                    self._has_items(section.tables),
                    self._has_items(section.charts),
                ]
            )
        if section_key == "risk_assessment":
            section = report.risk_assessment
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.top_risks),
                    self._has_items(section.sensitivity_notes),
                    self._has_items(section.mitigation_strategies),
                    self._has_items(section.tables),
                    self._has_items(section.charts),
                ]
            )
        if section_key == "legal_regulatory":
            section = report.legal_regulatory
            return any(
                [
                    self._has_text(section.summary),
                    self._has_items(section.key_flags),
                    self._has_items(section.next_steps),
                    self._has_items(section.sustainability_considerations),
                ]
            )
        if section_key == "conclusions":
            section = report.conclusions
            return any(
                [
                    self._has_text(section.overall_verdict),
                    self._has_items(section.prioritized_next_steps),
                    self._has_items(section.investor_pitch_summary),
                ]
            )
        if section_key == "appendices":
            section = report.appendices
            return any(
                [
                    self._has_items(section.raw_data_tables),
                    self._has_items(section.large_format_charts),
                    self._has_items(section.glossary),
                ]
            )
        return False

    def _has_text(self, value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        return bool(str(value).strip())

    def _has_items(self, items: Any) -> bool:
        if items is None:
            return False
        if isinstance(items, (list, tuple, set)):
            return len(items) > 0
        return bool(items)

    def _build_section_headers(
        self,
        section_visibility: dict[str, bool],
    ) -> tuple[dict[str, str], dict[str, str]]:
        titles: dict[str, str] = {}
        kickers: dict[str, str] = {}
        section_number = 1
        for key, _, label in self._SECTION_LAYOUT:
            if not section_visibility.get(key):
                continue
            if key == "appendices":
                titles[key] = label
                kickers[key] = "Supplementary Materials"
                continue
            titles[key] = f"{section_number}. {label}"
            kickers[key] = f"Section {section_number}"
            section_number += 1
        return titles, kickers

    def _build_toc(
        self,
        section_visibility: dict[str, bool],
        section_titles: dict[str, str],
    ) -> list[dict[str, str]]:
        toc = [{"anchor": "executive-summary", "label": "Executive Summary"}]
        for key, anchor, label in self._SECTION_LAYOUT:
            if not section_visibility.get(key):
                continue
            toc.append({"anchor": anchor, "label": section_titles.get(key) or label})
        return toc

    def _build_highlight_cards(self, report: StartupSimulationReportInput) -> list[dict[str, str]]:
        summary = report.executive_summary
        cards: list[dict[str, str]] = []
        if summary.viability_score is not None:
            cards.append({"label": "Viability Score", "display_value": self._format_number(summary.viability_score, "score")})
        if summary.success_probability is not None:
            cards.append(
                {"label": "Success Probability", "display_value": self._format_number(summary.success_probability, "percent")}
            )
        if summary.expected_roi is not None:
            cards.append({"label": "Expected ROI", "display_value": self._format_number(summary.expected_roi, "percent")})
        if summary.break_even_months is not None:
            value = self._format_number(summary.break_even_months)
            cards.append({"label": "Break-even", "display_value": f"{value} months"})
        if cards:
            return cards[:4]
        return self._serialize_metrics((summary.highlights or report.key_metrics)[:4])

    def _build_appendix_charts(
        self,
        report: StartupSimulationReportInput,
        global_charts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        appendix_charts = [chart for chart in global_charts if chart["large_format"] or chart.get("section") == "appendix"]
        appendix_charts.extend(self._serialize_charts(report.appendices.large_format_charts))
        return appendix_charts

    def _merge_section_charts(
        self,
        section: str,
        section_charts: Iterable[ChartAsset],
        global_charts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        prepared = self._serialize_charts(section_charts)
        prepared.extend(chart for chart in global_charts if (chart.get("section") or "").lower() == section.lower())
        return prepared

    def _serialize_metrics(self, metrics: Iterable[KeyMetric]) -> list[dict[str, str]]:
        return [
            {
                "label": metric.label,
                "display_value": self._format_number(metric.value),
                "benchmark": metric.benchmark or "",
                "status": metric.status or "",
                "note": metric.note or "",
            }
            for metric in metrics
        ]

    def _serialize_assumptions(self, assumptions: Iterable[AssumptionItem]) -> list[dict[str, str]]:
        return [
            {
                "category": item.category,
                "assumption": item.assumption,
                "value": self._format_number(item.value),
                "rationale": item.rationale or "",
                "source": item.source or "",
            }
            for item in assumptions
        ]

    def _serialize_risks(self, risks: Iterable[RiskItem]) -> list[dict[str, str]]:
        return [
            {
                "name": item.name,
                "description": item.description or "",
                "severity": item.severity.title(),
                "likelihood": item.likelihood or "",
                "impact": item.impact or "",
                "mitigation": item.mitigation or "",
                "owner": item.owner or "",
            }
            for item in risks
        ]

    def _serialize_scenarios(self, scenarios: Iterable[ScenarioResult]) -> list[dict[str, Any]]:
        return [
            {
                "name": item.name,
                "summary": item.summary or "",
                "probability": self._format_number(item.probability, "percent"),
                "metrics": [{"label": key, "display_value": self._format_number(value)} for key, value in item.metrics.items()],
            }
            for item in scenarios
        ]

    def _serialize_tables(self, tables: Iterable[TableData]) -> list[dict[str, Any]]:
        return [
            {
                "title": table.title,
                "columns": table.columns,
                "rows": [[self._format_number(cell) for cell in row] for row in table.rows],
                "note": table.note or "",
            }
            for table in tables
        ]

    def _serialize_recommendations(self, items: Iterable[RecommendationItem]) -> list[dict[str, str]]:
        return [
            {
                "action": item.action,
                "priority": item.priority,
                "owner": item.owner or "",
                "timeline": item.timeline or "",
                "rationale": item.rationale or "",
            }
            for item in items
        ]

    def _serialize_charts(self, charts: Iterable[ChartAsset]) -> list[dict[str, Any]]:
        return [
            {
                "title": chart.title,
                "caption": chart.caption or "",
                "section": (chart.section or "").lower(),
                "large_format": chart.large_format,
                "uri": self._resolve_asset_uri(chart.source),
            }
            for chart in charts
        ]

    def _resolve_asset_uri(self, source: str | None) -> str | None:
        if not source:
            return None
        value = str(source).strip()
        if not value:
            return None
        if value.startswith(("data:", "http://", "https://", "file://")):
            return value
        if self._looks_like_base64(value):
            return f"data:image/png;base64,{value}"
        candidate = Path(value)
        if candidate.exists():
            return candidate.resolve().as_uri()
        return value

    def _looks_like_base64(self, value: str) -> bool:
        compact = value.strip()
        if len(compact) < 96 or compact.startswith("<"):
            return False
        if compact.startswith(("C:\\", "c:\\", "/", ".\\")):
            return False
        return bool(re.fullmatch(r"[A-Za-z0-9+/=\s]+", compact))

    def _build_report_id(self, startup_name: str) -> str:
        prefix = re.sub(r"[^A-Z0-9]", "", startup_name.upper())[:6] or "START"
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        token = uuid.uuid4().hex[:6].upper()
        return f"SSR-{stamp}-{prefix}-{token}"

    def _score_to_recommendation(self, score: float | None) -> str:
        if score is None:
            return "Go with caveats"
        if score >= 75:
            return "Go"
        if score >= 60:
            return "Go with caveats"
        if score >= 40:
            return "Pivot"
        return "No-Go"

    def _coalesce(self, *values: Any) -> str:
        for value in values:
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return ""

    def _format_number(self, value: Any, style: str = "number") -> str:
        if value is None or value == "":
            return "Not provided"
        if isinstance(value, bool):
            return "Yes" if value else "No"
        if isinstance(value, str):
            return value
        if not isinstance(value, (int, float)):
            return str(value)

        if style == "percent":
            percent_value = value * 100 if -1 <= value <= 1 else value
            return f"{percent_value:,.1f}%"
        if style == "currency":
            return f"${value:,.2f}"
        if style == "score":
            return f"{value:,.0f}/100"
        if style == "integer":
            return f"{int(value):,}"
        if style == "compact":
            magnitude = abs(value)
            if magnitude >= 1_000_000_000:
                return f"${value / 1_000_000_000:,.2f}B"
            if magnitude >= 1_000_000:
                return f"${value / 1_000_000:,.2f}M"
            if magnitude >= 1_000:
                return f"${value / 1_000:,.1f}K"
            return f"${value:,.0f}"
        if float(value).is_integer():
            return f"{int(value):,}"
        return f"{value:,.2f}"
