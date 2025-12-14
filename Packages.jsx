import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Edit, Trash2, X, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function Packages() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: "", description: "", number_of_lessons: 10, duration_per_lesson: 60,
    total_price: 0, category: "B", discount_percentage: 0,
    includes_theory: false, includes_exam_car: false, validity_days: 365
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.list('-created_date')
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => base44.entities.School.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Package.create({ ...data, school_id: schools[0]?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setShowForm(false);
      resetForm();
      toast.success("Package created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Package.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setShowForm(false);
      setEditingPackage(null);
      resetForm();
      toast.success("Package updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Package.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success("Package deleted");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "", number_of_lessons: 10, duration_per_lesson: 60,
      total_price: 0, category: "B", discount_percentage: 0,
      includes_theory: false, includes_exam_car: false, validity_days: 365
    });
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData(pkg);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lesson Packages</h1>
          <p className="text-slate-600 mt-1">Create and manage lesson bundles</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Package
        </motion.button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(pkg)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <Edit className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => deleteMutation.mutate(pkg.id)} className="p-2 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-4">{pkg.description}</p>
            <div className="mb-4">
              <p className="text-3xl font-bold text-slate-900">€{pkg.total_price}</p>
              <p className="text-sm text-slate-500">{pkg.number_of_lessons} lessons • {pkg.duration_per_lesson} min each</p>
            </div>

            <div className="space-y-2 text-sm">
              {pkg.includes_theory && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-4 h-4 text-[#5cb83a]" />
                  Theory materials included
                </div>
              )}
              {pkg.includes_exam_car && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Check className="w-4 h-4 text-[#5cb83a]" />
                  Exam car included
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowForm(false); setEditingPackage(null); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingPackage ? "Edit Package" : "New Package"}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingPackage(null); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Package Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                    placeholder="e.g., Starter Package"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Lessons</label>
                    <input
                      type="number"
                      value={formData.number_of_lessons}
                      onChange={(e) => setFormData({ ...formData, number_of_lessons: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Total Price (€)</label>
                    <input
                      type="number"
                      value={formData.total_price}
                      onChange={(e) => setFormData({ ...formData, total_price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includes_theory}
                      onChange={(e) => setFormData({ ...formData, includes_theory: e.target.checked })}
                      className="w-4 h-4 text-[#3b82c4] rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Include theory</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includes_exam_car}
                      onChange={(e) => setFormData({ ...formData, includes_exam_car: e.target.checked })}
                      className="w-4 h-4 text-[#3b82c4] rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Include exam car</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setShowForm(false); setEditingPackage(null); resetForm(); }}
                    className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Save className="w-4 h-4" />{editingPackage ? "Update" : "Create"}</>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}