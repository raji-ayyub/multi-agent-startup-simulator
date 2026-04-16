import { Database, Lock, ShieldCheck, Share2, UserCheck, Check } from "lucide-react";
import { Link } from "react-router-dom";
import ExternalFooter from "../components/layout/ExternalFooter";
import ExternalNavbar from "../components/layout/ExternalNavbar";

const railItems = [
  { id: "overview", label: "Overview" },
  { id: "collection", label: "Data Collection" },
  { id: "processing", label: "Processing" },
  { id: "security", label: "Security" },
  { id: "sharing", label: "Third Parties" },
  { id: "controls", label: "User Rights" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page min-h-screen">
      <div className="landing-ambient pointer-events-none fixed inset-0" />
      <ExternalNavbar variant="legal" active="legal" />

      <main className="relative z-10 mx-auto max-w-[1280px] px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="legal-sidebar h-fit rounded-3xl border p-5 lg:sticky lg:top-24">
            <p className="legal-title text-xl font-semibold">Privacy Protocol</p>
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
              <p className="legal-copy mt-2 text-sm">PDF Export</p>
            </div>
          </aside>

          <section className="space-y-8">
            <header id="overview">
              <h1 className="legal-title text-5xl font-semibold leading-tight sm:text-6xl">
                Privacy <span className="legal-title-accent">Policy</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="legal-chip inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]">
                  v4.2.1
                </span>
                <span className="legal-copy">Effective Date: April 16, 2026</span>
              </div>
              <article className="legal-panel mt-5 rounded-3xl border p-5 sm:p-6">
                <p className="legal-copy text-lg leading-relaxed">
                  This policy explains how PentraAI handles account, simulation, and report data. We do not sell your
                  strategic simulations, reports, or planning documents.
                </p>
              </article>
            </header>

            <section id="collection" className="space-y-5">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">01</span> What We Collect
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="legal-mini-card rounded-2xl border p-5">
                  <p className="legal-title flex items-center gap-2 text-lg font-semibold">
                    <UserCheck size={18} className="legal-title-accent" />
                    Identity Data
                  </p>
                  <p className="legal-copy mt-2 text-sm">
                    Account credentials, executive profiles, and organization affiliation required for secure command access.
                  </p>
                </article>
                <article className="legal-mini-card rounded-2xl border p-5">
                  <p className="legal-title flex items-center gap-2 text-lg font-semibold">
                    <Database size={18} className="legal-title-accent" />
                    Strategic Assets
                  </p>
                  <p className="legal-copy mt-2 text-sm">
                    Inputs used for simulations, planning scenarios, and generated intelligence reports. These remain your
                    intellectual property.
                  </p>
                </article>
              </div>
              <p className="legal-copy">
                We gather telemetry only to optimize performance and maintain system integrity. Personal identifiers are not
                linked to telemetry used for model quality improvements.
              </p>
            </section>

            <section id="processing" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">02</span> How We Use Data
              </h2>
              <article className="legal-panel rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-xl font-semibold">
                  <ShieldCheck size={18} className="legal-title-accent" />
                  Simulation Accuracy
                </p>
                <p className="legal-copy mt-2 text-sm">
                  Processing your variables through our orchestration engine to produce high-fidelity strategic forecasts
                  and risk assessments.
                </p>
              </article>
              <article className="legal-panel rounded-2xl border p-5">
                <p className="legal-title flex items-center gap-2 text-xl font-semibold">
                  <Lock size={18} className="legal-title-accent" />
                  System Security
                </p>
                <p className="legal-copy mt-2 text-sm">
                  Monitoring unauthorized access attempts and enforcing cross-tenant protections to prevent data leakage.
                </p>
              </article>
            </section>

            <section id="security" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">03</span> Security and Encryption
              </h2>
              <article className="legal-stat-card rounded-3xl border p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="legal-title-accent text-4xl font-semibold">AES-256</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">At Rest & In Transit</p>
                  </div>
                  <div>
                    <p className="legal-title-accent text-4xl font-semibold">SOC 2 II</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">Compliance Standard</p>
                  </div>
                  <div>
                    <p className="legal-title-accent text-4xl font-semibold">Zero Trust</p>
                    <p className="legal-copy text-xs uppercase tracking-[0.16em]">Access Boundaries</p>
                  </div>
                </div>
                <p className="legal-copy mt-5 text-sm">
                  All data is processed with layered cryptographic controls. If a physical server breach occurs, your
                  strategic documents remain unreadable without valid decryption pathways.
                </p>
              </article>
            </section>

            <section id="sharing" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">04</span> Data Sharing
              </h2>
              <p className="legal-copy">
                PentraAI does not engage in data monetization. We do not sell, rent, or trade intelligence assets to
                advertisers or data brokers.
              </p>
              <div className="space-y-3">
                <p className="legal-copy flex items-start gap-2">
                  <Check size={18} className="legal-title-accent mt-[1px] shrink-0" />
                  Sub-processors necessary for infrastructure under strict confidentiality and security audits.
                </p>
                <p className="legal-copy flex items-start gap-2">
                  <Check size={18} className="legal-title-accent mt-[1px] shrink-0" />
                  Legal mandates that meet constitutional and jurisdictional standards.
                </p>
              </div>
            </section>

            <section id="controls" className="space-y-4">
              <h2 className="legal-title text-4xl font-semibold">
                <span className="legal-section-number mr-2">05</span> Your Controls
              </h2>
              <article className="legal-cta flex flex-col justify-between gap-4 rounded-3xl border p-6 md:flex-row md:items-center">
                <div>
                  <p className="legal-title text-2xl font-semibold">Full Governance Interface</p>
                  <p className="legal-copy mt-2 max-w-2xl text-sm">
                    Manage data lifecycle, export report history, and request permanent deletion of account-level traces.
                  </p>
                </div>
                <Link to="/signup" className="legal-command-btn inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold">
                  Open Control Center
                </Link>
              </article>
            </section>
          </section>
        </div>
      </main>

      <ExternalFooter variant="legal" />
    </div>
  );
}

