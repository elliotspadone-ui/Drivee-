import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function StudentPerformance() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
    error: studentsErrorObj,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
    retry: false,
  });

  const {
    data: bookings = [],
    isLoading: loadingBookings,
    isError: bookingsError,
    error: bookingsErrorObj,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
    retry: false,
  });

  const isLoading = loadingStudents || loadingBookings;
  const isError = studentsError || bookingsError;
  const activeError = studentsErrorObj || bookingsErrorObj;

  const report = useMemo(() => {
    const base = {
      rows: [],
      totalLessons: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      avgCompletionRate: 0,
      theoryPassCount: 0,
      practicalPassCount: 0,
      activeStudents: 0,
    };

    if (!students.length) {
      return base;
    }

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return base;
    }

    const rows = students.map((student) => {
      const studentBookings = bookings.filter((b) => {
        if (b.student_id !== student.id) return false;
        const date = new Date(b.start_datetime);
        if (Number.isNaN(date.getTime())) return false;
        return date >= start && date <= end;
      });

      const completed = studentBookings.filter(
        (b) => b.status === "completed"
      ).length;
      const cancelled = studentBookings.filter(
        (b) => b.status === "cancelled"
      ).length;
      const totalLessons = studentBookings.length;
      const completionRate =
        totalLessons > 0 ? (completed / totalLessons) * 100 : 0;

      const theoryPassed = !!student.theory_exam_passed;
      const practicalPassed = !!student.practical_exam_passed;

      return {
        id: student.id,
        name: student.full_name,
        email: student.email,
        totalLessons,
        completed,
        cancelled,
        completionRate,
        theoryPassed,
        practicalPassed,
      };
    });

    const withLessons = rows
      .filter((r) => r.totalLessons > 0)
      .sort((a, b) => b.completed - a.completed);

    const totalLessons = withLessons.reduce(
      (sum, r) => sum + r.totalLessons,
      0
    );
    const totalCompleted = withLessons.reduce(
      (sum, r) => sum + r.completed,
      0
    );
    const totalCancelled = withLessons.reduce(
      (sum, r) => sum + r.cancelled,
      0
    );
    const theoryPassCount = withLessons.filter((r) => r.theoryPassed).length;
    const practicalPassCount = withLessons.filter(
      (r) => r.practicalPassed
    ).length;

    const avgCompletionRate =
      totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

    return {
      rows: withLessons,
      totalLessons,
      totalCompleted,
      totalCancelled,
      avgCompletionRate,
      theoryPassCount,
      practicalPassCount,
      activeStudents: withLessons.length,
    };
  }, [students, bookings, dateRange]);

  const handleExport = () => {
    if (!report.rows.length) {
      toast.info("There is no student activity in this period to export");
      return;
    }

    try {
      const header = [
        "StudentId",
        "Name",
        "Email",
        "TotalLessons",
        "Completed",
        "Cancelled",
        "CompletionRatePercent",
        "TheoryPassed",
        "PracticalPassed",
        "PeriodStart",
        "PeriodEnd",
      ];

      const rows = report.rows.map((row) => [
        row.id || "",
        row.name || "",
        row.email || "",
        row.totalLessons,
        row.completed,
        row.cancelled,
        row.completionRate.toFixed(1),
        row.theoryPassed ? "Yes" : "No",
        row.practicalPassed ? "Yes" : "No",
        dateRange.start,
        dateRange.end,
      ]);

      const csv =
        header.join(",") +
        "\n" +
        rows
          .map((r) =>
            r
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
      link.setAttribute("download", "drivee_student_performance.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Student performance export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export student data");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">
            Loading student performance data...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700 mb-1">
                Could not load student performance
              </p>
              <p className="text-sm text-slate-700 mb-4">
                {activeError?.message ||
                  "An unexpected error occurred while loading student data."}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasRows = report.rows.length > 0;
  const completionRateLabel = report.avgCompletionRate.toFixed(1);
  const theoryPassRate =
    report.activeStudents > 0
      ? (report.theoryPassCount / report.activeStudents) * 100
      : 0;
  const practicalPassRate =
    report.activeStudents > 0
      ? (report.practicalPassCount / report.activeStudents) * 100
      : 0;

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

      {/* Main content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Student Performance</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Lesson completion and exam outcomes per student.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this view to track engagement, support struggling students and monitor
              progression toward theory and practical exams.
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

        {/* Date range controls */}
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

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#e8f4fa] rounded-2xl p-6 border border-[#d4eaf5] shadow-sm">
            <p className="text-sm font-medium text-[#3b82c4] mb-2">
              Active Students
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {report.activeStudents}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              With at least one lesson in this period
            </p>
          </div>
          <div className="bg-[#eefbe7] rounded-2xl p-6 border border-[#d4f4c3] shadow-sm">
            <p className="text-sm font-medium text-[#5cb83a] mb-2">
              Average Completion Rate
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {completionRateLabel}%
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Completed out of all scheduled lessons
            </p>
          </div>
          <div className="bg-[#fdfbe8] rounded-2xl p-6 border border-[#f9f3c8] shadow-sm">
            <p className="text-sm font-medium text-[#e7d356] mb-2">
              Theory Pass Rate
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {theoryPassRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {report.theoryPassCount} student
              {report.theoryPassCount === 1 ? "" : "s"} passed
            </p>
          </div>
          <div className="bg-[#f3e8f4] rounded-2xl p-6 border border-[#e5d0e6] shadow-sm">
            <p className="text-sm font-medium text-[#6c376f] mb-2">
              Practical Pass Rate
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {practicalPassRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {report.practicalPassCount} student
              {report.practicalPassCount === 1 ? "" : "s"} passed
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Student
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Completed
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Cancelled
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Completion Rate
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Theory
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Practical
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => {
                const lowCompletion = row.completionRate < 75;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {row.email}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {row.completed}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[#e44138]">
                      {row.cancelled}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span
                        className={`inline-flex items-center justify-end px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.completionRate >= 90
                            ? "bg-[#eefbe7] text-[#4a9c2e]"
                            : row.completionRate >= 80
                            ? "bg-[#fdfbe8] text-[#b8a525]"
                            : "bg-[#fdeeed] text-[#c9342c]"
                        }`}
                      >
                        {row.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.theoryPassed ? (
                        <span className="px-2 py-1 bg-[#eefbe7] text-[#4a9c2e] text-xs font-bold rounded">
                          Pass
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                          -
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.practicalPassed ? (
                        <span className="px-2 py-1 bg-[#eefbe7] text-[#4a9c2e] text-xs font-bold rounded">
                          Pass
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!hasRows && (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-gray-800 mb-1">
                No student activity for this period
              </p>
              <p className="text-sm text-gray-500">
                Try widening the date range or confirm that lessons are booked
                under student profiles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}