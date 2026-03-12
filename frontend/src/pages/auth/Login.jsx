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
    const result = await login(formData);
    if (result?.ok) {
      navigate(result.route);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-screen auth-form-panel w-full max-w-sm p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h2 className="auth-deep-title mb-2 text-2xl font-bold">Welcome back</h2>
          <p className="auth-deep-subtitle text-xs">
            Log in to access your enterprise dashboard
          </p>
        </div>

        <div className="mb-4 flex flex-col space-y-2">
          <button className="auth-social-btn flex items-center justify-center rounded-lg border py-2 text-sm transition hover:opacity-90">
            <img src="/images/google.svg" alt="Google Logo" className="w-4 h-4 mr-2" />
            Sign up with Google
          </button>
          <button className="auth-social-btn flex items-center justify-center rounded-lg border py-2 text-sm transition hover:opacity-90">
            <img src="/images/Key.svg" alt="SSO Logo" className="w-4 h-4 mr-2" />
            Single Sign-On (SSO)
          </button>
        </div>

        <div className="flex items-center mb-5">
          <div className="auth-divider h-px flex-1" />
          <span className="app-muted px-3 text-[10px] tracking-[0.18em]">OR CONTINUE WITH EMAIL</span>
          <div className="auth-divider h-px flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="app-copy mb-2 block text-xs">Work Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              className="auth-input w-full rounded-lg border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
              required
            />
          </div>

          <div>
            <label className="app-copy mb-2 block text-xs">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                className="auth-input w-full rounded-lg border px-3 py-2.5 pr-10 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-icon-btn absolute right-3 top-1/2 -translate-y-1/2 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="auth-link text-xs hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={isLoading} className="auth-submit-btn w-full rounded-lg py-2.5 text-sm font-semibold transition">
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-deep-subtitle mt-6 text-center text-xs">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link hover:underline">
            Sign up
          </Link>
        </div>
        <div className="auth-deep-subtitle mt-2 text-center text-[11px]">
          Need a governance workspace?{" "}
          <Link to="/admin/setup" className="auth-link hover:underline">
            Private admin setup
          </Link>
        </div>

        <p className="app-muted mt-6 text-center text-[10px] leading-relaxed tracking-wide">
          By continuing, you agree to PentraAI Terms and Privacy Policy.
        </p>
      </div>
    </AuthLayout>
  );
}
