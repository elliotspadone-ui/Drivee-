import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  parseISO,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isValid,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  FileDown,
  Info,
  Filter,
  Calendar,
  RefreshCw,
  HelpCircle,
  X,
  Settings,
  Loader2,
  Shield,
  User,
  CreditCard,
  FileCheck,
  Car,
  BookOpen,
  Receipt,
  Users,
  Search,
  ChevronDown,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// CONSTANTS
// ============================================

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
];

const ENTITY_CONFIG = {
  Invoice: { icon: FileCheck, color: "bg-blue-100 text-blue-600", label: "Invoice" },
  Payment: { icon: CreditCard, color: "bg-emerald-100 text-emerald-600", label: "Payment" },
  Booking: { icon: Calendar, color: "bg-purple-100 text-purple-600", label: "Booking" },
  Student: { icon: User, color: "bg-amber-100 text-amber-600", label: "Student" },
  Instructor: { icon: Users, color: "bg-indigo-100 text-indigo-600", label: "Instructor" },
  Vehicle: { icon: Car, color: "bg-cyan-100 text-cyan-600", label: "Vehicle" },
  Expense: { icon: Receipt, color: "bg-red-100 text-red-600", label: "Expense" },
};

const ACTION_CONFIG = {
  create: { icon: Plus, color: "text-emerald-600", label: "Created" },
  update: { icon: Edit, color: "text-blue-600", label: "Updated" },
  delete: { icon: Trash2, color: "text-red-600", label: "Deleted" },
  view: { icon: Eye, color: "text-zinc-500", label: "Viewed" },
};

const ENTITY_FILTER_OPTIONS = [
  { label: "All Entities", value: "all" },
  { label: "Invoices", value: "Invoice" },
  { label: "Payments", value: "Payment" },
  { label: "Bookings", value: "Booking" },
  { label: "Students", value: "Student" },
  { label: "Expenses", value: "Expense" },
];

const QUERY_CONFIG = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const escapeCsv = (value) => {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
};

const generateFileName = (reportName, fileExtension, dateRange) => {
  const sanitized = reportName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const startDate = format(parseISO(dateRange.start), "yyyyMMdd");
  const endDate = format(parseISO(dateRange.end), "yyyyMMdd");
  const timestamp = format(new Date(), "yyyyMMdd_HHmm");
  return `${sanitized}_${startDate}_${endDate}_${timestamp}.${fileExtension.toLowerCase()}`;
};

const isInDateRange = (dateStr, startDate, endDate) => {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return false;
    return isWithinInterval(date, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate)),
    });
  } catch {
    return false;
  }
};

const getDateRangeFromPreset = (preset) => {
  const today = new Date();
  let start, end;

  switch (preset) {
    case "today":
      start = startOfDay(today);
      end = endOfDay(today);
      break;
    case "this_week":
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
      break;
    case "this_month":
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    case "last_month":
      const lastMonth = subMonths(today, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    case "last_7_days":
      start = subMonths(today, 0);
      start.setDate(today.getDate() - 7);
      end = today;
      break;
    case "last_30_days":
      start = subMonths(today, 0);
      start.setDate(today.getDate() - 30);
      end = today;
      break;
    default:
      start = startOfMonth(today);
      end = endOfMonth(today);
  }

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
};

const formatDateRange = (startDate, endDate) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return 'Invalid date range';
  return `${format(start, "MMMM d, yyyy")} to ${format(end, "MMMM d, yyyy")}`;
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToExcel = (entries, config) => {
  const xmlParts = [];
  
  xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlParts.push(`<?mso-application progid="Excel.Sheet"?>`);
  xmlParts.push(`<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`);
  
  xmlParts.push(`<Styles>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style>
    <Style ss:ID="Subtitle"><Font ss:Size="10" ss:Color="#666666"/></Style>
    <Style ss:ID="DateTime"><NumberFormat ss:Format="yyyy-mm-dd hh:mm:ss"/></Style>
  </Styles>`);
  
  xmlParts.push(`<Worksheet ss:Name="Audit Log">`);
  xmlParts.push(`<Table>`);
  
  // Header
  xmlParts.push(`<Row><Cell ss:StyleID="Title"><Data ss:Type="String">${config.companyName}</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Audit Log Report</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}</Data></Cell></Row>`);
  xmlParts.push(`<Row></Row>`);
  
  // Column Headers
  xmlParts.push(`<Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date & Time</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Action</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Entity Type</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Entity ID</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">User</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Details</Data></Cell>
  </Row>`);
  
  // Data rows
  entries.forEach(entry => {
    xmlParts.push(`<Row>
      <Cell ss:StyleID="DateTime"><Data ss:Type="String">${entry.date ? format(parseISO(entry.date), "yyyy-MM-dd HH:mm:ss") : ""}</Data></Cell>
      <Cell><Data ss:Type="String">${entry.action || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${entry.entity || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${entry.entityId || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${entry.user || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${entry.details || ""}</Data></Cell>
    </Row>`);
  });
  
  xmlParts.push(`</Table></Worksheet></Workbook>`);
  
  const xmlContent = xmlParts.join('\n');
  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const fileName = generateFileName("Audit_Log", "xls", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
  toast.success("Excel file exported successfully");
};

const exportToPDF = (entries, config) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Audit Log Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 10px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .header h1 { color: #4F46E5; margin: 0 0 5px 0; font-size: 22px; }
        .header p { color: #666; margin: 2px 0; }
        .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .summary h3 { margin: 0 0 5px 0; font-size: 12px; color: #64748b; }
        .summary p { margin: 0; font-size: 20px; font-weight: bold; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4F46E5; color: white; padding: 10px 8px; text-align: left; font-size: 9px; }
        td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        .action-create { color: #059669; }
        .action-update { color: #2563eb; }
        .action-delete { color: #dc2626; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 9px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.companyName}</h1>
        <p><strong>Audit Log Report</strong></p>
        <p>${format(parseISO(config.startDate), "MMMM d, yyyy")} to ${format(parseISO(config.endDate), "MMMM d, yyyy")}</p>
      </div>
      
      <div class="summary">
        <h3>Total Events</h3>
        <p>${entries.length}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Action</th>
            <th>Entity</th>
            <th>ID</th>
            <th>User</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${entry.date ? format(parseISO(entry.date), "MMM d, yyyy HH:mm") : "—"}</td>
              <td class="action-${entry.actionType}">${entry.action}</td>
              <td>${entry.entity}</td>
              <td style="font-family: monospace; font-size: 9px;">${entry.entityId || "—"}</td>
              <td>${entry.user}</td>
              <td>${entry.details}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated: ${format(config.generatedAt, "MMMM d, yyyy 'at' HH:mm")}</p>
        <p>Report ID: AUDIT-${format(config.generatedAt, "yyyyMMddHHmmss")}</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
    toast.success("PDF ready for printing");
  } else {
    toast.error("Pop-up blocked. Please allow pop-ups for PDF export.");
  }
};

const exportToCSV = (entries, config) => {
  const rows = [];
  
  rows.push([config.companyName]);
  rows.push(["Audit Log Report"]);
  rows.push([`Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}`]);
  rows.push([]);
  
  rows.push(["Date & Time", "Action", "Entity Type", "Entity ID", "User", "Details"]);
  
  entries.forEach(entry => {
    rows.push([
      entry.date ? format(parseISO(entry.date), "yyyy-MM-dd HH:mm:ss") : "",
      entry.action || "",
      entry.entity || "",
      entry.entityId || "",
      entry.user || "",
      entry.details || "",
    ]);
  });
  
  const csvContent = rows.map(row => row.map(cell => escapeCsv(cell)).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("Audit_Log", "csv", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
  toast.success("CSV file exported successfully");
};

// ============================================
// UI COMPONENTS
// ============================================

const KPICard = memo(({ label, value, icon, color, subtext }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    <div className="text-xs text-zinc-500 mb-1 font-medium">{label}</div>
    <div className="text-xl font-bold text-zinc-900">{value}</div>
    {subtext && <div className="text-xs text-zinc-400 mt-1">{subtext}</div>}
  </motion.div>
));

const AuditEntry = memo(({ entry, index }) => {
  const entityConfig = ENTITY_CONFIG[entry.entity] || { icon: FileCheck, color: "bg-zinc-100 text-zinc-600", label: entry.entity };
  const EntityIcon = entityConfig.icon;
  const actionConfig = ACTION_CONFIG[entry.actionType] || ACTION_CONFIG.create;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-start gap-4 p-4 bg-white rounded-xl border border-zinc-200 hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-lg ${entityConfig.color} flex items-center justify-center flex-shrink-0`}>
        <EntityIcon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${actionConfig.color}`}>{entry.action}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-sm text-zinc-600">{entityConfig.label}</span>
          </div>
          <span className="text-xs text-zinc-400">
            {entry.date ? format(parseISO(entry.date), "MMM d, yyyy 'at' h:mm a") : "—"}
          </span>
        </div>
        
        <p className="text-sm text-zinc-600 mb-2">{entry.details}</p>
        
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {entry.user}
          </span>
          <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded">
            ID: {entry.entityId}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function AuditLog() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => {
    const defaultRange = getDateRangeFromPreset("this_month");
    return {
      preset: "this_month",
      startDate: defaultRange.start,
      endDate: defaultRange.end,
      entityFilter: "all",
      searchTerm: "",
    };
  });

  const [showFilters, setShowFilters] = useState(true);
  const [user, setUser] = useState(null);

  const { data: invoices = [], isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      try {
        return await base44.entities.Invoice?.list() || [];
      } catch {
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  const { data: payments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
    ...QUERY_CONFIG,
  });

  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
    ...QUERY_CONFIG,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
    ...QUERY_CONFIG,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      try {
        return await base44.entities.Expense?.list() || [];
      } catch {
        return [];
      }
    },
    ...QUERY_CONFIG,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
    ...QUERY_CONFIG,
  });

  const currentSchool = schools[0];
  const isLoading = loadingInvoices || loadingPayments || loadingBookings || loadingStudents || loadingExpenses;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        console.log("User not authenticated");
      }
    };
    loadUser();
  }, []);

  // Build audit entries
  const allEntries = useMemo(() => {
    const entries = [];

    // Invoices
    invoices.forEach(inv => {
      if (isInDateRange(inv.created_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `inv-c-${inv.id}`,
          date: inv.created_date,
          action: "Invoice Created",
          actionType: "create",
          entity: "Invoice",
          entityId: inv.invoice_number || inv.id?.substring(0, 8),
          user: inv.created_by || "System",
          details: `Amount: ${formatCurrency(inv.total_amount)} • Status: ${inv.status || 'draft'}`,
        });
      }
      if (inv.updated_date && inv.updated_date !== inv.created_date && isInDateRange(inv.updated_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `inv-u-${inv.id}`,
          date: inv.updated_date,
          action: "Invoice Updated",
          actionType: "update",
          entity: "Invoice",
          entityId: inv.invoice_number || inv.id?.substring(0, 8),
          user: inv.created_by || "System",
          details: `Status changed to: ${inv.status || 'unknown'}`,
        });
      }
    });

    // Payments
    payments.forEach(pay => {
      if (isInDateRange(pay.created_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `pay-${pay.id}`,
          date: pay.created_date,
          action: "Payment Recorded",
          actionType: "create",
          entity: "Payment",
          entityId: pay.transaction_id || pay.id?.substring(0, 8),
          user: pay.created_by || "System",
          details: `Amount: ${formatCurrency(pay.amount)} • Method: ${pay.payment_method || 'N/A'} • Status: ${pay.status || 'pending'}`,
        });
      }
    });

    // Bookings
    bookings.forEach(book => {
      if (isInDateRange(book.created_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `book-c-${book.id}`,
          date: book.created_date,
          action: "Booking Created",
          actionType: "create",
          entity: "Booking",
          entityId: book.id?.substring(0, 8),
          user: book.created_by || "System",
          details: `Status: ${book.status || 'pending'} • Price: ${formatCurrency(book.price)}`,
        });
      }
      if (book.cancelled_at && isInDateRange(book.cancelled_at, filters.startDate, filters.endDate)) {
        entries.push({
          id: `book-x-${book.id}`,
          date: book.cancelled_at,
          action: "Booking Cancelled",
          actionType: "delete",
          entity: "Booking",
          entityId: book.id?.substring(0, 8),
          user: book.created_by || "System",
          details: `Reason: ${book.cancellation_reason || 'Not specified'}`,
        });
      }
    });

    // Students
    students.forEach(student => {
      if (isInDateRange(student.created_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `stu-${student.id}`,
          date: student.created_date,
          action: "Student Registered",
          actionType: "create",
          entity: "Student",
          entityId: student.id?.substring(0, 8),
          user: student.created_by || "System",
          details: `Name: ${student.full_name || 'N/A'} • License: ${student.license_category || 'B'}`,
        });
      }
    });

    // Expenses
    expenses.forEach(exp => {
      if (isInDateRange(exp.created_date, filters.startDate, filters.endDate)) {
        entries.push({
          id: `exp-${exp.id}`,
          date: exp.created_date,
          action: "Expense Recorded",
          actionType: "create",
          entity: "Expense",
          entityId: exp.id?.substring(0, 8),
          user: exp.created_by || "System",
          details: `Amount: ${formatCurrency(exp.amount)} • Category: ${exp.category || 'Other'}`,
        });
      }
    });

    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [invoices, payments, bookings, students, expenses, filters.startDate, filters.endDate]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (filters.entityFilter !== "all") {
      result = result.filter(e => e.entity === filters.entityFilter);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.action || "").toLowerCase().includes(term) ||
        (e.details || "").toLowerCase().includes(term) ||
        (e.user || "").toLowerCase().includes(term) ||
        (e.entityId || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [allEntries, filters.entityFilter, filters.searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const byEntity = {};
    const byAction = { create: 0, update: 0, delete: 0 };
    
    filteredEntries.forEach(e => {
      byEntity[e.entity] = (byEntity[e.entity] || 0) + 1;
      if (byAction[e.actionType] !== undefined) {
        byAction[e.actionType]++;
      }
    });
    
    return { byEntity, byAction, total: filteredEntries.length };
  }, [filteredEntries]);

  const handlePreset = useCallback((presetValue) => {
    const dateRange = getDateRangeFromPreset(presetValue);
    setFilters(prev => ({
      ...prev,
      preset: presetValue,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }));
  }, []);

  const handleExport = useCallback((exportType) => {
    const exportConfig = {
      companyName: currentSchool?.name || "DrivePro Driving School",
      startDate: filters.startDate,
      endDate: filters.endDate,
      generatedAt: new Date(),
      preparedBy: user?.full_name || "System",
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(filteredEntries, exportConfig);
          break;
        case "pdf":
          exportToPDF(filteredEntries, exportConfig);
          break;
        case "csv":
          exportToCSV(filteredEntries, exportConfig);
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    }
  }, [filteredEntries, filters, currentSchool, user]);

  const handleRefresh = useCallback(() => {
    refetchInvoices();
    refetchPayments();
    refetchBookings();
    toast.success("Data refreshed");
  }, [refetchInvoices, refetchPayments, refetchBookings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-zinc-500">Loading audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(createPageUrl("Finance"))} 
              className="p-2 hover:bg-zinc-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Audit Log</h1>
              <p className="text-sm text-zinc-500">
                {formatDateRange(filters.startDate, filters.endDate)}
                <span className="mx-2">•</span>
                {filteredEntries.length} events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                showFilters ? "bg-[#e8f4fa] text-[#3b82c4]" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-zinc-100 transition" title="Refresh">
              <RefreshCw className="w-4 h-4 text-zinc-500" />
            </button>

            <div className="h-6 w-px bg-zinc-200 mx-1 hidden sm:block" />

            <button 
              onClick={() => handleExport("excel")} 
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3] transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button 
              onClick={() => handleExport("pdf")} 
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#fdeeed] text-[#e44138] hover:bg-[#f9d4d2] transition"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button 
              onClick={() => handleExport("csv")} 
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5] transition"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <KPICard 
            label="Total Events" 
            value={stats.total.toString()} 
            icon={<Shield className="w-4 h-4 text-[#3b82c4]" />} 
            color="bg-[#e8f4fa]"
          />
          <KPICard 
            label="Created" 
            value={stats.byAction.create.toString()} 
            icon={<Plus className="w-4 h-4 text-[#5cb83a]" />} 
            color="bg-[#eefbe7]"
          />
          <KPICard 
            label="Updated" 
            value={stats.byAction.update.toString()} 
            icon={<Edit className="w-4 h-4 text-[#6c376f]" />} 
            color="bg-[#f3e8f4]"
          />
          <KPICard 
            label="Deleted" 
            value={stats.byAction.delete.toString()} 
            icon={<Trash2 className="w-4 h-4 text-[#e44138]" />} 
            color="bg-[#fdeeed]"
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm sticky top-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-zinc-400" />
                    Filters
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* Date Period Presets */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Period
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DATE_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handlePreset(preset.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            filters.preset === preset.value 
                              ? "bg-[#3b82c4] text-white shadow-sm" 
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Custom Range</label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">From</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, preset: "custom" }))}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">To</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, preset: "custom" }))}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entity Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-zinc-400" />
                      Entity Type
                    </label>
                    <select
                      value={filters.entityFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, entityFilter: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] bg-white"
                    >
                      {ENTITY_FILTER_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-zinc-400" />
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="User, action, details..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                    />
                  </div>

                  {/* Entity breakdown */}
                  <div className="pt-4 border-t border-zinc-200">
                    <p className="text-xs font-semibold text-zinc-600 mb-3">Activity by Entity</p>
                    <div className="space-y-2">
                      {Object.entries(stats.byEntity).map(([entity, count]) => {
                        const config = ENTITY_CONFIG[entity] || { color: "bg-zinc-100 text-zinc-600" };
                        return (
                          <div key={entity} className="flex items-center justify-between text-sm">
                            <span className="text-zinc-600">{entity}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main List */}
        <div className={showFilters ? "lg:col-span-4" : "lg:col-span-5"}>
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
                <Shield className="w-16 h-16 mx-auto text-zinc-300 mb-4" />
                <h3 className="font-semibold text-zinc-700 mb-2">No Activity Found</h3>
                <p className="text-sm text-zinc-500">No events match your current filters. Try adjusting the date range or entity type.</p>
              </div>
            ) : (
              filteredEntries.map((entry, index) => (
                <AuditEntry key={entry.id} entry={entry} index={index} />
              ))
            )}
          </div>

          {/* Info Card */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border border-[#d4eaf5]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#d4eaf5] flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#3b82c4]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2563a3]">Audit Trail</p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  This log tracks all system activity including record creation, updates, and deletions. 
                  Use this for compliance, troubleshooting, or reviewing user actions. Export for your records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}