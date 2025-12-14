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
  Percent,
  Search,
  Download,
  Eye,
  FileCheck,
  ShoppingCart,
  CreditCard,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// CONSTANTS
// ============================================

const TAX_RATE_CATEGORIES = {
  STANDARD: { id: "standard", label: "Standard Rate (23%)", rate: 0.23 },
  REDUCED: { id: "reduced", label: "Reduced Rate (13.5%)", rate: 0.135 },
  SECOND_REDUCED: { id: "second_reduced", label: "Second Reduced (9%)", rate: 0.09 },
  ZERO: { id: "zero", label: "Zero Rated (0%)", rate: 0 },
  EXEMPT: { id: "exempt", label: "Exempt", rate: 0, isExempt: true },
};

const SERVICE_TAX_MAPPING = {
  practical_driving: { rate: 0, category: "exempt", label: "Driving Lessons (Exempt)" },
  theory: { rate: 0, category: "exempt", label: "Theory Training (Exempt)" },
  test_prep: { rate: 0, category: "exempt", label: "Test Preparation (Exempt)" },
  highway: { rate: 0, category: "exempt", label: "Highway Training (Exempt)" },
  night_driving: { rate: 0, category: "exempt", label: "Night Driving (Exempt)" },
  lesson: { rate: 0, category: "exempt", label: "Driving Lesson (Exempt)" },
  package: { rate: 0, category: "exempt", label: "Lesson Package (Exempt)" },
  exam_fee: { rate: 0, category: "exempt", label: "Exam Fee (Exempt)" },
  simulator: { rate: 0.23, category: "standard", label: "Simulator Sessions (23%)" },
  merchandise: { rate: 0.23, category: "standard", label: "Merchandise (23%)" },
  admin_fee: { rate: 0.23, category: "standard", label: "Admin Fees (23%)" },
  cancellation_fee: { rate: 0.23, category: "standard", label: "Cancellation Fees (23%)" },
  other: { rate: 0.23, category: "standard", label: "Other Services (23%)" },
};

const DATE_PRESETS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
];

const TAX_RATE_FILTER_OPTIONS = [
  { label: "All Rates", value: "all" },
  { label: "Standard (23%)", value: "standard" },
  { label: "Reduced (13.5%)", value: "reduced" },
  { label: "Zero Rated", value: "zero" },
  { label: "Exempt", value: "exempt" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Sales Only", value: "sale" },
  { label: "Purchases Only", value: "purchase" },
];

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
    case "this_month":
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    case "last_month":
      const lastMonth = subMonths(today, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
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

const calculateVATFromGross = (grossAmount, rate) => {
  if (rate === 0) {
    return { net: grossAmount, vat: 0 };
  }
  const net = roundTo(grossAmount / (1 + rate), 2);
  const vat = roundTo(grossAmount - net, 2);
  return { net, vat };
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

const exportToExcel = (transactions, totals, config) => {
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
    <Style ss:ID="Percent"><NumberFormat ss:Format="0.0%"/></Style>
    <Style ss:ID="Date"><NumberFormat ss:Format="yyyy-mm-dd"/></Style>
    <Style ss:ID="TotalRow"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
  </Styles>`);
  
  xmlParts.push(`<Worksheet ss:Name="VAT Tax Detail">`);
  xmlParts.push(`<Table>`);
  
  // Header
  xmlParts.push(`<Row><Cell ss:StyleID="Title"><Data ss:Type="String">${config.companyName}</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">VAT / Tax Detail Report</Data></Cell></Row>`);
  xmlParts.push(`<Row><Cell ss:StyleID="Subtitle"><Data ss:Type="String">Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}</Data></Cell></Row>`);
  xmlParts.push(`<Row></Row>`);
  
  // Column Headers
  xmlParts.push(`<Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Type</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Description</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Reference</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Tax Category</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rate</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Gross Amount</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Net Amount</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">VAT Amount</Data></Cell>
  </Row>`);
  
  // Data rows
  transactions.forEach(txn => {
    xmlParts.push(`<Row>
      <Cell ss:StyleID="Date"><Data ss:Type="String">${txn.date ? format(parseISO(txn.date), "yyyy-MM-dd") : ""}</Data></Cell>
      <Cell><Data ss:Type="String">${txn.transactionType === 'sale' ? 'Sale' : 'Purchase'}</Data></Cell>
      <Cell><Data ss:Type="String">${txn.description || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${txn.reference || ""}</Data></Cell>
      <Cell><Data ss:Type="String">${txn.taxCategory || ""}</Data></Cell>
      <Cell ss:StyleID="Percent"><Data ss:Type="Number">${txn.rate || 0}</Data></Cell>
      <Cell ss:StyleID="Currency"><Data ss:Type="Number">${txn.grossAmount || 0}</Data></Cell>
      <Cell ss:StyleID="Currency"><Data ss:Type="Number">${txn.netAmount || 0}</Data></Cell>
      <Cell ss:StyleID="Currency"><Data ss:Type="Number">${txn.vatAmount || 0}</Data></Cell>
    </Row>`);
  });
  
  // Totals row
  xmlParts.push(`<Row ss:StyleID="TotalRow">
    <Cell><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${totals.grossTotal}</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${totals.netTotal}</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${totals.vatTotal}</Data></Cell>
  </Row>`);
  
  xmlParts.push(`</Table></Worksheet></Workbook>`);
  
  const xmlContent = xmlParts.join('\n');
  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const fileName = generateFileName("VAT_Tax_Detail", "xls", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
  toast.success("Excel file exported successfully");
};

const exportToPDF = (transactions, totals, config) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>VAT Tax Detail Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; font-size: 10px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .header h1 { color: #4F46E5; margin: 0 0 5px 0; font-size: 20px; }
        .header p { color: #666; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4F46E5; color: white; padding: 8px 6px; text-align: left; font-size: 9px; }
        td { padding: 6px; border-bottom: 1px solid #eee; }
        .amount { text-align: right; font-family: monospace; }
        .total-row { background: #f3f4f6; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 9px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.companyName}</h1>
        <p><strong>VAT / Tax Detail Report</strong></p>
        <p>${format(parseISO(config.startDate), "MMMM d, yyyy")} to ${format(parseISO(config.endDate), "MMMM d, yyyy")}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th>Reference</th>
            <th>Tax Category</th>
            <th>Rate</th>
            <th class="amount">Gross</th>
            <th class="amount">Net</th>
            <th class="amount">VAT</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(txn => `
            <tr>
              <td>${txn.date ? format(parseISO(txn.date), "MMM d, yyyy") : "—"}</td>
              <td>${txn.transactionType === 'sale' ? 'Sale' : 'Purchase'}</td>
              <td>${txn.description || "—"}</td>
              <td>${txn.reference || "—"}</td>
              <td>${txn.taxCategory || "—"}</td>
              <td>${formatPercent(txn.rate || 0)}</td>
              <td class="amount">${formatCurrency(txn.grossAmount)}</td>
              <td class="amount">${formatCurrency(txn.netAmount)}</td>
              <td class="amount">${formatCurrency(txn.vatAmount)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="6"><strong>TOTAL</strong></td>
            <td class="amount">${formatCurrency(totals.grossTotal)}</td>
            <td class="amount">${formatCurrency(totals.netTotal)}</td>
            <td class="amount">${formatCurrency(totals.vatTotal)}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated: ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} | Currency: EUR</p>
        <p>Report ID: TAX-DETAIL-${format(new Date(), "yyyyMMddHHmmss")}</p>
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

const exportToCSV = (transactions, totals, config) => {
  const rows = [];
  
  rows.push([config.companyName]);
  rows.push(["VAT / Tax Detail Report"]);
  rows.push([`Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}`]);
  rows.push([]);
  
  rows.push(["Date", "Type", "Description", "Reference", "Tax Category", "Rate", "Gross Amount", "Net Amount", "VAT Amount"]);
  
  transactions.forEach(txn => {
    rows.push([
      txn.date ? format(parseISO(txn.date), "yyyy-MM-dd") : "",
      txn.transactionType === 'sale' ? 'Sale' : 'Purchase',
      txn.description || "",
      txn.reference || "",
      txn.taxCategory || "",
      `${((txn.rate || 0) * 100).toFixed(1)}%`,
      (txn.grossAmount || 0).toFixed(2),
      (txn.netAmount || 0).toFixed(2),
      (txn.vatAmount || 0).toFixed(2),
    ]);
  });
  
  rows.push([]);
  rows.push(["TOTAL", "", "", "", "", "", totals.grossTotal.toFixed(2), totals.netTotal.toFixed(2), totals.vatTotal.toFixed(2)]);
  
  const csvContent = rows.map(row => row.map(cell => escapeCsv(cell)).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("VAT_Tax_Detail", "csv", { start: config.startDate, end: config.endDate });
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

const TransactionRow = memo(({ txn, index }) => (
  <tr className={`${index % 2 === 0 ? "bg-white" : "bg-zinc-50"} hover:bg-indigo-50 transition-colors`}>
    <td className="py-3 px-4 text-sm text-zinc-600">
      {txn.date ? format(parseISO(txn.date), "MMM d, yyyy") : "—"}
    </td>
    <td className="py-3 px-4">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        txn.transactionType === 'sale' 
          ? "bg-[#eefbe7] text-[#5cb83a]" 
          : "bg-[#f3e8f4] text-[#6c376f]"
      }`}>
        {txn.transactionType === 'sale' ? 'Sale' : 'Purchase'}
      </span>
    </td>
    <td className="py-3 px-4 text-sm text-zinc-800">{txn.description || "—"}</td>
    <td className="py-3 px-4 text-sm text-zinc-500 font-mono">{txn.reference || "—"}</td>
    <td className="py-3 px-4">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        txn.taxCategory === 'exempt' ? "bg-gray-100 text-gray-700" :
        txn.taxCategory === 'zero' ? "bg-[#e8f4fa] text-[#3b82c4]" :
        txn.taxCategory === 'reduced' ? "bg-[#fdfbe8] text-[#b8a525]" :
        "bg-[#fdeeed] text-[#c9342c]"
      }`}>
        {txn.taxCategoryLabel || txn.taxCategory}
      </span>
    </td>
    <td className="py-3 px-4 text-sm text-center text-zinc-600">
      {formatPercent(txn.rate || 0)}
    </td>
    <td className="py-3 px-4 text-sm text-right font-mono text-zinc-700">
      {formatCurrency(txn.grossAmount)}
    </td>
    <td className="py-3 px-4 text-sm text-right font-mono text-zinc-700">
      {formatCurrency(txn.netAmount)}
    </td>
    <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-[#e44138]">
      {formatCurrency(txn.vatAmount, { showZero: true })}
    </td>
  </tr>
));

// ============================================
// MAIN COMPONENT
// ============================================

export default function TaxDetail() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => {
    const defaultRange = getDateRangeFromPreset("this_month");
    return {
      preset: "this_month",
      startDate: defaultRange.start,
      endDate: defaultRange.end,
      taxRateFilter: "all",
      transactionTypeFilter: "all",
      searchTerm: "",
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

  // Build transaction list
  const allTransactions = useMemo(() => {
    const transactions = [];

    // Sales (Payments)
    payments
      .filter(p => 
        p.status === "completed" &&
        isInDateRange(p.payment_date || p.created_date, filters.startDate, filters.endDate)
      )
      .forEach(payment => {
        const lessonType = payment.payment_type || "other";
        const taxMapping = SERVICE_TAX_MAPPING[lessonType] || SERVICE_TAX_MAPPING.other;
        const grossAmount = payment.amount || 0;
        const { net: netAmount, vat: vatAmount } = calculateVATFromGross(grossAmount, taxMapping.rate);

        transactions.push({
          id: payment.id,
          date: payment.payment_date || payment.created_date,
          transactionType: 'sale',
          description: taxMapping.label,
          reference: payment.transaction_id || payment.id?.substring(0, 8) || '',
          taxCategory: taxMapping.category,
          taxCategoryLabel: taxMapping.label,
          rate: taxMapping.rate,
          grossAmount,
          netAmount,
          vatAmount,
          paymentMethod: payment.payment_method,
          studentId: payment.student_id,
        });
      });

    // Purchases (Expenses)
    expenses
      .filter(e => isInDateRange(e.expense_date || e.created_date, filters.startDate, filters.endDate))
      .forEach(expense => {
        const expenseCategory = expense.category || "other";
        const rate = expense.tax_rate ?? 0.23;
        const grossAmount = expense.amount || 0;
        
        let netAmount, vatAmount;
        if (expense.tax_amount !== undefined && expense.tax_amount !== null) {
          vatAmount = expense.tax_amount;
          netAmount = grossAmount - vatAmount;
        } else {
          const calc = calculateVATFromGross(grossAmount, rate);
          netAmount = calc.net;
          vatAmount = calc.vat;
        }

        let category = 'standard';
        if (rate === 0) category = 'zero';
        else if (rate === 0.135) category = 'reduced';
        else if (rate === 0.09) category = 'second_reduced';

        transactions.push({
          id: expense.id,
          date: expense.expense_date || expense.created_date,
          transactionType: 'purchase',
          description: expense.description || expenseCategory,
          reference: expense.reference || expense.id?.substring(0, 8) || '',
          taxCategory: category,
          taxCategoryLabel: `${(rate * 100).toFixed(1)}%`,
          rate,
          grossAmount,
          netAmount,
          vatAmount,
          vendor: expense.vendor,
        });
      });

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [payments, expenses, filters.startDate, filters.endDate]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    if (filters.taxRateFilter !== "all") {
      result = result.filter(t => t.taxCategory === filters.taxRateFilter);
    }

    if (filters.transactionTypeFilter !== "all") {
      result = result.filter(t => t.transactionType === filters.transactionTypeFilter);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.description || "").toLowerCase().includes(term) ||
        (t.reference || "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [allTransactions, filters.taxRateFilter, filters.transactionTypeFilter, filters.searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    const grossTotal = filteredTransactions.reduce((sum, t) => sum + (t.grossAmount || 0), 0);
    const netTotal = filteredTransactions.reduce((sum, t) => sum + (t.netAmount || 0), 0);
    const vatTotal = filteredTransactions.reduce((sum, t) => sum + (t.vatAmount || 0), 0);
    
    const salesCount = filteredTransactions.filter(t => t.transactionType === 'sale').length;
    const purchasesCount = filteredTransactions.filter(t => t.transactionType === 'purchase').length;
    
    const salesVat = filteredTransactions
      .filter(t => t.transactionType === 'sale')
      .reduce((sum, t) => sum + (t.vatAmount || 0), 0);
    
    const purchasesVat = filteredTransactions
      .filter(t => t.transactionType === 'purchase')
      .reduce((sum, t) => sum + (t.vatAmount || 0), 0);

    return {
      grossTotal: roundTo(grossTotal, 2),
      netTotal: roundTo(netTotal, 2),
      vatTotal: roundTo(vatTotal, 2),
      salesCount,
      purchasesCount,
      salesVat: roundTo(salesVat, 2),
      purchasesVat: roundTo(purchasesVat, 2),
      netVatPosition: roundTo(salesVat - purchasesVat, 2),
    };
  }, [filteredTransactions]);

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
          exportToExcel(filteredTransactions, totals, exportConfig);
          break;
        case "pdf":
          exportToPDF(filteredTransactions, totals, exportConfig);
          break;
        case "csv":
          exportToCSV(filteredTransactions, totals, exportConfig);
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    }
  }, [filteredTransactions, totals, filters, currentSchool, user, countryConfig]);

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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">
                {countryConfig.vatLabel || "VAT"} / Tax Detail
              </h1>
              <p className="text-sm text-zinc-500">
                {formatDateRange(filters.startDate, filters.endDate)}
                <span className="mx-2">•</span>
                {filteredTransactions.length} transactions
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
            label="Gross Total" 
            value={formatCurrency(totals.grossTotal)} 
            icon={<Receipt className="w-4 h-4 text-[#3b82c4]" />} 
            color="bg-[#e8f4fa]"
            subtext={`${filteredTransactions.length} transactions`}
          />
          <KPICard 
            label="Net Total" 
            value={formatCurrency(totals.netTotal)} 
            icon={<Scale className="w-4 h-4 text-[#5cb83a]" />} 
            color="bg-[#eefbe7]"
          />
          <KPICard 
            label="VAT Collected" 
            value={formatCurrency(totals.salesVat)} 
            icon={<TrendingUp className="w-4 h-4 text-[#6c376f]" />} 
            color="bg-[#f3e8f4]"
            subtext={`${totals.salesCount} sales`}
          />
          <KPICard 
            label="VAT Paid" 
            value={formatCurrency(totals.purchasesVat)} 
            icon={<TrendingDown className="w-4 h-4 text-[#e7d356]" />} 
            color="bg-[#fdfbe8]"
            subtext={`${totals.purchasesCount} purchases`}
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

                  {/* Transaction Type Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-zinc-400" />
                      Transaction Type
                    </label>
                    <select
                      value={filters.transactionTypeFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, transactionTypeFilter: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {TRANSACTION_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tax Rate Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-zinc-400" />
                      Tax Rate
                    </label>
                    <select
                      value={filters.taxRateFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, taxRateFilter: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {TAX_RATE_FILTER_OPTIONS.map(option => (
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
                      placeholder="Description or reference..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                    />
                  </div>

                  {/* Net VAT Position */}
                  <div className={`p-4 rounded-xl border ${totals.netVatPosition >= 0 ? 'bg-[#fdeeed] border-[#f9d4d2]' : 'bg-[#eefbe7] border-[#d4f4c3]'}`}>
                    <p className="text-xs font-semibold text-zinc-600 mb-1">Net VAT Position</p>
                    <p className={`text-xl font-bold ${totals.netVatPosition >= 0 ? 'text-[#e44138]' : 'text-[#5cb83a]'}`}>
                      {formatCurrency(Math.abs(totals.netVatPosition))}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {totals.netVatPosition >= 0 ? 'VAT Due to Revenue' : 'VAT Refundable'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Table */}
        <div className={showFilters ? "lg:col-span-4" : "lg:col-span-5"}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f4fa] flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Transaction Detail</h3>
                  <p className="text-xs text-zinc-500">Line-by-line tax breakdown</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-zinc-200 transition" title="Refresh data">
                  <RefreshCw className="w-4 h-4 text-zinc-500" />
                </button>
                <button className="p-2 rounded-lg hover:bg-zinc-200 transition" title="Help">
                  <HelpCircle className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#3b82c4] to-[#6c376f] text-white sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Reference</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Tax Category</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wide">Rate</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide">Gross</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide">Net</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide">VAT</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Receipt className="w-12 h-12 text-zinc-300" />
                          <p className="text-zinc-500 font-medium">No transactions found</p>
                          <p className="text-zinc-400 text-sm">Adjust your filters or date range</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((txn, index) => (
                      <TransactionRow key={txn.id} txn={txn} index={index} />
                    ))
                  )}
                </tbody>

                {filteredTransactions.length > 0 && (
                  <tfoot className="bg-gradient-to-r from-zinc-100 to-zinc-50 border-t-2 border-zinc-300">
                    <tr>
                      <td colSpan={6} className="py-4 px-4 text-sm font-bold text-zinc-800">
                        TOTAL ({filteredTransactions.length} transactions)
                      </td>
                      <td className="py-4 px-4 text-sm text-right font-mono font-bold text-zinc-800">
                        {formatCurrency(totals.grossTotal)}
                      </td>
                      <td className="py-4 px-4 text-sm text-right font-mono font-bold text-zinc-800">
                        {formatCurrency(totals.netTotal)}
                      </td>
                      <td className="py-4 px-4 text-sm text-right font-mono font-bold text-[#e44138]">
                        {formatCurrency(totals.vatTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500 flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Report ID: TAX-DETAIL-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Currency: {countryConfig.currency || "EUR"}</span>
                </div>
                <span className="font-medium">Generated: {format(new Date(), "MMM d, yyyy HH:mm")}</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border border-[#d4eaf5]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#d4eaf5] flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#3b82c4]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2563a3]">Transaction-Level Tax Breakdown</p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  This report shows every transaction with its tax treatment. Use filters to focus on specific 
                  transaction types or tax rates. Export to Excel for detailed reconciliation with your accounting records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}