import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

function textToRichData(value) {
  const sections = String(value || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: sections.length
      ? sections.map((paragraph) => ({
          type: "paragraph",
          content: [{ type: "text", text: paragraph }],
        }))
      : [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
  };
}

function parseCsvStrings(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsvNumbers(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item));
}

function csvFromValues(values) {
  return (Array.isArray(values) ? values : []).map((value) => String(value ?? "")).join(", ");
}

function EditableText({
  value,
  className,
  placeholder = "",
  singleLine = false,
  onFocus,
  onCommit,
}) {
  const ref = useRef(null);
  const lastValueRef = useRef(String(value || ""));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const normalized = String(value || "");
    if (document.activeElement === element) return;
    if (lastValueRef.current === normalized && element.innerText === normalized) return;
    element.innerText = normalized;
    lastValueRef.current = normalized;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onFocus={onFocus}
      onBlur={(event) => {
        const nextValue = event.currentTarget.innerText || "";
        const normalized = singleLine ? nextValue.replace(/\s+/g, " ").trim() : nextValue;
        lastValueRef.current = normalized;
        onCommit(normalized);
      }}
      onKeyDown={(event) => {
        if (!singleLine) return;
        if (event.key === "Enter") {
          event.preventDefault();
        }
      }}
      data-placeholder={placeholder}
      className={`${className} ${placeholder ? "empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]" : ""}`}
      style={{ boxSizing: "border-box", overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
    />
  );
}

function chartRows(labels, series) {
  const safeLabels = Array.isArray(labels) ? labels : [];
  const safeSeries = Array.isArray(series) ? series.filter((item) => item && typeof item === "object") : [];
  const rowCount = Math.max(
    safeLabels.length,
    ...safeSeries.map((item) => (Array.isArray(item.values) ? item.values.length : 0)),
    0
  );
  return Array.from({ length: rowCount }).map((_, index) => {
    const row = { label: safeLabels[index] || `Item ${index + 1}` };
    for (const item of safeSeries) {
      const key = String(item.name || "Series");
      const values = Array.isArray(item.values) ? item.values : [];
      const numeric = Number.parseFloat(values[index]);
      row[key] = Number.isFinite(numeric) ? numeric : 0;
    }
    return row;
  });
}

function ChartBlockVisual({ data = {} }) {
  const chartType = String(data.chart_type || "bar").toLowerCase();
  const labels = Array.isArray(data.labels) ? data.labels : [];
  const series = Array.isArray(data.series) ? data.series : [];
  const colors = Array.isArray(data.colors) && data.colors.length ? data.colors : ["#0ea5e9", "#22c55e", "#f59e0b", "#f97316"];
  const rows = useMemo(() => chartRows(labels, series), [labels, series]);
  const firstSeries = series[0] && typeof series[0] === "object" ? series[0] : { name: "Series", values: [] };

  if ((!rows.length || !series.length) && data.image_source) {
    return (
      <img
        src={data.image_source}
        alt={String(data.title || "Chart")}
        className="w-full rounded-lg border border-slate-200 bg-white object-contain"
        style={{ maxHeight: 320 }}
      />
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No chart data available yet.
      </div>
    );
  }

  if (chartType === "line") {
    return (
      <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {series.map((item, index) => (
              <Line
                key={`${item.name}-${index}`}
                type="monotone"
                dataKey={String(item.name || `Series ${index + 1}`)}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === "area") {
    return (
      <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {series.map((item, index) => (
              <Area
                key={`${item.name}-${index}`}
                type="monotone"
                dataKey={String(item.name || `Series ${index + 1}`)}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.22}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === "pie") {
    const pieRows = rows.map((row, index) => ({
      label: row.label,
      value: Number.parseFloat(row[String(firstSeries.name || "Series")]) || 0,
      color: colors[index % colors.length],
    }));
    return (
      <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={pieRows} dataKey="value" nameKey="label" outerRadius={90} innerRadius={26}>
              {pieRows.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-lg border border-slate-200 bg-white p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 11 }} />
          <YAxis tick={{ fill: "#475569", fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {series.map((item, index) => (
            <Bar
              key={`${item.name}-${index}`}
              dataKey={String(item.name || `Series ${index + 1}`)}
              radius={[6, 6, 0, 0]}
              fill={colors[index % colors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEditorModal({ draft, onChange, onCancel, onSave }) {
  if (!draft) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0f141c] p-4 text-slate-100">
        <h3 className="text-base font-semibold">Edit Chart</h3>
        <p className="mt-1 text-xs text-slate-400">Update chart values and style, then apply to the page.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block text-slate-400">Title</span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-slate-400">Type</span>
            <select
              value={draft.chart_type}
              onChange={(event) => onChange({ ...draft, chart_type: event.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-500"
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
              <option value="pie">Pie</option>
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="mb-1 block text-slate-400">Labels (comma separated)</span>
            <input
              value={draft.labels_csv}
              onChange={(event) => onChange({ ...draft, labels_csv: event.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="mb-1 block text-slate-400">Values (comma separated)</span>
            <input
              value={draft.values_csv}
              onChange={(event) => onChange({ ...draft, values_csv: event.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-500"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-slate-400">Primary Color</span>
            <input
              type="color"
              value={draft.primary_color}
              onChange={(event) => onChange({ ...draft, primary_color: event.target.value })}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-1"
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-slate-400">Notes</span>
            <input
              value={draft.notes}
              onChange={(event) => onChange({ ...draft, notes: event.target.value })}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-500"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportBlock({
  item,
  onSetActiveSection,
  onUpdateBlock,
  onOpenChartEditor,
}) {
  const block = item.block;
  const blockType = String(block?.type || "rich_text").toLowerCase();
  const data = block?.data && typeof block.data === "object" ? block.data : {};

  if (blockType === "divider") {
    return <hr className="my-6 border-t border-slate-300" />;
  }

  if (blockType === "metric_grid") {
    const metrics = Array.isArray(data.metrics) ? data.metrics : [];
    return (
      <section className="my-4">
        <EditableText
          value={String(data.title || "Metrics")}
          onFocus={() => onSetActiveSection(item.section_id)}
          onCommit={(nextTitle) =>
            onUpdateBlock(item.section_id, block.block_id, {
              ...block,
              data: { ...data, title: nextTitle },
            })
          }
          singleLine
          className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500 outline-none"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric, index) => (
            <article key={`${block.block_id}-metric-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <EditableText
                value={String(metric.label || "")}
                onFocus={() => onSetActiveSection(item.section_id)}
                onCommit={(nextLabel) => {
                  const nextMetrics = metrics.map((current, metricIndex) =>
                    metricIndex === index ? { ...current, label: nextLabel } : current
                  );
                  onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, metrics: nextMetrics } });
                }}
                singleLine
                className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 outline-none"
              />
              <EditableText
                value={String(metric.value || "")}
                onFocus={() => onSetActiveSection(item.section_id)}
                onCommit={(nextValue) => {
                  const nextMetrics = metrics.map((current, metricIndex) =>
                    metricIndex === index ? { ...current, value: nextValue } : current
                  );
                  onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, metrics: nextMetrics } });
                }}
                singleLine
                className="mt-1 text-2xl font-bold text-slate-800 outline-none"
              />
              <EditableText
                value={String(metric.delta || metric.note || "")}
                onFocus={() => onSetActiveSection(item.section_id)}
                onCommit={(nextDelta) => {
                  const nextMetrics = metrics.map((current, metricIndex) =>
                    metricIndex === index ? { ...current, delta: nextDelta } : current
                  );
                  onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, metrics: nextMetrics } });
                }}
                singleLine
                className="mt-1 text-xs text-emerald-700 outline-none"
              />
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (blockType === "table") {
    const columns = Array.isArray(data.columns) ? data.columns : [];
    const rows = Array.isArray(data.rows) ? data.rows : [];
    return (
      <section className="my-4">
        <EditableText
          value={String(data.title || "Table")}
          onFocus={() => onSetActiveSection(item.section_id)}
          onCommit={(nextTitle) =>
            onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, title: nextTitle } })
          }
          singleLine
          className="mb-2 text-lg font-semibold text-slate-900 outline-none"
        />
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-100">
              <tr>
                {columns.map((column, index) => (
                  <th key={`${block.block_id}-column-${index}`} className="border border-slate-200 px-2 py-1.5 text-left align-top">
                    <EditableText
                      value={String(column || "")}
                      onFocus={() => onSetActiveSection(item.section_id)}
                      onCommit={(nextColumn) => {
                        const nextColumns = columns.map((current, colIndex) => (colIndex === index ? nextColumn : current));
                        onUpdateBlock(item.section_id, block.block_id, {
                          ...block,
                          data: { ...data, columns: nextColumns },
                        });
                      }}
                      singleLine
                      className="font-semibold text-slate-700 outline-none"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${block.block_id}-row-${rowIndex}`} className={rowIndex % 2 ? "bg-slate-50" : ""}>
                  {Array.isArray(row)
                    ? row.map((cell, cellIndex) => (
                        <td key={`${block.block_id}-cell-${rowIndex}-${cellIndex}`} className="border border-slate-200 px-2 py-1.5 align-top text-slate-700">
                          <EditableText
                            value={String(cell || "")}
                            onFocus={() => onSetActiveSection(item.section_id)}
                            onCommit={(nextCell) => {
                              const nextRows = rows.map((currentRow, currentRowIndex) => {
                                if (currentRowIndex !== rowIndex || !Array.isArray(currentRow)) return currentRow;
                                return currentRow.map((currentCell, currentCellIndex) =>
                                  currentCellIndex === cellIndex ? nextCell : currentCell
                                );
                              });
                              onUpdateBlock(item.section_id, block.block_id, {
                                ...block,
                                data: { ...data, rows: nextRows },
                              });
                            }}
                            className="outline-none"
                          />
                        </td>
                      ))
                    : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.note ? (
          <EditableText
            value={String(data.note || "")}
            onFocus={() => onSetActiveSection(item.section_id)}
            onCommit={(nextNote) =>
              onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, note: nextNote } })
            }
            className="mt-2 text-xs text-slate-500 outline-none"
          />
        ) : null}
      </section>
    );
  }

  if (blockType === "chart") {
    return (
      <section
        className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        onDoubleClick={() => onOpenChartEditor(item.section_id, block)}
      >
        <EditableText
          value={String(data.title || "Chart")}
          onFocus={() => onSetActiveSection(item.section_id)}
          onCommit={(nextTitle) =>
            onUpdateBlock(item.section_id, block.block_id, {
              ...block,
              data: { ...data, title: nextTitle },
            })
          }
          singleLine
          className="text-lg font-semibold text-slate-900 outline-none"
        />
        {data.notes ? (
          <EditableText
            value={String(data.notes || "")}
            onFocus={() => onSetActiveSection(item.section_id)}
            onCommit={(nextNotes) =>
              onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, notes: nextNotes } })
            }
            className="mt-1 text-sm text-slate-600 outline-none"
          />
        ) : null}
        <div className="mt-3">
          <ChartBlockVisual data={data} />
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-400">Double-click chart to edit</p>
      </section>
    );
  }

  if (blockType === "card") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <section className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <EditableText
          value={String(data.title || "Card")}
          onFocus={() => onSetActiveSection(item.section_id)}
          onCommit={(nextTitle) =>
            onUpdateBlock(item.section_id, block.block_id, {
              ...block,
              data: { ...data, title: nextTitle },
            })
          }
          singleLine
          className="text-lg font-semibold text-slate-900 outline-none"
        />
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-800">
          {items.map((entry, index) => (
            <li key={`${block.block_id}-item-${index}`}>
              <EditableText
                value={String(entry || "")}
                onFocus={() => onSetActiveSection(item.section_id)}
                onCommit={(nextItem) => {
                  const nextItems = items.map((current, itemIndex) => (itemIndex === index ? nextItem : current));
                  onUpdateBlock(item.section_id, block.block_id, { ...block, data: { ...data, items: nextItems } });
                }}
                className="outline-none"
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const textValue = richDataToText(data);
  return (
    <section className="my-4">
      <EditableText
        value={textValue}
        onFocus={() => onSetActiveSection(item.section_id)}
        onCommit={(nextText) =>
          onUpdateBlock(item.section_id, block.block_id, {
            ...block,
            data: textToRichData(nextText),
          })
        }
        placeholder="Write content..."
        className="min-h-[48px] text-[17px] leading-8 text-slate-800 outline-none"
      />
    </section>
  );
}

export default function ReportEditCanvas({
  scrollContainerRef,
  paperRefs,
  pages,
  pageSpec,
  marginSpec,
  paperBackground,
  zoom,
  activePageIndex,
  activeSectionId,
  cover,
  onSetActivePage,
  onSetActiveSection,
  onUpdateCoverField,
  onUpdateSectionTitle,
  onUpdateBlock,
}) {
  const [chartEditor, setChartEditor] = useState(null);
  const scale = zoom / 100;

  const openChartEditor = (sectionId, block) => {
    const data = block?.data && typeof block.data === "object" ? block.data : {};
    const firstSeries = Array.isArray(data.series) && data.series[0] && typeof data.series[0] === "object" ? data.series[0] : { name: "Series", values: [] };
    setChartEditor({
      sectionId,
      blockId: block.block_id,
      title: String(data.title || "Chart"),
      chart_type: String(data.chart_type || "bar").toLowerCase(),
      labels_csv: csvFromValues(data.labels),
      values_csv: csvFromValues(firstSeries.values),
      notes: String(data.notes || ""),
      primary_color: (Array.isArray(data.colors) && data.colors[0]) || "#0ea5e9",
    });
  };

  const applyChartEditor = () => {
    if (!chartEditor) return;
    const labels = parseCsvStrings(chartEditor.labels_csv);
    const values = parseCsvNumbers(chartEditor.values_csv);
    const nextColors = [chartEditor.primary_color || "#0ea5e9", "#22c55e", "#f59e0b", "#f97316"];
    for (const page of pages) {
      for (const item of page.items) {
        if (item.kind !== "block") continue;
        if (item.section_id !== chartEditor.sectionId) continue;
        if (item.block?.block_id !== chartEditor.blockId) continue;
        const block = item.block;
        const data = block?.data && typeof block.data === "object" ? block.data : {};
        onUpdateBlock(item.section_id, block.block_id, {
          ...block,
          data: {
            ...data,
            title: chartEditor.title,
            chart_type: chartEditor.chart_type,
            labels,
            series: [{ name: "Series", values }],
            notes: chartEditor.notes,
            colors: nextColors,
            image_source: "",
          },
        });
        setChartEditor(null);
        return;
      }
    }
    setChartEditor(null);
  };

  return (
    <>
      <main ref={scrollContainerRef} className="min-w-0 flex-1 overflow-auto bg-[#1a1f27] px-6 py-10">
        <div className="mx-auto flex min-h-full flex-col items-center gap-8" style={{ width: pageSpec.width * scale }}>
          {pages.map((page) => (
            <article
              key={page.pageIndex}
              ref={(el) => {
                paperRefs.current[String(page.pageIndex)] = el;
              }}
              data-page-index={String(page.pageIndex)}
              onClick={() => onSetActivePage(page.pageIndex)}
              className={`w-full border border-slate-300/80 text-slate-900 shadow-[0_20px_50px_rgba(2,6,23,0.55)] transition ${
                activePageIndex === page.pageIndex ? "ring-2 ring-cyan-500/40" : "hover:shadow-[0_24px_60px_rgba(2,6,23,0.7)]"
              }`}
              style={{
                minHeight: pageSpec.minHeight,
                background: paperBackground,
                padding: marginSpec.px,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontFamily: "Source Serif 4, Georgia, 'Times New Roman', serif" }}>
                {page.items.map((item) => {
                  if (item.kind === "cover") {
                    return (
                      <section key={`cover-${item.itemKey}`} className="relative h-full min-h-[760px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-0">
                        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white px-10 py-8">
                          <EditableText
                            value={String(cover?.kicker || "Professional Startup Simulation Report")}
                            onCommit={(value) => onUpdateCoverField("kicker", value)}
                            singleLine
                            className="text-[13px] font-semibold uppercase tracking-[0.2em] text-slate-700 outline-none"
                          />
                          <EditableText
                            value={String(cover?.title || "")}
                            onCommit={(value) => onUpdateCoverField("title", value)}
                            singleLine
                            className="mt-4 text-[58px] font-semibold leading-[1.02] text-slate-900 outline-none"
                          />
                          <EditableText
                            value={String(cover?.subtitle || "")}
                            onCommit={(value) => onUpdateCoverField("subtitle", value)}
                            className="mt-4 max-w-3xl text-[26px] leading-[1.35] text-slate-600 outline-none"
                          />
                        </div>
                        <div className="grid gap-6 px-10 py-8 sm:grid-cols-2">
                          <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Startup</p>
                            <EditableText
                              value={String(cover?.startup_name || "")}
                              onCommit={(value) => onUpdateCoverField("startup_name", value)}
                              singleLine
                              className="mt-2 text-[28px] font-semibold text-slate-900 outline-none"
                              placeholder="Startup name"
                            />
                          </article>
                          <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Generated</p>
                            <EditableText
                              value={String(cover?.generated_on || "")}
                              onCommit={(value) => onUpdateCoverField("generated_on", value)}
                              singleLine
                              className="mt-2 text-[28px] font-semibold text-slate-900 outline-none"
                              placeholder="Generated date"
                            />
                          </article>
                          <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Report ID</p>
                            <EditableText
                              value={String(cover?.report_id || "")}
                              onCommit={(value) => onUpdateCoverField("report_id", value)}
                              singleLine
                              className="mt-2 text-[22px] font-semibold text-slate-900 outline-none"
                              placeholder="Report identifier"
                            />
                          </article>
                          <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">Prepared By</p>
                            <EditableText
                              value={String(cover?.prepared_by || "PetraAI")}
                              onCommit={(value) => onUpdateCoverField("prepared_by", value)}
                              singleLine
                              className="mt-2 text-[22px] font-semibold text-slate-900 outline-none"
                            />
                          </article>
                        </div>
                      </section>
                    );
                  }

                  if (item.kind === "section") {
                    return (
                      <section
                        key={`section-${item.section_id}-${item.itemKey}`}
                        className={`mb-3 ${activeSectionId === item.section_id ? "relative" : ""}`}
                        onClick={() => onSetActiveSection(item.section_id)}
                      >
                        <EditableText
                          value={item.title || ""}
                          onFocus={() => onSetActiveSection(item.section_id)}
                          onCommit={(nextTitle) => onUpdateSectionTitle(item.section_id, nextTitle)}
                          singleLine
                          className="mb-2 border-b border-slate-200 pb-1 text-[31px] font-semibold leading-tight text-slate-900 outline-none"
                        />
                      </section>
                    );
                  }

                  return (
                    <div key={`block-${item.section_id}-${item.block?.block_id}-${item.itemKey}`}>
                      <ReportBlock
                        item={item}
                        onSetActiveSection={onSetActiveSection}
                        onUpdateBlock={onUpdateBlock}
                        onOpenChartEditor={openChartEditor}
                      />
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </main>
      <ChartEditorModal
        draft={chartEditor}
        onChange={setChartEditor}
        onCancel={() => setChartEditor(null)}
        onSave={applyChartEditor}
      />
    </>
  );
}
