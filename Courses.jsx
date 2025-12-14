import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Edit, Trash2, Eye, Video, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function Courses() {
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['theoryCourses'],
    queryFn: () => base44.entities.TheoryCourse.list('-created_date')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TheoryCourse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theoryCourses'] });
      toast.success("Course deleted");
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }) => 
      base44.entities.TheoryCourse.update(id, { is_published: !isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theoryCourses'] });
      toast.success("Course updated");
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Theory Courses</h1>
          <p className="text-slate-600 mt-1">Manage your theory learning materials</p>
        </div>
        <Link to={createPageUrl("TheoryManagement")}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Course
          </motion.button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-xl mb-4" />
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No courses yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first theory course</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, idx) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition group"
            >
              <div className="aspect-video bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] flex items-center justify-center relative">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-16 h-16 text-[#3b82c4]/40" />
                )}
                {!course.is_published && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                    Draft
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{course.title}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{course.description}</p>

                <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration_minutes || 0} min
                  </div>
                  <div className="px-2 py-0.5 bg-[#e8f4fa] text-[#3b82c4] rounded-full text-xs font-bold">
                    {course.category}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => togglePublishMutation.mutate({ id: course.id, isPublished: course.is_published })}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                      course.is_published
                        ? 'bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3]'
                        : 'bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5]'
                    }`}
                  >
                    {course.is_published ? 'Published' : 'Publish'}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(course.id)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}