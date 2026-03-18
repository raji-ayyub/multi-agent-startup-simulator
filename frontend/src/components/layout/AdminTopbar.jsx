import { useEffect } from "react";
import { Bell, Settings, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import useNotificationStore from "../../store/notificationStore";

const titles = {
  overview: {
    title: "Platform Oversight",
    subtitle: "Govern users, agent approvals, and cross-workspace operating signals.",
  },
  approvals: {
    title: "Approval Queue",
    subtitle: "Review agent access requests and control governed tool activation.",
  },
  users: {
    title: "User Access",
    subtitle: "Adjust roles, account status, and operator metadata from one place.",
  },
};

export default function AdminTopbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { unreadCount, fetchNotifications } = useNotificationStore();

  const tab = searchParams.get("tab") || "overview";
  const header = titles[tab] || titles.overview;

  useEffect(() => {
    fetchNotifications({ limit: 50 });
  }, [fetchNotifications]);

  return (
    <header className="app-topbar min-h-16 border-b border-slate-800 bg-[#081018] px-3 py-3 sm:px-5 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="app-badge inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
              Governance Workspace
            </span>
            <span className="app-status-success inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold">
              <ShieldCheck size={11} />
              Admin Active
            </span>
          </div>
          <h2 className="app-heading mt-2 truncate text-lg font-semibold">{header.title}</h2>
          <p className="app-copy hidden text-xs sm:block">{header.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="app-ghost-btn relative rounded-lg border p-2 transition"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="app-ghost-btn rounded-lg border p-2 transition"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
