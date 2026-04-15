import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChartColumn,
  Download,
  Loader2,
  Minus,
  PanelTop,
  Plus,
  Save,
  SeparatorHorizontal,
  SquareDashedBottom,
  TextCursorInput,
} from "lucide-react";
import { toast } from "sonner";

import { exportReport, getReport, listReportTemplates, updateReport } from "../services/platformService";

const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4", width: 794, minHeight: 1123 },
  { value: "letter", label: "Letter", width: 816, minHeight: 1056 },
];

const MARGIN_OPTIONS = [
  { value: "narrow", label: "Narrow", px: 44 },
  { value: "normal", label: "Normal", px: 64 },
  { value: "wide", label: "Wide", px: 84 },
];

const TOOL_ITEMS = [
  { key: "heading", label: "Heading", icon: TextCursorInput },
  { key: "bullet", label: "Bullets", icon: PanelTop },
  { key: "metric", label: "Metric", icon: SquareDashedBottom },
  { key: "chart", label: "Chart", icon: ChartColumn },
  { key: "divider", label: "Divider", icon: SeparatorHorizontal },
];

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      heading: String(section?.heading || "").trim() || "Section",
      body: String(section?.body || ""),
    }))
    .filter((section) => section.heading || section.body);
}

function readSectionSnippet(value = "") {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "No content yet";
  return text.slice(0, 58) + (text.length > 58 ? "..." : "");
}

export default function ReportEditPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [report, setReport] = useState(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [quality, setQuality] = useState("standard");
  const [pageSize, setPageSize] = useState("a4");
  const [marginPreset, setMarginPreset] = useState("normal");
  const [paperTone, setPaperTone] = useState("white");

  const selectedSection = sections[selectedSectionIndex] || null;
  const canSave = useMemo(() => Boolean(report && title.trim() && sections.length), [report, title, sections.length]);
  const pageSpec = PAGE_SIZE_OPTIONS.find((item) => item.value === pageSize) || PAGE_SIZE_OPTIONS[0];
  const marginSpec = MARGIN_OPTIONS.find((item) => item.value === marginPreset) || MARGIN_OPTIONS[1];

  const load = async () => {
    setIsLoading(true);
    try {
      const [payload, templateList] = await Promise.all([getReport(reportId), listReportTemplates()]);
      setReport(payload);
      setTitle(payload.report_name || "Business Report");
      setSummary(payload.summary || "");
      const nextSections = normalizeSections(payload.sections);
      setSections(nextSections);
      setSelectedSectionIndex(0);
      const matchedTemplate = (templateList || []).find((item) => item.template_id === payload.template_id);
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

  const updateSection = (changes) => {
    setSections((current) =>
      current.map((section, index) => (index === selectedSectionIndex ? { ...section, ...changes } : section))
    );
  };

  const insertBlock = (kind) => {
    if (!selectedSection) return;
    const snippets = {
      heading: "\n\n## New Heading",
      bullet: "\n- New bullet point",
      metric: "\n\n[Metric Card]\nLabel: Growth Rate\nValue: 24%\nContext: Quarter-over-quarter acceleration",
      chart: "\n\n[Chart Block]\nType: line\nLabels: Jan, Feb, Mar\nSeries: 12, 18, 24\nInsight: Momentum is increasing",
      divider: "\n\n----------------",
    };
    updateSection({ body: `${selectedSection.body || ""}${snippets[kind] || ""}` });
  };

  const doSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const payload = await updateReport(reportId, {
        report_name: title.trim(),
        summary: summary.trim(),
        sections: sections.map((section) => ({
          heading: section.heading,
          body: section.body,
        })),
      });
      setReport(payload);
      toast.success("Report saved.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const doExport = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await exportReport(report.report_id, "pdf", title, {
        reportType: report.report_type,
        templateId: report.template_id,
        quality,
      });
      toast.success("PDF downloaded.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const paperBackground = paperTone === "warm" ? "#f7f3ec" : paperTone === "cool" ? "#f3f7fb" : "#ffffff";

  if (isLoading) {
    return (
      <section className="min-h-[100dvh] bg-[#0b0f14] px-6 py-24 text-slate-200">
        <p className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Loader2 size={15} className="animate-spin" />
          Loading report editor...
        </p>
      </section>
    );
  }

  return (
    <section className="min-h-[100dvh] bg-[#0b0f14] text-slate-100">
      <div className="flex h-[100dvh] flex-col">
        <header className="border-b border-slate-800 bg-[#0f141c] px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/reports/${reportId}`)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title || "Untitled Report"}</p>
                <p className="text-[11px] text-slate-400">{isSaving ? "Saving..." : "Ready"}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-1 py-1">
              <button
                type="button"
                onClick={() => setZoom((current) => Math.max(70, current - 5))}
                className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Minus size={13} />
              </button>
              <span className="min-w-11 text-center text-xs font-semibold">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((current) => Math.min(150, current + 5))}
                className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={doSave}
                disabled={!canSave || isSaving}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save
              </button>
              <button
                type="button"
                onClick={doExport}
                disabled={isExporting}
                className="inline-flex items-center gap-1 rounded-md bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export PDF
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs">
            <select value={pageSize} onChange={(event) => setPageSize(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              {PAGE_SIZE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  Page: {item.label}
                </option>
              ))}
            </select>
            <select value={marginPreset} onChange={(event) => setMarginPreset(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              {MARGIN_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  Margin: {item.label}
                </option>
              ))}
            </select>
            <select value={paperTone} onChange={(event) => setPaperTone(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              <option value="white">Paper: White</option>
              <option value="warm">Paper: Warm</option>
              <option value="cool">Paper: Cool</option>
            </select>
            <select value={quality} onChange={(event) => setQuality(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              <option value="standard">PDF: Standard</option>
              <option value="premium">PDF: Premium</option>
            </select>
          </div>
        </header>

        <div className="min-h-0 flex flex-1 overflow-hidden">
          <aside className="w-[250px] shrink-0 border-r border-slate-800 bg-[#0d1218]">
            <div className="h-full overflow-y-auto px-3 py-3">
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tools</p>
                <div className="space-y-1.5">
                  {TOOL_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => insertBlock(item.key)}
                      className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-2 text-left text-xs font-semibold transition hover:border-cyan-500/80 hover:bg-slate-800"
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pages</p>
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <button
                      key={`${section.heading}-${index}`}
                      type="button"
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                        index === selectedSectionIndex
                          ? "border-cyan-500 bg-cyan-500/15 text-cyan-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <p className="text-[11px] font-semibold">Page {index + 1}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold">{section.heading}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{readSectionSnippet(section.body)}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto bg-[#1a1f27] p-4 sm:p-7">
            <div className="mx-auto w-full max-w-[1320px]">
              <article
                className="mx-auto rounded-sm border border-slate-300/80 text-slate-900 shadow-[0_30px_60px_rgba(2,6,23,0.62)]"
                style={{
                  width: `${pageSpec.width}px`,
                  minHeight: `${pageSpec.minHeight}px`,
                  background: paperBackground,
                  padding: `${marginSpec.px}px`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border-none bg-transparent text-[42px] font-semibold leading-tight focus:outline-none"
                  placeholder="Report title"
                />

                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={4}
                  className="mt-5 w-full resize-none border-none bg-transparent text-base leading-7 text-slate-700 focus:outline-none"
                  placeholder="Summary"
                />

                {selectedSection ? (
                  <section className="mt-8 border-t border-slate-300 pt-7">
                    <input
                      value={selectedSection.heading}
                      onChange={(event) => updateSection({ heading: event.target.value })}
                      className="w-full border-none bg-transparent text-[30px] font-semibold leading-tight focus:outline-none"
                      placeholder="Section heading"
                    />
                    <textarea
                      value={selectedSection.body}
                      onChange={(event) => updateSection({ body: event.target.value })}
                      rows={24}
                      className="mt-4 w-full resize-y border-none bg-transparent text-[16px] leading-8 text-slate-800 focus:outline-none"
                      placeholder="Write the section content..."
                    />
                  </section>
                ) : (
                  <p className="mt-8 text-sm text-slate-500">No section selected.</p>
                )}
              </article>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
