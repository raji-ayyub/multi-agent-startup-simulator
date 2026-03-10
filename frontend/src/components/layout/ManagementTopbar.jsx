import { Bell, Building2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import useManagementStore from "../../store/managementStore";

const initials = (name) =>
  String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function ManagementTopbar() {
  const { user } = useAuthStore();
  const { isLoading, isSaving, isPlanning } = useManagementStore();
  const agentBusy = isLoading || isSaving || isPlanning;
  return (
    <header className="app-topbar management-shell min-h-16 border-b border-slate-800 bg-[#060d16] px-3 py-2 sm:px-5 lg:px-8">
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <h2 className="app-heading truncate text-sm font-semibold sm:text-base lg:text-lg">Startup Management Agentics</h2>
          <p className="app-copy hidden text-xs sm:block">Execution planning and operating memory</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              agentBusy ? "app-badge animate-pulse" : "app-status-success"
            }`}
          >
            {agentBusy ? "Agents Running" : "Agents Idle"}
          </span>
          <button
            type="button"
            aria-label="Notifications"
            className="app-avatar-shell flex h-8 w-8 items-center justify-center rounded-full border"
          >
            <Bell size={15} />
          </button>
          <button
            type="button"
            aria-label="Workspace"
            className="app-icon-chip flex h-8 w-8 items-center justify-center rounded-full border"
          >
            <Building2 size={14} />
          </button>
          <div className="app-avatar-shell flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold">
            {initials(user?.fullName || user?.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
