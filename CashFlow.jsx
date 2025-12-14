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
  differenceInMonths,
  differenceInDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Wallet,
  Building2,
  CreditCard,
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
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_VEHICLE_COST = 15000;
const DEFAULT_VEHICLE_USEFUL_LIFE = 5;
const DEFAULT_SOFTWARE_COST = 2000;
const VAT_RATE = 0.23;

const DATA_SOURCE_TYPES = {
  CALCULATED: "calculated",
  STATIC: "static",
  CUSTOM: "custom",
  HEADER: "header",
};

const DEFAULT_CASHFLOW_STRUCTURE = {
  operating: {
    id: "operating",
    label: "Cash Flows from Operating Activities",
    visible: true,
    order: 1,
    items: [
      { id: "net_income", label: "Net Income", type: "calculated", visible: true, order: 1, formula: "netIncome" },
      { id: "adjustments_header", label: "Adjustments to reconcile net income:", type: "header", visible: true, order: 2 },
      { id: "depreciation", label: "Depreciation and amortization", type: "calculated", visible: true, order: 3, indent: 1, formula: "depreciation" },
      { id: "working_capital_header", label: "Changes in working capital:", type: "header", visible: true, order: 4 },
      { id: "ar_change", label: "(Increase) decrease in accounts receivable", type: "calculated", visible: true, order: 5, indent: 1, formula: "accountsReceivableChange" },
      { id: "ap_change", label: "Increase (decrease) in accounts payable", type: "calculated", visible: true, order: 6, indent: 1, formula: "accountsPayableChange" },
      { id: "deferred_change", label: "Increase (decrease) in deferred revenue", type: "calculated", visible: true, order: 7, indent: 1, formula: "deferredRevenueChange" },
    ],
  },
  investing: {
    id: "investing",
    label: "Cash Flows from Investing Activities",
    visible: true,
    order: 2,
    items: [
      { id: "vehicle_purchases", label: "Purchase of vehicles", type: "calculated", visible: true, order: 1, formula: "vehiclePurchases" },
      { id: "equipment_purchases", label: "Purchase of equipment", type: "calculated", visible: true, order: 2, formula: "equipmentPurchases" },
      { id: "asset_sales", label: "Proceeds from asset sales", type: "calculated", visible: true, order: 3, formula: "assetSales" },
    ],
  },
  financing: {
    id: "financing",
    label: "Cash Flows from Financing Activities",
    visible: true,
    order: 3,
    items: [
      { id: "loan_proceeds", label: "Proceeds from loans", type: "calculated", visible: true, order: 1, formula: "loanProceeds" },
      { id: "loan_repayments", label: "Repayment of loans", type: "calculated", visible: true, order: 2, formula: "loanRepayments" },
      { id: "lease_payments", label: "Lease liability payments", type: "calculated", visible: true, order: 3, formula: "leasePayments" },
      { id: "owner_contributions", label: "Owner capital contributions", type: "calculated", visible: true, order: 4, formula: "ownerContributions" },
      { id: "owner_withdrawals", label: "Owner withdrawals", type: "calculated", visible: true, order: 5, formula: "ownerWithdrawals" },
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

const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,
  cacheTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const escapeHTML = (str) => {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const escapeCsv = (value) => {
  const str = String(value === null || value === undefined ? '' : value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatCurrency = (value, showSign = false) => {
  if (value === 0 || value === null || value === undefined) return "—";
  
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absValue);

  if (value < 0) return `(${formatted})`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
};

const formatCurrencyRaw = (value) => {
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

const formatChangeAmount = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  const change = current - previous;
  const isImprovement = change > 0;
  
  return {
    value: change,
    formatted: formatCurrency(change, true),
    isImprovement,
    colorClass: isImprovement ? 'text-emerald-600' : 'text-red-600',
  };
};

const formatChangePercent = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return { formatted: 'N/A', colorClass: 'text-zinc-400' };
  
  const change = current - previous;
  const changePercent = (change / Math.abs(previous)) * 100;
  const isImprovement = change > 0;
  const formatted = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
  
  return {
    value: changePercent,
    formatted,
    isImprovement,
    colorClass: isImprovement ? 'text-emerald-600' : 'text-red-600',
  };
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
    return isWithinInterval(date, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate)),
    });
  } catch {
    return false;
  }
};

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

// ============================================
// CALCULATION HELPERS
// ============================================

const calculateNetIncome = (payments, expenses, startDate, endDate) => {
  const revenue = payments
    .filter(p => p.status === "completed" && isInDateRange(p.payment_date || p.created_date, startDate, endDate))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const costs = expenses
    .filter(e => isInDateRange(e.expense_date || e.created_date, startDate, endDate))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  return revenue - costs;
};

const calculateDepreciation = (vehicles, startDate, endDate) => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const monthsInPeriod = differenceInMonths(end, start) + 1;
  
  let totalDepreciation = 0;
  const depreciationDetails = [];
  
  vehicles.forEach(vehicle => {
    const purchaseDate = parseISO(vehicle.created_date);
    if (purchaseDate > end) return;
    
    const cost = DEFAULT_VEHICLE_COST;
    const usefulLife = DEFAULT_VEHICLE_USEFUL_LIFE;
    const annualDepreciation = cost / usefulLife;
    const monthlyDepreciation = annualDepreciation / 12;
    
    const depreciation = monthlyDepreciation * monthsInPeriod;
    totalDepreciation += depreciation;
    
    depreciationDetails.push({
      ...vehicle,
      depreciation,
      monthsInPeriod,
    });
  });
  
  return { total: totalDepreciation, details: depreciationDetails };
};

const calculateWorkingCapitalChanges = (payments, expenses, invoices, startDate, endDate) => {
  const periodStart = parseISO(startDate);
  const periodEnd = parseISO(endDate);
  const priorPeriodEnd = format(subMonths(periodStart, 1), "yyyy-MM-dd");
  
  const arBeginning = invoices
    .filter(inv => {
      const invDate = parseISO(inv.issue_date || inv.created_date);
      return invDate <= parseISO(priorPeriodEnd) && inv.status !== "paid";
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.amount_paid || 0), 0);
  
  const arEnding = invoices
    .filter(inv => {
      const invDate = parseISO(inv.issue_date || inv.created_date);
      return invDate <= periodEnd && inv.status !== "paid";
    })
    .reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.amount_paid || 0), 0);
  
  const changeInAR = arEnding - arBeginning;
  
  const apBeginning = expenses
    .filter(e => {
      const expDate = parseISO(e.expense_date || e.created_date);
      return expDate <= parseISO(priorPeriodEnd) && e.payment_status !== "paid";
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const apEnding = expenses
    .filter(e => {
      const expDate = parseISO(e.expense_date || e.created_date);
      return expDate <= periodEnd && e.payment_status !== "paid";
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const changeInAP = apEnding - apBeginning;
  const changeInDeferred = 0;
  
  return {
    accountsReceivable: { beginning: arBeginning, ending: arEnding, change: changeInAR },
    accountsPayable: { beginning: apBeginning, ending: apEnding, change: changeInAP },
    deferredRevenue: { beginning: 0, ending: 0, change: changeInDeferred },
  };
};

const calculateInvestingActivities = (vehicles, startDate, endDate) => {
  const vehiclePurchases = vehicles.filter(v => 
    isInDateRange(v.created_date, startDate, endDate)
  );
  
  const purchaseAmount = vehiclePurchases.reduce((sum, v) => 
    sum + (v.purchase_price || DEFAULT_VEHICLE_COST), 0
  );
  
  return {
    vehiclePurchases: {
      amount: purchaseAmount,
      count: vehiclePurchases.length,
      details: vehiclePurchases,
    },
    equipmentPurchases: { amount: 0, details: [] },
    assetSales: { amount: 0, details: [] },
  };
};

const calculateFinancingActivities = () => {
  return {
    loanProceeds: { amount: 0, details: [] },
    loanRepayments: { amount: 0, details: [] },
    leasePayments: { amount: 0, details: [] },
    ownerContributions: { amount: 0, details: [] },
    ownerWithdrawals: { amount: 0, details: [] },
  };
};

const calculateCashBalance = (payments, expenses, asOfDate) => {
  const totalReceived = payments
    .filter(p => p.status === "completed" && isBeforeOrOnDate(p.payment_date || p.created_date, asOfDate))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const totalPaid = expenses
    .filter(e => e.payment_status === "paid" && isBeforeOrOnDate(e.expense_date || e.created_date, asOfDate))
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  return totalReceived - totalPaid;
};

const buildCashFlowData = (payments, expenses, invoices, vehicles, instructors, startDate, endDate) => {
  const netIncome = calculateNetIncome(payments, expenses, startDate, endDate);
  const depreciation = calculateDepreciation(vehicles, startDate, endDate);
  const workingCapital = calculateWorkingCapitalChanges(payments, expenses, invoices, startDate, endDate);
  const investing = calculateInvestingActivities(vehicles, startDate, endDate);
  const financing = calculateFinancingActivities();
  
  const adjustmentsToNetIncome = depreciation.total;
  const workingCapitalAdjustment = -workingCapital.accountsReceivable.change + workingCapital.accountsPayable.change + workingCapital.deferredRevenue.change;
  const netCashFromOperating = netIncome + adjustmentsToNetIncome + workingCapitalAdjustment;
  const netCashFromInvesting = -investing.vehiclePurchases.amount - investing.equipmentPurchases.amount + investing.assetSales.amount;
  const netCashFromFinancing = financing.loanProceeds.amount - financing.loanRepayments.amount - financing.leasePayments.amount + financing.ownerContributions.amount - financing.ownerWithdrawals.amount;
  
  const netChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
  const beginningCash = calculateCashBalance(payments, expenses, format(subMonths(parseISO(startDate), 1), "yyyy-MM-dd"));
  const endingCash = calculateCashBalance(payments, expenses, endDate);
  
  return {
    operating: {
      netIncome,
      adjustments: { depreciation: depreciation.total, depreciationDetails: depreciation.details },
      workingCapital: {
        accountsReceivable: workingCapital.accountsReceivable.change,
        accountsPayable: workingCapital.accountsPayable.change,
        deferredRevenue: workingCapital.deferredRevenue.change,
        total: workingCapitalAdjustment,
      },
      total: netCashFromOperating,
    },
    investing: {
      vehiclePurchases: investing.vehiclePurchases,
      equipmentPurchases: investing.equipmentPurchases,
      assetSales: investing.assetSales,
      total: netCashFromInvesting,
    },
    financing: {
      loanProceeds: financing.loanProceeds,
      loanRepayments: financing.loanRepayments,
      leasePayments: financing.leasePayments,
      ownerContributions: financing.ownerContributions,
      ownerWithdrawals: financing.ownerWithdrawals,
      total: netCashFromFinancing,
    },
    summary: {
      netChange,
      beginningCash,
      endingCash,
      calculatedEndingCash: beginningCash + netChange,
      reconciles: Math.abs(endingCash - (beginningCash + netChange)) < 1,
    },
  };
};

// ============================================
// EXPORT FUNCTIONS
// ============================================

const exportToExcel = (cashFlow, previousCashFlow, config) => {
  const startDateFormatted = format(parseISO(config.startDate), "MMMM d, yyyy");
  const endDateFormatted = format(parseISO(config.endDate), "MMMM d, yyyy");
  const generatedAtFormatted = format(config.generatedAt, "MMMM d, yyyy 'at' h:mm a");
  const safeCompanyName = escapeXML(config.companyName);
  const safeReportTitle = escapeXML(config.reportTitle);
  const colCount = config.showComparison ? 5 : 2;

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
  <Style ss:ID="SubsectionHeader">
   <Alignment ss:Vertical="Center" ss:Indent="2"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#6B7280"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="NormalAmount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="Indent1">
   <Alignment ss:Vertical="Center" ss:Indent="2"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="Indent1Amount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#374151"/>
   <NumberFormat ss:Format="&quot;€&quot;#,##0;[Red](&quot;€&quot;#,##0)"/>
  </Style>
  <Style ss:ID="Indent2">
   <Alignment ss:Vertical="Center" ss:Indent="4"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="Indent2Amount">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#6B7280"/>
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
   <NumberFormat ss:Format="+&quot;€&quot;#,##0;[Red]-&quot;€&quot;#,##0"/>
  </Style>
  <Style ss:ID="ChangeAmountNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626"/>
   <NumberFormat ss:Format="+&quot;€&quot;#,##0;[Red]-&quot;€&quot;#,##0"/>
  </Style>
  <Style ss:ID="ChangePositive">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669"/>
   <NumberFormat ss:Format="+0.0%;[Red]-0.0%"/>
  </Style>
  <Style ss:ID="ChangeNegative">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626"/>
   <NumberFormat ss:Format="+0.0%;[Red]-0.0%"/>
  </Style>
  <Style ss:ID="NormalNA">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#9CA3AF"/>
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
 <Worksheet ss:Name="Cash Flow Statement">
  <Table ss:DefaultColumnWidth="80" ss:DefaultRowHeight="18">
   <Column ss:Width="280"/>
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
     <Data ss:Type="String">${escapeXML(startDateFormatted)} - ${escapeXML(endDateFormatted)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Metadata">
     <Data ss:Type="String">Method: Indirect | Currency: EUR | Prepared for Management</Data>
    </Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Disclaimer">
     <Data ss:Type="String">UNAUDITED - FOR MANAGEMENT USE ONLY</Data>
    </Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderLeft"><Data ss:Type="String">Line Item</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
    ${config.showComparison ? '<Cell ss:StyleID="Header"><Data ss:Type="String">Prior Period</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change</Data></Cell><Cell ss:StyleID="Header"><Data ss:Type="String">Change %</Data></Cell>' : ''}
   </Row>`;

  xmlContent += `\n   <Row ss:Height="24">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Section">
     <Data ss:Type="String">CASH FLOWS FROM OPERATING ACTIVITIES</Data>
    </Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Net Income</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.operating.netIncome}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="SubsectionHeader"><Data ss:Type="String">Adjustments to reconcile net income:</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="18">
    <Cell ss:StyleID="Indent2"><Data ss:Type="String">Depreciation and amortization</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.operating.adjustments.depreciation}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="SubsectionHeader"><Data ss:Type="String">Changes in working capital:</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="18">
    <Cell ss:StyleID="Indent2"><Data ss:Type="String">(Increase) decrease in accounts receivable</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${-cashFlow.operating.workingCapital.accountsReceivable}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="18">
    <Cell ss:StyleID="Indent2"><Data ss:Type="String">Increase (decrease) in accounts payable</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.operating.workingCapital.accountsPayable}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="18">
    <Cell ss:StyleID="Indent2"><Data ss:Type="String">Increase (decrease) in deferred revenue</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.operating.workingCapital.deferredRevenue}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="22">
    <Cell ss:StyleID="Total"><Data ss:Type="String">Net cash provided by operating activities</Data></Cell>
    <Cell ss:StyleID="TotalAmount"><Data ss:Type="Number">${cashFlow.operating.total}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="6"><Cell ss:StyleID="Spacer"/></Row>`;

  xmlContent += `\n   <Row ss:Height="24">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Section">
     <Data ss:Type="String">CASH FLOWS FROM INVESTING ACTIVITIES</Data>
    </Cell>
   </Row>`;

  if (cashFlow.investing.vehiclePurchases.amount > 0) {
    xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Purchase of vehicles (${cashFlow.investing.vehiclePurchases.count})</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${-cashFlow.investing.vehiclePurchases.amount}</Data></Cell>
   </Row>`;
  }

  if (cashFlow.investing.assetSales.amount > 0) {
    xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Proceeds from asset sales</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.investing.assetSales.amount}</Data></Cell>
   </Row>`;
  }

  xmlContent += `\n   <Row ss:Height="22">
    <Cell ss:StyleID="Total"><Data ss:Type="String">Net cash used in investing activities</Data></Cell>
    <Cell ss:StyleID="TotalAmount"><Data ss:Type="Number">${cashFlow.investing.total}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="6"><Cell ss:StyleID="Spacer"/></Row>`;

  xmlContent += `\n   <Row ss:Height="24">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Section">
     <Data ss:Type="String">CASH FLOWS FROM FINANCING ACTIVITIES</Data>
    </Cell>
   </Row>`;

  if (cashFlow.financing.loanProceeds.amount > 0) {
    xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Proceeds from loans</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.financing.loanProceeds.amount}</Data></Cell>
   </Row>`;
  }

  if (cashFlow.financing.loanRepayments.amount > 0) {
    xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Repayment of loans</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${-cashFlow.financing.loanRepayments.amount}</Data></Cell>
   </Row>`;
  }

  if (cashFlow.financing.ownerContributions.amount > 0) {
    xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Indent1"><Data ss:Type="String">Owner capital contributions</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.financing.ownerContributions.amount}</Data></Cell>
   </Row>`;
  }

  xmlContent += `\n   <Row ss:Height="22">
    <Cell ss:StyleID="Total"><Data ss:Type="String">Net cash provided by financing activities</Data></Cell>
    <Cell ss:StyleID="TotalAmount"><Data ss:Type="Number">${cashFlow.financing.total}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="6"><Cell ss:StyleID="Spacer"/></Row>`;

  xmlContent += `\n   <Row ss:Height="22">
    <Cell ss:StyleID="Total"><Data ss:Type="String">NET INCREASE (DECREASE) IN CASH</Data></Cell>
    <Cell ss:StyleID="TotalAmount"><Data ss:Type="Number">${cashFlow.summary.netChange}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="20">
    <Cell ss:StyleID="Normal"><Data ss:Type="String">Cash at beginning of period</Data></Cell>
    <Cell ss:StyleID="NormalAmount"><Data ss:Type="Number">${cashFlow.summary.beginningCash}</Data></Cell>
   </Row>`;

  const grandTotalStyle = cashFlow.summary.endingCash >= 0 ? "GrandTotalPositive" : "GrandTotalNegative";
  xmlContent += `\n   <Row ss:Height="30">
    <Cell ss:StyleID="GrandTotal"><Data ss:Type="String">CASH AT END OF PERIOD</Data></Cell>
    <Cell ss:StyleID="${grandTotalStyle}"><Data ss:Type="Number">${cashFlow.summary.endingCash}</Data></Cell>
   </Row>`;

  xmlContent += `\n   <Row ss:Height="8"/>
   <Row ss:Height="14">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="Footer">
     <Data ss:Type="String">Generated on ${escapeXML(generatedAtFormatted)} | Report ID: CF-${format(config.generatedAt, "yyyyMMddHHmmss")}</Data>
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
  const fileName = generateFileName("Cash Flow Statement", "xls", { start: config.startDate, end: config.endDate });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToPDF = (cashFlow, config) => {
  const dateFormatted = `${format(parseISO(config.startDate), "MMMM d, yyyy")} to ${format(parseISO(config.endDate), "MMMM d, yyyy")}`;
  const safeCompanyName = escapeHTML(config.companyName);
  const safeReportTitle = escapeHTML(config.reportTitle);

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeReportTitle}</title>
  <style>
    @page { margin: 0.75in; size: A4 portrait; }
    @media print { body { margin: 0; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Calibri', sans-serif; color: #1F2937; font-size: 10px; line-height: 1.4; background: white; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #4F46E5; }
    .company-name { font-size: 22px; font-weight: 700; color: #1F2937; margin-bottom: 6px; }
    .report-title { font-size: 16px; font-weight: 600; color: #4F46E5; margin-bottom: 8px; }
    .date-range { font-size: 12px; color: #374151; margin-bottom: 6px; }
    .meta { font-size: 9px; color: #6B7280; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    thead { background: #4F46E5; }
    thead th { padding: 10px 8px; text-align: left; font-weight: 700; color: white; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #4338CA; }
    thead th.right { text-align: right; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; }
    tbody td.right { text-align: right; font-family: 'Consolas', 'Courier New', monospace; }
    .section { background-color: #E5E7EB; font-weight: 700; color: #1F2937; }
    .section td { border-top: 2px solid #9CA3AF; border-bottom: 2px solid #9CA3AF; padding: 8px; }
    .subsection-header { background-color: #F3F4F6; font-weight: 600; color: #6B7280; font-size: 9px; }
    .indent-1 { padding-left: 24px !important; }
    .indent-2 { padding-left: 48px !important; font-size: 9px; color: #6B7280; }
    .total { font-weight: 600; background-color: #F9FAFB; }
    .total td { border-top: 1px solid #D1D5DB; border-bottom: 1px solid #D1D5DB; padding: 7px 8px; }
    .grand-total { background: #EEF2FF; font-weight: 700; font-size: 11px; }
    .grand-total td { border-top: 3px solid #4F46E5; border-bottom: 3px solid #4F46E5; padding: 10px 8px; }
    .positive { color: #059669; }
    .negative { color: #DC2626; }
    .spacer { height: 8px; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 8px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="company-name">${safeCompanyName}</h1>
    <h2 class="report-title">${safeReportTitle}</h2>
    <p class="date-range">${escapeHTML(dateFormatted)}</p>
    <p class="meta">Currency: EUR | Method: Indirect | Generated: ${escapeHTML(format(config.generatedAt, "MMM d, yyyy h:mm a"))}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Line Item</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section"><td colspan="2">CASH FLOWS FROM OPERATING ACTIVITIES</td></tr>
      <tr><td class="indent-1">Net Income</td><td class="right ${cashFlow.operating.netIncome < 0 ? 'negative' : ''}">${formatCurrencyRaw(cashFlow.operating.netIncome)}</td></tr>
      <tr class="subsection-header"><td class="indent-1">Adjustments to reconcile net income:</td><td></td></tr>
      <tr><td class="indent-2">Depreciation and amortization</td><td class="right">${formatCurrencyRaw(cashFlow.operating.adjustments.depreciation)}</td></tr>
      <tr class="subsection-header"><td class="indent-1">Changes in working capital:</td><td></td></tr>
      <tr><td class="indent-2">(Increase) decrease in accounts receivable</td><td class="right">${formatCurrencyRaw(-cashFlow.operating.workingCapital.accountsReceivable)}</td></tr>
      <tr><td class="indent-2">Increase (decrease) in accounts payable</td><td class="right">${formatCurrencyRaw(cashFlow.operating.workingCapital.accountsPayable)}</td></tr>
      <tr><td class="indent-2">Increase (decrease) in deferred revenue</td><td class="right">${formatCurrencyRaw(cashFlow.operating.workingCapital.deferredRevenue)}</td></tr>
      <tr class="total"><td>Net cash provided by operating activities</td><td class="right ${cashFlow.operating.total < 0 ? 'negative' : 'positive'}">${formatCurrencyRaw(cashFlow.operating.total)}</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      
      <tr class="section"><td colspan="2">CASH FLOWS FROM INVESTING ACTIVITIES</td></tr>
      ${cashFlow.investing.vehiclePurchases.amount > 0 ? `<tr><td class="indent-1">Purchase of vehicles (${cashFlow.investing.vehiclePurchases.count})</td><td class="right negative">${formatCurrencyRaw(-cashFlow.investing.vehiclePurchases.amount)}</td></tr>` : ''}
      <tr class="total"><td>Net cash used in investing activities</td><td class="right ${cashFlow.investing.total < 0 ? 'negative' : ''}">${formatCurrencyRaw(cashFlow.investing.total)}</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      
      <tr class="section"><td colspan="2">CASH FLOWS FROM FINANCING ACTIVITIES</td></tr>
      <tr class="total"><td>Net cash provided by financing activities</td><td class="right">${formatCurrencyRaw(cashFlow.financing.total)}</td></tr>
      <tr class="spacer"><td colspan="2"></td></tr>
      
      <tr class="total"><td>NET INCREASE (DECREASE) IN CASH</td><td class="right ${cashFlow.summary.netChange < 0 ? 'negative' : 'positive'}">${formatCurrencyRaw(cashFlow.summary.netChange)}</td></tr>
      <tr><td>Cash at beginning of period</td><td class="right">${formatCurrencyRaw(cashFlow.summary.beginningCash)}</td></tr>
      <tr class="grand-total"><td>CASH AT END OF PERIOD</td><td class="right ${cashFlow.summary.endingCash < 0 ? 'negative' : 'positive'}">${formatCurrencyRaw(cashFlow.summary.endingCash)}</td></tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p><strong>${safeCompanyName}</strong></p>
    <p>Report ID: CF-${format(config.generatedAt, "yyyyMMddHHmmss")} | Generated by DrivePro</p>
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
};

const exportToCSV = (cashFlow, config) => {
  const csvRows = [];
  csvRows.push([config.companyName]);
  csvRows.push([config.reportTitle]);
  csvRows.push([`Period: ${format(parseISO(config.startDate), "MMM d, yyyy")} to ${format(parseISO(config.endDate), "MMM d, yyyy")}`]);
  csvRows.push([`Currency: EUR`, `Method: Indirect`]);
  csvRows.push([`Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
  csvRows.push([]);

  csvRows.push(["Line Item", "Amount (EUR)"]);
  csvRows.push([]);

  csvRows.push(["CASH FLOWS FROM OPERATING ACTIVITIES", ""]);
  csvRows.push(["Net Income", cashFlow.operating.netIncome.toFixed(2)]);
  csvRows.push(["Adjustments to reconcile net income:", ""]);
  csvRows.push(["  Depreciation and amortization", cashFlow.operating.adjustments.depreciation.toFixed(2)]);
  csvRows.push(["Changes in working capital:", ""]);
  csvRows.push(["  (Increase) decrease in accounts receivable", (-cashFlow.operating.workingCapital.accountsReceivable).toFixed(2)]);
  csvRows.push(["  Increase (decrease) in accounts payable", cashFlow.operating.workingCapital.accountsPayable.toFixed(2)]);
  csvRows.push(["  Increase (decrease) in deferred revenue", cashFlow.operating.workingCapital.deferredRevenue.toFixed(2)]);
  csvRows.push(["Net cash provided by operating activities", cashFlow.operating.total.toFixed(2)]);
  csvRows.push([]);

  csvRows.push(["CASH FLOWS FROM INVESTING ACTIVITIES", ""]);
  if (cashFlow.investing.vehiclePurchases.amount > 0) {
    csvRows.push([`  Purchase of vehicles (${cashFlow.investing.vehiclePurchases.count})`, (-cashFlow.investing.vehiclePurchases.amount).toFixed(2)]);
  }
  csvRows.push(["Net cash used in investing activities", cashFlow.investing.total.toFixed(2)]);
  csvRows.push([]);

  csvRows.push(["CASH FLOWS FROM FINANCING ACTIVITIES", ""]);
  csvRows.push(["Net cash provided by financing activities", cashFlow.financing.total.toFixed(2)]);
  csvRows.push([]);

  csvRows.push(["NET INCREASE (DECREASE) IN CASH", cashFlow.summary.netChange.toFixed(2)]);
  csvRows.push(["Cash at beginning of period", cashFlow.summary.beginningCash.toFixed(2)]);
  csvRows.push(["CASH AT END OF PERIOD", cashFlow.summary.endingCash.toFixed(2)]);
  csvRows.push([]);
  csvRows.push(["---"]);
  csvRows.push([`Report ID: CF-${format(config.generatedAt, "yyyyMMddHHmmss")}`]);

  const csvContent = csvRows.map((row) => row.map(cell => escapeCsv(String(cell || ""))).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
  const fileName = generateFileName("Cash Flow Statement", "csv", { start: config.startDate, end: config.endDate });
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
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return <span className="text-xs text-zinc-400">N/A</span>;
  
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

const LineItem = memo(({ label, amount, prevAmount, indent = 0, showComparison, onClick, isSubItem = false }) => {
  const displayAmount = amount === 0 ? "—" : formatCurrency(amount);
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;

  return (
    <tr
      className={`border-b border-zinc-50 transition-colors ${
        onClick ? "cursor-pointer hover:bg-zinc-50 group" : ""
      }`}
      onClick={onClick}
    >
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

const SectionHeader = memo(({ label, isExpanded, onToggle, showComparison, icon: Icon }) => {
  return (
    <tr
      className="bg-zinc-100 cursor-pointer hover:bg-zinc-200 transition-colors"
      onClick={onToggle}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
          {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
          <span className="font-bold text-sm text-zinc-800 uppercase tracking-wide">{label}</span>
        </div>
      </td>
      <td colSpan={showComparison ? 4 : 1}></td>
    </tr>
  );
});

const TotalRow = memo(({ label, amount, prevAmount, isGrandTotal = false, showComparison }) => {
  const changeAmount = prevAmount != null ? formatChangeAmount(amount, prevAmount) : null;
  const changePercent = prevAmount != null ? formatChangePercent(amount, prevAmount) : null;
  
  let rowClass = "border-t-2 border-zinc-300";
  let amountClass = amount < 0 ? "text-[#e44138]" : "text-zinc-800";
  
  if (isGrandTotal) {
    rowClass = "bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] border-t-2 border-[#d4eaf5]";
    amountClass = amount >= 0 ? "text-[#5cb83a]" : "text-[#e44138]";
  }

  return (
    <tr className={rowClass}>
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
                {transactions.length} transactions • Total: {formatCurrency(amount)}
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

const CustomizeModal = memo(({ isOpen, onClose, structure, onUpdate }) => {
  const [localStructure, setLocalStructure] = useState(structure);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    setLocalStructure(structure);
  }, [structure]);

  if (!isOpen) return null;

  const handleAddCustomLine = (sectionId) => {
    const section = localStructure[sectionId];
    const newItem = {
      id: `custom_${Date.now()}`,
      label: "New Custom Line",
      type: "custom",
      visible: true,
      order: section.items.length + 1,
      indent: 1,
      customValue: 0,
    };

    setLocalStructure({
      ...localStructure,
      [sectionId]: {
        ...section,
        items: [...section.items, newItem],
      },
    });
  };

  const handleToggleVisibility = (sectionId, itemId) => {
    const section = localStructure[sectionId];
    setLocalStructure({
      ...localStructure,
      [sectionId]: {
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, visible: !item.visible } : item
        ),
      },
    });
  };

  const handleUpdateLabel = (sectionId, itemId, newLabel) => {
    const section = localStructure[sectionId];
    setLocalStructure({
      ...localStructure,
      [sectionId]: {
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, label: newLabel } : item
        ),
      },
    });
  };

  const handleUpdateCustomValue = (sectionId, itemId, newValue) => {
    const section = localStructure[sectionId];
    setLocalStructure({
      ...localStructure,
      [sectionId]: {
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, customValue: parseFloat(newValue) || 0 } : item
        ),
      },
    });
  };

  const handleDeleteItem = (sectionId, itemId) => {
    const section = localStructure[sectionId];
    setLocalStructure({
      ...localStructure,
      [sectionId]: {
        ...section,
        items: section.items.filter(item => item.id !== itemId),
      },
    });
  };

  const handleSave = () => {
    onUpdate(localStructure);
    onClose();
    toast.success("Cash flow structure updated");
  };

  const handleReset = () => {
    setLocalStructure(DEFAULT_CASHFLOW_STRUCTURE);
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
              <h3 className="font-bold text-zinc-900">Customize Cash Flow Statement</h3>
              <p className="text-sm text-zinc-500">Add custom lines, reorder items, and control visibility</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {Object.entries(localStructure).map(([sectionId, section]) => (
              <div key={sectionId} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-zinc-800 uppercase text-sm">{section.label}</h4>
                  <button
                    onClick={() => handleAddCustomLine(sectionId)}
                    className="flex items-center gap-1 px-3 py-1 bg-[#e8f4fa] text-[#3b82c4] rounded-lg text-xs font-medium hover:bg-[#d4eaf5] transition"
                  >
                    <span>+</span> Add Line
                  </button>
                </div>

                <div className="space-y-2">
                  {section.items
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border ${
                          item.visible ? "bg-white border-zinc-200" : "bg-zinc-50 border-zinc-200 opacity-60"
                        }`}
                      >
                        <button
                          onClick={() => handleToggleVisibility(sectionId, item.id)}
                          className="flex-shrink-0"
                        >
                          {item.visible ? (
                            <ChevronDown className="w-4 h-4 text-[#3b82c4]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>

                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdateLabel(sectionId, item.id, e.target.value)}
                            onBlur={() => setEditingItem(null)}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-[#d4eaf5] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                          />
                        ) : (
                          <span
                            className="flex-1 text-sm cursor-pointer hover:text-indigo-600"
                            onClick={() => item.type === "custom" && setEditingItem(item.id)}
                          >
                            {item.label}
                          </span>
                        )}

                        <span className="text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                          {item.type}
                        </span>

                        {item.type === "custom" && (
                          <input
                            type="number"
                            value={item.customValue || 0}
                            onChange={(e) => handleUpdateCustomValue(sectionId, item.id, e.target.value)}
                            className="w-24 px-2 py-1 border border-zinc-200 rounded text-sm text-right"
                            placeholder="0.00"
                          />
                        )}

                        {item.type === "custom" && (
                          <button
                            onClick={() => handleDeleteItem(sectionId, item.id)}
                            className="flex-shrink-0 p-1 hover:bg-red-50 rounded transition"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
            >
              Reset to Default
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-semibold bg-[#3b82c4] text-white rounded-lg hover:bg-[#2563a3] transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function CashFlow() {
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState({
    preset: "this_month",
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    comparisonType: "none",
    showComparison: false,
  });

  const [showFilters, setShowFilters] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    operating: true,
    investing: true,
    financing: true,
  });
  const [drilldown, setDrilldown] = useState(null);
  const [user, setUser] = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [cashFlowStructure, setCashFlowStructure] = useState(DEFAULT_CASHFLOW_STRUCTURE);

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

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice?.list() || Promise.resolve([]),
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

  const isLoading = loadingPayments || loadingExpenses || loadingInvoices || loadingVehicles || loadingInstructors;

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
  }, [filters.showComparison, filters.comparisonType, filters.startDate, filters.endDate]);

  const cashFlow = useMemo(() => {
    return buildCashFlowData(
      payments,
      expenses,
      invoices,
      vehicles,
      instructors,
      filters.startDate,
      filters.endDate
    );
  }, [payments, expenses, invoices, vehicles, instructors, filters.startDate, filters.endDate]);

  const previousCashFlow = useMemo(() => {
    if (!comparisonDateRange) return null;
    return buildCashFlowData(
      payments,
      expenses,
      invoices,
      vehicles,
      instructors,
      comparisonDateRange.start,
      comparisonDateRange.end
    );
  }, [payments, expenses, invoices, vehicles, instructors, comparisonDateRange]);

  const handlePreset = useCallback((presetValue) => {
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
    const exportConfig = {
      companyName: "DrivePro Driving School",
      reportTitle: "Statement of Cash Flows",
      startDate: filters.startDate,
      endDate: filters.endDate,
      showComparison: filters.showComparison && comparisonDateRange !== null,
      generatedAt: new Date(),
      preparedBy: user?.full_name || "System",
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(cashFlow, previousCashFlow, exportConfig);
          toast.success("Excel file exported successfully");
          break;
        case "pdf":
          exportToPDF(cashFlow, exportConfig);
          toast.success("Print dialog opened - save as PDF");
          break;
        case "csv":
          exportToCSV(cashFlow, exportConfig);
          toast.success("CSV file exported successfully");
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  }, [cashFlow, previousCashFlow, filters, comparisonDateRange, user]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const renderLineItems = (sectionId) => {
    const section = cashFlowStructure[sectionId];
    if (!section) return null;

    return section.items
      .filter(item => item.visible)
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        if (item.type === "header") {
          return (
            <tr key={item.id} className="bg-zinc-50">
              <td colSpan={filters.showComparison ? 5 : 2} className="py-2 px-4 pl-12 text-xs font-semibold text-zinc-600 uppercase">
                {item.label}
              </td>
            </tr>
          );
        }

        if (item.type === "custom") {
          return (
            <LineItem
              key={item.id}
              label={item.label}
              amount={item.customValue || 0}
              prevAmount={null}
              indent={item.indent || 1}
              showComparison={filters.showComparison && comparisonDateRange !== null}
              isSubItem={item.indent > 1}
            />
          );
        }

        let amount = 0;
        let prevAmount = null;

        switch (item.formula) {
          case "netIncome":
            amount = cashFlow.operating.netIncome;
            prevAmount = previousCashFlow?.operating.netIncome;
            break;
          case "depreciation":
            amount = cashFlow.operating.adjustments.depreciation;
            prevAmount = previousCashFlow?.operating.adjustments.depreciation;
            break;
          case "accountsReceivableChange":
            amount = -cashFlow.operating.workingCapital.accountsReceivable;
            prevAmount = previousCashFlow ? -previousCashFlow.operating.workingCapital.accountsReceivable : null;
            break;
          case "accountsPayableChange":
            amount = cashFlow.operating.workingCapital.accountsPayable;
            prevAmount = previousCashFlow?.operating.workingCapital.accountsPayable;
            break;
          case "deferredRevenueChange":
            amount = cashFlow.operating.workingCapital.deferredRevenue;
            prevAmount = previousCashFlow?.operating.workingCapital.deferredRevenue;
            break;
          case "vehiclePurchases":
            amount = -cashFlow.investing.vehiclePurchases.amount;
            prevAmount = previousCashFlow ? -previousCashFlow.investing.vehiclePurchases.amount : null;
            break;
          case "equipmentPurchases":
            amount = -cashFlow.investing.equipmentPurchases.amount;
            prevAmount = previousCashFlow ? -previousCashFlow.investing.equipmentPurchases.amount : null;
            break;
          case "assetSales":
            amount = cashFlow.investing.assetSales.amount;
            prevAmount = previousCashFlow?.investing.assetSales.amount;
            break;
          case "loanProceeds":
            amount = cashFlow.financing.loanProceeds.amount;
            prevAmount = previousCashFlow?.financing.loanProceeds.amount;
            break;
          case "loanRepayments":
            amount = -cashFlow.financing.loanRepayments.amount;
            prevAmount = previousCashFlow ? -previousCashFlow.financing.loanRepayments.amount : null;
            break;
          case "leasePayments":
            amount = -cashFlow.financing.leasePayments.amount;
            prevAmount = previousCashFlow ? -previousCashFlow.financing.leasePayments.amount : null;
            break;
          case "ownerContributions":
            amount = cashFlow.financing.ownerContributions.amount;
            prevAmount = previousCashFlow?.financing.ownerContributions.amount;
            break;
          case "ownerWithdrawals":
            amount = -cashFlow.financing.ownerWithdrawals.amount;
            prevAmount = previousCashFlow ? -previousCashFlow.financing.ownerWithdrawals.amount : null;
            break;
          default:
            return null;
        }

        if (amount === 0 && (prevAmount === 0 || prevAmount === null)) {
          return null;
        }

        let onClick = null;
        if (item.formula === "depreciation") {
          onClick = () => setDrilldown({
            label: "Depreciation Details",
            transactions: cashFlow.operating.adjustments.depreciationDetails.map(d => ({
              id: d.id,
              date: d.created_date || new Date(),
              description: `${d.make} ${d.model} - ${d.license_plate}`,
              reference: d.license_plate,
              amount: d.depreciation,
            })),
            amount: cashFlow.operating.adjustments.depreciation,
          });
        } else if (item.formula === "vehiclePurchases" && cashFlow.investing.vehiclePurchases.details.length > 0) {
          onClick = () => setDrilldown({
            label: "Vehicle Purchases",
            transactions: cashFlow.investing.vehiclePurchases.details.map(v => ({
              id: v.id,
              date: v.created_date || new Date(),
              description: `${v.make} ${v.model}`,
              reference: v.license_plate,
              amount: DEFAULT_VEHICLE_COST,
            })),
            amount: cashFlow.investing.vehiclePurchases.amount,
          });
        }

        return (
          <LineItem
            key={item.id}
            label={item.label}
            amount={amount}
            prevAmount={filters.showComparison && comparisonDateRange ? prevAmount : null}
            indent={item.indent || 1}
            showComparison={filters.showComparison && comparisonDateRange !== null}
            isSubItem={item.indent > 1}
            onClick={onClick}
          />
        );
      });
  };

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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Statement of Cash Flows</h1>
              <p className="text-sm text-zinc-500">
                {format(parseISO(filters.startDate), "MMMM d, yyyy")} to {format(parseISO(filters.endDate), "MMMM d, yyyy")}
                {comparisonDateRange && (
                  <>
                    <span className="mx-2">•</span>
                    vs {format(parseISO(comparisonDateRange.start), "MMM d")} to {format(parseISO(comparisonDateRange.end), "MMM d, yyyy")}
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
            label="Operating Cash Flow"
            value={cashFlow.operating.total}
            previousValue={previousCashFlow?.operating.total}
            icon={<Activity className="w-4 h-4 text-[#3b82c4]" />}
            color="bg-[#e8f4fa]"
          />
          <KPICard
            label="Investing Cash Flow"
            value={cashFlow.investing.total}
            previousValue={previousCashFlow?.investing.total}
            icon={<Building2 className="w-4 h-4 text-[#6c376f]" />}
            color="bg-[#f3e8f4]"
          />
          <KPICard
            label="Financing Cash Flow"
            value={cashFlow.financing.total}
            previousValue={previousCashFlow?.financing.total}
            icon={<Wallet className="w-4 h-4 text-[#e7d356]" />}
            color="bg-[#fdfbe8]"
          />
          <KPICard
            label="Net Change in Cash"
            value={cashFlow.summary.netChange}
            previousValue={previousCashFlow?.summary.netChange}
            icon={<DollarSign className="w-4 h-4 text-[#5cb83a]" />}
            color="bg-[#eefbe7]"
            bgColor={cashFlow.summary.netChange >= 0 ? "bg-[#eefbe7]" : "bg-[#fdeeed]"}
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
                  <Activity className="w-5 h-5 text-[#3b82c4]" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Statement of Cash Flows</h3>
                  <p className="text-xs text-zinc-500">Indirect method - click any line to drill down</p>
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
                  <SectionHeader
                    label="Cash Flows from Operating Activities"
                    isExpanded={expandedSections.operating}
                    onToggle={() => toggleSection('operating')}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                    icon={Activity}
                  />

                  {expandedSections.operating && renderLineItems('operating')}

                  <TotalRow
                    label="Net cash provided by (used in) operating activities"
                    amount={cashFlow.operating.total}
                    prevAmount={previousCashFlow?.operating.total}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />

                  <tr className="h-3"><td colSpan={filters.showComparison ? 5 : 2}></td></tr>

                  <SectionHeader
                    label="Cash Flows from Investing Activities"
                    isExpanded={expandedSections.investing}
                    onToggle={() => toggleSection('investing')}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                    icon={Building2}
                  />

                  {expandedSections.investing && renderLineItems('investing')}

                  <TotalRow
                    label="Net cash used in investing activities"
                    amount={cashFlow.investing.total}
                    prevAmount={previousCashFlow?.investing.total}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />

                  <tr className="h-3"><td colSpan={filters.showComparison ? 5 : 2}></td></tr>

                  <SectionHeader
                    label="Cash Flows from Financing Activities"
                    isExpanded={expandedSections.financing}
                    onToggle={() => toggleSection('financing')}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                    icon={CreditCard}
                  />

                  {expandedSections.financing && renderLineItems('financing')}

                  <TotalRow
                    label="Net cash provided by financing activities"
                    amount={cashFlow.financing.total}
                    prevAmount={previousCashFlow?.financing.total}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />

                  <tr className="h-4"><td colSpan={filters.showComparison ? 5 : 2}></td></tr>

                  <TotalRow
                    label="NET INCREASE (DECREASE) IN CASH"
                    amount={cashFlow.summary.netChange}
                    prevAmount={previousCashFlow?.summary.netChange}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />
                  
                  <LineItem
                    label="Cash at beginning of period"
                    amount={cashFlow.summary.beginningCash}
                    prevAmount={previousCashFlow?.summary.beginningCash}
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />
                  
                  <TotalRow
                    label="CASH AT END OF PERIOD"
                    amount={cashFlow.summary.endingCash}
                    prevAmount={previousCashFlow?.summary.endingCash}
                    isGrandTotal
                    showComparison={filters.showComparison && comparisonDateRange !== null}
                  />
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span>Report ID: CF-{format(new Date(), "yyyyMMddHHmm")}</span>
                  <span>•</span>
                  <span>Currency: EUR</span>
                  <span>•</span>
                  <span>Method: Indirect</span>
                </div>
                <span>UNAUDITED - FOR MANAGEMENT USE ONLY</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#e8f4fa] to-[#d4eaf5] border border-[#d4eaf5]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#d4eaf5] flex items-center justify-center flex-shrink-0">
                {cashFlow.summary.reconciles ? (
                  <CheckCircle2 className="w-4 h-4 text-[#5cb83a]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#e44138]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#2563a3]">
                  {cashFlow.summary.reconciles ? "Cash Flow Reconciled" : "Reconciliation Warning"}
                </p>
                <p className="text-sm text-[#3b82c4] mt-0.5">
                  {cashFlow.summary.reconciles 
                    ? `Beginning cash (${formatCurrency(cashFlow.summary.beginningCash)}) + Net change (${formatCurrency(cashFlow.summary.netChange)}) = Ending cash (${formatCurrency(cashFlow.summary.endingCash)})`
                    : `The calculated ending cash does not match the actual cash position. Difference: ${formatCurrency(Math.abs(cashFlow.summary.endingCash - cashFlow.summary.calculatedEndingCash))}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DrilldownPanel
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        label={drilldown?.label || ""}
        transactions={drilldown?.transactions || []}
        amount={drilldown?.amount || 0}
      />

      <CustomizeModal
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        structure={cashFlowStructure}
        onUpdate={setCashFlowStructure}
      />
    </div>
  );
}