import { BarChart3, Briefcase, SearchCheck, Sparkles, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

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
  const { isAuthenticated } = useAuthStore();
  const ctaHref = isAuthenticated ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
              <Sparkles size={14} />
            </div>
            PentraAI
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <Link to="/#product" className="hover:text-slate-900">Product</Link>
            <Link to="/about" className="font-semibold text-slate-900">About</Link>
            <Link to="/#method" className="hover:text-slate-900">Methodology</Link>
            <Link to="/#pricing" className="hover:text-slate-900">Pricing</Link>
          </nav>
          <Link to={ctaHref} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            Sign Up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-14">
        <section>
          <p className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            The Mission
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight">
            Bridging the gap between
            <span className="text-blue-600"> intuition</span> and <span className="underline decoration-slate-800">execution</span>.
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-slate-600">
            PentraAI was built for founders. We transform high-level vision into clinical, data-driven simulations,
            allowing entrepreneurs to stress-test their strategies before they ever hit the market.
          </p>
          <div className="mt-10 rounded-2xl border border-slate-200 bg-[linear-gradient(120deg,#edf3ff,#e8eef7)] p-10">
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-12 w-12 rounded-lg bg-slate-400/35" />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">The Methodology</p>
          <div className="mt-7 grid gap-6 md:grid-cols-3">
            {methodology.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-full bg-slate-100 p-3 text-slate-700">
                  <item.icon size={16} />
                </div>
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-slate-800 bg-[#081327] p-8 text-white">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <h2 className="text-4xl font-semibold">Built on Intelligence</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
                We blend Large Language Models with retrieval-augmented generation so decisions are grounded in evidence,
                not guesswork.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
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
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">The Vision</p>
            <blockquote className="mt-4 text-4xl font-medium leading-tight text-slate-800">
              "Our commitment is to startup growth. By providing institutional-grade intelligence to early-stage founders,
              we can significantly increase the success rate of new ventures worldwide."
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-300" />
              <div>
                <p className="font-semibold">Alexander Pentra</p>
                <p className="text-sm text-slate-600">Founding Partner</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <InfoCard title="Clinical Precision" body="No fluff. Only data-backed simulations that challenge your core assumptions." />
            <InfoCard title="Scalable Intelligence" body="Access the brainpower of a full strategy team at the touch of a button." />
          </div>
        </section>

        <section className="mt-16 border-t border-slate-200 pt-14 text-center">
          <h2 className="text-5xl font-semibold">Ready to test your strategy?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Join founders using PentraAI to build more resilient, data-driven businesses.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={ctaHref} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Experience the Future of Strategy
            </Link>
            <Link to="/login" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              View Sample Report
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required for trial simulation.</p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">PentraAI</p>
          <div className="flex items-center gap-5">
            <p>Privacy Policy</p>
            <p>Terms of Service</p>
            <p>Contact</p>
          </div>
          <p>&copy; 2024 PentraAI Systems Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function Panel({ title, subtitle, full = false }) {
  return (
    <div className={`rounded-xl border border-slate-700/80 bg-slate-900/50 p-5 ${full ? "md:col-span-2" : ""}`}>
      <p className="text-3xl font-semibold text-amber-300">{title}</p>
      <p className="mt-1 text-sm uppercase tracking-wider text-slate-300">{subtitle}</p>
    </div>
  );
}

function InfoCard({ title, body }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-base text-slate-600">{body}</p>
    </article>
  );
}
