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
      <div className="w-full max-w-sm  ">
        <div className="flex justify-center mb-5">
          <img src="/images/reset.svg" alt="Reset" className="h-10 w-auto" />
        </div>

        <div className="text-center mb-7">
          <h2 className="text-2xl font-bold mb-2">Forgot Password</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Enter your email and we will issue a password reset token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#0a0f1a]/92 p-6 shadow-2xl shadow-black/60 sm:p-8">
          <div>
            <label className="block text-xs mb-2 text-slate-300">Email Address</label>
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
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#B8C45A] transition text-sm"
                required
              />
            </div>
          </div>

          {message && <p className="text-xs text-[#CED87C]">{message}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#CED87C] text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm"
          >
            {isLoading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Remember your password?{" "}
          <Link to="/login" className="text-white hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
