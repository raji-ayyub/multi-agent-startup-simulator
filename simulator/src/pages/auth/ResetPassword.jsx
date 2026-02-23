import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-[url('/images/business-suit.jpg')] bg-cover bg-center bg-no-repeat"></div>

        {/* Gradient Overlay (Sharp, Not Blurry) */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80"></div>

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div>
            <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
              PentraAI
            </h1>
            <p className="text-lg leading-relaxed max-w-md text-gray-300">
              Secure your account and continue building with confidence.
              PentraAI delivers enterprise-grade AI workflows with precision,
              speed, and reliability.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-4 text-gray-400">
              Trusted by modern teams
            </p>
            <div className="flex -space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full border-2 border-white" />
              <div className="w-10 h-10 bg-gray-400 rounded-full border-2 border-white" />
              <div className="w-10 h-10 bg-gray-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md bg-[#0f172a] p-10 rounded-2xl shadow-2xl shadow-black/40 border border-slate-800">

          <h2 className="text-3xl font-bold mb-2 tracking-tight">
            Reset Password
          </h2>
          <p className="text-gray-400 mb-8">
            Enter your new password to regain access to your account.
          </p>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* New Password */}
            <div className="relative">
              <label className="block text-sm mb-2 text-gray-300">
                New Password
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {/* Back Link */}
          <p className="mt-6 text-center text-sm text-slate-400">
            <Link to="/login" className="text-white hover:underline">
              ← Back to Login
            </Link>
          </p>

          <p className="mt-8 text-xs text-slate-600 text-center tracking-wider">
            SECURED BY PENTRA PROTOCOL
          </p>
        </div>
      </div>
    </div>
  );
}