import { useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSimulationStore from "../../store/simulationStore";
import { useAuthStore } from "../../store/authStore";

export default function Navbar() {
  const { overallScore } = useSimulationStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="app-topbar relative flex min-h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2 sm:px-5 lg:px-8">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold sm:text-base lg:text-lg">
          Multi-Agent Strategy Simulator
        </h2>
        <p className="app-copy hidden text-xs sm:block">Strategic Intelligence for Founders</p>
      </div>

      <div className="relative flex items-center gap-2 sm:gap-4">
        {overallScore !== null && (
          <div className="app-card-subtle hidden rounded-xl border px-3 py-1.5 text-xs sm:block sm:text-sm">
            Score:{" "}
            <span
              className={`font-semibold ${
                overallScore > 75 ? "text-green-400" : overallScore > 50 ? "text-yellow-400" : "text-red-400"
              }`}
            >
              {overallScore}/100
            </span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="app-ghost-btn relative rounded-lg border p-2 transition"
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
              2
            </span>
          </button>

          {showNotifications && (
            <div className="app-dropdown absolute right-0 z-50 mt-3 w-[min(18rem,calc(100vw-1.25rem))] rounded-xl border shadow-xl">
              <div className="app-divider border-b p-4 font-medium">Notifications</div>
              <div className="app-copy p-4 space-y-3 text-sm">
                <p>Simulation completed successfully</p>
                <p>Document analysis ready</p>
              </div>
              <div className="app-dropdown-item cursor-pointer rounded-b-xl p-3 text-center text-indigo-400">
                View All
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="app-card-subtle flex items-center gap-2 rounded-xl border px-2 py-1.5 transition sm:gap-3 sm:px-3 sm:py-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white sm:h-8 sm:w-8">
              {user?.name?.charAt(0) || "U"}
            </div>
            <span className="hidden md:block text-sm">{user?.name || "User"}</span>
          </button>

          {showUserMenu && (
            <div className="app-dropdown absolute right-0 z-50 mt-3 w-44 rounded-xl border shadow-xl sm:w-48">
              <button onClick={() => navigate("/profile")} className="app-dropdown-item w-full rounded-t-xl px-4 py-3 text-left">
                Profile
              </button>
              <button onClick={() => navigate("/settings")} className="app-dropdown-item w-full px-4 py-3 text-left">
                Settings
              </button>
              <div className="app-divider border-t" />
              <button onClick={handleLogout} className="app-dropdown-item w-full rounded-b-xl px-4 py-3 text-left text-red-400">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
