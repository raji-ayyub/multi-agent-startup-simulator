import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import AuthLayout from "../../components/layout/AuthLayout";

export default function Login() {
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(formData);
  };

  return (

     

      <AuthLayout>
         <div className="w-full max-w-md bg-[#0b1220] rounded-2xl shadow-2xl shadow-black/40 p-8 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back
            </h2>
            <p className="text-gray-400 text-sm">
              Log in to access your enterprise dashboard
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-4 mb-8">
            <button className="w-full border border-slate-700 py-3 rounded-lg hover:bg-slate-900 transition">
              Sign in with Google
            </button>

            <button className="w-full border border-slate-700 py-3 rounded-lg hover:bg-slate-900 transition">
              Single Sign-On (SSO)
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center mb-8">
            <div className="flex-1 h-px bg-slate-800"></div>
            <span className="px-4 text-xs text-slate-500 tracking-widest">
              OR CONTINUE WITH EMAIL
            </span>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm mb-2">Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-slate-400">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-white hover:underline">
              Sign up
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-600 text-center leading-relaxed">
            By continuing, you agree to PentraAI’s Terms and Privacy Policy.
          </p>

        </div>
      </AuthLayout>

     
  );
}