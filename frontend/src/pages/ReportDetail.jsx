import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { exportReport, getReportEditor, getReportPreview, listReportTemplates } from "../services/platformService";

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
  return String(section.body || section.excerpt || "").trim();
}

function richDataToText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.text === "string") return data.text;
  const paragraphs = Array.isArray(data.content) ? data.content : [];
  const lines = [];
  for (const paragraph of paragraphs) {
    const nodes = Array.isArray(paragraph?.content) ? paragraph.content : [];
    const text = nodes
      .map((node) => (typeof node?.text === "string" ? node.text : ""))
      .join("")
      .trim();
    if (text) lines.push(text);
  }
  return lines.join("\n\n");
}

function blockToText(block) {
  if (!block || typeof block !== "object") return "";
  const type = String(block.type || "").toLowerCase();
  const data = block.data && typeof block.data === "object" ? block.data : {};

  if (type === "card") {
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map((item) => String(item || "").trim()).filter(Boolean).join("\n");
  }
  if (type === "metric_grid") {
    const metrics = Array.isArray(data.metrics) ? data.metrics : [];
    return metrics
      .map((item) => `${item?.label || ""}: ${item?.value || ""}`.trim())
      .filter(Boolean)
      .join("\n");
  }
  if (type === "table") {
    return String(data.title || "Table").trim();
  }
  if (type === "chart") {
    return String(data.title || "Chart").trim();
  }

  return richDataToText(data);
}

function sectionsFromDocument(documentJson, fallbackSections = []) {
  const docSections = Array.isArray(documentJson?.sections) ? documentJson.sections : [];
  if (!docSections.length) {
    return (Array.isArray(fallbackSections) ? fallbackSections : []).map((section) => ({
      heading: String(section?.heading || "Section").trim(),
      excerpt: String(section?.body || "").trim(),
    }));
  }

  return docSections.map((section, index) => {
    const title = String(section?.title || `Section ${index + 1}`).trim();
    const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
    const excerpt = blocks
      .slice()
      .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
      .map(blockToText)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 600);
    return { heading: title, excerpt };
  });
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [documentJson, setDocumentJson] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState("obsidian_board");
  const [quality, setQuality] = useState("standard");
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const [editorPayload, templateList] = await Promise.all([getReportEditor(reportId), listReportTemplates()]);
      const reportPayload = editorPayload?.report || null;
      setReport(reportPayload);
      setDocumentJson(editorPayload?.document_json || null);
      setActiveVersionId(
        editorPayload?.active_version_id ||
          reportPayload?.latest_draft_version_id ||
          reportPayload?.published_version_id ||
          ""
      );
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

  useEffect(() => {
    if (!report?.report_id) return;
    let canceled = false;
    setIsPreviewLoading(true);
    setPreviewError("");
    getReportPreview(report.report_id, {
      templateId: selectedTemplateId,
      quality,
      versionId: activeVersionId || "",
    })
      .then((html) => {
        if (canceled) return;
        setPreviewHtml(html || "");
      })
      .catch((error) => {
        if (canceled) return;
        setPreviewHtml("");
        setPreviewError(error.message);
      })
      .finally(() => {
        if (!canceled) setIsPreviewLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [report?.report_id, selectedTemplateId, quality, activeVersionId]);

  const sections = useMemo(
    () => sectionsFromDocument(documentJson, report?.sections || []),
    [documentJson, report?.sections]
  );
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
        versionId: activeVersionId || "",
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
                Preview / Edit
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Rendered Preview</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-100">{report.report_name}</h1>
              <p className="mt-2 text-sm text-slate-300">
                Live HTML preview uses the same report renderer + template configuration as PDF export.
              </p>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-white">
              {isPreviewLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                  <p className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
                    <Loader2 size={13} className="animate-spin" />
                    Rendering preview...
                  </p>
                </div>
              ) : null}
              {previewError ? (
                <div className="flex h-[72vh] items-center justify-center p-6">
                  <p className="text-sm text-rose-300">{previewError}</p>
                </div>
              ) : previewHtml ? (
                <iframe
                  title="Report preview"
                  srcDoc={previewHtml}
                  className="h-[72vh] w-full border-0"
                />
              ) : (
                <div className="flex h-[72vh] items-center justify-center p-6">
                  <p className="text-sm text-slate-500">No preview available yet.</p>
                </div>
              )}
            </div>

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
