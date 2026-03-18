import { useEffect, useState } from "react";
import { Bell, Bot, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSimulationStore from "../../store/simulationStore";
import { useAuthStore } from "../../store/authStore";
import useNotificationStore from "../../store/notificationStore";

export default function Navbar() {
  const { overallScore } = useSimulationStore();
  const { user, logout } = useAuthStore();
  const { items, unreadCount, fetchNotifications, markOneRead } = useNotificationStore();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  const formatAudience = (item) => {
    if (item.audience_scope === "DIRECT") {
      return item.target_user_email ? `Direct to ${item.target_user_email}` : "Direct notification";
    }
    if (item.audience_scope === "ROLE") {
      return `Role inbox: ${item.target_role}`;
    }
    return "System-wide governance";
  };

  useEffect(() => {
    fetchNotifications({ limit: 50 });
  }, [fetchNotifications]);

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
        <p className="app-copy hidden text-xs sm:block">
          {user?.role === "OPERATOR" ? "Strategic intelligence for operating teams" : "Strategic intelligence for founders"}
        </p>
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

        <button
          type="button"
          onClick={() => navigate("/agents")}
          className="app-ghost-btn hidden rounded-lg border p-2 transition sm:inline-flex"
          aria-label="Agent Hub"
        >
          <Bot size={18} />
        </button>
        {user?.role === "ADMIN" ? (
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="app-ghost-btn hidden rounded-lg border p-2 transition sm:inline-flex"
            aria-label="Admin Dashboard"
          >
            <ShieldCheck size={18} />
          </button>
        ) : null}

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              if (!showNotifications) {
                fetchNotifications({ limit: 50 });
              }
            }}
            className="app-ghost-btn relative rounded-lg border p-2 transition"
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 rounded-full bg-red-500 px-1.5 text-xs text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="app-dropdown absolute right-0 z-50 mt-3 w-[min(18rem,calc(100vw-1.25rem))] rounded-xl border shadow-xl">
              <div className="app-divider border-b p-4 font-medium">Notifications</div>
              <div className="app-copy p-4 space-y-3 text-sm">
                {items.length === 0 ? (
                  <p>No notifications yet.</p>
                ) : (
                  items.slice(0, 4).map((item) => (
                    <button
                      key={item.notification_id}
                      type="button"
                      onClick={async () => {
                        if (!item.is_read) {
                          await markOneRead(item.notification_id);
                        }
                        setShowNotifications(false);
                        navigate(item.link || "/notifications");
                      }}
                      className="block w-full text-left"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      {isAdmin ? <p className="app-muted text-[11px]">{formatAudience(item)}</p> : null}
                      <p className="app-muted text-xs">{item.message}</p>
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false);
                  navigate("/notifications");
                }}
                className="app-dropdown-item w-full cursor-pointer rounded-b-xl p-3 text-center text-indigo-400"
              >
                View All
              </button>
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
              <button onClick={() => navigate("/agents")} className="app-dropdown-item w-full px-4 py-3 text-left">
                Agent Hub
              </button>
              <button onClick={() => navigate("/settings")} className="app-dropdown-item w-full px-4 py-3 text-left">
                Settings
              </button>
              {user?.role === "ADMIN" ? (
                <button onClick={() => navigate("/admin/dashboard")} className="app-dropdown-item w-full px-4 py-3 text-left">
                  Admin Dashboard
                </button>
              ) : null}
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
