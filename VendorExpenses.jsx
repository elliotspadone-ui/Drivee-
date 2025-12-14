import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export default function VendorExpenses() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const {
    data: expenses = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      if (!base44.entities.Expense || !base44.entities.Expense.list) {
        return [];
      }
      return await base44.entities.Expense.list();
    },
    retry: false,
  });

  const report = useMemo(() => {
    if (!expenses.length) {
      return {
        vendors: [],
        totalSpent: 0,
        totalTransactions: 0,
        filteredExpenses: [],
      };
    }

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const filtered = expenses.filter((e) => {
      const date = new Date(e.expense_date || e.created_date);
      if (Number.isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    });

    const byVendor = filtered.reduce((acc, e) => {
      const vendor = e.vendor || "Unknown Vendor";
      if (!acc[vendor]) {
        acc[vendor] = { vendor, total: 0, count: 0, expenses: [] };
      }
      acc[vendor].total += e.amount || 0;
      acc[vendor].count += 1;
      acc[vendor].expenses.push(e);
      return acc;
    }, {});

    const vendors = Object.values(byVendor).sort((a, b) => b.total - a.total);
    const totalSpent = vendors.reduce((sum, v) => sum + v.total, 0);
    const totalTransactions = vendors.reduce((sum, v) => sum + v.count, 0);

    return { vendors, totalSpent, totalTransactions, filteredExpenses: filtered };
  }, [expenses, dateRange]);

  const handleExport = () => {
    if (!report.filteredExpenses.length) {
      toast.info("There are no vendor expenses in this period to export");
      return;
    }

    try {
      const header = [
        "ExpenseId",
        "ExpenseDate",
        "Vendor",
        "Category",
        "Description",
        "Amount",
        "PaymentMethod",
        "CreatedDate",
      ];

      const rows = report.filteredExpenses.map((e) => [
        e.id || "",
        (e.expense_date || e.created_date) || "",
        e.vendor || "",
        e.category || "",
        e.description || "",
        (e.amount || 0).toFixed(2),
        e.payment_method || "",
        e.created_date || "",
      ]);

      const csv =
        header.join(",") +
        "\n" +
        rows
          .map((row) =>
            row
              .map((field) => {
                const val = String(field ?? "");
                if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                  return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
              })
              .join(",")
          )
          .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "drivee_vendor_expenses.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Vendor expense export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export vendor expenses");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">Loading vendor expenses...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold text-red-700 mb-2">
            Could not load vendor expenses
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message || "An unexpected error occurred while loading expenses."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  const hasVendors = report.vendors.length > 0;
  const topVendor = hasVendors ? report.vendors[0] : null;

  return (
    <div className="space-y-6 pb-20">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Vendor Expense Detail</h1>
            <p className="text-gray-600 mt-1 text-sm">
              See how much you spend with each vendor over a given period.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this to monitor recurring costs like fuel, maintenance and insurance and to support supplier negotiations.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82c4] text-white rounded-xl font-semibold hover:bg-[#2563a3] text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <span className="flex items-center text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#fdeeed] rounded-2xl p-6 border border-[#f9d4d2] shadow-sm">
            <p className="text-sm font-medium text-[#e44138] mb-2">Total Vendor Spending</p>
            <p className="text-3xl font-bold text-gray-900">
              {currencyFormatter.format(report.totalSpent)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {report.totalTransactions} expense transaction
              {report.totalTransactions === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-2">Active Vendors</p>
            <p className="text-3xl font-bold text-gray-900">{report.vendors.length}</p>
            <p className="text-sm text-gray-600 mt-1">
              Vendors with at least one expense in this period
            </p>
          </div>

          <div className="bg-[#e8f4fa] rounded-2xl p-6 border border-[#d4eaf5] shadow-sm">
            <p className="text-sm font-medium text-[#3b82c4] mb-2">Top Vendor</p>
            {topVendor ? (
              <>
                <p className="text-lg font-semibold text-gray-900 truncate">
                  {topVendor.vendor}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  {currencyFormatter.format(topVendor.total)} total • {topVendor.count} transaction
                  {topVendor.count === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600 mt-1">
                No vendor expenses recorded in this period
              </p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Vendor
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Transactions
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Total Spent
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Avg per Transaction
                </th>
              </tr>
            </thead>
            <tbody>
              {report.vendors.map((row) => (
                <tr key={row.vendor} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {row.vendor}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-700">
                    {row.count}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold text-[#e44138]">
                    {currencyFormatter.format(row.total)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">
                    {currencyFormatter.format(row.total / Math.max(row.count, 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!hasVendors && (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-gray-800 mb-1">
                No vendor expenses for this period
              </p>
              <p className="text-sm text-gray-500">
                Try widening the date range or start recording expenses in Drivee to see vendor trends here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}