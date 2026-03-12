import { Bell, Bot, CalendarDays, FileText, LayoutDashboard, LogOut, Settings, ShieldCheck, UserCircle2, Users2 } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

const adminTabs = [
  { title: "Overview", icon: LayoutDashboard, path: "/admin/dashboard?tab=overview" },
  { title: "Approvals", icon: ShieldCheck, path: "/admin/dashboard?tab=approvals" },
  { title: "Users", icon: Users2, path: "/admin/dashboard?tab=users" },
];

const systemItems = [
  { title: "Agent Hub", icon: Bot, path: "/agents" },
  { title: "Notifications", icon: Bell, path: "/notifications" },
  { title: "Reports", icon: FileText, path: "/reports" },
  { title: "Calendar", icon: CalendarDays, path: "/calendar" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export default function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="app-sidebar flex h-screen w-[264px] flex-col justify-between border-r border-slate-800 bg-[#060b10] px-4 py-5 text-slate-300">
      <div>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <img src="/images/Icon.svg" alt="Logo" className="landing-logo-badge h-8 w-8 rounded-lg p-1" />
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">Pentra Admin</h1>
              <p className="app-muted text-[11px]">Platform Governance</p>
            </div>
          </div>
        </div>

        <p className="app-muted mt-6 px-2 text-[10px] uppercase tracking-[0.2em]">Workspace</p>
        <nav className="mt-2 space-y-1.5">
          {adminTabs.map((item) => (
            <TabItem key={item.title} item={item} currentPath={`${location.pathname}${location.search}`} />
          ))}
        </nav>

        <p className="app-muted mt-6 px-2 text-[10px] uppercase tracking-[0.2em]">System</p>
        <nav className="mt-2 space-y-1.5">
          {systemItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="app-card-subtle flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left"
        >
          <div className="app-avatar-shell flex h-10 w-10 items-center justify-center rounded-full border">
            <UserCircle2 size={19} />
          </div>
          <div className="min-w-0">
            <p className="app-heading truncate text-sm font-medium">{user?.fullName || user?.name || "Platform Admin"}</p>
            <p className="app-muted truncate text-xs">{user?.title || "Administrator"}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="app-ghost-btn inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
        >
          <LogOut size={15} />
          Logout
        </button>
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

function TabItem({ item, currentPath }) {
  const Icon = item.icon;
  const isActive = currentPath === item.path;

  return (
    <NavLink
      to={item.path}
      className={`app-nav-link mx-1.5 flex items-center gap-2.5 border-l-4 border-transparent px-3 py-2 text-sm transition ${
        isActive ? "is-active" : ""
      }`}
    >
      <Icon size={15} />
      <span>{item.title}</span>
    </NavLink>
  );
}
