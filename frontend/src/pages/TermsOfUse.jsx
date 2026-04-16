import { CheckCircle2, Shield, Scale, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import ExternalFooter from "../components/layout/ExternalFooter";
import ExternalNavbar from "../components/layout/ExternalNavbar";

const railItems = [
  { id: "overview", label: "Overview" },
  { id: "scope", label: "Scope of Service" },
  { id: "usage", label: "Acceptable Use" },
  { id: "output", label: "Output Boundaries" },
  { id: "security", label: "Security Commitments" },
  { id: "liability", label: "Liability" },
];

export default function TermsOfUsePage() {
  return (
    <div className="legal-page min-h-screen">
      <div className="landing-ambient pointer-events-none fixed inset-0" />
      <ExternalNavbar variant="legal" active="legal" />

      <main className="relative z-10 mx-auto max-w-[1280px] px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="legal-sidebar h-fit rounded-3xl border p-5 lg:sticky lg:top-24">
            <p className="legal-title text-xl font-semibold">Terms Protocol</p>
            <p className="legal-copy mt-1 text-[11px] uppercase tracking-[0.18em]">Last Updated: Apr 2026</p>
            <div className="mt-5 space-y-2">
              {railItems.map((item, idx) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`legal-nav-item ${idx === 0 ? "is-active" : ""} block rounded-lg border px-3 py-2 text-sm`}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="legal-divider mt-6 border-t pt-4">
              <p className="legal-copy text-sm">Support</p>
              <p className="legal-copy mt-2 text-sm">Export Terms PDF</p>
            </div>
          </aside>

          <section className="space-y-8">
            <header id="overview">
              <h1 className="legal-title text-5xl font-semibold leading-tight sm:text-6xl">
                Terms of <span className="legal-title-accent">Use</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="legal-chip inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]">
                  v3.9.0
                </span>
                <span className="legal-copy">Effective Date: April 16, 2026</span>
              </div>
              <article className="legal-panel mt-5 rounded-3xl border p-5 sm:p-6">
                <p className="legal-copy text-lg leading-relaxed">
                  These terms govern use of PentraAI simulations, reports, and workspace collaboration. You retain ownership
                  of your content while we provide intelligence infrastructure under secure access controls.
                </p>
              </article>
            </header>

            <section id="scope" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">01</span> Scope of Service
              </h2>
              <article className="legal-panel rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-xl font-semibold">
                  <FileText size={18} className="legal-title-accent" />
                  AI Simulation and Reporting Platform
                </p>
                <p className="legal-copy mt-2 text-sm">
                  PentraAI offers strategy simulation, report generation, and planning collaboration for founders, operators,
                  and approved team members.
                </p>
              </article>
            </section>

            <section id="usage" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">02</span> Acceptable Use
              </h2>
              <article className="legal-mini-card rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-lg font-semibold">
                  <CheckCircle2 size={18} className="legal-title-accent" />
                  Required Conduct
                </p>
                <p className="legal-copy mt-2 text-sm">
                  Use the platform lawfully, keep credentials secure, and upload only authorized content.
                </p>
              </article>
              <article className="legal-mini-card rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-lg font-semibold">
                  <AlertTriangle size={18} className="legal-title-accent" />
                  Prohibited Conduct
                </p>
                <p className="legal-copy mt-2 text-sm">
                  Do not attempt to bypass security controls, inject malicious content, or abuse infrastructure resources.
                </p>
              </article>
            </section>

            <section id="output" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">03</span> Output Boundaries
              </h2>
              <article className="legal-panel rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-xl font-semibold">
                  <Scale size={18} className="legal-title-accent" />
                  Decision-Support Intelligence
                </p>
                <p className="legal-copy mt-2 text-sm">
                  Platform outputs are decision-support material and not legal, tax, compliance, or investment advice.
                  Final decisions and implementation responsibility remain with your team.
                </p>
              </article>
            </section>

            <section id="security" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">04</span> Security Commitments
              </h2>
              <article className="legal-stat-card rounded-3xl border p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="legal-title-accent text-3xl font-semibold">E2E Paths</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">Data in Transit</p>
                  </div>
                  <div>
                    <p className="legal-title-accent text-3xl font-semibold">AES-256</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">At Rest</p>
                  </div>
                  <div>
                    <p className="legal-title-accent text-3xl font-semibold">RBAC</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">Access Governance</p>
                  </div>
                </div>
                <p className="legal-copy mt-5 text-sm">
                  We maintain end-to-end encryption pathways in transport boundaries and encryption at rest for stored data,
                  alongside role-based access and monitoring.
                </p>
              </article>
            </section>

            <section id="liability" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">05</span> Liability and Updates
              </h2>
              <article className="legal-cta rounded-3xl border p-6">
                <p className="legal-title flex items-center gap-2 text-2xl font-semibold">
                  <Shield size={20} className="legal-title-accent" />
                  Liability Boundary
                </p>
                <p className="legal-copy mt-2 text-sm">
                  To the maximum extent permitted by law, PentraAI is not liable for indirect or consequential losses from
                  platform use.
                </p>
              </article>
              <article className="legal-panel rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-lg font-semibold">
                  <RefreshCw size={16} className="legal-title-accent" />
                  Terms Updates
                </p>
                <p className="legal-copy mt-2 text-sm">
                  We may revise these terms as product capabilities evolve. Material updates are reflected on this page.
                </p>
              </article>
            </section>

            <section className="legal-cta flex flex-col justify-between gap-4 rounded-3xl border p-6 md:flex-row md:items-center">
              <div>
                <p className="legal-title text-2xl font-semibold">Need privacy specifics?</p>
                <p className="legal-copy mt-2 text-sm">Review data handling, retention, and controls in the Privacy Policy.</p>
              </div>
              <Link to="/privacy-policy" className="legal-command-btn inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold">
                Open Privacy Policy
              </Link>
            </section>
          </section>
        </div>
      </main>

      <ExternalFooter variant="legal" />
    </div>
  );
}

