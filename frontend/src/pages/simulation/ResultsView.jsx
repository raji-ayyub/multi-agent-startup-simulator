import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, Rocket, TrendingUp, Users, Wallet } from "lucide-react";
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
    recentSimulations,
    activeSimulation,
    isLoadingHistory,
    simulationError,
  } = useSimulationStore();

  const [elapsed] = useState(() => {
    const seconds = Math.floor((Date.now() / 1000) % 60);
    const minutes = Math.floor((Date.now() / 60000) % 60);
    const hours = Math.floor((Date.now() / 3600000) % 24);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  });

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

  return (
    <div className="grid gap-5 xl:grid-cols-[290px_1fr]">
      <aside className="rounded-2xl border border-[#3a320b] bg-[#090a0d] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#f6d30c]">Simulation History</h2>
        <div className="space-y-2">
          {recentSimulations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => fetchSimulationDetail(item.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                item.id === activeSimulation.simulation_id
                  ? "border-[#f6d30c] bg-[#1a1607]"
                  : "border-slate-800 bg-[#0f1117] hover:border-slate-600"
              }`}
            >
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#f6d30c] px-4 py-2.5 text-sm font-semibold text-black"
        >
          <Rocket size={14} />
          New Simulation
        </Link>
      </aside>

      <section className="space-y-4 rounded-2xl border border-[#3a320b] bg-[#0a0b10] p-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Simulation</p>
            <h1 className="text-3xl font-semibold text-white">PROJECT: {activeSimulation.startup_name}</h1>
          </div>
          <p className="text-sm text-slate-400">Elapsed Time {elapsed}</p>
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

        <article className="rounded-xl border border-[#6f5f10] bg-[linear-gradient(90deg,#2d2506,#11131a)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Strategic Verdict</p>
              <p className="mt-1 inline-flex rounded bg-[#f6d30c] px-2 py-1 text-[11px] font-semibold text-black">{confidenceLabel(score)}</p>
              <h2 className="mt-2 text-5xl font-bold text-white">{score >= 65 ? "PROCEED TO SEED" : "ITERATE BEFORE SCALE"}</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#f6d30c] px-5 py-3 text-sm font-semibold text-black">
              <Download size={16} />
              Download Full Strategy Deck
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{activeSimulation.synthesis}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#f6d30c]">Core Strengths</p>
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
    </div>
  );
}

function Panel({ title, value }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-[#0f1118] p-3">
      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="text-sm text-slate-200">{value || "Not provided"}</p>
    </article>
  );
}
