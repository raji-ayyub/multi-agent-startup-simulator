import { useEffect, useMemo, useState } from "react";
import { Bell, PlayCircle, Rocket, Search } from "lucide-react";
import EnvisioningModal from "../../components/EnvisioningModal";
import useSimulationStore from "../../store/simulationStore";
import { useAuthStore } from "../../store/authStore";

const scoreTone = (value) => {
  if (value == null) return "bg-slate-700";
  if (value >= 75) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-rose-500";
};

const initials = (name) =>
  String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function Dashboard() {
  const { user } = useAuthStore();
  const { dashboardMetrics, recentSimulations, overallScore, fetchSimulations } = useSimulationStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const firstName = useMemo(() => {
    const value = user?.fullName || user?.name || "Olivia";
    return value.split(" ")[0] || "Olivia";
  }, [user]);

  const metrics = [
    { key: "market", title: "Market Viability", value: dashboardMetrics?.marketViability ?? null },
    { key: "investor", title: "Investor Confidence", value: dashboardMetrics?.investorConfidence ?? null },
    { key: "customer", title: "Customer Demand", value: dashboardMetrics?.customerDemand ?? null },
  ];

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  return (
    <section className="h-full text-slate-100">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-5">
        <header className="rounded-xl border border-slate-800 bg-[#0d121a] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-white">Hello {firstName}</h1>
              <p className="mt-1 text-sm text-slate-400">Welcome to PentraAI</p>
            </div>
            <div className="flex items-center gap-2">
              <IconButton label="Search">
                <Search size={15} />
              </IconButton>
              <IconButton label="Notifications">
                <Bell size={15} />
              </IconButton>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[11px] font-semibold text-slate-200">
                {initials(user?.fullName || user?.name)}
              </div>
            </div>
          </div>
        </header>

        <article className="rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(54,84,138,0.28),_rgba(12,15,21,0.98)_64%)] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/40 text-slate-200">
            <Rocket size={19} />
          </div>
          <h2 className="text-xl font-semibold text-white">Ready to simulate your first startup idea?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Start your first analysis to unlock deep market visibility scores, investor confidence ratings, and
            customer demand insights.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <PlayCircle size={15} />
            Start New Simulation
          </button>
        </article>

        <section className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.key}
              className="rounded-xl border border-slate-800 bg-[#0f141d] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{metric.title}</h3>
                <span className="text-sm text-slate-300">{metric.value == null ? "--" : `${metric.value}%`}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreTone(metric.value)}`}
                  style={{ width: metric.value == null ? "0%" : `${metric.value}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {metric.value == null ? "Waiting for simulation data..." : "Updated from latest simulation run."}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-slate-800 bg-[#0d121a] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Recent Simulations</h3>
            <span className="text-xs text-slate-500">View All</span>
          </div>

          {recentSimulations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/35 px-4 py-12 text-center">
              <p className="text-sm text-slate-500">No simulations found. Launch your first simulation to see results here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentSimulations.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 md:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()} | {item.status}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="text-sm font-semibold text-blue-300">{item.score}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="rounded-xl border border-slate-800 bg-[#0d121a] px-4 py-3 text-xs text-slate-500">
          {overallScore == null
            ? "Run a simulation to generate an overall confidence score."
            : `Latest overall score: ${overallScore}/100`}
        </footer>
      </div>

      {isModalOpen ? <EnvisioningModal onClose={handleCloseModal} onSimulationLaunched={handleCloseModal} /> : null}
    </section>
  );
}

function IconButton({ label, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
    >
      {children}
    </button>
  );
}
