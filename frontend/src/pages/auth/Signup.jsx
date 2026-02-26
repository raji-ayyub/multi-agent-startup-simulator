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
      <div className="w-full max-w-sm   p-6 shadow-2xl  sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Create Account</h2>
            <p className="text-slate-400 text-xs">
              Join the next generation AI movement enterprise.
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
              <label className="block text-xs mb-2 text-slate-300">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[#B8C45A] outline-none text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-2 text-slate-300">Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-[#0f172a] border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none ${
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
              <label className="block text-xs mb-2 text-slate-300">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2.5 pr-10 focus:ring-1 focus:ring-[#B8C45A] outline-none text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {passwordStrength && (
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
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
              <p className="mt-2 text-[11px] text-slate-400">
                Use at least 8 characters. Add numbers or symbols for stronger security.
              </p>
            </div>

            {(submitError || error) && (
              <p className="text-xs text-red-400">{submitError || error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#CED87C] text-black font-semibold py-2.5 rounded-lg hover:opacity-90 transition text-sm"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="text-yellow-200 hover:underline">
              Log in
            </Link>
          </div>
        </div>
    </AuthLayout>
  );
}
