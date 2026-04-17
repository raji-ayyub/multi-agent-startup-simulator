import { useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, FileText, LayoutList, Loader2, PencilRuler, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

import LoadingScreen from "../components/feedback/LoadingScreen";
import { listManagementWorkspaces } from "../services/managementService";
import { deleteReport, exportReport, generateReport, listReportTemplates, listReports, planReportOutline } from "../services/platformService";
import { listSimulations } from "../services/simulationService";
import { useAuthStore } from "../store/authStore";

const REPORT_PAGE_SIZE = 3;
const REPORT_FOCUS_OPTIONS = [
  { value: "viability_report", label: "Viability Report" },
  { value: "feasibility_report", label: "Feasibility Report" },
  { value: "market_analysis_report", label: "Market Analysis Report" },
  { value: "investment_analysis_report", label: "Investment Analysis Report" },
  { value: "business_report", label: "Business Report" },
];
const REPORT_TYPE_LABELS = REPORT_FOCUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const REPORT_TYPE_CONFIG = {
  viability_report: {
    preferred_templates: ["signal_compact", "obsidian_board"],
    title_suffix: "Viability Report",
  },
  feasibility_report: {
    preferred_templates: ["feasibility_blueprint", "obsidian_board"],
    title_suffix: "Feasibility Report",
  },
  market_analysis_report: {
    preferred_templates: ["market_storyline", "signal_compact", "obsidian_board"],
    title_suffix: "Market Analysis Report",
  },
  investment_analysis_report: {
    preferred_templates: ["capital_thesis", "signal_compact", "obsidian_board"],
    title_suffix: "Investment Analysis Report",
  },
  business_report: {
    preferred_templates: ["obsidian_board", "market_storyline", "capital_thesis"],
    title_suffix: "Business Report",
  },
};

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function countKeywordHits(haystack, keywords) {
  const text = normalizeText(haystack);
  return keywords.reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);
}

function inferSuggestedReportType(simulation) {
  const payload = simulation?.input_payload || {};
  const synthesis = simulation?.synthesis || "";
  const metrics = simulation?.metrics || {};
  const blob = [
    payload.problem_statement,
    payload.target_audience,
    payload.market_size_estimate,
    payload.competitor_patterns,
    payload.monthly_burn,
    payload.current_cash_in_hand,
    payload.estimated_cac,
    payload.marketing_strategy,
    synthesis,
    Object.keys(metrics).join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const scores = {
    viability_report: 2,
    feasibility_report: 0,
    market_analysis_report: 0,
    investment_analysis_report: 0,
    business_report: 0,
  };

  scores.market_analysis_report += countKeywordHits(blob, [
    "market",
    "segment",
    "competitor",
    "demand",
    "audience",
    "position",
    "gtm",
  ]);
  scores.investment_analysis_report += countKeywordHits(blob, [
    "roi",
    "runway",
    "burn",
    "cash",
    "fund",
    "invest",
    "cac",
    "ltv",
    "revenue",
  ]);
  scores.feasibility_report += countKeywordHits(blob, [
    "feasible",
    "execution",
    "operations",
    "technical",
    "delivery",
    "timeline",
    "capacity",
  ]);
  scores.viability_report += countKeywordHits(blob, [
    "problem",
    "urgency",
    "adoption",
    "traction",
    "viable",
    "fit",
  ]);

  const hasStrongMarket = scores.market_analysis_report >= 3;
  const hasStrongInvestment = scores.investment_analysis_report >= 3;
  const hasStrongFeasibility = scores.feasibility_report >= 3;
  if ((hasStrongMarket && hasStrongInvestment) || (hasStrongFeasibility && hasStrongInvestment)) {
    scores.business_report += 5;
  }
  if (Object.keys(metrics).length >= 4) {
    scores.business_report += 2;
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "viability_report";
}

function inferSuggestedTemplateId(reportType, templates) {
  if (!Array.isArray(templates) || templates.length === 0) {
    return "obsidian_board";
  }
  const candidates = REPORT_TYPE_CONFIG[reportType]?.preferred_templates || [];
  for (const templateId of candidates) {
    const template = templates.find((item) => item.template_id === templateId);
    if (template) return template.template_id;
  }
  const typeCompatible = templates.find((item) =>
    Array.isArray(item.supported_report_types) ? item.supported_report_types.includes(reportType) : false
  );
  return typeCompatible?.template_id || templates[0]?.template_id || "obsidian_board";
}

function buildSuggestedReportTitle(simulation, reportType) {
  const startupName = String(simulation?.startup_name || "Startup").trim();
  const suffix = REPORT_TYPE_CONFIG[reportType]?.title_suffix || "Business Report";
  return `${startupName} ${suffix}`.trim();
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [simulations, setSimulations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportingId, setExportingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [pendingDeleteReport, setPendingDeleteReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [manualSelection, setManualSelection] = useState({
    reportType: false,
    template: false,
    title: false,
  });

  const [outlineStep, setOutlineStep] = useState(null); // null | 'planning' | 'review'
  const [outlineItems, setOutlineItems] = useState([]);

  const [draft, setDraft] = useState({
    simulation_id: "",
    workspace_id: "",
    report_name: "",
    report_type: "viability_report",
    template_id: "obsidian_board",
  });
  const selectedSimulation = useMemo(
    () => simulations.find((item) => item.simulation_id === draft.simulation_id) || null,
    [simulations, draft.simulation_id]
  );
  const smartSuggestionText = useMemo(() => {
    if (!selectedSimulation) return "Select a simulation to auto-fill report focus, template, and title.";
    const typeLabel = REPORT_TYPE_LABELS[draft.report_type] || "Business Report";
    const template = templates.find((item) => item.template_id === draft.template_id);
    const templateName = template?.name || "Template";
    return `Auto plan: ${typeLabel} using ${templateName}.`;
  }, [selectedSimulation, draft.report_type, draft.template_id, templates]);

  const loadReportsPage = async (page = 1) => {
    setIsLoadingReports(true);
    try {
      const response = await listReports({ page, page_size: REPORT_PAGE_SIZE });
      setReports(response?.items || []);
      setCurrentPage(Number(response?.page || page));
      setTotalPages(Number(response?.total_pages || 1));
      setTotalReports(Number(response?.total || 0));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const load = async () => {
    setIsLoadingContext(true);
    setIsLoadingReports(true);
    try {
      const [simulationData, workspaceData, templateData, reportsResponse] = await Promise.all([
        listSimulations(),
        listManagementWorkspaces(user?.email),
        listReportTemplates(),
        listReports({ page: 1, page_size: REPORT_PAGE_SIZE }),
      ]);
      setSimulations(simulationData);
      setWorkspaces(workspaceData);
      setTemplates(Array.isArray(templateData) ? templateData : []);
      setReports(reportsResponse?.items || []);
      setCurrentPage(Number(reportsResponse?.page || 1));
      setTotalPages(Number(reportsResponse?.total_pages || 1));
      setTotalReports(Number(reportsResponse?.total || 0));

      const routeSimulation = searchParams.get("simulation");
      const nextSimulationId = routeSimulation || simulationData[0]?.simulation_id || "";
      const nextWorkspaceId = workspaceData[0]?.workspace_id || "";
      const nextSimulation = simulationData.find((item) => item.simulation_id === nextSimulationId) || simulationData[0] || null;
      const nextReportType = inferSuggestedReportType(nextSimulation);
      const nextTemplateId = inferSuggestedTemplateId(nextReportType, templateData);
      const nextTitle = buildSuggestedReportTitle(nextSimulation, nextReportType);
      setDraft((current) => ({
        ...current,
        simulation_id: nextSimulationId,
        workspace_id: current.workspace_id || nextWorkspaceId,
        report_type: nextReportType,
        template_id: nextTemplateId,
        report_name: nextTitle,
      }));
      setManualSelection({ reportType: false, template: false, title: false });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoadingContext(false);
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applySmartDefaults = (simulationId) => {
    const simulation = simulations.find((item) => item.simulation_id === simulationId) || null;
    const nextReportType = inferSuggestedReportType(simulation);
    const nextTemplateId = inferSuggestedTemplateId(nextReportType, templates);
    const nextTitle = buildSuggestedReportTitle(simulation, nextReportType);
    setDraft((current) => ({
      ...current,
      report_type: nextReportType,
      template_id: nextTemplateId,
      report_name: nextTitle,
    }));
    setManualSelection({ reportType: false, template: false, title: false });
  };

  const handleSimulationChange = (simulationId) => {
    const simulation = simulations.find((item) => item.simulation_id === simulationId) || null;
    const autoReportType = inferSuggestedReportType(simulation);
    setDraft((current) => {
      const next = { ...current, simulation_id: simulationId };
      next.report_type = manualSelection.reportType ? current.report_type : autoReportType;
      next.template_id = manualSelection.template
        ? current.template_id
        : inferSuggestedTemplateId(next.report_type, templates);
      next.report_name = manualSelection.title
        ? current.report_name
        : buildSuggestedReportTitle(simulation, next.report_type);
      return next;
    });
  };

  const handleReportTypeChange = (nextReportType) => {
    setManualSelection((current) => ({ ...current, reportType: true }));
    setDraft((current) => {
      const next = { ...current, report_type: nextReportType };
      if (!manualSelection.template) {
        next.template_id = inferSuggestedTemplateId(nextReportType, templates);
      }
      if (!manualSelection.title) {
        next.report_name = buildSuggestedReportTitle(selectedSimulation, nextReportType);
      }
      return next;
    });
  };

  const handleTemplateChange = (nextTemplateId) => {
    setManualSelection((current) => ({ ...current, template: true }));
    setDraft((current) => ({ ...current, template_id: nextTemplateId }));
  };

  const handleTitleChange = (nextTitle) => {
    setManualSelection((current) => ({ ...current, title: true }));
    setDraft((current) => ({ ...current, report_name: nextTitle }));
  };

  const resolvedDraft = () => ({
    reportName: draft.report_name.trim() || buildSuggestedReportTitle(selectedSimulation, draft.report_type),
    templateId: draft.template_id || inferSuggestedTemplateId(draft.report_type, templates),
  });

  const handleGenerate = async (event, approvedOutline = null) => {
    event.preventDefault();
    if (!draft.simulation_id) {
      toast.error("Select a simulation first.");
      return;
    }
    const { reportName, templateId } = resolvedDraft();
    setIsGenerating(true);
    try {
      const created = await generateReport({
        simulation_id: draft.simulation_id,
        workspace_id: draft.workspace_id || null,
        report_name: reportName,
        report_type: draft.report_type,
        template_id: templateId,
        outline: approvedOutline || null,
      });
      toast.success(approvedOutline ? "Report generated from your outline." : "Report generated.");
      await loadReportsPage(1);
      navigate(`/reports/${created.report_id}/edit`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlanOutline = async () => {
    if (!draft.simulation_id) {
      toast.error("Select a simulation first.");
      return;
    }
    const { reportName } = resolvedDraft();
    setOutlineStep("planning");
    try {
      const response = await planReportOutline({
        simulation_id: draft.simulation_id,
        report_type: draft.report_type,
        report_name: reportName,
      });
      setOutlineItems(response.outline || []);
      setOutlineStep("review");
    } catch (error) {
      toast.error(error.message);
      setOutlineStep(null);
    }
  };

  const handleGenerateFromOutline = async () => {
    setOutlineStep(null);
    await handleGenerate({ preventDefault: () => {} }, outlineItems);
  };

  const updateOutlineItem = (index, field, value) =>
    setOutlineItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const removeOutlineItem = (index) => {
    if (outlineItems.length <= 1) return;
    setOutlineItems((current) => current.filter((_, i) => i !== index));
  };

  const addOutlineItem = () =>
    setOutlineItems((current) => [...current, { heading: "New Page", description: "" }]);

  const handleQuickExport = async (report) => {
    setExportingId(report.report_id);
    try {
      await exportReport(report.report_id, "pdf", report.report_name, {
        reportType: report.report_type || "viability_report",
        templateId: report.template_id || "obsidian_board",
        quality: "standard",
      });
      toast.success("PDF downloaded.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExportingId("");
    }
  };

  const handleDeleteReport = async (report) => {
    if (!report?.report_id) return;
    setPendingDeleteReport(report);
  };

  const confirmDeleteReport = async () => {
    const report = pendingDeleteReport;
    if (!report?.report_id) return;
    setPendingDeleteReport(null);

    setDeletingId(report.report_id);
    const reportId = report.report_id;
    setReports((current) => current.filter((item) => item.report_id !== reportId));
    setTotalReports((current) => Math.max(0, current - 1));

    try {
      await deleteReport(reportId);
      const nextTotal = Math.max(0, totalReports - 1);
      const nextMaxPage = Math.max(1, Math.ceil(nextTotal / REPORT_PAGE_SIZE));
      const targetPage = Math.min(currentPage, nextMaxPage);
      await loadReportsPage(targetPage);
      toast.success("Report deleted.");
    } catch (error) {
      toast.error(error.message);
      await loadReportsPage(currentPage);
    } finally {
      setDeletingId("");
    }
  };

  const goToPage = async (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    await loadReportsPage(nextPage);
  };

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-4">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Reports
          </p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Report Workspace</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Generate focused reports, open the full editor, and publish premium-ready exports.
          </p>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.02fr_1fr]">
          <article className="app-card rounded-2xl border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">Generate New Report</h2>
              <button
                type="button"
                onClick={load}
                className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Simulation Source">
                  <select
                    value={draft.simulation_id}
                    onChange={(event) => handleSimulationChange(event.target.value)}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    <option value="">Select simulation</option>
                    {simulations.map((simulation) => (
                      <option key={simulation.simulation_id} value={simulation.simulation_id}>
                        {simulation.startup_name} | {formatDate(simulation.created_at)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Workspace (optional)">
                  <select
                    value={draft.workspace_id}
                    onChange={(event) => setDraft((current) => ({ ...current, workspace_id: event.target.value }))}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    <option value="">No workspace context</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.workspace_id} value={workspace.workspace_id}>
                        {workspace.workspace_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Report Focus">
                  <select
                    value={draft.report_type}
                    onChange={(event) => handleReportTypeChange(event.target.value)}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    {REPORT_FOCUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Template Family">
                  <select
                    value={draft.template_id}
                    onChange={(event) => handleTemplateChange(event.target.value)}
                    className="theme-input w-full rounded-lg border px-3 py-2.5"
                  >
                    {templates.map((template) => (
                      <option key={template.template_id} value={template.template_id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Report Title (auto-filled, editable)">
                <input
                  value={draft.report_name}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                />
              </Field>

              <div className="app-card-subtle rounded-xl border px-3 py-2.5">
                <p className="text-xs font-semibold text-cyan-300">Smart defaults</p>
                <p className="app-copy mt-1 text-xs">{smartSuggestionText}</p>
                {selectedSimulation ? (
                  <p className="app-muted mt-1 text-[11px]">
                    Source: {selectedSimulation.startup_name} | Score {selectedSimulation.overall_score}/100
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applySmartDefaults(draft.simulation_id)}
                  disabled={!draft.simulation_id}
                  className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reapply smart defaults
                </button>
                <button
                  type="button"
                  onClick={handlePlanOutline}
                  disabled={isGenerating || outlineStep === "planning" || !draft.simulation_id}
                  className="app-ghost-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {outlineStep === "planning" ? <Loader2 size={15} className="animate-spin" /> : <LayoutList size={15} />}
                  {outlineStep === "planning" ? "Planning..." : "Plan Outline"}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || outlineStep === "planning"}
                  className="app-primary-btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
                  {isGenerating ? "Generating..." : "Generate Report"}
                </button>
              </div>
            </form>
          </article>

          <article className="app-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">All Reports</h2>
              <span className="app-muted text-xs">{totalReports} total</span>
            </div>

            {isLoadingContext || isLoadingReports ? (
              <LoadingScreen message="Loading reports..." mode="page" className="min-h-[220px]" />
            ) : reports.length === 0 ? (
              <p className="app-muted text-sm">No reports yet. Generate your first report.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {reports.map((report) => (
                    <article key={report.report_id} className="app-card-subtle rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText size={15} />
                            <p className="text-sm font-semibold">{report.report_name}</p>
                          </div>
                          <p className="app-copy mt-2 line-clamp-2 text-sm">{report.summary}</p>
                          <p className="app-muted mt-2 text-xs uppercase tracking-[0.12em]">
                            {REPORT_TYPE_LABELS[report.report_type] || (report.report_type || "viability_report").replaceAll("_", " ")} | {(report.template_id || "obsidian_board").replaceAll("_", " ")}
                          </p>
                          <p className="app-muted mt-2 text-xs">
                            {report.sections_count || 0} sections | {report.key_findings_count || 0} findings |{" "}
                            {report.recommended_actions_count || 0} actions
                          </p>
                          <p className="app-muted mt-1 text-xs">Updated {formatDate(report.updated_at || report.created_at)}</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/reports/${report.report_id}/edit`)}
                            className="app-primary-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                          >
                            <PencilRuler size={13} />
                            Open Editor
                          </button>
                          <button
                            type="button"
                            disabled={exportingId === report.report_id}
                            onClick={() => handleQuickExport(report)}
                            className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                          >
                            {exportingId === report.report_id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                            {exportingId === report.report_id ? "Exporting..." : "Quick PDF"}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === report.report_id}
                            onClick={() => handleDeleteReport(report)}
                            className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-300"
                          >
                            {deletingId === report.report_id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            {deletingId === report.report_id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="app-muted text-xs">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1 || isLoadingReports}
                      className="app-ghost-btn rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages || isLoadingReports}
                      className="app-ghost-btn rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>
        </section>

        {outlineStep === "review" ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="app-card flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="app-heading text-lg font-semibold">Report Outline</h3>
                  <p className="app-copy mt-1 text-sm">
                    Agent planned {outlineItems.length} pages. Edit headings and descriptions before generating.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOutlineStep(null)}
                  className="app-ghost-btn ml-4 shrink-0 rounded-lg border p-1.5"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {outlineItems.map((item, index) => (
                  <div key={index} className="app-card-subtle rounded-xl border p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-2 w-6 shrink-0 text-center text-[11px] font-bold text-cyan-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <input
                          value={item.heading}
                          onChange={(e) => updateOutlineItem(index, "heading", e.target.value)}
                          className="theme-input w-full rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
                          placeholder="Page heading"
                        />
                        {item.description ? (
                          <p className="app-muted mt-1.5 text-xs leading-relaxed">{item.description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOutlineItem(index)}
                        disabled={outlineItems.length <= 1}
                        className="app-ghost-btn mt-1 shrink-0 rounded border p-1 disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addOutlineItem}
                className="app-ghost-btn mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
              >
                <Plus size={13} />
                Add Page
              </button>

              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setOutlineStep(null)}
                  className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFromOutline}
                  disabled={isGenerating || outlineItems.length === 0}
                  className="app-primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />}
                  {isGenerating ? "Generating..." : "Generate Report"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pendingDeleteReport ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
            <article className="app-card w-full max-w-md rounded-2xl border p-5">
              <h3 className="app-heading text-base font-semibold">Delete report?</h3>
              <p className="app-copy mt-2 text-sm">
                This will permanently remove <span className="font-semibold">{pendingDeleteReport.report_name}</span>.
              </p>
              <p className="app-muted mt-1 text-xs">This action cannot be undone.</p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteReport(null)}
                  className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteReport}
                  className="app-danger-btn rounded-lg px-3 py-2 text-xs font-semibold"
                >
                  Delete report
                </button>
              </div>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="app-copy mb-2 block text-xs">{label}</span>
      {children}
    </label>
  );
}
