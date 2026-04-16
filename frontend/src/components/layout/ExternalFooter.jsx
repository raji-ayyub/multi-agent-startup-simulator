import { Link } from "react-router-dom";

export default function ExternalFooter({ id, variant = "default" }) {
  const isLegal = variant === "legal";

  return (
    <footer id={id} className={`${isLegal ? "legal-footer" : "landing-footer"} relative z-10 border-t`}>
      <div className="mx-auto grid max-w-[1160px] gap-8 px-5 py-10 md:grid-cols-4">
        <div>
          <p className={`${isLegal ? "legal-title" : "landing-heading"} text-base font-semibold`}>PentraAI</p>
          <p className={`${isLegal ? "legal-copy" : "landing-muted"} mt-3 text-sm`}>
            Strategic simulation infrastructure for founders, operators, and venture teams.
          </p>
        </div>

        <div>
          <p className={`${isLegal ? "legal-title" : "landing-heading"} text-sm font-semibold`}>Company</p>
          <div className={`${isLegal ? "legal-copy" : "landing-muted"} mt-3 space-y-2 text-sm`}>
            <Link to="/about" className={`block ${isLegal ? "legal-topbar-link" : "landing-nav-link"}`}>About</Link>
            <a href="/#method" className={`block ${isLegal ? "legal-topbar-link" : "landing-nav-link"}`}>Methodology</a>
            <a href="/#product" className={`block ${isLegal ? "legal-topbar-link" : "landing-nav-link"}`}>Product</a>
          </div>
        </div>

        <div>
          <p className={`${isLegal ? "legal-title" : "landing-heading"} text-sm font-semibold`}>Legal</p>
          <div className={`${isLegal ? "legal-copy" : "landing-muted"} mt-3 space-y-2 text-sm`}>
            <Link to="/terms-of-use" className={`block ${isLegal ? "legal-topbar-link" : "landing-nav-link"}`}>Terms of Use</Link>
            <Link to="/privacy-policy" className={`block ${isLegal ? "legal-topbar-link" : "landing-nav-link"}`}>Privacy Policy</Link>
            {isLegal ? <p className="legal-copy text-xs">Ethics Framework</p> : null}
          </div>
        </div>

        <div>
          <p className={`${isLegal ? "legal-title" : "landing-heading"} text-sm font-semibold`}>Contact</p>
          <div className={`${isLegal ? "legal-copy" : "landing-muted"} mt-3 space-y-2 text-sm`}>
            <p>Security Disclosure</p>
            <p>Crisis Response</p>
            {isLegal ? (
              <div className="legal-chip mt-3 inline-flex rounded-xl border px-3 py-2 text-xs font-semibold">
                Verified Secure
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className={`${isLegal ? "legal-copy" : "app-muted"} mx-auto max-w-[1160px] px-5 pb-8 text-center text-xs`}>
        &copy; 2026 PentraAI. Sovereign intelligence infrastructure.
      </p>
    </footer>
  );
}
