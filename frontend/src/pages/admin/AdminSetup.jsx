import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/layout/AuthLayout";
import { useAuthStore } from "../../store/authStore";

export default function AdminSetup() {
  const navigate = useNavigate();
  const { registerAdmin, isLoading, error } = useAuthStore();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    adminSecret: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await registerAdmin(form);
    if (result?.ok) navigate(result.route);
  };

  return (
    <AuthLayout>
      <div className="auth-screen auth-form-panel w-full max-w-sm p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h2 className="auth-deep-title mb-2 text-2xl font-bold">Private Admin Setup</h2>
          <p className="auth-deep-subtitle text-xs">
            Restricted bootstrap for platform governance and approval workflows.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Full Name" name="fullName" value={form.fullName} onChange={setForm} />
          <Field label="Email" name="email" value={form.email} onChange={setForm} type="email" />
          <Field label="Password" name="password" value={form.password} onChange={setForm} type="password" />
          <Field label="Admin Setup Secret" name="adminSecret" value={form.adminSecret} onChange={setForm} type="password" />

          {error ? <p className="text-xs text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn w-full rounded-lg py-2.5 text-sm font-semibold transition"
          >
            {isLoading ? "Setting up..." : "Create Admin Workspace"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="app-copy mb-2 block text-xs">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))}
        className="auth-input w-full rounded-lg border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
        required
      />
    </div>
  );
}
