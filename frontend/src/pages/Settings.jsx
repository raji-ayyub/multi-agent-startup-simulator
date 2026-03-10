import { useState } from "react";
import useUIStore from "../store/uiStore";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { theme, toggleTheme } = useUIStore();
  const darkMode = theme === "dark";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="app-heading text-2xl font-semibold">Settings</h1>
        <p className="app-copy text-sm">Configure your platform preferences</p>
      </div>

      <div className="app-card space-y-8 rounded-2xl border p-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="app-heading font-medium">Email Notifications</h3>
            <p className="app-copy text-sm">Receive updates about simulations and analysis</p>
          </div>

          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
              notificationsEnabled ? "bg-indigo-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition ${
                notificationsEnabled ? "translate-x-7" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="app-heading font-medium">Dark Mode</h3>
            <p className="app-copy text-sm">Toggle between light and dark interface</p>
          </div>

          <button
            onClick={toggleTheme}
            className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
              darkMode ? "bg-indigo-600" : "bg-slate-700"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-md transform transition ${
                darkMode ? "translate-x-7" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div className="app-card rounded-2xl border border-red-800 p-8">
        <h3 className="mb-4 font-semibold text-red-400">Danger Zone</h3>

        <button className="app-danger-btn rounded-xl px-6 py-3 transition">
          Delete Account
        </button>
      </div>
    </div>
  );
}
