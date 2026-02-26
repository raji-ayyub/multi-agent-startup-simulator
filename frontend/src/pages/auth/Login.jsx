import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";

export default function Login() {
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) {
      navigate("/dashboard");
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-sm p-6 shadow-2xl shadow-black/60 sm:p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-slate-400 text-xs">
            Log in to access your enterprise dashboard
          </p>
        </div>

        <div className="flex flex-col space-y-2 mb-4">
          <button className="flex items-center justify-center bg-transparent text-white border border-slate-800 py-2 rounded-lg hover:opacity-90 transition text-sm">
            <img src="/images/google.svg" alt="Google Logo" className="w-4 h-4 mr-2" />
            Sign up with Google
          </button>
          <button className="flex items-center justify-center bg-transparent text-white border border-slate-800 py-2 rounded-lg hover:opacity-90 transition text-sm">
            <img src="/images/Key.svg" alt="SSO Logo" className="w-4 h-4 mr-2" />
            Single Sign-On (SSO)
          </button>
        </div>

        <div className="flex items-center mb-5">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="px-3 text-[10px] text-slate-500 tracking-[0.18em]">OR CONTINUE WITH EMAIL</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs mb-2 text-slate-300">Work Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#B8C45A] transition text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-2 text-slate-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-[#B8C45A] transition text-sm"
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
              <Link to="/forgot-password" className="text-xs text-yellow-200 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#CED87C] text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{" "}
          <Link to="/signup" className="text-yellow-200 hover:underline">
            Sign up
          </Link>
        </div>

        <p className="mt-6 text-[10px] text-slate-600 text-center leading-relaxed tracking-wide">
          By continuing, you agree to PentraAI Terms and Privacy Policy.
        </p>
      </div>
    </AuthLayout>
  );
}
