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
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0f1a]/92 p-6 shadow-2xl shadow-black/60 sm:p-8">
        <div className="flex justify-center mb-5">
          <img src="/images/reset.svg" alt="Reset" className="h-10 w-auto" />
        </div>

        <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
        <p className="text-slate-400 mb-7 text-center text-xs">
          Enter your new password to regain account access.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <label className="block text-xs mb-2 text-slate-300">New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-[#B8C45A] transition text-sm"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-8.5 text-slate-400"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <label className="block text-xs mb-2 text-slate-300">Confirm Password</label>
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter new password"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-[#B8C45A] transition text-sm"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-8.5 text-slate-400"
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
            className="w-full bg-[#CED87C] text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link to="/login" className="text-white hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
