import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Layers3,
  Loader2,
  Maximize2,
  Minus,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";

import {
  exportReport,
  getReportEditor,
  listReportTemplates,
  renderReportDraftPdfPreview,
  saveReportDraft,
} from "../services/platformService";

const PAGE_SIZE_OPTIONS = [
  { value: "A4", label: "A4" },
  { value: "LETTER", label: "Letter" },
];

const MARGIN_OPTIONS = [
  { value: "compact", label: "Compact", px: 34 },
  { value: "balanced", label: "Balanced", px: 48 },
  { value: "spacious", label: "Spacious", px: 66 },
];

const PAPER_OPTIONS = [
  { value: "#ffffff", label: "White" },
  { value: "#f7f3ec", label: "Warm" },
  { value: "#f3f7fb", label: "Mist" },
  { value: "#fbfbf8", label: "Ivory" },
];

const FONT_OPTIONS = ["Source Serif 4", "Georgia", "Merriweather", "Lora", "IBM Plex Sans", "Inter"];

const DESIGN_PALETTES = [
  {
    key: "boardroom",
    label: "Boardroom",
    swatches: ["#0f172a", "#334155", "#0ea5e9"],
    tokens: {
      primary_color: "#0f172a",
      secondary_color: "#334155",
      accent_color: "#0ea5e9",
      text_color: "#0f172a",
      page_border: "#dbe3ee",
    },
  },
  {
    key: "venture",
    label: "Venture",
    swatches: ["#0f766e", "#134e4a", "#22d3ee"],
    tokens: {
      primary_color: "#0f766e",
      secondary_color: "#134e4a",
      accent_color: "#22d3ee",
      text_color: "#10201f",
      page_border: "#b7ddd6",
    },
  },
  {
    key: "capital",
    label: "Capital",
    swatches: ["#1d4ed8", "#1f2937", "#f97316"],
    tokens: {
      primary_color: "#1d4ed8",
      secondary_color: "#1f2937",
      accent_color: "#f97316",
      text_color: "#111827",
      page_border: "#c9d7f4",
    },
  },
  {
    key: "ledger",
    label: "Ledger",
    swatches: ["#334155", "#475569", "#f59e0b"],
    tokens: {
      primary_color: "#334155",
      secondary_color: "#475569",
      accent_color: "#f59e0b",
      text_color: "#1f2937",
      page_border: "#d8d3c5",
    },
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeDocument(documentJson, report) {
  const base = documentJson && typeof documentJson === "object" ? clone(documentJson) : {};
  if (!base.meta || typeof base.meta !== "object") base.meta = {};
  if (!Array.isArray(base.sections)) base.sections = [];

  base.meta.report_name = safeText(base.meta.report_name, report?.report_name || "Business Insight Report");
  base.meta.report_type = safeText(base.meta.report_type, report?.report_type || "business_report");
  base.meta.template_id = safeText(base.meta.template_id, report?.template_id || "obsidian_board");
  base.meta.theme_tokens = base.meta.theme_tokens && typeof base.meta.theme_tokens === "object" ? base.meta.theme_tokens : {};
  base.meta.page_setup = base.meta.page_setup && typeof base.meta.page_setup === "object" ? base.meta.page_setup : {};
  base.meta.page_setup.size = safeText(base.meta.page_setup.size, "A4").toUpperCase();
  base.meta.page_setup.background = safeText(base.meta.page_setup.background, "#ffffff");
  base.meta.page_setup.font_family = safeText(base.meta.page_setup.font_family, "Georgia");
  base.meta.page_setup.font_scale = Number.isFinite(Number(base.meta.page_setup.font_scale))
    ? Number(base.meta.page_setup.font_scale)
    : 100;
  base.meta.page_setup.margins =
    base.meta.page_setup.margins && typeof base.meta.page_setup.margins === "object"
      ? base.meta.page_setup.margins
      : { top: 48, right: 48, bottom: 48, left: 48 };
  base.meta.page_setup.header = safeText(base.meta.page_setup.header, "");
  base.meta.page_setup.footer = safeText(base.meta.page_setup.footer, "");

  base.meta.cover = base.meta.cover && typeof base.meta.cover === "object" ? base.meta.cover : {};
  base.meta.cover.prepared_by = safeText(base.meta.cover.prepared_by, "PetraAI");

  return base;
}

function inferMarginPreset(margins = {}) {
  const left = Number(margins.left || 48);
  if (left <= 38) return "compact";
  if (left >= 60) return "spacious";
  return "balanced";
}

function inferPalette(tokens = {}) {
  const primary = String(tokens.primary_color || "").toLowerCase();
  const accent = String(tokens.accent_color || "").toLowerCase();
  return (
    DESIGN_PALETTES.find(
      (palette) =>
        palette.tokens.primary_color.toLowerCase() === primary &&
        palette.tokens.accent_color.toLowerCase() === accent
    )?.key || "boardroom"
  );
}

function matchingTemplateName(templates, templateId) {
  return templates.find((item) => item.template_id === templateId)?.name || "Template";
}

function ControlBlock({ icon: Icon, title, children }) {
  return (
    <section className="border-b border-white/10 px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-slate-100">
        {Icon ? <Icon size={15} className="text-cyan-300" /> : null}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-white/10 bg-[#121821] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400";

function SegmentControl({ value, options, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-md border border-white/10 bg-[#111720] p-1">
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`h-8 rounded px-2 text-xs font-semibold transition ${
            value === item.value ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8 hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function PaperSwatches({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PAPER_OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-md border p-1 text-left transition ${
            value === item.value ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-[#111720] hover:border-white/30"
          }`}
          title={item.label}
        >
          <span className="block h-8 rounded border border-black/10" style={{ background: item.value }} />
          <span className="mt-1 block truncate text-center text-[10px] font-semibold text-slate-300">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function PalettePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {DESIGN_PALETTES.map((palette) => (
        <button
          key={palette.key}
          type="button"
          onClick={() => onChange(palette.key)}
          className={`rounded-md border p-2 text-left transition ${
            value === palette.key ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-[#111720] hover:border-white/30"
          }`}
        >
          <span className="flex gap-1">
            {palette.swatches.map((color) => (
              <span key={color} className="h-5 flex-1 rounded" style={{ background: color }} />
            ))}
          </span>
          <span className="mt-2 block text-xs font-semibold text-slate-100">{palette.label}</span>
        </button>
      ))}
    </div>
  );
}

function PreviewPane({ pdfUrl, status, error, zoom, onRefresh }) {
  const scale = zoom / 100;
  return (
    <main className="relative min-w-0 flex-1 overflow-hidden bg-[#15181d]">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-black/20 bg-[#15181d]/95 px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-300">
          <CheckCircle2 size={14} className={error ? "text-rose-300" : "text-emerald-300"} />
          <span className="truncate">{status}</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-cyan-300/70 hover:text-white"
          title="Refresh preview"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="h-full overflow-auto px-4 pb-8 pt-14">
        <div className="mx-auto" style={{ width: `${Math.max(740, 980 * scale)}px` }}>
          <div
            className="overflow-hidden border border-white/10 bg-[#20252c] shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
            style={{ height: "calc(100dvh - 92px)" }}
          >
            {error ? (
              <div className="flex h-full items-center justify-center bg-[#11151b] p-6 text-center">
                <div className="max-w-md">
                  <p className="text-sm font-semibold text-rose-200">Preview unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{error}</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                title="Report preview"
                src={pdfUrl}
                className="h-full w-full border-0 bg-[#20252c]"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  width: `${100 / scale}%`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#11151b] text-sm text-slate-300">
                <Loader2 size={16} className="mr-2 animate-spin" />
                Preparing preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ReportEditPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [documentState, setDocumentState] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewStatus, setPreviewStatus] = useState("Preview not ready");
  const [previewError, setPreviewError] = useState("");
  const [quality, setQuality] = useState("standard");
  const [zoom, setZoom] = useState(96);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialSnapshotRef = useRef("");
  const previewRequestRef = useRef(0);
  const previewPdfUrlRef = useRef("");

  const meta = documentState?.meta || {};
  const pageSetup = meta.page_setup || {};
  const themeTokens = meta.theme_tokens || {};
  const marginPreset = inferMarginPreset(pageSetup.margins);
  const paletteKey = inferPalette(themeTokens);
  const sectionsCount = Array.isArray(documentState?.sections) ? documentState.sections.length : 0;
  const blocksCount = useMemo(() => {
    if (!Array.isArray(documentState?.sections)) return 0;
    return documentState.sections.reduce((total, section) => total + (Array.isArray(section.blocks) ? section.blocks.length : 0), 0);
  }, [documentState]);

  const updateDocument = useCallback((updater) => {
    setDocumentState((current) => {
      if (!current) return current;
      const draft = clone(current);
      updater(draft);
      return draft;
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [editorPayload, templateData] = await Promise.all([getReportEditor(reportId), listReportTemplates()]);
        const reportPayload = editorPayload?.report || null;
        const normalized = normalizeDocument(editorPayload?.document_json || {}, reportPayload);
        setReport(reportPayload);
        setTemplates(Array.isArray(templateData) ? templateData : []);
        setDocumentState(normalized);
        setActiveVersionId(editorPayload?.active_version_id || reportPayload?.latest_draft_version_id || reportPayload?.published_version_id || "");
        const matchedTemplate = (templateData || []).find((item) => item.template_id === normalized.meta?.template_id);
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

  const refreshPreview = useCallback(async () => {
    if (!report || !documentState) return;
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewStatus("Rendering preview...");
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
      setPreviewStatus("Preview ready");
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
    }, 700);
    return () => window.clearTimeout(timer);
  }, [documentState, quality, report, refreshPreview]);

  const setTemplate = (templateId) => {
    const selected = templates.find((item) => item.template_id === templateId);
    updateDocument((draft) => {
      draft.meta.template_id = templateId;
      if (!draft.meta.theme_tokens || typeof draft.meta.theme_tokens !== "object") draft.meta.theme_tokens = {};
      if (selected?.theme_tokens && typeof selected.theme_tokens === "object") {
        draft.meta.theme_tokens = { ...selected.theme_tokens, ...draft.meta.theme_tokens };
      }
    });
  };

  const setPageSize = (size) => {
    updateDocument((draft) => {
      draft.meta.page_setup.size = size;
    });
  };

  const setMargins = (preset) => {
    const option = MARGIN_OPTIONS.find((item) => item.value === preset) || MARGIN_OPTIONS[1];
    updateDocument((draft) => {
      draft.meta.page_setup.margins = { top: option.px, right: option.px, bottom: option.px, left: option.px };
    });
  };

  const setPaper = (color) => {
    updateDocument((draft) => {
      draft.meta.page_setup.background = color;
    });
  };

  const setPalette = (key) => {
    const palette = DESIGN_PALETTES.find((item) => item.key === key) || DESIGN_PALETTES[0];
    updateDocument((draft) => {
      draft.meta.theme_tokens = {
        ...(draft.meta.theme_tokens || {}),
        ...palette.tokens,
      };
    });
  };

  const setFontFamily = (fontFamily) => {
    updateDocument((draft) => {
      draft.meta.page_setup.font_family = fontFamily;
    });
  };

  const setFontScale = (value) => {
    updateDocument((draft) => {
      draft.meta.page_setup.font_scale = Number(value);
    });
  };

  const setPreparedBy = (value) => {
    updateDocument((draft) => {
      draft.meta.cover = draft.meta.cover || {};
      draft.meta.cover.prepared_by = value;
    });
  };

  const setHeaderFooter = (field, value) => {
    updateDocument((draft) => {
      draft.meta.page_setup[field] = value;
    });
  };

  const handleSave = useCallback(async () => {
    if (!report || !documentState) return "";
    setIsSaving(true);
    try {
      const payload = await saveReportDraft(report.report_id, documentState);
      if (payload?.report) setReport(payload.report);
      if (payload?.version?.version_id) setActiveVersionId(payload.version.version_id);
      initialSnapshotRef.current = JSON.stringify(documentState);
      setHasUnsavedChanges(false);
      toast.success(payload?.deduplicated ? "Design already saved." : "Design saved.");
      return payload?.version?.version_id || activeVersionId || "";
    } catch (error) {
      toast.error(error.message);
      return "";
    } finally {
      setIsSaving(false);
    }
  }, [activeVersionId, documentState, report]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (!isSaving) void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, isSaving]);

  const handleExport = async () => {
    if (!report || !documentState) return;
    setIsExporting(true);
    try {
      let versionId = activeVersionId;
      if (hasUnsavedChanges) {
        versionId = await handleSave();
        if (!versionId) throw new Error("Save failed, so the PDF was not exported.");
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
      <section className="flex min-h-[100dvh] items-center justify-center bg-[#111418] text-slate-200">
        <p className="inline-flex items-center gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading report studio...
        </p>
      </section>
    );
  }

  return (
    <section className="min-h-[100dvh] bg-[#111418] text-slate-100">
      <div className="flex h-[100dvh] min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0f1318] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:border-cyan-300/70 hover:text-white"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{meta.report_name || report?.report_name || "Business Insight Report"}</h1>
              <p className="text-xs text-slate-400">
                {hasUnsavedChanges ? "Unsaved design changes" : "Design saved"} · {matchingTemplateName(templates, meta.template_id)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border border-white/10 bg-[#151a21] p-1 sm:flex">
              <button
                type="button"
                onClick={() => setZoom((current) => Math.max(70, current - 5))}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-300 transition hover:bg-white/8 hover:text-white"
                title="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="min-w-11 text-center text-xs font-semibold">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((current) => Math.min(135, current + 5))}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-300 transition hover:bg-white/8 hover:text-white"
                title="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-xs font-semibold text-slate-100 transition hover:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan-300 px-3 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)_280px]">
          <aside className="min-h-0 overflow-y-auto border-r border-white/10 bg-[#0f1318]">
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
                  <Palette size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Report Studio</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">Presentation controls only. Analysis content stays locked.</p>
                </div>
              </div>
            </div>

            <ControlBlock icon={Layers3} title="Template">
              <select value={meta.template_id || ""} onChange={(event) => setTemplate(event.target.value)} className={inputClass}>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </ControlBlock>

            <ControlBlock icon={FileText} title="Page">
              <div className="space-y-4">
                <Field label="Size">
                  <SegmentControl value={String(pageSetup.size || "A4").toUpperCase()} options={PAGE_SIZE_OPTIONS} onChange={setPageSize} />
                </Field>
                <Field label="Margins">
                  <SegmentControl value={marginPreset} options={MARGIN_OPTIONS} onChange={setMargins} />
                </Field>
                <Field label="Paper">
                  <PaperSwatches value={pageSetup.background || "#ffffff"} onChange={setPaper} />
                </Field>
              </div>
            </ControlBlock>

            <ControlBlock icon={Palette} title="Color">
              <PalettePicker value={paletteKey} onChange={setPalette} />
            </ControlBlock>

            <ControlBlock icon={Type} title="Typography">
              <div className="space-y-4">
                <Field label="Font">
                  <select value={pageSetup.font_family || "Georgia"} onChange={(event) => setFontFamily(event.target.value)} className={inputClass}>
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Scale">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="90"
                      max="120"
                      step="5"
                      value={Number(pageSetup.font_scale || 100)}
                      onChange={(event) => setFontScale(event.target.value)}
                      className="w-full accent-cyan-300"
                    />
                    <span className="w-11 text-right text-xs font-semibold text-slate-300">{Number(pageSetup.font_scale || 100)}%</span>
                  </div>
                </Field>
              </div>
            </ControlBlock>

            <ControlBlock icon={Maximize2} title="Chrome">
              <div className="space-y-3">
                <Field label="Prepared by">
                  <input value={meta.cover?.prepared_by || ""} onChange={(event) => setPreparedBy(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Header">
                  <input value={pageSetup.header || ""} onChange={(event) => setHeaderFooter("header", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Footer">
                  <input value={pageSetup.footer || ""} onChange={(event) => setHeaderFooter("footer", event.target.value)} className={inputClass} />
                </Field>
              </div>
            </ControlBlock>
          </aside>

          <PreviewPane
            pdfUrl={previewPdfUrl}
            status={previewStatus}
            error={previewError}
            zoom={zoom}
            onRefresh={() => void refreshPreview()}
          />

          <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 bg-[#0f1318] lg:block">
            <section className="border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300" />
                <p className="text-sm font-semibold">Locked Outcome</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-white/10 bg-[#151a21] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Sections</p>
                  <p className="mt-1 text-lg font-semibold">{sectionsCount}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-[#151a21] p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Blocks</p>
                  <p className="mt-1 text-lg font-semibold">{blocksCount}</p>
                </div>
              </div>
            </section>

            <section className="border-b border-white/10 px-5 py-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Export</p>
              <div className="grid grid-cols-2 gap-2">
                {["standard", "premium"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuality(item)}
                    className={`rounded-md border px-3 py-2 text-xs font-semibold capitalize transition ${
                      quality === item ? "border-cyan-300 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-[#151a21] text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>

            <section className="px-5 py-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Report Map</p>
              <div className="space-y-2">
                {(documentState.sections || []).slice(0, 10).map((section, index) => (
                  <div key={section.section_id || section.title || index} className="rounded-md border border-white/10 bg-[#151a21] px-3 py-2">
                    <p className="truncate text-xs font-semibold text-slate-200">{section.title || `Section ${index + 1}`}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{Array.isArray(section.blocks) ? section.blocks.length : 0} blocks</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
