// src/pages/auth/Signup.jsx
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout";

export default function Signup() {
  const { signup, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState("");

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

    const success = await signup(formData);
    if (!success) {
      setSubmitError("Unable to create account.");
    }
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
    </AuthLayout>
  );
}
