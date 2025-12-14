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

function formatRangeLabel(start, end) {
  try {
    const s = format(new Date(start), "d MMM yyyy");
    const e = format(new Date(end), "d MMM yyyy");
    return `${s} to ${e}`;
  } catch {
    return "";
  }
}

export default function SalesByStudent() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  });
  const [dateError, setDateError] = useState("");
  const [search, setSearch] = useState("");

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsErrorObj,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const {
    data: payments = [],
    isLoading: loadingPayments,
    isError: paymentsError,
    error: paymentsErrorObj,
  } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  const isLoading = loadingStudents || loadingPayments;
  const isError = studentsError || paymentsError;
  const error = studentsErrorObj || paymentsErrorObj;

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
    if (preset === "last_30") {
      setDateRange({
        start: format(subDays(now, 29), "yyyy-MM-dd"),
        end: format(now, "yyyy-MM-dd"),
      });
      setDateError("");
    }
  };

  const report = useMemo(() => {
    if (!students.length) return [];

    const startDate = dateRange.start
      ? new Date(dateRange.start)
      : new Date("1970-01-01");
    // include entire end day
    const endDate = dateRange.end
      ? new Date(`${dateRange.end}T23:59:59`)
      : new Date("2999-12-31");

    const rows = students.map((student) => {
      const studentPayments = payments.filter((p) => {
        if (!p || p.status !== "completed") return false;
        if (p.student_id !== student.id) return false;

        const rawDate = p.payment_date || p.created_date;
        if (!rawDate) return false;
        const date = new Date(rawDate);
        return date >= startDate && date <= endDate;
      });

      const totalSpent = studentPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      return {
        id: student.id,
        name: student.full_name,
        email: student.email,
        transactions: studentPayments.length,
        totalSpent,
        avgTransaction:
          studentPayments.length > 0
            ? totalSpent / studentPayments.length
            : 0,
      };
    });

    return rows
      .filter((r) => r.transactions > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [students, payments, dateRange.start, dateRange.end]);

  const filteredReport = useMemo(() => {
    if (!search.trim()) return report;
    const term = search.toLowerCase();
    return report.filter((row) => {
      const name = row.name ? row.name.toLowerCase() : "";
      const email = row.email ? row.email.toLowerCase() : "";
      return name.includes(term) || email.includes(term);
    });
  }, [report, search]);

  const totalRevenue = report.reduce((sum, r) => sum + r.totalSpent, 0);
  const activeStudents = report.length;
  const avgPerStudent = activeStudents > 0 ? totalRevenue / activeStudents : 0;
  const topStudent = report[0];

  const handleExport = () => {
    if (!report.length) {
      toast.info("No student revenue in this date range to export");
      return;
    }

    try {
      const header = [
        "StudentId",
        "Name",
        "Email",
        "Transactions",
        "TotalSpent",
        "AvgTransaction",
        "PeriodStart",
        "PeriodEnd",
      ];

      const rows = report.map((row) => [
        row.id,
        row.name || "",
        row.email || "",
        row.transactions,
        row.totalSpent,
        row.avgTransaction,
        dateRange.start,
        dateRange.end,
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

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `drivee_sales_by_student_${dateRange.start}_${dateRange.end}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Sales by student export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export student sales");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">
            Loading students and payments...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold text-red-700 mb-2">
            Could not load sales by student
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message || "An unexpected error occurred while loading data."}
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

  const hasData = report.length > 0 && !dateError;

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
        {/* Header and export */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Sales by Student</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Revenue and purchase history per student based on completed payments
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatRangeLabel(dateRange.start, dateRange.end)}
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

        {/* Filters */}
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
              onClick={() => quickRange("last_30")}
              className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Last 30 days
            </button>
          </div>
        </div>

        {dateError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {dateError}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#eefbe7] rounded-2xl p-6 border border-[#d4f4c3] shadow-sm">
            <p className="text-xs font-medium text-[#5cb83a] mb-1">
              Total student revenue
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {currency.format(totalRevenue)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {activeStudents} active students in this period
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-1">
              Average revenue per active student
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {activeStudents ? currency.format(avgPerStudent) : "€0"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Based on completed payments only
            </p>
          </div>
          <div className="bg-[#e8f4fa] rounded-2xl p-6 border border-[#d4eaf5] shadow-sm">
            <p className="text-xs font-medium text-[#3b82c4] mb-1">
              Top student by revenue
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {topStudent ? topStudent.name : "No data"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {topStudent
                ? `${currency.format(topStudent.totalSpent)} in ${topStudent.transactions} transactions`
                : "Once payments are recorded, your top students will appear here."}
            </p>
          </div>
        </div>

        {/* Search and table */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing {filteredReport.length} of {report.length} students with payments
            </p>
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                    Student
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                    Email
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                    Transactions
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                    Total spent
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">
                    Avg transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.map((row, index) => {
                  const isTop3 = index < 3;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        isTop3 ? "bg-[#fdfbe8]" : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {row.name || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {row.email || "Not provided"}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-700">
                        {row.transactions}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-[#5cb83a]">
                        {currency.format(row.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-700">
                        {row.avgTransaction
                          ? currency.format(row.avgTransaction)
                          : "€0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {hasData && filteredReport.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  No students match your search
                </p>
                <p className="text-xs text-gray-500">
                  Try a different name or email, or clear the search.
                </p>
              </div>
            )}

            {!hasData && !dateError && (
              <div className="text-center py-12">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  No student payments for this period
                </p>
                <p className="text-xs text-gray-500">
                  Adjust the date range or check again once payments are recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}