import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function ExternalNavbar({ active = "", variant = "default" }) {
  const { isAuthenticated, user } = useAuthStore();
  const primaryHref = isAuthenticated
    ? user?.role === "OPERATOR"
      ? "/management"
      : user?.role === "ADMIN"
      ? "/admin/dashboard"
      : "/dashboard"
    : "/signup";

  const defaultNavItems = [
    { key: "product", label: "Product", href: "/#product" },
    { key: "about", label: "About", href: "/about" },
    { key: "methodology", label: "Methodology", href: "/#method" },
    { key: "pricing", label: "Pricing", href: "/#pricing" },
  ];

  const legalNavItems = [
    { key: "strategy", label: "Strategy", href: "/#product" },
    { key: "insights", label: "Insights", href: "/#method" },
    { key: "network", label: "Network", href: "/about" },
    { key: "mission", label: "Mission", href: "/#cases" },
    { key: "legal", label: "Legal", href: "/privacy-policy" },
  ];

  const navItems = variant === "legal" ? legalNavItems : defaultNavItems;
  const isLegal = variant === "legal";

  return (
    <header className={`${isLegal ? "legal-topbar" : "landing-header"} sticky top-0 z-20 border-b`}>
      <div className="mx-auto flex max-w-[1160px] items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2">
          {isLegal ? null : <img src="/images/Icon.svg" alt="Logo" className="landing-logo-badge h-8 w-8 rounded-lg p-1" />}
          <h1 className={`${isLegal ? "legal-title" : "landing-brand"} text-sm font-semibold tracking-wide`}>PentraAI</h1>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navItems.map((item) => (
            item.href.startsWith("/#") ? (
              <a
                key={item.key}
                href={item.href}
                className={`${isLegal ? "legal-topbar-link" : "landing-nav-link"} transition ${active === item.key ? "is-active font-semibold" : ""}`}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                to={item.href}
                className={`${isLegal ? "legal-topbar-link" : "landing-nav-link"} transition ${active === item.key ? "is-active font-semibold" : ""}`}
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLegal ? (
            <>
              <Link to={primaryHref} className="legal-command-btn rounded-full border px-4 py-2 text-xs font-semibold transition">
                Access Mission Control
              </Link>
              <div className="legal-avatar flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold">
                {(user?.name || user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            </>
          ) : (
            <>
              {!isAuthenticated ? (
                <Link to="/login" className="landing-ghost-btn rounded-full border px-4 py-2 text-xs font-semibold transition">
                  Sign In
                </Link>
              ) : null}
              <Link to={primaryHref} className="landing-primary-btn rounded-full px-4 py-2 text-xs font-semibold transition">
                {isAuthenticated ? "Open Workspace" : "Start Simulation"}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
