import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import ProductionChecklist from "@/components/admin/ProductionChecklist";
import { Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { logger } from "@/components/utils/config";

export default function ProductionStatus() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user || user.role !== "admin") {
          setUnauthorized(true);
          return;
        }
        
        setCurrentUser(user);
      } catch (err) {
        logger.error("Failed to load user:", err);
        setUnauthorized(true);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Required</h1>
          <p className="text-slate-600 mb-6">
            This page is only accessible to system administrators.
          </p>
          <Link
            to={createPageUrl("Dashboard")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to={createPageUrl("Settings")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Production Status</h1>
              <p className="text-slate-600">System health and deployment readiness</p>
            </div>
          </div>
        </div>

        <ProductionChecklist />

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 mb-2">Deployment Notes</p>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Always run production checks before deploying</p>
                <p>• Ensure all environment variables are properly set</p>
                <p>• Test authentication flows after deployment</p>
                <p>• Monitor error logs for 24-48 hours post-launch</p>
                <p>• Keep this page accessible for health monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}