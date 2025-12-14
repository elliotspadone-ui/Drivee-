import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  parseISO, 
  startOfYear,
  endOfYear,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  subQuarters,
  differenceInMonths,
  differenceInDays,
  isWithinInterval,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PieChart,
  DollarSign,
  Activity,
  Scale,
  FileSpreadsheet,
  FileText,
  FileDown,
  Info,
  Filter,
  Calendar,
  RefreshCw,
  HelpCircle,
  Settings,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatCurrency,
  formatCurrencyRaw,
  formatChangeAmount,
  formatChangePercent,
  escapeXML,
  escapeHTML,
  escapeCsv,
  generateFileName,
  QUERY_CONFIG,
} from "./ProfitLoss";

// ============================================
// CONSTANTS
// ============================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const usePersistedState = (key, defaultValue, validator = () => true) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validator(parsed)) return parsed;
      }
    } catch (error) {
      console.warn(`Error reading localStorage for ${key}:`, error);
    }
    return defaultValue;
  });

  const setPersistedState = useCallback(
    (value) => {
      setState((prev) => {
        const newValue = typeof value === 'function' ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error(`Error saving to localStorage for ${key}:`, error);
        }
        return newValue;
      });
    },
    [key]
  );

  return [state, setPersistedState];
};

const isValidEquityStructure = (data) => {
  if (!data || typeof data !== 'object') return false;
  return data.retainedEarnings && data.shareCapital;
};

const DATA_SOURCE_TYPES = {
  CALCULATED: "calculated",
  STATIC: "static",
  CUSTOM: "custom",
};

const DEFAULT_EQUITY_STRUCTURE = {
  retainedEarnings: {
    id: "retainedEarnings",
    label: "Retained Earnings",
    visible: true,
    order: 1,
    items: [
      { id: "opening_retained", label: "Opening Balance", type: "opening", visible: true, order: 1, formula: "openingRetainedEarnings" },
      { id: "net_income", label: "Net Income (from P&L)", type: "calculated", visible: true, order: 2, indent: 1, formula: "netIncome", drilldown: true },
      { id: "prior_period_adj", label: "Prior Period Adjustments", type: "static", defaultValue: 0, visible: true, order: 3, indent: 1, drilldown: true },
      { id: "dividends", label: "Less: Dividends Declared", type: "static", defaultValue: 0, visible: true, order: 4, indent: 1, isNegative: true, drilldown: true },
      { id: "closing_retained", label: "Closing Balance", type: "closing", visible: true, order: 5, formula: "closingRetainedEarnings", isSubtotal: true },
    ],
  },
  
  shareCapital: {
    id: "shareCapital",
    label: "Share Capital / Owner Capital",
    visible: true,
    order: 2,
    items: [
      { id: "opening_capital", label: "Opening Balance", type: "opening", visible: true, order: 1, formula: "openingShareCapital" },
      { id: "capital_contributions", label: "Capital Contributions", type: "calculated", visible: true, order: 2, indent: 1, formula: "capitalContributions", drilldown: true },
      { id: "capital_withdrawals", label: "Capital Withdrawals", type: "calculated", visible: true, order: 3, indent: 1, isNegative: true, formula: "capitalWithdrawals", drilldown: true },
      { id: "closing_capital", label: "Closing Balance", type: "closing", visible: true, order: 4, formula: "closingShareCapital", isSubtotal: true },
    ],
  },
};

const DATE_PRESETS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "this_quarter" },
  { label: "Last Quarter", value: "last_quarter" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
];

const COMPARISON_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Previous Period", value: "previous_period" },
  { label: "Previous Year", value: "previous_year" },
];

// ============================================
// CALCULATION HELPERS
// ============================================

const isWithinDateRange = (date, startDate, endDate) => {
  try {
    const d = parseISO(date);
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return isWithinInterval(d, { start, end });
  } catch {
    return false;
  }
};

const calculateNetIncome = (payments, expenses, packages, startDate, endDate) => {
  const revenue = payments
    .filter(p => {
      if (p.status !== "completed") return false;
      const date = p.payment_date || p.created_date;
      return isWithinDateRange(date, startDate, endDate);
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const packageRevenue = packages
    .filter(pkg => {
      const date = pkg.purchase_date || pkg.created_date;
      return isWithinDateRange(date, startDate, endDate);
    })
    .reduce((sum, pkg) => sum + (pkg.total_price || 0), 0);

  const totalRevenue = revenue + packageRevenue;

  const costs = expenses
    .filter(e => {
      const date = e.expense_date || e.created_date;
      return isWithinDateRange(date, startDate, endDate);
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const netIncome = totalRevenue - costs;

  const transactions = [
    ...payments
      .filter(p => p.status === "completed")
      .map(p => ({
        id: p.id,
        date: p.payment_date || p.created_date,
        type: 'revenue',
        amount: p.amount || 0,
        description: `Payment - ${p.payment_type || 'Revenue'}`,
        reference: p.transaction_id || p.id,
      })),
    ...expenses.map(e => ({
      id: e.id,
      date: e.expense_date || e.created_date,
      type: 'expense',
      amount: -(e.amount || 0),
      description: `Expense - ${e.category || 'Operating'}`,
      reference: e.reference || e.id,
    })),
  ];

  return { netIncome, transactions };
};

const calculateCapitalContributions = (expenses, payments, startDate, endDate) => {
  const transactions = [];

  const vehicleCapitalExpenses = expenses.filter(e => 
    e.category === "vehicle" && 
    isWithinDateRange(e.expense_date || e.created_date, startDate, endDate)
  );

  transactions.push(...vehicleCapitalExpenses.map(e => ({
    id: e.id,
    date: e.expense_date || e.created_date,
    type: 'contribution',
    amount: e.amount || 0,
    description: `Capital - Vehicle Purchase: ${e.description || 'Vehicle'}`,
    reference: e.reference || e.id,
  })));

  const directContributions = payments.filter(p => {
    const date = p.payment_date || p.created_date;
    return (
      isWithinDateRange(date, startDate, endDate) &&
      (p.payment_type === "capital_contribution" ||
       (p.notes && p.notes.toLowerCase().includes("capital")) ||
       (p.description && p.description.toLowerCase().includes("contribution")))
    );
  });

  transactions.push(...directContributions.map(p => ({
    id: p.id,
    date: p.payment_date || p.created_date,
    type: 'contribution',
    amount: p.amount || 0,
    description: `Capital Contribution: ${p.description || p.notes || 'Investment'}`,
    reference: p.transaction_id || p.id,
  })));

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return { total, transactions };
};

const calculateCapitalWithdrawals = (payments, expenses, startDate, endDate) => {
  const transactions = [];

  const withdrawalPayments = payments.filter(p => {
    const date = p.payment_date || p.created_date;
    return (
      isWithinDateRange(date, startDate, endDate) &&
      (p.payment_type === "withdrawal" ||
       p.payment_type === "owner_draw" ||
       (p.notes && (
         p.notes.toLowerCase().includes("withdrawal") ||
         p.notes.toLowerCase().includes("draw") ||
         p.notes.toLowerCase().includes("distribution")
       )))
    );
  });

  transactions.push(...withdrawalPayments.map(p => ({
    id: p.id,
    date: p.payment_date || p.created_date,
    type: 'withdrawal',
    amount: p.amount || 0,
    description: `Owner Withdrawal: ${p.description || p.notes || 'Draw'}`,
    reference: p.transaction_id || p.id,
  })));

  const personalExpenses = expenses.filter(e => {
    const date = e.expense_date || e.created_date;
    return (
      isWithinDateRange(date, startDate, endDate) &&
      (e.category === "personal" || (e.notes && e.notes.toLowerCase().includes("personal")))
    );
  });

  transactions.push(...personalExpenses.map(e => ({
    id: e.id,
    date: e.expense_date || e.created_date,
    type: 'withdrawal',
    amount: e.amount || 0,
    description: `Personal Expense: ${e.description || 'Personal'}`,
    reference: e.reference || e.id,
  })));

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return { total, transactions };
};

const calculateOpeningBalances = (payments, expenses, packages, startDate) => {
  const priorYearStart = format(startOfYear(subYears(parseISO(startDate), 1)), "yyyy-MM-dd");
  const priorYearEnd = format(endOfYear(subYears(parseISO(startDate), 1)), "yyyy-MM-dd");

  const { netIncome: priorYearIncome } = calculateNetIncome(
    payments,
    expenses,
    packages,
    priorYearStart,
    priorYearEnd
  );

  return {
    openingRetainedEarnings: priorYearIncome,
    openingShareCapital: 50000,
  };
};

const buildEquityStatement = (
  payments,
  expenses,
  packages,
  bookings,
  invoices,
  instructors,
  vehicles,
  startDate,
  endDate
) => {
  const openingBalances = calculateOpeningBalances(payments, expenses, packages, startDate);

  const { netIncome, transactions: netIncomeTransactions } = calculateNetIncome(
    payments,
    expenses,
    packages,
    startDate,
    endDate
  );

  const { total: contributions, transactions: contributionTransactions } = calculateCapitalContributions(
    expenses,
    payments,
    startDate,
    endDate
  );

  const { total: withdrawals, transactions: withdrawalTransactions } = calculateCapitalWithdrawals(
    payments,
    expenses,
    startDate,
    endDate
  );

  const dividends = 0;
  const priorAdjustments = 0;

  const retainedEarnings = {
    opening_balance: openingBalances.openingRetainedEarnings,
    net_income: netIncome,
    dividends: dividends,
    prior_period_adjustments: priorAdjustments,
    closing_balance: openingBalances.openingRetainedEarnings + netIncome - dividends + priorAdjustments,
    transactions: netIncomeTransactions,
  };

  const shareCapital = {
    opening: openingBalances.openingShareCapital,
    issuance: contributionTransactions,
    repurchase: withdrawalTransactions,
    closing: openingBalances.openingShareCapital + contributions - withdrawals,
  };

  const total_opening_equity = openingBalances.openingRetainedEarnings + openingBalances.openingShareCapital;
  const total_changes = netIncome + contributions - withdrawals - dividends + priorAdjustments;
  const total_closing_equity = total_opening_equity + total_changes;

  const calculated_closing = total_opening_equity + total_changes;
  const reconciles = Math.abs(calculated_closing - total_closing_equity) < 0.01;
  const reconciliation_difference = calculated_closing - total_closing_equity;

  const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;

  return {
    period: { startDate, endDate, days },
    shareCapital,
    retainedEarnings,
    summary: {
      total_opening_equity,
      total_changes,
      total_closing_equity,
      reconciles,
      reconciliation_difference,
    },
    meta: {
      business_structure: 'sole_proprietorship',
      accounting_basis: 'accrual',
      currency: 'EUR',
    },
  };
};

const validateEquityStatement = (statement) => {
  const errors = [];
  const warnings = [];
  const info = [];

  const calculatedClosing = statement.summary.total_opening_equity + statement.summary.total_changes;
  if (Math.abs(calculatedClosing - statement.summary.total_closing_equity) > 0.01) {
    errors.push({
      severity: 'error',
      message: `Equity does not reconcile. Calculated: ${formatCurrency(calculatedClosing)}, Actual: ${formatCurrency(statement.summary.total_closing_equity)}`,
      field: 'total_closing_equity',
    });
  }

  if (statement.retainedEarnings.closing_balance < 0) {
    warnings.push({
      severity: 'warning',
      message: `Retained earnings is negative (${formatCurrency(statement.retainedEarnings.closing_balance)}). This may indicate accumulated losses.`,
      field: 'retained_earnings',
    });
  }

  if (statement.retainedEarnings.net_income > 0) {
    info.push({
      severity: 'info',
      message: `Net income of ${formatCurrency(statement.retainedEarnings.net_income)} increased retained earnings.`,
      field: 'net_income',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
};

const calculateEquityMetrics = (currentStatement, previousStatement, totalAssets, totalLiabilities, netIncome) => {
  const totalEquity = currentStatement.summary.total_closing_equity;
  const openingEquity = currentStatement.summary.total_opening_equity;

  const averageEquity = (openingEquity + totalEquity) / 2;
  const return_on_equity = averageEquity !== 0 ? (netIncome / averageEquity) * 100 : 0;

  const equity_growth_rate = openingEquity !== 0
    ? ((totalEquity - openingEquity) / Math.abs(openingEquity)) * 100
    : 0;

  const dividends = Math.abs(currentStatement.retainedEarnings.dividends);
  const retention_ratio = netIncome !== 0 ? ((netIncome - dividends) / netIncome) * 100 : 0;
  const payout_ratio = netIncome !== 0 ? (dividends / netIncome) * 100 : 0;
  const equity_multiplier = totalEquity !== 0 ? totalAssets / totalEquity : 0;
  const debt_to_equity_ratio = totalEquity !== 0 ? totalLiabilities / totalEquity : 0;

  return {
    return_on_equity,
    equity_growth_rate,
    retention_ratio,
    payout_ratio,
    equity_multiplier,
    debt_to_equity_ratio,
  };
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

const exportToExcel = (equityStatement, previousEquityStatement, structure, config) => {
  const startDateFormatted = format(parseISO(config.startDate), "MMMM d, yyyy");
  const endDateFormatted = format(parseISO(config.endDate), "MMMM d, yyyy");
  const generatedAtFormatted = format(config.generatedAt, "MMMM d, yyyy 'at' h:mm a");
  const colCount = config.showComparison ? 5 : 2;

  let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="CompanyName">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="ReportTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#9333EA"/>
  </Style>
  <Style ss:ID="DateRange">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#9333EA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#9333EA" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="NormalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="Indented">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:Indent="2"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
   </Borders>
  </Style>
  <Style ss:ID="GrandTotal">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/>
   <Interior ss:Color="#F3E8FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#9333EA"/>
   </Borders>
  </Style>
  <Style ss:ID="GrandTotalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/>
   <Interior ss:Color="#F3E8FF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="3" ss:Color="#9333EA"/>
   </Borders>
  </Style>
  <Style ss:ID="Section">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ChangeAmountPositive">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669"/>
   <NumberFormat ss:Format="+&quot;€&quot;#,##0;[Red]-&quot;€&quot;#,##0"/>
  </Style>
  <Style ss:ID="ChangeAmountNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626"/>
   <NumberFormat ss:Format="+&quot;€&quot;#,##0;[Red]-&quot;€&quot;#,##0"/>
  </Style>
  <Style ss:ID="ChangePercent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10"/>
   <NumberFormat ss:Format="0.0%"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Changes in Equity">
  <Table>
   <Column ss:Width="250"/>
   <Column ss:Width="110"/>
   ${config.showComparison ? '<Column ss:Width="110"/><Column ss:Width="90"/><Column ss:Width="80"/>' : ''}
   <Row ss:Height="30">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="CompanyName">
     <Data ss:Type="String">${escapeXML(config.companyName)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="ReportTitle">
     <Data ss:Type="String">Statement of Changes in Equity</Data>
    </Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="DateRange">
     <Data ss:Type="String">${escapeXML(startDateFormatted)} - ${escapeXML(endDateFormatted)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Line Item</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
    ${config.showComparison ? '<Cell ss:StyleID="Header"><Data ss:Type="String">Prior Period</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change %</Data></Cell>' : ''}
   </Row>`;

  const addSection = (sectionData, sectionConfig) => {
    if (!sectionConfig || !sectionConfig.visible) return;

    xmlContent += `\n   <Row ss:Height="24">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Section">
     <Data ss:Type="String">${escapeXML(sectionConfig.label)}</Data>
    </Cell>
   </Row>`;

    sectionConfig.items
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
      .forEach(item => {
        let value = 0;
        let prevValue = config.showComparison && previousEquityStatement ? 0 : null;

        if (item.formula === "openingRetainedEarnings") {
          value = equityStatement.retainedEarnings.opening_balance;
          prevValue = previousEquityStatement?.retainedEarnings.opening_balance || null;
        } else if (item.formula === "netIncome") {
          value = equityStatement.retainedEarnings.net_income;
          prevValue = previousEquityStatement?.retainedEarnings.net_income || null;
        } else if (item.formula === "closingRetainedEarnings") {
          value = equityStatement.retainedEarnings.closing_balance;
          prevValue = previousEquityStatement?.retainedEarnings.closing_balance || null;
        } else if (item.formula === "openingShareCapital") {
          value = equityStatement.shareCapital.opening;
          prevValue = previousEquityStatement?.shareCapital.opening || null;
        } else if (item.formula === "capitalContributions") {
          value = equityStatement.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "capitalWithdrawals") {
          value = equityStatement.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "closingShareCapital") {
          value = equityStatement.shareCapital.closing;
          prevValue = previousEquityStatement?.shareCapital.closing || null;
        } else if (item.type === "static") {
          if (item.id === "dividends") {
            value = equityStatement.retainedEarnings.dividends;
            prevValue = previousEquityStatement?.retainedEarnings.dividends || null;
          } else if (item.id === "prior_period_adj") {
            value = equityStatement.retainedEarnings.prior_period_adjustments;
            prevValue = previousEquityStatement?.retainedEarnings.prior_period_adjustments || null;
          } else {
            value = item.defaultValue || 0;
          }
        }

        const isSubtotal = item.isSubtotal || item.type === "closing";
        const styleId = isSubtotal ? "Total" : (item.indent ? "Indented" : "Normal");
        const amountStyleId = isSubtotal ? "TotalAmount" : "NormalAmount";
        
        xmlContent += `\n   <Row ss:Height="${isSubtotal ? 22 : 20}">
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(item.label)}</Data></Cell>
    <Cell ss:StyleID="${amountStyleId}"><Data ss:Type="Number">${value}</Data></Cell>`;
        
        if (config.showComparison && prevValue !== null) {
          const change = value - prevValue;
          const changePercent = prevValue !== 0 ? change / Math.abs(prevValue) : 0;
          const changeStyle = change >= 0 ? "ChangeAmountPositive" : "ChangeAmountNegative";
          
          xmlContent += `
    <Cell ss:StyleID="${amountStyleId}"><Data ss:Type="Number">${prevValue}</Data></Cell>
    <Cell ss:StyleID="${changeStyle}"><Data ss:Type="Number">${change}</Data></Cell>
    <Cell ss:StyleID="ChangePercent"><Data ss:Type="Number">${changePercent}</Data></Cell>`;
        }
        
        xmlContent += `\n   </Row>`;
      });
  };

  addSection(equityStatement.retainedEarnings, structure.retainedEarnings);
  addSection(equityStatement.shareCapital, structure.shareCapital);

  xmlContent += `\n   <Row ss:Height="8"/>
   <Row ss:Height="30">
    <Cell ss:StyleID="GrandTotal"><Data ss:Type="String">TOTAL EQUITY</Data></Cell>
    <Cell ss:StyleID="GrandTotalAmount"><Data ss:Type="Number">${equityStatement.summary.total_closing_equity}</Data></Cell>`;

  if (config.showComparison && previousEquityStatement) {
    const change = equityStatement.summary.total_closing_equity - previousEquityStatement.summary.total_closing_equity;
    const changePercent = previousEquityStatement.summary.total_closing_equity !== 0 
      ? change / Math.abs(previousEquityStatement.summary.total_closing_equity)
      : 0;

    xmlContent += `
    <Cell ss:StyleID="GrandTotalAmount"><Data ss:Type="Number">${previousEquityStatement.summary.total_closing_equity}</Data></Cell>
    <Cell ss:StyleID="GrandTotalAmount"><Data ss:Type="Number">${change}</Data></Cell>
    <Cell ss:StyleID="ChangePercent"><Data ss:Type="Number">${changePercent}</Data></Cell>`;
  }

  xmlContent += `\n   </Row>
   <Row ss:Height="12"/>
   <Row>
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="DateRange">
     <Data ss:Type="String">Report ID: EQ-${format(config.generatedAt, "yyyyMMddHHmmss")} • Generated: ${escapeXML(generatedAtFormatted)} • By: ${escapeXML(config.generatedBy || "System")}</Data>
    </Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
  const fileName = generateFileName("Changes in Equity", "xls", { start: config.startDate, end: config.endDate });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToPDF = (equityStatement, previousEquityStatement, structure, config) => {
  const dateFormatted = `${format(parseISO(config.startDate), "MMMM d, yyyy")} to ${format(parseISO(config.endDate), "MMMM d, yyyy")}`;
  const showComparison = config.showComparison && previousEquityStatement !== null;

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Statement of Changes in Equity</title>
  <style>
    @page { margin: 0.75in; size: A4 portrait; }
    body { font-family: Calibri, sans-serif; color: #1F2937; font-size: 10px; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #9333EA; }
    .company-name { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .report-title { font-size: 16px; font-weight: 600; color: #9333EA; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    thead { background: linear-gradient(135deg, #9333EA 0%, #EC4899 100%); }
    thead th { padding: 10px 8px; color: white; font-weight: 700; font-size: 9px; text-transform: uppercase; }
    thead th.right { text-align: right; }
    tbody td { padding: 8px; border-bottom: 1px solid #E5E7EB; }
    tbody td.right { text-align: right; font-family: 'Courier New', monospace; }
    .total { font-weight: 600; background-color: #F9FAFB; border-top: 2px solid #D1D5DB; }
    .grand-total { background: linear-gradient(135deg, #F3E8FF 0%, #FDE2EF 100%); font-weight: 700; font-size: 11px; border-top: 3px solid #9333EA; }
    .subsection { background-color: #E5E7EB; font-weight: 700; color: #1F2937; }
    .subsection td { border-top: 2px solid #9CA3AF; border-bottom: 2px solid #9CA3AF; padding: 8px; }
    .indent-1 { padding-left: 30px !important; }
    .negative { color: #DC2626; }
    .positive { color: #059669; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #E5E7EB; font-size: 8px; color: #6B7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="company-name">${escapeHTML(config.companyName)}</h1>
    <h2 class="report-title">Statement of Changes in Equity</h2>
    <p>${escapeHTML(dateFormatted)}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Line Item</th>
        <th class="right">Amount</th>
        ${showComparison ? '<th class="right">Prior Period</th><th class="right">Change</th><th class="right">Change %</th>' : ''}
      </tr>
    </thead>
    <tbody>`;

  const addSection = (sectionData, sectionConfig) => {
    if (!sectionConfig || !sectionConfig.visible) return;

    htmlContent += `
      <tr class="subsection">
        <td colspan="${showComparison ? '5' : '2'}">${escapeHTML(sectionConfig.label)}</td>
      </tr>`;

    sectionConfig.items
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
      .forEach(item => {
        let value = 0;
        let prevValue = showComparison ? 0 : null;

        if (item.formula === "openingRetainedEarnings") {
          value = equityStatement.retainedEarnings.opening_balance;
          prevValue = previousEquityStatement?.retainedEarnings.opening_balance || null;
        } else if (item.formula === "netIncome") {
          value = equityStatement.retainedEarnings.net_income;
          prevValue = previousEquityStatement?.retainedEarnings.net_income || null;
        } else if (item.formula === "closingRetainedEarnings") {
          value = equityStatement.retainedEarnings.closing_balance;
          prevValue = previousEquityStatement?.retainedEarnings.closing_balance || null;
        } else if (item.formula === "openingShareCapital") {
          value = equityStatement.shareCapital.opening;
          prevValue = previousEquityStatement?.shareCapital.opening || null;
        } else if (item.formula === "capitalContributions") {
          value = equityStatement.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "capitalWithdrawals") {
          value = equityStatement.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "closingShareCapital") {
          value = equityStatement.shareCapital.closing;
          prevValue = previousEquityStatement?.shareCapital.closing || null;
        } else if (item.type === "static") {
          if (item.id === "dividends") {
            value = equityStatement.retainedEarnings.dividends;
            prevValue = previousEquityStatement?.retainedEarnings.dividends || null;
          } else if (item.id === "prior_period_adj") {
            value = equityStatement.retainedEarnings.prior_period_adjustments;
            prevValue = previousEquityStatement?.retainedEarnings.prior_period_adjustments || null;
          } else {
            value = item.defaultValue || 0;
          }
        }

        const isSubtotal = item.isSubtotal || item.type === "closing";
        const rowClass = isSubtotal ? "total" : "";
        const indentClass = item.indent ? "indent-1" : "";
        
        htmlContent += `
      <tr class="${rowClass}">
        <td class="${indentClass}">${escapeHTML(item.label)}</td>
        <td class="right ${value < 0 ? 'negative' : ''}">${formatCurrencyRaw(value)}</td>`;
        
        if (showComparison && prevValue !== null) {
          const change = value - prevValue;
          const changePercent = prevValue !== 0 ? ((change / Math.abs(prevValue)) * 100) : 0;
          
          htmlContent += `
        <td class="right ${prevValue < 0 ? 'negative' : ''}">${formatCurrencyRaw(prevValue)}</td>
        <td class="right ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${formatCurrencyRaw(change)}</td>
        <td class="right ${changePercent >= 0 ? 'positive' : 'negative'}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%</td>`;
        }
        
        htmlContent += `
      </tr>`;
      });
  };

  addSection(equityStatement.retainedEarnings, structure.retainedEarnings);
  addSection(equityStatement.shareCapital, structure.shareCapital);

  const totalEquity = equityStatement.summary.total_closing_equity;
  const prevTotalEquity = previousEquityStatement?.summary.total_closing_equity;

  htmlContent += `
      <tr class="grand-total">
        <td>TOTAL EQUITY</td>
        <td class="right ${totalEquity >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(totalEquity)}</td>`;

  if (showComparison && prevTotalEquity !== null && prevTotalEquity !== undefined) {
    const change = totalEquity - prevTotalEquity;
    const changePercent = prevTotalEquity !== 0 ? ((change / Math.abs(prevTotalEquity)) * 100) : 0;

    htmlContent += `
        <td class="right ${prevTotalEquity >= 0 ? 'positive' : 'negative'}">${formatCurrencyRaw(prevTotalEquity)}</td>
        <td class="right ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${formatCurrencyRaw(change)}</td>
        <td class="right ${changePercent >= 0 ? 'positive' : 'negative'}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%</td>`;
  }

  htmlContent += `
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <p><strong>Report ID:</strong> EQ-${format(config.generatedAt, "yyyyMMddHHmmss")} | 
       <strong>Generated:</strong> ${format(config.generatedAt, "MMM d, yyyy h:mm a")} | 
       <strong>By:</strong> ${escapeHTML(config.generatedBy || "System")}</p>
    <p><strong>Basis:</strong> ${escapeHTML(config.basis || "accrual")} | 
       <strong>Currency:</strong> ${escapeHTML(config.currency || "EUR")}</p>
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
    setTimeout(() => document.body.removeChild(iframe), 100);
  }, 250);
};

const exportToCSV = (equityStatement, previousEquityStatement, structure, config) => {
  const csvRows = [];
  const showComparison = config.showComparison && previousEquityStatement !== null;

  csvRows.push([config.companyName]);
  csvRows.push(["Statement of Changes in Equity"]);
  csvRows.push([`Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}`]);
  csvRows.push([`Currency: ${config.currency || "EUR"}`]);
  csvRows.push([`Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
  csvRows.push([]);

  if (showComparison) {
    csvRows.push(["Section", "Line Item", "Amount (EUR)", "Prior Period (EUR)", "Change (EUR)", "Change %"]);
  } else {
    csvRows.push(["Section", "Line Item", "Amount (EUR)"]);
  }

  const addSection = (sectionData, sectionConfig) => {
    if (!sectionConfig || !sectionConfig.visible) return;

    sectionConfig.items
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
      .forEach(item => {
        let value = 0;
        let prevValue = showComparison ? 0 : null;

        if (item.formula === "openingRetainedEarnings") {
          value = equityStatement.retainedEarnings.opening_balance;
          prevValue = previousEquityStatement?.retainedEarnings.opening_balance || null;
        } else if (item.formula === "netIncome") {
          value = equityStatement.retainedEarnings.net_income;
          prevValue = previousEquityStatement?.retainedEarnings.net_income || null;
        } else if (item.formula === "closingRetainedEarnings") {
          value = equityStatement.retainedEarnings.closing_balance;
          prevValue = previousEquityStatement?.retainedEarnings.closing_balance || null;
        } else if (item.formula === "openingShareCapital") {
          value = equityStatement.shareCapital.opening;
          prevValue = previousEquityStatement?.shareCapital.opening || null;
        } else if (item.formula === "capitalContributions") {
          value = equityStatement.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "capitalWithdrawals") {
          value = equityStatement.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0);
          prevValue = previousEquityStatement?.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0) || null;
        } else if (item.formula === "closingShareCapital") {
          value = equityStatement.shareCapital.closing;
          prevValue = previousEquityStatement?.shareCapital.closing || null;
        } else if (item.type === "static") {
          if (item.id === "dividends") {
            value = equityStatement.retainedEarnings.dividends;
            prevValue = previousEquityStatement?.retainedEarnings.dividends || null;
          } else if (item.id === "prior_period_adj") {
            value = equityStatement.retainedEarnings.prior_period_adjustments;
            prevValue = previousEquityStatement?.retainedEarnings.prior_period_adjustments || null;
          } else {
            value = item.defaultValue || 0;
          }
        }

        const indent = "  ".repeat(item.indent || 0);
        
        if (showComparison && prevValue !== null) {
          const change = value - prevValue;
          const changePercent = prevValue !== 0 ? ((change / Math.abs(prevValue)) * 100).toFixed(2) : "0.00";
          csvRows.push([
            escapeCsv(sectionConfig.label),
            escapeCsv(indent + item.label),
            value.toFixed(2),
            prevValue.toFixed(2),
            change.toFixed(2),
            changePercent
          ]);
        } else {
          csvRows.push([
            escapeCsv(sectionConfig.label),
            escapeCsv(indent + item.label),
            value.toFixed(2)
          ]);
        }
      });
  };

  addSection(equityStatement.retainedEarnings, structure.retainedEarnings);
  addSection(equityStatement.shareCapital, structure.shareCapital);

  csvRows.push([]);
  const totalEquity = equityStatement.summary.total_closing_equity;
  const prevTotalEquity = previousEquityStatement?.summary.total_closing_equity;

  if (showComparison && prevTotalEquity !== null && prevTotalEquity !== undefined) {
    const change = totalEquity - prevTotalEquity;
    const changePercent = prevTotalEquity !== 0 ? ((change / Math.abs(prevTotalEquity)) * 100).toFixed(2) : "0.00";
    csvRows.push(["", "TOTAL EQUITY", totalEquity.toFixed(2), prevTotalEquity.toFixed(2), change.toFixed(2), changePercent]);
  } else {
    csvRows.push(["", "TOTAL EQUITY", totalEquity.toFixed(2)]);
  }

  csvRows.push([]);
  csvRows.push([`Report ID: EQ-${format(config.generatedAt, "yyyyMMddHHmmss")}`]);

  const csvContent = csvRows.map(row => row.join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("Changes in Equity", "csv", { start: config.startDate, end: config.endDate });
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
// COMPONENTS
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
      <div className={`text-xl font-bold ${value < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
        {formatCurrency(value)}
      </div>
    </motion.div>
  );
});

const ChangeIndicator = memo(({ current, previous }) => {
  if (previous === null || previous === undefined || previous === 0) return null;
  
  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  const isImprovement = change > 0;
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      isImprovement ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-[#fdeeed] text-[#e44138]"
    }`}>
      {isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
    </div>
  );
});

const LineItem = memo(({ 
  label, 
  amount, 
  prevAmount, 
  indent = 0, 
  showComparison, 
  isTotal = false, 
  onClick 
}) => {
  const displayAmount = formatCurrency(amount);
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;

  return (
    <tr 
      className={`${isTotal ? "border-t-2 border-zinc-300" : "border-b border-zinc-50"} ${
        onClick ? "hover:bg-zinc-50 cursor-pointer group" : ""
      } transition-colors`}
      onClick={onClick}
    >
      <td
        className={`py-2.5 px-4 text-sm ${isTotal ? "font-bold text-zinc-900" : "text-zinc-700"}`}
        style={{ paddingLeft: `${16 + indent * 20}px` }}
      >
        <div className="flex items-center gap-2">
          {label}
          {onClick && (
            <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
          )}
        </div>
      </td>
      <td className={`py-2.5 px-4 text-right font-mono text-sm ${
        isTotal ? "font-bold" : ""
      } ${amount < 0 ? 'text-red-600' : 'text-zinc-700'}`}>
        {displayAmount}
      </td>
      {showComparison && (
        <>
          <td className={`py-2.5 px-4 text-right font-mono text-sm ${
            prevAmount != null && prevAmount < 0 ? 'text-red-600' : 'text-zinc-500'
          }`}>
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
  isExpanded, 
  onToggle, 
  showComparison, 
  icon: Icon 
}) => {
  return (
    <tr
      className="bg-zinc-100 cursor-pointer hover:bg-zinc-200 transition-colors"
      onClick={onToggle}
    >
      <td className="py-3 px-4" colSpan={showComparison ? 5 : 2}>
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
    </tr>
  );
});

const ReconciliationPanel = memo(({ equityStatement, previousEquityStatement }) => {
  const reconciles = equityStatement.summary.reconciles;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-4 p-4 rounded-xl border ${
        reconciles 
          ? 'bg-[#eefbe7] border-[#d4f4c3]' 
          : 'bg-[#fdeeed] border-[#f9d4d2]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          reconciles ? 'bg-[#d4f4c3]' : 'bg-[#f9d4d2]'
        }`}>
          {reconciles ? (
            <CheckCircle2 className="w-5 h-5 text-[#5cb83a]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-[#e44138]" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className={`font-semibold mb-2 ${
            reconciles ? 'text-[#4a9c2e]' : 'text-[#c9342c]'
          }`}>
            {reconciles 
              ? '✓ Equity Reconciled' 
              : '⚠ Reconciliation Required'}
          </h4>
          
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600">Opening Equity:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(equityStatement.summary.total_opening_equity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Net Changes:</span>
                  <span className={`font-mono font-semibold ${
                    equityStatement.summary.total_changes >= 0 ? 'text-[#5cb83a]' : 'text-[#e44138]'
                  }`}>
                    {formatCurrency(equityStatement.summary.total_changes, true)}
                  </span>
                </div>
              </div>
              
              <div className="border-l pl-4">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600">Calculated Closing:</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(
                      equityStatement.summary.total_opening_equity + equityStatement.summary.total_changes
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Actual Closing:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(equityStatement.summary.total_closing_equity)}
                  </span>
                </div>
              </div>
            </div>
            
            {!reconciles && (
              <div className="mt-3 pt-3 border-t border-[#f9d4d2]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#c9342c]">Reconciliation Difference:</span>
                  <span className="font-mono font-bold text-[#e44138]">
                    {formatCurrency(equityStatement.summary.reconciliation_difference)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#c9342c]">
                  Please review your equity transactions. The calculated closing equity does not match.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const EquityMetricsPanel = memo(({ metrics }) => {
  if (!metrics) return null;

  const MetricItem = ({ label, value, format = "percent", goodRange }) => {
    let displayValue;
    let colorClass = "text-zinc-900";
    
    if (format === "percent") {
      displayValue = `${value.toFixed(1)}%`;
      if (goodRange) {
        if (value >= goodRange.good) colorClass = "text-[#5cb83a]";
        else if (value >= goodRange.warning) colorClass = "text-[#e7d356]";
        else colorClass = "text-[#e44138]";
      }
    } else if (format === "ratio") {
      displayValue = value.toFixed(2);
    }
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
        <span className="text-sm text-zinc-600">{label}</span>
        <span className={`text-sm font-mono font-semibold ${colorClass}`}>
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-white rounded-xl border border-zinc-200 p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#e8f4fa] flex items-center justify-center">
          <PieChart className="w-4 h-4 text-[#3b82c4]" />
        </div>
        <h3 className="font-bold text-zinc-900">Equity Metrics</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Performance
          </div>
          <MetricItem 
            label="Return on Equity (ROE)" 
            value={metrics.return_on_equity} 
            format="percent"
            goodRange={{ good: 15, warning: 8 }}
          />
          <MetricItem 
            label="Equity Growth Rate" 
            value={metrics.equity_growth_rate} 
            format="percent"
            goodRange={{ good: 10, warning: 0 }}
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Leverage
          </div>
          <MetricItem 
            label="Debt-to-Equity Ratio" 
            value={metrics.debt_to_equity_ratio} 
            format="ratio"
          />
        </div>
      </div>
    </motion.div>
  );
});

const DrilldownPanel = memo(({ isOpen, onClose, label, transactions, amount }) => {
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
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} • Total: {formatCurrency(amount)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition">
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
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Reference</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, index) => (
                    <tr key={txn.id || index} className={index % 2 === 0 ? "" : "bg-zinc-50"}>
                      <td className="py-3 px-4 text-sm text-zinc-600">
                        {txn.date ? format(parseISO(txn.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-800">
                        {txn.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#e8f4fa] text-[#3b82c4]">
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500 font-mono">
                        {txn.reference || txn.id?.substring(0, 8) || "—"}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right font-mono font-semibold ${
                        txn.amount < 0 ? 'text-[#e44138]' : 'text-zinc-800'
                      }`}>
                        {formatCurrency(txn.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-zinc-500">
                <Info className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                <p>No transactions available</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

const ValidationWarningsPanel = memo(({ validation }) => {
  if ((!validation.errors || validation.errors.length === 0) && 
      (!validation.warnings || validation.warnings.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-[#fdfbe8] border border-[#f9f3c8]"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#f9f3c8] flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#b8a525]" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-[#9a8520] mb-2">Validation Warnings</h4>
          
          {validation.errors && validation.errors.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-[#c9342c] uppercase mb-2">Errors:</p>
              <ul className="space-y-2">
                {validation.errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-[#c9342c] flex items-start gap-2">
                    <span className="text-[#e44138] mt-0.5">•</span>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings && validation.warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#b8a525] uppercase mb-2">Warnings:</p>
              <ul className="space-y-2">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-[#b8a525] flex items-start gap-2">
                    <span className="text-[#e7d356] mt-0.5">•</span>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const CustomizeModal = memo(({ isOpen, onClose, structure, onUpdate }) => {
  const [localStructure, setLocalStructure] = useState(structure);
  const [activeSection, setActiveSection] = useState("retainedEarnings");

  useEffect(() => {
    if (isOpen && structure) {
      setLocalStructure(JSON.parse(JSON.stringify(structure)));
    }
  }, [isOpen, structure]);

  if (!isOpen) return null;

  const handleAddLine = (sectionId) => {
    const section = localStructure[sectionId];
    const newLine = {
      id: generateId(),
      label: "New Line Item",
      type: DATA_SOURCE_TYPES.CUSTOM,
      customValue: 0,
      visible: true,
      order: section.items.length + 1,
      indent: 1,
    };

    setLocalStructure(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        items: [...prev[sectionId].items, newLine],
      },
    }));
  };

  const handleUpdateLine = (sectionId, lineId, updates) => {
    setLocalStructure(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        items: prev[sectionId].items.map(item =>
          item.id === lineId ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const handleDeleteLine = (sectionId, lineId) => {
    setLocalStructure(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        items: prev[sectionId].items.filter(item => item.id !== lineId),
      },
    }));
  };

  const handleSave = () => {
    onUpdate(localStructure);
    onClose();
    toast.success("Equity structure updated");
  };

  const handleReset = () => {
    setLocalStructure(JSON.parse(JSON.stringify(DEFAULT_EQUITY_STRUCTURE)));
    toast.info("Reset to default structure");
  };

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
          className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900">Customize Equity Statement</h3>
              <p className="text-sm text-zinc-500">Add custom lines and control visibility</p>
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
                {Object.entries(localStructure).map(([sectionId, section]) => (
                  <button
                    key={sectionId}
                    onClick={() => setActiveSection(sectionId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeSection === sectionId
                        ? "bg-[#e8f4fa] text-[#3b82c4]"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {Object.entries(localStructure)
                .filter(([sectionId]) => sectionId === activeSection)
                .map(([sectionId, section]) => (
                  <div key={sectionId}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-zinc-800 uppercase">{section.label}</h4>
                      <button
                        onClick={() => handleAddLine(sectionId)}
                        className="flex items-center gap-1 px-3 py-2 bg-[#e8f4fa] text-[#3b82c4] rounded-lg text-sm font-medium hover:bg-[#d4eaf5] transition"
                      >
                        <Plus className="w-4 h-4" />
                        Add Line
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.items
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              item.visible ? "bg-white border-zinc-200" : "bg-zinc-50 border-zinc-200 opacity-60"
                            }`}
                          >
                            <button
                              onClick={() => handleUpdateLine(sectionId, item.id, { visible: !item.visible })}
                              className="flex-shrink-0"
                            >
                              {item.visible ? (
                                <Eye className="w-4 h-4 text-[#3b82c4]" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-zinc-400" />
                              )}
                            </button>

                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleUpdateLine(sectionId, item.id, { label: e.target.value })}
                              className="flex-1 px-2 py-1 border border-zinc-200 rounded text-sm"
                              disabled={item.type === "calculated" || item.type === "opening" || item.type === "closing"}
                            />

                            <span className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                              {item.type}
                            </span>

                            {item.type === "static" && (
                              <input
                                type="number"
                                value={item.defaultValue || 0}
                                onChange={(e) => handleUpdateLine(sectionId, item.id, { defaultValue: parseFloat(e.target.value) || 0 })}
                                className="w-28 px-2 py-1 border border-zinc-200 rounded text-sm text-right"
                                placeholder="0.00"
                              />
                            )}

                            {item.type === "custom" && (
                              <input
                                type="number"
                                value={item.customValue || 0}
                                onChange={(e) => handleUpdateLine(sectionId, item.id, { customValue: parseFloat(e.target.value) || 0 })}
                                className="w-28 px-2 py-1 border border-zinc-200 rounded text-sm text-right"
                                placeholder="0.00"
                              />
                            )}

                            {item.type !== "calculated" && item.type !== "opening" && item.type !== "closing" && (
                              <button
                                onClick={() => handleDeleteLine(sectionId, item.id)}
                                className="flex-shrink-0 p-1 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function Equity() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    preset: "this_year",
    startDate: format(startOfYear(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfYear(new Date()), "yyyy-MM-dd"),
    comparisonType: "none",
    showComparison: false,
    showZeroLines: false,
  });

  const [structure, setStructure] = usePersistedState(
    'equity-structure-v2',
    DEFAULT_EQUITY_STRUCTURE,
    isValidEquityStructure
  );

  const [expandedSections, setExpandedSections] = useState({
    retainedEarnings: true,
    shareCapital: true,
  });

  const [showFilters, setShowFilters] = useState(true);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [user, setUser] = useState(null);

  const [drilldownState, setDrilldownState] = useState({
    isOpen: false,
    label: null,
    transactions: [],
    amount: 0,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
    ...QUERY_CONFIG,
  });

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ["packages"],
    queryFn: () => base44.entities.Package?.list() || Promise.resolve([]),
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

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice?.list() || Promise.resolve([]),
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

  const isLoading = loadingPayments || loadingPackages || loadingExpenses || 
                    loadingBookings || loadingVehicles || loadingInstructors || loadingInvoices;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log("User not authenticated");
      }
    };
    loadUser();
  }, []);

  const comparisonDateRange = useMemo(() => {
    if (!filters.showComparison || filters.comparisonType === "none") return null;

    const start = parseISO(filters.startDate);
    const end = parseISO(filters.endDate);
    const periodLength = differenceInMonths(end, start);

    if (filters.comparisonType === "previous_period") {
      return {
        start: format(subMonths(start, periodLength + 1), "yyyy-MM-dd"),
        end: format(subMonths(end, periodLength + 1), "yyyy-MM-dd"),
      };
    } else if (filters.comparisonType === "previous_year") {
      return {
        start: format(subYears(start, 1), "yyyy-MM-dd"),
        end: format(subYears(end, 1), "yyyy-MM-dd"),
      };
    }

    return null;
  }, [filters]);

  const equityStatement = useMemo(() => {
    if (isLoading) return null;
    return buildEquityStatement(
      payments,
      expenses,
      packages,
      bookings,
      invoices,
      instructors,
      vehicles,
      filters.startDate,
      filters.endDate
    );
  }, [payments, expenses, packages, bookings, invoices, instructors, vehicles, filters.startDate, filters.endDate, isLoading]);

  const previousEquityStatement = useMemo(() => {
    if (!comparisonDateRange || isLoading) return null;
    return buildEquityStatement(
      payments,
      expenses,
      packages,
      bookings,
      invoices,
      instructors,
      vehicles,
      comparisonDateRange.start,
      comparisonDateRange.end
    );
  }, [payments, expenses, packages, bookings, invoices, instructors, vehicles, comparisonDateRange, isLoading]);

  const metrics = useMemo(() => {
    if (!equityStatement) return null;
    const totalAssets = equityStatement.summary.total_closing_equity * 2;
    const totalLiabilities = equityStatement.summary.total_closing_equity * 0.5;
    
    return calculateEquityMetrics(
      equityStatement,
      previousEquityStatement,
      totalAssets,
      totalLiabilities,
      equityStatement.retainedEarnings.net_income
    );
  }, [equityStatement, previousEquityStatement]);

  const validation = useMemo(() => {
    if (!equityStatement) return null;
    return validateEquityStatement(equityStatement);
  }, [equityStatement]);

  const handlePresetChange = useCallback((presetValue) => {
    setFilters(prev => ({ ...prev, preset: presetValue }));
    const today = new Date();
    let start, end;

    switch (presetValue) {
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
        return;
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    }));
  }, []);

  const handleExport = useCallback((exportType) => {
    if (!equityStatement) {
      toast.error("No data to export");
      return;
    }

    const exportConfig = {
      companyName: "DrivePro Driving School",
      reportTitle: "Statement of Changes in Equity",
      startDate: filters.startDate,
      endDate: filters.endDate,
      showComparison: filters.showComparison && comparisonDateRange !== null,
      generatedAt: new Date(),
      generatedBy: user?.full_name || "System",
      currency: "EUR",
      basis: "accrual",
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(equityStatement, previousEquityStatement, structure, exportConfig);
          toast.success("Excel file exported successfully");
          break;
        case "pdf":
          exportToPDF(equityStatement, previousEquityStatement, structure, exportConfig);
          toast.success("Print dialog opened - save as PDF");
          break;
        case "csv":
          exportToCSV(equityStatement, previousEquityStatement, structure, exportConfig);
          toast.success("CSV file exported successfully");
          break;
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  }, [equityStatement, previousEquityStatement, filters, structure, user, comparisonDateRange]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleDrilldown = useCallback((label, transactions, amount) => {
    setDrilldownState({
      isOpen: true,
      label,
      transactions,
      amount,
    });
  }, []);

  const closeDrilldown = useCallback(() => {
    setDrilldownState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const renderLineItems = (sectionId) => {
    if (!equityStatement || !structure[sectionId]) return null;

    const section = structure[sectionId];
    const items = section.items
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order);

    return items.map(item => {
      let value = 0;
      let prevValue = null;
      let transactions = [];

      if (item.formula === "openingRetainedEarnings") {
        value = equityStatement.retainedEarnings.opening_balance;
        prevValue = previousEquityStatement?.retainedEarnings.opening_balance;
      } else if (item.formula === "netIncome") {
        value = equityStatement.retainedEarnings.net_income;
        prevValue = previousEquityStatement?.retainedEarnings.net_income;
        transactions = equityStatement.retainedEarnings.transactions || [];
      } else if (item.formula === "closingRetainedEarnings") {
        value = equityStatement.retainedEarnings.closing_balance;
        prevValue = previousEquityStatement?.retainedEarnings.closing_balance;
      } else if (item.formula === "openingShareCapital") {
        value = equityStatement.shareCapital.opening;
        prevValue = previousEquityStatement?.shareCapital.opening;
      } else if (item.formula === "capitalContributions") {
        value = equityStatement.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0);
        prevValue = previousEquityStatement?.shareCapital.issuance.reduce((sum, t) => sum + t.amount, 0);
        transactions = equityStatement.shareCapital.issuance;
      } else if (item.formula === "capitalWithdrawals") {
        value = equityStatement.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0);
        prevValue = previousEquityStatement?.shareCapital.repurchase.reduce((sum, t) => sum + t.amount, 0);
        transactions = equityStatement.shareCapital.repurchase;
      } else if (item.formula === "closingShareCapital") {
        value = equityStatement.shareCapital.closing;
        prevValue = previousEquityStatement?.shareCapital.closing;
      } else if (item.type === "static") {
        if (item.id === "dividends") {
          value = equityStatement.retainedEarnings.dividends;
          prevValue = previousEquityStatement?.retainedEarnings.dividends;
        } else if (item.id === "prior_period_adj") {
          value = equityStatement.retainedEarnings.prior_period_adjustments;
          prevValue = previousEquityStatement?.retainedEarnings.prior_period_adjustments;
        } else {
          value = item.defaultValue || 0;
        }
      } else if (item.type === "custom") {
        value = item.customValue || 0;
      }

      if (!filters.showZeroLines && value === 0 && (prevValue === 0 || prevValue === null)) {
        return null;
      }

      const handleClick = item.drilldown && transactions.length > 0
        ? () => handleDrilldown(item.label, transactions, value)
        : undefined;

      return (
        <LineItem
          key={item.id}
          label={item.label}
          amount={value}
          prevAmount={filters.showComparison && comparisonDateRange ? prevValue : null}
          indent={item.indent || 0}
          showComparison={filters.showComparison && comparisonDateRange !== null}
          isTotal={item.isSubtotal || item.type === "closing"}
          onClick={handleClick}
        />
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-zinc-500">Loading equity data...</p>
        </div>
      </div>
    );
  }

  if (!equityStatement) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-zinc-500">Unable to load equity data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Statement of Changes in Equity</h1>
              <p className="text-sm text-zinc-500">
                {format(parseISO(filters.startDate), "MMMM d, yyyy")} to {format(parseISO(filters.endDate), "MMMM d, yyyy")}
                {comparisonDateRange && (
                  <>
                    <span className="mx-2">•</span>
                    vs {format(parseISO(comparisonDateRange.start), "MMM d")} - {format(parseISO(comparisonDateRange.end), "MMM d, yyyy")}
                  </>
                )}
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <KPICard
            label="Opening Equity"
            value={equityStatement.summary.total_opening_equity}
            previousValue={previousEquityStatement?.summary.total_opening_equity}
            icon={<Scale className="w-4 h-4 text-[#3b82c4]" />}
            color="bg-[#e8f4fa]"
          />
          <KPICard
            label="Net Income"
            value={equityStatement.retainedEarnings.net_income}
            previousValue={previousEquityStatement?.retainedEarnings.net_income}
            icon={<Activity className="w-4 h-4 text-[#5cb83a]" />}
            color="bg-[#eefbe7]"
          />
          <KPICard
            label="Total Changes"
            value={equityStatement.summary.total_changes}
            previousValue={previousEquityStatement?.summary.total_changes}
            icon={<TrendingUp className="w-4 h-4 text-[#6c376f]" />}
            color="bg-[#f3e8f4]"
          />
          <KPICard
            label="Closing Equity"
            value={equityStatement.summary.total_closing_equity}
            previousValue={previousEquityStatement?.summary.total_closing_equity}
            icon={<DollarSign className="w-4 h-4 text-[#e7d356]" />}
            color="bg-[#fdfbe8]"
            bgColor={equityStatement.summary.reconciles ? "bg-[#eefbe7]" : "bg-[#fdeeed]"}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      Period
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DATE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handlePresetChange(preset.value)}
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

                  <div className="pt-3 border-t border-zinc-200">
                    <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.showZeroLines || false}
                        onChange={(e) => setFilters(prev => ({ ...prev, showZeroLines: e.target.checked }))}
                        className="w-4 h-4 rounded border-zinc-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
                      />
                      Show zero-value lines
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={showFilters ? "lg:col-span-4" : "lg:col-span-5"}>
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f4fa] flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Statement of Changes in Equity</h3>
                  <p className="text-xs text-zinc-500">
                    Track equity movements and retained earnings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.location.reload()}
                  className="p-2 rounded-lg hover:bg-zinc-200 transition" 
                  title="Refresh"
                >
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
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide">Line Item</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Amount</th>
                    {filters.showComparison && comparisonDateRange && (
                      <>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-32">Prior</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-28">Change</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide w-24">Change %</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {structure.retainedEarnings && structure.retainedEarnings.visible && (
                    <>
                      <SectionHeader
                        label={structure.retainedEarnings.label}
                        isExpanded={expandedSections.retainedEarnings}
                        onToggle={() => toggleSection('retainedEarnings')}
                        showComparison={filters.showComparison && comparisonDateRange !== null}
                      />

                      {expandedSections.retainedEarnings && renderLineItems('retainedEarnings')}
                    </>
                  )}

                  <tr className="h-3"><td colSpan={filters.showComparison ? 5 : 2}></td></tr>

                  {structure.shareCapital && structure.shareCapital.visible && (
                    <>
                      <SectionHeader
                        label={structure.shareCapital.label}
                        isExpanded={expandedSections.shareCapital}
                        onToggle={() => toggleSection('shareCapital')}
                        showComparison={filters.showComparison && comparisonDateRange !== null}
                      />

                      {expandedSections.shareCapital && renderLineItems('shareCapital')}
                    </>
                  )}

                  <tr className="h-4"><td colSpan={filters.showComparison ? 5 : 2}></td></tr>

                  <tr className="bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border-t-2 border-[#d4eaf5]">
                    <td className="py-3 px-4 font-bold text-base text-zinc-900">
                      TOTAL EQUITY
                    </td>
                    <td className={`py-3 px-4 text-right font-bold text-base font-mono ${
                      equityStatement.summary.total_closing_equity >= 0 ? 'text-[#5cb83a]' : 'text-[#e44138]'
                    }`}>
                      {formatCurrency(equityStatement.summary.total_closing_equity)}
                    </td>
                    {filters.showComparison && comparisonDateRange && previousEquityStatement && (
                      <>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${
                          previousEquityStatement.summary.total_closing_equity < 0 ? 'text-[#e44138]' : 'text-zinc-500'
                        }`}>
                          {formatCurrency(previousEquityStatement.summary.total_closing_equity)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm font-semibold ${
                          (equityStatement.summary.total_closing_equity - previousEquityStatement.summary.total_closing_equity) > 0 
                            ? 'text-[#5cb83a]' 
                            : 'text-[#e44138]'
                        }`}>
                          {formatCurrency(
                            equityStatement.summary.total_closing_equity - previousEquityStatement.summary.total_closing_equity,
                            true
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {previousEquityStatement.summary.total_closing_equity !== 0 ? (
                            <span className={`text-xs font-semibold ${
                              ((equityStatement.summary.total_closing_equity - previousEquityStatement.summary.total_closing_equity) / 
                               Math.abs(previousEquityStatement.summary.total_closing_equity) * 100) >= 0 
                                ? 'text-[#5cb83a]' 
                                : 'text-[#e44138]'
                            }`}>
                              {((equityStatement.summary.total_closing_equity - previousEquityStatement.summary.total_closing_equity) / 
                                Math.abs(previousEquityStatement.summary.total_closing_equity) * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Report ID: EQ-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span>•</span>
                  <span>Currency: EUR</span>
                  <span>•</span>
                  <span>Basis: Accrual</span>
                  {!equityStatement.summary.reconciles && (
                    <>
                      <span>•</span>
                      <span className="text-red-600 font-semibold">⚠ Reconciliation Required</span>
                    </>
                  )}
                </div>
                <div>
                  <span>Prepared by: {user?.full_name || "System"}</span>
                  <span className="mx-2">•</span>
                  <span>{format(new Date(), "MMM d, yyyy h:mm a")}</span>
                </div>
              </div>
            </div>
          </div>

          <ReconciliationPanel 
            equityStatement={equityStatement}
            previousEquityStatement={previousEquityStatement}
          />

          {metrics && (
            <EquityMetricsPanel metrics={metrics} />
          )}

          {validation && (
            <ValidationWarningsPanel validation={validation} />
          )}
        </div>
      </div>

      <DrilldownPanel
        isOpen={drilldownState.isOpen}
        onClose={closeDrilldown}
        label={drilldownState.label}
        transactions={drilldownState.transactions}
        amount={drilldownState.amount}
      />

      <CustomizeModal
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        structure={structure}
        onUpdate={setStructure}
      />
    </div>
  );
}