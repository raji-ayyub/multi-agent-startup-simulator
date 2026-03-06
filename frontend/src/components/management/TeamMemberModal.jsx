import { Upload } from "lucide-react";
import ModalShell from "./ModalShell";
import { parseManagementCv } from "../../services/managementService";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500";

export default function TeamMemberModal({
  open,
  onClose,
  title,
  draft,
  setDraft,
  onSubmit,
  isSaving = false,
}) {
  if (!open || !draft) return null;

  const canSave = draft.name.trim().length > 0;
  const handleCvUpload = async (file) => {
    if (!file) return;
    try {
      const parsed = await parseManagementCv(file);
      setDraft((prev) => ({
        ...prev,
        cvFileName: parsed.source_file_name || file.name,
        name: parsed.name || prev.name,
        role: parsed.role || prev.role,
        qualifications: Array.isArray(parsed.qualifications) ? parsed.qualifications : [],
        qualification_notes: parsed.qualification_notes || prev.qualification_notes,
        cvError: "",
      }));
    } catch (error) {
      setDraft((prev) => ({ ...prev, cvError: error?.message || "Unable to parse CV." }));
    }
  };

  return (
    <ModalShell title={title} subtitle="Upload CV and role data for each operator." onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Name">
          <input
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="Role">
          <input
            value={draft.role}
            onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="CV File">
          <label className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500">
            <Upload size={14} />
            {draft.cvFileName || "Upload CV (.pdf, .docx, .txt, .md, .csv, .json, .rtf)"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.log,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown,text/csv,application/json,text/rtf"
              onChange={(event) => handleCvUpload(event.target.files?.[0])}
            />
          </label>
          {draft.cvError ? <p className="mt-1 text-xs text-rose-400">{draft.cvError}</p> : null}
          {draft.qualifications?.length ? (
            <p className="mt-2 text-xs text-slate-400">
              Extracted: {draft.qualifications.join(", ")}
            </p>
          ) : null}
        </Field>
        <Field label="Additional Notes (optional)">
          <textarea
            rows={3}
            value={draft.additional_notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, additional_notes: event.target.value }))}
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={isSaving || !canSave}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            isSaving || !canSave
              ? "cursor-not-allowed bg-slate-700 text-slate-400"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isSaving ? "Saving..." : "Save Team Member"}
        </button>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}
