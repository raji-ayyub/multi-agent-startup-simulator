import { useState } from "react";
import { Bell, BarChart3, LayoutDashboard, Settings, Sparkles, UserCircle2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Simulations", icon: Sparkles, path: "/simulation" },
  { title: "Reports", icon: BarChart3, path: "/simulation/results" },
];

const systemItems = [
  { title: "Notifications", icon: Bell, path: "/notifications" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState("Simulation");

  return (
    <aside className="flex h-screen w-[248px] flex-col justify-between border-r border-slate-800 bg-[#070b11] px-4 py-5 text-slate-300">
      <div>
        <div className="px-2">
          <div className="flex items-center gap-2">
            <img
              src="/images/Icon.svg"
              alt="Logo"
              className="w-8 h-8 bg-black p-1 rounded-lg"
            />
            <h1 className="text-sm font-semibold tracking-wide text-[#E2E78D]">PentraAI</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">The Startup Consultant</p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {menuItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>

        <p className="mt-6 px-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">System</p>
        <nav className="mt-2 space-y-1.5">
          {systemItems.map((item) => (
            <NavItem key={item.title} title={item.title} icon={item.icon} path={item.path} />
          ))}
        </nav>

        <div className="mt-6 px-2">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 ">Mode</p>
          <div className="flex mt-4">
            {["Simulation", "Manage"].map((item, index) => {
              const isActive = mode === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`
                    flex-1 bg-slate-900 h-[2rem] px-3 py-1 text-[11px] font-medium transition
                    ${isActive ? "outline-8 z-10 outline-blue-400/20 border-slate-700 text-white" : "text-slate-400 hover:text-slate-200"}
                    ${index === 0 ? "rounded-l-full" : ""}
                    ${index === 1 ? "rounded-r-full" : ""}
                  `}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <article className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-100 to-slate-300 p-4 text-center text-slate-900">
          <p className="text-xs font-semibold leading-tight">AI FOR RESULT ANALYTICS</p>
          <button
            type="button"
            className="mt-3 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-semibold text-white transition hover:bg-black"
          >
            TRY NOW
          </button>
        </article>

        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-200">
            <UserCircle2 size={19} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{user?.fullName || user?.name || "Olivia Trent"}</p>
            <p className="text-xs text-slate-500">Dev Lead</p>
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
        `mx-1.5 flex items-center gap-2.5  px-3 py-2 text-sm transition ${
          isActive
            ? "border-l-4 border-blue-500/70  text-blue-500"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }`
      }
    >
      <Icon size={15} />
      <span>{title}</span>
    </NavLink>
  );
}
