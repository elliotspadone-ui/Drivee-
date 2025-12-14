import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  parseISO,
  subMonths,
  subQuarters,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWithinInterval,
  startOfDay,
  endOfDay,
  differenceInDays,
  addDays,
  isValid,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { getCountryConfig } from "@/components/utils/localisation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileSpreadsheet,
  FileText,
  FileDown,
  Info,
  Filter,
  Calendar,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  X,
  Settings,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Scale,
  CreditCard,
  AlertCircle,
  FileCheck,
  Banknote,
  CalendarClock,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// CONSTANTS
// ============================================

const DATE_PRESETS = [
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
];

const FILING_STATUS = {
  not_due: { label: "Not Yet Due", color: "bg-zinc-100 text-zinc-700", icon: Clock },
  upcoming: { label: "Due Soon", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  filed: { label: "Filed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
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

const formatCurrency = (value, options = {}) => {
  const { showSign = false, showZero = false } = options;
  if (value === null || value === undefined) return "—";
  if (value === 0 && !showZero) return "—";

  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  if (value < 0) return `(${formatted})`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
};

const formatPercent = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

const roundTo = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
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
    case "this_quarter":
      start = startOfQuarter(today);
      end = endOfQuarter(today);
      break;
    case "last_quarter":
      const lastQuarter = subQuarters(today, 1);
      start = startOfQuarter(lastQuarter);
      end = endOfQuarter(lastQuarter);
      break;
    case "this_year":
      start = startOfYear(today);
      end = endOfYear(today);
      break;
    case "last_year":
      const lastYear = subYears(today, 1);
      start = startOfYear(lastYear);
      end = endOfYear(lastYear);
      break;
    default:
      start = startOfQuarter(today);
      end = endOfQuarter(today);
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

const calculateVATFromGross = (grossAmount, rate) => {
  if (rate === 0) return { net: grossAmount, vat: 0 };
  const net = roundTo(grossAmount / (1 + rate), 2);
  const vat = roundTo(grossAmount - net, 2);
  return { net, vat };
};

const getFilingStatus = (dueDate) => {
  const today = new Date();
  const due = parseISO(dueDate);
  const daysUntilDue = differenceInDays(due, today);
  
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 14) return "upcoming";
  return "not_due";
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

const exportToExcel = (liabilityData, periods, config) => {
  const xmlParts = [];
  
  xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlParts.push(`<?mso-application progid="Excel.Sheet"?>`);
  xmlParts.push(`<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`);
  
  xmlParts.push(`<Styles>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>
    <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style>
    <Style ss:ID="Subtitle"><Font ss:Size="10" ss:Color="#666666"/></Style>
    <Style ss:ID="Currency"><NumberFormat ss:Format="€#,##0.00"/></Style>
    <Style ss:ID="CurrencyBold"><NumberFormat ss:Format="€#,##0.00"/><Font ss:Bold="1"/></Style>
    <Style ss:ID="Date"><NumberFormat ss:Format="yyyy-mm-dd"/></Style>
    <Style ss:ID="TotalRow"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
    <Style ss:ID="DueRow"><Font ss:Bold="1"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  </Styles>`);
  
  xmlParts.push(`<Worksheet ss:Name="Tax Liability">`);
  xmlParts.push(`<Table>`);
  
  // Header
  xmlParts.push(`<Row><Cell ss:StyleID="Title"><Data ss:Type="String">${config.companyName}</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Tax Liability Report</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Generated: ${format(config.generatedAt, "MMMM d, yyyy HH:mm")}</Data></Cell></Row>`);
  xmlParts.push(`<Row></Row>`);
  
  // Summary
  xmlParts.push(`<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Summary</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell><Data ss:Type="String">Total VAT Due</Data></Cell><Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${liabilityData.totalVatDue}</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell><Data ss:Type="String">Total Transactions</Data></Cell><Cell><Data ss:Type="Number">${liabilityData.totalTransactions}</Data></Cell></Row>`);
  xmlParts.push(`<Row></Row>`);
  
  // Period breakdown
  xmlParts.push(`<Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Period</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">VAT Collected</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">VAT Paid</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Net Due</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Due Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
  </Row>`);
  
  periods.forEach(period => {
    xmlParts.push(`<Row>
      <Cell><Data ss:Type="String">${period.label}</Data></Cell>
      <Cell ss:StyleID="Currency"><Data ss:Type="Number">${period.vatCollected}</Data></Cell>
      <Cell ss:StyleID="Currency"><Data ss:Type="Number">${period.vatPaid}</Data></Cell>
      <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${period.netDue}</Data></Cell>
      <Cell ss:StyleID="Date"><Data ss:Type="String">${period.dueDate}</Data></Cell>
      <Cell><Data ss:Type="String">${period.statusLabel}</Data></Cell>
    </Row>`);
  });
  
  xmlParts.push(`</Table></Worksheet></Workbook>`);
  
  const xmlContent = xmlParts.join('\n');
  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const fileName = generateFileName("Tax_Liability", "xls", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
  toast.success("Excel file exported successfully");
};

const exportToPDF = (liabilityData, periods, config) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tax Liability Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 11px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .header h1 { color: #4F46E5; margin: 0 0 5px 0; font-size: 22px; }
        .header p { color: #666; margin: 2px 0; }
        .summary { display: flex; gap: 20px; margin-bottom: 30px; }
        .summary-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
        .summary-card.due { background: #fef2f2; border-color: #fecaca; }
        .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #64748b; }
        .summary-card p { margin: 0; font-size: 20px; font-weight: bold; color: #1e293b; }
        .summary-card.due p { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4F46E5; color: white; padding: 10px 8px; text-align: left; font-size: 10px; }
        td { padding: 10px 8px; border-bottom: 1px solid #eee; }
        .amount { text-align: right; font-family: monospace; }
        .status-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; }
        .status-overdue { background: #fee2e2; color: #dc2626; }
        .status-upcoming { background: #fef3c7; color: #d97706; }
        .status-not_due { background: #f1f5f9; color: #475569; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 9px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.companyName}</h1>
        <p><strong>Tax Liability Report</strong></p>
        <p>As of ${format(config.generatedAt, "MMMM d, yyyy")}</p>
      </div>
      
      <div class="summary">
        <div class="summary-card due">
          <h3>Total VAT Due</h3>
          <p>${formatCurrency(liabilityData.totalVatDue)}</p>
        </div>
        <div class="summary-card">
          <h3>VAT Collected</h3>
          <p>${formatCurrency(liabilityData.totalVatCollected)}</p>
        </div>
        <div class="summary-card">
          <h3>VAT Paid</h3>
          <p>${formatCurrency(liabilityData.totalVatPaid)}</p>
        </div>
        <div class="summary-card">
          <h3>Transactions</h3>
          <p>${liabilityData.totalTransactions}</p>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th class="amount">VAT Collected</th>
            <th class="amount">VAT Paid</th>
            <th class="amount">Net Due</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${periods.map(period => `
            <tr>
              <td>${period.label}</td>
              <td class="amount">${formatCurrency(period.vatCollected)}</td>
              <td class="amount">${formatCurrency(period.vatPaid)}</td>
              <td class="amount" style="font-weight: bold;">${formatCurrency(period.netDue)}</td>
              <td>${period.dueDate}</td>
              <td><span class="status-badge status-${period.status}">${period.statusLabel}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated: ${format(config.generatedAt, "MMMM d, yyyy 'at' HH:mm")} | Currency: EUR</p>
        <p>Report ID: TAX-LIABILITY-${format(config.generatedAt, "yyyyMMddHHmmss")}</p>
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

const exportToCSV = (liabilityData, periods, config) => {
  const rows = [];
  
  rows.push([config.companyName]);
  rows.push(["Tax Liability Report"]);
  rows.push([`Generated: ${format(config.generatedAt, "MMMM d, yyyy HH:mm")}`]);
  rows.push([]);
  
  rows.push(["Summary"]);
  rows.push(["Total VAT Due", liabilityData.totalVatDue.toFixed(2)]);
  rows.push(["Total VAT Collected", liabilityData.totalVatCollected.toFixed(2)]);
  rows.push(["Total VAT Paid", liabilityData.totalVatPaid.toFixed(2)]);
  rows.push(["Total Transactions", liabilityData.totalTransactions]);
  rows.push([]);
  
  rows.push(["Period", "VAT Collected", "VAT Paid", "Net Due", "Due Date", "Status"]);
  
  periods.forEach(period => {
    rows.push([
      period.label,
      period.vatCollected.toFixed(2),
      period.vatPaid.toFixed(2),
      period.netDue.toFixed(2),
      period.dueDate,
      period.statusLabel,
    ]);
  });
  
  const csvContent = rows.map(row => row.map(cell => escapeCsv(cell)).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("Tax_Liability", "csv", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
  toast.success("CSV file exported successfully");
};

// ============================================
// UI COMPONENTS
// ============================================

const KPICard = memo(({ label, value, icon, color, subtext, isHighlighted = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-xl border ${isHighlighted ? 'border-red-300 ring-2 ring-red-100' : 'border-zinc-200'} p-4 shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className="flex items-start justify-between mb-2">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        {icon}
      </div>
    </div>
    <div className="text-xs text-zinc-500 mb-1 font-medium">{label}</div>
    <div className={`text-xl font-bold ${isHighlighted ? 'text-red-600' : 'text-zinc-900'}`}>{value}</div>
    {subtext && <div className="text-xs text-zinc-400 mt-1">{subtext}</div>}
  </motion.div>
));

const PeriodCard = memo(({ period, onClick }) => {
  const statusConfig = FILING_STATUS[period.status] || FILING_STATUS.not_due;
  const StatusIcon = statusConfig.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        period.status === 'overdue' ? 'border-l-4 border-l-red-500' : 
        period.status === 'upcoming' ? 'border-l-4 border-l-amber-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-zinc-900">{period.label}</h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">VAT Collected</p>
          <p className="text-sm font-semibold text-[#5cb83a]">{formatCurrency(period.vatCollected)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">VAT Paid</p>
          <p className="text-sm font-semibold text-[#6c376f]">{formatCurrency(period.vatPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Net Due</p>
          <p className={`text-sm font-bold ${period.netDue >= 0 ? 'text-[#e44138]' : 'text-[#5cb83a]'}`}>
            {formatCurrency(Math.abs(period.netDue))}
            {period.netDue < 0 && <span className="text-xs ml-1">(refund)</span>}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarClock className="w-4 h-4" />
          Due: {period.dueDate}
        </div>
        <div className="text-xs text-zinc-400">
          {period.transactionCount} transactions
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function TaxLiability() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => {
    const defaultRange = getDateRangeFromPreset("this_year");
    return {
      preset: "this_year",
      startDate: defaultRange.start,
      endDate: defaultRange.end,
    };
  });

  const [showFilters, setShowFilters] = useState(true);
  const [user, setUser] = useState(null);

  const { data: payments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
    ...QUERY_CONFIG,
  });

  const { data: expenses = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
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
  const operatingCountry = currentSchool?.operating_country || "FR";
  const countryConfig = useMemo(() => getCountryConfig(operatingCountry), [operatingCountry]);

  const isLoading = loadingPayments || loadingExpenses;

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

  // Build quarterly periods
  const periods = useMemo(() => {
    const result = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Generate last 4 quarters
    for (let i = 0; i < 4; i++) {
      const quarterStart = startOfQuarter(subQuarters(today, i));
      const quarterEnd = endOfQuarter(subQuarters(today, i));
      const dueDate = addDays(quarterEnd, 19); // VAT due 19th of following month
      
      const quarterPayments = payments.filter(p => 
        p.status === "completed" &&
        isInDateRange(p.payment_date || p.created_date, format(quarterStart, "yyyy-MM-dd"), format(quarterEnd, "yyyy-MM-dd"))
      );
      
      const quarterExpenses = expenses.filter(e =>
        isInDateRange(e.expense_date || e.created_date, format(quarterStart, "yyyy-MM-dd"), format(quarterEnd, "yyyy-MM-dd"))
      );
      
      const vatCollected = quarterPayments.reduce((sum, p) => {
        const { vat } = calculateVATFromGross(p.amount || 0, 0.23);
        return sum + vat;
      }, 0);
      
      const vatPaid = quarterExpenses.reduce((sum, e) => {
        const rate = e.tax_rate ?? 0.23;
        const { vat } = calculateVATFromGross(e.amount || 0, rate);
        return sum + vat;
      }, 0);
      
      const netDue = roundTo(vatCollected - vatPaid, 2);
      const status = getFilingStatus(format(dueDate, "yyyy-MM-dd"));
      
      result.push({
        id: `Q${Math.ceil((quarterStart.getMonth() + 1) / 3)}-${quarterStart.getFullYear()}`,
        label: `Q${Math.ceil((quarterStart.getMonth() + 1) / 3)} ${quarterStart.getFullYear()}`,
        startDate: format(quarterStart, "yyyy-MM-dd"),
        endDate: format(quarterEnd, "yyyy-MM-dd"),
        dueDate: format(dueDate, "MMM d, yyyy"),
        vatCollected: roundTo(vatCollected, 2),
        vatPaid: roundTo(vatPaid, 2),
        netDue,
        status,
        statusLabel: FILING_STATUS[status]?.label || "Unknown",
        transactionCount: quarterPayments.length + quarterExpenses.length,
      });
    }
    
    return result;
  }, [payments, expenses]);

  // Calculate totals
  const liabilityData = useMemo(() => {
    const totalVatCollected = periods.reduce((sum, p) => sum + p.vatCollected, 0);
    const totalVatPaid = periods.reduce((sum, p) => sum + p.vatPaid, 0);
    const totalVatDue = periods.filter(p => p.status !== 'filed').reduce((sum, p) => sum + Math.max(p.netDue, 0), 0);
    const totalTransactions = periods.reduce((sum, p) => sum + p.transactionCount, 0);
    const overdueCount = periods.filter(p => p.status === 'overdue').length;
    const upcomingCount = periods.filter(p => p.status === 'upcoming').length;
    
    return {
      totalVatCollected: roundTo(totalVatCollected, 2),
      totalVatPaid: roundTo(totalVatPaid, 2),
      totalVatDue: roundTo(totalVatDue, 2),
      totalTransactions,
      overdueCount,
      upcomingCount,
    };
  }, [periods]);

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
      currency: countryConfig.currency || "EUR",
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(liabilityData, periods, exportConfig);
          break;
        case "pdf":
          exportToPDF(liabilityData, periods, exportConfig);
          break;
        case "csv":
          exportToCSV(liabilityData, periods, exportConfig);
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    }
  }, [liabilityData, periods, filters, currentSchool, user, countryConfig]);

  const handleRefresh = useCallback(() => {
    refetchPayments();
    refetchExpenses();
    toast.success("Data refreshed");
  }, [refetchPayments, refetchExpenses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-zinc-500">Loading tax data...</p>
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Tax Liability Report</h1>
              <p className="text-sm text-zinc-500">
                Outstanding tax obligations and filing status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-zinc-100 transition" title="Refresh data">
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
            label="Total VAT Due" 
            value={formatCurrency(liabilityData.totalVatDue)} 
            icon={<Banknote className="w-4 h-4 text-[#e44138]" />} 
            color="bg-[#fdeeed]"
            isHighlighted
            subtext={liabilityData.overdueCount > 0 ? `${liabilityData.overdueCount} overdue` : "All current"}
          />
          <KPICard 
            label="VAT Collected" 
            value={formatCurrency(liabilityData.totalVatCollected)} 
            icon={<TrendingUp className="w-4 h-4 text-[#5cb83a]" />} 
            color="bg-[#eefbe7]"
          />
          <KPICard 
            label="VAT Paid (Input)" 
            value={formatCurrency(liabilityData.totalVatPaid)} 
            icon={<TrendingDown className="w-4 h-4 text-[#6c376f]" />} 
            color="bg-[#f3e8f4]"
          />
          <KPICard 
            label="Transactions" 
            value={liabilityData.totalTransactions.toString()} 
            icon={<Receipt className="w-4 h-4 text-[#3b82c4]" />} 
            color="bg-[#e8f4fa]"
            subtext="Last 4 quarters"
          />
        </div>
      </motion.div>

      {/* Alerts */}
      {liabilityData.overdueCount > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-xl bg-[#fdeeed] border border-[#f9d4d2]"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#e44138] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#c9342c]">Overdue Tax Liability</p>
              <p className="text-sm text-[#e44138] mt-0.5">
                You have {liabilityData.overdueCount} overdue VAT filing(s). Please submit your returns to avoid penalties.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {liabilityData.upcomingCount > 0 && liabilityData.overdueCount === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-4 rounded-xl bg-[#fdfbe8] border border-[#f9f3c8]"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#e7d356] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#9a8520]">Upcoming Deadline</p>
              <p className="text-sm text-[#b8a525] mt-0.5">
                You have {liabilityData.upcomingCount} VAT filing(s) due within 14 days.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Period Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {periods.map(period => (
          <PeriodCard key={period.id} period={period} />
        ))}
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border border-[#d4eaf5]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#d4eaf5] flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-[#3b82c4]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#2563a3]">Tax Liability Overview</p>
            <p className="text-sm text-[#3b82c4] mt-0.5">
              This report shows your outstanding VAT obligations by quarter. VAT returns are typically due on the 19th 
              of the month following the end of the VAT period. Export to Excel for your accountant or tax advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}