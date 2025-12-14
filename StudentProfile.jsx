import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Calendar, Save, 
  Loader2, Camera, Upload, CheckCircle, AlertCircle 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StudentProfile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    photo_url: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const devUser = sessionStorage.getItem("dev_auth_user");
        const currentUser = devUser ? JSON.parse(devUser) : await base44.auth.me();
        setUser(currentUser);

        const students = await base44.entities.Student.filter({ email: currentUser.email });
        if (students.length > 0) {
          const s = students[0];
          setStudent(s);
          setFormData({
            full_name: s.full_name || "",
            email: s.email || "",
            phone: s.phone || "",
            date_of_birth: s.date_of_birth || "",
            address: s.address || "",
            emergency_contact_name: s.emergency_contact_name || "",
            emergency_contact_phone: s.emergency_contact_phone || "",
            photo_url: s.photo_url || ""
          });
        }
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Student.update(student.id, data);
      await base44.auth.updateMe({ 
        full_name: data.full_name,
        phone: data.phone 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (url) => {
      setFormData(prev => ({ ...prev, photo_url: url }));
      toast.success("Photo uploaded");
    },
    onError: () => {
      toast.error("Failed to upload photo");
    }
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">Please contact your driving school to set up your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#3b82c4]" />
            Profile Photo
          </h3>
          
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                formData.full_name?.charAt(0) || "S"
              )}
            </div>
            
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f4fa] hover:bg-[#d4eaf5] text-[#3b82c4] rounded-xl font-semibold cursor-pointer transition">
                <Upload className="w-4 h-4" />
                {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadPhotoMutation.isPending}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Max size: 5MB</p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#3b82c4]" />
            Basic Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20 resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#e44138]" />
            Emergency Contact
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                placeholder="Emergency contact name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-gradient-to-br from-[#e8f4fa] to-white rounded-2xl border border-[#d4eaf5] p-6">
          <h3 className="font-bold text-gray-900 mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Member since</span>
              <span className="font-semibold text-gray-900">
                {student.created_date ? format(new Date(student.created_date), "MMMM d, yyyy") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">License Category</span>
              <span className="px-3 py-1 bg-[#3b82c4] text-white rounded-full text-xs font-bold">
                {student.license_category || "B"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className="flex items-center gap-1 text-[#5cb83a] font-semibold">
                <CheckCircle className="w-4 h-4" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 px-6 py-4 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}