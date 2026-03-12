import { useAuthStore } from "../store/authStore";

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="app-heading text-2xl font-semibold">Profile</h1>
        <p className="app-copy text-sm">Workspace identity and account metadata.</p>
      </div>

      <div className="app-card rounded-2xl border p-8">
        <div className="mb-8 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name || "User"}</h2>
            <p className="app-copy text-sm">{user?.email}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-blue-300">
              {user?.role || "FOUNDER"} {user?.title ? `| ${user.title}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <InfoBlock label="Company" value={user?.company_name || "Not set"} />
          <InfoBlock label="Workspace Default" value={user?.role === "OPERATOR" ? "Management" : user?.role === "ADMIN" ? "Admin" : "Simulation"} />
          <InfoBlock label="Account Status" value={user?.is_active ? "Active" : "Inactive"} />
          <InfoBlock label="User ID" value={String(user?.id || "-")} />
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="app-card-subtle rounded-xl border p-4">
      <p className="app-muted text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
