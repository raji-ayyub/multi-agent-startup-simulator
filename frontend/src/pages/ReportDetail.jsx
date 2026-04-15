import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { exportReport, getReport, listReportTemplates } from "../services/platformService";

const REPORT_TYPE_LABELS = {
  viability_report: "Viability Report",
  feasibility_report: "Feasibility Report",
  market_analysis_report: "Market Analysis Report",
  investment_analysis_report: "Investment Analysis Report",
  business_report: "Business Report",
};

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown";
  }
}

function readSectionValue(section) {
  if (!section) return "";
  return String(section.body || "").trim();
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState("obsidian_board");
  const [quality, setQuality] = useState("standard");
  const [isExporting, setIsExporting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [reportPayload, templateList] = await Promise.all([getReport(reportId), listReportTemplates()]);
      setReport(reportPayload);
      setTemplates(templateList || []);
      setSelectedSectionIndex(0);
      const nextTemplateId = reportPayload?.template_id || templateList?.[0]?.template_id || "obsidian_board";
      const matchedTemplate = (templateList || []).find((item) => item.template_id === nextTemplateId);
      setSelectedTemplateId(nextTemplateId);
      setQuality(matchedTemplate?.default_quality || "standard");
    } catch (error) {
      toast.error(error.message);
      navigate("/reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reportId]);

  const sections = Array.isArray(report?.sections) ? report.sections : [];
  const activeSection = sections[selectedSectionIndex] || sections[0] || null;
  const activeTemplate = templates.find((item) => item.template_id === selectedTemplateId) || null;
  const templateDescription = activeTemplate?.description || "Template configuration";

  const insightSummary = useMemo(() => {
    const sectionText = readSectionValue(activeSection);
    if (!sectionText) return "No section analysis is available yet for this report.";
    return sectionText.slice(0, 260);
  }, [activeSection]);

  const signalScore = useMemo(() => {
    const summary = String(report?.summary || "");
    const base = Math.min(100, Math.max(45, Math.round(summary.length / 18)));
    return base;
  }, [report]);

  const handleExport = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await exportReport(report.report_id, "pdf", report.report_name, {
        reportType: report.report_type,
        quality,
        templateId: selectedTemplateId,
      });
      toast.success("PDF downloaded.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !report) {
    return (
      <section className="app-view h-full">
        <div className="mx-auto max-w-[1100px] py-24">
          <p className="app-muted inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Loading report workspace...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3">
        <header className="app-card rounded-2xl border px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold">PentraAI Studio</p>
              <span className="app-muted text-sm">Drafts</span>
              <span className="text-sm font-semibold text-cyan-300">Templates</span>
              <span className="app-muted text-sm">Archive</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate("/reports")} className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
                <ArrowLeft size={14} />
                Back
              </button>
              <button type="button" onClick={() => navigate(`/reports/${reportId}/edit`)} className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold">
                <Pencil size={13} />
                Edit
              </button>
              <button type="button" onClick={handleExport} disabled={isExporting} className="app-primary-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold">
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </header>

        <main className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="app-card rounded-2xl border p-4">
            <p className="text-lg font-semibold">{report.report_name}</p>
            <p className="app-muted mt-1 text-xs">{REPORT_TYPE_LABELS[report.report_type] || report.report_type}</p>
            <div className="mt-4 space-y-2">
              {sections.map((section, index) => (
                <button
                  key={`${section.heading}-${index}`}
                  type="button"
                  onClick={() => setSelectedSectionIndex(index)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    index === selectedSectionIndex ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "app-card-subtle"
                  }`}
                >
                  {section.heading}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-800 pt-3">
              <p className="app-muted text-xs">Updated {formatDate(report.updated_at || report.created_at)}</p>
            </div>
          </aside>

          <article className="app-card rounded-2xl border p-5">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Executive Strategy Document</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-100">{report.report_name}</h1>
              <p className="mt-3 max-w-3xl text-lg text-slate-300">{report.summary}</p>
            </div>

            <section className="mt-5 rounded-2xl border border-cyan-500/60 bg-slate-950/70 p-5">
              <p className="text-xl font-semibold text-slate-100">{activeSection?.heading || "Section"}</p>
              <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-300">{readSectionValue(activeSection)}</p>
            </section>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <article className="app-card-subtle rounded-2xl border p-4">
                <p className="app-muted text-xs uppercase tracking-[0.12em]">Key Findings</p>
                <p className="mt-2 text-4xl font-semibold text-cyan-300">{(report.key_findings || []).length}</p>
                <p className="app-copy mt-2 text-sm">Signals extracted from simulation + context synthesis.</p>
              </article>
              <article className="app-card-subtle rounded-2xl border p-4">
                <p className="app-muted text-xs uppercase tracking-[0.12em]">Recommended Actions</p>
                <p className="mt-2 text-4xl font-semibold text-amber-300">{(report.recommended_actions || []).length}</p>
                <p className="app-copy mt-2 text-sm">Execution moves prioritized for near-term outcome lift.</p>
              </article>
            </div>
          </article>

          <aside className="app-card rounded-2xl border p-4">
            <p className="text-sm font-semibold text-cyan-300">AI Insight Panel</p>
            <p className="app-muted mt-1 text-xs">Real-time analysis view</p>
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-slate-400">
                <span>Signal Confidence</span>
                <span>{signalScore}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${signalScore}%` }} />
              </div>
            </div>

            <article className="mt-5 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-sm font-semibold">Section Insight</p>
              <p className="mt-2 text-sm text-slate-300">{insightSummary}</p>
            </article>

            <article className="mt-5 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-sm font-semibold">Template</p>
              <select
                value={selectedTemplateId}
                onChange={(event) => {
                  const nextTemplateId = event.target.value;
                  const matchedTemplate = templates.find((item) => item.template_id === nextTemplateId);
                  setSelectedTemplateId(nextTemplateId);
                  setQuality(matchedTemplate?.default_quality || "standard");
                }}
                className="theme-input mt-2 w-full rounded-lg border px-3 py-2 text-sm"
              >
                {templates.map((item) => (
                  <option key={item.template_id} value={item.template_id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="app-muted mt-2 text-xs">{templateDescription}</p>
            </article>

            <article className="mt-5 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
              <p className="text-sm font-semibold">Export Quality</p>
              <select value={quality} onChange={(event) => setQuality(event.target.value)} className="theme-input mt-2 w-full rounded-lg border px-3 py-2 text-sm">
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </article>
          </aside>
        </main>
      </div>
    </section>
  );
}
