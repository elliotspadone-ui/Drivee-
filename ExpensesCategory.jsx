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

export default function ExpensesCategory() {
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
    // Keep the defensive pattern so the page works even if Expense is not wired yet
    queryFn: async () =>
      (base44.entities.Expense?.list &&
        (await base44.entities.Expense.list())) ||
      [],
    retry: false,
  });

  const report = useMemo(() => {
    if (!expenses.length) {
      return {
        byCategory: {},
        total: 0,
        count: 0,
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

    const byCategory = filtered.reduce((acc, e) => {
      const cat = e.category || "Other";
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {});

    const total = Object.values(byCategory).reduce(
      (sum, val) => sum + val,
      0
    );

    return { byCategory, total, count: filtered.length, filteredExpenses: filtered };
  }, [expenses, dateRange]);

  const handleExport = () => {
    if (!report.filteredExpenses.length) {
      toast.info("There are no expenses in this period to export");
      return;
    }

    try {
      const header = [
        "ExpenseId",
        "ExpenseDate",
        "Category",
        "Description",
        "Vendor",
        "Amount",
        "PaymentMethod",
        "CreatedDate",
      ];

      const rows = report.filteredExpenses.map((e) => [
        e.id || "",
        (e.expense_date || e.created_date) || "",
        e.category || "",
        e.description || "",
        e.vendor || "",
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
      link.setAttribute("download", "drivee_expenses_by_category.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Expense report export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export expense report");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">Loading expense breakdown...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold text-red-700 mb-2">
            Could not load expenses
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message ||
              "An unexpected error occurred while loading expenses."}
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

  const categoriesArray = Object.entries(report.byCategory).sort(
    ([, a], [, b]) => b - a
  );
  const hasExpenses = categoriesArray.length > 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">
              Expense by Category
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              See where your driving school spends money by grouping costs into
              clear categories.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this view with your revenue and collections reports to monitor
              margins and cost control.
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
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <span className="flex items-center text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Summary */}
        <div className="bg-[#fdeeed] rounded-2xl p-6 border border-[#f9d4d2] mb-8 shadow-sm">
          <p className="text-sm font-medium text-[#e44138] mb-2">
            Total Expenses
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {currencyFormatter.format(report.total)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {report.count} expense transaction
            {report.count === 1 ? "" : "s"} in this period
          </p>
        </div>

        {/* Category breakdown */}
        {hasExpenses ? (
          <div className="space-y-3">
            {categoriesArray.map(([category, amount]) => {
              const percentage =
                report.total > 0 ? (amount / report.total) * 100 : 0;

              return (
                <div
                  key={category}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-100 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-gray-800 font-medium">
                        {category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-gray-900">
                        {currencyFormatter.format(amount)}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {percentage.toFixed(0)}% of period expenses
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#e44138] rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, percentage)
                        )}%`,
                      }}
                      />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm font-medium text-slate-800 mb-1">
              No expenses for this period
            </p>
            <p className="text-sm text-slate-600">
              Adjust the date range or start recording expenses in Drivee to see
              a category breakdown here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}