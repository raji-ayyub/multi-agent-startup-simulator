import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";

export default function ResetPassword() {
  const { resetPasswordConfirm, isLoading, error } = useAuthStore();
  const { token } = useParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setSubmitError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    const success = await resetPasswordConfirm(token, formData.password);
    if (success) {
      navigate("/login");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-screen w-full max-w-sm">
        <div className="flex justify-center mb-5">
          <img src="/images/reset.svg" alt="Reset" className="h-10 w-auto" />
        </div>

        <h2 className="auth-deep-title mb-2 text-center text-2xl font-bold">Reset Password</h2>
        <p className="auth-deep-subtitle mb-7 text-center text-xs">
          Enter your new password to regain account access.
        </p>

        <form onSubmit={handleSubmit} className="auth-form-panel space-y-5 rounded-2xl border p-6 sm:p-8">
          <div className="relative">
            <label className="app-copy mb-2 block text-xs">New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className="auth-input w-full rounded-lg border px-3 py-2.5 pr-10 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
              required
            />
            <button
              type="button"
              className="auth-icon-btn absolute right-3 top-8.5"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <label className="app-copy mb-2 block text-xs">Confirm Password</label>
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
              className="auth-input w-full rounded-lg border px-3 py-2.5 pr-10 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
              required
            />
            <button
              type="button"
              className="auth-icon-btn absolute right-3 top-8.5"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {(submitError || error) && (
            <p className="text-xs text-red-400">{submitError || error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn w-full rounded-lg py-2.5 text-sm font-semibold transition"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="auth-deep-subtitle mt-6 text-center text-xs">
          <Link to="/login" className="auth-link hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
