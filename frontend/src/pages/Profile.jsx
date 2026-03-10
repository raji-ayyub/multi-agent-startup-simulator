import { useAuthStore } from "../store/authStore";

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="app-heading text-2xl font-semibold">Profile</h1>
        <p className="app-copy text-sm">Manage your personal information</p>
      </div>

      <div className="app-card rounded-2xl border p-8">
        <div className="mb-8 flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              {user?.name || "User"}
            </h2>
            <p className="app-copy text-sm">{user?.email}</p>
            <p className="app-muted mt-1 text-xs">User ID: {user?.id}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="app-copy mb-2 block text-sm">Full Name</label>
            <input type="text" defaultValue={user?.name} className="theme-input w-full rounded-lg border p-3" />
          </div>

          <div>
            <label className="app-copy mb-2 block text-sm">Email Address</label>
            <input type="email" defaultValue={user?.email} className="theme-input w-full rounded-lg border p-3" />
          </div>
        </div>

        <div className="mt-8">
          <button className="app-primary-btn rounded-xl px-6 py-3 transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
