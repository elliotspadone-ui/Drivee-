import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShieldX, Home, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import VeeMascot from "@/components/common/VeeMascot";
import { logger } from "@/components/utils/config";

export default function Unauthorized() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to landing
      window.location.href = createPageUrl("Landing");
    } catch (err) {
      logger.error("Logout failed:", err);
      // Force redirect anyway
      window.location.href = createPageUrl("Landing");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <div className="mb-6">
          <VeeMascot size="lg" mood="thinking" animate={true} />
        </div>
        
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">Access Denied</h1>
        <p className="text-zinc-600 mb-8">
          You don't have permission to view this page. If you believe this is an error, please contact your administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={createPageUrl("Landing")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-semibold transition shadow-lg"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-sm text-zinc-600">
            Need access? Contact{" "}
            <a href="mailto:support@drivee.com" className="text-[#3b82c4] font-semibold hover:underline">
              support@drivee.com
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}