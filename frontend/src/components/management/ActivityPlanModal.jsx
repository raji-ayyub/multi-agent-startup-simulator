import { ClipboardList } from "lucide-react";
import ModalShell from "./ModalShell";

const inputClass =
  "theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-500";

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
          <span className="app-copy mb-1 block text-xs">Objective</span>
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
          <span className="app-copy mb-1 block text-xs">Time Horizon (weeks)</span>
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
          className="app-primary-btn inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        >
          <ClipboardList size={14} />
          {isPlanning ? "Planning..." : "Generate Plan"}
        </button>
      </form>
    </ModalShell>
  );
}
