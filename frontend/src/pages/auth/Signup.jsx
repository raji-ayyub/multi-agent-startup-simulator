// src/pages/auth/Signup.jsx
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";

export default function Signup() {
  const { signup, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "FOUNDER",
  });
  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsSummary, setShowTermsSummary] = useState(false);
  const [termsPromptReason, setTermsPromptReason] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setSubmitError("");

    if (name === "email") validateEmail(value);
    if (name === "password") evaluatePassword(value);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(regex.test(email));
  };

  const evaluatePassword = (password) => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    const passed = [isLongEnough, hasLetter, hasNumber, hasSymbol].filter(Boolean).length;
    if (passed >= 4) setPasswordStrength("Strong");
    else if (passed >= 2) setPasswordStrength("Medium");
    else if (password.length > 0) setPasswordStrength("Weak");
    else setPasswordStrength("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailValid) {
      setSubmitError("Enter a valid email address.");
      return;
    }
    if (formData.password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    if (!acceptedTerms) {
      setSubmitError("Please accept Terms of Use and Privacy Policy before continuing.");
      setTermsPromptReason("To create an account, please review and accept these terms.");
      setShowTermsSummary(true);
      return;
    }

    const result = await signup(formData);
    if (!result?.ok) {
      setSubmitError("Unable to create account.");
      return;
    }
    const fromPath = location.state?.from?.pathname
      ? `${location.state.from.pathname}${location.state.from.search || ""}${location.state.from.hash || ""}`
      : "";
    navigate(fromPath || result.route, { replace: true });
  };

  const strengthColor = {
    Weak: "bg-red-500",
    Medium: "bg-yellow-400",
    Strong: "bg-green-500",
  };

  return (
    <AuthLayout>
      <div className="auth-screen auth-form-panel w-full max-w-sm p-6 sm:p-8">
          <div className="mb-8 text-center">
            <h2 className="auth-deep-title text-2xl font-bold mb-2">Create Account</h2>
            <p className="auth-deep-subtitle text-xs">
              Join the next generation AI movement enterprise.
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
              <label className="app-copy mb-2 block text-xs">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="auth-input w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#B8C45A]"
                required
              />
            </div>

            <div>
              <label className="app-copy mb-2 block text-xs">Primary Workspace</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "FOUNDER", label: "Founder", hint: "Simulation-first access" },
                  { value: "OPERATOR", label: "Operator", hint: "Management-first access" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: option.value })}
                    className={`rounded-lg border px-3 py-3 text-left transition ${
                      formData.role === option.value ? "border-[#B8C45A] bg-[#0f1710]" : "border-slate-700"
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{option.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="app-copy mb-2 block text-xs">Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`auth-input w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600 ${
                  emailValid ? "border-slate-700" : "border-red-500"
                }`}
                required
              />
              {!emailValid && (
                <p className="text-xs text-red-500 mt-1">
                  Invalid email address
                </p>
              )}
            </div>

            <div className="relative">
              <label className="app-copy mb-2 block text-xs">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="auth-input w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none focus:ring-1 focus:ring-[#B8C45A]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-icon-btn absolute right-3 top-8.5"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {passwordStrength && (
                <div className="auth-meter mt-2 h-2 overflow-hidden rounded-full">
                  <div
                    className={`h-full ${strengthColor[passwordStrength]} transition-all`}
                    style={{
                      width:
                        passwordStrength === "Weak"
                          ? "33%"
                          : passwordStrength === "Medium"
                          ? "66%"
                          : "100%",
                    }}
                  />
                </div>
              )}
              <p className="auth-deep-subtitle mt-2 text-[11px]">
                Use at least 8 characters. Add numbers or symbols for stronger security.
              </p>
            </div>

            {(submitError || error) && (
              <p className="text-xs text-red-400">{submitError || error}</p>
            )}

            <div className="app-card-subtle rounded-lg border p-3">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                    if (event.target.checked) setSubmitError("");
                  }}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="app-copy leading-relaxed">
                  I agree to PentraAI{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setTermsPromptReason("Quick highlights before account creation.");
                      setShowTermsSummary(true);
                    }}
                    className="auth-link underline"
                  >
                    Terms & Privacy highlights
                  </button>
                  .
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="auth-submit-btn w-full rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="auth-deep-subtitle mt-6 text-center text-xs">
            Already registered?{" "}
            <Link to="/login" className="auth-link hover:underline">
              Log in
            </Link>
          </div>
        </div>

      {showTermsSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <article className="auth-screen auth-form-panel w-full max-w-md rounded-2xl border p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="app-badge inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em]">
                  Before You Continue
                </p>
                <h3 className="auth-deep-title mt-3 text-lg font-semibold">Terms & Privacy Highlights</h3>
                {termsPromptReason ? <p className="auth-deep-subtitle mt-1 text-xs">{termsPromptReason}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setShowTermsSummary(false)}
                className="app-ghost-btn rounded-full border p-1.5"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs leading-relaxed">
              <p className="app-copy">
                PentraAI is built for founders sharing sensitive strategy plans. Your simulation and report content is
                handled under strict access controls.
              </p>
              <p className="app-copy inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                End-to-end encryption pathways in transport, plus encryption at rest for stored data.
              </p>
              <p className="app-copy">Outputs are decision-support intelligence, not legal or investment advice.</p>
              <p className="app-copy">You own your source content and can request report/content deletion where supported.</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link to="/terms-of-use" className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold">
                View Full Terms
              </Link>
              <Link to="/privacy-policy" className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold">
                View Full Privacy Policy
              </Link>
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsSummary(false);
                  setSubmitError("");
                }}
                className="app-primary-btn ml-auto rounded-lg px-3 py-2 text-xs font-semibold"
              >
                Accept and Continue
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </AuthLayout>
  );
}
