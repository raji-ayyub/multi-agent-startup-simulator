import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";

export default function ResetPassword() {
  const { resetPasswordConfirm, isLoading } = useAuthStore();
  const { token } = useParams();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    await resetPasswordConfirm(token, formData.password);
  };

  return (
    <AuthLayout>
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1a] px-4">
        <div className="w-full max-w-md">

          {/* TOP LOGO */}
          <div className="flex justify-center mb-6">
            <img
              src="/images/reset.svg"
              alt="Logo"
              className="h-12 w-auto"
            />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold mb-2 text-center text-white">
            Reset Password
          </h2>
          <p className="text-gray-400 mb-8 text-center text-sm">
            Enter your new password to regain access to your account.
          </p>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-[#0f172a] p-10 rounded-2xl shadow-2xl shadow-black/40 border border-slate-800"
          >
            {/* New Password */}
            <div className="relative">
              <label className="block text-sm mb-2 text-gray-300">
                 Enter New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password"
                className="w-full bg-[#0b1220] border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
                required
              />
              <span
                className="absolute right-4 top-10 cursor-pointer text-gray-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-sm mb-2 text-gray-300">
                Confirm Password
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                className="w-full bg-[#0b1220] border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
                required
              />
              <span
                className="absolute right-4 top-10 cursor-pointer text-gray-400"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#CED87C] text-black font-semibold py-3 rounded-xl hover:opacity-90 transition"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>

            {/* Back to login - stays in the same div */}
            <p className="mt-4 text-center text-sm text-slate-400 flex items-center justify-center gap-1">
              <img
                src="/images/backicon.svg"
                alt="back icon"
                className="h-4 w-4"
              />
              <Link to="/login" className="text-white hover:underline">
                Back to login
              </Link>
            </p>

          </form>

          {/* Security Section */}
          <p className="mt-6 text-xs text-slate-600 text-center tracking-wide">
            SECURED BY PENTRA PROTOCOL
          </p>

          <div className="flex justify-center items-center gap-4 mt-3">
            <img
              src="/images/shield-check.svg"
              alt="security logo 1"
              className="h-6 w-auto opacity-70"
            />
            <img
              src="/images/shield.svg"
              alt="security logo 2"
              className="h-6 w-auto opacity-70"
            />
            <img
              src="/images/shield-key.svg"
              alt="security logo 3"
              className="h-6 w-auto opacity-70"
            />
          </div>

        </div>
      </div>
    </AuthLayout>
  );
}