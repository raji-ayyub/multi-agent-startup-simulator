import { Bell, BriefcaseBusiness, ClipboardList, LineChart, Settings, UserCircle2 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import ModeSwitch from "./ModeSwitch";

const menuItems = [
  { title: "Management Home", icon: BriefcaseBusiness, path: "/management", end: true },
  { title: "Activity Planner", icon: ClipboardList, path: "/management/planner", end: true },
  { title: "Execution Signals", icon: LineChart, path: "/management/signals", end: true },
];

const systemItems = [
  { title: "Notifications", icon: Bell, path: "/notifications" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export default function ManagementSidebar() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="management-shell flex h-screen w-[248px] flex-col justify-between border-r border-slate-800 bg-[#070b11] px-4 py-5 text-slate-300">
      <div>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <img src="/images/Icon.svg" alt="Logo" className="h-8 w-8 rounded-lg bg-black p-1" />
            <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">Pentra Manage</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">Startup Management OS</p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {menuItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} end={item.end} />
          ))}
        </nav>

        <p className="mt-6 px-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">System</p>
        <nav className="mt-2 space-y-1.5">
          {systemItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>

        <div className="mt-6 px-2">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">Mode</p>
          <ModeSwitch mode="management" />
        </div>
      </div>

      <div className="space-y-4">
        <article className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-100 to-slate-300 p-4 text-center text-slate-900">
          <p className="text-xs font-semibold leading-tight">AGENTIC EXECUTION BOARD</p>
          <button
            type="button"
            onClick={() => navigate("/management/planner")}
            className="mt-3 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-black"
          >
            OPEN PLANNER
          </button>
        </article>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-200">
            <UserCircle2 size={19} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{user?.fullName || user?.name || "Olivia Trent"}</p>
            <p className="text-xs text-slate-500">Operations Lead</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ title, icon: Icon, path, end = false }) {
  return (
    <NavLink
      to={path}
      end={end}
      className={({ isActive }) =>
        `mx-1.5 flex items-center gap-2.5 px-3 py-2 text-sm transition ${
          isActive ? "border-l-4 border-blue-500/70 text-blue-500" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }`
      }
    >
      <Icon size={15} />
      <span>{title}</span>
    </NavLink>
  );
}
