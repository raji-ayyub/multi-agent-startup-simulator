import { useEffect, useState } from "react";
import { toast } from "sonner";

import useUIStore from "../store/uiStore";
import { useAuthStore } from "../store/authStore";

export default function Settings() {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    company_name: "",
    title: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setProfileForm({
      full_name: user?.fullName || "",
      company_name: user?.company_name || "",
      title: user?.title || "",
    });
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    const success = await updateProfile(profileForm);
    if (success) toast.success("Profile updated.");
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    const success = await changePassword(passwordForm);
    if (success) {
      toast.success("Password changed.");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="app-heading text-2xl font-semibold">Settings</h1>
        <p className="app-copy text-sm">
          Role-aware account settings for the {String(user?.role || "FOUNDER").toLowerCase()} workspace.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="app-card space-y-6 rounded-2xl border p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Full Name" value={profileForm.full_name} onChange={(value) => setProfileForm((current) => ({ ...current, full_name: value }))} />
          <Field label="Company Name" value={profileForm.company_name} onChange={(value) => setProfileForm((current) => ({ ...current, company_name: value }))} />
          <Field label="Role" value={user?.role || "FOUNDER"} readOnly />
          <Field label="Title" value={profileForm.title} onChange={(value) => setProfileForm((current) => ({ ...current, title: value }))} />
        </div>
        <button type="submit" disabled={isLoading} className="app-primary-btn rounded-xl px-6 py-3 transition">
          {isLoading ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="app-card space-y-8 rounded-2xl border p-8">
        <ToggleRow
          title="Email Notifications"
          body="Receive updates about simulations, workspace planning, and agent approval decisions."
          enabled={notificationsEnabled}
          onToggle={() => setNotificationsEnabled((current) => !current)}
        />
        <ToggleRow
          title="Dark Mode"
          body="Toggle between light and dark interface modes."
          enabled={theme === "dark"}
          onToggle={toggleTheme}
        />
      </div>

      <form onSubmit={handlePasswordChange} className="app-card rounded-2xl border border-red-800 p-8">
        <h3 className="mb-4 font-semibold text-red-400">Security</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
          />
          <Field
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
          />
        </div>
        <button type="submit" disabled={isLoading} className="app-danger-btn mt-6 rounded-xl px-6 py-3 transition">
          Update Password
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange = () => {}, type = "text", readOnly = false }) {
  return (
    <div>
      <label className="app-copy mb-2 block text-sm">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className="theme-input w-full rounded-lg border p-3"
      />
    </div>
  );
}

function ToggleRow({ title, body, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="app-heading font-medium">{title}</h3>
        <p className="app-copy text-sm">{body}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-7 w-14 items-center rounded-full p-1 transition ${enabled ? "bg-indigo-600" : "bg-slate-700"}`}
      >
        <div className={`h-5 w-5 rounded-full bg-white shadow-md transition ${enabled ? "translate-x-7" : ""}`} />
      </button>
    </div>
  );
}
