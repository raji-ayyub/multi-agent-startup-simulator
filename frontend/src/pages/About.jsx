import { BarChart3, Briefcase, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import ExternalNavbar from "../components/layout/ExternalNavbar";
import ExternalFooter from "../components/layout/ExternalFooter";

const methodology = [
  {
    title: "Market Analyst",
    icon: BarChart3,
    body: "Scans global market trends and competitive landscapes in real-time to identify opportunities and structural risks.",
  },
  {
    title: "Customer Persona",
    icon: UsersRound,
    body: "Simulates behavioral profiles to validate product-market fit and pressure-test your value proposition.",
  },
  {
    title: "Investor Analyst",
    icon: Briefcase,
    body: "Evaluates scalability, unit economics, and risk through a venture-capital lens before founder meetings.",
  },
];

export default function About() {
  const { isAuthenticated, user } = useAuthStore();
  const ctaHref = isAuthenticated
    ? user?.role === "OPERATOR"
      ? "/management"
      : user?.role === "ADMIN"
      ? "/admin/dashboard"
      : "/dashboard"
    : "/signup";

  return (
    <div className="marketing-page min-h-screen">
      <div className="landing-ambient pointer-events-none fixed inset-0" />
      <ExternalNavbar active="about" />

      <main className="relative z-10 mx-auto max-w-[1100px] px-5 py-14">
        <section>
          <p className="app-status-warning inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            The Mission
          </p>
          <h1 className="app-heading mt-5 max-w-3xl text-5xl font-semibold leading-tight">
            Bridging the gap between
            <span className="app-marketing-accent"> intuition</span> and <span className="underline decoration-slate-400">execution</span>.
          </h1>
          <p className="app-copy mt-6 max-w-3xl text-xl leading-relaxed">
            PentraAI was built for founders. We transform high-level vision into clinical, data-driven simulations,
            allowing entrepreneurs to stress-test their strategies before they ever hit the market.
          </p>
          <div className="marketing-band mt-10 rounded-2xl border p-10">
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-12 w-12 rounded-lg bg-slate-400/35" />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <p className="app-marketing-accent text-xs font-semibold uppercase tracking-[0.25em]">The Methodology</p>
          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {methodology.map((item) => (
              <article key={item.title} className="marketing-card rounded-2xl border p-6">
                <div className="app-card-subtle app-copy mb-4 inline-flex rounded-full border p-3">
                  <item.icon size={16} />
                </div>
                <h3 className="app-heading text-2xl font-semibold">{item.title}</h3>
                <p className="app-copy mt-3 text-base leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-band mt-16 rounded-3xl border p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="app-heading text-4xl font-semibold">Built on Intelligence</h2>
              <p className="app-copy mt-4 text-lg leading-relaxed">
                We blend Large Language Models with retrieval-augmented generation so decisions are grounded in evidence,
                not guesswork.
              </p>
              <p className="app-copy mt-4 text-lg leading-relaxed">
                Our orchestration layer synthesizes conflicting stakeholder priorities into one clear strategic output.
              </p>
            </div>
            <div className="grid gap-3">
              <Panel title="RAG" subtitle="Contextual Logic" />
              <Panel title="LLM" subtitle="Inference Engine" />
              <Panel title="Multi-Agent Simulation" subtitle="Cooperative Intelligence" full />
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="app-marketing-accent text-xs font-semibold uppercase tracking-[0.25em]">The Vision</p>
            <blockquote className="app-heading mt-4 text-4xl font-medium leading-tight">
              "Our commitment is to startup growth. By providing institutional-grade intelligence to early-stage founders,
              we can significantly increase the success rate of new ventures worldwide."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="app-card-subtle h-10 w-10 rounded-full border" />
              <div>
                <p className="app-heading font-semibold">Raji Ayyub</p>
                <p className="app-copy text-sm">TeamLead</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <InfoCard title="Clinical Precision" body="No fluff. Only data-backed simulations that challenge your core assumptions." />
            <InfoCard title="Scalable Intelligence" body="Access the brainpower of a full strategy team at the touch of a button." />
          </div>
        </section>

        <section className="app-modal-section mt-16 border-t pt-14 text-center">
          <h2 className="app-heading text-5xl font-semibold">Ready to test your strategy?</h2>
          <p className="app-copy mx-auto mt-4 max-w-2xl text-lg">
            Join founders using PentraAI to build more resilient, data-driven businesses.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaHref} className="app-primary-btn rounded-xl px-6 py-3 text-sm font-semibold">
              Experience the Future of Strategy
            </Link>
            <Link to="/login" className="app-ghost-btn rounded-xl border px-6 py-3 text-sm font-semibold">
              View Sample Report
            </Link>
          </div>
          <p className="app-muted mt-4 text-sm">No credit card required for trial simulation.</p>
        </section>
      </main>

      <ExternalFooter />
    </div>
  );
}

function Panel({ title, subtitle, full = false }) {
  return (
    <div className={`app-card-subtle rounded-xl border p-5 ${full ? "md:col-span-2" : ""}`}>
      <p className="app-sim-accent text-3xl font-semibold">{title}</p>
      <p className="app-copy mt-1 text-sm uppercase tracking-wider">{subtitle}</p>
    </div>
  );
}

function InfoCard({ title, body }) {
  return (
    <article className="marketing-card rounded-2xl border p-6">
      <h3 className="app-heading text-xl font-semibold">{title}</h3>
      <p className="app-copy mt-2 text-base">{body}</p>
    </article>
  );
}
