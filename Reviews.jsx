import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, TrendingUp, Eye, EyeOff, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Reviews() {
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.list('-created_date')
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list()
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list()
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }) => base44.entities.Review.update(id, { is_visible: !isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success("Review visibility updated");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Review.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success("Review deleted");
    }
  });

  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Student Reviews</h1>
        <p className="text-slate-600 mt-1">Manage feedback from students</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#fdfbe8] rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-[#e7d356]" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Avg Rating</p>
              <p className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-1">Total Reviews</p>
          <p className="text-3xl font-bold text-slate-900">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-1">Visible</p>
          <p className="text-3xl font-bold text-[#5cb83a]">{reviews.filter(r => r.is_visible).length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-600 mb-1">Hidden</p>
          <p className="text-3xl font-bold text-slate-400">{reviews.filter(r => !r.is_visible).length}</p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review, idx) => {
          const student = students.find(s => s.id === review.student_id);
          const instructor = instructors.find(i => i.id === review.instructor_id);

          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition ${
                review.is_visible ? 'border-slate-200' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-full flex items-center justify-center text-white font-bold">
                    {student?.full_name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{student?.full_name || "Student"}</p>
                    <p className="text-sm text-slate-500">for {instructor?.full_name || "Instructor"}</p>
                    <p className="text-xs text-slate-400">{format(new Date(review.created_date), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-5 h-5 ${i <= review.rating ? 'fill-[#e7d356] text-[#e7d356]' : 'text-slate-300'}`} />
                  ))}
                </div>
              </div>

              {review.comment && (
                <p className="text-slate-700 leading-relaxed mb-4">{review.comment}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => toggleVisibilityMutation.mutate({ id: review.id, isVisible: review.is_visible })}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${
                    review.is_visible
                      ? 'bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3]'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  {review.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {review.is_visible ? 'Visible' : 'Hidden'}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(review.id)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}