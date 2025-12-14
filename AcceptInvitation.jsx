import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function AcceptInvitation() {
  const [token, setToken] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // Get token from URL on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("token");
      if (urlToken) {
        setToken(urlToken);
      }
    } catch {
      // In non-browser environments just ignore
    }
  }, []);

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      if (!token) return null;

      const invitations = await base44.entities.Invitation.filter({ token });

      if (!invitations || invitations.length === 0) {
        throw new Error("Invalid invitation token");
      }

      const inv = invitations[0];

      // Check if expired
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        try {
          await base44.entities.Invitation.update(inv.id, { status: "expired" });
        } catch {
          // Non-critical, ignore update failure here
        }
        throw new Error("This invitation has expired");
      }

      // Fetch school details
      const schools = await base44.entities.School.filter({ id: inv.school_id });

      return {
        ...inv,
        school: schools[0] || null,
      };
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    // params: { mode: 'existing' | 'new', payload?: formData }
    mutationFn: async (params) => {
      if (!invitation) {
        throw new Error("Invitation not found or no longer valid");
      }

      const { mode, payload } = params || {};

      // Existing account path: user should already be logged in
      if (mode === "existing") {
        try {
          const user = await base44.auth.me();

          // Attach logged-in user as instructor to the invited school
          await base44.entities.Instructor.create({
            school_id: invitation.school_id,
            email: invitation.email || user.email,
            full_name: user.full_name || "Instructor",
            certifications: invitation.pre_fill_data?.certifications || [],
            is_active: true,
          });

          await base44.entities.Invitation.update(invitation.id, {
            status: "accepted",
            accepted_at: new Date().toISOString(),
          });

          return { success: true, existingUser: true };
        } catch {
          throw new Error(
            "You need to be logged in to use an existing account. Please sign in first, then click the invitation link again."
          );
        }
      }

      // New account path
      if (mode === "new") {
        if (!payload) {
          throw new Error("Missing registration details");
        }

        const firstName = payload.firstName.trim();
        const lastName = payload.lastName.trim();
        const phone = payload.phone.trim();
        const password = payload.password;
        const confirmPassword = payload.confirmPassword;

        if (!firstName || !lastName) {
          throw new Error("Please enter your first and last name");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }

        // In a real app: create auth user first, then instructor profile.
        const instructor = await base44.entities.Instructor.create({
          school_id: invitation.school_id,
          email: invitation.email,
          full_name: `${firstName} ${lastName}`,
          phone,
          certifications: invitation.pre_fill_data?.certifications || [],
          is_active: true,
        });

        await base44.entities.Invitation.update(invitation.id, {
          status: "accepted",
          accepted_at: new Date().toISOString(),
        });

        return { success: true, instructorId: instructor.id };
      }

      throw new Error("Invalid action");
    },
    onSuccess: (result) => {
      if (result?.existingUser) {
        toast.success("Invitation accepted. Your account is now linked to this school.");
      } else {
        toast.success("Account created and invitation accepted. Welcome to the team!");
      }

      setTimeout(() => {
        window.location.href = createPageUrl("InstructorDashboard");
      }, 1500);
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to accept invitation");
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    acceptMutation.mutate({ mode: "new", payload: formData });
  };

  const handleExistingAccept = () => {
    acceptMutation.mutate({ mode: "existing" });
  };

  // Loading state while we validate the token and fetch the invitation
  if (!token || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center px-6">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {token ? "Loading invitation..." : "Checking invitation link..."}
          </p>
        </div>
      </div>
    );
  }

  // Error or missing invitation
  if (error || !invitation) {
    const message =
      error?.message ||
      (!token
        ? "This invitation link is missing or malformed."
        : "This invitation link is invalid or has expired.");

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation not available
          </h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <a
            href={createPageUrl("Landing")}
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Go to homepage
          </a>
        </motion.div>
      </div>
    );
  }

  const roleLabel =
    invitation.role === "instructor"
      ? "an Instructor"
      : invitation.role === "admin"
      ? "an Admin"
      : "a Team Member";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          {invitation.school?.logo_url && (
            <img
              src={invitation.school.logo_url}
              alt={invitation.school.name}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You are invited
          </h1>
          <p className="text-gray-600">
            Join{" "}
            <strong>{invitation.school?.name || "this driving school"}</strong>{" "}
            as{" "}
            <strong className="text-indigo-600">
              {roleLabel}
            </strong>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Invitation sent to <span className="font-medium">{invitation.email}</span>
          </p>
          {invitation.personal_message && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Personal note:</p>
              <p className="text-sm text-gray-700 italic">
                "{invitation.personal_message}"
              </p>
            </div>
          )}
        </div>

        {/* Account mode toggle */}
        <div className="mb-6">
          <div className="flex border border-gray-200 rounded-xl p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setHasAccount(false)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
                !hasAccount
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={acceptMutation.isPending}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => setHasAccount(true)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition ${
                hasAccount
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              disabled={acceptMutation.isPending}
            >
              I have an account
            </button>
          </div>
        </div>

        {hasAccount ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              If you already use Drivee, use your existing account to join{" "}
              {invitation.school?.name}.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Make sure you are signed in in another tab before accepting.
            </p>
            <button
              type="button"
              onClick={handleExistingAccept}
              disabled={acceptMutation.isPending}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Accepting invitation...
                </>
              ) : (
                <>Accept invitation</>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  First name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  placeholder="John"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Last name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  placeholder="Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is the email your school used to invite you.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="+49 123 4567890"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Repeat your password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={acceptMutation.isPending}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Create account & join
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">
          By joining, you agree to Drivee&apos;s Terms & Conditions and privacy policy.
        </p>
      </motion.div>
    </div>
  );
}
