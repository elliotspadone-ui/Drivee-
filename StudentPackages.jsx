import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Check, Clock, CreditCard, Star, TrendingDown, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function StudentPackages() {
  const queryClient = useQueryClient();
  const [student, setStudent] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    const loadStudent = async () => {
      const devUser = sessionStorage.getItem("dev_auth_user");
      const user = devUser ? JSON.parse(devUser) : await base44.auth.me();
      const students = await base44.entities.Student.filter({ email: user.email });
      if (students.length > 0) setStudent(students[0]);
    };
    loadStudent();
  }, []);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages', student?.school_id],
    queryFn: async () => {
      if (!student?.school_id) return [];
      return await base44.entities.Package.filter({ 
        school_id: student.school_id, 
        is_active: true 
      });
    },
    enabled: !!student?.school_id
  });

  const purchasePackageMutation = useMutation({
    mutationFn: async (packageId) => {
      toast.info("Payment processing would happen here");
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Package purchased successfully!");
      queryClient.invalidateQueries();
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lesson Packages</h1>
        <p className="text-slate-600 mt-1">Save money with bundled lesson packages</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-6" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No packages available</p>
          <p className="text-sm text-slate-500 mt-1">Check back later for special offers</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, idx) => {
            const pricePerLesson = pkg.total_price / pkg.number_of_lessons;
            const savings = pkg.discount_percentage || 0;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 shadow-sm border-2 border-slate-200 hover:border-[#3b82c4] hover:shadow-md transition"
              >
                {savings > 0 && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#eefbe7] text-[#5cb83a] rounded-full text-xs font-bold">
                      <TrendingDown className="w-3 h-3" />
                      Save {savings}%
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                <p className="text-slate-600 text-sm mb-4">{pkg.description}</p>

                <div className="mb-6">
                  <p className="text-4xl font-bold text-slate-900">€{pkg.total_price}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    €{pricePerLesson.toFixed(0)} per lesson • {pkg.number_of_lessons} lessons
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-[#5cb83a]" />
                    {pkg.number_of_lessons} x {pkg.duration_per_lesson} min lessons
                  </div>
                  {pkg.includes_theory && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-[#5cb83a]" />
                      Theory materials included
                    </div>
                  )}
                  {pkg.includes_exam_car && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-[#5cb83a]" />
                      Exam car included
                    </div>
                  )}
                  {pkg.validity_days && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Clock className="w-4 h-4 text-[#3b82c4]" />
                      Valid for {pkg.validity_days} days
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => purchasePackageMutation.mutate(pkg.id)}
                  disabled={purchasePackageMutation.isPending}
                  className="w-full px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  Purchase Package
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {[
            { question: "How do packages work?", answer: "Packages bundle multiple lessons at a discounted rate. Once purchased, you can schedule lessons at your convenience within the validity period." },
            { question: "Can I share my package?", answer: "No, packages are non-transferable and can only be used by the purchasing student." },
            { question: "What if I don't use all lessons?", answer: "Unused lessons expire after the validity period. We recommend booking regularly to make the most of your package." }
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
              >
                <h3 className="font-bold text-slate-900">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="px-6 pb-4 text-slate-600 border-t border-slate-100 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}