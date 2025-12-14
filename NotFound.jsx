import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";
import VeeMascot from "@/components/common/VeeMascot";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        <VeeMascot size="xl" mood="thinking" animate={true} />
        
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-8xl font-black text-zinc-900 mt-8 mb-4"
        >
          404
        </motion.h1>
        
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Page not found</h2>
        <p className="text-zinc-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
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
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <div className="mt-12 p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-[#3b82c4]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-zinc-900">Looking for something?</p>
              <p className="text-xs text-zinc-500">Try these popular pages</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to={createPageUrl("StudentDashboard")}
              className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-sm font-medium text-zinc-700 transition"
            >
              Student Portal
            </Link>
            <Link
              to={createPageUrl("Dashboard")}
              className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-sm font-medium text-zinc-700 transition"
            >
              Admin Dashboard
            </Link>
            <Link
              to={createPageUrl("Marketplace")}
              className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-sm font-medium text-zinc-700 transition"
            >
              School Directory
            </Link>
            <Link
              to={createPageUrl("Support")}
              className="px-3 py-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-sm font-medium text-zinc-700 transition"
            >
              Help & Support
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}