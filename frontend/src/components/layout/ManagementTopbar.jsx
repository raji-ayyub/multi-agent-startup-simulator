import { Bell, Building2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const initials = (name) =>
  String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

export default function ManagementTopbar() {
  const { user } = useAuthStore();
  return (
    <header className="min-h-16 border-b border-slate-800 bg-[#060d16] px-3 py-2 sm:px-5 lg:px-8">
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-100 sm:text-base lg:text-lg">Startup Management Agentics</h2>
          <p className="hidden text-xs text-slate-400 sm:block">Execution planning and operating memory</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300"
          >
            <Bell size={15} />
          </button>
          <button
            type="button"
            aria-label="Workspace"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
          >
            <Building2 size={14} />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[11px] font-semibold text-slate-200">
            {initials(user?.fullName || user?.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
