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
    <div className="landing-page marketing-page min-h-screen bg-[#05080f] text-slate-100">
      <div className="landing-ambient pointer-events-none fixed inset-0" />

      <header className="landing-header sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/Icon.svg" alt="Logo" className="landing-logo-badge h-8 w-8 rounded-lg p-1" />
            <h1 className="landing-brand text-sm font-semibold tracking-wide">PentraAI</h1>
          </Link>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            <a href="/#product" className="landing-nav-link transition">Product</a>
            <Link to="/about" className="landing-nav-link transition">About</Link>
            <a href="/#method" className="landing-nav-link transition">Methodology</a>
            <a href="/#pricing" className="landing-nav-link transition">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <Link to="/login" className="landing-ghost-btn rounded-full border px-4 py-2 text-xs font-semibold transition">
                Sign In
              </Link>
            ) : null}
            <Link to={primaryHref} className="landing-primary-btn rounded-full px-4 py-2 text-xs font-semibold transition">
              Start Simulation
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-[1160px] gap-8 px-5 pb-16 pt-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="landing-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
              <CircleDot size={12} />
              Multi-Agent Engine v2.4 Live
            </p>
            <h1 className="landing-heading mt-5 text-5xl font-semibold leading-[0.95] sm:text-6xl">
              Simulate Your Strategy.
              <span className="landing-highlight mt-1 block bg-clip-text text-transparent">
                Before You Spend a Dollar.
              </span>
            </h1>
            <p className="landing-copy mt-5 max-w-xl text-base leading-relaxed">
              PentraAI runs your startup idea through Market, Customer, and Investor agents to expose blind spots
              before you commit significant resources.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primaryHref} className="landing-primary-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition">
                Launch Your First Simulation
                <ArrowRight size={15} />
              </Link>
              <Link to={secondaryHref} className="landing-secondary-btn inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition">
                {isAuthenticated ? "Open Workspace" : "Watch Methodology"}
                <ChevronRight size={15} />
              </Link>
            </div>

            <p className="landing-muted mt-5 text-xs">Trusted by early-stage teams, operators, and venture studios.</p>
          </div>

          <div className="landing-hero-card rounded-2xl border p-4">
            <div className="landing-hero-inner rounded-xl border p-5">
              <p className="landing-kicker text-[10px] uppercase tracking-[0.2em]">Simulation Environment | Strategic Analysis</p>
              <div className="landing-chart-panel mt-6 h-64 rounded-xl border p-4">
                <div className="flex h-full items-end justify-between">
                  <div className="space-y-2 text-xs">
                    <p className="landing-accent-text">Probability of Success</p>
                    <p className="landing-heading text-2xl font-semibold">84.2%</p>
                    <p className="landing-muted">Live from simulated market conditions.</p>
                  </div>
                  <LineChart size={96} className="landing-graph" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="landing-band border-y py-16">
          <div className="mx-auto max-w-[1160px] px-5">
            <h2 className="landing-heading text-center text-4xl font-semibold">Executive-Grade Intelligence</h2>
            <p className="landing-copy mx-auto mt-3 max-w-2xl text-center">
              Orchestrated AI reasoning with startup-specific context, built for decisions that move capital and time.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {capabilityCards.map((card) => (
                <article key={card.title} className="landing-feature-card rounded-2xl border p-5">
                  <div className="landing-icon-chip mb-4 inline-flex rounded-lg border p-2">
                    <card.icon size={16} />
                  </div>
                  <h3 className="landing-heading text-lg font-semibold">{card.title}</h3>
                  <p className="landing-copy mt-2 text-sm leading-relaxed">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="method" className="mx-auto grid max-w-[1160px] gap-10 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="landing-heading text-4xl font-semibold leading-tight">
              The 4-Pillar Strategic
              <span className="landing-highlight block bg-clip-text text-transparent">Stress-Test</span>
            </h2>
            <div className="mt-7 space-y-5">
              {pillars.map((pillar, index) => (
                <article key={pillar.title} className="flex gap-3">
                  <div className="landing-step-badge mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="landing-heading text-base font-semibold">{pillar.title}</h3>
                    <p className="landing-copy mt-1 text-sm">{pillar.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="landing-side-card w-full max-w-sm rounded-3xl border p-7 text-center">
              <div className="landing-icon-chip mx-auto mb-4 inline-flex rounded-full border p-3">
                <ShieldCheck size={18} />
              </div>
              <h3 className="landing-heading text-2xl font-semibold">Agent Swarm Active</h3>
              <p className="landing-copy mt-2 text-sm">Ready to analyze millions of strategic data points in context.</p>
              <Link to={primaryHref} className="landing-primary-btn mt-6 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold transition">
                Initialize Model
              </Link>
            </div>
          </div>
        </section>

        <section id="cases" className="mx-auto max-w-[1160px] px-5 pb-16">
          <div className="landing-cta-panel rounded-3xl border p-8 sm:p-10">
            <h2 className="text-4xl font-semibold leading-tight text-white">Stop Guessing. Start Simulating.</h2>
            <p className="mt-4 max-w-2xl text-white/80">
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

      <footer id="pricing" className="landing-footer relative z-10 border-t">
        <div className="mx-auto grid max-w-[1160px] gap-10 px-5 py-12 md:grid-cols-4">
          <div>
            <p className="landing-heading text-base font-semibold">PentraAI</p>
            <p className="landing-muted mt-3 text-sm">
              Strategic simulation infrastructure for founders, operators, and venture teams.
            </p>
          </div>
          <FooterCol title="Product" links={["Market Analysis", "Risk Modeling", "Pricing Engine", "API Reference"]} />
          <FooterCol title="Company" links={["About Us", "Methodology", "Careers", "Privacy Policy"]} />
          <div>
            <p className="landing-heading text-sm font-semibold">Stay Informed</p>
            <div className="landing-input-shell mt-3 flex rounded-lg border px-3 py-2 text-sm">
              work@company.com
            </div>
            <button type="button" className="landing-primary-btn mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold transition">
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
      <p className="landing-heading text-sm font-semibold">{title}</p>
      <div className="landing-muted mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <p key={link}>{link}</p>
        ))}
      </div>
    </div>
  );
}
