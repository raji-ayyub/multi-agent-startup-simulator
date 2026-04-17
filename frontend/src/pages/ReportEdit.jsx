import { useEffect, useMemo, useRef, useState } from "react";
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

import ReportEditCanvas from "../components/reports/editor/ReportEditCanvas";
import ReportEditSidebar from "../components/reports/editor/ReportEditSidebar";
import ReportEditToolbar from "../components/reports/editor/ReportEditToolbar";
import {
  exportReport,
  getReportEditor,
  listReportTemplates,
  saveReportDraft,
} from "../services/platformService";

const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4", width: 794, minHeight: 1123, exportSize: "A4" },
  { value: "letter", label: "Letter", width: 816, minHeight: 1056, exportSize: "LETTER" },
];

const MARGIN_OPTIONS = [
  { value: "narrow", label: "Narrow", px: 36 },
  { value: "normal", label: "Normal", px: 52 },
  { value: "wide", label: "Wide", px: 68 },
];

const TOOL_ITEMS = [
  { key: "heading", label: "Heading", icon: TextCursorInput },
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

function toDocText(value = "") {
  const blocks = String(value || "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: blocks.length
      ? blocks.map((line) => ({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        }))
      : [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
  };
}

function readDocText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.text === "string") return data.text;
  const content = Array.isArray(data.content) ? data.content : [];
  const paragraphs = content
    .map((paragraph) => {
      const nodes = Array.isArray(paragraph?.content) ? paragraph.content : [];
      return nodes
        .map((node) => (typeof node?.text === "string" ? node.text : ""))
        .join("")
        .trim();
    })
    .filter(Boolean);
  return paragraphs.join("\n\n");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function newId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function normalizeDocument(documentJson, report) {
  const base = documentJson && typeof documentJson === "object" ? clone(documentJson) : {};
  if (!base.meta || typeof base.meta !== "object") base.meta = {};
  if (!Array.isArray(base.sections)) base.sections = [];

  base.meta.report_name = safeText(base.meta.report_name, report?.report_name || "Business Insight Report");
  base.meta.report_type = safeText(base.meta.report_type, report?.report_type || "business_report");
  base.meta.template_id = safeText(base.meta.template_id, report?.template_id || "obsidian_board");

  if (!base.meta.page_setup || typeof base.meta.page_setup !== "object") {
    base.meta.page_setup = {};
  }
  if (!base.meta.page_setup.margins || typeof base.meta.page_setup.margins !== "object") {
    base.meta.page_setup.margins = { top: 52, right: 52, bottom: 52, left: 52 };
  }
  base.meta.page_setup.size = safeText(base.meta.page_setup.size, "A4");
  base.meta.page_setup.background = safeText(base.meta.page_setup.background, "#ffffff");
  if (!base.meta.cover || typeof base.meta.cover !== "object") {
    base.meta.cover = {};
  }
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
    .map((section, sectionIndex) => {
      const blocks = Array.isArray(section.blocks) ? section.blocks : [];
      return {
        section_id: safeText(section.section_id, newId("section")),
        title: safeText(section.title, `Section ${sectionIndex + 1}`),
        order: Number.isFinite(Number(section.order)) ? Number(section.order) : sectionIndex,
        blocks: blocks
          .filter((block) => block && typeof block === "object")
          .map((block, blockIndex) => ({
            block_id: safeText(block.block_id, newId("block")),
            type: safeText(block.type, "rich_text"),
            order: Number.isFinite(Number(block.order)) ? Number(block.order) : blockIndex,
            layout: block.layout && typeof block.layout === "object" ? block.layout : { span: 12, align: "left", flow: "full-width" },
            data: block.data && typeof block.data === "object" ? block.data : {},
          })),
      };
    })
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

function estimateBlockHeight(block) {
  const type = String(block?.type || "rich_text").toLowerCase();
  if (type === "divider") return 32;
  if (type === "chart") return 360;
  if (type === "metric_grid") return 280;
  if (type === "table") {
    const rows = Array.isArray(block?.data?.rows) ? block.data.rows.length : 3;
    return 160 + Math.max(3, rows) * 36;
  }
  if (type === "card") {
    const items = Array.isArray(block?.data?.items) ? block.data.items.length : 2;
    return 110 + Math.max(2, items) * 28;
  }
  const text = readDocText(block?.data);
  const characters = text.length || 120;
  const lineEstimate = Math.ceil(characters / 92);
  return Math.max(140, 76 + lineEstimate * 28);
}

function composePages(sections, pageSpec, marginPx, includeCoverPage = true) {
  const availableHeight = Math.max(520, pageSpec.minHeight - marginPx * 2 - 28);
  const leadingPages = includeCoverPage
    ? [{ pageIndex: 0, items: [{ kind: "cover", itemKey: "cover-page" }], usedHeight: availableHeight }]
    : [];
  const flowItems = [];
  for (const section of sections) {
    flowItems.push({
      kind: "section",
      itemKey: `${section.section_id}-heading`,
      section_id: section.section_id,
      title: section.title,
      estimatedHeight: 74,
    });
    const blocks = Array.isArray(section.blocks) ? [...section.blocks].sort((a, b) => a.order - b.order) : [];
    for (const block of blocks) {
      flowItems.push({
        kind: "block",
        itemKey: `${section.section_id}-${block.block_id}`,
        section_id: section.section_id,
        block,
        estimatedHeight: estimateBlockHeight(block),
      });
    }
  }

  const pages = [];
  let currentPage = { pageIndex: 0, items: [], usedHeight: 0 };

  for (const item of flowItems) {
    const nextHeight = currentPage.usedHeight + item.estimatedHeight;
    if (nextHeight > availableHeight && currentPage.items.length > 0) {
      pages.push({ ...currentPage });
      currentPage = { pageIndex: pages.length, items: [], usedHeight: 0 };
    }
    currentPage.items.push(item);
    currentPage.usedHeight += item.estimatedHeight;
  }

  if (currentPage.items.length > 0) {
    pages.push(currentPage);
  }
  if (pages.length === 0) {
    pages.push({ pageIndex: 0, items: [], usedHeight: 0 });
  }
  const contentPages = pages.map((page, index) => ({
    ...page,
    pageIndex: index + leadingPages.length,
  }));
  return [...leadingPages, ...contentPages];
}

function createBlockForTool(toolKey, order) {
  if (toolKey === "divider") {
    return {
      block_id: newId("block"),
      type: "divider",
      order,
      layout: { span: 12, align: "left", flow: "full-width" },
      data: {},
    };
  }
  if (toolKey === "chart") {
    return {
      block_id: newId("block"),
      type: "chart",
      order,
      layout: { span: 12, align: "left", flow: "full-width" },
      data: {
        title: "New Chart",
        chart_type: "bar",
        labels: ["Signal A", "Signal B", "Signal C"],
        series: [{ name: "Score", values: [55, 72, 64] }],
        legend: true,
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
      layout: { span: 12, align: "left", flow: "full-width" },
      data: {
        title: "Metrics",
        metrics: [
          { label: "North Star", value: "0", delta: "+0%" },
          { label: "Risk Index", value: "0.00", delta: "stable" },
          { label: "Momentum", value: "0", delta: "+0" },
        ],
      },
    };
  }
  const starter = toolKey === "bullet" ? "- Bullet point one\n- Bullet point two" : "New heading";
  return {
    block_id: newId("block"),
    type: "rich_text",
    order,
    layout: { span: 12, align: "left", flow: "full-width" },
    data: toDocText(starter),
  };
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
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeVersionId, setActiveVersionId] = useState("");
  const [quality, setQuality] = useState("standard");
  const [pageSize, setPageSize] = useState("a4");
  const [marginPreset, setMarginPreset] = useState("normal");
  const [paperTone, setPaperTone] = useState("white");

  const initialSnapshotRef = useRef("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const paperRefs = useRef({});
  const scrollContainerRef = useRef(null);

  const pageSpec = PAGE_SIZE_OPTIONS.find((item) => item.value === pageSize) || PAGE_SIZE_OPTIONS[0];
  const marginSpec = MARGIN_OPTIONS.find((item) => item.value === marginPreset) || MARGIN_OPTIONS[1];
  const sections = useMemo(() => {
    if (!documentState?.sections || !Array.isArray(documentState.sections)) return [];
    return [...documentState.sections].sort((a, b) => a.order - b.order);
  }, [documentState]);
  const pages = useMemo(
    () => composePages(sections, pageSpec, marginSpec.px, true),
    [sections, pageSpec, marginSpec.px]
  );
  const canSave = Boolean(report && documentState);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [editorPayload, templates] = await Promise.all([
          getReportEditor(reportId),
          listReportTemplates(),
        ]);
        const reportPayload = editorPayload?.report || null;
        const normalized = normalizeDocument(editorPayload?.document_json || {}, reportPayload);
        setReport(reportPayload);
        setDocumentState(normalized);
        setActiveSectionId(normalized.sections[0]?.section_id || "");
        setActivePageIndex(0);
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

        const matchedTemplate = (templates || []).find(
          (item) => item.template_id === reportPayload?.template_id
        );
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
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!top) return;
        const indexValue = Number.parseInt(top.target.dataset.pageIndex || "0", 10);
        if (Number.isFinite(indexValue)) setActivePageIndex(indexValue);
      },
      { root: container, threshold: 0.35 }
    );
    Object.values(paperRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [pages.length]);

  const updateDocument = (updater) => {
    setDocumentState((current) => {
      if (!current) return current;
      const draft = clone(current);
      updater(draft);
      return draft;
    });
  };

  const syncPageSetup = (nextPageSize, nextMarginPreset, nextPaperTone) => {
    updateDocument((draft) => {
      draft.meta = draft.meta || {};
      draft.meta.page_setup = draft.meta.page_setup || {};
      const pageSizeItem = PAGE_SIZE_OPTIONS.find((item) => item.value === nextPageSize) || PAGE_SIZE_OPTIONS[0];
      const marginItem = MARGIN_OPTIONS.find((item) => item.value === nextMarginPreset) || MARGIN_OPTIONS[1];
      const background =
        nextPaperTone === "warm" ? "#f7f3ec" : nextPaperTone === "cool" ? "#f3f7fb" : "#ffffff";

      draft.meta.page_setup.size = pageSizeItem.exportSize;
      draft.meta.page_setup.background = background;
      draft.meta.page_setup.margins = {
        top: marginItem.px,
        right: marginItem.px,
        bottom: marginItem.px,
        left: marginItem.px,
      };
    });
  };

  const updateSectionTitle = (sectionId, title) => {
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === sectionId);
      if (!section) return;
      section.title = title;
    });
  };

  const updateCoverField = (field, value) => {
    updateDocument((draft) => {
      draft.meta = draft.meta || {};
      draft.meta.cover = draft.meta.cover || {};
      draft.meta.cover[field] = value;
      if (field === "title") {
        draft.meta.report_name = value || draft.meta.report_name;
      }
    });
  };

  const addSection = () => {
    updateDocument((draft) => {
      const nextOrder = draft.sections.length;
      const section = {
        section_id: newId("section"),
        title: `Section ${nextOrder + 1}`,
        order: nextOrder,
        blocks: [
          {
            block_id: newId("block"),
            type: "rich_text",
            order: 0,
            layout: { span: 12, align: "left", flow: "full-width" },
            data: toDocText("Write section content..."),
          },
        ],
      };
      draft.sections.push(section);
      setActiveSectionId(section.section_id);
    });
  };

  const updateBlock = (sectionId, blockId, nextBlock) => {
    updateDocument((draft) => {
      const section = draft.sections.find((item) => item.section_id === sectionId);
      if (!section || !Array.isArray(section.blocks)) return;
      section.blocks = section.blocks.map((block) => (block.block_id === blockId ? nextBlock : block));
      section.blocks.forEach((block, index) => {
        block.order = index;
      });
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
    });
  };

  const handleSave = async () => {
    if (!report || !documentState) return "";
    setIsSaving(true);
    try {
      const payload = await saveReportDraft(report.report_id, documentState);
      if (payload?.report) {
        setReport(payload.report);
      }
      if (payload?.version?.version_id) {
        setActiveVersionId(payload.version.version_id);
      }
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

  const scrollToPage = (pageIndex) => {
    paperRefs.current[String(pageIndex)]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const paperBackground =
    paperTone === "warm" ? "#f7f3ec" : paperTone === "cool" ? "#f3f7fb" : "#ffffff";

  const sectionPageMap = useMemo(() => {
    const map = new Map();
    for (const page of pages) {
      for (const item of page.items) {
        if (item.kind !== "section" || !item.section_id) continue;
        if (!map.has(item.section_id)) {
          map.set(item.section_id, page.pageIndex);
        }
      }
    }
    return map;
  }, [pages]);

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
          pageCount={pages.length}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ReportEditSidebar
            toolItems={TOOL_ITEMS}
            activeSectionId={activeSectionId}
            onInsertBlock={insertBlock}
            sections={sections}
            onSelectSection={(sectionId) => {
              setActiveSectionId(sectionId);
              const pageIndex = sectionPageMap.get(sectionId);
              if (Number.isFinite(pageIndex)) {
                scrollToPage(pageIndex);
              }
            }}
            onAddSection={addSection}
            pages={pages}
            activePageIndex={activePageIndex}
            onScrollToPage={scrollToPage}
          />

          <ReportEditCanvas
            scrollContainerRef={scrollContainerRef}
            paperRefs={paperRefs}
            pages={pages}
            pageSpec={pageSpec}
            marginSpec={marginSpec}
            paperBackground={paperBackground}
            zoom={zoom}
            activePageIndex={activePageIndex}
            activeSectionId={activeSectionId}
            cover={documentState?.meta?.cover || {}}
            onSetActivePage={setActivePageIndex}
            onSetActiveSection={setActiveSectionId}
            onUpdateCoverField={updateCoverField}
            onUpdateSectionTitle={updateSectionTitle}
            onUpdateBlock={updateBlock}
          />
        </div>
      </div>
    </section>
  );
}
