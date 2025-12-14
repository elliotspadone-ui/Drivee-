import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// Small helper to format date range label
function formatRangeLabel(start, end) {
  try {
    const s = format(new Date(start), "d MMM yyyy");
    const e = format(new Date(end), "d MMM yyyy");
    return `${s} to ${e}`;
  } catch {
    return "";
  }
}

export default function RevenueBreakdown() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  });
  const [dateError, setDateError] = useState("");

  const { data: payments = [], isLoading, isError, error } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  const handleDateChange = (key, value) => {
    const nextRange = { ...dateRange, [key]: value };
    setDateRange(nextRange);

    if (nextRange.start && nextRange.end) {
      const startDate = new Date(nextRange.start);
      const endDate = new Date(nextRange.end);
      if (startDate > endDate) {
        setDateError("Start date cannot be after end date");
      } else {
        setDateError("");
      }
    }
  };

  const quickRange = (preset) => {
    const now = new Date();
    if (preset === "this_month") {
      setDateRange({
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      });
      setDateError("");
      return;
    }
    if (preset === "last_month") {
      const last = subMonths(now, 1);
      setDateRange({
        start: format(startOfMonth(last), "yyyy-MM-dd"),
        end: format(endOfMonth(last), "yyyy-MM-dd"),
      });
      setDateError("");
      return;
    }
    if (preset === "last_7") {
      setDateRange({
        start: format(subDays(now, 6), "yyyy-MM-dd"),
        end: format(now, "yyyy-MM-dd"),
      });
      setDateError("");
      return;
    }
  };

  const breakdown = useMemo(() => {
    if (!payments.length) {
      return {
        filtered: [],
        byType: {},
        byMethod: {},
        total: 0,
        count: 0,
        avgAmount: 0,
      };
    }

    const startDate = dateRange.start
      ? new Date(dateRange.start)
      : new Date("1970-01-01");
    // Include full end day
    const endDate = dateRange.end
      ? new Date(`${dateRange.end}T23:59:59`)
      : new Date("2999-12-31");

    const filtered = payments.filter((p) => {
      if (!p || p.status !== "completed") return false;
      const rawDate = p.payment_date || p.created_date;
      if (!rawDate) return false;
      const date = new Date(rawDate);
      return date >= startDate && date <= endDate;
    });

    const byType = filtered.reduce((acc, p) => {
      const type = p.payment_type || "Other";
      const amount = p.amount || 0;
      acc[type] = (acc[type] || 0) + amount;
      return acc;
    }, {});

    const byMethod = filtered.reduce((acc, p) => {
      const method = p.payment_method || "Unknown";
      const amount = p.amount || 0;
      acc[method] = (acc[method] || 0) + amount;
      return acc;
    }, {});

    const total = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
    const count = filtered.length;
    const avgAmount = count > 0 ? total / count : 0;

    return {
      filtered,
      byType,
      byMethod,
      total,
      count,
      avgAmount,
    };
  }, [payments, dateRange.start, dateRange.end]);

  const typeEntries = useMemo(() => {
    const entries = Object.entries(breakdown.byType);
    if (!entries.length || !breakdown.total) return [];
    return entries
      .map(([type, amount]) => ({
        type,
        amount,
        pct: (amount / breakdown.total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [breakdown.byType, breakdown.total]);

  const methodEntries = useMemo(() => {
    const entries = Object.entries(breakdown.byMethod);
    if (!entries.length || !breakdown.total) return [];
    return entries
      .map(([method, amount]) => ({
        method,
        amount,
        pct: (amount / breakdown.total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [breakdown.byMethod, breakdown.total]);

  const handleExport = () => {
    if (!breakdown.filtered.length) {
      toast.info("No completed payments in this date range to export");
      return;
    }

    try {
      const header = [
        "Date",
        "Amount",
        "Currency",
        "PaymentType",
        "PaymentMethod",
        "Status",
        "StudentId",
        "InvoiceId",
      ];

      const rows = breakdown.filtered.map((p) => {
        const dateStr = p.payment_date || p.created_date;
        const date = dateStr ? format(new Date(dateStr), "yyyy-MM-dd") : "";
        return [
          date,
          p.amount || 0,
          p.currency || "EUR",
          p.payment_type || "",
          p.payment_method || "",
          p.status || "",
          p.student_id || "",
          p.invoice_id || "",
        ];
      });

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

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `drivee_revenue_${dateRange.start}_${dateRange.end}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Revenue export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export revenue data");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">Loading payments and revenue...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold text-red-700 mb-2">
            Could not load revenue data
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message || "An unexpected error occurred while loading payments."}
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

  const hasData = breakdown.total > 0 && !dateError;

  return (
    <div className="space-y-6 pb-20">
      {/* Top bar */}
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
        {/* Header and actions */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Revenue Breakdown</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Completed payments by service type and payment method
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatRangeLabel(dateRange.start, dateRange.end)}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3b82c4] text-white rounded-xl font-semibold hover:bg-[#2563a3] text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Date filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <span className="flex items-center text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => quickRange("this_month")}
              className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              This month
            </button>
            <button
              onClick={() => quickRange("last_month")}
              className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Last month
            </button>
            <button
              onClick={() => quickRange("last_7")}
              className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Last 7 days
            </button>
          </div>
        </div>

        {dateError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {dateError}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] rounded-2xl p-5 border border-[#d4eaf5] shadow-sm">
            <p className="text-xs font-medium text-[#3b82c4] mb-1">Total revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              {currency.format(breakdown.total)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {breakdown.count} completed transactions
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-1">
              Average transaction value
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {breakdown.count ? currency.format(breakdown.avgAmount) : "€0"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Across all completed payments in range
            </p>
          </div>
          <div className="bg-[#eefbe7] rounded-2xl p-5 border border-[#d4f4c3] shadow-sm">
            <p className="text-xs font-medium text-[#5cb83a] mb-1">
              Service types
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {typeEntries.length}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Active revenue categories in this period
            </p>
          </div>
        </div>

        {!hasData && !dateError && (
          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm font-medium text-slate-800 mb-1">
              No completed payments in this period
            </p>
            <p className="text-xs text-slate-500">
              Try expanding the date range or check again once new payments are
              recorded.
            </p>
          </div>
        )}

        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* By service type */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                By service type
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Share of revenue by payment type, for example lessons, packages or tests.
              </p>
              <div className="space-y-3">
                {typeEntries.map((item) => (
                  <div
                    key={item.type}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 capitalize">
                        {item.type}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {currency.format(item.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {item.pct.toFixed(0)}% of revenue
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b82c4] to-[#6c376f] rounded-full transition-all"
                        style={{ width: `${Math.max(item.pct, 3)}%` }}
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By payment method */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                By payment method
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Distribution of completed payments by method, such as cards or bank transfers.
              </p>
              <div className="space-y-3">
                {methodEntries.map((item) => (
                  <div
                    key={item.method}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 capitalize">
                        {item.method}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {currency.format(item.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {item.pct.toFixed(0)}% of revenue
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#81da5a] to-[#5cb83a] rounded-full transition-all"
                        style={{ width: `${Math.max(item.pct, 3)}%` }}
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}