import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";

export default function ForgotPassword() {
  const { resetPassword, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const success = await resetPassword(email);
    if (success) {
      setMessage("If this email exists, a reset link/token has been generated.");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-screen w-full max-w-sm">
        <div className="flex justify-center mb-5">
          <img src="/images/reset.svg" alt="Reset" className="h-10 w-auto" />
        </div>

        <div className="text-center mb-7">
          <h2 className="auth-deep-title text-2xl font-bold mb-2">Forgot Password</h2>
          <p className="auth-deep-subtitle text-xs leading-relaxed">
            Enter your email and we will issue a password reset token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-panel space-y-5 rounded-2xl border p-6 sm:p-8">
          <div>
            <label className="app-copy mb-2 block text-xs">Email Address</label>
            <div className="relative">
              <img
                src="/images/Container.svg"
                alt="email"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 object-contain opacity-70"
              />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="auth-input w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm transition focus:outline-none focus:ring-1 focus:ring-[#B8C45A]"
                required
              />
            </div>
          </div>

          {message && <p className="app-status-success rounded-lg px-3 py-2 text-xs">{message}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn w-full rounded-lg py-2.5 text-sm font-semibold transition"
          >
            {isLoading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <div className="auth-deep-subtitle mt-6 text-center text-xs">
          Remember your password?{" "}
          <Link to="/login" className="auth-link hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
