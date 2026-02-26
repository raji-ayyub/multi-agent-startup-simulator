import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  CircleDot,
  Compass,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const capabilityCards = [
  {
    title: "RAG-Enhanced Reasoning",
    body: "Each agent grounds recommendations using retrieved external context before generating output.",
    icon: Compass,
  },
  {
    title: "Multi-Step Evaluation",
    body: "Simulation orchestrates conflicting stakeholder priorities and resolves tradeoffs into clear direction.",
    icon: Brain,
  },
  {
    title: "Structured Strategic Output",
    body: "Get executive-ready summaries with risks, decisions, confidence levels, and practical next actions.",
    icon: BarChart3,
  },
];

const pillars = [
  {
    title: "Vision Formulation",
    body: "Stress-test your core problem framing, audience fit, and problem urgency assumptions.",
  },
  {
    title: "Market Synthesis",
    body: "Model segment behavior, competitor pressure, and geography-linked constraints before GTM bets.",
  },
  {
    title: "Unit Economics",
    body: "Pressure-test CAC, burn, and runway across alternative growth trajectories and risk scenarios.",
  },
  {
    title: "Risk Mitigation",
    body: "Surface weak assumptions early and identify failure modes before resources are committed.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuthStore();
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const secondaryHref = isAuthenticated ? "/simulation" : "/login";

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(36,86,198,0.23),transparent_35%),radial-gradient(circle_at_80%_8%,rgba(14,165,233,0.14),transparent_30%)]" />

      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#060a12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/Icon.svg"
              alt="Logo"
              className="w-8 h-8 bg-black p-1 rounded-lg"
            />
            <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">PentraAI</h1>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="#product" className="transition hover:text-slate-100">Product</a>
            <a href="#method" className="transition hover:text-slate-100">Methodology</a>
            <a href="#cases" className="transition hover:text-slate-100">Case Studies</a>
            <a href="#pricing" className="transition hover:text-slate-100">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Link to="/login" className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
                Sign In
              </Link>
            ) : null}
            <Link to={primaryHref} className="rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-cyan-400">
              Start Simulation
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-[1160px] gap-8 px-5 pb-16 pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-blue-300">
              <CircleDot size={12} />
              Multi-Agent Engine v2.4 Live
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.95] text-white sm:text-6xl">
              Simulate Your Strategy.
              <span className="mt-1 block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Before You Spend a Dollar.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
              PentraAI runs your startup idea through Market, Customer, and Investor agents to expose blind spots
              before you commit significant resources.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400">
                Launch Your First Simulation
                <ArrowRight size={15} />
              </Link>
              <Link to={secondaryHref} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500">
                {isAuthenticated ? "Open Workspace" : "Watch Methodology"}
                <ChevronRight size={15} />
              </Link>
            </div>

            <p className="mt-5 text-xs text-slate-500">Trusted by early-stage teams, operators, and venture studios.</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-[#081322] to-[#0f1c30] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
            <div className="rounded-xl border border-slate-700 bg-black/30 p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Simulation Environment | Strategic Analysis</p>
              <div className="mt-6 h-64 rounded-xl border border-cyan-500/20 bg-[radial-gradient(circle_at_50%_35%,rgba(45,212,191,0.24),transparent_58%),linear-gradient(to_bottom,rgba(15,23,42,0.35),rgba(2,6,23,0.85))] p-4">
                <div className="flex h-full items-end justify-between">
                  <div className="space-y-2 text-xs text-slate-300">
                    <p className="text-cyan-300">Probability of Success</p>
                    <p className="text-2xl font-semibold text-white">84.2%</p>
                    <p className="text-slate-500">Live from simulated market conditions.</p>
                  </div>
                  <LineChart size={96} className="text-cyan-200/80" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="border-y border-slate-800 bg-black py-16">
          <div className="mx-auto max-w-[1160px] px-5">
            <h2 className="text-center text-4xl font-semibold text-white">Executive-Grade Intelligence</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
              Orchestrated AI reasoning with startup-specific context, built for decisions that move capital and time.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {capabilityCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
                  <div className="mb-4 inline-flex rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300">
                    <card.icon size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="method" className="mx-auto grid max-w-[1160px] gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-4xl font-semibold leading-tight text-white">
              The 4-Pillar Strategic
              <span className="block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Stress-Test</span>
            </h2>
            <div className="mt-7 space-y-5">
              {pillars.map((pillar, index) => (
                <article key={pillar.title} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-500/50 text-xs text-blue-300">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{pillar.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{pillar.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900/40 p-7 text-center shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-4 inline-flex rounded-full border border-cyan-400/40 bg-cyan-400/10 p-3 text-cyan-300">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-2xl font-semibold text-white">Agent Swarm Active</h3>
              <p className="mt-2 text-sm text-slate-400">Ready to analyze millions of strategic data points in context.</p>
              <Link to={primaryHref} className="mt-6 inline-flex rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400">
                Initialize Model
              </Link>
            </div>
          </div>
        </section>

        <section id="cases" className="mx-auto max-w-[1160px] px-5 pb-16">
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-[#0e2d63] via-[#133a79] to-[#0a2d58] p-8 sm:p-10">
            <h2 className="text-4xl font-semibold leading-tight text-white">Stop Guessing. Start Simulating.</h2>
            <p className="mt-4 max-w-2xl text-slate-200/85">
              PentraAI helps founders move from intuition to evidence-backed execution. Launch your first strategy run today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={primaryHref} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                Start Your First Simulation
              </Link>
              <Link to="/login" className="rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Book Executive Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="pricing" className="relative z-10 border-t border-slate-800 bg-black">
        <div className="mx-auto grid max-w-[1160px] gap-10 px-5 py-12 md:grid-cols-4">
          <div>
            <p className="text-base font-semibold text-white">PentraAI</p>
            <p className="mt-3 text-sm text-slate-500">
              Strategic simulation infrastructure for founders, operators, and venture teams.
            </p>
          </div>
          <FooterCol title="Product" links={["Market Analysis", "Risk Modeling", "Pricing Engine", "API Reference"]} />
          <FooterCol title="Company" links={["About Us", "Methodology", "Careers", "Privacy Policy"]} />
          <div>
            <p className="text-sm font-semibold text-white">Stay Informed</p>
            <div className="mt-3 flex rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-500">
              work@company.com
            </div>
            <button type="button" className="mt-3 w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400">
              Subscribe
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-500">
        {links.map((link) => (
          <p key={link}>{link}</p>
        ))}
      </div>
    </div>
  );
}
