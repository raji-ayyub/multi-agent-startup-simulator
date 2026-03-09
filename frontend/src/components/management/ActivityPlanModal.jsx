import { ClipboardList } from "lucide-react";
import ModalShell from "./ModalShell";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500";

export default function ActivityPlanModal({
  open,
  onClose,
  objective,
  setObjective,
  timeHorizonWeeks,
  setTimeHorizonWeeks,
  onGenerate,
  isPlanning = false,
  canRun = true,
}) {
  if (!open) return null;

  return (
    <ModalShell title="Generate Activity Plan" subtitle="Create an execution plan from your current management profile." onClose={onClose}>
      <form onSubmit={onGenerate} className="grid gap-3">
        <label>
          <span className="mb-1 block text-xs text-slate-400">Objective</span>
          <textarea
            rows={3}
            required
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            placeholder="Increase qualified inbound pipeline by 20%."
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-400">Time Horizon (weeks)</span>
          <input
            type="number"
            min={1}
            max={52}
            value={timeHorizonWeeks}
            onChange={(event) => setTimeHorizonWeeks(event.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={isPlanning || !canRun || !objective.trim()}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            isPlanning || !canRun || !objective.trim()
              ? "cursor-not-allowed bg-slate-700 text-slate-400"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          <ClipboardList size={14} />
          {isPlanning ? "Planning..." : "Generate Plan"}
        </button>
      </form>
    </ModalShell>
  );
}
