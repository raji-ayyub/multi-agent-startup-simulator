// src/pages/auth/Signup.jsx

import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const { signup, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Company",
  });

  const [emailValid, setEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "email") validateEmail(value);
    if (name === "password") evaluatePassword(value);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(regex.test(email));
  };

  const evaluatePassword = (password) => {
    const rules = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[\W]/.test(password),
    };

    setPasswordRules(rules);

    const passed = Object.values(rules).filter(Boolean).length;

    if (passed === 4) setPasswordStrength("Strong");
    else if (passed >= 2) setPasswordStrength("Medium");
    else if (password.length > 0) setPasswordStrength("Weak");
    else setPasswordStrength("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailValid) return alert("Enter a valid email.");
    if (passwordStrength !== "Strong")
      return alert("Password must meet all requirements.");

    await signup(formData);
  };

  const strengthColor = {
    Weak: "bg-red-500",
    Medium: "bg-yellow-400",
    Strong: "bg-green-500",
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-black text-white">

      {/* ================= LEFT PANEL ================= */}
      <div className="hidden md:block relative overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 bg-[url('/images/business-suit.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/70" />

        {/* Logo */}
        <div className="absolute top-10 left-10 flex items-center gap-3 z-20">
          <img
            src="/images/pentralogo.jpg"
            alt="Logo"
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold">PentraAI</h1>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-16 py-20">

          <div className="flex flex-col justify-center flex-1 mt-24">
            <h2 className="text-5xl font-extrabold leading-tight max-w-xl">
              Supercharge your enterprise{" "}
              <span className="bg-white text-black px-3 py-1 rounded-md">
                workflow
              </span>{" "}
              with AI precision.
            </h2>

            <p className="mt-6 text-gray-300 max-w-md">
              Join over <span className="text-white font-semibold">500+ enterprises</span>{" "}
              scaling with PentraAI.
            </p>
          </div>

          {/* Trusted */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {["user1.jpg", "user2.jpg", "user3.jpg"].map((img, i) => (
                <img
                  key={i}
                  src={`/images/${img}`}
                  alt="team"
                  className="w-10 h-10 rounded-full object-cover border-2 border-black"
                />
              ))}
            </div>
            <p className="text-sm text-gray-400">
              Trusted by world-class teams
            </p>
          </div>

        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="flex items-center justify-end px-8 lg:px-20 py-12 bg-gradient-to-br from-black via-[#0b1220] to-black">

        <div className="w-full max-w-md bg-[#0b1220] rounded-2xl shadow-2xl p-8 border border-slate-800">

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Create Account</h2>
            <p className="text-gray-400 text-sm">
              Join the elite AI enterprise network
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm mb-2">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-2">Work Email</label>
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

            {/* Password */}
            <div className="relative">
              <label className="block text-sm mb-2">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-indigo-600 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-10 text-gray-400"
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
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm mb-2">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                <option value="Admin">Admin</option>
                <option value="Company">Company</option>
                <option value="Analyst">Analyst</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:opacity-90 transition"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>

          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already registered?{" "}
            <Link to="/login" className="text-white hover:underline">
              Log in
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}