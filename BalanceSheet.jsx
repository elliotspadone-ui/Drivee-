import React, { useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { 
  format, 
  parseISO, 
  subYears, 
  endOfMonth,
  endOfQuarter,
  endOfYear,
  differenceInMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  Settings,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Scale,
  FileSpreadsheet,
  FileText,
  FileDown,
  Info,
  RefreshCw,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Calendar,
  Filter,
  Building2,
  Landmark,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

// Import P&L utilities for consistent formatting
import {
  formatCurrency,
  formatCurrencyRaw,
  formatChangeAmount,
  formatChangePercent,
  formatPercent,
  escapeXML,
  escapeHTML,
  escapeCsv,
  generateFileName,
  QUERY_CONFIG,
} from "./ProfitLoss";

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_VEHICLE_COST = 15000;
const DEFAULT_VEHICLE_USEFUL_LIFE = 5;
const DEFAULT_SOFTWARE_COST = 2000;

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const usePersistedState = (key, defaultValue, validator = () => true) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validator(parsed)) {
          return parsed;
        }
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

const isValidBalanceSheetStructure = (data) => {
  if (!data || typeof data !== 'object') return false;
  const requiredSections = ['assets', 'liabilities', 'equity'];
  return requiredSections.every(section => 
    data[section] && 
    typeof data[section].id === 'string' &&
    data[section].sections
  );
};

const DATA_SOURCE_TYPES = {
  CALCULATED: "calculated",
  STATIC: "static",
};

const DEFAULT_BALANCE_SHEET_STRUCTURE = {
  assets: {
    id: "assets",
    label: "ASSETS",
    order: 1,
    visible: true,
    sections: {
      currentAssets: {
        id: "currentAssets",
        label: "Current Assets",
        order: 1,
        visible: true,
        accounts: [
          { id: "1010", code: "1010", name: "Cash & Bank Accounts", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "cashAndBank" } } },
          { id: "1200", code: "1200", name: "Accounts Receivable", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "accountsReceivable" } } },
          { id: "1300", code: "1300", name: "Prepaid Expenses", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: 0 } } },
        ],
      },
      nonCurrentAssets: {
        id: "nonCurrentAssets",
        label: "Non-Current Assets",
        order: 2,
        visible: true,
        accounts: [
          { id: "1510", code: "1510", name: "Vehicles (at cost)", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "vehiclesCost" } } },
          { id: "1590", code: "1590", name: "Accumulated Depreciation - Vehicles", visible: true, order: 2, isNegative: true, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "vehiclesDepreciation" } } },
          { id: "1530", code: "1530", name: "Intangible Assets - Software", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: DEFAULT_SOFTWARE_COST } } },
        ],
      },
    },
  },
  liabilities: {
    id: "liabilities",
    label: "LIABILITIES",
    order: 2,
    visible: true,
    sections: {
      currentLiabilities: {
        id: "currentLiabilities",
        label: "Current Liabilities",
        order: 1,
        visible: true,
        accounts: [
          { id: "2010", code: "2010", name: "Accounts Payable", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "accountsPayable" } } },
          { id: "2100", code: "2100", name: "VAT Payable", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "vatPayable" } } },
          { id: "2200", code: "2200", name: "Short-Term Loans", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: 0 } } },
        ],
      },
      nonCurrentLiabilities: {
        id: "nonCurrentLiabilities",
        label: "Non-Current Liabilities",
        order: 2,
        visible: true,
        accounts: [
          { id: "2510", code: "2510", name: "Vehicle Financing", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: 0 } } },
          { id: "2520", code: "2520", name: "Long-Term Debt", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: 0 } } },
        ],
      },
    },
  },
  equity: {
    id: "equity",
    label: "EQUITY",
    order: 3,
    visible: true,
    sections: {
      ownerEquity: {
        id: "ownerEquity",
        label: "Owner's Equity",
        order: 1,
        visible: true,
        accounts: [
          { id: "3010", code: "3010", name: "Share Capital / Owner Capital", visible: true, order: 1, dataSource: { type: DATA_SOURCE_TYPES.STATIC, config: { defaultValue: 50000 } } },
          { id: "3200", code: "3200", name: "Retained Earnings", visible: true, order: 2, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "retainedEarnings" } } },
          { id: "3900", code: "3900", name: "Current Year Earnings", visible: true, order: 3, dataSource: { type: DATA_SOURCE_TYPES.CALCULATED, config: { formula: "currentYearEarnings" } } },
        ],
      },
    },
  },
};

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "End of Month", value: "end_of_month" },
  { label: "End of Quarter", value: "end_of_quarter" },
  { label: "End of Year", value: "end_of_year" },
];

const COMPARISON_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Previous Year", value: "previous_year" },
];

// ============================================
// CALCULATION HELPERS
// ============================================

const isBeforeOrOnDate = (dateStr, endDate) => {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    const end = endOfDay(parseISO(endDate));
    return date <= end;
  } catch {
    return false;
  }
};

const createBalanceSheetDataset = (rawData, asOfDate) => {
  const { payments, expenses, bookings, vehicles, instructors } = rawData;
  
  const completedPayments = payments.filter(p => 
    p.status === "completed" && 
    isBeforeOrOnDate(p.payment_date || p.created_date, asOfDate)
  );
  
  const unpaidInvoices = payments.filter(p =>
    p.status !== "completed" &&
    isBeforeOrOnDate(p.created_date, asOfDate)
  );
  
  const unpaidExpenses = expenses.filter(e =>
    e.payment_status !== "paid" &&
    isBeforeOrOnDate(e.expense_date || e.created_date, asOfDate)
  );
  
  const paidExpenses = expenses.filter(e =>
    e.payment_status === "paid" &&
    isBeforeOrOnDate(e.expense_date || e.created_date, asOfDate)
  );
  
  const activeVehicles = vehicles.filter(v =>
    isBeforeOrOnDate(v.created_date, asOfDate)
  );
  
  return {
    completedPayments,
    unpaidInvoices,
    unpaidExpenses,
    paidExpenses,
    activeVehicles,
    asOfDate,
  };
};

const calculateAccountValue = (account, aggregatedData) => {
  const { dataSource, isNegative = false } = account;

  if (!dataSource) {
    return { amount: 0, transactions: [] };
  }

  const { type, config } = dataSource;

  switch (type) {
    case DATA_SOURCE_TYPES.CALCULATED: {
      const { formula } = config;
      const formulas = {
        cashAndBank: () => {
          const totalReceived = aggregatedData.completedPayments.reduce(
            (sum, p) => sum + (p.amount || 0), 0
          );
          const totalPaid = aggregatedData.paidExpenses.reduce(
            (sum, e) => sum + (e.amount || 0), 0
          );
          return {
            amount: totalReceived - totalPaid,
            transactions: [...aggregatedData.completedPayments, ...aggregatedData.paidExpenses],
          };
        },
        
        accountsReceivable: () => {
          const unpaidAmount = aggregatedData.unpaidInvoices.reduce(
            (sum, inv) => sum + (inv.amount || 0), 0
          );
          return {
            amount: unpaidAmount,
            transactions: aggregatedData.unpaidInvoices,
          };
        },
        
        vehiclesCost: () => {
          const totalCost = aggregatedData.activeVehicles.reduce(
            (sum, v) => sum + DEFAULT_VEHICLE_COST, 0
          );
          return {
            amount: totalCost,
            transactions: aggregatedData.activeVehicles,
          };
        },
        
        vehiclesDepreciation: () => {
          let totalDepreciation = 0;
          const depreciationDetails = [];
          
          aggregatedData.activeVehicles.forEach(vehicle => {
            const purchaseDate = parseISO(vehicle.created_date);
            const asOfDate = parseISO(aggregatedData.asOfDate);
            const monthsOwned = differenceInMonths(asOfDate, purchaseDate);
            
            const cost = DEFAULT_VEHICLE_COST;
            const usefulLife = DEFAULT_VEHICLE_USEFUL_LIFE;
            const annualDepreciation = cost / usefulLife;
            const monthlyDepreciation = annualDepreciation / 12;
            
            const accumulated = Math.min(monthsOwned * monthlyDepreciation, cost);
            totalDepreciation += accumulated;
            
            depreciationDetails.push({
              ...vehicle,
              cost,
              monthsOwned,
              accumulated,
            });
          });
          
          return {
            amount: totalDepreciation,
            transactions: depreciationDetails,
          };
        },
        
        accountsPayable: () => {
          const unpaidAmount = aggregatedData.unpaidExpenses.reduce(
            (sum, e) => sum + (e.amount || 0), 0
          );
          return {
            amount: unpaidAmount,
            transactions: aggregatedData.unpaidExpenses,
          };
        },
        
        vatPayable: () => {
          const vatRate = 0.23;
          const vatCollected = aggregatedData.completedPayments.reduce((sum, p) => {
            const isVATExempt = ['lesson', 'package', 'theory', 'exam_fee'].includes(p.payment_type);
            if (isVATExempt) return sum;
            return sum + ((p.amount || 0) * vatRate / (1 + vatRate));
          }, 0);
          
          const vatPaid = aggregatedData.paidExpenses.reduce((sum, e) => {
            return sum + ((e.amount || 0) * vatRate / (1 + vatRate));
          }, 0);
          
          const netVATPayable = vatCollected - vatPaid;
          
          return {
            amount: Math.max(netVATPayable, 0),
            transactions: [],
          };
        },
        
        retainedEarnings: () => {
          return { amount: 0, transactions: [] };
        },
        
        currentYearEarnings: () => {
          const totalRevenue = aggregatedData.completedPayments.reduce(
            (sum, p) => sum + (p.amount || 0), 0
          );
          
          const totalExpenses = aggregatedData.paidExpenses.reduce(
            (sum, e) => sum + (e.amount || 0), 0
          );
          
          const netIncome = totalRevenue - totalExpenses;
          
          return {
            amount: netIncome,
            transactions: [],
          };
        },
      };

      if (formulas[formula]) {
        const result = formulas[formula]();
        return {
          amount: isNegative ? -Math.abs(result.amount) : result.amount,
          transactions: result.transactions,
        };
      }

      return { amount: 0, transactions: [] };
    }

    case DATA_SOURCE_TYPES.STATIC: {
      const { defaultValue = 0 } = config;
      return {
        amount: isNegative ? -Math.abs(defaultValue) : defaultValue,
        transactions: [],
      };
    }

    default:
      return { amount: 0, transactions: [] };
  }
};

const buildBalanceSheetData = (structure, payments, expenses, bookings, vehicles, instructors, asOfDate) => {
  const aggregatedData = createBalanceSheetDataset(
    { payments, expenses, bookings, vehicles, instructors },
    asOfDate
  );
  
  const accountValues = {};
  const accountTransactions = {};

  const getSectionTotal = (categoryId, sectionId) => {
    const category = structure[categoryId];
    if (!category?.visible) return 0;
    
    const section = category.sections?.[sectionId];
    if (!section?.visible) return 0;
    
    return section.accounts
      .filter(a => a.visible)
      .reduce((sum, a) => sum + (accountValues[a.id] || 0), 0);
  };

  Object.entries(structure).forEach(([categoryId, category]) => {
    if (!category.visible) return;

    Object.entries(category.sections || {}).forEach(([sectionId, section]) => {
      if (!section.visible) return;

      section.accounts.forEach(account => {
        if (!account.visible) return;
        
        const result = calculateAccountValue(account, aggregatedData);
        accountValues[account.id] = result.amount;
        accountTransactions[account.id] = result.transactions;
      });
    });
  });

  const result = {
    assets: { total: 0, sections: {} },
    liabilities: { total: 0, sections: {} },
    equity: { total: 0, sections: {} },
  };

  Object.entries(structure.assets.sections || {}).forEach(([sectionId, section]) => {
    if (!section.visible) return;
    
    const sectionTotal = getSectionTotal('assets', sectionId);
    const accounts = section.accounts
      .filter(a => a.visible)
      .map(a => ({
        ...a,
        value: accountValues[a.id] || 0,
        transactions: accountTransactions[a.id] || [],
      }));
    
    result.assets.sections[sectionId] = {
      label: section.label,
      total: sectionTotal,
      accounts,
    };
    
    result.assets.total += sectionTotal;
  });

  Object.entries(structure.liabilities.sections || {}).forEach(([sectionId, section]) => {
    if (!section.visible) return;
    
    const sectionTotal = getSectionTotal('liabilities', sectionId);
    const accounts = section.accounts
      .filter(a => a.visible)
      .map(a => ({
        ...a,
        value: accountValues[a.id] || 0,
        transactions: accountTransactions[a.id] || [],
      }));
    
    result.liabilities.sections[sectionId] = {
      label: section.label,
      total: sectionTotal,
      accounts,
    };
    
    result.liabilities.total += sectionTotal;
  });

  Object.entries(structure.equity.sections || {}).forEach(([sectionId, section]) => {
    if (!section.visible) return;
    
    const sectionTotal = getSectionTotal('equity', sectionId);
    const accounts = section.accounts
      .filter(a => a.visible)
      .map(a => ({
        ...a,
        value: accountValues[a.id] || 0,
        transactions: accountTransactions[a.id] || [],
      }));
    
    result.equity.sections[sectionId] = {
      label: section.label,
      total: sectionTotal,
      accounts,
    };
    
    result.equity.total += sectionTotal;
  });

  result.totalLiabilitiesAndEquity = result.liabilities.total + result.equity.total;
  result.isBalanced = Math.abs(result.assets.total - result.totalLiabilitiesAndEquity) < 1;
  result.balanceDifference = result.assets.total - result.totalLiabilitiesAndEquity;
  result.accountValues = accountValues;
  result.accountTransactions = accountTransactions;

  const currentAssets = result.assets.sections?.currentAssets?.total || 0;
  const nonCurrentAssets = result.assets.sections?.nonCurrentAssets?.total || 0;
  const currentLiabilities = result.liabilities.sections?.currentLiabilities?.total || 0;
  
  result.ratios = {
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
    workingCapital: currentAssets - currentLiabilities,
    debtToEquityRatio: result.equity.total > 0 ? result.liabilities.total / result.equity.total : 0,
    equityRatio: result.assets.total > 0 ? result.equity.total / result.assets.total : 0,
  };

  return result;
};

const buildExportRows = (balanceSheet, showAccountCodes, showComparison, previousBalanceSheet) => {
  const rows = [];

  rows.push({
    label: "ASSETS",
    isSection: true,
    amount: balanceSheet.assets.total,
    previousAmount: showComparison ? previousBalanceSheet?.assets.total : null,
  });

  Object.entries(balanceSheet.assets.sections).forEach(([sectionKey, section]) => {
    rows.push({
      label: section.label,
      isSubsection: true,
      amount: section.total,
      previousAmount: showComparison ? previousBalanceSheet?.assets.sections[sectionKey]?.total : null,
      indent: 1,
    });

    section.accounts.forEach(account => {
      if (account.value === 0 && !showComparison) return;
      
      rows.push({
        label: account.name,
        accountCode: account.code,
        amount: account.value,
        previousAmount: showComparison 
          ? previousBalanceSheet?.assets.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value 
          : null,
        indent: 2,
      });
    });
  });

  rows.push({
    label: "Total Assets",
    isTotal: true,
    amount: balanceSheet.assets.total,
    previousAmount: showComparison ? previousBalanceSheet?.assets.total : null,
  });

  rows.push({ label: "", isSpacer: true });

  rows.push({
    label: "LIABILITIES",
    isSection: true,
    amount: balanceSheet.liabilities.total,
    previousAmount: showComparison ? previousBalanceSheet?.liabilities.total : null,
  });

  Object.entries(balanceSheet.liabilities.sections).forEach(([sectionKey, section]) => {
    rows.push({
      label: section.label,
      isSubsection: true,
      amount: section.total,
      previousAmount: showComparison ? previousBalanceSheet?.liabilities.sections[sectionKey]?.total : null,
      indent: 1,
    });

    section.accounts.forEach(account => {
      if (account.value === 0 && !showComparison) return;
      
      rows.push({
        label: account.name,
        accountCode: account.code,
        amount: account.value,
        previousAmount: showComparison 
          ? previousBalanceSheet?.liabilities.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value 
          : null,
        indent: 2,
      });
    });
  });

  rows.push({
    label: "Total Liabilities",
    isTotal: true,
    amount: balanceSheet.liabilities.total,
    previousAmount: showComparison ? previousBalanceSheet?.liabilities.total : null,
  });

  rows.push({ label: "", isSpacer: true });

  rows.push({
    label: "EQUITY",
    isSection: true,
    amount: balanceSheet.equity.total,
    previousAmount: showComparison ? previousBalanceSheet?.equity.total : null,
  });

  Object.entries(balanceSheet.equity.sections).forEach(([sectionKey, section]) => {
    rows.push({
      label: section.label,
      isSubsection: true,
      amount: section.total,
      previousAmount: showComparison ? previousBalanceSheet?.equity.sections[sectionKey]?.total : null,
      indent: 1,
    });

    section.accounts.forEach(account => {
      rows.push({
        label: account.name,
        accountCode: account.code,
        amount: account.value,
        previousAmount: showComparison 
          ? previousBalanceSheet?.equity.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value 
          : null,
        indent: 2,
      });
    });
  });

  rows.push({
    label: "Total Equity",
    isTotal: true,
    amount: balanceSheet.equity.total,
    previousAmount: showComparison ? previousBalanceSheet?.equity.total : null,
  });

  rows.push({ label: "", isSpacer: true });

  rows.push({
    label: "TOTAL LIABILITIES & EQUITY",
    isGrandTotal: true,
    amount: balanceSheet.totalLiabilitiesAndEquity,
    previousAmount: showComparison ? previousBalanceSheet?.totalLiabilitiesAndEquity : null,
  });

  return rows;
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

const exportToPDF = (rows, config, balanceSheet) => {
  const hasAccountCodes = config.showAccountCodes;
  const dateFormatted = format(parseISO(config.asOfDate), "MMMM d, yyyy");
  
  const safeCompanyName = escapeHTML(config.companyName);
  const safeReportTitle = escapeHTML(config.reportTitle);

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
    <p class="date-range">As of ${escapeHTML(dateFormatted)}</p>
    <p class="meta">Currency: EUR | Generated: ${escapeHTML(format(config.generatedAt, "MMM d, yyyy h:mm a"))}</p>
  </div>
  
  <p class="disclaimer">UNAUDITED - FOR MANAGEMENT USE ONLY</p>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Assets</div>
      <div class="kpi-value">${formatCurrencyRaw(balanceSheet.assets.total)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Liabilities</div>
      <div class="kpi-value ${balanceSheet.liabilities.total < 0 ? 'negative' : ''}">${formatCurrencyRaw(balanceSheet.liabilities.total)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Equity</div>
      <div class="kpi-value ${balanceSheet.equity.total >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(balanceSheet.equity.total)}</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Balance Check</div>
      <div class="kpi-value">${balanceSheet.isBalanced ? '✓ Balanced' : '⚠ Out of Balance'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${hasAccountCodes ? '<th class="code">Code</th>' : ''}
        <th>Account</th>
        <th class="right">Amount</th>
        ${config.showComparison ? '<th class="right">Prior</th><th class="right">Change</th><th class="right">Change %</th>' : ''}
      </tr>
    </thead>
    <tbody>`;

  let zebraIndex = 0;
  rows.forEach(row => {
    if (row.isSpacer) {
      htmlContent += '<tr style="height: 8px;"><td colspan="10"></td></tr>';
      zebraIndex = 0;
      return;
    }

    const isZebra = !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal && row.indent > 0 && zebraIndex % 2 === 1;
    if (row.indent > 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal) {
      zebraIndex++;
    }

    let rowClass = isZebra ? "zebra" : "";
    if (row.isGrandTotal) rowClass = "grand-total";
    else if (row.isTotal) rowClass = "total";
    else if (row.isSubsection) rowClass = "subsection";
    else if (row.isSection) rowClass = "section";

    const indentClass = row.indent === 1 ? "indent-1" : row.indent === 2 ? "indent-2" : "";
    
    htmlContent += `<tr class="${rowClass}">`;
    
    if (hasAccountCodes) {
      htmlContent += `<td class="code ${indentClass}">${row.accountCode || ""}</td>`;
    }

    htmlContent += `<td class="${indentClass}">${escapeHTML(row.label)}</td>`;

    const displayAmount = row.amount === 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal ? "—" : formatCurrencyRaw(row.amount);
    const amountClass = row.amount < 0 ? "negative" : "";
    htmlContent += `<td class="right ${amountClass}">${displayAmount}</td>`;

    if (config.showComparison && row.previousAmount !== undefined && row.previousAmount !== null) {
      const displayPrevious = formatCurrencyRaw(row.previousAmount);
      const prevClass = row.previousAmount < 0 ? "negative" : "muted";
      htmlContent += `<td class="right ${prevClass}">${displayPrevious}</td>`;
      
      const changeObj = formatChangeAmount(row.amount, row.previousAmount);
      const changeClass = changeObj?.isImprovement ? "positive" : "negative";
      htmlContent += `<td class="right ${changeClass}">${changeObj?.formatted || "—"}</td>`;
      
      if (row.previousAmount !== 0) {
        const changePercentObj = formatChangePercent(row.amount, row.previousAmount);
        const percentClass = changePercentObj?.isImprovement ? "positive" : "negative";
        htmlContent += `<td class="right ${percentClass}">${changePercentObj?.formatted || "N/A"}</td>`;
      } else {
        htmlContent += `<td class="right muted">N/A</td>`;
      }
    } else if (config.showComparison) {
      htmlContent += `<td class="right muted">—</td><td class="right muted">—</td><td class="right muted">—</td>`;
    }

    htmlContent += `</tr>`;
  });

  htmlContent += `
    </tbody>
  </table>
  <div class="footer">
    <p><strong>${safeCompanyName}</strong></p>
    <p>Report ID: BS-${format(config.generatedAt, "yyyyMMddHHmmss")} | Generated by DrivePro</p>
    <p>This report is prepared for internal management purposes and has not been audited.</p>
  </div>
</body>
</html>`;

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

const exportToExcel = (rows, config) => {
  const hasAccountCodes = config.showAccountCodes;
  const dateFormatted = format(parseISO(config.asOfDate), "MMMM d, yyyy");
  const generatedAtFormatted = format(config.generatedAt, "MMMM d, yyyy 'at' h:mm a");
  
  const headers = [];
  if (hasAccountCodes) headers.push("Code");
  headers.push("Account");
  headers.push("Amount");
  if (config.showComparison) {
    headers.push("Prior Period");
    headers.push("Change");
    headers.push("Change %");
  }
  const colCount = headers.length;

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
  <Style ss:ID="Total">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="TotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="GrandTotal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="GrandTotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
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
  <Worksheet ss:Name="Balance Sheet">
  <Table ss:DefaultColumnWidth="80" ss:DefaultRowHeight="18">
   ${hasAccountCodes ? '<Column ss:Width="60"/>' : ''}
   <Column ss:Width="220"/>
   <Column ss:Width="110"/>
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
     <Data ss:Type="String">As of ${escapeXML(dateFormatted)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Metadata">
     <Data ss:Type="String">Currency: EUR | Prepared for Management</Data>
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
    ${config.showComparison ? '<Cell ss:StyleID="Header"><Data ss:Type="String">Prior Period</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change %</Data></Cell>' : ''}
   </Row>`;

  let zebraIndex = 0;
  rows.forEach((row) => {
    if (row.isSpacer) {
      xmlContent += `\n   <Row ss:Height="6"><Cell ss:StyleID="Spacer"/></Row>`;
      zebraIndex = 0;
      return;
    }

    const isZebra = !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal && row.indent > 0 && zebraIndex % 2 === 1;
    if (row.indent > 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal) {
      zebraIndex++;
    }

    let rowHeight = 20;
    let labelStyle = isZebra ? "Zebra" : "Normal";
    let codeStyle = isZebra ? "ZebraCode" : "NormalCode";
    let amountStyle = isZebra ? "ZebraAmount" : "NormalAmount";

    if (row.isSection) {
      labelStyle = "Section";
      amountStyle = "SectionAmount";
      rowHeight = 24;
      zebraIndex = 0;
    } else if (row.isSubsection) {
      labelStyle = "Subsection";
      amountStyle = "SubsectionAmount";
      rowHeight = 22;
    } else if (row.isTotal) {
      labelStyle = "Total";
      amountStyle = "TotalAmount";
      rowHeight = 22;
    } else if (row.isGrandTotal) {
      labelStyle = "GrandTotal";
      amountStyle = "GrandTotalAmount";
      rowHeight = 30;
    }

    const indentSpaces = "   ".repeat(row.indent || 0);
    const displayLabel = row.indent > 0 && !row.isSection && !row.isSubsection ? indentSpaces + row.label : row.label;
    const safeLabel = escapeXML(displayLabel);
    const safeCode = escapeXML(row.accountCode || "");

    xmlContent += `\n   <Row ss:Height="${rowHeight}">`;

    if (hasAccountCodes) {
      xmlContent += `\n    <Cell ss:StyleID="${codeStyle}"><Data ss:Type="String">${safeCode}</Data></Cell>`;
    }

    xmlContent += `\n    <Cell ss:StyleID="${labelStyle}"><Data ss:Type="String">${safeLabel}</Data></Cell>`;

    if (row.amount === 0 && !row.isSection && !row.isSubsection && !row.isTotal && !row.isGrandTotal) {
      xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
    } else {
      xmlContent += `\n    <Cell ss:StyleID="${amountStyle}"><Data ss:Type="Number">${row.amount}</Data></Cell>`;
    }

    if (config.showComparison) {
      if (row.previousAmount === undefined || row.previousAmount === null) {
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
        xmlContent += `\n    <Cell ss:StyleID="NormalNA"><Data ss:Type="String">—</Data></Cell>`;
      } else {
        const prevAmountStyle = row.previousAmount < 0 ? 'NormalAmount' : amountStyle;
        xmlContent += `\n    <Cell ss:StyleID="${prevAmountStyle}"><Data ss:Type="Number">${row.previousAmount}</Data></Cell>`;

        const changeAmount = row.amount - row.previousAmount;
        const changeObj = formatChangeAmount(row.amount, row.previousAmount);
        const changeAmountStyle = changeObj?.isImprovement ? 'ChangeAmountPositive' : 'ChangeAmountNegative';
        xmlContent += `\n    <Cell ss:StyleID="${changeAmountStyle}"><Data ss:Type="Number">${changeAmount}</Data></Cell>`;

        if (row.previousAmount !== 0) {
          const changePercent = ((row.amount - row.previousAmount) / Math.abs(row.previousAmount));
          const changePercentObj = formatChangePercent(row.amount, row.previousAmount);
          const changePercentStyle = changePercentObj?.isImprovement ? "ChangePositive" : "ChangeNegative";
          xmlContent += `\n    <Cell ss:StyleID="${changePercentStyle}"><Data ss:Type="Number">${Math.abs(changePercent)}</Data></Cell>`;
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
     <Data ss:Type="String">Generated on ${escapeXML(generatedAtFormatted)} | Report ID: BS-${format(config.generatedAt, "yyyyMMddHHmmss")}</Data>
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
  const fileName = generateFileName("Balance Sheet", "xls", { start: config.asOfDate, end: config.asOfDate });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  };

const exportToCSV = (rows, config) => {
  const csvRows = [];
  const hasAccountCodes = config.showAccountCodes;

  csvRows.push([config.companyName]);
  csvRows.push([config.reportTitle]);
  csvRows.push([`As of: ${format(parseISO(config.asOfDate), "yyyy-MM-dd")}`]);
  csvRows.push([`Currency: EUR`]);
  csvRows.push([`Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
  csvRows.push(["UNAUDITED - FOR MANAGEMENT USE ONLY"]);
  csvRows.push([]);

  const headers = [];
  if (hasAccountCodes) headers.push("Account Code");
  headers.push("Account Name");
  headers.push("Amount (EUR)");
  if (config.showComparison) {
    headers.push("Prior Period (EUR)");
    headers.push("Change (EUR)");
    headers.push("Change %");
  }
  csvRows.push(headers.map(h => escapeCsv(h)));

  rows.forEach(row => {
    if (row.isSpacer) return;

    const csvRow = [];
    
    if (hasAccountCodes) {
      csvRow.push(escapeCsv(row.accountCode || ""));
    }

    const indent = "  ".repeat(row.indent || 0);
    csvRow.push(escapeCsv(indent + row.label));
    csvRow.push(row.amount.toFixed(2));

    if (config.showComparison) {
      if (row.previousAmount !== undefined && row.previousAmount !== null) {
        csvRow.push(row.previousAmount.toFixed(2));
        
        const changeAmount = row.amount - row.previousAmount;
        csvRow.push(changeAmount.toFixed(2));
        
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

  csvRows.push([]);
  csvRows.push(["---"]);
  csvRows.push([`Report ID: BS-${format(config.generatedAt, "yyyyMMddHHmmss")}`]);
  csvRows.push(["This report is prepared for internal management purposes and has not been audited."]);

  const csvContent = csvRows
    .map((row) => row.join(","))
    .join("\r\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("Balance Sheet", "csv", { start: config.asOfDate, end: config.asOfDate });
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
// COMPONENTS (matching P&L style)
// ============================================

const KPICard = memo(({ label, value, previousValue, icon, color, bgColor = "bg-white" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColor} rounded-xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        {previousValue != null && previousValue !== 0 && (
          <ChangeIndicator current={value} previous={previousValue} />
        )}
      </div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${typeof value === 'string' ? 'text-zinc-900' : (value < 0 ? 'text-red-600' : 'text-zinc-900')}`}>
        {typeof value === 'string' ? value : formatCurrency(value)}
      </div>
    </motion.div>
  );
});

const ChangeIndicator = memo(({ current, previous }) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return <span className="text-xs text-zinc-400">N/A</span>;
  
  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  const isImprovement = previous < 0 && current < 0 
  ? current > previous
  : change > 0;

  return (
  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
    isImprovement ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-[#fdeeed] text-[#e44138]"
  }`}>
      {isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
    </div>
  );
});

const CustomizeModal = memo(({ isOpen, onClose, structure, onUpdate }) => {
  const [localStructure, setLocalStructure] = useState(structure);
  const [activeCategory, setActiveCategory] = useState("assets");

  React.useEffect(() => {
    if (isOpen && structure) {
      setLocalStructure(JSON.parse(JSON.stringify(structure)));
    }
  }, [isOpen, structure]);

  if (!isOpen) return null;

  const handleAddAccount = (categoryId, sectionId) => {
    const newAccount = {
      id: generateId(),
      code: "",
      name: "New Account",
      visible: true,
      order: 999,
      dataSource: {
        type: DATA_SOURCE_TYPES.STATIC,
        config: { defaultValue: 0 }
      }
    };

    setLocalStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const section = newStructure[categoryId].sections[sectionId];
      section.accounts.push(newAccount);
      return newStructure;
    });
  };

  const handleUpdateAccount = (categoryId, sectionId, accountId, updates) => {
    setLocalStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const account = newStructure[categoryId].sections[sectionId].accounts.find(a => a.id === accountId);
      if (account) Object.assign(account, updates);
      return newStructure;
    });
  };

  const handleDeleteAccount = (categoryId, sectionId, accountId) => {
    setLocalStructure(prev => {
      const newStructure = JSON.parse(JSON.stringify(prev));
      const section = newStructure[categoryId].sections[sectionId];
      section.accounts = section.accounts.filter(a => a.id !== accountId);
      return newStructure;
    });
  };

  const handleSave = () => {
    onUpdate(localStructure);
    onClose();
    toast.success("Balance sheet structure updated");
  };

  const handleReset = () => {
    setLocalStructure(JSON.parse(JSON.stringify(DEFAULT_BALANCE_SHEET_STRUCTURE)));
    toast.info("Reset to default structure");
  };

  const categories = [
    { id: "assets", label: "Assets" },
    { id: "liabilities", label: "Liabilities" },
    { id: "equity", label: "Equity" },
  ];

  const currentCategory = localStructure[activeCategory];
  const sections = currentCategory ? Object.entries(currentCategory.sections) : [];

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
          className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900">Customize Balance Sheet</h3>
              <p className="text-sm text-zinc-500">Add accounts, edit labels, and control visibility</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="flex h-[60vh]">
            <div className="w-48 border-r border-zinc-200 p-4 overflow-y-auto">
              <nav className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeCategory === category.id
                        ? "bg-[#e8f4fa] text-[#3b82c4]"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <h4 className="font-semibold text-zinc-800 mb-4 uppercase">{currentCategory?.label}</h4>

              <div className="space-y-4">
                {sections.map(([sectionId, section]) => (
                  <div key={sectionId} className="border border-zinc-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-zinc-100 flex items-center justify-between">
                      <span className="font-medium text-zinc-700">{section.label}</span>
                      <button
                        onClick={() => handleAddAccount(activeCategory, sectionId)}
                        className="flex items-center gap-1 px-2 py-1 bg-[#e8f4fa] text-[#3b82c4] rounded text-xs font-medium hover:bg-[#d4eaf5] transition"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      {section.accounts
                        .sort((a, b) => a.order - b.order)
                        .map((account) => (
                          <div
                            key={account.id}
                            className={`flex items-center gap-3 p-2 rounded ${
                              account.visible ? "bg-white border border-zinc-200" : "bg-zinc-50 border border-zinc-200 opacity-60"
                            }`}
                          >
                            <input
                              type="text"
                              value={account.code}
                              onChange={(e) => handleUpdateAccount(activeCategory, sectionId, account.id, { code: e.target.value })}
                              className="w-16 px-2 py-1 text-sm border border-zinc-200 rounded font-mono"
                              placeholder="Code"
                            />
                            <input
                              type="text"
                              value={account.name}
                              onChange={(e) => handleUpdateAccount(activeCategory, sectionId, account.id, { name: e.target.value })}
                              className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded"
                              placeholder="Account name"
                            />
                            {account.dataSource?.type === DATA_SOURCE_TYPES.STATIC && (
                              <input
                                type="number"
                                value={account.dataSource.config.defaultValue || 0}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  handleUpdateAccount(activeCategory, sectionId, account.id, {
                                    dataSource: {
                                      ...account.dataSource,
                                      config: { defaultValue: newValue }
                                    }
                                  });
                                }}
                                className="w-24 px-2 py-1 text-sm border border-zinc-200 rounded text-right"
                                placeholder="Value"
                              />
                            )}
                            <button
                              onClick={() => handleUpdateAccount(activeCategory, sectionId, account.id, { visible: !account.visible })}
                              className={`p-1 rounded ${account.visible ? "text-[#3b82c4]" : "text-zinc-400"}`}
                            >
                              {account.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(activeCategory, sectionId, account.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm text-white bg-[#3b82c4] hover:bg-[#2563a3] rounded-lg transition font-medium"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

const AccountRow = memo(({
  label,
  amount,
  prevAmount,
  accountCode,
  indent = 0,
  showAccountCodes,
  showComparison,
  onClick,
}) => {
  const displayAmount = amount === 0 ? "—" : formatCurrency(amount);
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;

  return (
    <tr 
      className={`border-b border-zinc-50 transition-colors ${onClick ? 'hover:bg-zinc-50 cursor-pointer group' : ''}`}
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
          {onClick && (
            <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
          )}
        </div>
      </td>
      <td className={`py-2.5 px-4 text-right font-mono text-sm ${amount < 0 ? 'text-red-600' : 'text-zinc-700'}`}>
        {displayAmount}
      </td>
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

const SectionHeader = memo(({
  label,
  total,
  prevTotal,
  isExpanded,
  onToggle,
  showAccountCodes,
  showComparison,
  icon: Icon,
}) => {
  const changeAmount = prevTotal != null ? formatChangeAmount(total, prevTotal) : null;
  const changePercent = prevTotal != null ? formatChangePercent(total, prevTotal) : null;

  return (
    <tr
      className="bg-zinc-100 cursor-pointer hover:bg-zinc-200 transition-colors"
      onClick={onToggle}
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

const TotalRow = memo(({
  label,
  amount,
  prevAmount,
  isGrandTotal = false,
  showAccountCodes,
  showComparison,
}) => {
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;
  
  let rowClass = "border-t-2 border-zinc-300";
  let amountClass = amount < 0 ? "text-red-600" : "text-zinc-800";
  
  if (isGrandTotal) {
    rowClass = "bg-gradient-to-r from-indigo-50 to-violet-50 border-t-2 border-indigo-300";
    amountClass = amount >= 0 ? "text-emerald-700" : "text-red-700";
  }

  return (
    <tr className={rowClass}>
      {showAccountCodes && <td className="py-3 px-3 w-16"></td>}
      <td className={`py-3 px-4 font-bold ${isGrandTotal ? "text-base" : "text-sm"} text-zinc-900`}>
        {label}
      </td>
      <td className={`py-3 px-4 text-right font-bold ${isGrandTotal ? "text-base" : "text-sm"} font-mono ${amountClass}`}>
        {formatCurrency(amount)}
      </td>
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

const DrilldownPanel = memo(({ isOpen, onClose, label, accountCode, transactions, amount }) => {
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
                Account {accountCode} • {transactions.length} transactions
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
            {transactions && transactions.length > 0 ? (
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
                        {txn.payment_date || txn.expense_date || txn.created_date 
                          ? format(parseISO(txn.payment_date || txn.expense_date || txn.created_date), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-800">
                        {txn.description || txn.payment_type || txn.category || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500 font-mono">
                        {txn.reference || txn.id?.substring(0, 8) || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-zinc-800">
                        {formatCurrency(txn.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-zinc-500">
                No detailed transactions available
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function BalanceSheet() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    preset: "today",
    asOfDate: format(new Date(), "yyyy-MM-dd"),
    comparisonType: "previous_year",
    showAccountCodes: false,
    showComparison: true,
  });

  const [balanceSheetStructure, setBalanceSheetStructure] = usePersistedState(
    "balance_sheet_structure_v1",
    DEFAULT_BALANCE_SHEET_STRUCTURE,
    isValidBalanceSheetStructure
  );

  const [showFilters, setShowFilters] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    currentAssets: true,
    nonCurrentAssets: true,
    currentLiabilities: true,
    nonCurrentLiabilities: true,
    ownerEquity: true,
  });

  const [drilldown, setDrilldown] = useState(null);

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
    ...QUERY_CONFIG,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense?.list() || Promise.resolve([]),
    ...QUERY_CONFIG,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
    ...QUERY_CONFIG,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
    ...QUERY_CONFIG,
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
    ...QUERY_CONFIG,
  });

  const isLoading = loadingPayments || loadingExpenses || loadingBookings || loadingVehicles || loadingInstructors;

  const asOfDate = useMemo(() => {
    const today = new Date();
    
    switch (filters.preset) {
      case "today":
        return format(today, "yyyy-MM-dd");
      case "end_of_month":
        return format(endOfMonth(today), "yyyy-MM-dd");
      case "end_of_quarter":
        return format(endOfQuarter(today), "yyyy-MM-dd");
      case "end_of_year":
        return format(endOfYear(today), "yyyy-MM-dd");
      default:
        return filters.asOfDate;
    }
  }, [filters.preset, filters.asOfDate]);

  const comparisonDate = useMemo(() => {
    if (!filters.showComparison || filters.comparisonType === "none") {
      return null;
    }

    if (filters.comparisonType === "previous_year") {
      return format(subYears(parseISO(asOfDate), 1), "yyyy-MM-dd");
    }

    return null;
  }, [filters.showComparison, filters.comparisonType, asOfDate]);

  const balanceSheet = useMemo(() => {
    return buildBalanceSheetData(
      balanceSheetStructure,
      payments,
      expenses,
      bookings,
      vehicles,
      instructors,
      asOfDate
    );
  }, [balanceSheetStructure, payments, expenses, bookings, vehicles, instructors, asOfDate]);

  const previousBalanceSheet = useMemo(() => {
    if (!comparisonDate) return null;

    return buildBalanceSheetData(
      balanceSheetStructure,
      payments,
      expenses,
      bookings,
      vehicles,
      instructors,
      comparisonDate
    );
  }, [balanceSheetStructure, payments, expenses, bookings, vehicles, instructors, comparisonDate]);

  const colCount = useMemo(() => {
    let count = 2;
    if (filters.showAccountCodes) count += 1;
    if (filters.showComparison) count += 3;
    return count;
  }, [filters.showAccountCodes, filters.showComparison]);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const handleExport = useCallback((exportType) => {
    const exportConfig = {
      companyName: "DrivePro Driving School",
      reportTitle: "Balance Sheet",
      asOfDate,
      showAccountCodes: filters.showAccountCodes,
      showComparison: filters.showComparison && comparisonDate !== null,
      generatedAt: new Date(),
    };

    const rows = buildExportRows(balanceSheet, filters.showAccountCodes, filters.showComparison && comparisonDate !== null, previousBalanceSheet);

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(rows, exportConfig);
          toast.success("Excel file exported successfully");
          break;
        case "pdf":
          exportToPDF(rows, exportConfig, balanceSheet);
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
  }, [balanceSheet, previousBalanceSheet, filters, asOfDate, comparisonDate]);

  const handlePreset = useCallback((presetValue) => {
    setFilters(prev => ({ ...prev, preset: presetValue }));
  }, []);

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header (matching P&L) */}
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Balance Sheet</h1>
              <p className="text-sm text-zinc-500">
                As of {format(parseISO(asOfDate), "MMMM d, yyyy")}
                {comparisonDate && (
                  <>
                    <span className="mx-2">•</span>
                    Compared to {format(parseISO(comparisonDate), "MMMM d, yyyy")}
                  </>
                )}
                <span className="mx-2">•</span>
                Ireland
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
              onClick={() => setShowCustomize(true)}
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

        {/* KPI Cards (matching P&L) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <KPICard
            label="Total Assets"
            value={balanceSheet.assets.total}
            previousValue={previousBalanceSheet?.assets.total}
            icon={<Wallet className="w-4 h-4 text-[#3b82c4]" />}
            color="bg-[#e8f4fa]"
          />
          <KPICard
            label="Total Liabilities"
            value={balanceSheet.liabilities.total}
            previousValue={previousBalanceSheet?.liabilities.total}
            icon={<CreditCard className="w-4 h-4 text-[#e44138]" />}
            color="bg-[#fdeeed]"
          />
          <KPICard
            label="Total Equity"
            value={balanceSheet.equity.total}
            previousValue={previousBalanceSheet?.equity.total}
            icon={<PiggyBank className="w-4 h-4 text-[#5cb83a]" />}
            color="bg-[#eefbe7]"
          />
          <KPICard
            label="Balance Check"
            value={balanceSheet.isBalanced ? "✓ Balanced" : "⚠ Out of Balance"}
            icon={<Scale className={`w-4 h-4 ${balanceSheet.isBalanced ? 'text-[#5cb83a]' : 'text-[#e44138]'}`} />}
            color={balanceSheet.isBalanced ? "bg-[#d4f4c3]" : "bg-[#f9d4d2]"}
            bgColor={balanceSheet.isBalanced ? "bg-[#eefbe7]" : "bg-[#fdeeed]"}
          />
        </div>
      </motion.div>

      {/* Main Content Grid (matching P&L) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Filters Panel (matching P&L) */}
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
                </div>

                <div className="space-y-5">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      As of Date
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DATE_PRESETS.map((preset) => (
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

                  {/* Custom Date */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Custom Date</label>
                    <input
                      type="date"
                      value={filters.asOfDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, asOfDate: e.target.value, preset: "custom" }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                    />
                  </div>

                  {/* Comparison Type */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Compare To</label>
                    <select
                      value={filters.comparisonType}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        comparisonType: e.target.value,
                        showComparison: e.target.value !== "none"
                      }))}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] bg-white"
                    >
                      {COMPARISON_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
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
                        checked={filters.showAccountCodes}
                        onChange={(e) => setFilters(prev => ({ ...prev, showAccountCodes: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-zinc-700">Show Account Codes</span>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statement Table (matching P&L) */}
        <div className={showFilters ? "lg:col-span-4" : "lg:col-span-5"}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Table Header (matching P&L) */}
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f4fa] flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Statement of Financial Position</h3>
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
                    {filters.showComparison && comparisonDate && (
                      <>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Prior</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-28">Change</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-24">Change %</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {/* ASSETS */}
                  <SectionHeader
                    label="ASSETS"
                    total={balanceSheet.assets.total}
                    prevTotal={previousBalanceSheet?.assets.total}
                    isExpanded={true}
                    onToggle={() => {}}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                    icon={Wallet}
                  />

                  {Object.entries(balanceSheet.assets.sections).map(([sectionKey, section]) => (
                    <React.Fragment key={sectionKey}>
                      <SectionHeader
                        label={section.label}
                        total={section.total}
                        prevTotal={previousBalanceSheet?.assets.sections[sectionKey]?.total}
                        isExpanded={expandedSections[sectionKey]}
                        onToggle={() => toggleSection(sectionKey)}
                        showAccountCodes={filters.showAccountCodes}
                        showComparison={filters.showComparison && comparisonDate !== null}
                      />

                      {expandedSections[sectionKey] && section.accounts.map(account => {
                        if (account.value === 0 && !filters.showComparison) return null;
                        const transactions = account.transactions || [];
                        
                        return (
                          <AccountRow
                            key={account.id}
                            label={account.name}
                            amount={account.value}
                            prevAmount={previousBalanceSheet?.assets.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value}
                            accountCode={account.code}
                            indent={1}
                            showAccountCodes={filters.showAccountCodes}
                            showComparison={filters.showComparison && comparisonDate !== null}
                            onClick={transactions.length > 0 ? () => setDrilldown({ label: account.name, accountCode: account.code, transactions, amount: account.value }) : null}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}

                  <TotalRow
                    label="Total Assets"
                    amount={balanceSheet.assets.total}
                    prevAmount={previousBalanceSheet?.assets.total}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                  />

                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* LIABILITIES */}
                  <SectionHeader
                    label="LIABILITIES"
                    total={balanceSheet.liabilities.total}
                    prevTotal={previousBalanceSheet?.liabilities.total}
                    isExpanded={true}
                    onToggle={() => {}}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                    icon={CreditCard}
                  />

                  {Object.entries(balanceSheet.liabilities.sections).map(([sectionKey, section]) => (
                    <React.Fragment key={sectionKey}>
                      <SectionHeader
                        label={section.label}
                        total={section.total}
                        prevTotal={previousBalanceSheet?.liabilities.sections[sectionKey]?.total}
                        isExpanded={expandedSections[sectionKey]}
                        onToggle={() => toggleSection(sectionKey)}
                        showAccountCodes={filters.showAccountCodes}
                        showComparison={filters.showComparison && comparisonDate !== null}
                      />

                      {expandedSections[sectionKey] && section.accounts.map(account => {
                        if (account.value === 0 && !filters.showComparison) return null;
                        const transactions = account.transactions || [];
                        
                        return (
                          <AccountRow
                            key={account.id}
                            label={account.name}
                            amount={account.value}
                            prevAmount={previousBalanceSheet?.liabilities.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value}
                            accountCode={account.code}
                            indent={1}
                            showAccountCodes={filters.showAccountCodes}
                            showComparison={filters.showComparison && comparisonDate !== null}
                            onClick={transactions.length > 0 ? () => setDrilldown({ label: account.name, accountCode: account.code, transactions, amount: account.value }) : null}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}

                  <TotalRow
                    label="Total Liabilities"
                    amount={balanceSheet.liabilities.total}
                    prevAmount={previousBalanceSheet?.liabilities.total}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                  />

                  <tr className="h-3"><td colSpan={colCount}></td></tr>

                  {/* EQUITY */}
                  <SectionHeader
                    label="EQUITY"
                    total={balanceSheet.equity.total}
                    prevTotal={previousBalanceSheet?.equity.total}
                    isExpanded={true}
                    onToggle={() => {}}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                    icon={PiggyBank}
                  />

                  {Object.entries(balanceSheet.equity.sections).map(([sectionKey, section]) => (
                    <React.Fragment key={sectionKey}>
                      <SectionHeader
                        label={section.label}
                        total={section.total}
                        prevTotal={previousBalanceSheet?.equity.sections[sectionKey]?.total}
                        isExpanded={expandedSections[sectionKey]}
                        onToggle={() => toggleSection(sectionKey)}
                        showAccountCodes={filters.showAccountCodes}
                        showComparison={filters.showComparison && comparisonDate !== null}
                      />

                      {expandedSections[sectionKey] && section.accounts.map(account => {
                        const transactions = account.transactions || [];
                        
                        return (
                          <AccountRow
                            key={account.id}
                            label={account.name}
                            amount={account.value}
                            prevAmount={previousBalanceSheet?.equity.sections[sectionKey]?.accounts.find(a => a.id === account.id)?.value}
                            accountCode={account.code}
                            indent={1}
                            showAccountCodes={filters.showAccountCodes}
                            showComparison={filters.showComparison && comparisonDate !== null}
                            onClick={transactions.length > 0 ? () => setDrilldown({ label: account.name, accountCode: account.code, transactions, amount: account.value }) : null}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}

                  <TotalRow
                    label="Total Equity"
                    amount={balanceSheet.equity.total}
                    prevAmount={previousBalanceSheet?.equity.total}
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                  />

                  <tr className="h-4"><td colSpan={colCount}></td></tr>

                  {/* GRAND TOTAL */}
                  <TotalRow
                    label="TOTAL LIABILITIES & EQUITY"
                    amount={balanceSheet.totalLiabilitiesAndEquity}
                    prevAmount={previousBalanceSheet?.totalLiabilitiesAndEquity}
                    isGrandTotal
                    showAccountCodes={filters.showAccountCodes}
                    showComparison={filters.showComparison && comparisonDate !== null}
                  />
                </tbody>
              </table>
            </div>

            {/* Footer (matching P&L) */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Report ID: BS-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span>•</span>
                  <span>Currency: EUR</span>
                </div>
                <span>UNAUDITED - FOR MANAGEMENT USE ONLY</span>
              </div>
            </div>
          </div>

          {/* Info Box (matching P&L) */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border border-[#d4eaf5]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#d4eaf5] flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#3b82c4]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#2563a3]">Professional Balance Sheet</p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  This report follows standard accounting principles showing your financial position at a point in time. 
                  Click any account row to drill down into transactions. Export to Excel, PDF, or CSV for 
                  sharing with your accountant or for audit purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drilldown Panel */}
      <DrilldownPanel
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        label={drilldown?.label || ""}
        accountCode={drilldown?.accountCode || ""}
        transactions={drilldown?.transactions || []}
        amount={drilldown?.amount || 0}
      />

      <CustomizeModal
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        structure={balanceSheetStructure}
        onUpdate={setBalanceSheetStructure}
      />
    </div>
  );
}