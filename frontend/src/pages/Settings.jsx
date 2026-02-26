// src/pages/Settings.jsx

import { useState } from "react";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-slate-400 text-sm">
          Configure your platform preferences
        </p>
      </div>

      {/* Preferences Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg space-y-8">

        {/* Notifications */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-slate-400">
              Receive updates about simulations and analysis
            </p>
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

        {/* Dark Mode */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium">Dark Mode</h3>
            <p className="text-sm text-slate-400">
              Toggle between light and dark interface
            </p>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
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

      {/* Danger Zone */}
      <div className="bg-slate-900 border border-red-800 rounded-2xl p-8 shadow-lg">
        <h3 className="text-red-400 font-semibold mb-4">
          Danger Zone
        </h3>

        <button className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl transition">
          Delete Account
        </button>
      </div>

    </div>
  );
}
