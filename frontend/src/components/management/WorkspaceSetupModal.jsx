import { useMemo, useState } from "react";
import { Info, Plus, Upload } from "lucide-react";
import ModalShell from "./ModalShell";
import { parseManagementCv } from "../../services/managementService";

const nextId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const stepItems = [
  { key: 1, label: "Configuration" },
  { key: 2, label: "Team" },
  { key: 3, label: "Review" },
];

const inputClass =
  "theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-500";

const defaultTeamMember = () => ({
  id: nextId(),
  name: "",
  role: "",
  cvFileName: "",
  qualifications: [],
  qualification_notes: "",
  cvError: "",
});

export default function WorkspaceSetupModal({ open, onClose, onCreate, isSaving = false }) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [employeeCount, setEmployeeCount] = useState(0);
  const [team, setTeam] = useState([defaultTeamMember()]);

  const filledPercent = useMemo(() => {
    const checks = [
      companyName.trim(),
      workspaceName.trim(),
      primaryGoal.trim(),
    ];
    const complete = checks.filter(Boolean).length;
    return Math.round((complete / checks.length) * 100);
  }, [companyName, workspaceName, primaryGoal]);

  const aggregatedQualifications = useMemo(() => {
    const pool = team.flatMap((member) => member.qualifications || []);
    return Array.from(new Set(pool)).slice(0, 100);
  }, [team]);

  if (!open) return null;

  const canProceedStep1 = companyName.trim() && workspaceName.trim();
  const canLaunch = canProceedStep1;

  const updateMember = (id, patch) => {
    setTeam((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addMember = () => setTeam((prev) => [...prev, defaultTeamMember()]);
  const removeMember = (id) => setTeam((prev) => prev.filter((item) => item.id !== id));

  const handleUploadCv = async (memberId, file) => {
    if (!file) return;
    try {
      const parsed = await parseManagementCv(file);
      setTeam((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                cvFileName: parsed.source_file_name || file.name,
                name: parsed.name || member.name,
                role: parsed.role || member.role,
                qualifications: Array.isArray(parsed.qualifications) ? parsed.qualifications : [],
                qualification_notes: parsed.qualification_notes || "",
                cvError: "",
              }
            : member
        )
      );
    } catch (error) {
      setTeam((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, cvError: error?.message || "Unable to parse CV." } : member
        )
      );
    }
  };

  const handleLaunch = async () => {
    const teamMembers = team
      .filter((member) => member.name.trim())
      .map((member) => ({
        name: member.name.trim(),
        role: member.role.trim(),
        qualifications: member.qualifications || [],
        qualification_notes: (member.qualification_notes || "").slice(0, 20000),
      }));

    const teamSummary = team
      .filter((member) => member.name.trim() || member.role.trim())
      .map((member) => `- ${member.name || "Unassigned"} | ${member.role || "Role pending"}`)
      .join("\n");

    const description = [
      `Primary Goal: ${primaryGoal || "Not specified"}`,
      teamSummary ? `Team:\n${teamSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await onCreate({
      company_name: companyName.trim(),
      workspace_name: workspaceName.trim(),
      description,
      industry: "",
      stage: primaryGoal.trim() || "",
      annual_revenue: annualRevenue.trim(),
      employee_count: Number(employeeCount || team.length || 0),
      qualifications: aggregatedQualifications,
      team_members: teamMembers,
    });
    onClose();
    setStep(1);
    setCompanyName("");
    setWorkspaceName("");
    setPrimaryGoal("");
    setAnnualRevenue("");
    setEmployeeCount(0);
    setTeam([defaultTeamMember()]);
  };

  return (
    <ModalShell
      title="PentraAI Management"
      subtitle="Instance deployment"
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
        <div className="mb-5">
        <div className="app-muted mb-2 flex items-center justify-between text-xs">
          <span>Step {step} of 3</span>
          <span>{filledPercent}% Complete</span>
        </div>
        <div className="app-progress-track h-1.5 rounded-full">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {stepItems.map((item) => (
            <p
              key={item.key}
              className={`app-progress-step text-xs ${step === item.key ? "is-active" : ""}`}
            >
              {item.key}. {item.label}
            </p>
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <h4 className="app-heading text-2xl font-semibold">Initialize Workspace</h4>
          <p className="app-copy text-sm">Only the essentials. You can edit the rest later.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Company Name">
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="e.g. Pentra Galactic Systems"
                className={inputClass}
              />
            </Field>
            <Field label="Workspace Name">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="PentraAI Alpha-01"
                className={inputClass}
              />
            </Field>
            <Field label="Primary Goal (optional)">
              <input
                value={primaryGoal}
                onChange={(event) => setPrimaryGoal(event.target.value)}
                placeholder="Operational scalability"
                className={inputClass}
              />
            </Field>
            <Field label="Annual Revenue (optional)">
              <input value={annualRevenue} onChange={(event) => setAnnualRevenue(event.target.value)} placeholder="$250k ARR" className={inputClass} />
            </Field>
            <Field label="Employee Count (optional)">
              <input type="number" value={employeeCount} onChange={(event) => setEmployeeCount(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="app-status-info rounded-xl border px-3 py-2 text-xs">
            <Info size={12} className="mr-2 inline-block" />
            These basics are enough to launch and generate a first actionable plan.
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h4 className="app-heading text-3xl font-semibold">Team Access & Skills</h4>
          <p className="app-copy text-sm">
            Add operators and upload each member CV to auto-fill name, role, and qualifications.
          </p>
          <div className="space-y-3">
            {team.map((member) => (
              <article key={member.id} className="app-list-card rounded-xl border p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Employee Name">
                    <input
                      value={member.name}
                      onChange={(event) => updateMember(member.id, { name: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Role">
                    <input
                      value={member.role}
                      onChange={(event) => updateMember(member.id, { role: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="CV File" className="md:col-span-2">
                    <label className="app-upload-label inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <Upload size={14} />
                      {member.cvFileName || "Upload CV (.pdf, .docx, .txt, .md, .csv, .json, .rtf)"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.log,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown,text/csv,application/json,text/rtf"
                        onChange={(event) => handleUploadCv(member.id, event.target.files?.[0])}
                      />
                    </label>
                    {member.cvError ? <p className="mt-1 text-xs text-rose-400">{member.cvError}</p> : null}
                    {member.qualifications.length ? (
                      <p className="app-copy mt-2 text-xs">
                        Extracted: {member.qualifications.join(", ")}
                      </p>
                    ) : null}
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="app-muted text-xs">CV is parsed on backend and can still be edited manually.</span>
                  {team.length > 1 ? (
                    <button type="button" onClick={() => removeMember(member.id)} className="text-xs text-rose-400">
                      Remove
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={addMember}
            className="app-ghost-btn inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
          >
            <Plus size={12} />
            Add Operator
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h4 className="app-heading text-2xl font-semibold">Final Review & Launch</h4>
          <p className="app-copy text-sm">Verify workspace configuration before engine initialization.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="app-list-card rounded-xl border p-4">
              <p className="app-badge mb-2 inline-flex rounded-full border px-2 py-1 text-xs uppercase tracking-[0.16em]">Workspace Summary</p>
              <SummaryRow label="Workspace" value={workspaceName || "N/A"} />
              <SummaryRow label="Company" value={companyName || "N/A"} />
              <SummaryRow label="Goal" value={primaryGoal || "N/A"} />
              <SummaryRow label="Revenue" value={annualRevenue || "N/A"} />
            </article>
            <article className="app-list-card rounded-xl border p-4">
              <p className="app-badge mb-2 inline-flex rounded-full border px-2 py-1 text-xs uppercase tracking-[0.16em]">Assigned Operators</p>
              <div className="space-y-2">
                {team
                  .filter((member) => member.name.trim() || member.role.trim())
                  .map((member) => (
                    <div key={member.id} className="app-card rounded-lg border px-3 py-2">
                      <p className="app-heading text-sm font-semibold">{member.name || "Unnamed operator"}</p>
                      <p className="app-copy text-xs">{member.role || "Role pending"}</p>
                    </div>
                  ))}
              </div>
            </article>
          </div>
          <div className="app-status-info rounded-xl border px-3 py-2 text-xs">
            <Info size={12} className="mr-2 inline-block" />
            Initializing the Management Engine allocates resources and activates security protocols.
          </div>
        </div>
      ) : null}

      <footer className="app-modal-section mt-6 flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={() => (step === 1 ? onClose() : setStep((prev) => Math.max(1, prev - 1)))}
          className="app-ghost-btn rounded-full border px-4 py-2 text-sm"
        >
          {step === 1 ? "Cancel Setup" : "Back"}
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((prev) => Math.min(3, prev + 1))}
            disabled={step === 1 && !canProceedStep1}
            className="app-primary-btn rounded-full px-5 py-2 text-sm font-semibold transition"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!canLaunch || isSaving}
            className="app-primary-btn rounded-full px-5 py-2 text-sm font-semibold transition"
          >
            {isSaving ? "Initializing..." : "Initialize Management Engine"}
          </button>
        )}
      </footer>
    </ModalShell>
  );
}

function Field({ label, className = "", children }) {
  return (
    <label className={className}>
      <span className="app-copy mb-1 block text-xs">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <p className="app-copy mb-1 text-sm">
      <span className="app-summary-key">{label}: </span>
      {value}
    </p>
  );
}
