import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await resetPassword(email);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white">

      {/* ================= LEFT PANEL ================= */}
      <div className="hidden lg:block relative">
        <div className="absolute inset-0 bg-[url('/images/business-suit.jpg')] bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

        <div className="relative z-10 flex flex-col justify-between h-full px-16 py-20">
          <div>
            <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
              PentraAI
            </h1>
            <p className="text-xl text-gray-300 max-w-md leading-relaxed">
              Enterprise-grade AI infrastructure built for intelligent scaling.
              Join <span className="font-semibold text-white">500+ companies</span> optimizing smarter.
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-4">
              Trusted by innovative teams
            </p>
            <div className="flex -space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full border-2 border-white" />
              <div className="w-10 h-10 bg-gray-400 rounded-full border-2 border-white" />
              <div className="w-10 h-10 bg-gray-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-8">

        <div className="w-full max-w-md bg-[#0b1220] rounded-2xl shadow-2xl shadow-black/40 p-8 sm:p-10">

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Reset your password
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Enter the email associated with your account and we’ll send you a secure reset link.
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm mb-2">Work Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
            >
              {isLoading ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-slate-400">
            Remember your password?{" "}
            <Link to="/login" className="text-white hover:underline">
              Back to login
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-600 text-center tracking-wide">
            SECURED BY PENTRA PROTOCOL
          </p>

        </div>
      </div>
    </div>
  );
}