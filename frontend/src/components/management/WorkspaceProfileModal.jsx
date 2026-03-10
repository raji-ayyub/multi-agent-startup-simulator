import { Save } from "lucide-react";
import ModalShell from "./ModalShell";

const inputClass =
  "theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-500";

export default function WorkspaceProfileModal({
  open,
  onClose,
  draft,
  setDraft,
  qualificationInput,
  setQualificationInput,
  onSave,
  isSaving = false,
}) {
  if (!open || !draft) return null;

  return (
    <ModalShell title="Update Workspace Profile" subtitle="Tune the management profile used by planning agents." onClose={onClose}>
      <form onSubmit={onSave} className="grid gap-3">
        <Field label="Workspace Name">
          <input value={draft.workspace_name} onChange={(event) => setDraft((prev) => ({ ...prev, workspace_name: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Annual Revenue">
          <input value={draft.annual_revenue} onChange={(event) => setDraft((prev) => ({ ...prev, annual_revenue: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Employee Count">
          <input type="number" value={draft.employee_count} onChange={(event) => setDraft((prev) => ({ ...prev, employee_count: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Industry">
          <input value={draft.industry} onChange={(event) => setDraft((prev) => ({ ...prev, industry: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Stage">
          <input value={draft.stage} onChange={(event) => setDraft((prev) => ({ ...prev, stage: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea rows={3} value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} className={inputClass} />
        </Field>
        <Field label="Qualifications (comma-separated)">
          <textarea rows={2} value={qualificationInput} onChange={(event) => setQualificationInput(event.target.value)} className={inputClass} />
        </Field>
        <button
          type="submit"
          disabled={isSaving}
          className="app-primary-btn inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        >
          <Save size={14} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className="app-copy mb-1 block text-xs">{label}</span>
      {children}
    </label>
  );
}
