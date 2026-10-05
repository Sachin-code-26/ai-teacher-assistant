// =============================================================
//  client/src/pages/Register.jsx
// =============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { authService } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.jsx";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "student",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const data = await authService.register(form);
      login(data.user);
      toast.success(`Account created! Welcome, ${data.user.firstName}!`);
      const dest =
        data.user.role === "teacher"
          ? "/teacher/dashboard"
          : "/student/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-bold text-slate-900 mb-1">Create an account</h2>
      <p className="text-sm text-slate-500 mb-6">Join AI Teacher Assistant</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              First name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text" name="firstName" value={form.firstName}
                onChange={handleChange} placeholder="Jane"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Last name
            </label>
            <input
              type="text" name="lastName" value={form.lastName}
              onChange={handleChange} placeholder="Smith"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              name="password" value={form.password}
              onChange={handleChange} placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">At least 6 characters</p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            I am a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            {["student", "teacher"].map((role) => (
              <label
                key={role}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 cursor-pointer text-sm font-medium capitalize transition-all ${
                  form.role === role
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio" name="role" value={role}
                  checked={form.role === role} onChange={handleChange}
                  className="sr-only"
                />
                {role}
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <FiUserPlus className="h-4 w-4" />
              Create account
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default Register;
