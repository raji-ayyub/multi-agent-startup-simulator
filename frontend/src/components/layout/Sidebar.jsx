import { Bell, Bot, BarChart3, CalendarDays, LayoutDashboard, Settings, Sparkles, UserCircle2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import ModeSwitch from "./ModeSwitch";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Simulations", icon: Sparkles, path: "/simulation/results" },
  { title: "Reports", icon: BarChart3, path: "/reports" },
  { title: "Calendar", icon: CalendarDays, path: "/calendar" },
];

const systemItems = [
  { title: "Agent Hub", icon: Bot, path: "/agents" },
  { title: "Notifications", icon: Bell, path: "/notifications" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const { user } = useAuthStore();

  return (
    <aside className="app-sidebar flex h-screen w-[248px] flex-col justify-between border-r border-slate-800 bg-[#070b11] px-4 py-5 text-slate-300">
      <div>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <img src="/images/Icon.svg" alt="Logo" className="landing-logo-badge h-8 w-8 rounded-lg p-1" />
            <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">PentraAI</h1>
          </div>
          <p className="app-muted mt-1 text-xs">The Startup Consultant</p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {menuItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>

        <p className="app-muted mt-6 px-2 text-[10px] uppercase tracking-[0.2em]">System</p>
        <nav className="mt-2 space-y-1.5">
          {systemItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>

        <div className="my-6 px-2">
          <p className="app-muted mb-2 text-[10px] uppercase tracking-[0.2em]">Mode</p>
          <ModeSwitch mode="simulation" />
        </div>
      </div>

      <div className="space-y-4">
        <article className="app-cta-card rounded-2xl border p-4 text-center">
          <p className="text-xs font-semibold leading-tight">AI FOR RESULT ANALYTICS</p>
          <button
            type="button"
            className="app-ghost-btn mt-3 rounded-full border px-4 py-1.5 text-[11px] font-semibold transition"
          >
            TRY NOW
          </button>
        </article>

        <div className="app-card-subtle flex items-center gap-2 rounded-xl border px-3 py-2.5">
          <div className="app-avatar-shell flex h-9 w-9 items-center justify-center rounded-full border">
            <UserCircle2 size={19} />
          </div>
          <div>
            <p className="app-heading text-sm font-medium">{user?.fullName || user?.name || "Olivia Trent"}</p>
            <p className="app-muted text-xs">{user?.title || (user?.role === "OPERATOR" ? "Operator" : "Founder")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ title, icon: Icon, path }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `app-nav-link mx-1.5 flex items-center gap-2.5 border-l-4 border-transparent px-3 py-2 text-sm transition ${
          isActive ? "is-active" : ""
        }`
      }
    >
      <Icon size={15} />
      <span>{title}</span>
    </NavLink>
  );
}
