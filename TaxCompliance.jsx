import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Download, 
  Calendar, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Receipt,
  CheckCircle,
  Clock,
  Send,
  FileCheck,
  Archive,
  Eye,
  Calculator,
  Building2,
  CreditCard,
  Banknote,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Filter,
  Search,
  ChevronDown,
  BarChart3,
  PieChart,
  RefreshCw,
  BookOpen,
  Shield,
  Award,
  AlertTriangle,
  Plus
} from "lucide-react";
import { 
  format, 
  startOfQuarter, 
  endOfQuarter, 
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subQuarters,
  subMonths,
  addDays,
  differenceInDays,
  isWithinInterval
} from "date-fns";
import { toast } from "sonner";

const VAT_RATES = {
  standard: 20,
  reduced: 5,
  zero: 0
};

const TAX_CATEGORIES = [
  { value: 'standard', label: 'Standard Rate (20%)', rate: 20 },
  { value: 'reduced', label: 'Reduced Rate (5%)', rate: 5 },
  { value: 'zero', label: 'Zero Rate (0%)', rate: 0 },
  { value: 'exempt', label: 'Exempt', rate: 0 }
];

export default function TaxCompliance() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [viewMode, setViewMode] = useState("summary");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: format(startOfQuarter(new Date()), 'yyyy-MM-dd'),
    end: format(endOfQuarter(new Date()), 'yyyy-MM-dd')
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const { data: taxConfig } = useQuery({
    queryKey: ['tax-config'],
    queryFn: async () => {
      const configs = await base44.entities.TaxConfig.list();
      return configs[0] || { 
        standard_rate: 20, 
        country: "UK",
        vat_scheme: "standard",
        registration_number: "",
        filing_frequency: "quarterly"
      };
    },
  });

  const { data: taxSubmissions = [] } = useQuery({
    queryKey: ['tax-submissions'],
    queryFn: async () => {
      try {
        return await base44.entities.TaxSubmission.list();
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingPayments || loadingExpenses;

  const { periodStart, periodEnd, periodLabel, previousPeriodStart, previousPeriodEnd } = useMemo(() => {
    const now = new Date();
    let start, end, prevStart, prevEnd, label;
    
    switch (selectedPeriod) {
      case "current":
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        prevStart = startOfQuarter(subQuarters(now, 1));
        prevEnd = endOfQuarter(subQuarters(now, 1));
        label = "Current Quarter";
        break;
      case "last":
        start = startOfQuarter(subQuarters(now, 1));
        end = endOfQuarter(subQuarters(now, 1));
        prevStart = startOfQuarter(subQuarters(now, 2));
        prevEnd = endOfQuarter(subQuarters(now, 2));
        label = "Last Quarter";
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        prevStart = startOfYear(subMonths(now, 12));
        prevEnd = endOfYear(subMonths(now, 12));
        label = "This Year";
        break;
      case "custom":
        start = new Date(customDateRange.start);
        end = new Date(customDateRange.end);
        prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
        prevEnd = start;
        label = "Custom Period";
        break;
      default:
        start = startOfQuarter(now);
        end = endOfQuarter(now);
        prevStart = startOfQuarter(subQuarters(now, 1));
        prevEnd = endOfQuarter(subQuarters(now, 1));
        label = "Current Quarter";
    }
    
    return {
      periodStart: start,
      periodEnd: end,
      periodLabel: label,
      previousPeriodStart: prevStart,
      previousPeriodEnd: prevEnd
    };
  }, [selectedPeriod, customDateRange]);

  const calculateTaxReport = useCallback((startDate, endDate) => {
    const periodPayments = payments.filter(p => {
      const date = new Date(p.payment_date || p.created_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) && p.status === "completed";
    });

    const standardRate = (taxConfig?.standard_rate || 20) / 100;
    const grossSales = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netSales = grossSales / (1 + standardRate);
    const taxCollected = grossSales - netSales;

    const periodExpenses = expenses.filter(e => {
      const date = new Date(e.expense_date || e.created_date);
      return isWithinInterval(date, { start: startDate, end: endDate }) && e.vat_deductible === true;
    });

    const expenseTotal = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const taxDeductible = expenseTotal * (standardRate / (1 + standardRate));
    const netTaxDue = taxCollected - taxDeductible;

    const byType = {};
    periodPayments.forEach(p => {
      const type = p.payment_type || "other";
      byType[type] = (byType[type] || 0) + (p.amount || 0);
    });

    const byPaymentMethod = {};
    periodPayments.forEach(p => {
      const method = p.payment_method || "unknown";
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + (p.amount || 0);
    });

    const dailyMap = new Map();
    periodPayments.forEach(p => {
      const dateKey = format(new Date(p.payment_date || p.created_date), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { gross: 0, net: 0, tax: 0 };
      const gross = p.amount || 0;
      const net = gross / (1 + standardRate);
      const tax = gross - net;
      dailyMap.set(dateKey, {
        gross: existing.gross + gross,
        net: existing.net + net,
        tax: existing.tax + tax
      });
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      grossSales,
      netSales,
      taxCollected,
      taxDeductible,
      netTaxDue,
      taxRate: standardRate * 100,
      transactionCount: periodPayments.length,
      byType,
      byPaymentMethod,
      dailyBreakdown
    };
  }, [payments, expenses, taxConfig]);

  const taxReport = useMemo(() => 
    calculateTaxReport(periodStart, periodEnd),
    [calculateTaxReport, periodStart, periodEnd]
  );

  const previousTaxReport = useMemo(() => 
    calculateTaxReport(previousPeriodStart, previousPeriodEnd),
    [calculateTaxReport, previousPeriodStart, previousPeriodEnd]
  );

  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const complianceStatus = useMemo(() => {
    const daysUntilDue = differenceInDays(addDays(periodEnd, 30), new Date());
    const isOverdue = daysUntilDue < 0;
    const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 7;
    const hasOutstanding = taxReport.netTaxDue > 0;

    return {
      status: isOverdue ? 'overdue' : isUrgent ? 'urgent' : hasOutstanding ? 'pending' : 'current',
      daysUntilDue,
      message: isOverdue 
        ? 'Tax filing overdue' 
        : isUrgent 
        ? `Filing due in ${daysUntilDue} days`
        : hasOutstanding
        ? 'Tax payment pending'
        : 'All filings current'
    };
  }, [periodEnd, taxReport.netTaxDue]);

  const exportToPDF = useCallback(() => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; background: #f8fafc; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; border-radius: 16px; margin-bottom: 32px; color: white; }
    h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .period { font-size: 14px; opacity: 0.9; margin-top: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
    .summary-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .summary-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
    .summary-value { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    .summary-subtitle { font-size: 14px; color: #6b7280; }
    .table-container { background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .table-header { background: #f9fafb; padding: 20px; border-bottom: 2px solid #e5e7eb; }
    .table-title { font-size: 18px; font-weight: 700; color: #111827; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f9fafb; padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
    td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #111827; }
    tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-indigo { color: #6366f1; }
    .text-green { color: #059669; }
    .text-red { color: #dc2626; }
    .total-row { background: #f9fafb; font-weight: 700; border-top: 2px solid #d1d5db; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
    .info-box { background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .info-title { font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 8px; }
    .info-text { font-size: 13px; color: #1e40af; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <h1>VAT & Tax Compliance Report</h1>
    <p class="period">Period: ${format(periodStart, 'MMMM d, yyyy')} - ${format(periodEnd, 'MMMM d, yyyy')}</p>
    <p class="period">Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
    <p class="period">Tax Registration: ${taxConfig?.registration_number || 'Not Set'}</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Gross Sales</div>
      <div class="summary-value">€${taxReport.grossSales.toLocaleString()}</div>
      <div class="summary-subtitle">Including VAT</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">VAT Collected</div>
      <div class="summary-value text-indigo">€${taxReport.taxCollected.toLocaleString()}</div>
      <div class="summary-subtitle">At ${taxReport.taxRate.toFixed(1)}% rate</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Net VAT Due</div>
      <div class="summary-value text-green">€${taxReport.netTaxDue.toLocaleString()}</div>
      <div class="summary-subtitle">After deductions</div>
    </div>
  </div>

  <div class="info-box">
    <div class="info-title">Filing Information</div>
    <div class="info-text">
      <strong>Due Date:</strong> ${format(addDays(periodEnd, 30), 'MMMM d, yyyy')}<br>
      <strong>Filing Frequency:</strong> ${taxConfig?.filing_frequency || 'Quarterly'}<br>
      <strong>VAT Scheme:</strong> ${taxConfig?.vat_scheme || 'Standard'}<br>
      <strong>Transactions:</strong> ${taxReport.transactionCount} completed payments
    </div>
  </div>

  <div class="table-container">
    <div class="table-header">
      <div class="table-title">Revenue Breakdown by Category</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th class="text-right">Gross Amount</th>
          <th class="text-right">Net Amount</th>
          <th class="text-right">VAT Amount</th>
          <th class="text-right">% of Total</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(taxReport.byType).map(([type, gross]) => {
          const net = gross / (1 + (taxReport.taxRate / 100));
          const vat = gross - net;
          const percentage = taxReport.grossSales > 0 ? (gross / taxReport.grossSales) * 100 : 0;
          return `
            <tr>
              <td style="text-transform: capitalize;">${type.replace('_', ' ')}</td>
              <td class="text-right">€${gross.toLocaleString()}</td>
              <td class="text-right">€${net.toLocaleString()}</td>
              <td class="text-right text-indigo">€${vat.toLocaleString()}</td>
              <td class="text-right">${percentage.toFixed(1)}%</td>
            </tr>
          `;
        }).join('')}
        <tr class="total-row">
          <td>Total</td>
          <td class="text-right">€${taxReport.grossSales.toLocaleString()}</td>
          <td class="text-right">€${taxReport.netSales.toLocaleString()}</td>
          <td class="text-right text-indigo">€${taxReport.taxCollected.toLocaleString()}</td>
          <td class="text-right">100.0%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="table-container">
    <div class="table-header">
      <div class="table-title">VAT Calculation Summary</div>
    </div>
    <table>
      <tbody>
        <tr>
          <td>VAT Collected on Sales</td>
          <td class="text-right font-bold text-indigo">€${taxReport.taxCollected.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Less: VAT on Deductible Expenses</td>
          <td class="text-right font-bold text-red">-€${taxReport.taxDeductible.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td>Net VAT Due to HMRC</td>
          <td class="text-right font-bold text-green">€${taxReport.netTaxDue.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p><strong>DRIVEE</strong> • Professional Driving School Management System</p>
    <p style="margin-top: 8px;">This is an automatically generated tax report. Please verify all calculations with your accountant.</p>
    <p style="margin-top: 8px;">All values are in EUR. VAT calculations based on ${taxReport.taxRate.toFixed(1)}% standard rate.</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      toast.success('Tax report ready for print/export');
    }
  }, [taxReport, periodStart, periodEnd, taxConfig]);

  const exportToCSV = useCallback(() => {
    const csv = [
      ['DRIVEE VAT & Tax Compliance Report'],
      ['Period', `${format(periodStart, 'yyyy-MM-dd')} to ${format(periodEnd, 'yyyy-MM-dd')}`],
      ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
      ['Tax Registration', taxConfig?.registration_number || 'Not Set'],
      [],
      ['Summary'],
      ['Metric', 'Amount'],
      ['Gross Sales', taxReport.grossSales],
      ['Net Sales', taxReport.netSales],
      ['VAT Collected', taxReport.taxCollected],
      ['VAT Deductible', taxReport.taxDeductible],
      ['Net VAT Due', taxReport.netTaxDue],
      ['Tax Rate', `${taxReport.taxRate}%`],
      ['Transaction Count', taxReport.transactionCount],
      [],
      ['Revenue Breakdown'],
      ['Category', 'Gross Amount', 'Net Amount', 'VAT Amount', '% of Total'],
      ...Object.entries(taxReport.byType).map(([type, gross]) => {
        const net = gross / (1 + (taxReport.taxRate / 100));
        const vat = gross - net;
        const percentage = taxReport.grossSales > 0 ? (gross / taxReport.grossSales) * 100 : 0;
        return [type, gross, net, vat, `${percentage.toFixed(1)}%`];
      }),
      [],
      ['Daily Breakdown'],
      ['Date', 'Gross Sales', 'Net Sales', 'VAT'],
      ...taxReport.dailyBreakdown.map(d => [d.date, d.gross, d.net, d.tax])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tax-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }, [taxReport, periodStart, periodEnd, taxConfig]);

  const handleSubmitReturn = useCallback(async () => {
    try {
      toast.success('Tax return prepared for submission');
    } catch (error) {
      toast.error('Failed to prepare tax return');
    }
  }, [taxReport, periodStart, periodEnd]);

  const MetricChange = ({ current, previous }) => {
    const change = calculateChange(current, previous);
    const isPositive = change >= 0;
    
    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3 text-green-600" />
        ) : (
          <ArrowDownRight className="w-3 h-3 text-red-600" />
        )}
        <span className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading tax data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tax & Compliance</h1>
          <p className="text-gray-600 mt-1">VAT returns, tax reporting, and compliance management</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="current">Current Quarter</option>
            <option value="last">Last Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Period</option>
          </select>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === "summary"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === "detailed"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode("submissions")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === "submissions"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Submissions
            </button>
          </div>
          
          <div className="relative group">
            <button className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={exportToPDF}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3"
              >
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Tax Summary PDF</span>
              </button>
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3"
              >
                <Download className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Transaction CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition flex items-center gap-3"
              >
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Full Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPeriod === "custom" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Custom Date Range</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Start Date</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2">End Date</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl p-6 border-2 ${
        complianceStatus.status === 'overdue' 
          ? 'bg-red-50 border-red-300'
          : complianceStatus.status === 'urgent'
          ? 'bg-amber-50 border-amber-300'
          : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              complianceStatus.status === 'overdue'
                ? 'bg-red-100'
                : complianceStatus.status === 'urgent'
                ? 'bg-amber-100'
                : 'bg-indigo-100'
            }`}>
              <Calendar className={`w-6 h-6 ${
                complianceStatus.status === 'overdue'
                  ? 'text-red-600'
                  : complianceStatus.status === 'urgent'
                  ? 'text-amber-600'
                  : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold ${
                  complianceStatus.status === 'overdue'
                    ? 'text-red-900'
                    : complianceStatus.status === 'urgent'
                    ? 'text-amber-900'
                    : 'text-indigo-900'
                }`}>
                  {periodLabel}: {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
                </p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  complianceStatus.status === 'overdue'
                    ? 'bg-red-200 text-red-900'
                    : complianceStatus.status === 'urgent'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-indigo-200 text-indigo-900'
                }`}>
                  {complianceStatus.message}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <p className={`text-xs font-medium ${
                  complianceStatus.status === 'overdue'
                    ? 'text-red-700'
                    : complianceStatus.status === 'urgent'
                    ? 'text-amber-700'
                    : 'text-indigo-700'
                }`}>
                  Filing Due: {format(addDays(periodEnd, 30), 'MMMM d, yyyy')}
                </p>
                <span className="text-xs text-gray-500">•</span>
                <p className={`text-xs font-medium ${
                  complianceStatus.status === 'overdue'
                    ? 'text-red-700'
                    : complianceStatus.status === 'urgent'
                    ? 'text-amber-700'
                    : 'text-indigo-700'
                }`}>
                  {taxReport.transactionCount} transactions
                </p>
              </div>
            </div>
          </div>
          
          {taxConfig && (
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-600">VAT Registration</p>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {taxConfig.registration_number || 'Not Set'}
              </p>
              <p className="text-xs text-gray-600 mt-1 capitalize">
                {taxConfig.vat_scheme || 'Standard'} Scheme
              </p>
            </div>
          )}
        </div>
      </div>

      {viewMode === "summary" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-indigo-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Gross Sales</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
                €{taxReport.grossSales.toLocaleString()}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Including VAT</p>
                <MetricChange current={taxReport.grossSales} previous={previousTaxReport.grossSales} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-green-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Net Sales</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
                €{taxReport.netSales.toLocaleString()}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Excluding VAT</p>
                <MetricChange current={taxReport.netSales} previous={previousTaxReport.netSales} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-purple-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">VAT Collected</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
                €{taxReport.taxCollected.toLocaleString()}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">At {taxReport.taxRate.toFixed(1)}%</p>
                <MetricChange current={taxReport.taxCollected} previous={previousTaxReport.taxCollected} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 hover:border-indigo-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Net VAT Due</p>
              </div>
              <p className="text-3xl font-bold text-indigo-600 mb-2 tabular-nums">
                €{taxReport.netTaxDue.toLocaleString()}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">After deductions</p>
                <MetricChange current={taxReport.netTaxDue} previous={previousTaxReport.netTaxDue} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue by Category</h3>
              <div className="space-y-3">
                {Object.entries(taxReport.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, gross], index) => {
                    const net = gross / (1 + (taxReport.taxRate / 100));
                    const vat = gross - net;
                    const percentage = taxReport.grossSales > 0 ? (gross / taxReport.grossSales) * 100 : 0;
                    const colors = ['indigo', 'purple', 'blue', 'green', 'cyan'];
                    const color = colors[index % colors.length];
                    
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {type.replace('_', ' ')}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">€{gross.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-2">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r from-${color}-500 to-${color}-600`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Net: €{net.toLocaleString()}</span>
                          <span className="text-xs font-semibold text-indigo-600">VAT: €{vat.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">VAT Calculation</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">VAT Collected</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">€{taxReport.taxCollected.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-amber-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">VAT Deductible</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">-€{taxReport.taxDeductible.toLocaleString()}</span>
                </div>

                <div className="h-px bg-gray-200" />

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Net VAT Due</span>
                  </div>
                  <span className="text-xl font-bold text-indigo-600">€{taxReport.netTaxDue.toLocaleString()}</span>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Payment Information</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        VAT payment due by {format(addDays(periodEnd, 30), 'MMMM d, yyyy')}. 
                        Submit returns electronically via HMRC portal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600 mt-1">Common tax and compliance tasks</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button 
                onClick={handleSubmitReturn}
                className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">Submit Return</p>
                  <p className="text-xs text-gray-600 mt-1">File VAT return</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">Mark as Paid</p>
                  <p className="text-xs text-gray-600 mt-1">Record payment</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all group">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Archive className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">View History</p>
                  <p className="text-xs text-gray-600 mt-1">Past submissions</p>
                </div>
              </button>

              <button className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">HMRC Portal</p>
                  <p className="text-xs text-gray-600 mt-1">Open gateway</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {viewMode === "detailed" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Revenue Breakdown by Category</h3>
              <p className="text-sm text-gray-600 mt-1">Detailed VAT analysis per revenue stream</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-4 px-6 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-700 uppercase">Gross Amount</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-700 uppercase">Net Amount</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-700 uppercase">VAT Amount</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-700 uppercase">% of Total</th>
                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-700 uppercase">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(taxReport.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, gross]) => {
                      const net = gross / (1 + (taxReport.taxRate / 100));
                      const vat = gross - net;
                      const percentage = taxReport.grossSales > 0 ? (gross / taxReport.grossSales) * 100 : 0;
                      
                      return (
                        <tr key={type} className="hover:bg-gray-50 transition">
                          <td className="py-4 px-6 text-sm font-medium text-gray-900 capitalize">
                            {type.replace('_', ' ')}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-right text-gray-900 tabular-nums">
                            €{gross.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm text-right text-gray-700 tabular-nums">
                            €{net.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm font-semibold text-right text-indigo-600 tabular-nums">
                            €{vat.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-sm text-right text-gray-600 tabular-nums">
                            {percentage.toFixed(1)}%
                          </td>
                          <td className="py-4 px-6 text-sm text-right text-gray-600">
                            {taxReport.taxRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                    <td className="py-4 px-6 text-sm text-gray-900">Total</td>
                    <td className="py-4 px-6 text-sm text-right text-gray-900 tabular-nums">
                      €{taxReport.grossSales.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-right text-gray-900 tabular-nums">
                      €{taxReport.netSales.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-right text-indigo-600 tabular-nums">
                      €{taxReport.taxCollected.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-right text-gray-900 tabular-nums">
                      100.0%
                    </td>
                    <td className="py-4 px-6 text-sm text-right text-gray-900">
                      {taxReport.taxRate.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Payment Method Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">Revenue distribution by payment type</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(taxReport.byPaymentMethod)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, amount], index) => {
                    const percentage = taxReport.grossSales > 0 ? (amount / taxReport.grossSales) * 100 : 0;
                    const icons = {
                      card: CreditCard,
                      cash: Banknote,
                      bank_transfer: Building2,
                      online: Wallet
                    };
                    const Icon = icons[method] || DollarSign;
                    
                    return (
                      <div key={method} className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-200 transition">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 capitalize">
                              {method.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-600">{percentage.toFixed(1)}% of total</p>
                          </div>
                          <p className="text-lg font-bold text-gray-900">€{amount.toLocaleString()}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {taxReport.dailyBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Daily Transaction Breakdown</h3>
                <p className="text-sm text-gray-600 mt-1">Day-by-day revenue and VAT analysis</p>
              </div>
              
              <div className="overflow-x-auto max-h-96">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="py-3 px-6 text-right text-xs font-bold text-gray-700 uppercase">Gross Sales</th>
                      <th className="py-3 px-6 text-right text-xs font-bold text-gray-700 uppercase">Net Sales</th>
                      <th className="py-3 px-6 text-right text-xs font-bold text-gray-700 uppercase">VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {taxReport.dailyBreakdown.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-6 text-sm font-medium text-gray-900">
                          {format(new Date(day.date), 'EEE, MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-6 text-sm text-right text-gray-900 tabular-nums">
                          €{day.gross.toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-sm text-right text-gray-700 tabular-nums">
                          €{day.net.toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-sm font-semibold text-right text-indigo-600 tabular-nums">
                          €{day.tax.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === "submissions" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Submission History</h3>
                <p className="text-sm text-gray-600 mt-1">Past VAT returns and tax submissions</p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Submission
              </button>
            </div>

            {taxSubmissions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Submissions Yet</h4>
                <p className="text-gray-600 mb-6">Start by preparing your first VAT return</p>
                <button 
                  onClick={handleSubmitReturn}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Prepare VAT Return
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {taxSubmissions.map((submission) => (
                  <div key={submission.id} className="p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-200 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          submission.status === 'accepted' ? 'bg-green-100' :
                          submission.status === 'submitted' ? 'bg-blue-100' :
                          submission.status === 'rejected' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {submission.status === 'accepted' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                           submission.status === 'submitted' ? <Clock className="w-6 h-6 text-blue-600" /> :
                           submission.status === 'rejected' ? <AlertCircle className="w-6 h-6 text-red-600" /> :
                           <FileText className="w-6 h-6 text-gray-600" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{submission.period}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Due: {format(new Date(submission.dueDate), 'MMM d, yyyy')}
                            {submission.submittedDate && ` • Submitted: ${format(new Date(submission.submittedDate), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">€{submission.amount.toLocaleString()}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            submission.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            submission.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </div>
                        <button className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">Accepted</p>
                  <p className="text-xs text-green-700">Returns approved</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-900">
                {taxSubmissions.filter(s => s.status === 'accepted').length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Pending</p>
                  <p className="text-xs text-blue-700">Under review</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {taxSubmissions.filter(s => s.status === 'submitted' || s.status === 'pending').length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Draft</p>
                  <p className="text-xs text-gray-700">Not submitted</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {taxSubmissions.filter(s => s.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-900 mb-2">Compliance Tips</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Keep digital records of all transactions for at least 6 years</p>
              <p>• Submit VAT returns by the deadline to avoid penalties (£100+ late filing fee)</p>
              <p>• Claim VAT on business expenses where applicable to reduce your liability</p>
              <p>• Consider using the Flat Rate Scheme if turnover is under £150,000</p>
              <p>• Review your VAT scheme annually to ensure it's still optimal for your business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}