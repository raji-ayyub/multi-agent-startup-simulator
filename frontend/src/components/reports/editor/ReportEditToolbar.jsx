import {
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Save,
} from "lucide-react";

export default function ReportEditToolbar({
  title,
  hasUnsavedChanges,
  isSaving,
  canSave,
  isExporting,
  zoom,
  onZoomOut,
  onZoomIn,
  onBack,
  onSave,
  onExport,
  viewMode,
  onViewModeChange,
  previewStatus,
  onRefreshPreview,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  marginPreset,
  onMarginPresetChange,
  marginOptions,
  paperTone,
  onPaperToneChange,
  quality,
  onQualityChange,
  pageCount,
}) {
  return (
    <header className="border-b border-slate-800 bg-[#0f141c] px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {title || "Untitled Report"}
              {hasUnsavedChanges ? <span className="ml-1 text-amber-400">*</span> : null}
            </p>
            <p className="text-[11px] text-slate-400">
              {isSaving ? "Saving..." : hasUnsavedChanges ? "Unsaved changes" : "Ready"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-1 py-1">
          <button
            type="button"
            onClick={onZoomOut}
            className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Minus size={13} />
          </button>
          <span className="min-w-11 text-center text-xs font-semibold">{zoom}%</span>
          <button
            type="button"
            onClick={onZoomIn}
            className="rounded px-1.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-slate-700 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("edit")}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition ${
                viewMode === "edit" ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Pencil size={13} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("preview")}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition ${
                viewMode === "preview" ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Eye size={13} />
              Preview
            </button>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1 rounded-md bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-xs">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
        >
          {pageSizeOptions.map((item) => (
            <option key={item.value} value={item.value}>
              Page: {item.label}
            </option>
          ))}
        </select>
        <select
          value={marginPreset}
          onChange={(e) => onMarginPresetChange(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
        >
          {marginOptions.map((item) => (
            <option key={item.value} value={item.value}>
              Margin: {item.label}
            </option>
          ))}
        </select>
        <select
          value={paperTone}
          onChange={(e) => onPaperToneChange(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
        >
          <option value="white">Paper: White</option>
          <option value="warm">Paper: Warm</option>
          <option value="cool">Paper: Cool</option>
        </select>
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
        >
          <option value="standard">PDF: Standard</option>
          <option value="premium">PDF: Premium</option>
        </select>
        <button
          type="button"
          onClick={onRefreshPreview}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Refresh preview
        </button>
        <span className="ml-auto text-slate-500">
          {viewMode === "preview" ? previewStatus : `${pageCount} page${pageCount !== 1 ? "s" : ""}`}
        </span>
      </div>
    </header>
  );
}
