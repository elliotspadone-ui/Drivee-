import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/408d5510b_ChatGPTImageNov19202501_00_30PM-Photoroom.png";

function isValidEmail(email) {
  const value = String(email || "").trim();
  if (!value) return false;
  // Simple, safe pattern, not over strict
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value);
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);

  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";

  const sendResetEmail = useCallback(
    async (targetEmail) => {
      const trimmedEmail = targetEmail.trim();

      if (!isValidEmail(trimmedEmail)) {
        setEmailError("Please enter a valid email address");
        toast.error("Invalid email address");
        return;
      }

      setEmailError("");
      setLoading(true);

      try {
        // In production this should call a backend endpoint that:
        // 1. Generates a secure, time bound token
        // 2. Persists it server side
        // 3. Sends the email
        // Here we keep the demo behavior but wrap it in a single helper.
        await new Promise((resolve) => setTimeout(resolve, 800));

        const resetUrl = `${origin}${createPageUrl(
          "ResetPassword"
        )}?token=RESET_TOKEN`;

        await base44.integrations.Core.SendEmail({
          to: trimmedEmail,
          subject: "Reset your DRIVEE password",
          body: [
            "You requested to reset your DRIVEE password.",
            "",
            `Click the link below to set a new password:`,
            resetUrl,
            "",
            "This link will expire in 1 hour.",
            "",
            "If you did not request this, you can safely ignore this email.",
          ].join("\n"),
        });

        setSent(true);
        setLastSentAt(new Date().toISOString());
        toast.success("Reset link sent");
      } catch (err) {
        console.error("Password reset email error:", err);
        const message =
          err?.message || "Could not send the reset link. Please try again.";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [origin]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendResetEmail(email);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-600 mb-4">
              We sent a password reset link to{" "}
              <strong className="break-all">{email.trim()}</strong>
            </p>
            {lastSentAt && (
              <p className="text-xs text-gray-500 mb-4">
                Sent at {new Date(lastSentAt).toLocaleTimeString()}
              </p>
            )}
            <p className="text-xs text-gray-500 mb-6">
              If you do not see the email, check your spam or promotions
              folder.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => sendResetEmail(email)}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resending...
                  </>
                ) : (
                  "Resend email"
                )}
              </button>
              <a
                href={createPageUrl("Login")}
                className="block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition"
              >
                Back to login
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo and intro */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="DRIVEE" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Forgot password?
          </h1>
          <p className="text-gray-600 text-sm">
            Enter the email you use for DRIVEE. We will send you instructions to
            reset your password.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="you@example.com"
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    emailError
                      ? "border-red-400 focus:ring-red-500"
                      : "border-gray-200"
                  }`}
                  required
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
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
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>

          <a
            href={createPageUrl("Login")}
            className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </a>
        </div>
      </motion.div>
    </div>
  );
}
