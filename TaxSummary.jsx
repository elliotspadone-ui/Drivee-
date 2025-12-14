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
import { getCountryConfig, formatCurrencyByCountry } from "@/components/utils/localisation";
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
  ExternalLink,
  X,
  Settings,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Percent,
  MapPin,
  ShoppingCart,
  CreditCard,
  FileCheck,
  Scale,
  Clock,
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

// Driving school specific service tax mappings (Ireland)
const SERVICE_TAX_MAPPING = {
  practical_driving: { rate: 0, category: "exempt", label: "Driving Lessons (Exempt)" },
  theory: { rate: 0, category: "exempt", label: "Theory Training (Exempt)" },
  test_prep: { rate: 0, category: "exempt", label: "Test Preparation (Exempt)" },
  highway: { rate: 0, category: "exempt", label: "Highway Training (Exempt)" },
  night_driving: { rate: 0, category: "exempt", label: "Night Driving (Exempt)" },
  motorway: { rate: 0, category: "exempt", label: "Motorway Training (Exempt)" },
  refresher: { rate: 0, category: "exempt", label: "Refresher Course (Exempt)" },
  edt: { rate: 0, category: "exempt", label: "EDT Lessons (Exempt)" },
  pretest: { rate: 0, category: "exempt", label: "Pre-test Lessons (Exempt)" },
  simulator: { rate: 0.23, category: "standard", label: "Simulator Sessions (23%)" },
  merchandise: { rate: 0.23, category: "standard", label: "Merchandise (23%)" },
  admin_fee: { rate: 0.23, category: "standard", label: "Admin Fees (23%)" },
  cancellation_fee: { rate: 0.23, category: "standard", label: "Cancellation Fees (23%)" },
  gift_voucher: { rate: 0, category: "zero", label: "Gift Vouchers (0%)" },
  other: { rate: 0.23, category: "standard", label: "Other Services (23%)" },
};

const EXPENSE_TAX_MAPPING = {
  fuel: { rate: 0.23, category: "standard", label: "Fuel & Petrol" },
  diesel: { rate: 0.23, category: "standard", label: "Diesel" },
  vehicle_maintenance: { rate: 0.23, category: "standard", label: "Vehicle Maintenance" },
  vehicle_repair: { rate: 0.23, category: "standard", label: "Vehicle Repairs" },
  vehicle_parts: { rate: 0.23, category: "standard", label: "Vehicle Parts" },
  car_wash: { rate: 0.23, category: "standard", label: "Car Wash" },
  insurance: { rate: 0, category: "exempt", label: "Insurance (Exempt)" },
  motor_tax: { rate: 0, category: "exempt", label: "Motor Tax (Exempt)" },
  nct: { rate: 0.23, category: "standard", label: "NCT Test" },
  rent: { rate: 0.23, category: "standard", label: "Rent & Premises" },
  utilities: { rate: 0.23, category: "standard", label: "Utilities" },
  electricity: { rate: 0.23, category: "standard", label: "Electricity" },
  gas: { rate: 0.23, category: "standard", label: "Gas" },
  water: { rate: 0.23, category: "standard", label: "Water" },
  broadband: { rate: 0.23, category: "standard", label: "Broadband & Internet" },
  phone: { rate: 0.23, category: "standard", label: "Phone & Mobile" },
  office_supplies: { rate: 0.23, category: "standard", label: "Office Supplies" },
  stationery: { rate: 0.23, category: "standard", label: "Stationery" },
  marketing: { rate: 0.23, category: "standard", label: "Marketing & Advertising" },
  website: { rate: 0.23, category: "standard", label: "Website & Hosting" },
  professional_fees: { rate: 0.23, category: "standard", label: "Professional Fees" },
  accountant: { rate: 0.23, category: "standard", label: "Accountancy Fees" },
  legal: { rate: 0.23, category: "standard", label: "Legal Fees" },
  software: { rate: 0.23, category: "standard", label: "Software & Subscriptions" },
  training: { rate: 0, category: "exempt", label: "Training & Education (Exempt)" },
  adi_test: { rate: 0, category: "exempt", label: "ADI Test Fees (Exempt)" },
  bank_charges: { rate: 0, category: "exempt", label: "Bank Charges (Exempt)" },
  parking: { rate: 0.135, category: "reduced", label: "Parking (13.5%)" },
  tolls: { rate: 0, category: "zero", label: "Road Tolls (0%)" },
  other: { rate: 0.23, category: "standard", label: "Other Expenses" },
};

const DATE_PRESETS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
  { label: "This VAT Period", value: "this_vat_period" },
  { label: "Last VAT Period", value: "last_vat_period" },
];

const COMPARISON_OPTIONS = [
  { label: "No Comparison", value: "none" },
  { label: "Previous Period", value: "previous_period" },
  { label: "Same Period Last Year", value: "previous_year" },
];

const TAX_RATE_FILTER_OPTIONS = [
  { label: "All Rates", value: "all" },
  { label: "Standard (23%)", value: "standard" },
  { label: "Reduced (13.5%)", value: "reduced" },
  { label: "Second Reduced (9%)", value: "second_reduced" },
  { label: "Zero Rated", value: "zero" },
  { label: "Exempt", value: "exempt" },
];

const JURISDICTIONS = [
  { label: "Ireland", value: "IE" },
  { label: "United Kingdom", value: "GB" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
];

const FILING_STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800", borderColor: "border-yellow-200", description: "Not yet submitted to Revenue" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", borderColor: "border-blue-200", description: "Submitted, awaiting confirmation" },
  filed: { label: "Filed", color: "bg-emerald-100 text-emerald-800", borderColor: "border-emerald-200", description: "Successfully filed with Revenue" },
  locked: { label: "Locked", color: "bg-zinc-100 text-zinc-800", borderColor: "border-zinc-200", description: "Period closed, no changes allowed" },
};

const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
};

const DEFAULTS = {
  jurisdiction: "IE",
  currency: "EUR",
  companyName: "DrivePro Driving School",
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const escapeXML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/\'/g, '&apos;');
};

const escapeHTML = (str) => {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const escapeCsv = (value) => {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('\"') || str.includes('\\n') || str.includes('\\r')) {
    return `\"${str.replace(/\"/g, '\"\"')}\"`;
  }
  return str;
};

const formatCurrencyWithConfig = (value, config, options = {}) => {
    const { showSign = false, showZero = false } = options;
    if (value === null || value === undefined) return "—";
    if (value === 0 && !showZero) return "—";

    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat(config?.locale || "en-IE", {
      style: "currency",
      currency: config?.currency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);

    if (value < 0) return `(${formatted})`;
    if (showSign && value > 0) return `+${formatted}`;
    return formatted;
  };

  const formatCurrency = (value, options = {}) => {
    return formatCurrencyWithConfig(value, { locale: "en-IE", currency: "EUR" }, options);
  };

const formatCurrencyRaw = (value) => {
  if (value === null || value === undefined) return "€0.00";

  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);

  return value < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

const formatChangePercent = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return { formatted: 'N/A', colorClass: 'text-zinc-400', isImprovement: false };

  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  const isImprovement = change < 0; // For tax, less is better

  return {
    formatted: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
    colorClass: isImprovement ? 'text-emerald-600' : 'text-red-600',
    isImprovement,
  };
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

const getDateRangeFromPreset = (preset, vatPeriod = 'quarterly') => {
  const today = new Date();
  let start;
  let end;

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
    case "this_vat_period":
      if (vatPeriod === 'monthly') {
        start = startOfMonth(today);
        end = endOfMonth(today);
      } else {
        start = startOfQuarter(today);
        end = endOfQuarter(today);
      }
      break;
    case "last_vat_period":
      if (vatPeriod === 'monthly') {
        const lastVatMonth = subMonths(today, 1);
        start = startOfMonth(lastVatMonth);
        end = endOfMonth(lastVatMonth);
      } else {
        const lastVatQuarter = subQuarters(today, 1);
        start = startOfQuarter(lastVatQuarter);
        end = endOfQuarter(lastVatQuarter);
      }
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

const getComparisonDateRange = (startDate, endDate, comparisonType) => {
  if (comparisonType === 'none') return null;

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return null;

  if (comparisonType === 'previous_period') {
    const periodDays = differenceInDays(end, start) + 1;
    const compStart = addDays(start, -periodDays);
    const compEnd = addDays(end, -periodDays);
    return {
      start: format(compStart, "yyyy-MM-dd"),
      end: format(compEnd, "yyyy-MM-dd"),
    };
  }

  if (comparisonType === 'previous_year') {
    return {
      start: format(subYears(start, 1), "yyyy-MM-dd"),
      end: format(subYears(end, 1), "yyyy-MM-dd"),
    };
  }

  return null;
};

const formatDateRange = (startDate, endDate) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return 'Invalid date range';
  return `${format(start, "MMMM d, yyyy")} to ${format(end, "MMMM d, yyyy")}`;
};

const formatDateRangeShort = (startDate, endDate) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) return 'Invalid';
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
};

// ============================================
// TAX CALCULATION FUNCTIONS
// ============================================

const createEmptyTaxRateData = (rate) => ({
  taxable: 0,
  tax: 0,
  transactions: [],
  rate,
  transactionCount: 0,
});

const createEmptyTaxByRate = () => ({
  standard: createEmptyTaxRateData(0.23),
  reduced: createEmptyTaxRateData(0.135),
  second_reduced: createEmptyTaxRateData(0.09),
  zero: createEmptyTaxRateData(0),
  exempt: createEmptyTaxRateData(0),
});

const calculateVATFromGross = (grossAmount, rate) => {
  if (rate === 0) {
    return { net: grossAmount, vat: 0 };
  }
  const net = roundTo(grossAmount / (1 + rate), 2);
  const vat = roundTo(grossAmount - net, 2);
  return { net, vat };
};

const calculateOutputTax = (payments, invoices, startDate, endDate, options = {}) => {
  const { taxRateFilter = [] } = options;
  const taxByRate = createEmptyTaxByRate();

  const filteredPayments = payments.filter(p =>
    p.status === "completed" &&
    isInDateRange(p.payment_date || p.created_date, startDate, endDate)
  );

  filteredPayments.forEach(payment => {
    const lessonType = payment.payment_type || "other";
    const taxMapping = SERVICE_TAX_MAPPING[lessonType] || SERVICE_TAX_MAPPING.other;
    const category = taxMapping.category;
    const rate = taxMapping.rate;

    if (taxRateFilter.length > 0 && !taxRateFilter.includes(category) && !taxRateFilter.includes('all')) {
      return;
    }

    const grossAmount = payment.amount || 0;
    const { net: netAmount, vat: taxAmount } = calculateVATFromGross(grossAmount, rate);

    taxByRate[category].taxable += netAmount;
    taxByRate[category].tax += taxAmount;
    taxByRate[category].transactionCount += 1;
    taxByRate[category].transactions.push({
      id: payment.id,
      date: payment.payment_date || payment.created_date || '',
      description: taxMapping.label,
      reference: payment.transaction_id || payment.id?.substring(0, 8) || '',
      grossAmount,
      netAmount,
      taxAmount,
      rate,
      customer: payment.student_id,
      type: 'sale',
    });
  });

  Object.values(taxByRate).forEach(data => {
    data.taxable = roundTo(data.taxable, 2);
    data.tax = roundTo(data.tax, 2);
  });

  const totalTaxable = roundTo(Object.values(taxByRate).reduce((sum, r) => sum + r.taxable, 0), 2);
  const totalTax = roundTo(Object.values(taxByRate).reduce((sum, r) => sum + r.tax, 0), 2);
  const totalTransactions = Object.values(taxByRate).reduce((sum, r) => sum + r.transactionCount, 0);

  return { byRate: taxByRate, totalTaxable, totalTax, totalTransactions };
};

const calculateInputTax = (expenses, startDate, endDate, options = {}) => {
  const { taxRateFilter = [] } = options;
  const taxByRate = createEmptyTaxByRate();

  const filteredExpenses = expenses.filter(e =>
    isInDateRange(e.expense_date || e.created_date, startDate, endDate)
  );

  filteredExpenses.forEach(expense => {
    const expenseCategory = expense.category || "other";
    const taxMapping = EXPENSE_TAX_MAPPING[expenseCategory] || EXPENSE_TAX_MAPPING.other;
    const category = taxMapping.category;

    let rate = expense.tax_rate ?? taxMapping.rate;
    const grossAmount = expense.amount || 0;
    let netAmount;
    let taxAmount;

    if (expense.tax_amount !== undefined && expense.tax_amount !== null) {
      taxAmount = expense.tax_amount;
      netAmount = grossAmount - taxAmount;
      if (expense.tax_rate === undefined && netAmount > 0) {
        rate = taxAmount / netAmount;
      }
    } else {
      const calc = calculateVATFromGross(grossAmount, rate);
      netAmount = calc.net;
      taxAmount = calc.vat;
    }

    if (taxRateFilter.length > 0 && !taxRateFilter.includes(category) && !taxRateFilter.includes('all')) {
      return;
    }

    taxByRate[category].taxable += netAmount;
    taxByRate[category].tax += taxAmount;
    taxByRate[category].transactionCount += 1;
    taxByRate[category].transactions.push({
      id: expense.id,
      date: expense.expense_date || expense.created_date || '',
      description: expense.description || taxMapping.label,
      reference: expense.reference || expense.id?.substring(0, 8) || '',
      grossAmount,
      netAmount,
      taxAmount,
      rate,
      vendor: expense.vendor,
      type: 'purchase',
    });
  });

  Object.values(taxByRate).forEach(data => {
    data.taxable = roundTo(data.taxable, 2);
    data.tax = roundTo(data.tax, 2);
  });

  const totalTaxable = roundTo(Object.values(taxByRate).reduce((sum, r) => sum + r.taxable, 0), 2);
  const totalTax = roundTo(Object.values(taxByRate).reduce((sum, r) => sum + r.tax, 0), 2);
  const totalTransactions = Object.values(taxByRate).reduce((sum, r) => sum + r.transactionCount, 0);

  return { byRate: taxByRate, totalTaxable, totalTax, totalTransactions };
};

const calculateAdjustments = (invoices, startDate, endDate) => {
  const adjustments = {
    creditNotes: { amount: 0, tax: 0, transactions: [] },
    roundingAdjustment: { amount: 0, tax: 0 },
    priorPeriodAdjustments: { amount: 0, tax: 0, transactions: [] },
    totalAdjustment: 0,
  };

  const creditNotes = invoices.filter(inv =>
    inv.status === "cancelled" &&
    isInDateRange(inv.issue_date || inv.created_date, startDate, endDate)
  );

  creditNotes.forEach(cn => {
    const taxAmount = cn.tax_amount || 0;
    const totalAmount = cn.total_amount || 0;

    adjustments.creditNotes.amount += totalAmount;
    adjustments.creditNotes.tax += taxAmount;
    adjustments.creditNotes.transactions.push({
      id: cn.id,
      date: cn.issue_date || cn.created_date || '',
      description: `Credit Note: ${cn.invoice_number || 'N/A'}`,
      reference: cn.invoice_number || '',
      grossAmount: totalAmount,
      netAmount: totalAmount - taxAmount,
      taxAmount,
      rate: 0,
      type: 'credit_note',
    });
  });

  adjustments.creditNotes.amount = roundTo(adjustments.creditNotes.amount, 2);
  adjustments.creditNotes.tax = roundTo(adjustments.creditNotes.tax, 2);

  adjustments.totalAdjustment = roundTo(
    -adjustments.creditNotes.tax +
    adjustments.roundingAdjustment.tax +
    adjustments.priorPeriodAdjustments.tax,
    2
  );

  return adjustments;
};

const buildVATSummary = (payments, expenses, invoices, startDate, endDate, options = {}) => {
  const { taxRateFilter = [] } = options;

  const outputTax = calculateOutputTax(payments, invoices, startDate, endDate, { taxRateFilter });
  const inputTax = calculateInputTax(expenses, startDate, endDate, { taxRateFilter });
  const adjustments = calculateAdjustments(invoices, startDate, endDate);

  const netVATDue = roundTo(outputTax.totalTax - inputTax.totalTax + adjustments.totalAdjustment, 2);

  return {
    outputTax,
    inputTax,
    adjustments,
    summary: {
      totalOutputTax: outputTax.totalTax,
      totalInputTax: inputTax.totalTax,
      totalAdjustments: adjustments.totalAdjustment,
      netVATDue,
      isRefundable: netVATDue < 0,
    },
    period: {
      start: startDate,
      end: endDate,
      status: "draft",
    },
  };
};

const getTaxRateLabel = (category) => {
  const key = category.toUpperCase();
  return TAX_RATE_CATEGORIES[key]?.label || category;
};

const hasVATActivity = (summary) => {
  return (
    summary.summary.totalOutputTax !== 0 ||
    summary.summary.totalInputTax !== 0 ||
    summary.summary.totalAdjustments !== 0
  );
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

const exportToExcel = (vatSummary, previousVatSummary, config) => {
  toast.info("Excel export is temporarily unavailable. We are working on a fix.");
};

const exportToPDF = (vatSummary, config) => {
  toast.info("PDF export is temporarily unavailable. We are working on a fix.");
};

const exportToCSV = (vatSummary, config) => {
  const rows = [];

  rows.push([config.companyName]);
  rows.push([config.reportTitle]);
  rows.push([`Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}`]);
  rows.push([`Currency: ${config.currency}`, `VAT Registration: ${config.vatRegistration}`]);
  rows.push([`Jurisdiction: ${config.jurisdiction}`, `Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
  rows.push([]);

  rows.push(["Description", "Rate", "Taxable Amount", "Tax Amount", "Transactions"]);
  rows.push([]);

  rows.push(["OUTPUT TAX (Sales)", "", "", "", ""]);
  Object.entries(vatSummary.outputTax.byRate).forEach(([key, data]) => {
    if (data.taxable > 0 || data.tax > 0) {
      rows.push([
        `  ${getTaxRateLabel(key)}`,
        `${(data.rate * 100).toFixed(1)}%`,
        data.taxable.toFixed(2),
        data.tax.toFixed(2),
        String(data.transactionCount),
      ]);
    }
  });
  rows.push(["Total Output Tax", "", vatSummary.outputTax.totalTaxable.toFixed(2), vatSummary.outputTax.totalTax.toFixed(2), String(vatSummary.outputTax.totalTransactions)]);
  rows.push([]);

  rows.push(["INPUT TAX (Purchases)", "", "", "", ""]);
  Object.entries(vatSummary.inputTax.byRate).forEach(([key, data]) => {
    if (data.taxable > 0 || data.tax > 0) {
      rows.push([
        `  ${getTaxRateLabel(key)}`,
        `${(data.rate * 100).toFixed(1)}%`,
        data.taxable.toFixed(2),
        data.tax.toFixed(2),
        String(data.transactionCount),
      ]);
    }
  });
  rows.push(["Total Input Tax", "", vatSummary.inputTax.totalTaxable.toFixed(2), vatSummary.inputTax.totalTax.toFixed(2), String(vatSummary.inputTax.totalTransactions)]);
  rows.push([]);

  rows.push(["VAT SUMMARY", "", "", "", ""]);
  rows.push(["Total VAT Collected (Output Tax)", "", "", vatSummary.summary.totalOutputTax.toFixed(2), ""]);
  rows.push(["Less: VAT Paid (Input Tax)", "", "", (-vatSummary.summary.totalInputTax).toFixed(2), ""]);
  if (vatSummary.summary.totalAdjustments !== 0) {
    rows.push(["Adjustments", "", "", vatSummary.summary.totalAdjustments.toFixed(2), ""]);
  }
  rows.push([vatSummary.summary.isRefundable ? "NET VAT REFUNDABLE" : "NET VAT DUE", "", "", Math.abs(vatSummary.summary.netVATDue).toFixed(2), ""]);
  rows.push([]);
  rows.push(["---"]);
  rows.push([`Report ID: VAT-${format(config.generatedAt, "yyyyMMddHHmmss")}`]);
  rows.push([`Prepared by: ${config.preparedBy}`]);

  const csvContent = rows.map(row => row.map(cell => escapeCsv(cell)).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("VAT_Summary", "csv", { start: config.startDate, end: config.endDate });
  downloadBlob(blob, fileName);
};

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

// ============================================
// UI COMPONENTS
// ============================================

const KPICard = memo(({ label, value, previousValue, icon, color, bgColor = "bg-white", invertChange = false, isHighlighted = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} rounded-xl border ${isHighlighted ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-zinc-200'} p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {previousValue != null && previousValue !== 0 && (
          <ChangeIndicator current={value} previous={previousValue} invert={invertChange} />
        )}
      </div>
      <div className="text-xs text-zinc-500 mb-1 font-medium">{label}</div>
      <div className={`text-xl font-bold ${value < 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
        {formatCurrency(Math.abs(value), { showZero: true })}
      </div>
    </motion.div>
  );
});

const ChangeIndicator = memo(({ current, previous, invert = false }) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return <span className="text-xs text-zinc-400">N/A</span>;

  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  const isImprovement = invert ? change < 0 : change > 0;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      isImprovement ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-[#fdeeed] text-[#e44138]"
    }`}>
      {isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
    </div>
  );
});

const TaxLineItem = memo(({ label, rate, taxable, tax, transactionCount, prevTax, showComparison, onClick, indent = 0 }) => {
  const changePercent = formatChangePercent(tax, prevTax);

  return (
    <tr
      className={`border-b border-zinc-50 transition-colors ${onClick ? "cursor-pointer hover:bg-zinc-50 group" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <td className="py-2.5 px-4 text-sm text-zinc-700" style={{ paddingLeft: `${16 + indent * 20}px` }}>
        <div className="flex items-center gap-2">
          {label}
          {onClick && <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />}
        </div>
      </td>
      <td className="py-2.5 px-4 text-center text-sm text-zinc-600">
        {rate !== null ? formatPercent(rate) : "—"}
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-sm text-zinc-700">
        {taxable !== null ? formatCurrency(taxable) : "—"}
      </td>
      <td className={`py-2.5 px-4 text-right font-mono text-sm ${tax < 0 ? 'text-red-600' : 'text-zinc-700'}`}>
        {formatCurrency(tax)}
      </td>
      <td className="py-2.5 px-4 text-center text-sm text-zinc-500">
        {transactionCount !== undefined ? transactionCount : "—"}
      </td>
      {showComparison && (
        <>
          <td className="py-2.5 px-4 text-right font-mono text-sm text-zinc-500">
            {prevTax != null ? formatCurrency(prevTax) : "—"}
          </td>
          <td className="py-2.5 px-4 text-right">
            {changePercent ? (
              <span className={`text-xs font-semibold ${changePercent.colorClass}`}>
                {changePercent.formatted}
              </span>
            ) : (
              <span className="text-xs text-zinc-400">—</span>
            )}
          </td>
        </>
      )}
    </tr>
  );
});

const SectionHeader = memo(({ label, isExpanded, onToggle, showComparison, icon: Icon, transactionCount }) => {
  const colSpan = showComparison ? 7 : 5;

  return (
    <tr
      className="bg-zinc-100 cursor-pointer hover:bg-zinc-200 transition-colors"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      aria-expanded={isExpanded}
    >
      <td className="py-3 px-4" colSpan={colSpan}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
            {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
            <span className="font-bold text-sm text-zinc-800 uppercase tracking-wide">{label}</span>
          </div>
          {transactionCount !== undefined && (
            <span className="text-xs text-zinc-500 font-medium">{transactionCount} transactions</span>
          )}
        </div>
      </td>
    </tr>
  );
});

const TotalRow = memo(({ label, taxable, tax, transactionCount, prevTax, isGrandTotal = false, showComparison, isRefundable = false }) => {
  const changePercent = formatChangePercent(tax, prevTax);

  let rowClass = "border-t-2 border-zinc-300";
  let amountClass = "text-zinc-800";

  if (isGrandTotal) {
    rowClass = "bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border-t-2 border-[#d4eaf5]";
    amountClass = isRefundable ? "text-[#5cb83a]" : "text-[#e44138]";
  }

  return (
    <tr className={rowClass}>
      <td className={`py-3 px-4 font-bold ${isGrandTotal ? "text-base" : "text-sm"} text-zinc-900`}>
        {label}
      </td>
      <td></td>
      <td className="py-3 px-4 text-right font-bold font-mono text-sm text-zinc-800">
        {taxable != null ? formatCurrency(taxable) : ""}
      </td>
      <td className={`py-3 px-4 text-right font-bold ${isGrandTotal ? "text-base" : "text-sm"} font-mono ${amountClass}`}>
        {formatCurrency(tax, { showZero: true })}
      </td>
      <td className="py-3 px-4 text-center text-sm text-zinc-600 font-semibold">
        {transactionCount !== undefined ? transactionCount : ""}
      </td>
      {showComparison && (
        <>
          <td className="py-3 px-4 text-right font-mono text-sm text-zinc-500">
            {prevTax != null ? formatCurrency(prevTax) : "—"}
          </td>
          <td className="py-3 px-4 text-right">
            {changePercent ? (
              <span className={`text-xs font-semibold ${changePercent.colorClass}`}>
                {changePercent.formatted}
              </span>
            ) : (
              <span className="text-xs text-zinc-400">—</span>
            )}
          </td>
        </>
      )}
    </tr>
  );
});

const DrilldownPanel = memo(({ isOpen, onClose, label, transactions, totalTax, totalTaxable }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-title"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 id="drilldown-title" className="font-bold text-zinc-900">{label}</h3>
              <p className="text-sm text-zinc-500">
                {transactions.length} transactions
                {totalTaxable !== undefined && ` • Taxable: ${formatCurrency(totalTaxable, { showZero: true })}`}
                {` • Tax: ${formatCurrency(totalTax, { showZero: true })}`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition" aria-label="Close panel">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="overflow-auto max-h-[60vh]">
            {transactions && transactions.length > 0 ? (
              <table className="w-full">
                <thead className="bg-zinc-50 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Description</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Reference</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Customer/Vendor</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-zinc-500 uppercase">Net Amount</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-zinc-500 uppercase">Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, index) => (
                    <tr key={txn.id || index} className={index % 2 === 0 ? "" : "bg-zinc-50"}>
                      <td className="py-3 px-4 text-sm text-zinc-600">
                        {txn.date ? format(parseISO(txn.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-800">{txn.description || "—"}</td>
                      <td className="py-3 px-4 text-sm text-zinc-500 font-mono">{txn.reference || "—"}</td>
                      <td className="py-3 px-4 text-sm text-zinc-600">{txn.customer || txn.vendor || "—"}</td>
                      <td className="py-3 px-4 text-sm text-right font-mono text-zinc-700">
                        {formatCurrency(txn.netAmount, { showZero: true })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-zinc-800">
                        {formatCurrency(txn.taxAmount, { showZero: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-100 border-t-2 border-zinc-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-sm font-bold text-zinc-800">Total</td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-bold text-zinc-800">
                      {formatCurrency(transactions.reduce((sum, t) => sum + (t.netAmount || 0), 0), { showZero: true })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-bold text-zinc-800">
                      {formatCurrency(totalTax, { showZero: true })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="p-12 text-center text-zinc-500">No transactions found</div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

const FilingPeriodCard = memo(({ period, filingPeriodType = "Quarterly" }) => {
  const config = FILING_STATUS_CONFIG[period.status] || FILING_STATUS_CONFIG.draft;
  const StatusIcon = { draft: AlertTriangle, submitted: Clock, filed: CheckCircle2, locked: FileCheck }[period.status] || AlertTriangle;

  return (
    <div className={`bg-white rounded-xl border ${config.borderColor} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-zinc-700">Filing Period</h4>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Period:</span>
          <span className="text-zinc-800 font-medium">
            {format(parseISO(period.start), "MMM d")} - {format(parseISO(period.end), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Type:</span>
          <span className="text-zinc-800">{filingPeriodType}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">{config.description}</p>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function TaxSummary() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => {
    const defaultRange = getDateRangeFromPreset("this_quarter");
    return {
      preset: "this_quarter",
      startDate: defaultRange.start,
      endDate: defaultRange.end,
      comparisonType: "none",
      showComparison: false,
      taxRateFilter: [],
      jurisdictionFilter: "IE",
    };
  });

  const [showFilters, setShowFilters] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    output: true,
    input: true,
    adjustments: false,
    summary: true,
  });
  const [drilldown, setDrilldown] = useState(null);
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

  const { data: taxConfig = null } = useQuery({
    queryKey: ["taxConfig"],
    queryFn: async () => {
      try {
        const configs = await base44.entities.TaxConfig?.list();
        return configs?.[0] || null;
      } catch {
        return null;
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

  // Create country-aware currency formatter
  const formatCurrencyForCountry = useCallback((value, options = {}) => {
    return formatCurrencyWithConfig(value, countryConfig, options);
  }, [countryConfig]);

  const isLoading = loadingPayments || loadingExpenses || loadingInvoices;

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

  const comparisonDateRange = useMemo(() => {
    if (!filters.showComparison || filters.comparisonType === "none") return null;
    return getComparisonDateRange(filters.startDate, filters.endDate, filters.comparisonType);
  }, [filters.showComparison, filters.comparisonType, filters.startDate, filters.endDate]);

  const vatSummary = useMemo(() => {
    return buildVATSummary(payments, expenses, invoices, filters.startDate, filters.endDate, {
      taxRateFilter: filters.taxRateFilter,
    });
  }, [payments, expenses, invoices, filters.startDate, filters.endDate, filters.taxRateFilter]);

  const previousVatSummary = useMemo(() => {
    if (!comparisonDateRange) return null;
    return buildVATSummary(payments, expenses, invoices, comparisonDateRange.start, comparisonDateRange.end, {
      taxRateFilter: filters.taxRateFilter,
    });
  }, [payments, expenses, invoices, comparisonDateRange, filters.taxRateFilter]);

  const showComparisonColumns = filters.showComparison && comparisonDateRange !== null;
  const colCount = showComparisonColumns ? 7 : 5;

  const handlePreset = useCallback((presetValue) => {
    const dateRange = getDateRangeFromPreset(presetValue, taxConfig?.reporting_period || 'quarterly');
    setFilters(prev => ({
      ...prev,
      preset: presetValue,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }));
  }, [taxConfig?.reporting_period]);

  const handleExport = useCallback((exportType) => {
    const exportConfig = {
      companyName: DEFAULTS.companyName,
      reportTitle: "VAT / Sales Tax Summary",
      startDate: filters.startDate,
      endDate: filters.endDate,
      showComparison: showComparisonColumns,
      comparisonStartDate: comparisonDateRange?.start,
      comparisonEndDate: comparisonDateRange?.end,
      filingPeriod: taxConfig?.reporting_period || "Quarterly",
      generatedAt: new Date(),
      preparedBy: user?.full_name || "System",
      vatRegistration: taxConfig?.vat_registration_number || "IE123456789",
      currency: "EUR",
      jurisdiction: filters.jurisdictionFilter,
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(vatSummary, previousVatSummary, exportConfig);
          break;
        case "pdf":
          exportToPDF(vatSummary, exportConfig);
          break;
        case "csv":
          exportToCSV(vatSummary, exportConfig);
          toast.success("CSV file exported successfully");
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report. Please try again.");
    }
  }, [vatSummary, previousVatSummary, filters, showComparisonColumns, comparisonDateRange, taxConfig, user]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleRefresh = useCallback(() => {
    refetchPayments();
    refetchExpenses();
    refetchInvoices();
    toast.success("Data refreshed");
  }, [refetchPayments, refetchExpenses, refetchInvoices]);

  const openDrilldown = useCallback((label, transactions, totalTax, totalTaxable) => {
    setDrilldown({ label, transactions, totalTax, totalTaxable });
  }, []);

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
            <button onClick={() => navigate(createPageUrl("Finance"))} className="p-2 hover:bg-zinc-100 rounded-lg transition" aria-label="Back to Finance">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">{countryConfig.usesVat ? `${countryConfig.vatLabel} / Sales Tax Summary` : 'Sales Tax Summary'}</h1>
              <p className="text-sm text-zinc-500">
                {formatDateRange(filters.startDate, filters.endDate)}
                {comparisonDateRange && (
                  <>
                    <span className="mx-2">•</span>
                    vs {formatDateRangeShort(comparisonDateRange.start, comparisonDateRange.end)}
                  </>
                )}
                <span className="mx-2">•</span>
                {JURISDICTIONS.find(j => j.value === filters.jurisdictionFilter)?.label || filters.jurisdictionFilter}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${showFilters ? "bg-[#e8f4fa] text-[#3b82c4]" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <div className="h-6 w-px bg-zinc-200 mx-1 hidden sm:block" />

            <button onClick={() => handleExport("excel")} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3] transition">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => handleExport("pdf")} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#fdeeed] text-[#e44138] hover:bg-[#f9d4d2] transition">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => handleExport("csv")} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5] transition">
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <KPICard label="Taxable Sales" value={vatSummary.outputTax.totalTaxable} previousValue={previousVatSummary?.outputTax.totalTaxable} icon={<ShoppingCart className="w-4 h-4 text-[#3b82c4]" />} color="bg-[#e8f4fa]" />
          <KPICard label="VAT Collected" value={vatSummary.summary.totalOutputTax} previousValue={previousVatSummary?.summary.totalOutputTax} icon={<Receipt className="w-4 h-4 text-[#5cb83a]" />} color="bg-[#eefbe7]" />
          <KPICard label="VAT Paid" value={vatSummary.summary.totalInputTax} previousValue={previousVatSummary?.summary.totalInputTax} icon={<CreditCard className="w-4 h-4 text-[#6c376f]" />} color="bg-[#f3e8f4]" invertChange />
          <KPICard
            label={vatSummary.summary.isRefundable ? "VAT Refundable" : "VAT Due"}
            value={vatSummary.summary.netVATDue}
            previousValue={previousVatSummary?.summary.netVATDue}
            icon={<Scale className={`w-4 h-4 ${vatSummary.summary.isRefundable ? 'text-[#5cb83a]' : 'text-[#e44138]'}`} />}
            color={vatSummary.summary.isRefundable ? "bg-[#eefbe7]" : "bg-[#fdeeed]"}
            bgColor={vatSummary.summary.isRefundable ? "bg-[#eefbe7]" : "bg-[#fdeeed]"}
            invertChange
            isHighlighted
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm sticky top-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-zinc-400" />
                    Report Options
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* Tax Period Presets */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Tax Period
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DATE_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          onClick={() => handlePreset(preset.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filters.preset === preset.value ? "bg-[#3b82c4] text-white shadow-sm" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
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
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">To</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, preset: "custom" }))}
                          className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Comparison Period */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Compare To</label>
                    <select
                      value={filters.comparisonType}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        comparisonType: e.target.value,
                        showComparison: e.target.value !== "none"
                      }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      {COMPARISON_OPTIONS.map(option => (
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
                      value={filters.taxRateFilter.length === 0 ? "all" : filters.taxRateFilter[0]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        taxRateFilter: e.target.value === "all" ? [] : [e.target.value]
                      }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      {TAX_RATE_FILTER_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Jurisdiction Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      Jurisdiction
                    </label>
                    <select
                      value={filters.jurisdictionFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, jurisdictionFilter: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      {JURISDICTIONS.map(j => (
                        <option key={j.value} value={j.value}>{j.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filing Period Card */}
                  <div className="pt-4 border-t border-zinc-200">
                    <FilingPeriodCard period={vatSummary.period} filingPeriodType={taxConfig?.reporting_period || "Quarterly"} />
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
                  <h3 className="font-bold text-zinc-900">VAT Return Summary</h3>
                  <p className="text-xs text-zinc-500">Click any line to view underlying transactions</p>
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
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wide w-20">Rate</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Taxable</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Tax Amount</th>
                    <th className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wide w-20">Txns</th>
                    {showComparisonColumns && (
                      <>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Prior</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-24">Change %</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {/* OUTPUT TAX */}
                  <SectionHeader label="Output Tax (Sales)" isExpanded={expandedSections.output} onToggle={() => toggleSection('output')} showComparison={showComparisonColumns} icon={ShoppingCart} transactionCount={vatSummary.outputTax.totalTransactions} />

                  {expandedSections.output && Object.entries(vatSummary.outputTax.byRate)
                    .filter(([_, data]) => data.taxable > 0 || data.tax > 0)
                    .map(([key, data]) => (
                      <TaxLineItem
                        key={key}
                        label={getTaxRateLabel(key)}
                        rate={data.rate}
                        taxable={data.taxable}
                        tax={data.tax}
                        transactionCount={data.transactionCount}
                        prevTax={previousVatSummary?.outputTax.byRate[key]?.tax}
                        showComparison={showComparisonColumns}
                        indent={1}
                        onClick={data.transactions.length > 0 ? () => openDrilldown(getTaxRateLabel(key), data.transactions, data.tax, data.taxable) : undefined}
                      />
                    ))}

                  <TotalRow label="Total Output Tax" taxable={vatSummary.outputTax.totalTaxable} tax={vatSummary.outputTax.totalTax} transactionCount={vatSummary.outputTax.totalTransactions} prevTax={previousVatSummary?.outputTax.totalTax} showComparison={showComparisonColumns} />

                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* INPUT TAX */}
                  <SectionHeader label="Input Tax (Purchases)" isExpanded={expandedSections.input} onToggle={() => toggleSection('input')} showComparison={showComparisonColumns} icon={CreditCard} transactionCount={vatSummary.inputTax.totalTransactions} />

                  {expandedSections.input && Object.entries(vatSummary.inputTax.byRate)
                    .filter(([_, data]) => data.taxable > 0 || data.tax > 0)
                    .map(([key, data]) => (
                      <TaxLineItem
                        key={key}
                        label={`${getTaxRateLabel(key)} - Purchases`}
                        rate={data.rate}
                        taxable={data.taxable}
                        tax={data.tax}
                        transactionCount={data.transactionCount}
                        prevTax={previousVatSummary?.inputTax.byRate[key]?.tax}
                        showComparison={showComparisonColumns}
                        indent={1}
                        onClick={data.transactions.length > 0 ? () => openDrilldown(`${getTaxRateLabel(key)} - Purchases`, data.transactions, data.tax, data.taxable) : undefined}
                      />
                    ))}

                  <TotalRow label="Total Input Tax" taxable={vatSummary.inputTax.totalTaxable} tax={vatSummary.inputTax.totalTax} transactionCount={vatSummary.inputTax.totalTransactions} prevTax={previousVatSummary?.inputTax.totalTax} showComparison={showComparisonColumns} />

                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* ADJUSTMENTS */}
                  {(vatSummary.adjustments.creditNotes.tax !== 0 || vatSummary.adjustments.totalAdjustment !== 0) && (
                    <>
                      <SectionHeader label="Adjustments" isExpanded={expandedSections.adjustments} onToggle={() => toggleSection('adjustments')} showComparison={showComparisonColumns} icon={AlertTriangle} />

                      {expandedSections.adjustments && vatSummary.adjustments.creditNotes.tax !== 0 && (
                        <TaxLineItem
                          label="Credit Notes & Refunds"
                          rate={null}
                          taxable={vatSummary.adjustments.creditNotes.amount}
                          tax={-vatSummary.adjustments.creditNotes.tax}
                          transactionCount={vatSummary.adjustments.creditNotes.transactions.length}
                          showComparison={showComparisonColumns}
                          indent={1}
                          onClick={vatSummary.adjustments.creditNotes.transactions.length > 0 ? () => openDrilldown("Credit Notes & Refunds", vatSummary.adjustments.creditNotes.transactions, -vatSummary.adjustments.creditNotes.tax, vatSummary.adjustments.creditNotes.amount) : undefined}
                        />
                      )}

                      <TotalRow label="Total Adjustments" tax={vatSummary.adjustments.totalAdjustment} showComparison={showComparisonColumns} />

                      <tr className="h-3"><td colSpan={colCount}></td></tr>
                    </>
                  )}

                  {/* SUMMARY */}
                  <SectionHeader label="VAT Summary" isExpanded={expandedSections.summary} onToggle={() => toggleSection('summary')} showComparison={showComparisonColumns} icon={Scale} />

                  {expandedSections.summary && (
                    <>
                      <TaxLineItem label="Total VAT Collected (Output Tax)" rate={null} taxable={null} tax={vatSummary.summary.totalOutputTax} prevTax={previousVatSummary?.summary.totalOutputTax} showComparison={showComparisonColumns} indent={1} />
                      <TaxLineItem label="Less: VAT Paid (Input Tax)" rate={null} taxable={null} tax={-vatSummary.summary.totalInputTax} prevTax={previousVatSummary ? -previousVatSummary.summary.totalInputTax : null} showComparison={showComparisonColumns} indent={1} />
                      {vatSummary.summary.totalAdjustments !== 0 && (
                        <TaxLineItem label="Adjustments" rate={null} taxable={null} tax={vatSummary.summary.totalAdjustments} showComparison={showComparisonColumns} indent={1} />
                      )}
                    </>
                  )}

                  <TotalRow
                    label={vatSummary.summary.isRefundable ? "NET VAT REFUNDABLE" : "NET VAT DUE"}
                    tax={Math.abs(vatSummary.summary.netVATDue)}
                    prevTax={previousVatSummary ? Math.abs(previousVatSummary.summary.netVATDue) : null}
                    isGrandTotal
                    isRefundable={vatSummary.summary.isRefundable}
                    showComparison={showComparisonColumns}
                  />
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500 flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Report ID: {countryConfig.vatLabel || 'TAX'}-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Currency: {countryConfig.currency}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Filing: {taxConfig?.reporting_period || "Quarterly"}</span>
                </div>
                <span className="font-medium">DRAFT - SUBJECT TO REVIEW</span>
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
                <p className="text-sm font-medium text-[#2563a3]">{countryConfig.vatLabel || 'Tax'} Return Summary</p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  {countryConfig.usesVat 
                    ? `This report summarizes your ${countryConfig.vatLabel} position for the selected period. Click any line item to drill down into underlying transactions. Export to Excel for your accountant or tax advisor review.`
                    : `This report summarizes sales and expenses for the selected period. Your operating country (${countryConfig.name}) does not use VAT at the federal level.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* No Activity Warning */}
          {!hasVATActivity(vatSummary) && countryConfig.usesVat && (
            <div className="mt-4 p-4 rounded-xl bg-[#fdfbe8] border border-[#f9f3c8]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f9f3c8] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-[#b8a525]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#9a8520]">No {countryConfig.vatLabel} Activity</p>
                  <p className="text-sm text-[#b8a525] mt-0.5">
                    No taxable transactions were found for this period. If you expected {countryConfig.vatLabel} activity, please verify your data
                    or check if transactions are correctly categorized with tax codes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drilldown Panel */}
      <DrilldownPanel
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        label={drilldown?.label || ""}
        transactions={drilldown?.transactions || []}
        totalTax={drilldown?.totalTax || 0}
        totalTaxable={drilldown?.totalTaxable}
      />
    </div>
  );
}