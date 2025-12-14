import React, { useState, useEffect, useCallback } from "react";
import { createPageUrl } from "@/utils";
import { Lock, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/408d5510b_ChatGPTImageNov19202501_00_30PM-Photoroom.png";

function getPasswordStrength(pass) {
  if (!pass) return { level: 0, text: "", color: "" };

  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { level: 1, text: "Weak", color: "bg-red-500" };
  if (score === 2) return { level: 2, text: "Fair", color: "bg-yellow-500" };
  if (score === 3) return { level: 3, text: "Good", color: "bg-blue-500" };
  return { level: 4, text: "Strong", color: "bg-green-500" };
}

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [tokenChecked, setTokenChecked] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Read reset token from URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token") || "";
      setToken(urlToken);
    } catch (err) {
      console.error("Could not read reset token:", err);
    } finally {
      setTokenChecked(true);
    }
  }, []);

  const validateForm = useCallback(() => {
    let valid = true;
    setPasswordError("");
    setConfirmError("");

    if (!password || password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      valid = false;
    }

    if (password && !/[A-Z]/.test(password)) {
      setPasswordError((prev) =>
        prev
          ? prev + ". Add at least one uppercase letter"
          : "Add at least one uppercase letter"
      );
      valid = false;
    }

    if (password && !/[0-9]/.test(password)) {
      setPasswordError((prev) =>
        prev
          ? prev + " and one number"
          : "Add at least one number"
      );
      valid = false;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      valid = false;
    }

    return valid;
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("This reset link is not valid. Request a new one.");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setLoading(true);

    try {
      // In production, this would call a secure password reset endpoint
      // with the token and new password.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
      toast.success("Password reset successfully");
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  // Invalid or missing token view
  if (tokenChecked && !token && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid reset link
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              This password reset link is invalid or has expired. Request a new
              link to reset your password.
            </p>
            <a
              href={createPageUrl("ForgotPassword")}
              className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition"
            >
              Request new reset link
            </a>
            <a
              href={createPageUrl("Login")}
              className="block w-full mt-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition text-sm"
            >
              Back to login
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success view
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password reset
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Your password has been updated. You can now sign in with your new
              password.
            </p>
            <a
              href={createPageUrl("Login")}
              className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition"
            >
              Continue to login
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo and heading */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="DRIVEE" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set a new password
          </h1>
          <p className="text-gray-600 text-sm">
            Choose a strong password for your account. This helps protect your
            bookings, students and financial data.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="At least 8 characters"
                  className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    passwordError
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-200"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition ${
                          i <= strength.level ? strength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Password strength: {strength.text}
                  </p>
                </div>
              )}

              {passwordError && (
                <p className="mt-1 text-xs text-red-600">{passwordError}</p>
              )}

              <ul className="mt-2 text-[11px] text-gray-500 space-y-1">
                <li>Use at least 8 characters</li>
                <li>Include at least one uppercase letter</li>
                <li>Include at least one number</li>
              </ul>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError("");
                  }}
                  placeholder="Repeat your password"
                  className={`w-full pl-12 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    confirmError
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-200"
                  }`}
                  required
                />
                {confirmPassword && password === confirmPassword && !confirmError && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                )}
              </div>
              {confirmError && (
                <p className="mt-1 text-xs text-red-600">{confirmError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-500 text-center">
            This reset link can usually be used once. If it fails, request a new
            link from the Forgot Password page.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
