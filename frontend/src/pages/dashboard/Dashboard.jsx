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
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-5">
        <header className="hidden app-card rounded-xl border px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="app-heading text-[32px] font-semibold leading-tight">Hello {firstName}</h1>
              <p className="app-copy mt-1 text-sm">Welcome to PentraAI</p>
            </div>
            <div className="flex items-center gap-2">
              <IconButton label="Search">
                <Search size={15} />
              </IconButton>
              <IconButton label="Notifications">
                <Bell size={15} />
              </IconButton>
              <div className="app-avatar-shell flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold">
                {initials(user?.fullName || user?.name)}
              </div>
            </div>
          </div>
        </header>

        <article className="app-banner rounded-2xl border p-8 text-center">
          <div className="app-icon-chip mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border">
            <Rocket size={19} />
          </div>
          <h2 className="app-heading text-xl font-semibold">Ready to simulate your first startup idea?</h2>
          <p className="app-copy mx-auto mt-3 max-w-2xl text-sm leading-relaxed">
            Start your first analysis to unlock deep market visibility scores, investor confidence ratings, and
            customer demand insights.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="app-primary-btn mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
          >
            <PlayCircle size={15} />
            Start New Simulation
          </button>
        </article>

        <section className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.key}
              className="app-card-alt rounded-xl border px-4 py-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="app-muted text-[11px] uppercase tracking-[0.15em]">{metric.title}</h3>
                <span className="app-copy text-sm">{metric.value == null ? "--" : `${metric.value}%`}</span>
              </div>
              <div className="app-card-subtle h-2 rounded-full border">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreTone(metric.value)}`}
                  style={{ width: metric.value == null ? "0%" : `${metric.value}%` }}
                />
              </div>
              <p className="app-muted mt-3 text-xs">
                {metric.value == null ? "Waiting for simulation data..." : "Updated from latest simulation run."}
              </p>
            </article>
          ))}
        </section>

        <section className="app-card rounded-xl border p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="app-heading text-sm font-semibold">Recent Simulations</h3>
            <span className="app-muted text-xs">View All</span>
          </div>

          {recentSimulations.length === 0 ? (
            <div className="app-card-subtle rounded-xl border border-dashed px-4 py-12 text-center">
              <p className="app-muted text-sm">No simulations found. Launch your first simulation to see results here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recentSimulations.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="app-card-subtle grid gap-3 rounded-lg border px-4 py-3 md:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="app-heading text-sm font-medium">{item.name}</p>
                    <p className="app-muted text-xs">
                      {new Date(item.createdAt).toLocaleString()} | {item.status}
                    </p>
                  </div>
                  <p className="app-copy text-sm">Score</p>
                  <p className="text-sm font-semibold text-blue-300">{item.score}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="app-card app-muted rounded-xl border px-4 py-3 text-xs">
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
      className="app-ghost-btn flex h-8 w-8 items-center justify-center rounded-full border transition"
    >
      {children}
    </button>
  );
}
