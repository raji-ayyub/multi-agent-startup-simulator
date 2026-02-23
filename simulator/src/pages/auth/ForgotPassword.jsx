


import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout";

export default function ForgotPassword() {
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await resetPassword(email);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md ">

        {/* TOP LOGO */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/reset.svg" 
            alt="Logo" 
            className="h-12 w-auto"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Forgotpassword
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Enter the email associated with your account and we’ll send you a secure reset link.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-5 bg-[#0b1220] rounded-2xl shadow-2xl shadow-black/40 p-8 sm:p-10">

          {/* Email Input with Logo */}
          <div>
            <label className="block text-sm mb-2"> Email Address </label>

            <div className="relative">
              <img
                src="/images/Container.svg"
                alt="email logo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 object-contain opacity-70"
              />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#CED87C] text-black font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
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
    </AuthLayout>
  );
}