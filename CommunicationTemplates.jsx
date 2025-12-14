import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Zap,
  Clock,
  User,
  DollarSign,
  Bell,
  Search,
  FileText,
  Globe,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import TemplateEditor from "../components/communications/TemplateEditor";
import TemplatePreview from "../components/communications/TemplatePreview";

const TEMPLATE_TYPES = [
  { value: "booking_confirmation", label: "Booking Confirmation", icon: CheckCircle, color: "text-emerald-600" },
  { value: "booking_reminder", label: "Booking Reminder", icon: Bell, color: "text-amber-600" },
  { value: "booking_cancellation", label: "Booking Cancellation", icon: XCircle, color: "text-red-600" },
  { value: "payment_receipt", label: "Payment Receipt", icon: DollarSign, color: "text-blue-600" },
  { value: "payment_reminder", label: "Payment Reminder", icon: Clock, color: "text-orange-600" },
  { value: "lesson_followup", label: "Lesson Follow-up", icon: FileText, color: "text-purple-600" },
  { value: "welcome_new_student", label: "Welcome New Student", icon: User, color: "text-indigo-600" },
  { value: "exam_reminder", label: "Exam Reminder", icon: Bell, color: "text-rose-600" },
  { value: "progress_update", label: "Progress Update", icon: Sparkles, color: "text-teal-600" },
  { value: "instructor_assignment", label: "Instructor Assignment", icon: User, color: "text-violet-600" },
  { value: "custom", label: "Custom Template", icon: FileText, color: "text-zinc-600" },
];

const TRIGGER_EVENTS = [
  { value: "booking_created", label: "When booking is created" },
  { value: "booking_confirmed", label: "When booking is confirmed" },
  { value: "booking_cancelled", label: "When booking is cancelled" },
  { value: "booking_24h_before", label: "24 hours before lesson" },
  { value: "booking_1h_before", label: "1 hour before lesson" },
  { value: "booking_completed", label: "When lesson is completed" },
  { value: "payment_received", label: "When payment is received" },
  { value: "payment_overdue", label: "When payment is overdue" },
  { value: "invoice_created", label: "When invoice is created" },
  { value: "student_registered", label: "When student registers" },
  { value: "manual", label: "Manual send only" },
];

// Local icons used in TEMPLATE_TYPES
function CheckCircle(props) {
  return <svg {...props} />;
}
function XCircle(props) {
  return <svg {...props} />;
}

const TemplateCard = ({ template, onEdit, onDelete, onDuplicate, onPreview }) => {
  const typeInfo = TEMPLATE_TYPES.find((t) => t.value === template.template_type);
  const Icon = typeInfo?.icon || FileText;
  const triggerInfo = TRIGGER_EVENTS.find((t) => t.value === template.trigger_event);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${typeInfo?.color || "text-zinc-600"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">{template.name}</h3>
            <p className="text-xs text-zinc-500">{typeInfo?.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {template.auto_send && (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              Auto
            </span>
          )}
          {!template.is_active && (
            <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded-full text-xs font-medium">
              Inactive
            </span>
          )}
        </div>
      </div>

      {template.description && (
        <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{template.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {template.channel === "email" && (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
            <Mail className="w-3 h-3" />
            Email
          </span>
        )}
        {template.channel === "sms" && (
          <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
            <MessageSquare className="w-3 h-3" />
            SMS
          </span>
        )}
        {template.channel === "both" && (
          <>
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs">
              <Mail className="w-3 h-3" />
              Email
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
              <MessageSquare className="w-3 h-3" />
              SMS
            </span>
          </>
        )}
        {template.language && template.language !== "en" && (
          <span className="flex items-center gap-1 px-2 py-1 bg-zinc-50 text-zinc-600 rounded-lg text-xs">
            <Globe className="w-3 h-3" />
            {String(template.language).toUpperCase()}
          </span>
        )}
        {triggerInfo && (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs">
            <Clock className="w-3 h-3" />
            {triggerInfo.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="flex-1 py-2 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(template)}
          className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg transition"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(template.id)}
          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default function CommunicationTemplates() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterTrigger, setFilterTrigger] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["communicationTemplates"],
    queryFn: () => base44.entities.CommunicationTemplate.list("-created_date"),
    staleTime: 60000,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communicationTemplates"] });
      toast.success("Template created successfully");
      setShowEditor(false);
      setSelectedTemplate(null);
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CommunicationTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communicationTemplates"] });
      toast.success("Template updated successfully");
      setShowEditor(false);
      setSelectedTemplate(null);
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CommunicationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communicationTemplates"] });
      toast.success("Template deleted successfully");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const name = template.name || "";
      const description = template.description || "";
      const search = searchQuery.trim().toLowerCase();
      const trigger = template.trigger_event || "";

      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search) ||
        description.toLowerCase().includes(search);

      const matchesType = filterType === "all" || template.template_type === filterType;

      const matchesChannel =
        filterChannel === "all" ||
        template.channel === filterChannel ||
        (filterChannel === "both" && template.channel === "both");

      const matchesTrigger =
        filterTrigger === "all" || trigger === filterTrigger;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && template.is_active) ||
        (statusFilter === "inactive" && !template.is_active) ||
        (statusFilter === "automated" && template.auto_send);

      return (
        matchesSearch &&
        matchesType &&
        matchesChannel &&
        matchesTrigger &&
        matchesStatus
      );
    });
  }, [templates, searchQuery, filterType, filterChannel, filterTrigger, statusFilter]);

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (template) => {
    const school = schools[0];
    const duplicate = {
      ...template,
      name: `${template.name} (Copy)`,
      school_id: school?.id || "",
      auto_send: false,
    };
    delete duplicate.id;
    delete duplicate.created_date;
    delete duplicate.updated_date;
    delete duplicate.created_by;
    createMutation.mutate(duplicate);
  };

  const handleSave = (data) => {
    const school = schools[0];
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createMutation.mutate({ ...data, school_id: school?.id || "" });
    }
  };

  const stats = useMemo(
    () => ({
      total: templates.length,
      active: templates.filter((t) => t.is_active).length,
      automated: templates.filter((t) => t.auto_send).length,
      email: templates.filter((t) => t.channel === "email" || t.channel === "both").length,
      sms: templates.filter((t) => t.channel === "sms" || t.channel === "both").length,
      filtered: filteredTemplates.length,
    }),
    [templates, filteredTemplates]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center" aria-live="polite">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
              Communication Templates
            </h1>
            <p className="text-zinc-600 text-sm">
              Automate emails and SMS for key scenarios across your driving school
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate(null);
              setShowEditor(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">Total Templates</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
            <p className="text-xs text-indigo-600 mb-1">Automated</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.automated}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-600 mb-1">Email</p>
            <p className="text-2xl font-bold text-blue-700">{stats.email}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-xs text-purple-600 mb-1">SMS</p>
            <p className="text-2xl font-bold text-purple-700">{stats.sms}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-600 mb-1">Matching Filters</p>
            <p className="text-2xl font-bold text-amber-700">{stats.filtered}</p>
          </div>
        </div>
      </motion.header>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name or description"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {TEMPLATE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Channels</option>
              <option value="email">Email Only</option>
              <option value="sms">SMS Only</option>
              <option value="both">Both</option>
            </select>

            <select
              value={filterTrigger}
              onChange={(e) => setFilterTrigger(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Triggers</option>
              {TRIGGER_EVENTS.map((ev) => (
                <option key={ev.value} value={ev.value}>
                  {ev.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="automated">Automated Only</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Templates Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">No templates found</h3>
            <p className="text-zinc-600 mb-6">
              {searchQuery || filterType !== "all" || filterChannel !== "all" || filterTrigger !== "all" || statusFilter !== "all"
                ? "Try adjusting your search and filters"
                : "Create your first communication template to get started"}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTemplate(null);
                setShowEditor(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onPreview={(t) => {
                  setSelectedTemplate(t);
                  setShowPreview(true);
                }}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Template Editor Modal */}
      <TemplateEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onSave={handleSave}
      />

      {/* Template Preview Modal */}
      <TemplatePreview
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />
    </div>
  );
}
