import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subQuarters,
  subYears,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  eachMonthOfInterval,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Move,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileDown,
  Filter,
  Info,
  DollarSign,
  Wallet,
  Target,
  Receipt,
  Activity,
  AlertCircle,
  CheckCircle,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Check,
  Printer,
  Calendar,
  BarChart3,
  RefreshCw,
  Settings,
  HelpCircle,
  Clock,
  FileCheck,
  Layers,
  Building2,
  Scale,
  Calculator,
  Landmark,
  PiggyBank,
  CreditCard,
  Banknote,
  Percent,
  Hash,
  ExternalLink,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

export const DEFAULT_COMMISSION_RATE = 0.30;
export const DEFAULT_VAT_RATE = 0.23;
export const DEFAULT_CORPORATE_TAX_RATE = 0.125;

export const DATA_SOURCE_TYPES = {
  PAYMENT: "payment",
  EXPENSE: "expense",
  BOOKING: "booking",
  CALCULATED: "calculated",
  MANUAL: "manual",
  AGGREGATE: "aggregate",
};

// Irish VAT treatment for driving schools
// Driver training is VAT-EXEMPT under Section 13(1)(k) of the VAT Act
export const VAT_TREATMENT = {
  lesson: 'exempt',
  package: 'exempt',
  theory: 'exempt',
  mock_test: 'exempt',
  refresher: 'exempt',
  exam_fee: 'zero',        // Pass-through to RSA
  merchandise: 'standard',
  vehicle_sale: 'standard',
  other: 'exempt',
};

export const PAYMENT_TYPES = [
  { value: "lesson", label: "Driving Lessons", vatTreatment: "exempt" },
  { value: "package", label: "Lesson Packages", vatTreatment: "exempt" },
  { value: "exam_fee", label: "Exam Fees", vatTreatment: "zero" },
  { value: "theory", label: "Theory Training", vatTreatment: "exempt" },
  { value: "mock_test", label: "Mock Tests", vatTreatment: "exempt" },
  { value: "refresher", label: "Refresher Courses", vatTreatment: "exempt" },
  { value: "other", label: "Other Payments", vatTreatment: "exempt" },
];

export const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Fuel & Mileage", group: "Vehicle" },
  { value: "vehicle_insurance", label: "Vehicle Insurance", group: "Vehicle" },
  { value: "vehicle_operating", label: "Vehicle Operating", group: "Vehicle" },
  { value: "maintenance", label: "Maintenance", group: "Vehicle" },
  { value: "vehicle", label: "Vehicle General", group: "Vehicle" },
  { value: "road_tax", label: "Road Tax", group: "Vehicle" },
  { value: "salaries", label: "Salaries & Wages", group: "Personnel" },
  { value: "benefits", label: "Employee Benefits", group: "Personnel" },
  { value: "prsi", label: "Employer PRSI", group: "Personnel" },
  { value: "training", label: "Training", group: "Personnel" },
  { value: "rent", label: "Rent", group: "Facilities" },
  { value: "utilities", label: "Utilities", group: "Facilities" },
  { value: "property_insurance", label: "Property Insurance", group: "Facilities" },
  { value: "repairs", label: "Repairs", group: "Facilities" },
  { value: "marketing", label: "Marketing & Advertising", group: "Marketing" },
  { value: "website", label: "Website & Online", group: "Marketing" },
  { value: "promotions", label: "Promotions", group: "Marketing" },
  { value: "office_supplies", label: "Office Supplies", group: "Administrative" },
  { value: "software", label: "Software & Subscriptions", group: "Administrative" },
  { value: "telecom", label: "Telephone & Internet", group: "Administrative" },
  { value: "postage", label: "Postage & Courier", group: "Administrative" },
  { value: "professional", label: "Professional Fees", group: "Professional" },
  { value: "accounting", label: "Accounting & Audit", group: "Professional" },
  { value: "legal", label: "Legal Fees", group: "Professional" },
  { value: "consulting", label: "Consulting Fees", group: "Professional" },
  { value: "bank_charges", label: "Bank Charges", group: "Financial" },
  { value: "payment_processing", label: "Payment Processing", group: "Financial" },
  { value: "fx_loss", label: "Foreign Exchange Loss", group: "Financial" },
  { value: "depreciation_vehicles", label: "Vehicle Depreciation", group: "Depreciation" },
  { value: "depreciation_equipment", label: "Equipment Depreciation", group: "Depreciation" },
  { value: "amortization", label: "Amortization", group: "Depreciation" },
  { value: "bad_debt", label: "Bad Debt", group: "Other" },
  { value: "licenses", label: "Licenses & Permits", group: "Other" },
  { value: "Other", label: "Miscellaneous", group: "Other" },
  { value: "interest_expense", label: "Interest Expense", group: "Tax & Interest" },
  { value: "loan_interest", label: "Loan Interest", group: "Tax & Interest" },
  { value: "late_penalties", label: "Late Penalties", group: "Tax & Interest" },
  { value: "corporation_tax", label: "Corporation Tax", group: "Tax & Interest" },
  { value: "deferred_tax", label: "Deferred Tax", group: "Tax & Interest" },
  { value: "interest_income", label: "Interest Income", group: "Other Income" },
  { value: "rental_income", label: "Rental Income", group: "Other Income" },
  { value: "insurance_proceeds", label: "Insurance Proceeds", group: "Other Income" },
  { value: "misc_income", label: "Miscellaneous Income", group: "Other Income" },
];

export const CALCULATED_FORMULAS = [
  { value: "grossProfit", label: "Gross Profit (Revenue - COGS)" },
  { value: "operatingIncome", label: "Operating Income (Gross Profit - OpEx)" },
  { value: "incomeBeforeTax", label: "Income Before Tax" },
  { value: "corporationTax", label: "Corporation Tax (12.5% of EBT)" },
  { value: "netIncome", label: "Net Income" },
  { value: "ebitda", label: "EBITDA" },
];

export const DEPRECIATION_METHODS = {
  straight_line: "Straight-Line",
  declining_balance: "Declining Balance",
  units_of_production: "Units of Production",
};

export const REVENUE_RECOGNITION_METHODS = {
  accrual: "When lesson is delivered",
  cash: "When payment is received",
  package_prorated: "Package revenue prorated over lessons",
};

// ============================================
// DEFAULT P&L STRUCTURE
// ============================================

export const DEFAULT_PL_STRUCTURE = {
  revenue: {
    id: "revenue",
    label: "REVENUE",
    icon: "DollarSign",
    order: 1,
    visible: true,
    accounts: [
      {
        id: "4000",
        code: "4000",
        name: "Driving Lessons",
        visible: true,
        order: 1,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["lesson"] },
        },
      },
      {
        id: "4010",
        code: "4010",
        name: "Lesson Packages",
        visible: true,
        order: 2,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["package"] },
        },
      },
      {
        id: "4020",
        code: "4020",
        name: "Exam Fees",
        visible: true,
        order: 3,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["exam_fee"] },
        },
      },
      {
        id: "4030",
        code: "4030",
        name: "Theory Training",
        visible: true,
        order: 4,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["theory"] },
        },
      },
      {
        id: "4040",
        code: "4040",
        name: "Mock Test Fees",
        visible: true,
        order: 5,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["mock_test"] },
        },
      },
      {
        id: "4090",
        code: "4090",
        name: "Other Revenue",
        visible: true,
        order: 6,
        dataSource: {
          type: DATA_SOURCE_TYPES.PAYMENT,
          config: { paymentTypes: ["other", "refresher"], excludeMapped: true },
        },
      },
    ],
  },
  cogs: {
    id: "cogs",
    label: "COST OF REVENUE",
    icon: "Wallet",
    order: 2,
    visible: true,
    accounts: [
      {
        id: "5000",
        code: "5000",
        name: "Instructor Commissions",
        visible: true,
        order: 1,
        dataSource: {
          type: DATA_SOURCE_TYPES.BOOKING,
          config: { calculationType: "commission" },
        },
      },
      {
        id: "5010",
        code: "5010",
        name: "Vehicle Operating Costs",
        visible: true,
        order: 2,
        dataSource: {
          type: DATA_SOURCE_TYPES.EXPENSE,
          config: { categories: ["vehicle_operating"] },
        },
      },
      {
        id: "5020",
        code: "5020",
        name: "Fuel & Mileage",
        visible: true,
        order: 3,
        dataSource: {
          type: DATA_SOURCE_TYPES.EXPENSE,
          config: { categories: ["fuel"] },
        },
      },
      {
        id: "5030",
        code: "5030",
        name: "Vehicle Insurance",
        visible: true,
        order: 4,
        dataSource: {
          type: DATA_SOURCE_TYPES.EXPENSE,
          config: { categories: ["vehicle_insurance"] },
        },
      },
      {
        id: "5040",
        code: "5040",
        name: "Vehicle Maintenance",
        visible: true,
        order: 5,
        dataSource: {
          type: DATA_SOURCE_TYPES.EXPENSE,
          config: { categories: ["maintenance", "vehicle"] },
        },
      },
      {
        id: "5050",
        code: "5050",
        name: "Road Tax & Licensing",
        visible: true,
        order: 6,
        dataSource: {
          type: DATA_SOURCE_TYPES.EXPENSE,
          config: { categories: ["road_tax"] },
        },
      },
    ],
  },
  operatingExpenses: {
    id: "operatingExpenses",
    label: "OPERATING EXPENSES",
    icon: "Receipt",
    order: 3,
    visible: true,
    subsections: [
      {
        id: "personnel",
        label: "Personnel",
        visible: true,
        order: 1,
        accounts: [
          { id: "6000", code: "6000", name: "Salaries & Wages", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["salaries"] } } },
          { id: "6010", code: "6010", name: "Employee Benefits", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["benefits"] } } },
          { id: "6020", code: "6020", name: "Employer PRSI", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["prsi"] } } },
          { id: "6030", code: "6030", name: "Training & Development", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["training"] } } },
        ],
      },
      {
        id: "facilities",
        label: "Facilities",
        visible: true,
        order: 2,
        accounts: [
          { id: "6100", code: "6100", name: "Rent & Lease Payments", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["rent"] } } },
          { id: "6110", code: "6110", name: "Utilities", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["utilities"] } } },
          { id: "6120", code: "6120", name: "Property Insurance", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["property_insurance"] } } },
          { id: "6130", code: "6130", name: "Repairs & Maintenance", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["repairs"] } } },
        ],
      },
      {
        id: "salesMarketing",
        label: "Sales & Marketing",
        visible: true,
        order: 3,
        accounts: [
          { id: "6200", code: "6200", name: "Marketing & Advertising", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["marketing"] } } },
          { id: "6210", code: "6210", name: "Website & Online", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["website"] } } },
          { id: "6220", code: "6220", name: "Promotions & Discounts", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["promotions"] } } },
        ],
      },
      {
        id: "administrative",
        label: "Administrative",
        visible: true,
        order: 4,
        accounts: [
          { id: "6300", code: "6300", name: "Office Supplies", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["office_supplies"] } } },
          { id: "6310", code: "6310", name: "Software & Subscriptions", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["software"] } } },
          { id: "6320", code: "6320", name: "Telephone & Internet", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["telecom"] } } },
          { id: "6330", code: "6330", name: "Postage & Courier", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["postage"] } } },
        ],
      },
      {
        id: "professionalServices",
        label: "Professional Services",
        visible: true,
        order: 5,
        accounts: [
          { id: "6400", code: "6400", name: "Professional Fees", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["professional"] } } },
          { id: "6410", code: "6410", name: "Accounting & Audit", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["accounting"] } } },
          { id: "6420", code: "6420", name: "Legal Fees", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["legal"] } } },
          { id: "6430", code: "6430", name: "Consulting Fees", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["consulting"] } } },
        ],
      },
      {
        id: "financial",
        label: "Financial",
        visible: true,
        order: 6,
        accounts: [
          { id: "6500", code: "6500", name: "Bank Charges", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["bank_charges"] } } },
          { id: "6510", code: "6510", name: "Payment Processing Fees", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["payment_processing"] } } },
          { id: "6520", code: "6520", name: "Foreign Exchange Loss", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["fx_loss"] } } },
        ],
      },
      {
        id: "depreciation",
        label: "Depreciation & Amortization",
        visible: true,
        order: 7,
        accounts: [
          { id: "6600", code: "6600", name: "Depreciation - Vehicles", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["depreciation_vehicles"] } } },
          { id: "6610", code: "6610", name: "Depreciation - Equipment", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["depreciation_equipment"] } } },
          { id: "6620", code: "6620", name: "Amortization - Intangibles", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["amortization"] } } },
        ],
      },
      {
        id: "otherOperating",
        label: "Other Operating",
        visible: true,
        order: 8,
        accounts: [
          { id: "6700", code: "6700", name: "Bad Debt Expense", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["bad_debt"] } } },
          { id: "6710", code: "6710", name: "Licenses & Permits", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["licenses"] } } },
          { id: "6720", code: "6720", name: "Miscellaneous Expense", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["Other"], excludeMapped: true } } },
        ],
      },
    ],
  },
  otherIncome: {
    id: "otherIncome",
    label: "OTHER INCOME",
    icon: "Banknote",
    order: 4,
    visible: true,
    accounts: [
      { id: "4500", code: "4500", name: "Interest Income", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["interest_income"], isIncome: true } } },
      { id: "4510", code: "4510", name: "Rental Income", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["rental_income"], isIncome: true } } },
      { id: "4520", code: "4520", name: "Insurance Proceeds", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["insurance_proceeds"], isIncome: true } } },
      { id: "4590", code: "4590", name: "Miscellaneous Income", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["misc_income"], isIncome: true } } },
    ],
  },
  otherExpenses: {
    id: "otherExpenses",
    label: "OTHER EXPENSES",
    icon: "CreditCard",
    order: 5,
    visible: true,
    accounts: [
      { id: "7000", code: "7000", name: "Interest Expense", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["interest_expense"] } } },
      { id: "7010", code: "7010", name: "Loan Interest", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["loan_interest"] } } },
      { id: "7020", code: "7020", name: "Late Payment Penalties", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["late_penalties"] } } },
      { id: "7030", code: "7030", name: "Loss on Asset Disposal", visible: true, order: 4, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["asset_disposal_loss"] } } },
    ],
  },
  taxes: {
    id: "taxes",
    label: "INCOME TAX EXPENSE",
    icon: "Landmark",
    order: 6,
    visible: true,
    accounts: [
      { id: "8000", code: "8000", name: "Corporation Tax", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "corporationTax" } } },
      { id: "8010", code: "8010", name: "Deferred Tax Expense", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.EXPENSE, config: { categories: ["deferred_tax"] } } },
    ],
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Security: Escape XML for exports
export const escapeXML = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Security: Escape HTML for PDF exports
export const escapeHTML = (str) => {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Alias for consistency
export const escapeHtml = escapeHTML;

// Security: Escape CSV values
export const escapeCsv = (value) => {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// ============================================
// FORMATTING FUNCTIONS
// ============================================

export const formatCurrency = (value, showSign = false) => {
  if (value === 0 || value === null || value === undefined) return "—";
  
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue);

  if (value < 0) {
    return `(${formatted})`;
  }
  
  if (showSign && value > 0) {
    return `+${formatted}`;
  }
  
  return formatted;
};

export const formatCurrencyRaw = (value) => {
  if (value === 0 || value === null || value === undefined) return "€0";
  
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue);

  return value < 0 ? `(${formatted})` : formatted;
};

// Format change amount with proper coloring logic
export const formatChangeAmount = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  
  const change = current - previous;
  
  // If both are negative, improvement means less negative (moving toward zero)
  // e.g., -78 to -39 is an improvement (green), -39 to -78 is deterioration (red)
  const isImprovement = previous < 0 && current < 0 
    ? current > previous  // Less negative is better
    : change > 0;         // More positive is better
  
  return {
    value: change,
    formatted: formatCurrency(change, true),
    isImprovement,
    colorClass: isImprovement ? 'text-emerald-600' : 'text-red-600',
  };
};

// Format change percentage with proper logic
export const formatChangePercent = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return { formatted: 'N/A', colorClass: 'text-zinc-400' };
  
  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  
  // Same improvement logic as amount
  const isImprovement = previous < 0 && current < 0 
    ? current > previous
    : change > 0;
  
  const formatted = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
  
  return {
    value: changePercent,
    formatted,
    isImprovement,
    colorClass: isImprovement ? 'text-emerald-600' : 'text-red-600',
  };
};

export const formatPercent = (value, baseValue, decimals = 1) => {
  if (baseValue === 0 || baseValue === null || baseValue === undefined) return "N/A";
  if (value === 0 || value === null || value === undefined) return "—";
  
  const percent = (value / baseValue) * 100;
  return `${percent.toFixed(decimals)}%`;
};

export const formatPercentDirect = (value, decimals = 1) => {
  if (value === 0 || value === null || value === undefined) return "—";
  return `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(decimals)}%`;
};

export const calculateChange = (current, previous) => {
  const amount = current - previous;
  const percent = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;
  return { amount, percent };
};

export const generateFileName = (reportName, fileExtension, dateRange) => {
  const sanitized = reportName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const period = `${format(parseISO(dateRange.start), "yyyyMMdd")}-${format(parseISO(dateRange.end), "yyyyMMdd")}`;
  const timestamp = format(new Date(), "yyyyMMdd_HHmm");
  return `${sanitized}_${period}_${timestamp}.${fileExtension.toLowerCase()}`;
};

// Alias for backwards compatibility
export const generateFilename = generateFileName;

// ============================================
// DATE RANGE HELPERS
// ============================================

export const isInDateRange = (dateStr, startDate, endDate) => {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return isWithinInterval(date, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate)),
    });
  } catch {
    return false;
  }
};

// ============================================
// DEFAULT FILTERS
// ============================================

export const getDefaultFilters = () => ({
  startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
  endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  preset: "thisMonth",
  basis: "accrual",
  studentId: null,
  instructorId: null,
  vehicleId: null,
  serviceType: null,
  showComparison: true,
  comparisonType: "previous_period",
  showPercentages: true,
  showAccountCodes: false,
  showVATBreakdown: false,
  showEBITDABreakdown: true,
  showKeyRatios: false,
  showYTDSummary: false,
  showSegmentAnalysis: false,
  segmentBy: "none",
  showDetailedVehicleCosts: false,
  showDetailedInstructorCosts: false,
  showNotes: true,
  depreciationMethod: "straight_line",
  revenueRecognition: "accrual",
  customCorporateTaxRate: null,
  customVATRate: null,
});

// ============================================
// REACT QUERY CONFIGURATION
// ============================================

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,      // 5 minutes
  cacheTime: 30 * 60 * 1000,     // 30 minutes
  refetchOnWindowFocus: false,
  retry: 2,
};

// ============================================
// PERSISTED STATE HOOK
// ============================================

export const usePersistedState = (key, defaultValue, validator = () => true) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validator(parsed)) {
          return parsed;
        }
        console.warn(`Invalid data in localStorage for ${key}, using default`);
      }
    } catch (error) {
      console.warn(`Error reading localStorage for ${key}:`, error);
    }
    return defaultValue;
  });

  const setPersistedState = useCallback((value) => {
    setState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.error(`Error saving to localStorage for ${key}:`, error);
      }
      return newValue;
    });
  }, [key]);

  return [state, setPersistedState];
};

// Validator for P&L structure
export const isValidPLStructure = (data) => {
  if (!data || typeof data !== 'object') return false;
  const requiredSections = ['revenue', 'cogs', 'operatingExpenses'];
  return requiredSections.every(section => 
    data[section] && 
    typeof data[section].id === 'string' &&
    typeof data[section].order === 'number'
  );
};

// ============================================
// SINGLE-PASS DATA AGGREGATION
// This is the key performance optimization.
// Instead of filtering arrays multiple times (O(n*m)),
// we aggregate all data in a single pass (O(n)).
// ============================================

export const createFilteredDataset = (rawData, filters, instructors, vehicles) => {
  const { startDate, endDate, studentId, instructorId, vehicleId, serviceType } = filters;
  
  // Pre-index instructors and vehicles for O(1) lookup
  const instructorMap = new Map(instructors.map(i => [i.id, i]));
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  
  // Initialize aggregation structures
  const paymentsByType = new Map();
  const expensesByCategory = new Map();
  const filteredPayments = [];
  const filteredBookings = [];
  const filteredExpenses = [];
  
  let instructorCommissions = 0;
  
  // SINGLE PASS through payments
  for (const payment of rawData.payments) {
    const dateStr = payment.payment_date || payment.created_date;
    if (!isInDateRange(dateStr, startDate, endDate)) continue;
    if (payment.status !== "completed") continue;
    if (studentId && payment.student_id !== studentId) continue;
    if (serviceType && payment.payment_type !== serviceType) continue;
    
    filteredPayments.push(payment);
    
    const type = payment.payment_type || 'other';
    const current = paymentsByType.get(type) || { amount: 0, transactions: [] };
    current.amount += payment.amount || 0;
    current.transactions.push(payment);
    paymentsByType.set(type, current);
  }
  
  // SINGLE PASS through bookings
  for (const booking of rawData.bookings) {
    if (!isInDateRange(booking.start_datetime, startDate, endDate)) continue;
    if (booking.status !== "completed") continue;
    if (studentId && booking.student_id !== studentId) continue;
    if (instructorId && booking.instructor_id !== instructorId) continue;
    if (vehicleId && booking.vehicle_id !== vehicleId) continue;
    if (serviceType && booking.lesson_type !== serviceType) continue;
    
    filteredBookings.push(booking);
    
    // Calculate instructor commission with O(1) lookup
    const instructor = instructorMap.get(booking.instructor_id);
    const rate = instructor?.commission_rate 
      ? instructor.commission_rate / 100 
      : DEFAULT_COMMISSION_RATE;
    instructorCommissions += (booking.price || 0) * rate;
  }
  
  // SINGLE PASS through expenses
  for (const expense of rawData.expenses) {
    if (!isInDateRange(expense.expense_date, startDate, endDate)) continue;
    if (vehicleId && expense.vehicle_id !== vehicleId) continue;
    
    filteredExpenses.push(expense);
    
    const category = expense.category || 'Other';
    const current = expensesByCategory.get(category) || { amount: 0, transactions: [] };
    current.amount += expense.amount || 0;
    current.transactions.push(expense);
    expensesByCategory.set(category, current);
  }
  
  return {
    payments: filteredPayments,
    bookings: filteredBookings,
    expenses: filteredExpenses,
    paymentsByType,
    expensesByCategory,
    instructorCommissions,
    instructorMap,
    vehicleMap,
    meta: {
      totalPayments: filteredPayments.length,
      totalBookings: filteredBookings.length,
      totalExpenses: filteredExpenses.length,
    },
  };
};

// ============================================
// PRE-AGGREGATE DATA BY MONTH
// For trend calculations, we pre-aggregate once
// instead of recalculating 12 times
// ============================================

export const aggregateDataByMonth = (payments, bookings, expenses) => {
  const monthlyData = new Map();
  
  const getMonthKey = (dateStr) => {
    if (!dateStr) return null;
    try {
      return dateStr.substring(0, 7); // "2025-01"
    } catch {
      return null;
    }
  };
  
  // Aggregate payments by month
  for (const payment of payments) {
    const month = getMonthKey(payment.payment_date || payment.created_date);
    if (!month) continue;
    
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { payments: [], bookings: [], expenses: [] });
    }
    monthlyData.get(month).payments.push(payment);
  }
  
  // Aggregate bookings by month
  for (const booking of bookings) {
    const month = getMonthKey(booking.start_datetime);
    if (!month) continue;
    
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { payments: [], bookings: [], expenses: [] });
    }
    monthlyData.get(month).bookings.push(booking);
  }
  
  // Aggregate expenses by month
  for (const expense of expenses) {
    const month = getMonthKey(expense.expense_date);
    if (!month) continue;
    
    if (!monthlyData.has(month)) {
      monthlyData.set(month, { payments: [], bookings: [], expenses: [] });
    }
    monthlyData.get(month).expenses.push(expense);
  }
  
  return monthlyData;
};

// ============================================
// ACCOUNT VALUE CALCULATOR
// ============================================

const calculateAccountValue = (account, aggregatedData, calculatedTotals) => {
  const { dataSource } = account;

  if (!dataSource) {
    return { amount: 0, transactions: [] };
  }

  const { type, config } = dataSource;

  switch (type) {
    case DATA_SOURCE_TYPES.PAYMENT: {
      const { paymentTypes = [], excludeMapped = false } = config;
      
      let amount = 0;
      let transactions = [];
      
      if (excludeMapped) {
        // Get payments not in standard categories
        const standardTypes = ["lesson", "package", "exam_fee", "theory", "mock_test"];
        for (const [paymentType, data] of aggregatedData.paymentsByType) {
          if (!standardTypes.includes(paymentType)) {
            amount += data.amount;
            transactions = transactions.concat(data.transactions);
          }
        }
      } else {
        for (const paymentType of paymentTypes) {
          const data = aggregatedData.paymentsByType.get(paymentType);
          if (data) {
            amount += data.amount;
            transactions = transactions.concat(data.transactions);
          }
        }
      }
      
      return { amount, transactions };
    }

    case DATA_SOURCE_TYPES.EXPENSE: {
      const { categories = [], isIncome = false } = config;
      
      let amount = 0;
      let transactions = [];
      
      for (const category of categories) {
        const data = aggregatedData.expensesByCategory.get(category);
        if (data) {
          amount += isIncome ? Math.abs(data.amount) : data.amount;
          transactions = transactions.concat(data.transactions);
        }
      }
      
      return { amount, transactions };
    }

    case DATA_SOURCE_TYPES.BOOKING: {
      const { calculationType } = config;

      if (calculationType === "commission") {
        return { 
          amount: aggregatedData.instructorCommissions, 
          transactions: aggregatedData.bookings 
        };
      }

      if (calculationType === "revenue") {
        const revenue = aggregatedData.bookings.reduce((sum, b) => sum + (b.price || 0), 0);
        return { amount: revenue, transactions: aggregatedData.bookings };
      }

      return { amount: 0, transactions: [] };
    }

    case DATA_SOURCE_TYPES.CALCULATED: {
      const { formula } = config;
      const corporateTaxRate = calculatedTotals.corporateTaxRate || DEFAULT_CORPORATE_TAX_RATE;

      const formulas = {
        grossProfit: () => calculatedTotals.totalRevenue - calculatedTotals.totalCogs,
        operatingIncome: () => calculatedTotals.grossProfit - calculatedTotals.totalOperatingExpenses,
        incomeBeforeTax: () => 
          calculatedTotals.operatingIncome + 
          calculatedTotals.totalOtherIncome - 
          calculatedTotals.totalOtherExpenses,
        corporationTax: () => {
          const ebt = calculatedTotals.incomeBeforeTax || 0;
          return ebt > 0 ? ebt * corporateTaxRate : 0;
        },
        netIncome: () => calculatedTotals.incomeBeforeTax - calculatedTotals.totalTaxExpense,
        ebitda: () => calculatedTotals.operatingIncome + calculatedTotals.totalDepreciation,
      };

      if (formulas[formula]) {
        return { amount: formulas[formula](), transactions: [] };
      }

      return { amount: 0, transactions: [] };
    }

    case DATA_SOURCE_TYPES.MANUAL: {
      return { amount: config.value || 0, transactions: [] };
    }

    default:
      return { amount: 0, transactions: [] };
  }
};

// ============================================
// CORRECTED VAT CALCULATION FOR IRISH DRIVING SCHOOLS
// Driver training is VAT-EXEMPT - you don't charge VAT
// and can't reclaim input VAT on related purchases
// ============================================

const calculateVATPosition = (aggregatedData, totalCogs, totalOperatingExpenses, vatRate) => {
  let exemptRevenue = 0;
  let zeroRatedRevenue = 0;
  let standardRatedRevenue = 0;
  
  // Categorize revenue by VAT treatment
  for (const [paymentType, data] of aggregatedData.paymentsByType) {
    const treatment = VAT_TREATMENT[paymentType] || 'exempt';
    
    switch (treatment) {
      case 'exempt':
        exemptRevenue += data.amount;
        break;
      case 'zero':
        zeroRatedRevenue += data.amount;
        break;
      case 'standard':
        standardRatedRevenue += data.amount;
        break;
    }
  }
  
  const totalRevenue = exemptRevenue + zeroRatedRevenue + standardRatedRevenue;
  
  // Output VAT only on standard-rated supplies
  const outputVAT = standardRatedRevenue * vatRate / (1 + vatRate);
  
  // Input VAT on purchases
  const totalInputVAT = (totalCogs + totalOperatingExpenses) * vatRate / (1 + vatRate);
  
  // For exempt businesses, VAT recovery is restricted
  // Use partial exemption calculation
  const taxableRatio = totalRevenue > 0 ? standardRatedRevenue / totalRevenue : 0;
  const recoverableVAT = totalInputVAT * taxableRatio;
  const irrecoverableVAT = totalInputVAT - recoverableVAT; // This is a COST
  
  return {
    exemptRevenue,
    zeroRatedRevenue,
    standardRatedRevenue,
    outputVAT,
    inputVAT: totalInputVAT,
    recoverableVAT,
    irrecoverableVAT,
    netVATPayable: outputVAT - recoverableVAT,
    // Legacy compatibility
    vatCollected: outputVAT,
    vatPaid: recoverableVAT,
    netVATDue: outputVAT - recoverableVAT,
  };
};

// ============================================
// MAIN P&L BUILDER - OPTIMIZED
// ============================================

export const buildDynamicPLData = (
  structure,
  payments,
  bookings,
  expenses,
  filters,
  instructors,
  vehicles,
  taxRates = {}
) => {
  const VAT_RATE = taxRates.vat_rate || DEFAULT_VAT_RATE;
  const CORPORATE_TAX_RATE = taxRates.corporate_tax_rate || DEFAULT_CORPORATE_TAX_RATE;
  
  // Step 1: Create aggregated dataset in single pass
  const aggregatedData = createFilteredDataset(
    { payments, bookings, expenses },
    filters,
    instructors,
    vehicles
  );
  
  const accountValues = {};
  const accountTransactions = {};

  const calculatedTotals = {
    totalRevenue: 0,
    totalCogs: 0,
    totalOperatingExpenses: 0,
    totalOtherIncome: 0,
    totalOtherExpenses: 0,
    totalTaxExpense: 0,
    totalDepreciation: 0,
    totalPersonnel: 0,
    totalFacilities: 0,
    totalSalesMarketing: 0,
    totalAdministrative: 0,
    totalProfessionalServices: 0,
    totalFinancial: 0,
    totalOtherOperating: 0,
    grossProfit: 0,
    operatingIncome: 0,
    incomeBeforeTax: 0,
    netIncome: 0,
    ebitda: 0,
    corporateTaxRate: CORPORATE_TAX_RATE,
  };

  // Step 2: Calculate non-calculated accounts first
  const processAccount = (account, skipCalculated = true) => {
    if (!account.visible) return;
    if (skipCalculated && account.dataSource?.type === DATA_SOURCE_TYPES.CALCULATED) return;
    if (!skipCalculated && account.dataSource?.type !== DATA_SOURCE_TYPES.CALCULATED) return;
    
    const result = calculateAccountValue(account, aggregatedData, calculatedTotals);
    accountValues[account.id] = result.amount;
    accountTransactions[account.id] = result.transactions;
  };

  Object.values(structure).forEach((section) => {
    if (!section.visible) return;

    if (section.accounts) {
      section.accounts.forEach(account => processAccount(account, true));
    }

    if (section.subsections) {
      section.subsections.forEach((subsection) => {
        if (!subsection.visible) return;
        subsection.accounts.forEach(account => processAccount(account, true));
      });
    }
  });

  // Step 3: Calculate section totals
  const getSectionTotal = (sectionId) => {
    const section = structure[sectionId];
    if (!section || !section.visible) return 0;

    let total = 0;

    if (section.accounts) {
      section.accounts.forEach((account) => {
        if (account.visible) {
          total += accountValues[account.id] || 0;
        }
      });
    }

    if (section.subsections) {
      section.subsections.forEach((subsection) => {
        if (subsection.visible) {
          subsection.accounts.forEach((account) => {
            if (account.visible) {
              total += accountValues[account.id] || 0;
            }
          });
        }
      });
    }

    return total;
  };

  const getSubsectionTotal = (sectionId, subsectionId) => {
    const section = structure[sectionId];
    if (!section?.subsections) return 0;

    const subsection = section.subsections.find((s) => s.id === subsectionId);
    if (!subsection?.visible) return 0;

    return subsection.accounts
      .filter((a) => a.visible)
      .reduce((sum, a) => sum + (accountValues[a.id] || 0), 0);
  };

  // Update calculated totals
  calculatedTotals.totalRevenue = getSectionTotal("revenue");
  calculatedTotals.totalCogs = getSectionTotal("cogs");
  calculatedTotals.totalOtherIncome = getSectionTotal("otherIncome");
  calculatedTotals.totalOtherExpenses = getSectionTotal("otherExpenses");

  // Operating expenses breakdown
  calculatedTotals.totalPersonnel = getSubsectionTotal("operatingExpenses", "personnel");
  calculatedTotals.totalFacilities = getSubsectionTotal("operatingExpenses", "facilities");
  calculatedTotals.totalSalesMarketing = getSubsectionTotal("operatingExpenses", "salesMarketing");
  calculatedTotals.totalAdministrative = getSubsectionTotal("operatingExpenses", "administrative");
  calculatedTotals.totalProfessionalServices = getSubsectionTotal("operatingExpenses", "professionalServices");
  calculatedTotals.totalFinancial = getSubsectionTotal("operatingExpenses", "financial");
  calculatedTotals.totalDepreciation = getSubsectionTotal("operatingExpenses", "depreciation");
  calculatedTotals.totalOtherOperating = getSubsectionTotal("operatingExpenses", "otherOperating");

  calculatedTotals.totalOperatingExpenses =
    calculatedTotals.totalPersonnel +
    calculatedTotals.totalFacilities +
    calculatedTotals.totalSalesMarketing +
    calculatedTotals.totalAdministrative +
    calculatedTotals.totalProfessionalServices +
    calculatedTotals.totalFinancial +
    calculatedTotals.totalDepreciation +
    calculatedTotals.totalOtherOperating;

  // Operating expenses EXCLUDING Depreciation & Amortization
  const operatingExpensesExcludingDA =
    calculatedTotals.totalPersonnel +
    calculatedTotals.totalFacilities +
    calculatedTotals.totalSalesMarketing +
    calculatedTotals.totalAdministrative +
    calculatedTotals.totalProfessionalServices +
    calculatedTotals.totalFinancial +
    calculatedTotals.totalOtherOperating;

  // GAAP/IFRS Standard P&L Structure
  // Revenue - Cost of Revenue = Gross Profit
  calculatedTotals.grossProfit = calculatedTotals.totalRevenue - calculatedTotals.totalCogs;
  calculatedTotals.grossMargin =
    calculatedTotals.totalRevenue > 0
      ? (calculatedTotals.grossProfit / calculatedTotals.totalRevenue) * 100
      : 0;

  // Gross Profit - Operating Expenses (excluding D&A) = EBITDA
  calculatedTotals.ebitda = calculatedTotals.grossProfit - operatingExpensesExcludingDA;
  calculatedTotals.ebitdaMargin =
    calculatedTotals.totalRevenue > 0
      ? (calculatedTotals.ebitda / calculatedTotals.totalRevenue) * 100
      : 0;

  // EBITDA - Depreciation - Amortization = EBIT (Operating Income)
  calculatedTotals.operatingIncome = calculatedTotals.ebitda - calculatedTotals.totalDepreciation;
  calculatedTotals.operatingMargin =
    calculatedTotals.totalRevenue > 0
      ? (calculatedTotals.operatingIncome / calculatedTotals.totalRevenue) * 100
      : 0;

  // Calculate Other Income (non-interest items only)
  calculatedTotals.totalOtherIncomeNonInterest = 
    (accountValues["4510"] || 0) + 
    (accountValues["4520"] || 0) + 
    (accountValues["4590"] || 0);

  // Calculate Other Expenses (non-interest items only)
  calculatedTotals.totalOtherExpensesNonInterest = 
    (accountValues["7020"] || 0) + 
    (accountValues["7030"] || 0);

  // Calculate Interest components
  calculatedTotals.totalInterestExpense = (accountValues["7000"] || 0) + (accountValues["7010"] || 0);
  calculatedTotals.totalInterestIncome = accountValues["4500"] || 0;
  calculatedTotals.netInterest = calculatedTotals.totalInterestExpense - calculatedTotals.totalInterestIncome;

  // EBT Calculation: EBIT + Other Income - Other Expenses - Net Interest = EBT
  calculatedTotals.incomeBeforeTax = 
    calculatedTotals.operatingIncome + 
    calculatedTotals.totalOtherIncomeNonInterest - 
    calculatedTotals.totalOtherExpensesNonInterest - 
    calculatedTotals.netInterest;

  // Step 4: Calculate CALCULATED type accounts
  Object.values(structure).forEach((section) => {
    if (!section.visible) return;

    if (section.accounts) {
      section.accounts.forEach(account => processAccount(account, false));
    }

    if (section.subsections) {
      section.subsections.forEach((sub) => {
        if (sub.visible) {
          sub.accounts.forEach(account => processAccount(account, false));
        }
      });
    }
  });

  // Tax total
  calculatedTotals.totalTaxExpense = getSectionTotal("taxes");

  // EBT - Tax Expense = Net Income
  calculatedTotals.netIncome = calculatedTotals.incomeBeforeTax - calculatedTotals.totalTaxExpense;
  calculatedTotals.netMargin =
    calculatedTotals.totalRevenue > 0
      ? (calculatedTotals.netIncome / calculatedTotals.totalRevenue) * 100
      : 0;

  // VAT - Using corrected calculation for Irish driving schools
  const vatPosition = calculateVATPosition(
    aggregatedData,
    calculatedTotals.totalCogs,
    calculatedTotals.totalOperatingExpenses,
    VAT_RATE
  );

  // Key ratios
  calculatedTotals.keyRatios = {
    grossMargin: calculatedTotals.grossMargin,
    netMargin: calculatedTotals.netMargin,
    operatingMargin: calculatedTotals.operatingMargin,
    ebitdaMargin: calculatedTotals.ebitdaMargin,
    costOfRevenueRatio:
      calculatedTotals.totalRevenue > 0
        ? (calculatedTotals.totalCogs / calculatedTotals.totalRevenue) * 100
        : 0,
    operatingExpenseRatio:
      calculatedTotals.totalRevenue > 0
        ? (calculatedTotals.totalOperatingExpenses / calculatedTotals.totalRevenue) * 100
        : 0,
    effectiveTaxRate:
      calculatedTotals.incomeBeforeTax > 0
        ? (calculatedTotals.totalTaxExpense / calculatedTotals.incomeBeforeTax) * 100
        : 0,
    revenuePerInstructor:
      instructors.length > 0 ? calculatedTotals.totalRevenue / instructors.length : 0,
    revenuePerVehicle:
      vehicles.length > 0 ? calculatedTotals.totalRevenue / vehicles.length : 0,
    instructorCommissionRatio:
      calculatedTotals.totalRevenue > 0
        ? ((accountValues["5000"] || 0) / calculatedTotals.totalRevenue) * 100
        : 0,
    vehicleCostRatio:
      calculatedTotals.totalRevenue > 0
        ? (((accountValues["5010"] || 0) +
            (accountValues["5020"] || 0) +
            (accountValues["5030"] || 0) +
            (accountValues["5040"] || 0)) /
            calculatedTotals.totalRevenue) * 100
        : 0,
  };

  return {
    ...calculatedTotals,
    ...vatPosition,
    accountValues,
    accountTransactions,
    rawData: aggregatedData,
    ebit: calculatedTotals.operatingIncome,
    ebt: calculatedTotals.incomeBeforeTax,
    
    // Backward compatibility structures
    income: {
      lessons: accountValues["4000"] || 0,
      packages: accountValues["4010"] || 0,
      exams: accountValues["4020"] || 0,
      theory: accountValues["4030"] || 0,
      other: accountValues["4090"] || 0,
    },
    cogs: {
      instructorCommissions: accountValues["5000"] || 0,
      vehicleOperating: accountValues["5010"] || 0,
      fuel: accountValues["5020"] || 0,
      vehicleInsurance: accountValues["5030"] || 0,
      vehicleMaintenance: accountValues["5040"] || 0,
      roadTax: accountValues["5050"] || 0,
    },
    interest: {
      interestExpense: (accountValues["7000"] || 0) + (accountValues["7010"] || 0),
      interestIncome: accountValues["4500"] || 0,
    },
    otherIncome: {
      interestIncome: accountValues["4500"] || 0,
      rentalIncome: accountValues["4510"] || 0,
      insuranceProceeds: accountValues["4520"] || 0,
      miscIncome: accountValues["4590"] || 0,
    },
    otherExpenses: {
      interestExpense: accountValues["7000"] || 0,
      loanInterest: accountValues["7010"] || 0,
      latePenalties: accountValues["7020"] || 0,
      assetDisposalLoss: accountValues["7030"] || 0,
    },
    taxes: {
      corporationTax: accountValues["8000"] || 0,
      deferredTax: accountValues["8010"] || 0,
    },
    expensesByCategory: {
      personnel: {
        salaries: accountValues["6000"] || 0,
        benefits: accountValues["6010"] || 0,
        employerPrsi: accountValues["6020"] || 0,
        training: accountValues["6030"] || 0,
      },
      facilities: {
        rent: accountValues["6100"] || 0,
        utilities: accountValues["6110"] || 0,
        propertyInsurance: accountValues["6120"] || 0,
        repairs: accountValues["6130"] || 0,
      },
      salesMarketing: {
        marketing: accountValues["6200"] || 0,
        website: accountValues["6210"] || 0,
        promotions: accountValues["6220"] || 0,
      },
      administrative: {
        officeSupplies: accountValues["6300"] || 0,
        software: accountValues["6310"] || 0,
        telecom: accountValues["6320"] || 0,
        postage: accountValues["6330"] || 0,
      },
      professionalServices: {
        professional: accountValues["6400"] || 0,
        accounting: accountValues["6410"] || 0,
        legal: accountValues["6420"] || 0,
        consulting: accountValues["6430"] || 0,
      },
      financial: {
        bankCharges: accountValues["6500"] || 0,
        paymentProcessing: accountValues["6510"] || 0,
        fxLoss: accountValues["6520"] || 0,
      },
      depreciation: {
        vehicleDepreciation: accountValues["6600"] || 0,
        equipmentDepreciation: accountValues["6610"] || 0,
        amortization: accountValues["6620"] || 0,
      },
      otherOperating: {
        badDebt: accountValues["6700"] || 0,
        licenses: accountValues["6710"] || 0,
        miscellaneous: accountValues["6720"] || 0,
        other: 0,
      },
    },
    transactions: {
      income: aggregatedData.payments,
      cogs: aggregatedData.bookings,
      expenses: aggregatedData.expenses,
    },
  };
};

// ============================================
// EXPORT ROWS BUILDER
// ============================================

export const buildExportRows = (currentPeriod, previousPeriod, showComparison, showAccountCodes) => {
  const rows = [];
  const baseIncome = currentPeriod.totalRevenue;

  const addRow = (label, amount, prevAmount, options = {}) => {
    const {
      accountCode = null,
      indent = 0,
      isSection = false,
      isSubsection = false,
      isTotal = false,
      isSubtotal = false,
      isGrandTotal = false,
      isSpacer = false,
      percentBase = baseIncome,
      skipIfZero = false,
    } = options;

    // Skip zero rows if requested, but keep previous period context
    if (skipIfZero && amount === 0 && (!prevAmount || prevAmount === 0)) {
      return;
    }

    rows.push({
      accountCode: showAccountCodes ? accountCode : null,
      label,
      amount: amount || 0,
      previousAmount: prevAmount !== undefined ? prevAmount : null,
      percentOfBase: percentBase > 0 ? ((amount || 0) / percentBase) * 100 : null,
      indent,
      isSection,
      isSubsection,
      isTotal,
      isSubtotal,
      isGrandTotal,
      isSpacer,
    });
  };

  const addSpacer = () => addRow("", 0, 0, { isSpacer: true });

  // REVENUE
  addRow("REVENUE", currentPeriod.totalRevenue, previousPeriod?.totalRevenue, { isSection: true });
  addRow("Driving Lessons", currentPeriod.income.lessons, previousPeriod?.income?.lessons, { accountCode: "4000", indent: 1 });
  addRow("Lesson Packages", currentPeriod.income.packages, previousPeriod?.income?.packages, { accountCode: "4010", indent: 1 });
  addRow("Exam Fees", currentPeriod.income.exams, previousPeriod?.income?.exams, { accountCode: "4020", indent: 1 });
  addRow("Theory Training", currentPeriod.income.theory, previousPeriod?.income?.theory, { accountCode: "4030", indent: 1 });
  addRow("Other Revenue", currentPeriod.income.other, previousPeriod?.income?.other, { accountCode: "4090", indent: 1 });
  addRow("Total Revenue", currentPeriod.totalRevenue, previousPeriod?.totalRevenue, { isTotal: true });

  addSpacer();

  // COST OF REVENUE
  addRow("COST OF REVENUE", currentPeriod.totalCogs, previousPeriod?.totalCogs, { isSection: true });
  addRow("Instructor Commissions", currentPeriod.cogs.instructorCommissions, previousPeriod?.cogs?.instructorCommissions, { accountCode: "5000", indent: 1 });
  addRow("Vehicle Operating Costs", currentPeriod.cogs.vehicleOperating, previousPeriod?.cogs?.vehicleOperating, { accountCode: "5010", indent: 1 });
  addRow("Fuel & Mileage", currentPeriod.cogs.fuel, previousPeriod?.cogs?.fuel, { accountCode: "5020", indent: 1 });
  addRow("Vehicle Insurance", currentPeriod.cogs.vehicleInsurance, previousPeriod?.cogs?.vehicleInsurance, { accountCode: "5030", indent: 1 });
  addRow("Vehicle Maintenance", currentPeriod.cogs.vehicleMaintenance, previousPeriod?.cogs?.vehicleMaintenance, { accountCode: "5040", indent: 1 });
  addRow("Road Tax & Licensing", currentPeriod.cogs.roadTax, previousPeriod?.cogs?.roadTax, { accountCode: "5050", indent: 1 });
  addRow("Total Cost of Revenue", currentPeriod.totalCogs, previousPeriod?.totalCogs, { isTotal: true });

  addSpacer();

  // GROSS PROFIT
  addRow("GROSS PROFIT", currentPeriod.grossProfit, previousPeriod?.grossProfit, { isSubtotal: true });

  addSpacer();

  // OPERATING EXPENSES
  addRow("OPERATING EXPENSES", currentPeriod.totalOperatingExpenses, previousPeriod?.totalOperatingExpenses, { isSection: true });

  // Helper to add expense subsections
  const addExpenseSubsection = (name, total, prevTotal, expenses, prevExpenses, accountCodes) => {
    if (total > 0 || (prevTotal && prevTotal > 0)) {
      addRow(name, total, prevTotal, { isSubsection: true, indent: 1 });
      Object.entries(expenses).forEach(([key, value]) => {
        if (value > 0) {
          const labelMap = {
            salaries: "Salaries & Wages", benefits: "Employee Benefits", employerPrsi: "Employer PRSI", training: "Training & Development",
            rent: "Rent & Lease Payments", utilities: "Utilities", propertyInsurance: "Property Insurance", repairs: "Repairs & Maintenance",
            marketing: "Marketing & Advertising", website: "Website & Online", promotions: "Promotions & Discounts",
            officeSupplies: "Office Supplies", software: "Software & Subscriptions", telecom: "Telephone & Internet", postage: "Postage & Courier",
            professional: "Professional Fees", accounting: "Accounting & Audit", legal: "Legal Fees", consulting: "Consulting Fees",
            bankCharges: "Bank Charges", paymentProcessing: "Payment Processing Fees", fxLoss: "Foreign Exchange Loss",
            vehicleDepreciation: "Depreciation - Vehicles", equipmentDepreciation: "Depreciation - Equipment", amortization: "Amortization - Intangibles",
            badDebt: "Bad Debt Expense", licenses: "Licenses & Permits", miscellaneous: "Miscellaneous", other: "Other Expenses",
          };
          addRow(labelMap[key] || key, value, prevExpenses?.[key], { accountCode: accountCodes[key], indent: 2 });
        }
      });
    }
  };

  addExpenseSubsection("Personnel", currentPeriod.totalPersonnel, previousPeriod?.totalPersonnel, 
    currentPeriod.expensesByCategory.personnel, previousPeriod?.expensesByCategory?.personnel,
    { salaries: "6000", benefits: "6010", employerPrsi: "6020", training: "6030" });

  addExpenseSubsection("Facilities", currentPeriod.totalFacilities, previousPeriod?.totalFacilities,
    currentPeriod.expensesByCategory.facilities, previousPeriod?.expensesByCategory?.facilities,
    { rent: "6100", utilities: "6110", propertyInsurance: "6120", repairs: "6130" });

  addExpenseSubsection("Sales & Marketing", currentPeriod.totalSalesMarketing, previousPeriod?.totalSalesMarketing,
    currentPeriod.expensesByCategory.salesMarketing, previousPeriod?.expensesByCategory?.salesMarketing,
    { marketing: "6200", website: "6210", promotions: "6220" });

  addExpenseSubsection("Administrative", currentPeriod.totalAdministrative, previousPeriod?.totalAdministrative,
    currentPeriod.expensesByCategory.administrative, previousPeriod?.expensesByCategory?.administrative,
    { officeSupplies: "6300", software: "6310", telecom: "6320", postage: "6330" });

  addExpenseSubsection("Professional Services", currentPeriod.totalProfessionalServices, previousPeriod?.totalProfessionalServices,
    currentPeriod.expensesByCategory.professionalServices, previousPeriod?.expensesByCategory?.professionalServices,
    { professional: "6400", accounting: "6410", legal: "6420", consulting: "6430" });

  addExpenseSubsection("Financial", currentPeriod.totalFinancial, previousPeriod?.totalFinancial,
    currentPeriod.expensesByCategory.financial, previousPeriod?.expensesByCategory?.financial,
    { bankCharges: "6500", paymentProcessing: "6510", fxLoss: "6520" });

  addExpenseSubsection("Depreciation & Amortization", currentPeriod.totalDepreciation, previousPeriod?.totalDepreciation,
    currentPeriod.expensesByCategory.depreciation, previousPeriod?.expensesByCategory?.depreciation,
    { vehicleDepreciation: "6600", equipmentDepreciation: "6610", amortization: "6620" });

  addExpenseSubsection("Other Operating", currentPeriod.totalOtherOperating, previousPeriod?.totalOtherOperating,
    currentPeriod.expensesByCategory.otherOperating, previousPeriod?.expensesByCategory?.otherOperating,
    { badDebt: "6700", licenses: "6710", miscellaneous: "6720", other: "6790" });

  addRow("Total Operating Expenses", currentPeriod.totalOperatingExpenses, previousPeriod?.totalOperatingExpenses, { isTotal: true });

  addSpacer();

  // EBITDA (Earnings Before Interest, Tax, Depreciation & Amortization)
  addRow("EBITDA", currentPeriod.ebitda, previousPeriod?.ebitda, { isSubtotal: true });

  addSpacer();

  // DEPRECIATION (always show, even if zero)
  const totalDepreciationOnly = (currentPeriod.expensesByCategory.depreciation.vehicleDepreciation || 0) + 
    (currentPeriod.expensesByCategory.depreciation.equipmentDepreciation || 0);
  const totalPrevDepreciationOnly = (previousPeriod?.expensesByCategory?.depreciation?.vehicleDepreciation || 0) + 
    (previousPeriod?.expensesByCategory?.depreciation?.equipmentDepreciation || 0);
  
  addRow("DEPRECIATION", totalDepreciationOnly, totalPrevDepreciationOnly, { isSection: true });
  addRow("Depreciation - Vehicles", currentPeriod.expensesByCategory.depreciation.vehicleDepreciation || 0, previousPeriod?.expensesByCategory?.depreciation?.vehicleDepreciation || 0, { accountCode: "6600", indent: 1 });
  addRow("Depreciation - Equipment", currentPeriod.expensesByCategory.depreciation.equipmentDepreciation || 0, previousPeriod?.expensesByCategory?.depreciation?.equipmentDepreciation || 0, { accountCode: "6610", indent: 1 });
  addRow("Total Depreciation", totalDepreciationOnly, totalPrevDepreciationOnly, { isTotal: true });

  addSpacer();

  // AMORTIZATION (always show, even if zero)
  const totalAmortization = currentPeriod.expensesByCategory.depreciation.amortization || 0;
  const totalPrevAmortization = previousPeriod?.expensesByCategory?.depreciation?.amortization || 0;
  
  addRow("AMORTIZATION", totalAmortization, totalPrevAmortization, { isSection: true });
  addRow("Amortization - Intangibles", currentPeriod.expensesByCategory.depreciation.amortization || 0, previousPeriod?.expensesByCategory?.depreciation?.amortization || 0, { accountCode: "6620", indent: 1 });
  addRow("Total Amortization", totalAmortization, totalPrevAmortization, { isTotal: true });

  addSpacer();

  // OPERATING INCOME / EBIT
  addRow("OPERATING INCOME (EBIT)", currentPeriod.operatingIncome, previousPeriod?.operatingIncome, { isSubtotal: true });

  addSpacer();

  // OTHER INCOME (always show, even if zero)
  const otherIncomeNonInterest = (currentPeriod.otherIncome?.rentalIncome || 0) + 
    (currentPeriod.otherIncome?.insuranceProceeds || 0) + 
    (currentPeriod.otherIncome?.miscIncome || 0);
  const prevOtherIncomeNonInterest = (previousPeriod?.otherIncome?.rentalIncome || 0) + 
    (previousPeriod?.otherIncome?.insuranceProceeds || 0) + 
    (previousPeriod?.otherIncome?.miscIncome || 0);
  
  addRow("OTHER INCOME", otherIncomeNonInterest, prevOtherIncomeNonInterest, { isSection: true });
  addRow("Rental Income", currentPeriod.otherIncome?.rentalIncome || 0, previousPeriod?.otherIncome?.rentalIncome || 0, { accountCode: "4510", indent: 1 });
  addRow("Insurance Proceeds", currentPeriod.otherIncome?.insuranceProceeds || 0, previousPeriod?.otherIncome?.insuranceProceeds || 0, { accountCode: "4520", indent: 1 });
  addRow("Miscellaneous Income", currentPeriod.otherIncome?.miscIncome || 0, previousPeriod?.otherIncome?.miscIncome || 0, { accountCode: "4590", indent: 1 });
  addRow("Total Other Income", otherIncomeNonInterest, prevOtherIncomeNonInterest, { isTotal: true });

  addSpacer();

  // OTHER EXPENSES (always show, even if zero)
  const otherExpensesNonInterest = (currentPeriod.otherExpenses?.latePenalties || 0) + 
    (currentPeriod.otherExpenses?.assetDisposalLoss || 0);
  const prevOtherExpensesNonInterest = (previousPeriod?.otherExpenses?.latePenalties || 0) + 
    (previousPeriod?.otherExpenses?.assetDisposalLoss || 0);
  
  addRow("OTHER EXPENSES", otherExpensesNonInterest, prevOtherExpensesNonInterest, { isSection: true });
  addRow("Late Payment Penalties", currentPeriod.otherExpenses?.latePenalties || 0, previousPeriod?.otherExpenses?.latePenalties || 0, { accountCode: "7020", indent: 1 });
  addRow("Loss on Asset Disposal", currentPeriod.otherExpenses?.assetDisposalLoss || 0, previousPeriod?.otherExpenses?.assetDisposalLoss || 0, { accountCode: "7030", indent: 1 });
  addRow("Total Other Expenses", otherExpensesNonInterest, prevOtherExpensesNonInterest, { isTotal: true });

  addSpacer();

  // INTEREST (always show, even if zero)
  const totalInterestExpense = currentPeriod.interest?.interestExpense || 0;
  const totalPrevInterestExpense = previousPeriod?.interest?.interestExpense || 0;
  const totalInterestIncome = currentPeriod.interest?.interestIncome || 0;
  const totalPrevInterestIncome = previousPeriod?.interest?.interestIncome || 0;
  
  addRow("INTEREST", currentPeriod.netInterest || 0, previousPeriod?.netInterest || 0, { isSection: true });
  addRow("Interest Expense", totalInterestExpense, totalPrevInterestExpense, { accountCode: "7000", indent: 1 });
  addRow("Interest Income", totalInterestIncome, totalPrevInterestIncome, { accountCode: "4500", indent: 1 });
  addRow("Net Interest", currentPeriod.netInterest || 0, previousPeriod?.netInterest || 0, { isTotal: true });

  addSpacer();

  // INCOME BEFORE TAX (EBT)
  addRow("INCOME BEFORE TAX (EBT)", currentPeriod.incomeBeforeTax, previousPeriod?.incomeBeforeTax, { isSubtotal: true });

  addSpacer();

  // INCOME TAX EXPENSE
  addRow("INCOME TAX EXPENSE", currentPeriod.totalTaxExpense, previousPeriod?.totalTaxExpense, { isSection: true });
  addRow("Corporation Tax", currentPeriod.taxes.corporationTax, previousPeriod?.taxes?.corporationTax, { accountCode: "8000", indent: 1 });
  addRow("Deferred Tax Expense", currentPeriod.taxes.deferredTax, previousPeriod?.taxes?.deferredTax, { accountCode: "8010", indent: 1, skipIfZero: true });
  addRow("Total Income Tax Expense", currentPeriod.totalTaxExpense, previousPeriod?.totalTaxExpense, { isTotal: true });

  addSpacer();

  // NET INCOME
  addRow("NET INCOME", currentPeriod.netIncome, previousPeriod?.netIncome, { isGrandTotal: true });

  return rows;
};

// PDF EXPORT - Using browser print-to-PDF
// ============================================

export const exportToPDF = (rows, config, kpis) => {
  const hasAccountCodes = config.showAccountCodes;
  
  const safeCompanyName = escapeHTML(config.companyName);
  const safeReportTitle = escapeHTML(config.reportTitle);
  const safeDateStart = escapeHTML(format(parseISO(config.dateRange.start), "MMMM d, yyyy"));
  const safeDateEnd = escapeHTML(format(parseISO(config.dateRange.end), "MMMM d, yyyy"));

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeReportTitle}</title>
  <style>
    @page { margin: 0.75in; size: A4 portrait; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Calibri', sans-serif;
      color: #1F2937; font-size: 10px; line-height: 1.4; background: white;
    }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #4F46E5; }
    .company-name { font-size: 22px; font-weight: 700; color: #1F2937; margin-bottom: 6px; }
    .report-title { font-size: 16px; font-weight: 600; color: #4F46E5; margin-bottom: 8px; }
    .date-range { font-size: 12px; color: #374151; margin-bottom: 6px; }
    .meta { font-size: 9px; color: #6B7280; }
    .disclaimer { text-align: center; font-size: 9px; color: #9CA3AF; font-style: italic; margin: 12px 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-card.highlight { background: #EEF2FF; border-color: #C7D2FE; }
    .kpi-label { font-size: 8px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-value { font-size: 15px; font-weight: 700; color: #1F2937; }
    .kpi-value.positive { color: #059669; }
    .kpi-value.negative { color: #DC2626; }
    .kpi-subtext { font-size: 8px; color: #9CA3AF; margin-top: 3px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    thead { background: #4F46E5; }
    thead th { padding: 10px 8px; text-align: left; font-weight: 700; color: white; font-size: 9px; 
      text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #4338CA; }
    thead th.code { width: 50px; text-align: center; }
    thead th.right { text-align: right; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; }
    tbody td.code { font-family: 'Consolas', 'Courier New', monospace; font-size: 8px; color: #6B7280; text-align: center; }
    tbody td.right { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }
    .section { background-color: #E5E7EB; font-weight: 700; color: #1F2937; }
    .section td { border-top: 2px solid #9CA3AF; border-bottom: 2px solid #9CA3AF; padding: 8px; }
    .subsection { background-color: #F3F4F6; font-weight: 600; color: #4B5563; }
    .subsection td { padding: 7px 8px; }
    .total { font-weight: 600; background-color: #F9FAFB; }
    .total td { border-top: 1px solid #D1D5DB; border-bottom: 1px solid #D1D5DB; padding: 7px 8px; }
    .subtotal { font-weight: 700; }
    .subtotal.positive { background-color: #D1FAE5; color: #059669; }
    .subtotal.positive td { border-top: 2px solid #10B981; border-bottom: 2px solid #10B981; padding: 8px; }
    .subtotal.negative { background-color: #FEE2E2; color: #DC2626; }
    .subtotal.negative td { border-top: 2px solid #EF4444; border-bottom: 2px solid #EF4444; padding: 8px; }
    .grand-total { background: #EEF2FF; font-weight: 700; font-size: 11px; }
    .grand-total td { border-top: 3px solid #4F46E5; border-bottom: 3px solid #4F46E5; padding: 10px 8px; }
    .positive { color: #059669; }
    .negative { color: #DC2626; }
    .muted { color: #9CA3AF; }
    .indent-1 { padding-left: 24px !important; }
    .indent-2 { padding-left: 48px !important; }
    .zebra { background-color: #F9FAFB; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; 
      font-size: 8px; color: #9CA3AF; }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="company-name">${safeCompanyName}</h1>
    <h2 class="report-title">${safeReportTitle}</h2>
    <p class="date-range">${safeDateStart} – ${safeDateEnd}</p>
    <p class="meta">Accounting Basis: ${config.accountingBasis === "accrual" ? "Accrual" : "Cash"} | Currency: EUR | Generated: ${escapeHTML(format(config.generatedAt, "MMM d, yyyy h:mm a"))}</p>
  </div>
  
  <p class="disclaimer">UNAUDITED - FOR MANAGEMENT USE ONLY</p>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value positive">${formatCurrencyRaw(kpis.totalRevenue)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gross Profit</div>
      <div class="kpi-value ${kpis.grossProfit >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(kpis.grossProfit)}</div>
      <div class="kpi-subtext">${kpis.grossMargin.toFixed(1)}% margin</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Income</div>
      <div class="kpi-value ${kpis.operatingIncome >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(kpis.operatingIncome)}</div>
      <div class="kpi-subtext">${kpis.operatingMargin.toFixed(1)}% margin</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Net Income</div>
      <div class="kpi-value ${kpis.netIncome >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(kpis.netIncome)}</div>
      <div class="kpi-subtext">${kpis.netMargin.toFixed(1)}% margin</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${hasAccountCodes ? '<th class="code">Code</th>' : ''}
        <th>Account</th>
        <th class="right">Amount</th>
        ${config.showPercentages ? '<th class="right">% Rev</th>' : ''}
        ${config.showComparison ? '<th class="right">Prior</th><th class="right">Change</th><th class="right">Change %</th>' : ''}
      </tr>
    </thead>
    <tbody>`;

  let zebraIndex = 0;
  rows.forEach((row) => {
    if (row.isSpacer) {
      htmlContent += '<tr style="height: 8px;"><td colspan="10"></td></tr>';
      zebraIndex = 0;
      return;
    }

    const isZebra = !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal && row.indent > 0 && zebraIndex % 2 === 1;
    if (row.indent > 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal) {
      zebraIndex++;
    }

    let rowClass = isZebra ? "zebra" : "";
    if (row.isGrandTotal) {
      rowClass = "grand-total";
    } else if (row.isSubtotal) {
      rowClass = row.amount >= 0 ? "subtotal positive" : "subtotal negative";
    } else if (row.isTotal) {
      rowClass = "total";
    } else if (row.isSubsection) {
      rowClass = "subsection";
    } else if (row.isSection) {
      rowClass = "section";
    }

    const indentClass = row.indent === 1 ? "indent-1" : row.indent === 2 ? "indent-2" : "";
    const amountClass = (row.isGrandTotal || row.isSubtotal) ? (row.amount >= 0 ? "positive" : "negative") : "";
    
    const displayAmount = row.amount === 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal ? "—" : formatCurrencyRaw(row.amount);
    
    let displayPercent = "N/A";
    if (row.percentOfBase !== null) {
      displayPercent = row.percentOfBase === 0 ? "—" : `${row.percentOfBase.toFixed(1)}%`;
    }
    
    const safeLabel = escapeHTML(row.label);
    const safeCode = escapeHTML(row.accountCode || "");
    
    htmlContent += `<tr class="${rowClass}">`;
    if (hasAccountCodes) {
      htmlContent += `<td class="code ${indentClass}">${safeCode}</td>`;
    }
    htmlContent += `<td class="${indentClass}">${safeLabel}</td>`;
    htmlContent += `<td class="right ${amountClass}">${displayAmount}</td>`;
    
    if (config.showPercentages) {
      htmlContent += `<td class="right muted">${displayPercent}</td>`;
    }
    
    if (config.showComparison) {
      if (row.previousAmount === undefined || row.previousAmount === null) {
        htmlContent += `<td class="right muted">—</td><td class="right muted">—</td><td class="right muted">—</td>`;
      } else {
        // Prior Period Amount
        const displayPrevious = row.previousAmount === 0 ? "—" : formatCurrencyRaw(row.previousAmount);
        const prevClass = row.previousAmount < 0 ? "negative" : "muted";
        htmlContent += `<td class="right ${prevClass}">${displayPrevious}</td>`;
        
        // Change Amount (Currency)
        const changeAmount = row.amount - row.previousAmount;
        const changeObj = formatChangeAmount(row.amount, row.previousAmount);
        const changeClass = changeObj?.isImprovement ? "positive" : "negative";
        htmlContent += `<td class="right ${changeClass}">${changeObj?.formatted || "—"}</td>`;
        
        // Change % (Percentage)
        if (row.previousAmount !== 0) {
          const changePercentObj = formatChangePercent(row.amount, row.previousAmount);
          const percentClass = changePercentObj?.isImprovement ? "positive" : "negative";
          htmlContent += `<td class="right ${percentClass}">${changePercentObj?.formatted || "N/A"}</td>`;
        } else {
          htmlContent += `<td class="right muted">N/A</td>`;
        }
      }
    }
    
    htmlContent += `</tr>`;
  });

  htmlContent += `
    </tbody>
  </table>
  <div class="footer">
    <p><strong>${safeCompanyName}</strong></p>
    <p>Report ID: PL-${format(config.generatedAt, "yyyyMMddHHmmss")} | Generated by DrivePro</p>
    <p>This report is prepared for internal management purposes and has not been audited.</p>
  </div>
</body>
</html>`;

  // Create iframe for seamless printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
  
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);
  }, 250);
  
  toast.success("Print dialog opened - save as PDF");
};

// ============================================
// EXCEL EXPORT (XML Spreadsheet Format)
// With XSS protection via XML escaping
// ============================================

export const exportToExcel = (rows, config) => {
  const hasAccountCodes = config.showAccountCodes;
  const headers = [];
  if (hasAccountCodes) headers.push("Code");
  headers.push("Account");
  headers.push("Amount");
  if (config.showPercentages) headers.push("% of Revenue");
  if (config.showComparison) {
    headers.push("Previous Period");
    headers.push("Change");
    headers.push("Change %");
  }

  const startDateFormatted = format(parseISO(config.dateRange.start), "MMMM d, yyyy");
  const endDateFormatted = format(parseISO(config.dateRange.end), "MMMM d, yyyy");
  const generatedAtFormatted = format(config.generatedAt, "MMMM d, yyyy 'at' h:mm a");
  const colCount = headers.length;

  // SECURITY: Escape all user-provided content
  const safeCompanyName = escapeXML(config.companyName);
  const safeReportTitle = escapeXML(config.reportTitle);

  let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${safeCompanyName}</Author>
  <LastAuthor>${safeCompanyName}</LastAuthor>
  <Created>${config.generatedAt.toISOString()}</Created>
  <Company>${safeCompanyName}</Company>
  <Version>1.0</Version>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>
  <Style ss:ID="CompanyName">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="ReportTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#4F46E5"/>
  </Style>
  <Style ss:ID="DateRange">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="Metadata">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Italic="1" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Section">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SectionAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="Subsection">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#4B5563"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubsectionAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#4B5563"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="NormalCode">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="NormalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="NormalPercent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#6B7280"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="NormalNA">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#9CA3AF"/>
  </Style>
  <Style ss:ID="Zebra">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ZebraCode">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Consolas" ss:Size="9" ss:Color="#6B7280"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ZebraAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="ZebraPercent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#6B7280"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="TotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="TotalPercent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
  <Style ss:ID="Subtotal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#059669"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#059669"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="SubtotalNegative">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtotalAmountNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="(&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="GrandTotal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="GrandTotalPositive">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#059669"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0"/>
  </Style>
  <Style ss:ID="GrandTotalNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="(&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="ChangeAmountPositive">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="ChangeAmountNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="ChangePositive">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669"/>
   <NumberFormat ss:Format="+0.0%"/>
  </Style>
  <Style ss:ID="ChangeNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626"/>
   <NumberFormat ss:Format="-0.0%"/>
  </Style>
  <Style ss:ID="Footer">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Italic="1" ss:Color="#9CA3AF"/>
  </Style>
  <Style ss:ID="Disclaimer">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="Spacer">
   <Font ss:FontName="Calibri" ss:Size="4"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Profit &amp; Loss">
  <Table ss:DefaultColumnWidth="80" ss:DefaultRowHeight="18">
   ${hasAccountCodes ? '<Column ss:Width="60"/>' : ''}
   <Column ss:Width="220"/>
   <Column ss:Width="110"/>
   ${config.showPercentages ? '<Column ss:Width="90"/>' : ''}
   ${config.showComparison ? '<Column ss:Width="110"/><Column ss:Width="90"/><Column ss:Width="80"/>' : ''}
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="CompanyName">
     <Data ss:Type="String">${safeCompanyName}</Data>
    </Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="ReportTitle">
     <Data ss:Type="String">${safeReportTitle}</Data>
    </Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="DateRange">
     <Data ss:Type="String">${escapeXML(startDateFormatted)} - ${escapeXML(endDateFormatted)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Metadata">
     <Data ss:Type="String">Accounting Basis: ${config.accountingBasis === "accrual" ? "Accrual" : "Cash"} | Currency: EUR | Prepared for Management</Data>
    </Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Disclaimer">
     <Data ss:Type="String">UNAUDITED - FOR MANAGEMENT USE ONLY</Data>
    </Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="24">
    ${hasAccountCodes ? '<Cell ss:StyleID="Header"><Data ss:Type="String">Code</Data></Cell>' : ''}
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Account</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
    ${config.showPercentages ? '<Cell ss:StyleID="Header"><Data ss:Type="String">% of Revenue</Data></Cell>' : ''}
    ${config.showComparison ? '<Cell ss:StyleID="Header"><Data ss:Type="String">Prior Period</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change %</Data></Cell>' : ''}
   </Row>`;

  let zebraIndex = 0;
  rows.forEach((row) => {
    if (row.isSpacer) {
      xmlContent += `\n   <Row ss:Height="6"><Cell ss:StyleID="Spacer"/></Row>`;
      zebraIndex = 0;
      return;
    }

    const isZebra = !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal && row.indent > 0 && zebraIndex % 2 === 1;
    if (row.indent > 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal) {
      zebraIndex++;
    }

    let rowHeight = 20;
    let labelStyle = isZebra ? "Zebra" : "Normal";
    let codeStyle = isZebra ? "ZebraCode" : "NormalCode";
    let amountStyle = isZebra ? "ZebraAmount" : "NormalAmount";
    let percentStyle = isZebra ? "ZebraPercent" : "NormalPercent";

    if (row.isSection) {
      labelStyle = "Section";
      amountStyle = "SectionAmount";
      percentStyle = "SectionAmount";
      rowHeight = 24;
      zebraIndex = 0;
    } else if (row.isSubsection) {
      labelStyle = "Subsection";
      amountStyle = "SubsectionAmount";
      percentStyle = "SubsectionAmount";
      rowHeight = 22;
    } else if (row.isTotal) {
      labelStyle = "Total";
      amountStyle = "TotalAmount";
      percentStyle = "TotalPercent";
      rowHeight = 22;
    } else if (row.isSubtotal) {
      const isNegative = row.amount < 0;
      labelStyle = isNegative ? "SubtotalNegative" : "Subtotal";
      amountStyle = isNegative ? "SubtotalAmountNegative" : "SubtotalAmount";
      percentStyle = "SubtotalAmount";
      rowHeight = 26;
    } else if (row.isGrandTotal) {
      labelStyle = "GrandTotal";
      amountStyle = row.amount >= 0 ? "GrandTotalPositive" : "GrandTotalNegative";
      percentStyle = "GrandTotal";
      rowHeight = 30;
    }

    const indentSpaces = "   ".repeat(row.indent);
    const displayLabel = row.indent > 0 && !row.isSection && !row.isSubsection ? indentSpaces + row.label : row.label;

    // SECURITY: Escape all label content
    const safeLabel = escapeXML(displayLabel);
    const safeCode = escapeXML(row.accountCode || "");

    xmlContent += `\n   <Row ss:Height="${rowHeight}">`;
    
    if (hasAccountCodes) {
      xmlContent += `\n    <Cell ss:StyleID="${codeStyle}"><Data ss:Type="String">${safeCode}</Data></Cell>`;
    }
    
    xmlContent += `\n    <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${safeLabel}</Data></Cell>`;
    
    if (row.amount === 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isSubtotal && !row.isGrandTotal) {
      xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
    } else {
      xmlContent += `\n    <Cell ss:StyleID="${amountStyle}"><Data ss:Type="Number">${row.amount}</Data></Cell>`;
    }
    
    if (config.showPercentages) {
      if (row.percentOfBase === null) {
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">N/A</Data></Cell>`;
      } else if (row.percentOfBase === 0) {
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
      } else {
        xmlContent += `\n    <Cell ss:StyleID="${percentStyle}"><Data ss:Type="Number">${row.percentOfBase / 100}</Data></Cell>`;
      }
    }
    
    if (config.showComparison) {
      if (row.previousAmount === undefined || row.previousAmount === null) {
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
      } else {
        // Prior Period Amount
        const prevAmountStyle = row.previousAmount < 0 ? 'NormalAmount' : amountStyle;
        xmlContent += `\n    <Cell ss:StyleID="${prevAmountStyle}"><Data ss:Type="Number">${row.previousAmount}</Data></Cell>`;
        
        // Change Amount (Currency)
        const changeAmount = row.amount - row.previousAmount;
        const changeObj = formatChangeAmount(row.amount, row.previousAmount);
        const changeAmountStyle = changeObj?.isImprovement ? 'ChangeAmountPositive' : 'ChangeAmountNegative';
        xmlContent += `\n    <Cell ss:StyleID="${changeAmountStyle}"><Data ss:Type="Number">${changeAmount}</Data></Cell>`;
        
        // Change % (Percentage)
        if (row.previousAmount !== 0) {
          const changePercent = ((row.amount - row.previousAmount) / Math.abs(row.previousAmount));
          const changePercentObj = formatChangePercent(row.amount, row.previousAmount);
          const changePercentStyle = changePercentObj?.isImprovement ? "ChangePositive" : "ChangeNegative";
          xmlContent += `\n    <Cell ss:StyleID="${changePercentStyle}"><Data ss:Type="Number">${changePercent}</Data></Cell>`;
        } else {
          xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">N/A</Data></Cell>`;
        }
      }
    }
    
    xmlContent += `\n   </Row>`;
  });

  xmlContent += `
   <Row ss:Height="8"/>
   <Row ss:Height="14">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Footer">
     <Data ss:Type="String">Generated on ${escapeXML(generatedAtFormatted)} | Report ID: PL-${format(config.generatedAt, "yyyyMMddHHmmss")}</Data>
    </Cell>
   </Row>
   <Row ss:Height="12">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Disclaimer">
     <Data ss:Type="String">This report is prepared for internal management purposes and has not been audited.</Data>
    </Cell>
   </Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Layout x:Orientation="Portrait"/>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.75" x:Left="0.5" x:Right="0.5" x:Top="0.75"/>
   </PageSetup>
   <FitToPage/>
   <Print>
    <ValidPrinterInfo/>
    <HorizontalResolution>600</HorizontalResolution>
    <VerticalResolution>600</VerticalResolution>
   </Print>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>7</SplitHorizontal>
   <TopRowBottomPane>7</TopRowBottomPane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const fileName = generateFileName(config.reportTitle, "xls", config.dateRange);
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
// CSV EXPORT
// With proper escaping for CSV format
// ============================================

export const exportToCSV = (rows, config) => {
  const csvRows = [];
  const hasAccountCodes = config.showAccountCodes;

  // Helper to escape CSV values
  const escapeCSV = (value) => {
    const str = String(value === null || value === undefined ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Header rows
  csvRows.push([escapeCSV(config.companyName)]);
  csvRows.push([escapeCSV(config.reportTitle)]);
  csvRows.push([`Period: ${format(parseISO(config.dateRange.start), "yyyy-MM-dd")} to ${format(parseISO(config.dateRange.end), "yyyy-MM-dd")}`]);
  csvRows.push([`Accounting Basis: ${config.accountingBasis === "accrual" ? "Accrual" : "Cash"}`]);
  csvRows.push([`Currency: EUR`]);
  csvRows.push([`Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
  csvRows.push(["UNAUDITED - FOR MANAGEMENT USE ONLY"]);
  csvRows.push([]);

  // Column headers
  const headers = [];
  if (hasAccountCodes) headers.push("Account Code");
  headers.push("Account Name");
  headers.push("Amount (EUR)");
  if (config.showPercentages) headers.push("% of Revenue");
  if (config.showComparison) {
    headers.push("Prior Period (EUR)");
    headers.push("Change (EUR)");
    headers.push("Change %");
  }
  csvRows.push(headers.map(h => escapeCSV(h)));

  // Data rows
  rows.forEach((row) => {
    if (row.isSpacer) return;

    const csvRow = [];
    if (hasAccountCodes) csvRow.push(escapeCSV(row.accountCode || ""));
    
    const indent = "  ".repeat(row.indent);
    csvRow.push(escapeCSV(indent + row.label));
    csvRow.push(row.amount.toFixed(2));

    if (config.showPercentages) {
      csvRow.push(row.percentOfBase !== null ? row.percentOfBase.toFixed(2) : "N/A");
    }

    if (config.showComparison) {
      if (row.previousAmount !== undefined && row.previousAmount !== null) {
        // Prior Period
        csvRow.push(row.previousAmount.toFixed(2));
        
        // Change Amount (as currency value)
        const changeAmount = row.amount - row.previousAmount;
        csvRow.push(changeAmount.toFixed(2));
        
        // Change % (as percentage)
        if (row.previousAmount !== 0) {
          const changePercent = ((row.amount - row.previousAmount) / Math.abs(row.previousAmount)) * 100;
          csvRow.push(`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
        } else {
          csvRow.push("N/A");
        }
      } else {
        csvRow.push("");
        csvRow.push("");
        csvRow.push("");
      }
    }

    csvRows.push(csvRow);
  });

  // Footer
  csvRows.push([]);
  csvRows.push(["---"]);
  csvRows.push([`Report ID: PL-${format(config.generatedAt, "yyyyMMddHHmmss")}`]);
  csvRows.push(["This report is prepared for internal management purposes and has not been audited."]);

  // Build CSV content with proper line endings
  const csvContent = csvRows
    .map((row) => row.join(","))
    .join("\r\n");

  // Add BOM for Excel compatibility with UTF-8
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName(config.reportTitle, "csv", config.dateRange);
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
// KPI CARD COMPONENT
// ============================================

export const KPICard = memo(({ 
  label, 
  value, 
  previousValue, 
  icon, 
  color, 
  subtext,
  isPositiveGood = true 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {previousValue != null && previousValue !== 0 && (
          <ChangeIndicator current={value} previous={previousValue} isPositiveGood={isPositiveGood} />
        )}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${value < 0 ? 'text-[#e44138]' : 'text-zinc-900'}`}>
        {formatCurrency(value)}
      </div>
      {subtext && <div className="text-xs text-zinc-400 mt-1">{subtext}</div>}
    </motion.div>
  );
});

KPICard.displayName = 'KPICard';

// ============================================
// CHANGE INDICATOR COMPONENT
// ============================================

export const ChangeIndicator = memo(({ current, previous, isPositiveGood = true }) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return <span className="text-xs text-zinc-400">N/A</span>;
  
  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  
  // If both values are negative, improvement means moving toward zero (less negative)
  const isImprovement = previous < 0 && current < 0 
    ? current > previous
    : change > 0;
  
  const changeIsGood = isPositiveGood ? isImprovement : !isImprovement;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      changeIsGood ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-[#fdeeed] text-[#e44138]"
    }`}>
      {isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
    </div>
  );
});

ChangeIndicator.displayName = 'ChangeIndicator';

// ============================================
// ACCOUNT ROW COMPONENT
// ============================================

export const AccountRow = memo(({
  label,
  amount,
  prevAmount,
  accountCode,
  indent = 0,
  onClick,
  isClickable = true,
  showAccountCodes,
  showPercentages,
  showComparison,
  baseRevenue,
  colCount,
}) => {
  const displayAmount = amount === 0 ? "—" : formatCurrency(amount);
  const displayPercent = baseRevenue > 0 && amount !== 0 
    ? formatPercent(amount, baseRevenue) 
    : "N/A";
  
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;

  return (
    <tr
      className={`border-b border-zinc-50 transition-colors ${
        onClick && isClickable ? "cursor-pointer hover:bg-zinc-50 group" : ""
      }`}
      onClick={onClick}
    >
      {showAccountCodes && (
        <td className="py-2.5 px-3 text-center font-mono text-xs text-zinc-400 w-16">
          {accountCode || ""}
        </td>
      )}
      <td
        className="py-2.5 px-4 text-sm text-zinc-700"
        style={{ paddingLeft: `${16 + indent * 20}px` }}
      >
        <div className="flex items-center gap-2">
          {label}
          {onClick && isClickable && (
            <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
          )}
        </div>
      </td>
      <td className={`py-2.5 px-4 text-right font-mono text-sm ${amount < 0 ? 'text-red-600' : 'text-zinc-700'}`}>
        {displayAmount}
      </td>
      {showPercentages && (
        <td className="py-2.5 px-4 text-right text-xs text-zinc-400 font-mono">
          {displayPercent}
        </td>
      )}
      {showComparison && (
        <>
          <td className={`py-2.5 px-4 text-right font-mono text-sm ${prevAmount != null && prevAmount < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {prevAmount != null ? formatCurrency(prevAmount) : "—"}
          </td>
          <td className={`py-2.5 px-4 text-right font-mono text-sm ${changeAmount?.colorClass || 'text-zinc-400'}`}>
            {changeAmount?.formatted || "—"}
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

AccountRow.displayName = 'AccountRow';

// ============================================
// SECTION HEADER COMPONENT
// ============================================

export const SectionHeader = memo(({
  label,
  total,
  prevTotal,
  sectionKey,
  icon: Icon,
  isExpanded,
  onToggle,
  showAccountCodes,
  showPercentages,
  showComparison,
  baseRevenue,
  colCount,
}) => {
  const changeAmount = prevTotal != null ? formatChangeAmount(total, prevTotal) : null;
  const changePercent = prevTotal != null ? formatChangePercent(total, prevTotal) : null;

  return (
    <tr
      className="bg-zinc-100 cursor-pointer hover:bg-zinc-200 transition-colors"
      onClick={() => onToggle(sectionKey)}
    >
      {showAccountCodes && <td className="py-3 px-3 w-16"></td>}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
          {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
          <span className="font-bold text-sm text-zinc-800 uppercase tracking-wide">{label}</span>
        </div>
      </td>
      <td className={`py-3 px-4 text-right font-bold font-mono text-sm ${total < 0 ? 'text-red-600' : 'text-zinc-800'}`}>
        {formatCurrency(total)}
      </td>
      {showPercentages && (
        <td className="py-3 px-4 text-right text-xs text-zinc-400 font-mono">
          {baseRevenue > 0 ? formatPercent(total, baseRevenue) : "N/A"}
        </td>
      )}
      {showComparison && (
        <>
          <td className={`py-3 px-4 text-right font-mono text-sm ${prevTotal != null && prevTotal < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {prevTotal != null ? formatCurrency(prevTotal) : "—"}
          </td>
          <td className={`py-3 px-4 text-right font-mono text-sm ${changeAmount?.colorClass || 'text-zinc-400'}`}>
            {changeAmount?.formatted || "—"}
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

SectionHeader.displayName = 'SectionHeader';

// ============================================
// TOTAL ROW COMPONENT
// ============================================

export const TotalRow = memo(({
  label,
  amount,
  prevAmount,
  isGrandTotal = false,
  isSubtotal = false,
  showAccountCodes,
  showPercentages,
  showComparison,
  baseRevenue,
  colCount,
}) => {
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;
  
  let rowClass = "border-t border-zinc-200";
  let amountClass = amount < 0 ? "text-red-600" : "text-zinc-800";
  let bgClass = "";
  
  if (isGrandTotal) {
    rowClass = "bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border-t-2 border-[#d4eaf5]";
    amountClass = amount >= 0 ? "text-[#5cb83a]" : "text-[#e44138]";
  } else if (isSubtotal) {
    if (amount >= 0) {
      bgClass = "bg-[#eefbe7]";
      rowClass = "border-t-2 border-[#d4f4c3]";
      amountClass = "text-[#5cb83a]";
    } else {
      bgClass = "bg-[#fdeeed]";
      rowClass = "border-t-2 border-[#f9d4d2]";
      amountClass = "text-[#e44138]";
    }
  }

  return (
    <tr className={`${rowClass} ${bgClass}`}>
      {showAccountCodes && <td className="py-3 px-3 w-16"></td>}
      <td className={`py-3 px-4 font-bold ${isGrandTotal ? "text-base" : "text-sm"} text-zinc-900`}>
        {label}
      </td>
      <td className={`py-3 px-4 text-right font-bold ${isGrandTotal ? "text-base" : "text-sm"} font-mono ${amountClass}`}>
        {formatCurrency(amount)}
      </td>
      {showPercentages && (
        <td className="py-3 px-4 text-right text-xs text-zinc-400 font-mono">
          {baseRevenue > 0 ? formatPercent(amount, baseRevenue) : "N/A"}
        </td>
      )}
      {showComparison && (
        <>
          <td className={`py-3 px-4 text-right font-mono text-sm ${prevAmount != null && prevAmount < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
            {prevAmount != null ? formatCurrency(prevAmount) : "—"}
          </td>
          <td className={`py-3 px-4 text-right font-mono text-sm font-semibold ${changeAmount?.colorClass || 'text-zinc-400'}`}>
            {changeAmount?.formatted || "—"}
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

TotalRow.displayName = 'TotalRow';

// ============================================
// YTD SUMMARY PANEL
// ============================================

export const YTDSummaryPanel = memo(({ ytdData, monthlyTrends }) => {
  if (!ytdData) return null;
  
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-indigo-600" />
        Year-to-Date Summary
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-[#eefbe7] rounded-xl">
          <div className="text-xs text-[#5cb83a] mb-1">YTD Revenue</div>
          <div className="text-xl font-bold text-[#4a9c2e]">{formatCurrency(ytdData.totalRevenue)}</div>
        </div>
        <div className="p-4 bg-[#e8f4fa] rounded-xl">
          <div className="text-xs text-[#3b82c4] mb-1">YTD Gross Profit</div>
          <div className="text-xl font-bold text-[#2563a3]">{formatCurrency(ytdData.grossProfit)}</div>
          <div className="text-xs text-[#3b82c4]">{ytdData.grossMargin.toFixed(1)}% margin</div>
        </div>
        <div className="p-4 bg-[#f3e8f4] rounded-xl">
          <div className="text-xs text-[#6c376f] mb-1">YTD Operating Income</div>
          <div className="text-xl font-bold text-[#5a2d5d]">{formatCurrency(ytdData.operatingIncome)}</div>
        </div>
        <div className={`p-4 rounded-xl ${ytdData.netIncome >= 0 ? "bg-[#e8f4fa]" : "bg-[#fdeeed]"}`}>
          <div className={`text-xs mb-1 ${ytdData.netIncome >= 0 ? "text-[#3b82c4]" : "text-[#e44138]"}`}>
            YTD Net Income
          </div>
          <div className={`text-xl font-bold ${ytdData.netIncome >= 0 ? "text-[#2563a3]" : "text-[#c9342c]"}`}>
            {formatCurrency(ytdData.netIncome)}
          </div>
        </div>
      </div>
      
      {monthlyTrends && monthlyTrends.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-zinc-700 mb-3">Monthly Trend</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="py-2 px-3 text-left text-xs text-zinc-500">Month</th>
                  <th className="py-2 px-3 text-right text-xs text-zinc-500">Revenue</th>
                  <th className="py-2 px-3 text-right text-xs text-zinc-500">Gross Profit</th>
                  <th className="py-2 px-3 text-right text-xs text-zinc-500">Net Income</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((month, index) => (
                  <tr key={month.month} className={index % 2 === 0 ? "bg-zinc-50" : ""}>
                    <td className="py-2 px-3 font-medium text-zinc-700">{month.label}</td>
                    <td className="py-2 px-3 text-right font-mono text-zinc-600">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-zinc-600">
                      {formatCurrency(month.grossProfit)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${
                      month.netIncome >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {formatCurrency(month.netIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

YTDSummaryPanel.displayName = 'YTDSummaryPanel';

// ============================================
// KEY RATIOS PANEL
// ============================================

export const KeyRatiosPanel = memo(({ ratios, previousRatios }) => {
  if (!ratios) return null;

  const ratioItems = [
    { label: "Gross Margin", value: ratios.grossMargin, prev: previousRatios?.grossMargin, suffix: "%", isPositiveGood: true },
    { label: "Operating Margin", value: ratios.operatingMargin, prev: previousRatios?.operatingMargin, suffix: "%", isPositiveGood: true },
    { label: "Net Margin", value: ratios.netMargin, prev: previousRatios?.netMargin, suffix: "%", isPositiveGood: true },
    { label: "EBITDA Margin", value: ratios.ebitdaMargin, prev: previousRatios?.ebitdaMargin, suffix: "%", isPositiveGood: true },
    { label: "Cost of Revenue %", value: ratios.costOfRevenueRatio, prev: previousRatios?.costOfRevenueRatio, suffix: "%", isPositiveGood: false },
    { label: "Operating Expense %", value: ratios.operatingExpenseRatio, prev: previousRatios?.operatingExpenseRatio, suffix: "%", isPositiveGood: false },
    { label: "Effective Tax Rate", value: ratios.effectiveTaxRate, prev: previousRatios?.effectiveTaxRate, suffix: "%", isPositiveGood: false },
    { label: "Instructor Commission %", value: ratios.instructorCommissionRatio, prev: previousRatios?.instructorCommissionRatio, suffix: "%", isPositiveGood: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-indigo-600" />
        Key Financial Ratios
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {ratioItems.map((item) => {
          return (
            <div key={item.label} className="p-3 bg-zinc-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-500">{item.label}</span>
                {item.prev != null && (
                  <ChangeIndicator current={item.value} previous={item.prev} isPositiveGood={item.isPositiveGood} />
                )}
              </div>
              <div className="text-lg font-bold text-zinc-800">
                {item.value.toFixed(1)}{item.suffix}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

KeyRatiosPanel.displayName = 'KeyRatiosPanel';

// ============================================
// VAT SUMMARY PANEL (Corrected for Irish driving schools)
// ============================================

export const VATSummaryPanel = memo(({ 
  exemptRevenue,
  zeroRatedRevenue,
  standardRatedRevenue,
  outputVAT,
  inputVAT,
  recoverableVAT,
  irrecoverableVAT,
  netVATPayable,
  // Legacy props for backward compatibility
  vatCollected,
  vatPaid,
  netVATDue,
}) => {
  // Use new props if available, fallback to legacy
  const displayOutputVAT = outputVAT ?? vatCollected ?? 0;
  const displayInputVAT = inputVAT ?? vatPaid ?? 0;
  const displayNetVAT = netVATPayable ?? netVATDue ?? 0;
  
  const hasDetailedBreakdown = exemptRevenue != null;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        VAT Position Summary
      </h3>
      
      {hasDetailedBreakdown && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Driver training services are VAT-exempt in Ireland. 
            Only ancillary supplies (merchandise, vehicle sales) are subject to VAT.
          </p>
        </div>
      )}
      
      {hasDetailedBreakdown && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold text-zinc-700">Revenue by VAT Treatment</h4>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-zinc-50 rounded">
              <div className="text-xs text-zinc-500">Exempt</div>
              <div className="font-mono font-semibold">{formatCurrency(exemptRevenue)}</div>
            </div>
            <div className="p-2 bg-zinc-50 rounded">
              <div className="text-xs text-zinc-500">Zero-Rated</div>
              <div className="font-mono font-semibold">{formatCurrency(zeroRatedRevenue)}</div>
            </div>
            <div className="p-2 bg-zinc-50 rounded">
              <div className="text-xs text-zinc-500">Standard Rate</div>
              <div className="font-mono font-semibold">{formatCurrency(standardRatedRevenue)}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-zinc-100">
          <span className="text-sm text-zinc-600">Output VAT (Collected)</span>
          <span className="font-mono font-semibold text-zinc-800">{formatCurrency(displayOutputVAT)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-zinc-100">
          <span className="text-sm text-zinc-600">Input VAT (On Purchases)</span>
          <span className="font-mono font-semibold text-zinc-800">{formatCurrency(displayInputVAT)}</span>
        </div>
        
        {hasDetailedBreakdown && (
          <>
            <div className="flex justify-between items-center py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-600">Recoverable VAT</span>
              <span className="font-mono font-semibold text-emerald-600">{formatCurrency(recoverableVAT)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-100">
              <span className="text-sm text-zinc-600">Irrecoverable VAT (Cost)</span>
              <span className="font-mono font-semibold text-red-600">{formatCurrency(irrecoverableVAT)}</span>
            </div>
          </>
        )}
        
        <div className={`flex justify-between items-center py-3 rounded-lg px-3 ${
          displayNetVAT >= 0 ? "bg-red-50" : "bg-emerald-50"
        }`}>
          <span className={`text-sm font-semibold ${displayNetVAT >= 0 ? "text-red-700" : "text-emerald-700"}`}>
            {displayNetVAT >= 0 ? "VAT Payable to Revenue" : "VAT Refund Due"}
          </span>
          <span className={`font-mono font-bold ${displayNetVAT >= 0 ? "text-red-700" : "text-emerald-700"}`}>
            {formatCurrency(Math.abs(displayNetVAT))}
          </span>
        </div>
      </div>
    </div>
  );
});

VATSummaryPanel.displayName = 'VATSummaryPanel';

// ============================================
// SEGMENT ANALYSIS PANEL
// ============================================

export const SegmentAnalysisPanel = memo(({ segmentData, segmentBy }) => {
  if (!segmentData || segmentData.length === 0) return null;

  const totalRevenue = segmentData.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4">
        Segment Analysis by {segmentBy === "instructor" ? "Instructor" : "Vehicle"}
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="py-2 px-3 text-left text-xs text-zinc-500">
                {segmentBy === "instructor" ? "Instructor" : "Vehicle"}
              </th>
              <th className="py-2 px-3 text-right text-xs text-zinc-500">Revenue</th>
              <th className="py-2 px-3 text-right text-xs text-zinc-500">% Share</th>
              <th className="py-2 px-3 text-right text-xs text-zinc-500">Expenses</th>
              <th className="py-2 px-3 text-right text-xs text-zinc-500">Net Contribution</th>
              <th className="py-2 px-3 text-right text-xs text-zinc-500">Margin</th>
            </tr>
          </thead>
          <tbody>
            {segmentData.map((segment, index) => (
              <tr key={segment.id} className={index % 2 === 0 ? "bg-zinc-50" : ""}>
                <td className="py-2 px-3 font-medium text-zinc-700">{segment.name}</td>
                <td className="py-2 px-3 text-right font-mono text-zinc-600">
                  {formatCurrency(segment.revenue)}
                </td>
                <td className="py-2 px-3 text-right text-zinc-500">
                  {totalRevenue > 0 ? ((segment.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                </td>
                <td className="py-2 px-3 text-right font-mono text-zinc-600">
                  {formatCurrency(segment.expenses)}
                </td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${
                  segment.netContribution >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                  {formatCurrency(segment.netContribution)}
                </td>
                <td className={`py-2 px-3 text-right ${
                  segment.margin >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                  {segment.margin.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-300 font-semibold">
              <td className="py-2 px-3 text-zinc-800">Total</td>
              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                {formatCurrency(totalRevenue)}
              </td>
              <td className="py-2 px-3 text-right text-zinc-500">100%</td>
              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                {formatCurrency(segmentData.reduce((sum, s) => sum + s.expenses, 0))}
              </td>
              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                {formatCurrency(segmentData.reduce((sum, s) => sum + s.netContribution, 0))}
              </td>
              <td className="py-2 px-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

SegmentAnalysisPanel.displayName = 'SegmentAnalysisPanel';

// ============================================
// NOTES SECTION
// ============================================

export const NotesSection = memo(({ config, currentPeriod, previousPeriod }) => {
  const notes = [];
  
  // Accounting basis note
  notes.push({
    title: "Accounting Basis",
    content: config.accountingBasis === "accrual" 
      ? "This report is prepared on an accrual basis. Revenue is recognized when lessons are delivered, and expenses are recognized when incurred."
      : "This report is prepared on a cash basis. Revenue is recognized when payment is received, and expenses are recognized when paid.",
  });
  
  // Depreciation note
  notes.push({
    title: "Depreciation Method",
    content: `Fixed assets are depreciated using the ${config.depreciationMethod?.replace(/_/g, ' ') || 'straight-line'} method over their estimated useful lives.`,
  });
  
  // Instructor commission note
  if (currentPeriod.cogs?.instructorCommissions > 0) {
    notes.push({
      title: "Instructor Commissions",
      content: "Instructor commissions are calculated based on individual instructor rates applied to completed lessons. The average commission rate for this period is calculated from actual bookings.",
    });
  }
  
  // VAT note for Irish businesses
  notes.push({
    title: "VAT Treatment",
    content: "Driver training services are exempt from VAT in Ireland under Section 13(1)(k) of the VAT Act. Consequently, input VAT on purchases related to exempt activities cannot be reclaimed. Only ancillary taxable supplies (if any) are subject to standard rate VAT.",
  });
  
  // Significant changes note
  if (previousPeriod) {
    const revenueChange = ((currentPeriod.totalRevenue - previousPeriod.totalRevenue) / previousPeriod.totalRevenue) * 100;
    const expenseChange = ((currentPeriod.totalOperatingExpenses - previousPeriod.totalOperatingExpenses) / previousPeriod.totalOperatingExpenses) * 100;
    
    if (Math.abs(revenueChange) > 20 || Math.abs(expenseChange) > 20) {
      notes.push({
        title: "Significant Variances",
        content: `${Math.abs(revenueChange) > 20 ? `Revenue ${revenueChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(1)}% compared to the prior period. ` : ''}${Math.abs(expenseChange) > 20 ? `Operating expenses ${expenseChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(expenseChange).toFixed(1)}% compared to the prior period.` : ''}`,
      });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Info className="w-5 h-5 text-indigo-600" />
        Notes to Financial Statements
      </h3>
      
      <div className="space-y-4">
        {notes.map((note, index) => (
          <div key={index} className="border-l-2 border-indigo-200 pl-4">
            <h4 className="font-semibold text-zinc-800 text-sm mb-1">{index + 1}. {note.title}</h4>
            <p className="text-sm text-zinc-600">{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

NotesSection.displayName = 'NotesSection';

// ============================================
// DRILLDOWN PANEL
// ============================================

export const DrilldownPanel = memo(({ isOpen, onClose, section, label, accountCode, transactions }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900">{label}</h3>
              <p className="text-sm text-zinc-500">
                {section} • Account {accountCode} • {transactions.length} transactions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full">
              <thead className="bg-zinc-50 sticky top-0">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Description</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Reference</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, index) => (
                  <tr key={txn.id || index} className={index % 2 === 0 ? "" : "bg-zinc-50"}>
                    <td className="py-3 px-4 text-sm text-zinc-600">
                      {format(parseISO(txn.payment_date || txn.expense_date || txn.start_datetime || txn.created_date), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-800">
                      {txn.description || txn.payment_type || txn.category || txn.lesson_type || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-500 font-mono">
                      {txn.reference || txn.id?.substring(0, 8) || "—"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-zinc-800">
                      {formatCurrency(txn.amount || txn.price || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-300">
                  <td colSpan="3" className="py-3 px-4 font-bold text-zinc-800">Total</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-800">
                    {formatCurrency(transactions.reduce((sum, t) => sum + (t.amount || t.price || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

DrilldownPanel.displayName = 'DrilldownPanel';

// ============================================
// STRUCTURE EDITOR MODAL
// ============================================

export const StructureEditorModal = ({ isOpen, onClose, structure, onSave }) => {
  const [editingStructure, setEditingStructure] = useState(null);
  const [activeSection, setActiveSection] = useState("revenue");

  // Initialize editing structure when modal opens
  React.useEffect(() => {
    if (isOpen && structure) {
      // Deep clone the structure
      setEditingStructure(JSON.parse(JSON.stringify(structure)));
    }
  }, [isOpen, structure]);

  const handleSave = () => {
    if (editingStructure) {
      onSave(editingStructure);
      onClose();
    }
  };

  const handleReset = () => {
    setEditingStructure(JSON.parse(JSON.stringify(DEFAULT_PL_STRUCTURE)));
  };

  const updateAccount = (sectionId, accountId, updates, subsectionId = null) => {
    setEditingStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const section = newStructure[sectionId];
      
      if (subsectionId && section.subsections) {
        const subsection = section.subsections.find(s => s.id === subsectionId);
        if (subsection) {
          const account = subsection.accounts.find(a => a.id === accountId);
          if (account) Object.assign(account, updates);
        }
      } else if (section.accounts) {
        const account = section.accounts.find(a => a.id === accountId);
        if (account) Object.assign(account, updates);
      }
      
      return newStructure;
    });
  };

  const addAccount = (sectionId, subsectionId = null) => {
    const newAccount = {
      id: generateId(),
      code: "",
      name: "New Account",
      visible: true,
      order: 999,
      dataSource: {
        type: DATA_SOURCE_TYPES.EXPENSE,
        config: { categories: [] },
      },
    };

    setEditingStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const section = newStructure[sectionId];
      
      if (subsectionId && section.subsections) {
        const subsection = section.subsections.find(s => s.id === subsectionId);
        if (subsection) {
          subsection.accounts.push(newAccount);
        }
      } else if (section.accounts) {
        section.accounts.push(newAccount);
      }
      
      return newStructure;
    });
  };

  const removeAccount = (sectionId, accountId, subsectionId = null) => {
    setEditingStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const section = newStructure[sectionId];
      
      if (subsectionId && section.subsections) {
        const subsection = section.subsections.find(s => s.id === subsectionId);
        if (subsection) {
          subsection.accounts = subsection.accounts.filter(a => a.id !== accountId);
        }
      } else if (section.accounts) {
        section.accounts = section.accounts.filter(a => a.id !== accountId);
      }
      
      return newStructure;
    });
  };

  if (!isOpen || !editingStructure) return null;

  const sections = [
    { id: "revenue", label: "Revenue" },
    { id: "cogs", label: "Cost of Revenue" },
    { id: "operatingExpenses", label: "Operating Expenses" },
    { id: "otherIncome", label: "Other Income" },
    { id: "otherExpenses", label: "Other Expenses" },
    { id: "taxes", label: "Taxes" },
  ];

  const currentSection = editingStructure[activeSection];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900">Customize Chart of Accounts</h3>
              <p className="text-sm text-zinc-500">Add, remove, or modify accounts in your P&L structure</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="flex h-[60vh]">
            {/* Sidebar */}
            <div className="w-56 border-r border-zinc-200 p-4 overflow-y-auto">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeSection === section.id
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-zinc-800">{currentSection?.label}</h4>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentSection?.visible ?? true}
                    onChange={(e) => {
                      setEditingStructure(prev => ({
                        ...prev,
                        [activeSection]: { ...prev[activeSection], visible: e.target.checked }
                      }));
                    }}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600"
                  />
                  <span className="text-sm text-zinc-600">Show section</span>
                </label>
              </div>

              {/* Accounts list */}
              {currentSection?.accounts && (
                <div className="space-y-2">
                  {currentSection.accounts
                    .sort((a, b) => a.order - b.order)
                    .map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg"
                      >
                        <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab" />
                        <input
                          type="text"
                          value={account.code}
                          onChange={(e) => updateAccount(activeSection, account.id, { code: e.target.value })}
                          className="w-16 px-2 py-1 text-sm border border-zinc-200 rounded font-mono"
                          placeholder="Code"
                        />
                        <input
                          type="text"
                          value={account.name}
                          onChange={(e) => updateAccount(activeSection, account.id, { name: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded"
                          placeholder="Account name"
                        />
                        <button
                          onClick={() => updateAccount(activeSection, account.id, { visible: !account.visible })}
                          className={`p-1.5 rounded transition ${account.visible ? "text-indigo-600 hover:bg-indigo-50" : "text-zinc-400 hover:bg-zinc-100"}`}
                        >
                          {account.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => removeAccount(activeSection, account.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  
                  <button
                    onClick={() => addAccount(activeSection)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Account
                  </button>
                </div>
              )}

              {/* Subsections (for operating expenses) */}
              {currentSection?.subsections && (
                <div className="space-y-4">
                  {currentSection.subsections
                    .sort((a, b) => a.order - b.order)
                    .map((subsection) => (
                      <div key={subsection.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-zinc-100 flex items-center justify-between">
                          <span className="font-medium text-zinc-700">{subsection.label}</span>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={subsection.visible}
                              onChange={(e) => {
                                setEditingStructure(prev => {
                                  const newStructure = JSON.parse(JSON.stringify(prev));
                                  const sub = newStructure[activeSection].subsections.find(s => s.id === subsection.id);
                                  if (sub) sub.visible = e.target.checked;
                                  return newStructure;
                                });
                              }}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600"
                            />
                            <span className="text-xs text-zinc-500">Visible</span>
                          </label>
                        </div>
                        <div className="p-3 space-y-2">
                          {subsection.accounts
                            .sort((a, b) => a.order - b.order)
                            .map((account) => (
                              <div
                                key={account.id}
                                className="flex items-center gap-3 p-2 bg-zinc-50 rounded"
                              >
                                <input
                                  type="text"
                                  value={account.code}
                                  onChange={(e) => updateAccount(activeSection, account.id, { code: e.target.value }, subsection.id)}
                                  className="w-16 px-2 py-1 text-sm border border-zinc-200 rounded font-mono"
                                  placeholder="Code"
                                />
                                <input
                                  type="text"
                                  value={account.name}
                                  onChange={(e) => updateAccount(activeSection, account.id, { name: e.target.value }, subsection.id)}
                                  className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded"
                                />
                                <button
                                  onClick={() => updateAccount(activeSection, account.id, { visible: !account.visible }, subsection.id)}
                                  className={`p-1 rounded ${account.visible ? "text-indigo-600" : "text-zinc-400"}`}
                                >
                                  {account.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => removeAccount(activeSection, account.id, subsection.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          <button
                            onClick={() => addAccount(activeSection, subsection.id)}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                          >
                            <Plus className="w-3 h-3" />
                            Add Account
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#3b82c4] hover:bg-[#2563a3] rounded-xl transition"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================
// CUSTOM HOOKS
// ============================================

// Hook for monthly trend calculation with pre-aggregation
export const useMonthlyTrends = (payments, bookings, expenses, instructors, vehicles, structure, taxRates) => {
  return useMemo(() => {
    if (!payments?.length && !bookings?.length && !expenses?.length) {
      return [];
    }

    // Pre-aggregate data by month (O(n) instead of O(12n))
    const monthlyAggregated = aggregateDataByMonth(payments, bookings, expenses);
    
    // Get last 12 months
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: endOfMonth(now),
    });

    return months.map(monthDate => {
      const monthKey = format(monthDate, "yyyy-MM");
      const monthData = monthlyAggregated.get(monthKey) || { payments: [], bookings: [], expenses: [] };
      
      // Build P&L for this month using pre-aggregated data
      const filters = {
        startDate: format(startOfMonth(monthDate), "yyyy-MM-dd"),
        endDate: format(endOfMonth(monthDate), "yyyy-MM-dd"),
      };
      
      const plData = buildDynamicPLData(
        structure,
        monthData.payments,
        monthData.bookings,
        monthData.expenses,
        filters,
        instructors,
        vehicles,
        taxRates
      );

      return {
        month: monthKey,
        label: format(monthDate, "MMM yyyy"),
        revenue: plData.totalRevenue,
        grossProfit: plData.grossProfit,
        operatingIncome: plData.operatingIncome,
        netIncome: plData.netIncome,
      };
    });
  }, [payments, bookings, expenses, instructors, vehicles, structure, taxRates]);
};

// Hook for segment analysis
export const useSegmentAnalysis = (bookings, expenses, instructors, vehicles, segmentBy, filters) => {
  return useMemo(() => {
    if (segmentBy === "none" || !bookings?.length) {
      return null;
    }

    const segments = segmentBy === "instructor" ? instructors : vehicles;
    const idField = segmentBy === "instructor" ? "instructor_id" : "vehicle_id";
    const nameField = segmentBy === "instructor" ? "full_name" : "registration";

    return segments.map(segment => {
      const segmentBookings = bookings.filter(b => b[idField] === segment.id);
      const segmentExpenses = expenses.filter(e => e[idField] === segment.id);
      
      const revenue = segmentBookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const expenseTotal = segmentExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netContribution = revenue - expenseTotal;
      const margin = revenue > 0 ? (netContribution / revenue) * 100 : 0;

      return {
        id: segment.id,
        name: segment[nameField] || segment.name || `${segmentBy} ${segment.id}`,
        revenue,
        expenses: expenseTotal,
        netContribution,
        margin,
        bookingCount: segmentBookings.length,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, expenses, instructors, vehicles, segmentBy, filters]);
};

// Hook for YTD calculations
export const useYTDData = (payments, bookings, expenses, instructors, vehicles, structure, taxRates) => {
  return useMemo(() => {
    const now = new Date();
    const ytdFilters = {
      startDate: format(startOfYear(now), "yyyy-MM-dd"),
      endDate: format(now, "yyyy-MM-dd"),
    };

    return buildDynamicPLData(
      structure,
      payments,
      bookings,
      expenses,
      ytdFilters,
      instructors,
      vehicles,
      taxRates
    );
  }, [payments, bookings, expenses, instructors, vehicles, structure, taxRates]);
};

// ============================================
// TAX RATES BY COUNTRY
// ============================================

const TAX_RATES = {
  IE: {
    corporate_tax_rate: 0.125,
    vat_rate: 0.23,
    employer_prsi_rate: 0.111,
    country_name: "Ireland",
  },
  GB: {
    corporate_tax_rate: 0.25,
    vat_rate: 0.20,
    employer_prsi_rate: 0.138,
    country_name: "United Kingdom",
  },
  US: {
    corporate_tax_rate: 0.21,
    vat_rate: 0,
    employer_prsi_rate: 0.0765,
    country_name: "United States",
  },
};

// ============================================
// DATE PRESET HELPERS
// ============================================

const presets = [
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Quarter", value: "thisQuarter" },
  { label: "Last Quarter", value: "lastQuarter" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
];

const getPresetDates = (preset) => {
  const now = new Date();
  switch (preset) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth":
      return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "thisQuarter":
      return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case "lastQuarter":
      return { start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)) };
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "lastYear":
      return { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
};

const getComparisonPeriod = (startDate, endDate, comparisonType) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const periodLength = end.getTime() - start.getTime();

  if (comparisonType === "previous_year") {
    return {
      startDate: format(subYears(start, 1), "yyyy-MM-dd"),
      endDate: format(subYears(end, 1), "yyyy-MM-dd"),
    };
  }

  // Previous period (default)
  const newEnd = new Date(start.getTime() - 1);
  const newStart = new Date(newEnd.getTime() - periodLength);
  return {
    startDate: format(newStart, "yyyy-MM-dd"),
    endDate: format(newEnd, "yyyy-MM-dd"),
  };
};

// ============================================
// ICON MAP FOR DYNAMIC SECTIONS
// ============================================

const iconMap = {
  DollarSign,
  Wallet,
  Receipt,
  Activity,
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfitLoss() {
  const navigate = useNavigate();
  
  // State
  const [filters, setFilters] = useState(getDefaultFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    revenue: true,
    cogs: true,
    expenses: true,
    personnel: true,
    facilities: false,
    salesMarketing: false,
    administrative: false,
    professionalServices: false,
    financial: false,
    depreciation: false,
    otherOperating: false,
    depreciationSection: true,
    amortizationSection: true,
    otherIncomeSection: true,
    otherExpensesSection: true,
    interest: true,
    taxes: true,
  });
  const [drilldown, setDrilldown] = useState(null);
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [countryCode, setCountryCode] = useState("IE");
  
  // Persisted P&L structure
  const [plStructure, setPlStructure] = usePersistedState(
    "pl_structure_v2",
    DEFAULT_PL_STRUCTURE,
    isValidPLStructure
  );

  // Get tax rates
  const baseTaxRates = TAX_RATES[countryCode] || TAX_RATES.IE;
  const activeTaxRates = useMemo(() => ({
    ...baseTaxRates,
    corporate_tax_rate: filters.customCorporateTaxRate !== null 
      ? filters.customCorporateTaxRate / 100 
      : baseTaxRates.corporate_tax_rate,
    vat_rate: filters.customVATRate !== null 
      ? filters.customVATRate / 100 
      : baseTaxRates.vat_rate,
  }), [baseTaxRates, filters.customCorporateTaxRate, filters.customVATRate]);

  // Data queries with proper error handling
  const { data: payments = [], isLoading: loadingPayments, error: paymentsError } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
    ...QUERY_CONFIG,
  });

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
    ...QUERY_CONFIG,
  });

  const { data: expenses = [], isLoading: loadingExpenses, error: expensesError } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list(),
    ...QUERY_CONFIG,
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
    ...QUERY_CONFIG,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
    ...QUERY_CONFIG,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
    ...QUERY_CONFIG,
  });

  const isLoading = loadingPayments || loadingBookings || loadingExpenses || loadingInstructors || loadingVehicles;
  const hasError = paymentsError || bookingsError || expensesError;

  // Calculate current period P&L
  const currentPeriod = useMemo(() => {
    if (isLoading) return null;
    
    return buildDynamicPLData(
      plStructure,
      payments,
      bookings,
      expenses,
      filters,
      instructors,
      vehicles,
      activeTaxRates
    );
  }, [plStructure, payments, bookings, expenses, filters, instructors, vehicles, activeTaxRates, isLoading]);

  // Calculate comparison period P&L
  const previousPeriod = useMemo(() => {
    if (!filters.showComparison || isLoading) return null;
    
    const compPeriod = getComparisonPeriod(filters.startDate, filters.endDate, filters.comparisonType);
    const compFilters = { ...filters, ...compPeriod };
    
    return buildDynamicPLData(
      plStructure,
      payments,
      bookings,
      expenses,
      compFilters,
      instructors,
      vehicles,
      activeTaxRates
    );
  }, [plStructure, payments, bookings, expenses, filters, instructors, vehicles, activeTaxRates, isLoading]);

  // Monthly trends (using optimized hook)
  const monthlyTrendData = useMonthlyTrends(
    payments, bookings, expenses, instructors, vehicles, plStructure, activeTaxRates
  );

  // YTD data
  const ytdData = useYTDData(
    payments, bookings, expenses, instructors, vehicles, plStructure, activeTaxRates
  );

  // Segment analysis
  const segmentData = useSegmentAnalysis(
    currentPeriod?.rawData?.bookings || [],
    currentPeriod?.rawData?.expenses || [],
    instructors,
    vehicles,
    filters.segmentBy,
    filters
  );

  // Column count for table
  const colCount = useMemo(() => {
    let count = 2; // Account name + Amount
    if (filters.showAccountCodes) count += 1;
    if (filters.showPercentages) count += 1;
    if (filters.showComparison) count += 3; // Prior + Change + Change %
    return count;
  }, [filters.showAccountCodes, filters.showPercentages, filters.showComparison]);

  // Handlers
  const handlePreset = useCallback((preset) => {
    const dates = getPresetDates(preset.value);
    setFilters(prev => ({
      ...prev,
      startDate: format(dates.start, "yyyy-MM-dd"),
      endDate: format(dates.end, "yyyy-MM-dd"),
      preset: preset.value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(getDefaultFilters());
  }, []);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const openDrilldown = useCallback((section, label, accountCode, transactions) => {
    setDrilldown({ section, label, accountCode, transactions });
  }, []);

  // Export handler
  const handleExport = useCallback((exportType) => {
    if (!currentPeriod) return;

    const exportConfig = {
      companyName: "DrivePro Driving School",
      reportTitle: "Profit & Loss Statement",
      dateRange: {
        start: filters.startDate,
        end: filters.endDate,
      },
      accountingBasis: filters.basis,
      showAccountCodes: filters.showAccountCodes,
      showPercentages: filters.showPercentages,
      showComparison: filters.showComparison,
      generatedAt: new Date(),
    };

    const rows = buildExportRows(currentPeriod, previousPeriod, filters.showComparison, filters.showAccountCodes);

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(rows, exportConfig);
          toast.success("Excel file exported successfully");
          break;
        case "pdf":
          exportToPDF(rows, exportConfig, currentPeriod);
          toast.success("PDF export initiated");
          break;
        case "csv":
          exportToCSV(rows, exportConfig);
          toast.success("CSV file exported successfully");
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  }, [currentPeriod, previousPeriod, filters]);

  // Render helpers
  const renderSectionHeader = useCallback((label, total, prevTotal, sectionKey, Icon) => (
    <SectionHeader
      label={label}
      total={total}
      prevTotal={prevTotal}
      sectionKey={sectionKey}
      icon={Icon}
      isExpanded={expandedSections[sectionKey]}
      onToggle={toggleSection}
      showAccountCodes={filters.showAccountCodes}
      showPercentages={filters.showPercentages}
      showComparison={filters.showComparison}
      baseRevenue={currentPeriod?.totalRevenue || 0}
      colCount={colCount}
    />
  ), [expandedSections, toggleSection, filters, currentPeriod?.totalRevenue, colCount]);

  const renderSubsectionHeader = useCallback((label, total, prevTotal, sectionKey) => {
    const changeAmount = prevTotal != null ? formatChangeAmount(total, prevTotal) : null;
    const changePercent = prevTotal != null ? formatChangePercent(total, prevTotal) : null;
    
    return (
      <tr
        className="bg-zinc-50/50 cursor-pointer hover:bg-zinc-100 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        {filters.showAccountCodes && <td className="py-2.5 px-3 w-16"></td>}
        <td className="py-2.5 px-4 pl-8">
          <div className="flex items-center gap-2">
            {expandedSections[sectionKey] ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">{label}</span>
          </div>
        </td>
        <td className={`py-2.5 px-4 text-right font-semibold font-mono text-sm ${total < 0 ? 'text-red-600' : 'text-zinc-700'}`}>
          {formatCurrency(total)}
        </td>
        {filters.showPercentages && (
          <td className="py-2.5 px-4 text-right text-xs text-zinc-400 font-mono">
            {currentPeriod?.totalRevenue > 0 ? formatPercent(total, currentPeriod.totalRevenue) : "N/A"}
          </td>
        )}
        {filters.showComparison && (
          <>
            <td className={`py-2.5 px-4 text-right font-mono text-sm ${prevTotal != null && prevTotal < 0 ? 'text-red-600' : 'text-zinc-500'}`}>
              {prevTotal != null ? formatCurrency(prevTotal) : "—"}
            </td>
            <td className={`py-2.5 px-4 text-right font-mono text-sm ${changeAmount?.colorClass || 'text-zinc-400'}`}>
              {changeAmount?.formatted || "—"}
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
  }, [expandedSections, toggleSection, filters, currentPeriod?.totalRevenue]);

  const renderAccountRow = useCallback((label, amount, prevAmount, options = {}) => {
    const { accountCode = null, indent = 0, onClick = null, isClickable = true } = options;
    
    return (
      <AccountRow
        label={label}
        amount={amount}
        prevAmount={prevAmount}
        accountCode={accountCode}
        indent={indent}
        onClick={onClick}
        isClickable={isClickable}
        showAccountCodes={filters.showAccountCodes}
        showPercentages={filters.showPercentages}
        showComparison={filters.showComparison}
        baseRevenue={currentPeriod?.totalRevenue || 0}
        colCount={colCount}
      />
    );
  }, [filters, currentPeriod?.totalRevenue, colCount]);

  const renderTotalRow = useCallback((label, amount, prevAmount, isGrandTotal = false, isSubtotal = false) => (
    <TotalRow
      label={label}
      amount={amount}
      prevAmount={prevAmount}
      isGrandTotal={isGrandTotal}
      isSubtotal={isSubtotal}
      showAccountCodes={filters.showAccountCodes}
      showPercentages={filters.showPercentages}
      showComparison={filters.showComparison}
      baseRevenue={currentPeriod?.totalRevenue || 0}
      colCount={colCount}
    />
  ), [filters, currentPeriod?.totalRevenue, colCount]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-zinc-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Info className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Unable to Load Data</h2>
          <p className="text-zinc-500 mb-4">
            There was an error loading your financial data. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!currentPeriod) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl("Finance"))}
              className="p-2 hover:bg-zinc-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Profit & Loss Statement</h1>
              <p className="text-sm text-zinc-500">
                {format(parseISO(filters.startDate), "MMMM d, yyyy")} — {format(parseISO(filters.endDate), "MMMM d, yyyy")}
                <span className="mx-2">•</span>
                <span className="capitalize">{filters.basis}</span> Basis
                <span className="mx-2">•</span>
                {baseTaxRates.country_name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
              showFilters ? "bg-[#e8f4fa] text-[#3b82c4]" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <button
              onClick={() => setShowStructureEditor(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition"
            >
              <Settings className="w-4 h-4" />
              Customize
            </button>
            
            <div className="h-6 w-px bg-zinc-200 mx-1" />
            
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3] transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#fdeeed] text-[#e44138] hover:bg-[#f9d4d2] transition"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5] transition"
            >
              <FileDown className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
          <KPICard
            label="Total Revenue"
            value={currentPeriod.totalRevenue}
            previousValue={previousPeriod?.totalRevenue}
            icon={<DollarSign className="w-4 h-4 text-[#5cb83a]" />}
            color="bg-[#eefbe7]"
          />
          <KPICard
            label="Gross Profit"
            value={currentPeriod.grossProfit}
            previousValue={previousPeriod?.grossProfit}
            icon={<TrendingUp className="w-4 h-4 text-[#3b82c4]" />}
            color="bg-[#e8f4fa]"
            subtext={`${currentPeriod.grossMargin.toFixed(1)}% margin`}
          />
          <KPICard
            label="Operating Income"
            value={currentPeriod.operatingIncome}
            previousValue={previousPeriod?.operatingIncome}
            icon={<Activity className="w-4 h-4 text-[#6c376f]" />}
            color="bg-[#f3e8f4]"
            subtext={`${currentPeriod.operatingMargin.toFixed(1)}% margin`}
          />
          <KPICard
            label="EBITDA"
            value={currentPeriod.ebitda}
            previousValue={previousPeriod?.ebitda}
            icon={<BarChart3 className="w-4 h-4 text-[#e7d356]" />}
            color="bg-[#fdfbe8]"
            subtext={`${currentPeriod.ebitdaMargin.toFixed(1)}% margin`}
          />
          <KPICard
            label="Tax Expense"
            value={currentPeriod.totalTaxExpense}
            previousValue={previousPeriod?.totalTaxExpense}
            isPositiveGood={false}
            icon={<Landmark className="w-4 h-4 text-[#e44138]" />}
            color="bg-[#fdeeed]"
            subtext={`${(activeTaxRates.corporate_tax_rate * 100).toFixed(1)}% rate`}
          />
          <KPICard
            label="Net Income"
            value={currentPeriod.netIncome}
            previousValue={previousPeriod?.netIncome}
            icon={<PiggyBank className="w-4 h-4 text-[#3b82c4]" />}
            color="bg-[#e8f4fa]"
            subtext={`${currentPeriod.netMargin.toFixed(1)}% margin`}
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filters Panel */}
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
                    Report Options
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Quick Periods */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Period
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {presets.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handlePreset(preset)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            filters.preset === preset.value
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Dates */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Custom Range</label>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, preset: "custom" }))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, preset: "custom" }))}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Accounting Basis */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      Accounting Basis
                    </label>
                    <div className="flex gap-2">
                      {["accrual", "cash"].map((basis) => (
                        <button
                          key={basis}
                          onClick={() => setFilters(prev => ({ ...prev, basis }))}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                          filters.basis === basis
                            ? "bg-[#3b82c4] text-white shadow-sm"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {basis}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comparison Type */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Compare To</label>
                    <select
                      value={filters.comparisonType}
                      onChange={(e) => setFilters(prev => ({ ...prev, comparisonType: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] bg-white"
                      >
                      <option value="previous_period">Previous Period</option>
                      <option value="previous_year">Same Period Last Year</option>
                    </select>
                  </div>

                  {/* Tax Rates Override */}
                  <div className="pt-4 border-t border-zinc-200">
                    <label className="block text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-zinc-400" />
                      Tax Rates
                    </label>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Corporation Tax (%)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={filters.customCorporateTaxRate !== null ? filters.customCorporateTaxRate : (activeTaxRates.corporate_tax_rate * 100).toFixed(1)}
                            onChange={(e) => {
                              const value = e.target.value === "" ? null : parseFloat(e.target.value);
                              setFilters(prev => ({ ...prev, customCorporateTaxRate: value }));
                            }}
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {filters.customCorporateTaxRate !== null && (
                            <button
                              onClick={() => setFilters(prev => ({ ...prev, customCorporateTaxRate: null }))}
                              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                              title="Reset to country default"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">VAT / Sales Tax (%)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={filters.customVATRate !== null ? filters.customVATRate : (activeTaxRates.vat_rate * 100).toFixed(1)}
                            onChange={(e) => {
                              const value = e.target.value === "" ? null : parseFloat(e.target.value);
                              setFilters(prev => ({ ...prev, customVATRate: value }));
                            }}
                            className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {filters.customVATRate !== null && (
                            <button
                              onClick={() => setFilters(prev => ({ ...prev, customVATRate: null }))}
                              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
                              title="Reset to country default"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="pt-4 border-t border-zinc-200 space-y-3">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Display</label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                      <input
                        type="checkbox"
                        checked={filters.showComparison}
                        onChange={(e) => setFilters(prev => ({ ...prev, showComparison: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-700">Show Comparison</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                      <input
                        type="checkbox"
                        checked={filters.showPercentages}
                        onChange={(e) => setFilters(prev => ({ ...prev, showPercentages: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-700">Show % of Revenue</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                      <input
                        type="checkbox"
                        checked={filters.showAccountCodes}
                        onChange={(e) => setFilters(prev => ({ ...prev, showAccountCodes: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-700">Show Account Codes</span>
                    </label>

                    {/* Advanced Options Toggle */}
                    <div className="pt-4 border-t border-zinc-200">
                      <button
                        onClick={() => setShowAdvancedOptions(prev => !prev)}
                        className="flex items-center justify-between w-full text-sm font-semibold text-zinc-700 mb-3"
                      >
                        <span>Advanced Options</span>
                        {showAdvancedOptions ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {showAdvancedOptions && (
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                            <input
                              type="checkbox"
                              checked={filters.showYTDSummary}
                              onChange={(e) => setFilters(prev => ({ ...prev, showYTDSummary: e.target.checked }))}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-zinc-700">Show YTD Summary</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                            <input
                              type="checkbox"
                              checked={filters.showKeyRatios}
                              onChange={(e) => setFilters(prev => ({ ...prev, showKeyRatios: e.target.checked }))}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-zinc-700">Show Key Ratios</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                            <input
                              type="checkbox"
                              checked={filters.showVATBreakdown}
                              onChange={(e) => setFilters(prev => ({ ...prev, showVATBreakdown: e.target.checked }))}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-zinc-700">Show VAT Breakdown</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50 transition">
                            <input
                              type="checkbox"
                              checked={filters.showSegmentAnalysis}
                              onChange={(e) => setFilters(prev => ({ ...prev, showSegmentAnalysis: e.target.checked }))}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-zinc-700">Show Segment Analysis</span>
                          </label>

                          {filters.showSegmentAnalysis && (
                            <div className="ml-6">
                              <label className="block text-xs text-zinc-500 mb-1">Segment By</label>
                              <select
                                value={filters.segmentBy}
                                onChange={(e) => setFilters(prev => ({ ...prev, segmentBy: e.target.value }))}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option value="none">None</option>
                                <option value="instructor">By Instructor</option>
                                <option value="vehicle">By Vehicle</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statement Table */}
        <div className={showFilters ? "lg:col-span-4" : "lg:col-span-5"}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f4fa] flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Statement of Operations</h3>
                  <p className="text-xs text-zinc-500">Click any account to view underlying transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-zinc-200 transition" title="Refresh">
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
                    {filters.showAccountCodes && (
                      <th className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wide w-16">Code</th>
                    )}
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Account</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Amount</th>
                    {filters.showPercentages && (
                      <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-24">% Rev</th>
                    )}
                    {filters.showComparison && (
                      <>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Prior</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-28">Change</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-24">Change %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* REVENUE SECTION */}
                  {plStructure.revenue?.visible && (
                    <>
                      {renderSectionHeader(
                        plStructure.revenue.label,
                        currentPeriod.totalRevenue,
                        previousPeriod?.totalRevenue,
                        "revenue",
                        DollarSign
                      )}

                      {expandedSections.revenue && plStructure.revenue.accounts
                        .filter(acc => acc.visible)
                        .sort((a, b) => a.order - b.order)
                        .map(account => {
                          const amount = currentPeriod.accountValues?.[account.id] || 0;
                          const prevAmount = previousPeriod?.accountValues?.[account.id];
                          const transactions = currentPeriod.accountTransactions?.[account.id] || [];

                          return (
                            <React.Fragment key={account.id}>
                              {renderAccountRow(account.name, amount, prevAmount, {
                                accountCode: account.code,
                                indent: 1,
                                onClick: transactions.length > 0
                                  ? () => openDrilldown("Revenue", account.name, account.code, transactions)
                                  : undefined,
                              })}
                            </React.Fragment>
                          );
                        })}

                      {renderTotalRow("Total Revenue", currentPeriod.totalRevenue, previousPeriod?.totalRevenue)}
                    </>
                  )}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* COST OF REVENUE */}
                  {plStructure.cogs?.visible && (
                    <>
                      {renderSectionHeader(
                        plStructure.cogs.label,
                        currentPeriod.totalCogs,
                        previousPeriod?.totalCogs,
                        "cogs",
                        Wallet
                      )}

                      {expandedSections.cogs && plStructure.cogs.accounts
                        .filter(acc => acc.visible)
                        .sort((a, b) => a.order - b.order)
                        .map(account => {
                          const amount = currentPeriod.accountValues?.[account.id] || 0;
                          const prevAmount = previousPeriod?.accountValues?.[account.id];
                          const transactions = currentPeriod.accountTransactions?.[account.id] || [];

                          return (
                            <React.Fragment key={account.id}>
                              {renderAccountRow(account.name, amount, prevAmount, {
                                accountCode: account.code,
                                indent: 1,
                                onClick: transactions.length > 0
                                  ? () => openDrilldown("Cost of Revenue", account.name, account.code, transactions)
                                  : undefined,
                              })}
                            </React.Fragment>
                          );
                        })}

                      {renderTotalRow("Total Cost of Revenue", currentPeriod.totalCogs, previousPeriod?.totalCogs)}
                    </>
                  )}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* GROSS PROFIT */}
                  {renderTotalRow("GROSS PROFIT", currentPeriod.grossProfit, previousPeriod?.grossProfit, false, true)}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* OPERATING EXPENSES */}
                  {plStructure.operatingExpenses?.visible && (
                    <>
                      {renderSectionHeader(
                        "OPERATING EXPENSES",
                        currentPeriod.totalOperatingExpenses,
                        previousPeriod?.totalOperatingExpenses,
                        "expenses",
                        Receipt
                      )}

                      {expandedSections.expenses && plStructure.operatingExpenses.subsections
                        ?.filter(sub => sub.visible)
                        .sort((a, b) => a.order - b.order)
                        .map(subsection => {
                          const subsectionTotal = subsection.accounts
                            .filter(a => a.visible)
                            .reduce((sum, a) => sum + (currentPeriod.accountValues?.[a.id] || 0), 0);
                          const prevSubsectionTotal = previousPeriod ? subsection.accounts
                            .filter(a => a.visible)
                            .reduce((sum, a) => sum + (previousPeriod.accountValues?.[a.id] || 0), 0) : null;

                          if (subsectionTotal === 0 && (!prevSubsectionTotal || prevSubsectionTotal === 0)) {
                            return null;
                          }

                          return (
                            <React.Fragment key={subsection.id}>
                              {renderSubsectionHeader(
                                subsection.label,
                                subsectionTotal,
                                prevSubsectionTotal,
                                subsection.id
                              )}

                              {expandedSections[subsection.id] && subsection.accounts
                                .filter(acc => acc.visible)
                                .sort((a, b) => a.order - b.order)
                                .map(account => {
                                  const amount = currentPeriod.accountValues?.[account.id] || 0;
                                  const prevAmount = previousPeriod?.accountValues?.[account.id];
                                  const transactions = currentPeriod.accountTransactions?.[account.id] || [];

                                  if (amount === 0 && (!prevAmount || prevAmount === 0)) return null;

                                  return (
                                    <React.Fragment key={account.id}>
                                      {renderAccountRow(account.name, amount, prevAmount, {
                                        accountCode: account.code,
                                        indent: 2,
                                        onClick: transactions.length > 0
                                          ? () => openDrilldown(subsection.label, account.name, account.code, transactions)
                                          : undefined,
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}

                      {renderTotalRow("Total Operating Expenses", currentPeriod.totalOperatingExpenses, previousPeriod?.totalOperatingExpenses)}
                    </>
                  )}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* EBITDA */}
                  {renderTotalRow("EBITDA", currentPeriod.ebitda, previousPeriod?.ebitda, false, true)}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* DEPRECIATION */}
                  {(() => {
                    const totalDepreciationOnly = (currentPeriod.expensesByCategory.depreciation.vehicleDepreciation || 0) + 
                      (currentPeriod.expensesByCategory.depreciation.equipmentDepreciation || 0);
                    const totalPrevDepreciationOnly = (previousPeriod?.expensesByCategory?.depreciation?.vehicleDepreciation || 0) + 
                      (previousPeriod?.expensesByCategory?.depreciation?.equipmentDepreciation || 0);
                    
                    return (
                      <>
                        {renderSectionHeader(
                          "DEPRECIATION",
                          totalDepreciationOnly,
                          totalPrevDepreciationOnly,
                          "depreciationSection",
                          Activity
                        )}

                        {expandedSections.depreciationSection && (
                          <>
                            {renderAccountRow("Depreciation - Vehicles", currentPeriod.expensesByCategory.depreciation.vehicleDepreciation || 0, previousPeriod?.expensesByCategory?.depreciation?.vehicleDepreciation || 0, {
                              accountCode: "6600",
                              indent: 1,
                            })}
                            {renderAccountRow("Depreciation - Equipment", currentPeriod.expensesByCategory.depreciation.equipmentDepreciation || 0, previousPeriod?.expensesByCategory?.depreciation?.equipmentDepreciation || 0, {
                              accountCode: "6610",
                              indent: 1,
                            })}
                          </>
                        )}

                        {renderTotalRow("Total Depreciation", totalDepreciationOnly, totalPrevDepreciationOnly)}
                      </>
                    );
                  })()}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* AMORTIZATION */}
                  {(() => {
                    const totalAmortization = currentPeriod.expensesByCategory.depreciation.amortization || 0;
                    const totalPrevAmortization = previousPeriod?.expensesByCategory?.depreciation?.amortization || 0;
                    
                    return (
                      <>
                        {renderSectionHeader(
                          "AMORTIZATION",
                          totalAmortization,
                          totalPrevAmortization,
                          "amortizationSection",
                          Activity
                        )}

                        {expandedSections.amortizationSection && (
                          <>
                            {renderAccountRow("Amortization - Intangibles", currentPeriod.expensesByCategory.depreciation.amortization || 0, previousPeriod?.expensesByCategory?.depreciation?.amortization || 0, {
                              accountCode: "6620",
                              indent: 1,
                            })}
                          </>
                        )}

                        {renderTotalRow("Total Amortization", totalAmortization, totalPrevAmortization)}
                      </>
                    );
                  })()}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* OPERATING INCOME (EBIT) */}
                  {renderTotalRow("OPERATING INCOME (EBIT)", currentPeriod.operatingIncome, previousPeriod?.operatingIncome, false, true)}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* OTHER INCOME */}
                  {(() => {
                    const otherIncomeNonInterest = (currentPeriod.otherIncome?.rentalIncome || 0) + 
                      (currentPeriod.otherIncome?.insuranceProceeds || 0) + 
                      (currentPeriod.otherIncome?.miscIncome || 0);
                    const prevOtherIncomeNonInterest = (previousPeriod?.otherIncome?.rentalIncome || 0) + 
                      (previousPeriod?.otherIncome?.insuranceProceeds || 0) + 
                      (previousPeriod?.otherIncome?.miscIncome || 0);
                    
                    return (
                      <>
                        {renderSectionHeader(
                          "OTHER INCOME",
                          otherIncomeNonInterest,
                          prevOtherIncomeNonInterest,
                          "otherIncomeSection",
                          Banknote
                        )}

                        {expandedSections.otherIncomeSection && (
                          <>
                            {renderAccountRow("Rental Income", currentPeriod.otherIncome?.rentalIncome || 0, previousPeriod?.otherIncome?.rentalIncome || 0, {
                              accountCode: "4510",
                              indent: 1,
                            })}
                            {renderAccountRow("Insurance Proceeds", currentPeriod.otherIncome?.insuranceProceeds || 0, previousPeriod?.otherIncome?.insuranceProceeds || 0, {
                              accountCode: "4520",
                              indent: 1,
                            })}
                            {renderAccountRow("Miscellaneous Income", currentPeriod.otherIncome?.miscIncome || 0, previousPeriod?.otherIncome?.miscIncome || 0, {
                              accountCode: "4590",
                              indent: 1,
                            })}
                          </>
                        )}

                        {renderTotalRow("Total Other Income", otherIncomeNonInterest, prevOtherIncomeNonInterest)}
                      </>
                    );
                  })()}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* OTHER EXPENSES */}
                  {(() => {
                    const otherExpensesNonInterest = (currentPeriod.otherExpenses?.latePenalties || 0) + 
                      (currentPeriod.otherExpenses?.assetDisposalLoss || 0);
                    const prevOtherExpensesNonInterest = (previousPeriod?.otherExpenses?.latePenalties || 0) + 
                      (previousPeriod?.otherExpenses?.assetDisposalLoss || 0);
                    
                    return (
                      <>
                        {renderSectionHeader(
                          "OTHER EXPENSES",
                          otherExpensesNonInterest,
                          prevOtherExpensesNonInterest,
                          "otherExpensesSection",
                          CreditCard
                        )}

                        {expandedSections.otherExpensesSection && (
                          <>
                            {renderAccountRow("Late Payment Penalties", currentPeriod.otherExpenses?.latePenalties || 0, previousPeriod?.otherExpenses?.latePenalties || 0, {
                              accountCode: "7020",
                              indent: 1,
                            })}
                            {renderAccountRow("Loss on Asset Disposal", currentPeriod.otherExpenses?.assetDisposalLoss || 0, previousPeriod?.otherExpenses?.assetDisposalLoss || 0, {
                              accountCode: "7030",
                              indent: 1,
                            })}
                          </>
                        )}

                        {renderTotalRow("Total Other Expenses", otherExpensesNonInterest, prevOtherExpensesNonInterest)}
                      </>
                    );
                  })()}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* INTEREST */}
                  {renderSectionHeader(
                    "INTEREST",
                    currentPeriod.netInterest,
                    previousPeriod?.netInterest,
                    "interest",
                    Banknote
                  )}

                  {expandedSections.interest && (
                    <>
                      {renderAccountRow("Interest Expense", 
                        (currentPeriod.otherExpenses?.interestExpense || 0) + (currentPeriod.otherExpenses?.loanInterest || 0),
                        (previousPeriod?.otherExpenses?.interestExpense || 0) + (previousPeriod?.otherExpenses?.loanInterest || 0), {
                        accountCode: "7000",
                        indent: 1,
                      })}
                      {renderAccountRow("Interest Income", 
                        currentPeriod.otherIncome?.interestIncome || 0,
                        previousPeriod?.otherIncome?.interestIncome || 0, {
                        accountCode: "4500",
                        indent: 1,
                      })}
                    </>
                  )}

                  {renderTotalRow("Net Interest", currentPeriod.netInterest, previousPeriod?.netInterest)}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* INCOME BEFORE TAX (EBT) */}
                  {renderTotalRow("INCOME BEFORE TAX (EBT)", currentPeriod.incomeBeforeTax, previousPeriod?.incomeBeforeTax, false, true)}

                  {/* Spacer */}
                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* TAX EXPENSE */}
                  {plStructure.taxes?.visible && (
                    <>
                      {renderSectionHeader(
                        "INCOME TAX EXPENSE",
                        currentPeriod.totalTaxExpense,
                        previousPeriod?.totalTaxExpense,
                        "taxes",
                        Landmark
                      )}

                      {expandedSections.taxes && (
                        <>
                          {renderAccountRow(
                            `Corporation Tax (${(activeTaxRates.corporate_tax_rate * 100).toFixed(1)}%)`,
                            currentPeriod.taxes.corporationTax,
                            previousPeriod?.taxes?.corporationTax,
                            { accountCode: "8000", indent: 1 }
                          )}
                          {currentPeriod.taxes.deferredTax > 0 && renderAccountRow(
                            "Deferred Tax Expense",
                            currentPeriod.taxes.deferredTax,
                            previousPeriod?.taxes?.deferredTax,
                            { accountCode: "8010", indent: 1 }
                          )}
                        </>
                      )}

                      {renderTotalRow("Total Tax Expense", currentPeriod.totalTaxExpense, previousPeriod?.totalTaxExpense)}
                    </>
                  )}

                  {/* Spacer */}
                  <tr className="h-4"><td colSpan={colCount}></td></tr>

                  {/* NET INCOME */}
                  {renderTotalRow("NET INCOME", currentPeriod.netIncome, previousPeriod?.netIncome, true)}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Report ID: PL-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span>•</span>
                  <span>Currency: EUR</span>
                  <span>•</span>
                  <span>{filters.basis === "accrual" ? "Accrual" : "Cash"} Basis</span>
                </div>
                <span>UNAUDITED - FOR MANAGEMENT USE ONLY</span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f4fa] flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#3b82c4]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2563a3]">Professional Income Statement</p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  This report follows standard accounting principles with full chart of accounts support. 
                  Click any account row to drill down into transactions. Export to Excel, PDF, or CSV for 
                  sharing with your accountant or for audit purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {filters.showYTDSummary && ytdData && (
          <div className="lg:col-span-2">
            <YTDSummaryPanel ytdData={ytdData} monthlyTrends={monthlyTrendData} />
          </div>
        )}
        
        {filters.showKeyRatios && (
          <KeyRatiosPanel 
            ratios={currentPeriod.keyRatios} 
            previousRatios={previousPeriod?.keyRatios} 
          />
        )}
        
        {filters.showVATBreakdown && (
          <VATSummaryPanel 
            exemptRevenue={currentPeriod.exemptRevenue}
            zeroRatedRevenue={currentPeriod.zeroRatedRevenue}
            standardRatedRevenue={currentPeriod.standardRatedRevenue}
            outputVAT={currentPeriod.outputVAT}
            inputVAT={currentPeriod.inputVAT}
            recoverableVAT={currentPeriod.recoverableVAT}
            irrecoverableVAT={currentPeriod.irrecoverableVAT}
            netVATPayable={currentPeriod.netVATPayable}
            vatCollected={currentPeriod.vatCollected}
            vatPaid={currentPeriod.vatPaid}
            netVATDue={currentPeriod.netVATDue}
          />
        )}
        
        {filters.showSegmentAnalysis && segmentData && (
          <div className="lg:col-span-2">
            <SegmentAnalysisPanel 
              segmentData={segmentData} 
              segmentBy={filters.segmentBy} 
            />
          </div>
        )}
        
        {filters.showNotes && (
          <div className="lg:col-span-2">
            <NotesSection 
              config={{
                accountingBasis: filters.basis,
                depreciationMethod: filters.depreciationMethod,
                revenueRecognition: filters.revenueRecognition,
              }}
              currentPeriod={currentPeriod}
              previousPeriod={previousPeriod}
            />
          </div>
        )}
      </div>

      {/* Drilldown Panel */}
      <DrilldownPanel
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        section={drilldown?.section || ""}
        label={drilldown?.label || ""}
        accountCode={drilldown?.accountCode || ""}
        transactions={drilldown?.transactions || []}
      />

      {/* Structure Editor Modal */}
      <StructureEditorModal
        isOpen={showStructureEditor}
        onClose={() => setShowStructureEditor(false)}
        structure={plStructure}
        onSave={setPlStructure}
      />
    </div>
  );
}