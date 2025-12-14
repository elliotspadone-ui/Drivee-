import React, { useState, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  X,
  Calendar,
  User,
  Clock,
  Shield,
  FileImage,
  File,
  FilePlus,
  FolderOpen,
  MoreVertical,
  Edit,
  Copy,
  Send,
  Printer,
  Archive,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  ExternalLink,
  Link2,
  History,
  Tag,
  Paperclip,
  FileCheck,
  FileX,
  Users,
  Building,
  Lock,
  Unlock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isAfter,
  isBefore,
  formatDistanceToNow,
} from "date-fns";
import { toast } from "sonner";
import FileUpload from "@/components/upload/FileUpload";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import { KPIComparisonCard, AnimatedCounter } from "@/components/charts/KPIComparison";

const DOCUMENT_TYPES = [
  { id: "id", name: "ID Document", icon: <User className="w-4 h-4" />, color: "bg-blue-50 text-blue-600" },
  { id: "learner_permit", name: "Learner Permit", icon: <FileText className="w-4 h-4" />, color: "bg-indigo-50 text-indigo-600" },
  { id: "provisional_license", name: "Provisional License", icon: <FileCheck className="w-4 h-4" />, color: "bg-purple-50 text-purple-600" },
  { id: "full_license", name: "Full License", icon: <Shield className="w-4 h-4" />, color: "bg-emerald-50 text-emerald-600" },
  { id: "contract", name: "Contract", icon: <FileText className="w-4 h-4" />, color: "bg-zinc-100 text-zinc-600" },
  { id: "medical_certificate", name: "Medical Certificate", icon: <FileCheck className="w-4 h-4" />, color: "bg-red-50 text-red-600" },
  { id: "eye_test", name: "Eye Test", icon: <Eye className="w-4 h-4" />, color: "bg-cyan-50 text-cyan-600" },
  { id: "photo", name: "Photo", icon: <FileImage className="w-4 h-4" />, color: "bg-pink-50 text-pink-600" },
  { id: "proof_of_address", name: "Proof of Address", icon: <Building className="w-4 h-4" />, color: "bg-amber-50 text-amber-600" },
  { id: "insurance", name: "Insurance", icon: <Shield className="w-4 h-4" />, color: "bg-teal-50 text-teal-600" },
  { id: "theory_certificate", name: "Theory Certificate", icon: <FileCheck className="w-4 h-4" />, color: "bg-green-50 text-green-600" },
  { id: "practical_certificate", name: "Practical Certificate", icon: <FileCheck className="w-4 h-4" />, color: "bg-lime-50 text-lime-600" },
  { id: "consent_form", name: "Consent Form", icon: <FileText className="w-4 h-4" />, color: "bg-orange-50 text-orange-600" },
  { id: "payment_receipt", name: "Payment Receipt", icon: <FileText className="w-4 h-4" />, color: "bg-violet-50 text-violet-600" },
  { id: "other", name: "Other", icon: <File className="w-4 h-4" />, color: "bg-zinc-50 text-zinc-600" },
];

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (mimeType) => {
  if (!mimeType) return <File className="w-6 h-6" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-6 h-6" />;
  if (mimeType === "application/pdf") return <FileText className="w-6 h-6" />;
  return <File className="w-6 h-6" />;
};

const StatCard = React.memo(({ icon, label, value, color, delay = 0, onClick, isActive }) => (
  <motion.button
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    className={`rounded-2xl border bg-white p-5 shadow-sm text-left w-full transition-all ${
      isActive ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-zinc-200 hover:border-zinc-300"
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
    </div>
    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
  </motion.button>
));

StatCard.displayName = "StatCard";

const DocumentStatusBadge = React.memo(({ document }) => {
  if (document.is_archived) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
        <Archive className="w-3 h-3" />
        Archived
      </span>
    );
  }

  if (document.expiry_date) {
    const expiryDate = parseISO(document.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, new Date());

    if (daysUntilExpiry < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </span>
      );
    }

    if (daysUntilExpiry <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3 h-3" />
          Expires in {daysUntilExpiry}d
        </span>
      );
    }
  }

  if (document.is_verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
});

DocumentStatusBadge.displayName = "DocumentStatusBadge";

const DocumentTypeBadge = React.memo(({ type }) => {
  const typeConfig = DOCUMENT_TYPES.find((t) => t.id === type) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium ${typeConfig.color}`}>
      {typeConfig.icon}
      {typeConfig.name}
    </span>
  );
});

DocumentTypeBadge.displayName = "DocumentTypeBadge";

const UploadModal = React.memo(({ isOpen, onClose, students, onUpload, isUploading }) => {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [documentType, setDocumentType] = useState("other");
  const [selectedFile, setSelectedFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedStudent || !selectedFile) {
      toast.error("Please select a student and file");
      return;
    }

    onUpload({
      studentId: selectedStudent,
      documentType,
      file: selectedFile,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    });

    setSelectedStudent("");
    setDocumentType("other");
    setSelectedFile(null);
    setExpiryDate("");
    setNotes("");
  };

  const resetForm = useCallback(() => {
    setSelectedStudent("");
    setDocumentType("other");
    setSelectedFile(null);
    setExpiryDate("");
    setNotes("");
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">Upload Document</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Student *</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select student</option>
                {students
                  .filter((s) => s.is_active)
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Document Type *</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">File *</label>
              <FileUpload
                onUpload={(result) => setSelectedFile(result.file)}
                accept={[".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]}
                maxSize={10}
                multiple={false}
                title="Upload Document"
                description="Drag and drop or click to browse"
                className="min-h-0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Optional notes about this document..."
              />
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
                disabled={isUploading || !selectedFile || !selectedStudent}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

UploadModal.displayName = "UploadModal";

const DocumentDetailsModal = React.memo(({ document, student, onClose, onVerify, onDelete, onArchive }) => {
  if (!document) return null;

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">Document Details</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                {getFileIcon(document.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-900 truncate">{document.file_name}</h3>
                <p className="text-sm text-zinc-500">{formatFileSize(document.file_size)}</p>
                <div className="mt-1">
                  <DocumentStatusBadge document={document} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Student</span>
                <span className="text-sm font-medium text-zinc-900">
                  {student?.full_name || "Unknown"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Document Type</span>
                <DocumentTypeBadge type={document.document_type} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Uploaded</span>
                <span className="text-sm font-medium text-zinc-900">
                  {format(parseISO(document.created_date), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              {document.expiry_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Expiry Date</span>
                  <span
                    className={`text-sm font-medium ${
                      isBefore(parseISO(document.expiry_date), new Date())
                        ? "text-red-600"
                        : differenceInDays(parseISO(document.expiry_date), new Date()) <= 30
                        ? "text-amber-600"
                        : "text-zinc-900"
                    }`}
                  >
                    {format(parseISO(document.expiry_date), "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {document.document_number && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Document Number</span>
                  <span className="text-sm font-medium text-zinc-900 font-mono">
                    {document.document_number}
                  </span>
                </div>
              )}

              {document.is_verified && document.verified_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Verified</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {format(parseISO(document.verified_at), "MMM d, yyyy")}
                  </span>
                </div>
              )}

              {document.notes && (
                <div className="pt-4 border-t border-zinc-200">
                  <p className="text-sm text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-700">{document.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-200">
            <div className="flex items-center gap-2">
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                title="View Document"
              >
                <ExternalLink className="w-4 h-4 text-zinc-600" />
              </a>
              <a
                href={document.file_url}
                download={document.file_name}
                className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                title="Download"
              >
                <Download className="w-4 h-4 text-zinc-600" />
              </a>
              <button
                onClick={onArchive}
                className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
                title={document.is_archived ? "Unarchive" : "Archive"}
              >
                <Archive className="w-4 h-4 text-zinc-600" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!document.is_verified && !document.is_archived && (
                <button
                  onClick={onVerify}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

DocumentDetailsModal.displayName = "DocumentDetailsModal";

const DocumentCard = React.memo(({ document, student, onView, onVerify, onDelete, index }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              {getFileIcon(document.mime_type)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{document.file_name}</p>
              <p className="text-xs text-zinc-500">{formatFileSize(document.file_size)}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition"
            >
              <MoreVertical className="w-4 h-4 text-zinc-500" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-10"
                >
                  <button
                    onClick={() => {
                      onView();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <a
                    href={document.file_url}
                    download={document.file_name}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    onClick={() => setShowMenu(false)}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  {!document.is_verified && (
                    <button
                      onClick={() => {
                        onVerify();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Verify
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Student</span>
            <span className="text-xs font-medium text-zinc-700 truncate max-w-[120px]">
              {student?.full_name || "Unknown"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Type</span>
            <DocumentTypeBadge type={document.document_type} />
          </div>

          {document.expiry_date && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Expires</span>
              <span
                className={`text-xs font-medium ${
                  isBefore(parseISO(document.expiry_date), new Date())
                    ? "text-red-600"
                    : differenceInDays(parseISO(document.expiry_date), new Date()) <= 30
                    ? "text-amber-600"
                    : "text-zinc-700"
                }`}
              >
                {format(parseISO(document.expiry_date), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
          <DocumentStatusBadge document={document} />
          <span className="text-xs text-zinc-400">
            {formatDistanceToNow(parseISO(document.created_date), { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

DocumentCard.displayName = "DocumentCard";

const DocumentListItem = React.memo(({ document, student, onView, onVerify, onDelete, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            {getFileIcon(document.mime_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-zinc-900 truncate">{document.file_name}</h3>
              <DocumentStatusBadge document={document} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>{student?.full_name || "Unknown"}</span>
              <span>•</span>
              <DocumentTypeBadge type={document.document_type} />
              <span>•</span>
              <span>{formatFileSize(document.file_size)}</span>
              <span>•</span>
              <span>{format(parseISO(document.created_date), "MMM d, yyyy")}</span>
              {document.expiry_date && (
                <>
                  <span>•</span>
                  <span
                    className={
                      isBefore(parseISO(document.expiry_date), new Date())
                        ? "text-red-600"
                        : differenceInDays(parseISO(document.expiry_date), new Date()) <= 30
                        ? "text-amber-600"
                        : ""
                    }
                  >
                    Expires: {format(parseISO(document.expiry_date), "MMM d, yyyy")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!document.is_verified && !document.is_archived && (
            <button
              onClick={onVerify}
              className="p-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition"
              title="Verify"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          <a
            href={document.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
            title="View"
          >
            <Eye className="w-4 h-4 text-zinc-600" />
          </a>
          <a
            href={document.file_url}
            download={document.file_name}
            className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition"
            title="Download"
          >
            <Download className="w-4 h-4 text-zinc-600" />
          </a>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

DocumentListItem.displayName = "DocumentListItem";

export default function Documents() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date"),
    staleTime: 60000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
    staleTime: 300000,
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
    },
    onError: () => {
      toast.error("Failed to upload document");
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document updated successfully");
      setSelectedDocument(null);
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted successfully");
      setSelectedDocument(null);
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);

    return {
      total: documents.length,
      verified: documents.filter((d) => d.is_verified && !d.is_archived).length,
      pending: documents.filter((d) => !d.is_verified && !d.is_archived).length,
      expired: documents.filter(
        (d) => d.expiry_date && isBefore(parseISO(d.expiry_date), now) && !d.is_archived
      ).length,
      expiringSoon: documents.filter(
        (d) =>
          d.expiry_date &&
          isAfter(parseISO(d.expiry_date), now) &&
          isBefore(parseISO(d.expiry_date), thirtyDaysFromNow) &&
          !d.is_archived
      ).length,
      archived: documents.filter((d) => d.is_archived).length,
    };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);

    return documents
      .filter((doc) => {
        const student = studentMap.get(doc.student_id);
        const matchesSearch =
          doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.document_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === "all" || doc.document_type === filterType;

        let matchesStatus = true;
        switch (filterStatus) {
          case "verified":
            matchesStatus = doc.is_verified && !doc.is_archived;
            break;
          case "pending":
            matchesStatus = !doc.is_verified && !doc.is_archived;
            break;
          case "expired":
            matchesStatus =
              !!doc.expiry_date && isBefore(parseISO(doc.expiry_date), now) && !doc.is_archived;
            break;
          case "expiring_soon":
            matchesStatus =
              !!doc.expiry_date &&
              isAfter(parseISO(doc.expiry_date), now) &&
              isBefore(parseISO(doc.expiry_date), thirtyDaysFromNow) &&
              !doc.is_archived;
            break;
          case "archived":
            matchesStatus = !!doc.is_archived;
            break;
        }

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case "file_name":
            comparison = (a.file_name || "").localeCompare(b.file_name || "");
            break;
          case "document_type":
            comparison = a.document_type.localeCompare(b.document_type);
            break;
          case "expiry_date":
            const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
            const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
            comparison = dateA - dateB;
            break;
          case "created_date":
          default:
            comparison =
              new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [documents, studentMap, searchTerm, filterType, filterStatus, sortField, sortDirection]);

  const handleUpload = useCallback(
    async (data) => {
      setIsUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });

        await createDocumentMutation.mutateAsync({
          student_id: data.studentId,
          document_type: data.documentType,
          file_name: data.file.name,
          file_url,
          file_size: data.file.size,
          mime_type: data.file.type,
          is_verified: false,
          expiry_date: data.expiryDate,
          notes: data.notes,
        });
      } catch (error) {
        toast.error("Failed to upload document");
      } finally {
        setIsUploading(false);
      }
    },
    [createDocumentMutation]
  );

  const handleVerify = useCallback(
    (doc) => {
      updateDocumentMutation.mutate({
        id: doc.id,
        data: {
          is_verified: true,
          verified_at: new Date().toISOString(),
        },
      });
    },
    [updateDocumentMutation]
  );

  const handleArchive = useCallback(
    (doc) => {
      updateDocumentMutation.mutate({
        id: doc.id,
        data: { is_archived: !doc.is_archived },
      });
    },
    [updateDocumentMutation]
  );

  const handleDelete = useCallback(
    (id) => {
      if (window.confirm("Are you sure you want to delete this document?")) {
        deleteDocumentMutation.mutate(id);
      }
    },
    [deleteDocumentMutation]
  );

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

  if (loadingDocuments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading documents...</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Document Management</h1>
          <p className="text-zinc-600 mt-1">Store and verify student documents securely</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition"
        >
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      </motion.header>
      </ScrollFadeIn>

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-indigo-600" />}
          label="Total"
          value={stats.total}
          color="bg-indigo-50"
          delay={0.05}
          onClick={() => setFilterStatus("all")}
          isActive={filterStatus === "all"}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          label="Verified"
          value={stats.verified}
          color="bg-emerald-50"
          delay={0.1}
          onClick={() => setFilterStatus("verified")}
          isActive={filterStatus === "verified"}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          label="Pending"
          value={stats.pending}
          color="bg-amber-50"
          delay={0.15}
          onClick={() => setFilterStatus("pending")}
          isActive={filterStatus === "pending"}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="Expired"
          value={stats.expired}
          color="bg-red-50"
          delay={0.2}
          onClick={() => setFilterStatus("expired")}
          isActive={filterStatus === "expired"}
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
          label="Expiring Soon"
          value={stats.expiringSoon}
          color="bg-orange-50"
          delay={0.25}
          onClick={() => setFilterStatus("expiring_soon")}
          isActive={filterStatus === "expiring_soon"}
        />
        <StatCard
          icon={<Archive className="w-5 h-5 text-zinc-600" />}
          label="Archived"
          value={stats.archived}
          color="bg-zinc-100"
          delay={0.3}
          onClick={() => setFilterStatus("archived")}
          isActive={filterStatus === "archived"}
        />
      </div>
      </StaggerFadeIn>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="created_date">Date Added</option>
              <option value="file_name">File Name</option>
              <option value="document_type">Type</option>
              <option value="expiry_date">Expiry Date</option>
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
              {["list", "grid"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    viewMode === mode
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {mode === "grid" ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {filteredDocuments.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <FolderOpen className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-600 mb-4">
              {documents.length === 0
                ? "No documents uploaded yet"
                : "No documents match your search criteria"}
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Upload First Document
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                student={studentMap.get(doc.student_id)}
                onView={() => setSelectedDocument(doc)}
                onVerify={() => handleVerify(doc)}
                onDelete={() => handleDelete(doc.id)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc, index) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                student={studentMap.get(doc.student_id)}
                onView={() => setSelectedDocument(doc)}
                onVerify={() => handleVerify(doc)}
                onDelete={() => handleDelete(doc.id)}
                index={index}
              />
            ))}
          </div>
        )}
      </motion.div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        students={students}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      <DocumentDetailsModal
        document={selectedDocument}
        student={selectedDocument ? studentMap.get(selectedDocument.student_id) : undefined}
        onClose={() => setSelectedDocument(null)}
        onVerify={() => selectedDocument && handleVerify(selectedDocument)}
        onDelete={() => selectedDocument && handleDelete(selectedDocument.id)}
        onArchive={() => selectedDocument && handleArchive(selectedDocument)}
      />
    </div>
    </>
  );
}