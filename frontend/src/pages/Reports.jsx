import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { listActiveAgents } from "../services/agentService";
import { listManagementWorkspaces } from "../services/managementService";
import {
  exportReport,
  generateReport,
  listReports,
} from "../services/platformService";
import { listSimulations } from "../services/simulationService";
import { useAuthStore } from "../store/authStore";

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [simulations, setSimulations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [reports, setReports] = useState([]);
  const [approvedAgents, setApprovedAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState({
    simulation_id: "",
    workspace_id: "",
    report_name: "Board Insight Report",
  });
  const [selectedReportId, setSelectedReportId] = useState("");

  const selectedReport = useMemo(
    () => reports.find((item) => item.report_id === selectedReportId) || reports[0] || null,
    [reports, selectedReportId]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const [simulationData, workspaceData, reportData, activeAgents] = await Promise.all([
        listSimulations(),
        listManagementWorkspaces(user?.email),
        listReports(),
        listActiveAgents(),
      ]);
      setSimulations(simulationData);
      setWorkspaces(workspaceData);
      setReports(reportData);
      setApprovedAgents(activeAgents.filter((item) => item.workspace_mode === "management"));

      const routeSimulation = searchParams.get("simulation");
      const nextSimulationId = routeSimulation || simulationData[0]?.simulation_id || "";
      const nextWorkspaceId = workspaceData[0]?.workspace_id || "";
      setDraft((current) => ({
        ...current,
        simulation_id: current.simulation_id || nextSimulationId,
        workspace_id: current.workspace_id || nextWorkspaceId,
      }));
      setSelectedReportId((current) => current || reportData[0]?.report_id || "");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!draft.simulation_id) {
      toast.error("Select a simulation first.");
      return;
    }
    setIsGenerating(true);
    try {
      const created = await generateReport({
        simulation_id: draft.simulation_id,
        workspace_id: draft.workspace_id || null,
        report_name: draft.report_name,
      });
      setReports((current) => [created, ...current.filter((item) => item.report_id !== created.report_id)]);
      setSelectedReportId(created.report_id);
      toast.success("Business report generated.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedReport) return;
    try {
      await exportReport(selectedReport.report_id, format);
      toast.success(format === "gdocs" ? "Google Docs import file downloaded." : "PDF downloaded.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Insight Reports
          </p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Business Reporting Center</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Generate board-ready business insight reports from simulation outcomes, operational context, and approved management agents.
          </p>
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <article className="app-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">Generate Report</h2>
              <button
                type="button"
                onClick={load}
                className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>
            <form onSubmit={handleGenerate} className="space-y-4">
              <Field label="Simulation Source">
                <select
                  value={draft.simulation_id}
                  onChange={(event) => setDraft((current) => ({ ...current, simulation_id: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                >
                  <option value="">Select simulation</option>
                  {simulations.map((simulation) => (
                    <option key={simulation.simulation_id} value={simulation.simulation_id}>
                      {simulation.startup_name} | {new Date(simulation.created_at).toLocaleDateString()} | {simulation.overall_score}/100
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Management Workspace">
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
              <Field label="Report Title">
                <input
                  value={draft.report_name}
                  onChange={(event) => setDraft((current) => ({ ...current, report_name: event.target.value }))}
                  className="theme-input w-full rounded-lg border px-3 py-2.5"
                />
              </Field>
              <button
                type="submit"
                disabled={isGenerating}
                className="app-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                <Sparkles size={15} />
                {isGenerating ? "Generating..." : "Generate Insight Report"}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <p className="app-muted text-xs uppercase tracking-[0.16em]">Approved Management Agents</p>
              {approvedAgents.length === 0 ? (
                <p className="app-muted text-sm">No approved management agents yet. Use Agent Hub to request reporting or calendar support agents.</p>
              ) : (
                approvedAgents.map((agent) => (
                  <div key={agent.request_id} className="app-card-subtle rounded-xl border px-3 py-3">
                    <p className="text-sm font-semibold">{agent.title}</p>
                    <p className="app-muted text-xs uppercase tracking-[0.16em]">{agent.agent_type}</p>
                    <p className="app-copy mt-2 text-sm">{agent.admin_notes || agent.notes || "Approved for management workflows."}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <div className="space-y-5">
            <article className="app-card rounded-2xl border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="app-heading text-lg font-semibold">Generated Reports</h2>
                <span className="app-muted text-xs">{reports.length} saved</span>
              </div>
              {isLoading ? (
                <p className="app-muted text-sm">Loading reports...</p>
              ) : reports.length === 0 ? (
                <p className="app-muted text-sm">No reports yet. Generate one from a simulation above.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {reports.map((report) => (
                    <button
                      key={report.report_id}
                      type="button"
                      onClick={() => setSelectedReportId(report.report_id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedReport?.report_id === report.report_id ? "app-badge" : "app-card-subtle hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={15} />
                        <p className="text-sm font-semibold">{report.report_name}</p>
                      </div>
                      <p className="app-copy mt-2 text-sm">{report.summary}</p>
                      <p className="app-muted mt-3 text-xs">{new Date(report.created_at).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="app-card rounded-2xl border p-5">
              {!selectedReport ? (
                <p className="app-muted text-sm">Select a report to preview it.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="app-muted text-xs uppercase tracking-[0.16em]">Preview</p>
                      <h2 className="app-heading mt-1 text-2xl font-semibold">{selectedReport.report_name}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleExport("pdf")}
                        className="app-primary-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                      >
                        <Download size={14} />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport("gdocs")}
                        className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
                      >
                        <BarChart3 size={14} />
                        Google Docs
                      </button>
                    </div>
                  </div>
                  <p className="app-copy mt-4 text-sm">{selectedReport.summary}</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {selectedReport.sections.map((section) => (
                      <article key={section.heading} className="app-card-subtle rounded-xl border p-4">
                        <p className="text-sm font-semibold">{section.heading}</p>
                        <p className="app-copy mt-2 text-sm">{section.body}</p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <article className="app-card-subtle rounded-xl border p-4">
                      <p className="text-sm font-semibold">Key Findings</p>
                      <div className="mt-3 space-y-2">
                        {selectedReport.key_findings.map((item) => (
                          <p key={item} className="app-copy text-sm">- {item}</p>
                        ))}
                      </div>
                    </article>
                    <article className="app-card-subtle rounded-xl border p-4">
                      <p className="text-sm font-semibold">Recommended Actions</p>
                      <div className="mt-3 space-y-2">
                        {selectedReport.recommended_actions.map((item) => (
                          <p key={item} className="app-copy text-sm">- {item}</p>
                        ))}
                      </div>
                    </article>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
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
