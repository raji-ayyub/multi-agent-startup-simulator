import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  CircleDot,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import ExternalNavbar from "../components/layout/ExternalNavbar";

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
  const { isAuthenticated, user } = useAuthStore();
  const primaryHref = isAuthenticated
    ? user?.role === "OPERATOR"
      ? "/management"
      : user?.role === "ADMIN"
      ? "/admin/dashboard"
      : "/dashboard"
    : "/signup";
  const secondaryHref = isAuthenticated ? (user?.role === "OPERATOR" ? "/management" : "/simulation") : "/login";

  return (
    <div className="landing-page marketing-page min-h-screen bg-[#05080f] text-slate-100">
      <div className="landing-ambient pointer-events-none fixed inset-0" />

      <ExternalNavbar />

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
            <p className="landing-muted mt-4 text-xs">
              Founder and operator workspaces now sit behind one governed platform with admin-approved agent access.
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
              {/* Header row */}
              <div className="flex items-center justify-between">
                <p className="landing-kicker text-[10px] uppercase tracking-[0.2em]">
                  Simulation Environment | Strategic Analysis
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-400" />
                  </span>
                  <span className="landing-accent-text text-[10px] font-medium tracking-wider">LIVE</span>
                </div>
              </div>

              <div className="landing-chart-panel mt-4 rounded-xl border p-4">
                {/* Primary metric + donut gauge */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="landing-muted text-[10px] uppercase tracking-widest">Success Probability</p>
                    <p className="landing-heading mt-1 text-4xl font-bold tracking-tight">84.2%</p>
                    <p className="mt-1 text-[10px] text-emerald-400">+3.1% from baseline run</p>
                  </div>
                  {/* Donut gauge: 84.2% fill */}
                  <svg width="60" height="60" viewBox="0 0 36 36" className="-rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="rgba(45,212,191,0.85)" strokeWidth="3.5"
                      strokeDasharray="74.1 13.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Sparkline */}
                <div className="my-3">
                  <svg viewBox="0 0 220 36" className="w-full landing-graph" style={{ height: 36 }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="hero-sg" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,32 L25,28 L50,30 L75,22 L100,18 L125,14 L150,10 L175,7 L200,4 L220,2"
                      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    />
                    <path
                      d="M0,32 L25,28 L50,30 L75,22 L100,18 L125,14 L150,10 L175,7 L200,4 L220,2 L220,36 L0,36 Z"
                      fill="url(#hero-sg)"
                    />
                  </svg>
                </div>

                {/* Per-agent scores */}
                <div className="grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {[
                    { agent: 'Market',   score: '8.1' },
                    { agent: 'Customer', score: '7.6' },
                    { agent: 'Investor', score: '9.0' },
                  ].map(({ agent, score }) => (
                    <div
                      key={agent}
                      className="rounded-lg p-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="mb-0.5 flex items-center gap-1">
                        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-teal-400" />
                        <span className="landing-muted text-[9px] uppercase tracking-wide">{agent}</span>
                      </div>
                      <p className="landing-heading text-sm font-semibold">
                        {score}<span className="landing-muted text-[9px]">/10</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent insight feed */}
              <div className="mt-3 space-y-1.5">
                <p className="landing-muted mb-2 text-[9px] uppercase tracking-[0.18em]">Latest Agent Signals</p>
                {[
                  { kind: 'up',   agent: 'Market',   text: 'Underserved SMB segment - low competitive density' },
                  { kind: 'warn', agent: 'Investor',  text: 'CAC payback exceeds 18-month benchmark' },
                  { kind: 'up',   agent: 'Customer',  text: 'NPS proxy strong - retention model viable' },
                ].map(({ kind, agent, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span
                      className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: kind === 'up' ? 'rgba(52,211,153,0.9)' : 'rgba(251,191,36,0.9)' }}
                    />
                    <p className="text-[10px] leading-snug">
                      <span className="landing-accent-text uppercase tracking-wide">{agent} - </span>
                      <span className="landing-muted">{text}</span>
                    </p>
                  </div>
                ))}
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
          <FooterCol
            title="Product"
            links={[
              { label: "Market Analysis" },
              { label: "Risk Modeling" },
              { label: "Pricing Engine" },
              { label: "API Reference" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "About Us", path: "/about" },
              { label: "Methodology", path: "/#method" },
              { label: "Terms of Use", path: "/terms-of-use" },
              { label: "Privacy Policy", path: "/privacy-policy" },
            ]}
          />
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
        {links.map((item) => (
          item.path ? (
            <Link key={item.label} to={item.path} className="block landing-nav-link">
              {item.label}
            </Link>
          ) : (
            <p key={item.label}>{item.label}</p>
          )
        ))}
      </div>
    </div>
  );
}
