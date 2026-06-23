import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChartColumn,
  Loader2,
  PanelTop,
  SeparatorHorizontal,
  SquareDashedBottom,
  TextCursorInput,
} from "lucide-react";
import { toast } from "sonner";

import ReportEditSidebar from "../components/reports/editor/ReportEditSidebar";
import ReportEditToolbar from "../components/reports/editor/ReportEditToolbar";
import {
  exportReport,
  getReportEditor,
  listReportTemplates,
  renderReportDraftPdfPreview,
  saveReportDraft,
} from "../services/platformService";

const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4", exportSize: "A4" },
  { value: "letter", label: "Letter", exportSize: "LETTER" },
];

const MARGIN_OPTIONS = [
  { value: "narrow", label: "Narrow", px: 36 },
  { value: "normal", label: "Normal", px: 52 },
  { value: "wide", label: "Wide", px: 68 },
];

const TOOL_ITEMS = [
  { key: "heading", label: "Text", icon: TextCursorInput },
  { key: "bullet", label: "Bullets", icon: PanelTop },
  { key: "metric", label: "Metric", icon: SquareDashedBottom },
  { key: "chart", label: "Chart", icon: ChartColumn },
  { key: "divider", label: "Divider", icon: SeparatorHorizontal },
];

const REPORT_TYPE_SUBTITLES = {
  viability_report: "Commercial viability snapshot and execution confidence",
  feasibility_report: "Execution feasibility across market, operations, and delivery",
  market_analysis_report: "Market structure, demand signals, and positioning pressure",
  investment_analysis_report: "Capital thesis, return profile, risk bands, and funding readiness",
  business_report: "Integrated founder brief across viability, feasibility, market, and capital",
};

function safeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function newId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function toDocText(value = "") {
  const paragraphs = String(value || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }))
      : [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
  };
}

function readDocText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.text === "string") return data.text;
  const content = Array.isArray(data.content) ? data.content : [];
  return content
    .map((paragraph) => {
      const nodes = Array.isArray(paragraph?.content) ? paragraph.content : [];
      return nodes.map((node) => (typeof node?.text === "string" ? node.text : "")).join("").trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function csvValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvNumbers(value) {
  return csvValues(value)
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item));
}

function normalizeDocument(documentJson, report) {
  const base = documentJson && typeof documentJson === "object" ? clone(documentJson) : {};
  if (!base.meta || typeof base.meta !== "object") base.meta = {};
  if (!Array.isArray(base.sections)) base.sections = [];

  base.meta.report_name = safeText(base.meta.report_name, report?.report_name || "Business Insight Report");
  base.meta.report_type = safeText(base.meta.report_type, report?.report_type || "business_report");
  base.meta.template_id = safeText(base.meta.template_id, report?.template_id || "obsidian_board");
  base.meta.page_setup = base.meta.page_setup && typeof base.meta.page_setup === "object" ? base.meta.page_setup : {};
  base.meta.page_setup.margins =
    base.meta.page_setup.margins && typeof base.meta.page_setup.margins === "object"
      ? base.meta.page_setup.margins
      : { top: 52, right: 52, bottom: 52, left: 52 };
  base.meta.page_setup.size = safeText(base.meta.page_setup.size, "A4");
  base.meta.page_setup.background = safeText(base.meta.page_setup.background, "#ffffff");
  base.meta.page_setup.font_family = safeText(base.meta.page_setup.font_family, "Georgia");
  base.meta.page_setup.font_scale = Number.isFinite(Number(base.meta.page_setup.font_scale))
    ? Number(base.meta.page_setup.font_scale)
    : 100;

  base.meta.cover = base.meta.cover && typeof base.meta.cover === "object" ? base.meta.cover : {};
  base.meta.cover.kicker = safeText(base.meta.cover.kicker, "Professional Startup Simulation Report");
  base.meta.cover.title = safeText(base.meta.cover.title, base.meta.report_name);
  base.meta.cover.subtitle = safeText(
    base.meta.cover.subtitle,
    REPORT_TYPE_SUBTITLES[base.meta.report_type] || REPORT_TYPE_SUBTITLES.business_report
  );
  base.meta.cover.startup_name = safeText(base.meta.cover.startup_name, "");
  base.meta.cover.generated_on = safeText(
    base.meta.cover.generated_on,
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  );
  base.meta.cover.prepared_by = safeText(base.meta.cover.prepared_by, "PetraAI");
  base.meta.cover.report_id = safeText(base.meta.cover.report_id, report?.report_id || "");

  base.sections = base.sections
    .filter((section) => section && typeof section === "object")
    .map((section, sectionIndex) => ({
      section_id: safeText(section.section_id, newId("section")),
      title: safeText(section.title, `Section ${sectionIndex + 1}`),
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : sectionIndex,
      blocks: (Array.isArray(section.blocks) ? section.blocks : [])
        .filter((block) => block && typeof block === "object")
        .map((block, blockIndex) => ({
          block_id: safeText(block.block_id, newId("block")),
          type: safeText(block.type, "rich_text"),
          order: Number.isFinite(Number(block.order)) ? Number(block.order) : blockIndex,
          layout: block.layout && typeof block.layout === "object" ? block.layout : { span: 12, align: "left", flow: "full-width" },
          data: block.data && typeof block.data === "object" ? block.data : {},
        })),
    }))
    .sort((a, b) => a.order - b.order);

  if (base.sections.length === 0) {
    base.sections = [
      {
        section_id: newId("section"),
        title: "Executive Summary",
        order: 0,
        blocks: [
          {
            block_id: newId("block"),
            type: "rich_text",
            order: 0,
            layout: { span: 12, align: "left", flow: "full-width" },
            data: toDocText(report?.summary || ""),
          },
        ],
      },
    ];
  }

  return base;
}

function createBlockForTool(toolKey, order) {
  if (toolKey === "divider") {
    return { block_id: newId("block"), type: "divider", order, layout: { span: 12 }, data: {} };
  }
  if (toolKey === "chart") {
    return {
      block_id: newId("block"),
      type: "chart",
      order,
      layout: { span: 12 },
      data: {
        title: "New Chart",
        chart_type: "bar",
        labels: ["Signal A", "Signal B", "Signal C"],
        series: [{ name: "Score", values: [55, 72, 64] }],
        notes: "",
        colors: ["#0ea5e9", "#22c55e", "#f59e0b"],
      },
    };
  }
  if (toolKey === "metric") {
    return {
      block_id: newId("block"),
      type: "metric_grid",
      order,
      layout: { span: 12 },
      data: {
        title: "Metrics",
        metrics: [
          { label: "North Star", value: "0", delta: "+0%" },
          { label: "Risk Index", value: "0.00", delta: "stable" },
        ],
      },
    };
  }
  const starter = toolKey === "bullet" ? "- Bullet point one\n- Bullet point two" : "New report text";
  return {
    block_id: newId("block"),
    type: "rich_text",
    order,
    layout: { span: 12 },
    data: toDocText(starter),
  };
}

function ReportPreviewPane({ pdfUrl, status, error, zoom, onRefresh }) {
  const scale = zoom / 100;
  return (
    <main className="min-w-0 flex-1 overflow-auto bg-[#1a1f27] px-6 py-6">
      <div className="mx-auto min-h-full" style={{ width: `${Math.max(760, 980 * scale)}px` }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>{status}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Refresh preview
          </button>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-700 bg-[#1a1f27] shadow-[0_20px_50px_rgba(2,6,23,0.55)]" style={{ height: "calc(100dvh - 164px)" }}>
          {error ? (
            <div className="flex h-full items-center justify-center bg-slate-950 p-6 text-center">
              <div className="max-w-md">
                <p className="text-sm font-semibold text-rose-200">Preview unavailable</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{error}</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              title="Report preview"
              src={pdfUrl}
              className="h-full w-full border-0 bg-[#1a1f27]"
              style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: `${100 / scale}%` }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-300">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Preparing preview...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InspectorField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500";
const textareaClass = `${inputClass} min-h-[110px] resize-y leading-6`;

function ReportInspector({
  cover,
  activeSection,
  activeBlock,
  onUpdateCoverField,
  onUpdateSectionTitle,
  onUpdateBlock,
  onDeleteBlock,
}) {
  const blockType = String(activeBlock?.type || "").toLowerCase();
  const data = activeBlock?.data && typeof activeBlock.data === "object" ? activeBlock.data : {};

  const patchBlockData = (patch) => {
    if (!activeSection || !activeBlock) return;
    onUpdateBlock(activeSection.section_id, activeBlock.block_id, {
      ...activeBlock,
      data: { ...data, ...patch },
    });
  };

  const metricLines = (data.metrics || []).map((item) => `${item.label || ""} | ${item.value || ""} | ${item.delta || item.note || ""}`).join("\n");
  const cardLines = (data.items || []).join("\n");
  const firstSeries = Array.isArray(data.series) && data.series[0] ? data.series[0] : { name: "Series", values: [] };

  return (
    <aside className="w-[360px] shrink-0 border-l border-slate-800 bg-[#0d1218]">
      <div className="h-full overflow-y-auto px-4 py-4">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Cover</p>
          {[
            ["kicker", "Kicker"],
            ["title", "Title"],
            ["subtitle", "Subtitle"],
            ["startup_name", "Startup"],
            ["generated_on", "Generated"],
            ["report_id", "Report ID"],
            ["prepared_by", "Prepared By"],
          ].map(([field, label]) => (
            <InspectorField key={field} label={label}>
              <input value={String(cover?.[field] || "")} onChange={(event) => onUpdateCoverField(field, event.target.value)} className={inputClass} />
            </InspectorField>
          ))}
        </section>

        <section className="mt-6 space-y-3 border-t border-slate-800 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Selection</p>
          {activeSection ? (
            <InspectorField label="Section title">
              <input value={activeSection.title || ""} onChange={(event) => onUpdateSectionTitle(activeSection.section_id, event.target.value)} className={inputClass} />
            </InspectorField>
          ) : null}

          {activeBlock ? (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{String(activeBlock.type || "Block").replaceAll("_", " ")}</p>
                <button type="button" onClick={() => onDeleteBlock(activeSection.section_id, activeBlock.block_id)} className="text-xs font-semibold text-rose-300 hover:text-rose-200">
                  Remove
                </button>
              </div>

              {blockType === "rich_text" ? (
                <InspectorField label="Text">
                  <textarea
                    value={readDocText(data)}
                    onChange={(event) =>
                      onUpdateBlock(activeSection.section_id, activeBlock.block_id, {
                        ...activeBlock,
                        data: toDocText(event.target.value),
                      })
                    }
                    className={textareaClass}
                  />
                </InspectorField>
              ) : null}

              {blockType === "metric_grid" ? (
                <>
                  <InspectorField label="Title">
                    <input value={String(data.title || "")} onChange={(event) => patchBlockData({ title: event.target.value })} className={inputClass} />
                  </InspectorField>
                  <InspectorField label="Metrics: label | value | delta">
                    <textarea
                      value={metricLines}
                      onChange={(event) =>
                        patchBlockData({
                          metrics: event.target.value
                            .split("\n")
                            .map((line) => line.split("|").map((item) => item.trim()))
                            .filter((parts) => parts.some(Boolean))
                            .map(([label, value, delta]) => ({ label, value, delta })),
                        })
                      }
                      className={textareaClass}
                    />
                  </InspectorField>
                </>
              ) : null}

              {blockType === "chart" ? (
                <>
                  <InspectorField label="Title">
                    <input value={String(data.title || "")} onChange={(event) => patchBlockData({ title: event.target.value })} className={inputClass} />
                  </InspectorField>
                  <InspectorField label="Type">
                    <select value={String(data.chart_type || "bar")} onChange={(event) => patchBlockData({ chart_type: event.target.value })} className={inputClass}>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                    </select>
                  </InspectorField>
                  <InspectorField label="Labels">
                    <input value={(data.labels || []).join(", ")} onChange={(event) => patchBlockData({ labels: csvValues(event.target.value) })} className={inputClass} />
                  </InspectorField>
                  <InspectorField label="Values">
                    <input
                      value={(firstSeries.values || []).join(", ")}
                      onChange={(event) => patchBlockData({ series: [{ ...firstSeries, name: firstSeries.name || "Series", values: csvNumbers(event.target.value) }] })}
                      className={inputClass}
                    />
                  </InspectorField>
                  <InspectorField label="Notes">
                    <textarea value={String(data.notes || "")} onChange={(event) => patchBlockData({ notes: event.target.value })} className={textareaClass} />
                  </InspectorField>
                </>
              ) : null}

              {blockType === "card" ? (
                <>
                  <InspectorField label="Title">
                    <input value={String(data.title || "")} onChange={(event) => patchBlockData({ title: event.target.value })} className={inputClass} />
                  </InspectorField>
                  <InspectorField label="Items">
                    <textarea value={cardLines} onChange={(event) => patchBlockData({ items: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} className={textareaClass} />
                  </InspectorField>
                </>
              ) : null}

              {blockType === "divider" ? <p className="text-sm text-slate-400">Divider block. It will render as a visual separator in the report.</p> : null}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-400">Select a block to edit its content.</p>
          )}
        </section>
      </div>
    </aside>
  );
}

export default function ReportEditPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [report, setReport] = useState(null);
  const [documentState, setDocumentState] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [activeBlockId, setActiveBlockId] = useState("");
  const [activeVersionId, setActiveVersionId] = useState("");
  const [quality, setQuality] = useState("standard");
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewStatus, setPreviewStatus] = useState("Preview not ready yet");
  const [previewError, setPreviewError] = useState("");
  const [pageSize, setPageSize] = useState("a4");
  const [marginPreset, setMarginPreset] = useState("normal");
  const [paperTone, setPaperTone] = useState("white");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialSnapshotRef = useRef("");
  const previewRequestRef = useRef(0);
  const previewPdfUrlRef = useRef("");

  const sections = useMemo(() => {
    if (!Array.isArray(documentState?.sections)) return [];
    return [...documentState.sections].sort((a, b) => a.order - b.order);
  }, [documentState]);
  const activeSection = sections.find((section) => section.section_id === activeSectionId) || sections[0] || null;
  const activeBlock = activeSection?.blocks?.find((block) => block.block_id === activeBlockId) || null;
  const canSave = Boolean(report && documentState);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [editorPayload, templates] = await Promise.all([getReportEditor(reportId), listReportTemplates()]);
        const reportPayload = editorPayload?.report || null;
        const normalized = normalizeDocument(editorPayload?.document_json || {}, reportPayload);
        setReport(reportPayload);
        setDocumentState(normalized);
        setActiveSectionId(normalized.sections[0]?.section_id || "");
        setActiveBlockId("");
        setActiveVersionId(editorPayload?.active_version_id || reportPayload?.latest_draft_version_id || reportPayload?.published_version_id || "");

        const sizeToken = String(normalized?.meta?.page_setup?.size || "").toLowerCase();
        setPageSize(sizeToken === "letter" ? "letter" : "a4");
        const marginValue = Number(normalized?.meta?.page_setup?.margins?.left || 52);
        if (marginValue <= 40) setMarginPreset("narrow");
        else if (marginValue >= 64) setMarginPreset("wide");
        else setMarginPreset("normal");
        const backgroundToken = String(normalized?.meta?.page_setup?.background || "").toLowerCase();
        if (backgroundToken === "#f7f3ec") setPaperTone("warm");
        else if (backgroundToken === "#f3f7fb") setPaperTone("cool");
        else setPaperTone("white");

        const matchedTemplate = (templates || []).find((item) => item.template_id === reportPayload?.template_id);
        setQuality(matchedTemplate?.default_quality || "standard");
        initialSnapshotRef.current = JSON.stringify(normalized);
        setHasUnsavedChanges(false);
      } catch (error) {
        toast.error(error.message);
        navigate("/reports");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [reportId, navigate]);

  useEffect(() => {
    if (!documentState) return;
    setHasUnsavedChanges(JSON.stringify(documentState) !== initialSnapshotRef.current);
  }, [documentState]);

  useEffect(() => {
    return () => {
      if (previewPdfUrlRef.current) window.URL.revokeObjectURL(previewPdfUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateDocument = (updater) => {
    setDocumentState((current) => {
      if (!current) return current;
      const draft = clone(current);
      updater(draft);
      return draft;
    });
  };

  const refreshPreview = useCallback(async () => {
    if (!report || !documentState) return;
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewStatus("Preparing preview...");
    setPreviewError("");
    try {
      const pdfBlob = await renderReportDraftPdfPreview(report.report_id, documentState, {
        quality,
        templateId: documentState.meta?.template_id || report.template_id,
      });
      if (previewRequestRef.current !== requestId) return;
      const nextUrl = window.URL.createObjectURL(pdfBlob);
      if (previewPdfUrlRef.current) window.URL.revokeObjectURL(previewPdfUrlRef.current);
      previewPdfUrlRef.current = nextUrl;
      setPreviewPdfUrl(nextUrl);
      setPreviewStatus(quality === "premium" ? "Premium preview ready" : "Preview ready");
    } catch (error) {
      if (previewRequestRef.current !== requestId) return;
      setPreviewError(error.message);
      setPreviewStatus("Preview unavailable");
    }
  }, [documentState, quality, report]);

  useEffect(() => {
    if (!report || !documentState) return;
    setPreviewStatus("Updating preview...");
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [documentState, quality, report, refreshPreview]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (canSave && !isSaving) void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canSave, isSaving, documentState]);

  const syncPageSetup = (nextPageSize, nextMarginPreset, nextPaperTone) => {
    updateDocument((draft) => {
      draft.meta = draft.meta || {};
      draft.meta.page_setup = draft.meta.page_setup || {};
      const pageSizeItem = PAGE_SIZE_OPTIONS.find((item) => item.value === nextPageSize) || PAGE_SIZE_OPTIONS[0];
      const marginItem = MARGIN_OPTIONS.find((item) => item.value === nextMarginPreset) || MARGIN_OPTIONS[1];
      const background = nextPaperTone === "warm" ? "#f7f3ec" : nextPaperTone === "cool" ? "#f3f7fb" : "#ffffff";
      draft.meta.page_setup.size = pageSizeItem.exportSize;
      draft.meta.page_setup.background = background;
      draft.meta.page_setup.margins = { top: marginItem.px, right: marginItem.px, bottom: marginItem.px, left: marginItem.px };
    });
  };

  const updateCoverField = (field, value) => {
    updateDocument((draft) => {
      draft.meta = draft.meta || {};
      draft.meta.cover = draft.meta.cover || {};
      draft.meta.cover[field] = value;
      if (field === "title") draft.meta.report_name = value || draft.meta.report_name;
    });
  };

  const updateSectionTitle = (sectionId, title) => {
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === sectionId);
      if (section) section.title = title;
    });
  };

  const addSection = () => {
    updateDocument((draft) => {
      const section = {
        section_id: newId("section"),
        title: `Section ${draft.sections.length + 1}`,
        order: draft.sections.length,
        blocks: [],
      };
      draft.sections.push(section);
      setActiveSectionId(section.section_id);
      setActiveBlockId("");
    });
  };

  const updateBlock = (sectionId, blockId, nextBlock) => {
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === sectionId);
      if (!section) return;
      section.blocks = (section.blocks || []).map((block) => (block.block_id === blockId ? nextBlock : block));
      section.blocks.forEach((block, index) => {
        block.order = index;
      });
    });
  };

  const deleteBlock = (sectionId, blockId) => {
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === sectionId);
      if (!section) return;
      section.blocks = (section.blocks || []).filter((block) => block.block_id !== blockId);
      section.blocks.forEach((block, index) => {
        block.order = index;
      });
      setActiveBlockId("");
    });
  };

  const insertBlock = (toolKey) => {
    const targetSectionId = activeSectionId || sections[0]?.section_id;
    if (!targetSectionId) return;
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === targetSectionId);
      if (!section) return;
      const blocks = Array.isArray(section.blocks) ? section.blocks : [];
      const block = createBlockForTool(toolKey, blocks.length);
      section.blocks = [...blocks, block];
      setActiveSectionId(section.section_id);
      setActiveBlockId(block.block_id);
    });
  };

  const handleSave = async () => {
    if (!report || !documentState) return "";
    setIsSaving(true);
    try {
      const payload = await saveReportDraft(report.report_id, documentState);
      if (payload?.report) setReport(payload.report);
      if (payload?.version?.version_id) setActiveVersionId(payload.version.version_id);
      initialSnapshotRef.current = JSON.stringify(documentState);
      setHasUnsavedChanges(false);
      toast.success(payload?.deduplicated ? "No content changes to save." : "Draft saved.");
      return payload?.version?.version_id || activeVersionId || "";
    } catch (error) {
      toast.error(error.message);
      return "";
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!report || !documentState) return;
    setIsExporting(true);
    try {
      let versionId = activeVersionId;
      if (hasUnsavedChanges) {
        versionId = await handleSave();
        if (!versionId) throw new Error("Save failed, so the PDF was not exported. Fix the draft save issue and try again.");
      }
      await exportReport(report.report_id, "pdf", documentState.meta?.report_name || report.report_name, {
        reportType: report.report_type,
        templateId: documentState.meta?.template_id || report.template_id,
        quality,
        versionId: versionId || activeVersionId || "",
      });
      toast.success("PDF downloaded.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !documentState) {
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
        <ReportEditToolbar
          title={documentState?.meta?.report_name || report?.report_name || "Untitled Report"}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          canSave={canSave}
          isExporting={isExporting}
          zoom={zoom}
          onZoomOut={() => setZoom((current) => Math.max(70, current - 5))}
          onZoomIn={() => setZoom((current) => Math.min(140, current + 5))}
          onBack={() => navigate("/reports")}
          onSave={handleSave}
          onExport={handleExport}
          previewStatus={previewStatus}
          onRefreshPreview={() => void refreshPreview()}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
            syncPageSetup(value, marginPreset, paperTone);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          marginPreset={marginPreset}
          onMarginPresetChange={(value) => {
            setMarginPreset(value);
            syncPageSetup(pageSize, value, paperTone);
          }}
          marginOptions={MARGIN_OPTIONS}
          paperTone={paperTone}
          onPaperToneChange={(value) => {
            setPaperTone(value);
            syncPageSetup(pageSize, marginPreset, value);
          }}
          quality={quality}
          onQualityChange={setQuality}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ReportEditSidebar
            toolItems={TOOL_ITEMS}
            activeSectionId={activeSection?.section_id || ""}
            activeBlockId={activeBlockId}
            onInsertBlock={insertBlock}
            sections={sections}
            onSelectSection={(sectionId) => {
              setActiveSectionId(sectionId);
              setActiveBlockId("");
            }}
            onSelectBlock={(sectionId, blockId) => {
              setActiveSectionId(sectionId);
              setActiveBlockId(blockId);
            }}
            onAddSection={addSection}
          />
          <ReportPreviewPane
            pdfUrl={previewPdfUrl}
            status={previewStatus}
            error={previewError}
            zoom={zoom}
            onRefresh={() => void refreshPreview()}
          />
          <ReportInspector
            cover={documentState?.meta?.cover || {}}
            activeSection={activeSection}
            activeBlock={activeBlock}
            onUpdateCoverField={updateCoverField}
            onUpdateSectionTitle={updateSectionTitle}
            onUpdateBlock={updateBlock}
            onDeleteBlock={deleteBlock}
          />
        </div>
      </div>
    </section>
  );
}
