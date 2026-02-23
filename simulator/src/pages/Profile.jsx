// src/pages/Profile.jsx

import { useAuthStore } from "../store/authStore";

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-slate-400 text-sm">
          Manage your personal information
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">

        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>

          <div>
            <h2 className="text-xl font-semibold">
              {user?.name || "User"}
            </h2>
            <p className="text-slate-400 text-sm">
              {user?.email}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              User ID: {user?.id}
            </p>
          </div>
        </div>

        {/* Editable Fields (UI Ready for API Integration) */}
        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Full Name
            </label>
            <input
              type="text"
              defaultValue={user?.name}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={user?.email}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
            />
          </div>

        </div>

        <div className="mt-8">
          <button className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl transition">
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
