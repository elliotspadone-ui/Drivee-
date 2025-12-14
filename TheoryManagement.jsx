import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Video,
  FileQuestion,
  Users,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  Play,
  BarChart3,
  CheckCircle,
  X,
  Clock,
  Award,
  Target,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  AlertCircle,
  XCircle,
  Pause,
  SkipForward,
  Volume2,
  Maximize,
  Settings,
  List,
  Grid3X3,
  Calendar,
  Star,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  BookMarked,
  FileText,
  RefreshCw,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Brain,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import VideoPlayer from "@/components/media/VideoPlayer";
import FileUpload from "@/components/upload/FileUpload";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import { KPIComparisonCard, AnimatedCounter } from "@/components/charts/KPIComparison";

const CATEGORIES = [
  { id: "B", name: "Category B - Car" },
  { id: "A", name: "Category A - Motorcycle" },
  { id: "C", name: "Category C - Truck" },
  { id: "general", name: "General Knowledge" },
  { id: "safety", name: "Road Safety" },
  { id: "signs", name: "Traffic Signs" },
];

const DIFFICULTY_COLORS = {
  easy: "bg-[#eefbe7] text-[#4a9c2e] border-[#d4f4c3]",
  medium: "bg-[#fdfbe8] text-[#b8a525] border-[#f9f3c8]",
  hard: "bg-[#fdeeed] text-[#c9342c] border-[#f9d4d2]",
};

const StatCard = React.memo(({ icon, label, value, subValue, trend, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? "text-[#5cb83a]" : "text-[#e44138]"
          }`}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
  </motion.div>
));

StatCard.displayName = "StatCard";

const ProgressBar = React.memo(({ value, max = 100, color = "from-indigo-500 to-purple-500", size = "sm", showLabel = false }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">Progress</span>
          <span className="font-medium text-zinc-900 tabular-nums">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`${heightClass} bg-zinc-100 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${color} rounded-full`}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

const StatusBadge = React.memo(({ status }) => {
  const configs = {
    published: { label: "Published", color: "bg-[#eefbe7] text-[#4a9c2e] border-[#d4f4c3]" },
    draft: { label: "Draft", color: "bg-[#fdfbe8] text-[#b8a525] border-[#f9f3c8]" },
    archived: { label: "Archived", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";

const CourseFormModal = React.memo(({ isOpen, onClose, course, onSave, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "B",
    is_published: false,
    duration_minutes: 0,
    learning_objectives: [],
  });

  const [objectives, setObjectives] = useState([]);
  const [newObjective, setNewObjective] = useState("");

  React.useEffect(() => {
    if (course) {
      setFormData({ ...course });
      setObjectives(course.learning_objectives || []);
    } else {
      setFormData({
        title: "",
        description: "",
        category: "B",
        is_published: false,
        duration_minutes: 0,
        learning_objectives: [],
      });
      setObjectives([]);
    }
  }, [course, isOpen]);

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective("");
    }
  };

  const handleRemoveObjective = (index) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("Please enter a course title");
      return;
    }

    const data = {
      ...formData,
      learning_objectives: objectives,
    };

    if (course && onUpdate) {
      onUpdate(course.id, data);
    } else {
      onSave(data);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">
              {course ? "Edit Course" : "Create New Course"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Course Title *</label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                placeholder="e.g., Road Signs & Signals"
                required
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] resize-none"
                placeholder="Describe what students will learn..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
                <select
                  value={formData.category || "B"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Learning Objectives
              </label>
              <div className="space-y-2 mb-2">
                {objectives.map((objective, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100"
                  >
                    <Target className="w-4 h-4 text-[#3b82c4] flex-shrink-0" />
                    <span className="flex-1 text-sm text-zinc-700">{objective}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(index)}
                      className="p-1 rounded hover:bg-zinc-200 transition"
                    >
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="Add a learning objective..."
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
                />
                <button
                  type="button"
                  onClick={handleAddObjective}
                  className="px-4 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-zinc-700">
                Publish course immediately
                </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
              >
                {course ? "Update Course" : "Create Course"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

CourseFormModal.displayName = "CourseFormModal";

const ExamFormModal = React.memo(({ isOpen, onClose, exam, onSave, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "B",
    is_published: false,
    time_limit_minutes: 30,
    passing_score: 70,
    max_attempts: 0,
    shuffle_questions: true,
    show_answers_after: true,
  });

  React.useEffect(() => {
    if (exam) {
      setFormData({ ...exam });
    } else {
      setFormData({
        title: "",
        description: "",
        category: "B",
        is_published: false,
        time_limit_minutes: 30,
        passing_score: 70,
        max_attempts: 0,
        shuffle_questions: true,
        show_answers_after: true,
      });
    }
  }, [exam, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("Please enter an exam title");
      return;
    }

    if (exam && onUpdate) {
      onUpdate(exam.id, formData);
    } else {
      onSave(formData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">
              {exam ? "Edit Exam" : "Create New Exam"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Exam Title *</label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Theory Test - Practice Exam 1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Brief description of the exam..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
                <select
                  value={formData.category || "B"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  value={formData.time_limit_minutes || 30}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, time_limit_minutes: Number(e.target.value) }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={formData.passing_score || 70}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, passing_score: Number(e.target.value) }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Max Attempts (0 = unlimited)
                </label>
                <input
                  type="number"
                  value={formData.max_attempts || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, max_attempts: Number(e.target.value) }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="shuffle_questions"
                  checked={formData.shuffle_questions}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shuffle_questions: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="shuffle_questions" className="text-sm text-zinc-700">
                  Shuffle questions for each attempt
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show_answers_after"
                  checked={formData.show_answers_after}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, show_answers_after: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="show_answers_after" className="text-sm text-zinc-700">
                  Show correct answers after completion
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_published" className="text-sm text-zinc-700">
                  Publish exam immediately
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
              >
                {exam ? "Update Exam" : "Create Exam"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

ExamFormModal.displayName = "ExamFormModal";

const CourseCard = React.memo(
  ({ course, stats, videosCount, onEdit, onManageVideos, onAssignStudents, onDelete, index }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
      >
        <div className="relative h-36 bg-gradient-to-br from-[#3b82c4] to-[#6c376f]">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/50" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <StatusBadge status={course.is_published ? "published" : "draft"} />
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/90 text-zinc-700">
              {CATEGORIES.find((c) => c.id === course.category)?.name || course.category}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-900 truncate">{course.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{course.description}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-zinc-100 transition"
              >
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-10"
                  >
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onManageVideos();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Manage Videos
                    </button>
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{videosCount}</p>
              <p className="text-xs text-zinc-500">Videos</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">
                {course.duration_minutes || 0}
              </p>
              <p className="text-xs text-zinc-500">Minutes</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{stats.totalStudents}</p>
              <p className="text-xs text-zinc-500">Students</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{stats.avgCompletion}%</p>
              <p className="text-xs text-zinc-500">Progress</p>
            </div>
          </div>

          <ProgressBar value={stats.avgCompletion} color="from-[#3b82c4] to-[#6c376f]" />

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onAssignStudents}
              className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Assign
            </button>
            <button
              onClick={onManageVideos}
              className="flex-1 py-2 px-3 rounded-lg bg-[#3b82c4] text-white text-sm font-medium hover:bg-[#2563a3] transition flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);

CourseCard.displayName = "CourseCard";

const ExamCard = React.memo(
  ({ exam, stats, questionsCount, onEdit, onManageQuestions, onViewResults, onDelete, index }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
      >
        <div className="relative h-36 bg-gradient-to-br from-[#6c376f] to-[#e44138]">
          <div className="w-full h-full flex items-center justify-center">
            <FileQuestion className="w-12 h-12 text-white/50" />
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <StatusBadge status={exam.is_published ? "published" : "draft"} />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/90 text-zinc-700">
              {CATEGORIES.find((c) => c.id === exam.category)?.name || exam.category}
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/90 text-zinc-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {exam.time_limit_minutes}min
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-900 truncate">{exam.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{exam.description}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-zinc-100 transition"
              >
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-10"
                  >
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onManageQuestions();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <FileQuestion className="w-4 h-4" />
                      Manage Questions
                    </button>
                    <button
                      onClick={() => {
                        onViewResults();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Results
                    </button>
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{questionsCount}</p>
              <p className="text-xs text-zinc-500">Questions</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">
                {exam.passing_score}%
              </p>
              <p className="text-xs text-zinc-500">Pass</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{stats.totalAttempts}</p>
              <p className="text-xs text-zinc-500">Attempts</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{stats.avgScore}%</p>
              <p className="text-xs text-zinc-500">Avg</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">{stats.passRate}%</p>
              <p className="text-xs text-zinc-500">Pass Rate</p>
            </div>
          </div>

          <ProgressBar
            value={stats.passRate}
            color={
              stats.passRate >= 70
                ? "from-[#81da5a] to-[#5cb83a]"
                : stats.passRate >= 50
                ? "from-[#e7d356] to-[#d4bf2e]"
                : "from-[#e44138] to-[#c9342c]"
            }
          />

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onManageQuestions}
              className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center justify-center gap-2"
            >
              <FileQuestion className="w-4 h-4" />
              Questions
            </button>
            <button
              onClick={onViewResults}
              className="flex-1 py-2 px-3 rounded-lg bg-[#6c376f] text-white text-sm font-medium hover:bg-[#5a2d5d] transition flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Results
            </button>
          </div>
        </div>
      </motion.div>
    );
  }
);

ExamCard.displayName = "ExamCard";

const StudentProgressCard = React.memo(({ progress, student, course, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82c4] to-[#6c376f] flex items-center justify-center text-white font-bold text-sm">
            {student?.full_name?.charAt(0) || "S"}
          </div>
          <div>
            <p className="font-medium text-zinc-900">{student?.full_name || "Student"}</p>
            <p className="text-xs text-zinc-500">{course?.title || "Course"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-zinc-900 tabular-nums">
            {progress.completion_percentage}%
          </p>
          <p className="text-xs text-zinc-500">
            {progress.last_accessed
              ? formatDistanceToNow(parseISO(progress.last_accessed), { addSuffix: true })
              : "Never"}
          </p>
        </div>
      </div>

      <ProgressBar
        value={progress.completion_percentage}
        color={
          progress.completion_percentage >= 80
            ? "from-[#81da5a] to-[#5cb83a]"
            : progress.completion_percentage >= 50
            ? "from-[#e7d356] to-[#d4bf2e]"
            : "from-[#3b82c4] to-[#6c376f]"
        }
      />

      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
        <span>{progress.completed_videos?.length || 0} videos watched</span>
        {progress.total_watch_time && (
          <span>{Math.round(progress.total_watch_time / 60)} min total</span>
        )}
      </div>
    </motion.div>
  );
});

StudentProgressCard.displayName = "StudentProgressCard";

const ExamAttemptCard = React.memo(({ attempt, student, exam, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              attempt.passed
                ? "bg-[#eefbe7] text-[#5cb83a]"
                : "bg-[#fdeeed] text-[#e44138]"
            }`}
          >
            {attempt.passed ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-zinc-900">{student?.full_name || "Student"}</p>
            <p className="text-xs text-zinc-500">{exam?.title || "Exam"}</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold tabular-nums ${
              attempt.passed ? "text-[#5cb83a]" : "text-[#e44138]"
            }`}
          >
            {attempt.score}%
          </p>
          <p className="text-xs text-zinc-500">
            {format(parseISO(attempt.created_date), "MMM d, h:mm a")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            attempt.passed
              ? "bg-[#eefbe7] text-[#4a9c2e]"
              : "bg-[#fdeeed] text-[#c9342c]"
          }`}
        >
          {attempt.passed ? "Passed" : "Failed"}
        </span>
        <span className="text-zinc-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {attempt.time_taken_minutes} min
        </span>
      </div>
    </motion.div>
  );
});

ExamAttemptCard.displayName = "ExamAttemptCard";

export default function TheoryManagement() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("courses");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingExam, setEditingExam] = useState(null);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["theoryCourses"],
    queryFn: () => base44.entities.TheoryCourse.list("-created_date"),
    staleTime: 60000,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["theoryVideos"],
    queryFn: () => base44.entities.TheoryVideo.list(),
    staleTime: 60000,
  });

  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ["mockExams"],
    queryFn: () => base44.entities.MockExam.list("-created_date"),
    staleTime: 60000,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["examQuestions"],
    queryFn: () => base44.entities.ExamQuestion.list(),
    staleTime: 60000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["courseProgress"],
    queryFn: () => base44.entities.StudentCourseProgress.list("-last_accessed"),
    staleTime: 60000,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["examAttempts"],
    queryFn: () => base44.entities.ExamAttempt.list("-created_date"),
    staleTime: 60000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
    staleTime: 300000,
  });

  const createCourseMutation = useMutation({
    mutationFn: (data) => base44.entities.TheoryCourse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theoryCourses"] });
      toast.success("Course created successfully");
    },
    onError: () => {
      toast.error("Failed to create course");
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.TheoryCourse.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theoryCourses"] });
      toast.success("Course updated successfully");
    },
    onError: () => {
      toast.error("Failed to update course");
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id) => base44.entities.TheoryCourse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["theoryCourses"] });
      toast.success("Course deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete course");
    },
  });

  const createExamMutation = useMutation({
    mutationFn: (data) => base44.entities.MockExam.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mockExams"] });
      toast.success("Exam created successfully");
    },
    onError: () => {
      toast.error("Failed to create exam");
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.MockExam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mockExams"] });
      toast.success("Exam updated successfully");
    },
    onError: () => {
      toast.error("Failed to update exam");
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id) => base44.entities.MockExam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mockExams"] });
      toast.success("Exam deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete exam");
    },
  });

  const isLoading = loadingCourses || loadingExams;

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);

  const getCourseStats = useCallback(
    (courseId) => {
      const courseProgress = progress.filter((p) => p.course_id === courseId);
      const totalStudents = courseProgress.length;
      const avgCompletion =
        totalStudents > 0
          ? Math.round(
              courseProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / totalStudents
            )
          : 0;
      const completedCount = courseProgress.filter((p) => p.completion_percentage >= 100).length;
      const totalWatchTime = courseProgress.reduce((sum, p) => sum + (p.total_watch_time || 0), 0);

      return { totalStudents, avgCompletion, totalWatchTime, completedCount };
    },
    [progress]
  );

  const getExamStats = useCallback(
    (examId) => {
      const examAttempts = attempts.filter((a) => a.exam_id === examId);
      const totalAttempts = examAttempts.length;
      const avgScore =
        totalAttempts > 0
          ? Math.round(examAttempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts)
          : 0;
      const passedCount = examAttempts.filter((a) => a.passed).length;
      const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
      const avgTime =
        totalAttempts > 0
          ? Math.round(
              examAttempts.reduce((sum, a) => sum + a.time_taken_minutes, 0) / totalAttempts
            )
          : 0;

      return { totalAttempts, avgScore, passRate, avgTime };
    },
    [attempts]
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || course.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchTerm, filterCategory]);

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || exam.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exams, searchTerm, filterCategory]);

  const globalStats = useMemo(() => {
    const totalEnrolled = new Set(progress.map((p) => p.student_id)).size;
    const avgCompletion =
      progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.completion_percentage, 0) / progress.length)
        : 0;
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a) => a.passed).length;
    const overallPassRate =
      totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

    return { totalEnrolled, avgCompletion, totalAttempts, overallPassRate };
  }, [progress, attempts]);

  const handleSaveCourse = useCallback(
    (data) => {
      createCourseMutation.mutate(data);
      setShowCourseForm(false);
    },
    [createCourseMutation]
  );

  const handleUpdateCourse = useCallback(
    (id, data) => {
      updateCourseMutation.mutate({ id, data });
      setEditingCourse(null);
      setShowCourseForm(false);
    },
    [updateCourseMutation]
  );

  const handleDeleteCourse = useCallback(
    (id) => {
      if (window.confirm("Are you sure you want to delete this course?")) {
        deleteCourseMutation.mutate(id);
      }
    },
    [deleteCourseMutation]
  );

  const handleSaveExam = useCallback(
    (data) => {
      createExamMutation.mutate(data);
      setShowExamForm(false);
    },
    [createExamMutation]
  );

  const handleUpdateExam = useCallback(
    (id, data) => {
      updateExamMutation.mutate({ id, data });
      setEditingExam(null);
      setShowExamForm(false);
    },
    [updateExamMutation]
  );

  const handleDeleteExam = useCallback(
    (id) => {
      if (window.confirm("Are you sure you want to delete this exam?")) {
        deleteExamMutation.mutate(id);
      }
    },
    [deleteExamMutation]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3b82c4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading e-learning module...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <ScrollProgress color="#3b82c4" height={3} />
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      <ScrollFadeIn direction="up">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">E-Learning Module</h1>
          <p className="text-zinc-600 mt-1">
            Manage theory courses, mock exams, and track student progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingCourse(null);
              setShowCourseForm(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Course
          </button>
          <button
            onClick={() => {
              setEditingExam(null);
              setShowExamForm(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Exam
          </button>
        </div>
      </motion.header>
      </ScrollFadeIn>

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-[#3b82c4]" />}
          label="Total Courses"
          value={courses.length}
          subValue={`${courses.filter((c) => c.is_published).length} published`}
          color="bg-[#e8f4fa]"
          delay={0.05}
        />
        <StatCard
          icon={<FileQuestion className="w-5 h-5 text-[#6c376f]" />}
          label="Mock Exams"
          value={exams.length}
          subValue={`${questions.length} questions total`}
          color="bg-[#f3e8f4]"
          delay={0.1}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-[#5cb83a]" />}
          label="Enrolled Students"
          value={globalStats.totalEnrolled}
          subValue={`${globalStats.avgCompletion}% avg completion`}
          color="bg-[#eefbe7]"
          delay={0.15}
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-[#e7d356]" />}
          label="Pass Rate"
          value={`${globalStats.overallPassRate}%`}
          subValue={`${globalStats.totalAttempts} exam attempts`}
          color="bg-[#fdfbe8]"
          delay={0.2}
        />
      </div>
      </StaggerFadeIn>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm"
      >
        <div className="flex gap-1">
          {["courses", "exams", "progress", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-[#3b82c4] text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {(activeTab === "courses" || activeTab === "exams") && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                  />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center rounded-xl border border-zinc-200 p-1 bg-zinc-50">
              {["grid", "list"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    viewMode === mode
                      ? "bg-white text-[#3b82c4] shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {mode === "grid" ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "courses" && (
          <motion.div
            key="courses"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {filteredCourses.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <BookOpen className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">
                  {courses.length === 0
                    ? "No courses yet. Create your first theory course!"
                    : "No courses match your search criteria."}
                </p>
                {courses.length === 0 && (
                  <button
                    onClick={() => setShowCourseForm(true)}
                    className="px-6 py-3 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
                  >
                    Create Course
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    stats={getCourseStats(course.id)}
                    videosCount={videos.filter((v) => v.course_id === course.id).length}
                    onEdit={() => {
                      setEditingCourse(course);
                      setShowCourseForm(true);
                    }}
                    onManageVideos={() => toast.info("Video management coming soon")}
                    onAssignStudents={() => toast.info("Student assignment coming soon")}
                    onDelete={() => handleDeleteCourse(course.id)}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCourses.map((course, index) => {
                  const stats = getCourseStats(course.id);
                  const videosCount = videos.filter((v) => v.course_id === course.id).length;

                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#3b82c4] to-[#6c376f] flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-zinc-900">{course.title}</h3>
                            <StatusBadge status={course.is_published ? "published" : "draft"} />
                          </div>
                          <p className="text-sm text-zinc-500 truncate">{course.description}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {videosCount}
                            </p>
                            <p className="text-xs text-zinc-500">Videos</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {stats.totalStudents}
                            </p>
                            <p className="text-xs text-zinc-500">Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {stats.avgCompletion}%
                            </p>
                            <p className="text-xs text-zinc-500">Progress</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingCourse(course);
                                setShowCourseForm(true);
                              }}
                              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                            >
                              <Edit className="w-4 h-4 text-zinc-600" />
                            </button>
                            <button
                              onClick={() => toast.info("Video management coming soon")}
                              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                            >
                              <Video className="w-4 h-4 text-zinc-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "exams" && (
          <motion.div
            key="exams"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {filteredExams.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <FileQuestion className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">
                  {exams.length === 0
                    ? "No mock exams yet. Create your first exam!"
                    : "No exams match your search criteria."}
                </p>
                {exams.length === 0 && (
                  <button
                    onClick={() => setShowExamForm(true)}
                    className="px-6 py-3 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] transition"
                  >
                    Create Exam
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam, index) => (
                  <ExamCard
                    key={exam.id}
                    exam={exam}
                    stats={getExamStats(exam.id)}
                    questionsCount={questions.filter((q) => q.exam_id === exam.id).length}
                    onEdit={() => {
                      setEditingExam(exam);
                      setShowExamForm(true);
                    }}
                    onManageQuestions={() => toast.info("Question management coming soon")}
                    onViewResults={() => toast.info("Results view coming soon")}
                    onDelete={() => handleDeleteExam(exam.id)}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExams.map((exam, index) => {
                  const stats = getExamStats(exam.id);
                  const questionsCount = questions.filter((q) => q.exam_id === exam.id).length;

                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#6c376f] to-[#e44138] flex items-center justify-center flex-shrink-0">
                          <FileQuestion className="w-8 h-8 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-zinc-900">{exam.title}</h3>
                            <StatusBadge status={exam.is_published ? "published" : "draft"} />
                          </div>
                          <p className="text-sm text-zinc-500 truncate">{exam.description}</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {questionsCount}
                            </p>
                            <p className="text-xs text-zinc-500">Questions</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {stats.avgScore}%
                            </p>
                            <p className="text-xs text-zinc-500">Avg Score</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-zinc-900 tabular-nums">
                              {stats.passRate}%
                            </p>
                            <p className="text-xs text-zinc-500">Pass Rate</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingExam(exam);
                                setShowExamForm(true);
                              }}
                              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                            >
                              <Edit className="w-4 h-4 text-zinc-600" />
                            </button>
                            <button
                              onClick={() => toast.info("Question management coming soon")}
                              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                            >
                              <FileQuestion className="w-4 h-4 text-zinc-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "progress" && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-zinc-900">Course Progress</h3>
                  <p className="text-sm text-zinc-500">Recent student activity</p>
                </div>
                <BookOpen className="w-5 h-5 text-zinc-400" />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {progress.slice(0, 15).map((prog, index) => (
                  <StudentProgressCard
                    key={prog.id}
                    progress={prog}
                    student={studentMap.get(prog.student_id)}
                    course={courseMap.get(prog.course_id)}
                    index={index}
                  />
                ))}
                {progress.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">No course progress recorded yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-zinc-900">Exam Attempts</h3>
                  <p className="text-sm text-zinc-500">Recent exam results</p>
                </div>
                <FileQuestion className="w-5 h-5 text-zinc-400" />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {attempts.slice(0, 15).map((attempt, index) => (
                  <ExamAttemptCard
                    key={attempt.id}
                    attempt={attempt}
                    student={studentMap.get(attempt.student_id)}
                    exam={examMap.get(attempt.exam_id)}
                    index={index}
                  />
                ))}
                {attempts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">No exam attempts recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-zinc-900">Course Performance</h3>
                    <p className="text-sm text-zinc-500">Completion rates by course</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-zinc-400" />
                </div>

                <div className="space-y-4">
                  {courses.slice(0, 5).map((course, index) => {
                    const stats = getCourseStats(course.id);
                    return (
                      <div key={course.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-zinc-600 truncate flex-1 mr-2">
                            {course.title}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 tabular-nums">
                            {stats.avgCompletion}%
                          </span>
                        </div>
                        <ProgressBar value={stats.avgCompletion} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-zinc-900">Exam Performance</h3>
                    <p className="text-sm text-zinc-500">Pass rates by exam</p>
                  </div>
                  <Target className="w-5 h-5 text-zinc-400" />
                </div>

                <div className="space-y-4">
                  {exams.slice(0, 5).map((exam) => {
                    const stats = getExamStats(exam.id);
                    return (
                      <div key={exam.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-zinc-600 truncate flex-1 mr-2">
                            {exam.title}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 tabular-nums">
                            {stats.passRate}%
                          </span>
                        </div>
                        <ProgressBar
                          value={stats.passRate}
                          color={
                            stats.passRate >= 70
                              ? "from-[#81da5a] to-[#5cb83a]"
                              : stats.passRate >= 50
                              ? "from-[#e7d356] to-[#d4bf2e]"
                              : "from-[#e44138] to-[#c9342c]"
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-zinc-900">Learning Insights</h3>
                  <p className="text-sm text-zinc-500">Key performance indicators</p>
                </div>
                <Brain className="w-5 h-5 text-zinc-400" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-[#e8f4fa] p-4 text-center">
                  <Zap className="w-6 h-6 text-[#3b82c4] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#2563a3] tabular-nums">
                    {globalStats.avgCompletion}%
                  </p>
                  <p className="text-xs text-[#3b82c4]">Avg Course Completion</p>
                </div>

                <div className="rounded-xl bg-[#eefbe7] p-4 text-center">
                  <Award className="w-6 h-6 text-[#5cb83a] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#4a9c2e] tabular-nums">
                    {globalStats.overallPassRate}%
                  </p>
                  <p className="text-xs text-[#5cb83a]">Exam Pass Rate</p>
                </div>

                <div className="rounded-xl bg-[#f3e8f4] p-4 text-center">
                  <Users className="w-6 h-6 text-[#6c376f] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#5a2d5d] tabular-nums">
                    {globalStats.totalEnrolled}
                  </p>
                  <p className="text-xs text-[#6c376f]">Students Enrolled</p>
                </div>

                <div className="rounded-xl bg-[#fdfbe8] p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-[#e7d356] mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#b8a525] tabular-nums">
                    {globalStats.totalAttempts}
                  </p>
                  <p className="text-xs text-[#e7d356]">Total Exam Attempts</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CourseFormModal
        isOpen={showCourseForm}
        onClose={() => {
          setShowCourseForm(false);
          setEditingCourse(null);
        }}
        course={editingCourse}
        onSave={handleSaveCourse}
        onUpdate={handleUpdateCourse}
      />

      <ExamFormModal
        isOpen={showExamForm}
        onClose={() => {
          setShowExamForm(false);
          setEditingExam(null);
        }}
        exam={editingExam}
        onSave={handleSaveExam}
        onUpdate={handleUpdateExam}
      />
    </div>
    </>
  );
}