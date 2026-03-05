import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
    return <div className="text-slate-400">Loading simulations...</div>;
  }

  if (!activeSimulation) {
    return (
      <div className="space-y-4">
        <p className="text-slate-400">No simulations saved yet.</p>
        <Link to="/dashboard" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
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
      <aside className="rounded-2xl border border-amber-200 bg-[#090a0d] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-200">Simulation History</h2>
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
                  ? "border-amber-200 bg-amber-200/10"
                  : "border-slate-800 bg-[#0f1117] hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
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
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-200 px-4 py-2.5 text-sm font-semibold text-black"
        >
          <Rocket size={14} />
          New Simulation
        </Link>
      </aside>

      <section className="space-y-4 rounded-2xl border border-amber-200 bg-[#0a0b10] p-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Simulation</p>
            <h1 className="text-3xl font-semibold text-white">PROJECT: {activeSimulation.startup_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openRerunModal}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
            >
              <Pencil size={13} />
              Edit & Rerun
            </button>
            <p className="text-sm text-slate-400">Elapsed Time {elapsed}</p>
          </div>
        </header>

        <article className="rounded-xl border border-slate-800 bg-[#12141c] p-4">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Startup Idea Input Panel</p>
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
              <article key={agent.perspective} className="rounded-xl border border-slate-800 bg-[#11131a] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-300">
                      <Icon size={14} />
                    </span>
                    <p className="text-sm font-semibold text-white uppercase">{agent.perspective}</p>
                  </div>
                  <p className="text-sm text-slate-300">Confidence {agent.confidence}%</p>
                </div>
                <p className="text-sm text-slate-400">{agent.summary}</p>
                <div className="mt-3 space-y-1">
                  {(agent.opportunities || []).slice(0, 2).map((op) => (
                    <p key={op} className="text-xs text-emerald-300">+ {op}</p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <article className="rounded-xl border border-amber-200 bg-[linear-gradient(90deg, amber ,#11131a)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strategic Verdict</p>
              <p className="mt-1 inline-flex rounded bg-amber-200 px-2 py-1 text-[11px] font-semibold text-black">{confidenceLabel(score)}</p>
              <h2 className="mt-2 text-5xl font-bold text-white">{score >= 65 ? "PROCEED TO SEED" : "ITERATE BEFORE SCALE"}</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-5 py-3 text-sm font-semibold text-black">
              <Download size={16} />
              Download Full Strategy Deck
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{activeSimulation.synthesis}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200">Core Strengths</p>
              <div className="space-y-1.5">
                {strengths.map((item) => (
                  <p key={item} className="text-sm text-slate-200">- {item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-400">Critical Risks</p>
              <div className="space-y-1.5">
                {risks.map((item) => (
                  <p key={item} className="text-sm text-slate-200">- {item}</p>
                ))}
              </div>
            </div>
          </div>
        </article>

        {simulationError ? <p className="text-sm text-red-400">{simulationError}</p> : null}
      </section>

      {showRerunModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRerunModal(false)} />
          <section className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220]">
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Revisit Simulation</h3>
                <p className="text-xs text-slate-400">Update fields and rerun, or create a new version.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRerunModal(false)}
                className="rounded-full border border-slate-700 p-1.5 text-slate-400 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Startup Name">
                  <input value={rerunDraft.startup_name || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, startup_name: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Target Audience">
                  <input value={rerunDraft.target_audience || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, target_audience: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Target Segment">
                  <input value={rerunDraft.primary_target_segment || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, primary_target_segment: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Geography">
                  <input value={rerunDraft.geography || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, geography: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Monthly Burn">
                  <input value={rerunDraft.monthly_burn || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, monthly_burn: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Current Cash">
                  <input value={rerunDraft.current_cash_in_hand || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, current_cash_in_hand: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Marketing Strategy" className="md:col-span-2">
                  <textarea rows={2} value={rerunDraft.marketing_strategy || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, marketing_strategy: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Problem Statement" className="md:col-span-2">
                  <textarea rows={3} value={rerunDraft.problem_statement || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, problem_statement: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
                <Field label="Customer Pain Points" className="md:col-span-2">
                  <textarea rows={3} value={rerunDraft.customer_behavior_pain_points || ""} onChange={(e) => setRerunDraft((d) => ({ ...d, customer_behavior_pain_points: e.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                </Field>
              </div>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => runRerun(false)}
                disabled={isRunning}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${isRunning ? "bg-slate-700 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-500"}`}
              >
                {isRunning ? "Running..." : "Rerun Simulation"}
              </button>
              <button
                type="button"
                onClick={() => runRerun(true)}
                disabled={isRunning}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${isRunning ? "bg-slate-700 text-slate-500" : "bg-emerald-500 text-black hover:bg-emerald-400"}`}
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
    <article className="rounded-lg border border-slate-800 bg-[#0f1118] p-3 max-h-[20rem] overflow-auto">
      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="text-sm text-slate-200">{value || "Not provided"}</p>
    </article>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={className}>
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      {children}
    </label>
  );
}
