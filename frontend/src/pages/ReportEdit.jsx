import { useEffect, useMemo, useState, useRef } from "react";
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
  Trash2,
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

// Helper to normalize sections from API
function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section) => ({
      heading: String(section?.heading || "").trim() || "Section",
      body: String(section?.body || ""),
    }))
    .filter((section) => section.heading || section.body);
}

// Longer snippet for better preview, with ellipsis only when truncated
function readSectionSnippet(value = "", maxLength = 150) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "No content yet";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

export default function ReportEditPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [report, setReport] = useState(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState([]);
  const [activeKey, setActiveKey] = useState("cover");
  const [quality, setQuality] = useState("standard");
  const [pageSize, setPageSize] = useState("a4");
  const [marginPreset, setMarginPreset] = useState("normal");
  const [paperTone, setPaperTone] = useState("white");

  // Track unsaved changes
  const initialDataRef = useRef(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for multi-page navigation
  const paperRefs = useRef({});
  const scrollContainerRef = useRef(null);

  // Derived values
  const activeIndex = activeKey === "cover" ? null : parseInt(activeKey, 10);
  const canSave = useMemo(
    () => Boolean(report && title.trim() && sections.length),
    [report, title, sections.length]
  );
  const pageSpec = PAGE_SIZE_OPTIONS.find((item) => item.value === pageSize) || PAGE_SIZE_OPTIONS[0];
  const marginSpec = MARGIN_OPTIONS.find((item) => item.value === marginPreset) || MARGIN_OPTIONS[1];

  // Load report and template data
  const load = async () => {
    setIsLoading(true);
    try {
      const [payload, templateList] = await Promise.all([
        getReport(reportId),
        listReportTemplates(),
      ]);
      setReport(payload);
      setTitle(payload.report_name || "Business Report");
      setSummary(payload.summary || "");
      const nextSections = normalizeSections(payload.sections);
      setSections(nextSections);
      setActiveKey("cover");
      const matchedTemplate = (templateList || []).find(
        (item) => item.template_id === payload.template_id
      );
      setQuality(matchedTemplate?.default_quality || "standard");

      // Store initial data for change detection
      initialDataRef.current = {
        title: payload.report_name || "Business Report",
        summary: payload.summary || "",
        sections: nextSections,
      };
      setHasUnsavedChanges(false);
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

  // Detect unsaved changes
  useEffect(() => {
    if (!initialDataRef.current) return;
    const current = { title, summary, sections };
    const initial = initialDataRef.current;
    const changed =
      current.title !== initial.title ||
      current.summary !== initial.summary ||
      JSON.stringify(current.sections) !== JSON.stringify(initial.sections);
    setHasUnsavedChanges(changed);
  }, [title, summary, sections]);

  // Warn on browser close/refresh if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcut: Ctrl/Cmd + S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canSave && !isSaving) doSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSave, isSaving]);

  const updateSection = (index, changes) => {
    setSections((current) =>
      current.map((section, i) => (i === index ? { ...section, ...changes } : section))
    );
  };

  const insertBlock = (kind) => {
    if (activeIndex === null || activeIndex < 0 || activeIndex >= sections.length) return;
    const snippets = {
      heading: "\n\n## New Heading",
      bullet: "\n- New bullet point",
      metric:
        "\n\n[Metric Card]\nLabel: Growth Rate\nValue: 24%\nContext: Quarter-over-quarter acceleration",
      chart:
        "\n\n[Chart Block]\nType: line\nLabels: Jan, Feb, Mar\nSeries: 12, 18, 24\nInsight: Momentum is increasing",
      divider: "\n\n----------------",
    };
    updateSection(activeIndex, { body: `${sections[activeIndex].body || ""}${snippets[kind] || ""}` });
  };

  const deleteSection = (index) => {
    if (sections.length <= 1) { toast.error("A report needs at least one page."); return; }
    setSections((current) => current.filter((_, i) => i !== index));
  };

  const addSection = () => {
    const newIdx = sections.length;
    setSections((current) => [...current, { heading: "New Page", body: "" }]);
    setTimeout(() => {
      paperRefs.current[String(newIdx)]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const scrollToPaper = (key) => {
    paperRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      // Update initial data to reflect saved state
      initialDataRef.current = {
        title: title.trim(),
        summary: summary.trim(),
        sections: sections.map((s) => ({ ...s })),
      };
      setHasUnsavedChanges(false);
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

  // Track which paper is most visible to highlight the matching sidebar item
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setActiveKey(top.target.dataset.sectionKey ?? "cover");
      },
      { root: container, threshold: 0.25 }
    );
    Object.values(paperRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [sections.length]);

  const paperBackground =
    paperTone === "warm" ? "#f7f3ec" : paperTone === "cool" ? "#f3f7fb" : "#ffffff";

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
        {/* Header */}
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
                <p className="truncate text-sm font-semibold">
                  {title || "Untitled Report"}
                  {hasUnsavedChanges && <span className="ml-1 text-amber-400">●</span>}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isSaving ? "Saving..." : hasUnsavedChanges ? "Unsaved changes" : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-1 py-1">
              <button type="button" onClick={() => setZoom((z) => Math.max(70, z - 5))} className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white">
                <Minus size={13} />
              </button>
              <span className="min-w-11 text-center text-xs font-semibold">{zoom}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 5))} className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white">
                <Plus size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={doSave} disabled={!canSave || isSaving}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save
              </button>
              <button type="button" onClick={doExport} disabled={isExporting}
                className="inline-flex items-center gap-1 rounded-md bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
                {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Export PDF
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs">
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              {PAGE_SIZE_OPTIONS.map((item) => <option key={item.value} value={item.value}>Page: {item.label}</option>)}
            </select>
            <select value={marginPreset} onChange={(e) => setMarginPreset(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              {MARGIN_OPTIONS.map((item) => <option key={item.value} value={item.value}>Margin: {item.label}</option>)}
            </select>
            <select value={paperTone} onChange={(e) => setPaperTone(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              <option value="white">Paper: White</option>
              <option value="warm">Paper: Warm</option>
              <option value="cool">Paper: Cool</option>
            </select>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
              <option value="standard">PDF: Standard</option>
              <option value="premium">PDF: Premium</option>
            </select>
            <span className="ml-auto text-slate-500">{sections.length} page{sections.length !== 1 ? "s" : ""}</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Sidebar — tools + page navigator */}
          <aside className="w-[220px] shrink-0 border-r border-slate-800 bg-[#0d1218]">
            <div className="h-full overflow-y-auto px-3 py-3">
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tools</p>
                <div className="space-y-1.5">
                  {TOOL_ITEMS.map((item) => (
                    <button key={item.key} type="button" onClick={() => insertBlock(item.key)}
                      disabled={activeKey === "cover"}
                      className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-2 text-left text-xs font-semibold transition hover:border-cyan-500/80 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pages</p>
                <div className="space-y-1.5">
                  {/* Cover */}
                  <button type="button" onClick={() => scrollToPaper("cover")}
                    className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                      activeKey === "cover"
                        ? "border-cyan-500 bg-cyan-500/15 text-cyan-100"
                        : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                    }`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cover</p>
                    <p className="mt-0.5 truncate text-xs font-semibold">{title || "Untitled Report"}</p>
                  </button>
                  {/* Sections */}
                  {sections.map((section, index) => (
                    <button key={`nav-${index}`} type="button" onClick={() => scrollToPaper(String(index))}
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                        activeKey === String(index)
                          ? "border-cyan-500 bg-cyan-500/15 text-cyan-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                      }`}>
                      <p className="text-[11px] font-semibold">Page {index + 1}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold">{section.heading || "Untitled"}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{readSectionSnippet(section.body)}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>

          {/* Scrollable multi-page canvas */}
          <main ref={scrollContainerRef} className="min-w-0 flex-1 overflow-auto bg-[#1a1f27] px-6 py-10">
            <div className="mx-auto flex flex-col items-center gap-8" style={{ width: pageSpec.width * (zoom / 100) }}>

              {/* Cover paper — title + summary */}
              <article
                ref={(el) => { paperRefs.current["cover"] = el; }}
                data-section-key="cover"
                onClick={() => setActiveKey("cover")}
                className={`w-full cursor-text rounded-sm border border-slate-300/80 text-slate-900 shadow-[0_20px_50px_rgba(2,6,23,0.55)] transition ${
                  activeKey === "cover" ? "ring-2 ring-cyan-500/50" : "hover:shadow-[0_24px_60px_rgba(2,6,23,0.7)]"
                }`}
                style={{ minHeight: pageSpec.minHeight * 0.4, background: paperBackground, padding: marginSpec.px, zoom: zoom / 100 }}
              >
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-none bg-transparent text-[42px] font-semibold leading-tight text-inherit focus:outline-none"
                  placeholder="Report title" />
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={7}
                  className="mt-5 w-full resize-none border-none bg-transparent text-base leading-7 text-slate-700 focus:outline-none"
                  placeholder="Executive summary..." />
              </article>

              {/* One paper per section */}
              {sections.map((section, index) => (
                <article
                  key={index}
                  ref={(el) => { paperRefs.current[String(index)] = el; }}
                  data-section-key={String(index)}
                  onClick={() => setActiveKey(String(index))}
                  className={`w-full cursor-text rounded-sm border border-slate-300/80 text-slate-900 shadow-[0_20px_50px_rgba(2,6,23,0.55)] transition ${
                    activeKey === String(index) ? "ring-2 ring-cyan-500/50" : "hover:shadow-[0_24px_60px_rgba(2,6,23,0.7)]"
                  }`}
                  style={{ minHeight: pageSpec.minHeight, background: paperBackground, padding: marginSpec.px, zoom: zoom / 100 }}
                >
                  <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Page {index + 1}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteSection(index); }}
                      className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500" title="Delete page">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input value={section.heading} onChange={(e) => updateSection(index, { heading: e.target.value })}
                    className="w-full border-none bg-transparent text-[30px] font-semibold leading-tight text-inherit focus:outline-none"
                    placeholder="Section heading" />
                  <textarea value={section.body} onChange={(e) => updateSection(index, { body: e.target.value })} rows={28}
                    className="mt-4 w-full resize-y border-none bg-transparent text-[16px] leading-8 text-slate-800 focus:outline-none"
                    placeholder="Write the section content..." />
                </article>
              ))}

              {/* Add page */}
              <button type="button" onClick={addSection}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/40 px-6 py-3 text-sm font-semibold text-slate-400 transition hover:border-cyan-500/60 hover:text-cyan-400">
                <Plus size={15} />
                Add Page
              </button>

            </div>
          </main>
        </div>
      </div>
    </section>
  );
}