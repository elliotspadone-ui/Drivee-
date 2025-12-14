import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Bell, Globe, Lock, Palette, Save, Loader2,
  Mail, MessageSquare, Calendar, CreditCard
} from "lucide-react";
import { toast } from "sonner";

export default function StudentSettings() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    lessonReminders: true,
    paymentReminders: true,
    marketingEmails: false,
    language: "en",
    theme: "light"
  });

  useEffect(() => {
    const loadData = async () => {
      const devUser = sessionStorage.getItem("dev_auth_user");
      const currentUser = devUser ? JSON.parse(devUser) : await base44.auth.me();
      setUser(currentUser);

      const students = await base44.entities.Student.filter({ email: currentUser.email });
      if (students.length > 0) {
        setStudent(students[0]);
        // Load saved settings if they exist
        if (students[0].settings) {
          setSettings({ ...settings, ...students[0].settings });
        }
      }
    };
    loadData();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Student.update(student.id, { settings });
      await base44.auth.updateMe({ 
        preferredLanguage: settings.language 
      });
    },
    onSuccess: () => {
      toast.success("Settings updated");
    },
    onError: () => {
      toast.error("Failed to update settings");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your preferences and notifications</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#3b82c4]" />
            Notifications
          </h3>
          
          <div className="space-y-4">
            {[
              { key: "emailNotifications", label: "Email Notifications", icon: Mail },
              { key: "smsNotifications", label: "SMS Notifications", icon: MessageSquare },
              { key: "lessonReminders", label: "Lesson Reminders", icon: Calendar },
              { key: "paymentReminders", label: "Payment Reminders", icon: CreditCard },
              { key: "marketingEmails", label: "Marketing Emails", icon: Mail }
            ].map(setting => (
              <label key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                <div className="flex items-center gap-3">
                  <setting.icon className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{setting.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings[setting.key]}
                  onChange={(e) => setSettings({ ...settings, [setting.key]: e.target.checked })}
                  className="w-5 h-5 text-[#3b82c4] rounded focus:ring-[#3b82c4]"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#3b82c4]" />
            Language & Region
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full px-6 py-4 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}