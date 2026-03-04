import { useMemo, useState } from "react";
import { Info, Plus, Upload } from "lucide-react";
import ModalShell from "./ModalShell";

const parseSkills = (raw) =>
  String(raw || "")
    .split(/[\n,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);

const nextId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const stepItems = [
  { key: 1, label: "Configuration" },
  { key: 2, label: "Team" },
  { key: 3, label: "Review" },
];

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-500";

const defaultTeamMember = () => ({
  id: nextId(),
  name: "",
  role: "",
  qualificationsText: "",
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
    const pool = team.flatMap((member) => parseSkills(member.qualificationsText));
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

  const handleUploadQualifications = async (memberId, file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseSkills(text).join(", ");
    setTeam((prev) =>
      prev.map((member) => {
        if (member.id !== memberId) return member;
        const merged = [member.qualificationsText, parsed].filter(Boolean).join(", ");
        return { ...member, qualificationsText: merged };
      })
    );
  };

  const handleLaunch = async () => {
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
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Step {step} of 3</span>
          <span>{filledPercent}% Complete</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {stepItems.map((item) => (
            <p
              key={item.key}
              className={`text-xs ${step === item.key ? "text-blue-300" : "text-slate-500"}`}
            >
              {item.key}. {item.label}
            </p>
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          <h4 className="text-2xl font-semibold text-white">Initialize Workspace</h4>
          <p className="text-sm text-slate-400">Only the essentials. You can edit the rest later.</p>
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
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            <Info size={12} className="mr-2 inline-block" />
            These basics are enough to launch and generate a first actionable plan.
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h4 className="text-3xl font-semibold text-white">Team Access & Skills</h4>
          <p className="text-sm text-slate-400">
            Add operators and optionally upload qualification files (txt, md, csv, json) for each member.
          </p>
          <div className="space-y-3">
            {team.map((member) => (
              <article key={member.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
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
                  <Field label="Qualifications (comma-separated)" className="md:col-span-2">
                    <textarea
                      rows={2}
                      value={member.qualificationsText}
                      onChange={(event) => updateMember(member.id, { qualificationsText: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500">
                    <Upload size={12} />
                    Upload Qualification File
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.csv,.json,.log,text/plain,text/markdown,text/csv,application/json"
                      onChange={(event) => handleUploadQualifications(member.id, event.target.files?.[0])}
                    />
                  </label>
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
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500"
          >
            <Plus size={12} />
            Add Operator
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h4 className="text-2xl font-semibold text-white">Final Review & Launch</h4>
          <p className="text-sm text-slate-400">Verify workspace configuration before engine initialization.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-blue-300">Workspace Summary</p>
              <SummaryRow label="Workspace" value={workspaceName || "N/A"} />
              <SummaryRow label="Company" value={companyName || "N/A"} />
              <SummaryRow label="Goal" value={primaryGoal || "N/A"} />
              <SummaryRow label="Revenue" value={annualRevenue || "N/A"} />
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-blue-300">Assigned Operators</p>
              <div className="space-y-2">
                {team
                  .filter((member) => member.name.trim() || member.role.trim())
                  .map((member) => (
                    <div key={member.id} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-200">{member.name || "Unnamed operator"}</p>
                      <p className="text-xs text-slate-400">{member.role || "Role pending"}</p>
                    </div>
                  ))}
              </div>
            </article>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            <Info size={12} className="mr-2 inline-block" />
            Initializing the Management Engine allocates resources and activates security protocols.
          </div>
        </div>
      ) : null}

      <footer className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => (step === 1 ? onClose() : setStep((prev) => Math.max(1, prev - 1)))}
          className="rounded-full px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
        >
          {step === 1 ? "Cancel Setup" : "Back"}
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((prev) => Math.min(3, prev + 1))}
            disabled={step === 1 && !canProceedStep1}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              step === 1 && !canProceedStep1
                ? "cursor-not-allowed bg-slate-700 text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!canLaunch || isSaving}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              !canLaunch || isSaving
                ? "cursor-not-allowed bg-slate-700 text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
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
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <p className="mb-1 text-sm text-slate-300">
      <span className="text-slate-500">{label}: </span>
      {value}
    </p>
  );
}
