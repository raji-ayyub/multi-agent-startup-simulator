import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Download, Pencil, Rocket, Trash2, TrendingUp, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import useSimulationStore from "../../store/simulationStore";

const AGENT_ICON = {
  "Market Analyst": BarChart3,
  "Customer Agent": Users,
  "Investor Agent": Wallet,
};

const confidenceLabel = (score) => {
  if (score >= 80) return "HIGH PROBABILITY";
  if (score >= 65) return "MODERATE";
  return "CAUTION";
};

export default function ResultsView() {
  const navigate = useNavigate();
  const {
    fetchSimulations,
    fetchSimulationDetail,
    removeSimulation,
    recentSimulations,
    rerunSimulationFromExisting,
    activeSimulation,
    isLoadingHistory,
    isRunning,
    simulationError,
  } = useSimulationStore();

  const [elapsed] = useState(() => {
    const seconds = Math.floor((Date.now() / 1000) % 60);
    const minutes = Math.floor((Date.now() / 60000) % 60);
    const hours = Math.floor((Date.now() / 3600000) % 24);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  });
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [rerunDraft, setRerunDraft] = useState({});

  useEffect(() => {
    const run = async () => {
      const list = await fetchSimulations();
      if (list.length > 0) {
        await fetchSimulationDetail(list[0].id);
      }
    };
    run();
  }, [fetchSimulations, fetchSimulationDetail]);

  const strengths = useMemo(
    () => (activeSimulation?.agents || []).flatMap((agent) => agent.opportunities || []).slice(0, 4),
    [activeSimulation]
  );
  const risks = useMemo(
    () => (activeSimulation?.agents || []).flatMap((agent) => agent.risks || []).slice(0, 4),
    [activeSimulation]
  );

  if (isLoadingHistory && !activeSimulation) {
    return <div className="app-copy">Loading simulations...</div>;
  }

  if (!activeSimulation) {
    return (
      <div className="space-y-4">
        <p className="app-copy">No simulations saved yet.</p>
        <Link to="/dashboard" className="app-primary-btn inline-flex rounded-lg px-4 py-2 text-sm font-semibold">
          Start New Simulation
        </Link>
      </div>
    );
  }

  const payload = activeSimulation.input_payload || {};
  const score = activeSimulation.overall_score || 0;

  const openRerunModal = () => {
    setRerunDraft({
      startup_name: payload.startup_name || "",
      problem_statement: payload.problem_statement || "",
      target_audience: payload.target_audience || "",
      primary_target_segment: payload.primary_target_segment || "",
      geography: payload.geography || "",
      monthly_burn: payload.monthly_burn || "",
      current_cash_in_hand: payload.current_cash_in_hand || "",
      marketing_strategy: payload.marketing_strategy || "",
      customer_behavior_pain_points: payload.customer_behavior_pain_points || "",
    });
    setShowRerunModal(true);
  };

  const runRerun = async (runAsNewVersion = false) => {
    if (!activeSimulation?.simulation_id) return;
    try {
      await rerunSimulationFromExisting({
        simulationId: activeSimulation.simulation_id,
        overrides: rerunDraft,
        runAsNewVersion,
      });
      setShowRerunModal(false);
      toast.success(runAsNewVersion ? "New version simulation completed." : "Simulation rerun completed.");
    } catch (error) {
      toast.error(error?.message || "Simulation rerun failed.");
    }
  };

  const handleDelete = async (simulationId) => {
    toast("Delete this simulation?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          const deleted = await removeSimulation(simulationId);
          if (deleted) {
            toast.success("Simulation deleted.");
            const next = recentSimulations.find((item) => item.id !== simulationId);
            if (next) await fetchSimulationDetail(next.id);
          } else {
            toast.error("Unable to delete simulation.");
          }
        },
      },
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[290px_1fr]">
      <aside className="app-sim-history rounded-2xl border p-4">
        <h2 className="app-sim-accent mb-3 text-sm font-semibold uppercase tracking-wider">Simulation History</h2>
        <div className="space-y-2">
          {recentSimulations.map((item) => (
            <article
              key={item.id}
              onClick={() => fetchSimulationDetail(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fetchSimulationDetail(item.id);
                }
              }}
              role="button"
              tabIndex={0}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                item.id === activeSimulation.simulation_id
                  ? "app-sim-accent-soft"
                  : "app-card-alt hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="app-heading text-sm font-semibold">{item.name}</p>
                  <p className="app-copy text-xs">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="app-ghost-btn rounded p-1"
                  title="Delete simulation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <Link
          to="/dashboard"
          className="app-sim-accent-soft mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"
        >
          <Rocket size={14} />
          New Simulation
        </Link>
      </aside>

      <section className="app-card space-y-4 rounded-2xl border p-5">
        <header className="app-modal-section flex flex-wrap items-end justify-between gap-3 border-b pb-3">
          <div>
            <p className="app-muted text-xs uppercase tracking-[0.2em]">Active Simulation</p>
            <h1 className="app-heading text-3xl font-semibold">PROJECT: {activeSimulation.startup_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openRerunModal}
              className="app-ghost-btn inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
            >
              <Pencil size={13} />
              Edit & Rerun
            </button>
            <p className="app-copy text-sm">Elapsed Time {elapsed}</p>
          </div>
        </header>

        <article className="app-card-alt rounded-xl border p-4">
          <p className="app-muted mb-3 text-[11px] uppercase tracking-[0.18em]">Startup Idea Input Panel</p>
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Problem Statement" value={payload.problem_statement} />
            <Panel
              title="Market Segment"
              value={`${payload.primary_target_segment || ""} ${payload.geography ? `, ${payload.geography}` : ""} ${payload.market_size_estimate ? `, ${payload.market_size_estimate}` : ""}`}
            />
            <Panel title="Revenue Model" value={payload.marketing_strategy || payload.elevator_pitch || "Not specified"} />
          </div>
        </article>

        <div className="grid gap-3 lg:grid-cols-3">
          {(activeSimulation.agents || []).map((agent) => {
            const Icon = AGENT_ICON[agent.perspective] || TrendingUp;
            return (
              <article key={agent.perspective} className="app-card-alt rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="app-card-subtle rounded-md border p-2 app-copy">
                      <Icon size={14} />
                    </span>
                    <p className="app-heading text-sm font-semibold uppercase">{agent.perspective}</p>
                  </div>
                  <p className="app-copy text-sm">Confidence {agent.confidence}%</p>
                </div>
                <p className="app-copy text-sm">{agent.summary}</p>
                <div className="mt-3 space-y-1">
                  {(agent.opportunities || []).slice(0, 2).map((op) => (
                    <p key={op} className="text-xs text-emerald-300">+ {op}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <article className="app-sim-verdict rounded-xl border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="app-copy text-xs uppercase tracking-[0.2em]">Strategic Verdict</p>
              <p className="app-sim-accent-soft mt-1 inline-flex rounded border px-2 py-1 text-[11px] font-semibold">{confidenceLabel(score)}</p>
              <h2 className="app-heading mt-2 text-5xl font-bold">{score >= 65 ? "PROCEED TO SEED" : "ITERATE BEFORE SCALE"}</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/reports?simulation=${activeSimulation.simulation_id}`)}
              className="app-sim-accent-soft inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold"
            >
              <Download size={16} />
              Generate Full Strategy Deck
            </button>
          </div>
          <p className="app-copy mt-3 text-sm">{activeSimulation.synthesis}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="app-sim-accent mb-2 text-sm font-semibold uppercase tracking-wider">Core Strengths</p>
              <div className="space-y-1.5">
                {strengths.map((item) => (
                  <p key={item} className="app-heading text-sm">- {item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="app-status-danger mb-2 inline-flex rounded-full px-2 py-1 text-sm font-semibold uppercase tracking-wider">Critical Risks</p>
              <div className="space-y-1.5">
                {risks.map((item) => (
                  <p key={item} className="app-heading text-sm">- {item}</p>
                ))}
              </div>
            </div>
          </div>
        </article>

        {simulationError ? <p className="app-status-danger rounded-lg px-3 py-2 text-sm">{simulationError}</p> : null}
      </section>

      {showRerunModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-backdrop absolute inset-0 backdrop-blur-sm" onClick={() => setShowRerunModal(false)} />
          <section className="theme-modal relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border">
            <header className="app-modal-section flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="app-heading text-lg font-semibold">Revisit Simulation</h3>
                <p className="app-copy text-xs">Update fields and rerun, or create a new version.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRerunModal(false)}
                className="app-ghost-btn rounded-full border p-1.5"
              >
                <X size={14} />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Startup Name">
                  <input value={rerunDraft.startup_name || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, startup_name: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Target Audience">
                  <input value={rerunDraft.target_audience || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, target_audience: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Target Segment">
                  <input value={rerunDraft.primary_target_segment || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, primary_target_segment: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Geography">
                  <input value={rerunDraft.geography || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, geography: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Monthly Burn">
                  <input value={rerunDraft.monthly_burn || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, monthly_burn: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Current Cash">
                  <input value={rerunDraft.current_cash_in_hand || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, current_cash_in_hand: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Marketing Strategy" className="md:col-span-2">
                  <textarea rows={2} value={rerunDraft.marketing_strategy || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, marketing_strategy: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Problem Statement" className="md:col-span-2">
                  <textarea rows={3} value={rerunDraft.problem_statement || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, problem_statement: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
                <Field label="Customer Pain Points" className="md:col-span-2">
                  <textarea rows={3} value={rerunDraft.customer_behavior_pain_points || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, customer_behavior_pain_points: e.target.value }))} className="theme-input w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-amber-300" />
                </Field>
              </div>
            </div>
            <footer className="app-modal-section flex items-center justify-between border-t px-5 py-4">
              <button
                type="button"
                onClick={() => runRerun(false)}
                disabled={isRunning}
                className="app-primary-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                {isRunning ? "Running..." : "Rerun Simulation"}
              </button>
              <button
                type="button"
                onClick={() => runRerun(true)}
                disabled={isRunning}
                className="app-success-btn rounded-lg px-4 py-2 text-sm font-semibold"
              >
                {isRunning ? "Running..." : "Run as New Version (_v2)"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, value }) {
  return (
    <article className="app-card-alt max-h-[20rem] overflow-auto rounded-lg border p-3">
      <p className="app-muted mb-1 text-[11px] uppercase tracking-[0.16em]">{title}</p>
      <p className="app-copy text-sm">{value || "Not provided"}</p>
    </article>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={className}>
      <p className="app-copy mb-1 text-xs">{label}</p>
      {children}
    </label>
  );
}
