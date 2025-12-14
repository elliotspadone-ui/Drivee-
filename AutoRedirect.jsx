import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import VeeMascot from "@/components/common/VeeMascot";

export default function AutoRedirect() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking authentication...");

  useEffect(() => {
    const redirect = async () => {
      try {
        // Check dev auth first
        const devUser = sessionStorage.getItem("dev_auth_user");
        if (devUser) {
          const user = JSON.parse(devUser);
          setStatus(`Welcome back, ${user.full_name || "User"}!`);
          
          const roleRoutes = {
            admin: "Dashboard",
            instructor: "InstructorDashboard",
            user: "StudentDashboard"
          };
          
          await new Promise(resolve => setTimeout(resolve, 500));
          navigate(createPageUrl(roleRoutes[user.role] || "Dashboard"));
          return;
        }

        // Real auth
        setStatus("Loading your account...");
        const user = await base44.auth.me();
        
        if (!user) {
          setStatus("Redirecting to login...");
          await new Promise(resolve => setTimeout(resolve, 300));
          navigate(createPageUrl("SchoolLogin"));
          return;
        }

        setStatus(`Welcome back, ${user.full_name || "User"}!`);
        
        // Route based on role
        let destination = "Dashboard";
        
        if (user.role === "admin") {
          destination = "Dashboard";
        } else if (user.role === "instructor") {
          destination = "InstructorDashboard";
        } else {
          // Check if student profile exists
          try {
            const students = await base44.entities.Student.filter({ email: user.email });
            destination = students.length > 0 ? "StudentDashboard" : "StudentAuth";
          } catch {
            destination = "StudentDashboard";
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
        navigate(createPageUrl(destination));
        
      } catch (error) {
        setStatus("Redirecting to login...");
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate(createPageUrl("SchoolLogin"));
      }
    };

    redirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <VeeMascot size="lg" mood="wave" animate={true} />
        </div>
        
        <div className="mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82c4] mx-auto" />
        </div>
        
        <p className="text-lg font-semibold text-slate-900 mb-1">{status}</p>
        <p className="text-sm text-slate-500">Just a moment...</p>
      </div>
    </div>
  );
}