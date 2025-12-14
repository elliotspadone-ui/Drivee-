import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KanbanBoard, { moveBetweenColumns, reorderWithinColumn } from "@/components/common/KanbanBoard";
import {
  Search,
  Plus,
  Filter,
  TrendingUp,
  Clock,
  Award,
  Phone,
  Mail,
  Calendar,
  FileText,
  Edit,
  Eye,
  MoreVertical,
  Trash2,
  Download,
  Upload,
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  MessageSquare,
  DollarSign,
  BookOpen,
  Car,
  MapPin,
  GraduationCap,
  Target,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  RefreshCw,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Send,
  Copy,
  ExternalLink,
  History,
  Settings,
  Bell,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";
import { celebrate } from "@/components/common/ConfettiCelebration";
import LeafletWorldMap, { MarkerList } from "@/components/maps/LeafletWorldMap";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import confetti from 'canvas-confetti';
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";

const LICENSE_TYPES = [
  { id: "B", name: "Class B - Car" },
  { id: "A", name: "Class A - Motorcycle" },
  { id: "C", name: "Class C - Truck" },
  { id: "D", name: "Class D - Bus" },
  { id: "BE", name: "Class BE - Car with Trailer" },
];

const PIPELINE_STAGES = [
  { id: "registered", label: "Registered", color: "bg-zinc-500" },
  { id: "theory_prep", label: "Theory Prep", color: "bg-[#a9d5ed]" },
  { id: "theory_passed", label: "Theory Passed", color: "bg-[#3b82c4]" },
  { id: "practical_training", label: "Practical Training", color: "bg-[#6c376f]" },
  { id: "exam_ready", label: "Exam Ready", color: "bg-[#e7d356]" },
  { id: "licensed", label: "Licensed", color: "bg-[#81da5a]" },
];

const getInitials = (name) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getStudentStage = (student) => {
  if (student.practical_exam_passed) return "licensed";
  if (student.progress_percentage && student.progress_percentage >= 80) return "exam_ready";
  if (student.theory_exam_passed && (student.total_lessons_completed || 0) > 0) return "practical_training";
  if (student.theory_exam_passed) return "theory_passed";
  if (student.is_active) return "theory_prep";
  return "registered";
};

const StatCard = React.memo(({ icon, label, value, trend, color, delay = 0 }) => (
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
        <span
          className={`text-xs font-medium ${
            trend >= 0 ? "text-[#5cb83a]" : "text-[#e44138]"
          }`}
        >
          {trend >= 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>
    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
  </motion.div>
));

StatCard.displayName = "StatCard";

const Avatar = React.memo(({ name, url, size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} rounded-xl object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] flex items-center justify-center text-white font-semibold ${className}`}
    >
      {getInitials(name)}
    </div>
  );
});

Avatar.displayName = "Avatar";

const ProgressBar = React.memo(({ value, max = 100, showLabel = true, size = "md", color = "from-[#3b82c4] to-[#a9d5ed]" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-500">Progress</span>
          <span className="font-semibold text-zinc-900 tabular-nums">{Math.round(percentage)}%</span>
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

const StatusBadge = React.memo(({ status, size = "md" }) => {
  const configs = {
    active: { label: "Active", color: "text-[#5cb83a]", bgColor: "bg-[#eefbe7] border-[#d4f4c3]" },
    inactive: { label: "Inactive", color: "text-zinc-600", bgColor: "bg-zinc-100 border-zinc-200" },
    theory_pending: { label: "Theory Pending", color: "text-[#3b82c4]", bgColor: "bg-[#e8f4fa] border-[#d4eaf5]" },
    theory_passed: { label: "Theory Passed", color: "text-[#3b82c4]", bgColor: "bg-[#e8f4fa] border-[#d4eaf5]" },
    practical_pending: { label: "Practical Pending", color: "text-[#6c376f]", bgColor: "bg-[#f3e8f4] border-[#e5d0e6]" },
    practical_training: { label: "Practical Training", color: "text-[#6c376f]", bgColor: "bg-[#f3e8f4] border-[#e5d0e6]" },
    theory_prep: { label: "Theory Prep", color: "text-[#3b82c4]", bgColor: "bg-[#e8f4fa] border-[#d4eaf5]" },
    registered: { label: "Registered", color: "text-zinc-600", bgColor: "bg-zinc-100 border-zinc-200" },
    licensed: { label: "Licensed", color: "text-[#5cb83a]", bgColor: "bg-[#eefbe7] border-[#d4f4c3]" },
    exam_ready: { label: "Exam Ready", color: "text-[#b8a525]", bgColor: "bg-[#fdfbe8] border-[#f9f3c8]" },
  };

  const config = configs[status] || configs.inactive;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";

const StudentCard = React.memo(({ student, progress, nextLesson, instructor, onView, onEdit, onMessage, index }) => {
  const [showActions, setShowActions] = useState(false);
  const stage = getStudentStage(student);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={student.full_name} url={student.avatar_url} size="lg" />
          <div>
            <h3 className="font-semibold text-zinc-900">{student.full_name}</h3>
            <p className="text-sm text-zinc-500">{student.email}</p>
            {student.license_type && (
              <span className="text-xs text-zinc-400">
                {LICENSE_TYPES.find((l) => l.id === student.license_type)?.name || student.license_type}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={stage} />
      </div>

      <div className="mb-4">
        <ProgressBar value={progress.progress} />
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>{progress.total} lessons completed</span>
          <span>{progress.hours}h / {progress.requiredHours}h</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-zinc-50 p-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-[#3b82c4]" />
          <span className="text-xs text-zinc-500">Theory</span>
        </div>
          <p className="text-sm font-medium text-zinc-900">
          {student.theory_exam_passed ? (
            <span className="text-[#5cb83a] flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Passed
            </span>
          ) : (
            <span className="text-[#b8a525]">Pending</span>
          )}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-4 h-4 text-[#6c376f]" />
            <span className="text-xs text-zinc-500">Practical</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">
            {student.practical_exam_passed ? (
              <span className="text-[#5cb83a] flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Passed
              </span>
            ) : (
              <span className="text-[#b8a525]">Pending</span>
            )}
          </p>
        </div>
      </div>

      {nextLesson && (
        <div className="rounded-xl border border-[#d4eaf5] bg-[#e8f4fa]/50 p-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-[#3b82c4] mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium">Next Lesson</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">
            {format(parseISO(nextLesson.start_datetime), "MMM d, h:mm a")}
          </p>
          {instructor && (
            <p className="text-xs text-zinc-500 mt-0.5">with {instructor.full_name}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={onMessage}
          className="py-2 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="py-2 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});

StudentCard.displayName = "StudentCard";

const StudentListItem = React.memo(({ student, progress, nextLesson, instructor, onView, onEdit, index }) => {
  const stage = getStudentStage(student);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md hover:border-zinc-300 transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar name={student.full_name} url={student.avatar_url} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-zinc-900 truncate">{student.full_name}</h3>
              <StatusBadge status={stage} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {student.email}
              </span>
              {student.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {student.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-40">
            <ProgressBar value={progress.progress} size="sm" />
            <p className="text-xs text-zinc-500 mt-1 text-center">
              {progress.total} lessons • {progress.hours}h
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <BookOpen className="w-4 h-4 text-[#3b82c4]" />
                {student.theory_exam_passed ? (
                  <CheckCircle className="w-4 h-4 text-[#5cb83a]" />
                ) : (
                  <Clock className="w-4 h-4 text-[#b8a525]" />
                )}
              </div>
              <p className="text-xs text-zinc-500">Theory</p>
            </div>

            <div className="text-center min-w-[80px]">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Car className="w-4 h-4 text-[#6c376f]" />
                {student.practical_exam_passed ? (
                  <CheckCircle className="w-4 h-4 text-[#5cb83a]" />
                ) : (
                  <Clock className="w-4 h-4 text-[#b8a525]" />
                )}
              </div>
              <p className="text-xs text-zinc-500">Practical</p>
            </div>
          </div>

          <div className="min-w-[140px] text-center">
            {nextLesson ? (
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {format(parseISO(nextLesson.start_datetime), "MMM d, h:mm a")}
                </p>
                <p className="text-xs text-zinc-500">Next Lesson</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No upcoming lessons</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-zinc-600" />
            </button>
            <button
              onClick={onEdit}
              className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StudentListItem.displayName = "StudentListItem";

const PipelineColumn = React.memo(({ stage, students, onStudentClick, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="flex-1 min-w-[250px]"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
      <h3 className="font-semibold text-zinc-900">{stage.label}</h3>
      <span className="text-sm text-zinc-500 tabular-nums">({students.length})</span>
    </div>
    <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
      {students.map((student) => (
        <button
          key={student.id}
          onClick={() => onStudentClick(student)}
          className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left hover:shadow-md hover:border-zinc-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <Avatar name={student.full_name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{student.full_name}</p>
              <p className="text-xs text-zinc-500">{student.progress_percentage || 0}% complete</p>
            </div>
          </div>
        </button>
      ))}
      {students.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center">
          <p className="text-sm text-zinc-400">No students</p>
        </div>
      )}
    </div>
  </motion.div>
));

PipelineColumn.displayName = "PipelineColumn";

const StudentFormModal = React.memo(({ isOpen, onClose, student, instructors, onSave, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    license_type: "B",
    is_active: true,
    instructor_id: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    required_hours: 40,
  });

  React.useEffect(() => {
    if (student) {
      setFormData({
        ...student,
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        address: "",
        date_of_birth: "",
        license_type: "B",
        is_active: true,
        instructor_id: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
        required_hours: 40,
      });
    }
  }, [student, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast.error("Please fill in required fields");
      return;
    }

    if (student && onUpdate) {
      onUpdate(student.id, formData);
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">
              {student ? "Edit Student" : "Add New Student"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Address</label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">License Type</label>
                <select
                  value={formData.license_type || "B"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, license_type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                >
                  {LICENSE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Assigned Instructor</label>
                <select
                  value={formData.instructor_id || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instructor_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                >
                  <option value="">No assigned instructor</option>
                  {instructors
                    .filter((i) => i.is_active)
                    .map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.full_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Required Hours</label>
              <input
                type="number"
                value={formData.required_hours || 40}
                onChange={(e) => setFormData((prev) => ({ ...prev, required_hours: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                min="1"
              />
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <h3 className="text-sm font-medium text-zinc-700 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1.5">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, emergency_contact_name: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Notes</label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
              />
              <label htmlFor="is_active" className="text-sm text-zinc-700">
                Active student
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
                className="px-6 py-2.5 rounded-xl bg-[#3b82c4] text-white font-medium hover:bg-[#2563a3] transition"
              >
                {student ? "Update Student" : "Add Student"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

StudentFormModal.displayName = "StudentFormModal";

const StudentDetailsModal = React.memo(({ student, bookings, instructors, onClose, onEdit }) => {
  if (!student) return null;

  const studentBookings = bookings
    .filter((b) => b.student_id === student.id)
    .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  const completedLessons = studentBookings.filter((b) => b.status === "completed");
  const upcomingLessons = studentBookings.filter(
    (b) => isAfter(parseISO(b.start_datetime), new Date()) && b.status !== "cancelled"
  );

  const instructor = instructors.find((i) => i.id === student.instructor_id);
  const stage = getStudentStage(student);

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <div className="flex items-center gap-4">
              <Avatar name={student.full_name} url={student.avatar_url} size="lg" />
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{student.full_name}</h2>
                <p className="text-sm text-zinc-500">{student.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={stage} />
              <button onClick={onEdit} className="p-2 rounded-lg hover:bg-zinc-100 transition">
                <Edit className="w-5 h-5 text-zinc-500" />
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-zinc-200 p-5">
                  <h3 className="font-semibold text-zinc-900 mb-4">Progress Overview</h3>
                  <ProgressBar value={student.progress_percentage || 0} />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                        {student.total_lessons_completed || 0}
                      </p>
                      <p className="text-xs text-zinc-500">Lessons Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                        {student.total_hours_completed || 0}h
                      </p>
                      <p className="text-xs text-zinc-500">Hours Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                        {Math.max(0, (student.required_hours || 40) - (student.total_hours_completed || 0))}h
                      </p>
                      <p className="text-xs text-zinc-500">Hours Remaining</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[#e8f4fa]">
                        <BookOpen className="w-5 h-5 text-[#3b82c4]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">Theory Exam</p>
                        <p className="text-xs text-zinc-500">
                          {student.theory_exam_passed ? "Passed" : "Pending"}
                        </p>
                      </div>
                    </div>
                    {student.theory_exam_passed && student.theory_exam_date && (
                      <p className="text-xs text-zinc-500">
                        Passed on {format(parseISO(student.theory_exam_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[#f3e8f4]">
                        <Car className="w-5 h-5 text-[#6c376f]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">Practical Exam</p>
                        <p className="text-xs text-zinc-500">
                          {student.practical_exam_passed ? "Passed" : "Pending"}
                        </p>
                      </div>
                    </div>
                    {student.practical_exam_passed && student.practical_exam_date && (
                      <p className="text-xs text-zinc-500">
                        Passed on {format(parseISO(student.practical_exam_date), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-5">
                  <h3 className="font-semibold text-zinc-900 mb-4">Recent Lessons</h3>
                  <div className="space-y-3">
                    {completedLessons.slice(0, 5).map((booking) => {
                      const bookingInstructor = instructors.find((i) => i.id === booking.instructor_id);
                      return (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {format(parseISO(booking.start_datetime), "MMM d, yyyy - h:mm a")}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {bookingInstructor?.full_name} • {booking.lesson_type || "Standard"}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-[#5cb83a] bg-[#eefbe7] px-2 py-1 rounded-full">
                            Completed
                          </span>
                        </div>
                      );
                    })}
                    {completedLessons.length === 0 && (
                      <p className="text-sm text-zinc-500 text-center py-4">No completed lessons yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-200 p-5">
                  <h3 className="font-semibold text-zinc-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-600">{student.email}</span>
                    </div>
                    {student.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-600">{student.phone}</span>
                      </div>
                    )}
                    {student.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-600">{student.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {instructor && (
                  <div className="rounded-xl border border-zinc-200 p-5">
                    <h3 className="font-semibold text-zinc-900 mb-4">Assigned Instructor</h3>
                    <div className="flex items-center gap-3">
                      <Avatar name={instructor.full_name} size="md" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{instructor.full_name}</p>
                        <p className="text-xs text-zinc-500">{instructor.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {upcomingLessons.length > 0 && (
                  <div className="rounded-xl border border-[#d4eaf5] bg-[#e8f4fa] p-5">
                    <h3 className="font-semibold text-[#2563a3] mb-4">Upcoming Lessons</h3>
                    <div className="space-y-2">
                      {upcomingLessons.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="p-2 rounded-lg bg-white">
                          <p className="text-sm font-medium text-zinc-900">
                            {format(parseISO(booking.start_datetime), "MMM d, h:mm a")}
                          </p>
                          <p className="text-xs text-zinc-500">{booking.lesson_type || "Standard"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {student.notes && (
                  <div className="rounded-xl border border-zinc-200 p-5">
                    <h3 className="font-semibold text-zinc-900 mb-3">Notes</h3>
                    <p className="text-sm text-zinc-600">{student.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

StudentDetailsModal.displayName = "StudentDetailsModal";

export default function Students() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  React.useEffect(() => {
    const loadAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== "admin") {
          window.location.href = createPageUrl("Unauthorized");
          return;
        }
        const sid = await getEffectiveSchoolId(user);
        setSchoolId(sid);
      } catch (err) {
        logger.error("Failed to load auth:", err);
        window.location.href = createPageUrl("SchoolLogin");
      } finally {
        setLoadingAuth(false);
      }
    };
    loadAuth();
  }, []);

  const { data: students = [], isLoading: loadingStudents, error: studentsError, refetch: refetchStudents } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors", schoolId],
    queryFn: () => schoolId ? base44.entities.Instructor.filter({ school_id: schoolId }, "-created_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const createStudentMutation = useMutation({
    mutationFn: (data) => base44.entities.Student.create({
      ...data,
      school_id: schoolId,
      email: data.email?.trim().toLowerCase()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student added successfully");
    },
    onError: (err) => {
      logger.error("Failed to create student:", err);
      toast.error("Failed to add student");
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Student.update(id, {
        ...data,
        email: data.email ? data.email.trim().toLowerCase() : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully");
    },
    onError: (err) => {
      logger.error("Failed to update student:", err);
      toast.error("Failed to update student");
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: (err) => {
      logger.error("Failed to delete student:", err);
      toast.error("Failed to delete student");
    },
  });

  const isLoading = loadingAuth || loadingStudents || loadingBookings;

  const getStudentProgress = useCallback(
    (student) => {
      const studentBookings = bookings.filter((b) => b.student_id === student.id);
      const completed = studentBookings.filter((b) => b.status === "completed").length;
      const requiredHours = student.required_hours || 40;
      const hours = student.total_hours_completed || 0;

      return {
        total: student.total_lessons_completed || completed,
        hours,
        progress: student.progress_percentage || 0,
        requiredHours,
        remaining: Math.max(0, requiredHours - hours),
      };
    },
    [bookings]
  );

  const getNextLesson = useCallback(
    (studentId) => {
      return bookings.find(
        (b) =>
          b.student_id === studentId &&
          isAfter(parseISO(b.start_datetime), new Date()) &&
          (b.status === "confirmed" || b.status === "pending")
      );
    },
    [bookings]
  );

  const filteredStudents = useMemo(() => {
    let filtered = students.filter((student) => {
      const matchesSearch =
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm);

      let matchesStatus = true;
      switch (filterStatus) {
        case "active":
          matchesStatus = student.is_active;
          break;
        case "inactive":
          matchesStatus = !student.is_active;
          break;
        case "theory_pending":
          matchesStatus = !student.theory_exam_passed;
          break;
        case "practical_pending":
          matchesStatus = student.theory_exam_passed === true && !student.practical_exam_passed;
          break;
        case "licensed":
          matchesStatus = student.practical_exam_passed === true;
          break;
      }

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "full_name":
          comparison = (a.full_name || "").localeCompare(b.full_name || "");
          break;
        case "created_date":
          comparison = new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
          break;
        case "progress_percentage":
          comparison = (a.progress_percentage || 0) - (b.progress_percentage || 0);
          break;
        case "total_lessons_completed":
          comparison = (a.total_lessons_completed || 0) - (b.total_lessons_completed || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [students, searchTerm, filterStatus, sortField, sortDirection]);

  const pipelineStudents = useMemo(() => {
    const pipeline = {};
    PIPELINE_STAGES.forEach((stage) => {
      pipeline[stage.id] = [];
    });

    students.forEach((student) => {
      const stage = getStudentStage(student);
      if (pipeline[stage]) {
        pipeline[stage].push(student);
      }
    });

    return pipeline;
  }, [students]);

  const stats = useMemo(() => {
    return {
      total: students.length,
      active: students.filter((s) => s.is_active).length,
      theoryPassed: students.filter((s) => s.theory_exam_passed).length,
      licensed: students.filter((s) => s.practical_exam_passed).length,
      examReady: students.filter(
        (s) => !s.practical_exam_passed && (s.progress_percentage || 0) >= 80
      ).length,
    };
  }, [students]);

  const handleViewStudent = useCallback((student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  }, []);

  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student);
    setShowForm(true);
  }, []);

  const handleAddStudent = useCallback(() => {
    setEditingStudent(null);
    setShowForm(true);
  }, []);

  const handleSaveStudent = useCallback(
    (data) => {
      createStudentMutation.mutate(data);
    },
    [createStudentMutation]
  );

  const handleUpdateStudent = useCallback(
    (id, data) => {
      updateStudentMutation.mutate({ id, data });
    },
    [updateStudentMutation]
  );

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingStudent(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedStudent(null);
  }, []);

  const toggleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDirection("desc");
      return field;
    });
  }, []);

  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const student = students.find(s => s.id === draggableId);
    if (!student) return;

    const newStage = destination.droppableId;
    const updates = {};

    switch (newStage) {
      case "theory_passed":
        updates.theory_exam_passed = true;
        break;
      case "licensed":
        updates.practical_exam_passed = true;
        updates.theory_exam_passed = true;
        break;
      case "exam_ready":
        updates.progress_percentage = 85;
        updates.theory_exam_passed = true;
        break;
      case "practical_training":
        updates.theory_exam_passed = true;
        break;
      default:
        break;
    }

    if (Object.keys(updates).length > 0) {
      updateStudentMutation.mutate({ id: student.id, data: updates });
      
      // Celebrate major milestones
      if (newStage === "licensed") {
        celebrate(`${student.full_name} is now licensed!`, "exam");
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      } else if (newStage === "exam_ready") {
        celebrate(`${student.full_name} is exam ready!`, "achievement");
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      } else if (newStage === "theory_passed") {
        celebrate(`Theory exam passed!`, "success");
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.6 } });
      } else {
        toast.success(`Student moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
      }
    }
  }, [students, updateStudentMutation]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SkeletonLoader count={6} type="card" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">School Not Found</h3>
          <p className="text-gray-600">Please complete your school setup first.</p>
        </div>
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={studentsError} 
          onRetry={refetchStudents}
          title="Failed to load students"
        />
      </div>
    );
  }

  return (
    <>
    <ScrollProgress color="#3b82c4" height={3} />
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      <ScrollFadeIn direction="up">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent mb-1">
              Student Management
            </h1>
            <p className="text-zinc-600">
              Complete CRM for tracking student progress and engagement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddStudent}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] shadow-sm transition"
            >
              <Plus className="w-5 h-5" />
              Add Student
            </button>
          </div>
        </div>
      </motion.header>
      </ScrollFadeIn>

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-[#3b82c4]" />}
          label="Total Students"
          value={stats.total}
          color="bg-[#e8f4fa]"
          delay={0.05}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-[#5cb83a]" />}
          label="Active"
          value={stats.active}
          color="bg-[#eefbe7]"
          delay={0.1}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-[#3b82c4]" />}
          label="Theory Passed"
          value={stats.theoryPassed}
          color="bg-[#e8f4fa]"
          delay={0.15}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-[#b8a525]" />}
          label="Exam Ready"
          value={stats.examReady}
          color="bg-[#fdfbe8]"
          delay={0.2}
        />
        <StatCard
          icon={<GraduationCap className="w-5 h-5 text-[#6c376f]" />}
          label="Licensed"
          value={stats.licensed}
          color="bg-[#f3e8f4]"
          delay={0.25}
        />
      </div>
      </StaggerFadeIn>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap flex-1 items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            >
              <option value="all">All Students</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="theory_pending">Theory Pending</option>
              <option value="practical_pending">Practical Pending</option>
              <option value="licensed">Licensed</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            >
              <option value="created_date">Date Added</option>
              <option value="full_name">Name</option>
              <option value="progress_percentage">Progress</option>
              <option value="total_lessons_completed">Lessons</option>
            </select>

            <button
              onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition"
            >
              {sortDirection === "asc" ? (
                <SortAsc className="w-5 h-5 text-zinc-600" />
              ) : (
                <SortDesc className="w-5 h-5 text-zinc-600" />
              )}
            </button>

            <div className="flex items-center rounded-xl border border-zinc-200 p-1 bg-zinc-50">
              {["grid", "list", "pipeline"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    viewMode === mode
                      ? "bg-white text-[#3b82c4] shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {mode === "grid" && <Grid3X3 className="w-4 h-4" />}
                  {mode === "list" && <List className="w-4 h-4" />}
                  {mode === "pipeline" && <BarChart3 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600">No students found</p>
              </div>
            ) : (
              filteredStudents.map((student, index) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  progress={getStudentProgress(student)}
                  nextLesson={getNextLesson(student.id)}
                  instructor={instructors.find((i) => i.id === student.instructor_id)}
                  onView={() => handleViewStudent(student)}
                  onEdit={() => handleEditStudent(student)}
                  onMessage={() => toast.info("Message feature coming soon")}
                  index={index}
                />
              ))
            )}
          </div>
        )}

        {viewMode === "list" && (
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <Search className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600">No students found</p>
              </div>
            ) : (
              filteredStudents.map((student, index) => (
                <StudentListItem
                  key={student.id}
                  student={student}
                  progress={getStudentProgress(student)}
                  nextLesson={getNextLesson(student.id)}
                  instructor={instructors.find((i) => i.id === student.instructor_id)}
                  onView={() => handleViewStudent(student)}
                  onEdit={() => handleEditStudent(student)}
                  index={index}
                />
              ))
            )}
          </div>
        )}

        {viewMode === "pipeline" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm overflow-x-auto">
            <KanbanBoard
              columns={PIPELINE_STAGES.map(stage => ({
                id: stage.id,
                title: stage.label,
                color: stage.color,
                items: (pipelineStudents[stage.id] || []).map(s => ({ ...s, id: s.id }))
              }))}
              onDragEnd={handleDragEnd}
              renderCard={(student, isDragging) => (
                <div onClick={() => handleViewStudent(student)}>
                  <div className="flex items-center gap-3">
                    <Avatar name={student.full_name} url={student.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                      <p className="text-xs text-gray-500">{student.progress_percentage || 0}% complete</p>
                    </div>
                  </div>
                </div>
              )}
              emptyMessage="No students"
            />
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h3 className="font-semibold text-zinc-900 mb-4">Student Pipeline Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="rounded-xl bg-zinc-50 p-4 text-center border border-zinc-100">
              <div className={`w-4 h-4 rounded-full ${stage.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-zinc-900 tabular-nums">
                {pipelineStudents[stage.id]?.length || 0}
              </p>
              <p className="text-xs text-zinc-500">{stage.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {showDetails && selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          bookings={bookings}
          instructors={instructors}
          onClose={handleCloseDetails}
          onEdit={() => {
            handleCloseDetails();
            handleEditStudent(selectedStudent);
          }}
        />
      )}

      <StudentFormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        student={editingStudent}
        instructors={instructors}
        onSave={handleSaveStudent}
        onUpdate={handleUpdateStudent}
      />
    </div>
    </>
  );
}