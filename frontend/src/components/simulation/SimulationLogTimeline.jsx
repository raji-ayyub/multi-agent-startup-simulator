import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

const STATUS_STYLE = {
  done: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  running: "border-cyan-400/35 bg-cyan-400/10 text-cyan-200",
  pending: "border-slate-500/35 bg-slate-500/10 text-slate-300",
  error: "border-rose-400/35 bg-rose-400/10 text-rose-200",
};

const STATUS_ICON = {
  done: CheckCircle2,
  running: Loader2,
  pending: Clock3,
  error: AlertTriangle,
};

function formatLabel(value = "") {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataEntries(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  return Object.entries(metadata).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function MetadataValue({ value }) {
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1">
        {value.slice(0, 6).map((item, index) => (
          <span key={`${String(item)}-${index}`} className="rounded border border-slate-700 px-1.5 py-0.5">
            {String(item)}
          </span>
        ))}
        {value.length > 6 ? <span className="app-muted">+{value.length - 6}</span> : null}
      </span>
    );
  }
  if (typeof value === "object") {
    return <span>{JSON.stringify(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

export default function SimulationLogTimeline({
  logs = [],
  title = "Simulation Runtime Log",
  description = "Structured events returned by the backend simulation engine.",
  emptyMessage = "No backend runtime events were returned for this simulation.",
  maxItems,
  dense = false,
}) {
  const normalizedLogs = Array.isArray(logs)
    ? [...logs]
        .filter((log) => log && typeof log === "object")
        .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    : [];
  const visibleLogs = Number.isFinite(maxItems) ? normalizedLogs.slice(-maxItems) : normalizedLogs;
  const counts = normalizedLogs.reduce(
    (acc, log) => {
      const status = String(log.status || "done").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <article className="app-card-alt rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="app-muted text-[11px] uppercase tracking-[0.18em]">{title}</p>
          <p className="app-copy mt-1 text-xs">{description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {["running", "done", "error"].map((status) =>
            counts[status] ? (
              <span key={status} className={`rounded-full border px-2 py-1 ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
                {counts[status]} {status}
              </span>
            ) : null
          )}
        </div>
      </div>

      {visibleLogs.length > 0 ? (
        <div className={dense ? "space-y-2" : "space-y-3"}>
          {visibleLogs.map((log, index) => {
            const status = String(log.status || "done").toLowerCase();
            const Icon = STATUS_ICON[status] || CheckCircle2;
            const entries = metadataEntries(log.metadata);
            return (
              <section key={`${log.sequence || index}-${log.role}-${log.phase}`} className="grid grid-cols-[auto_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span className={`rounded-full border p-1.5 ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
                    <Icon size={13} className={status === "running" ? "animate-spin" : ""} />
                  </span>
                  {index < visibleLogs.length - 1 ? <span className="mt-1 h-full min-h-5 w-px bg-slate-700" /> : null}
                </div>
                <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="app-heading text-xs font-semibold uppercase tracking-[0.12em]">{log.role || "Simulation"}</p>
                    {log.phase ? <span className="app-muted text-[11px]">{formatLabel(log.phase)}</span> : null}
                    {log.sequence ? <span className="app-muted ml-auto text-[11px]">#{log.sequence}</span> : null}
                  </div>
                  <p className="app-copy mt-1 text-sm leading-6">{log.message || "No message supplied."}</p>
                  {entries.length > 0 ? (
                    <dl className="mt-2 grid gap-1 text-[11px] text-slate-300 sm:grid-cols-2">
                      {entries.map(([key, value]) => (
                        <div key={key} className="min-w-0 rounded border border-slate-800 bg-slate-900/60 px-2 py-1">
                          <dt className="app-muted uppercase tracking-[0.12em]">{formatLabel(key)}</dt>
                          <dd className="mt-0.5 break-words">
                            <MetadataValue value={value} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="app-copy text-sm">{emptyMessage}</p>
      )}
    </article>
  );
}
