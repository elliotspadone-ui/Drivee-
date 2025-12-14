import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function Unbilled() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: bookings = [],
    isLoading: loadingBookings,
    isError: bookingsError,
    error: bookingsErrorObj,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    isError: invoicesError,
    error: invoicesErrorObj,
  } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const {
    data: students = [],
    isLoading: loadingStudents,
    isError: studentsError,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const {
    data: instructors = [],
    isLoading: loadingInstructors,
    isError: instructorsError,
  } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const isLoading =
    loadingBookings ||
    loadingInvoices ||
    loadingStudents ||
    loadingInstructors;

  const isError =
    bookingsError || invoicesError || studentsError || instructorsError;
  const error =
    bookingsErrorObj || invoicesErrorObj || null;

  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [selectedIds, setSelectedIds] = useState([]);

  // Raw unbilled lessons (based on bookings and invoices)
  const rawUnbilled = useMemo(() => {
    const invoicedBookingIds = new Set(
      invoices
        .map((inv) => inv.booking_id)
        .filter(Boolean)
    );
    const today = new Date();

    const list = bookings
      .filter(
        (b) =>
          b &&
          b.status === "completed" &&
          !invoicedBookingIds.has(b.id)
      )
      .map((b) => {
        const dateObj = new Date(b.start_datetime);
        const ageDays = Math.max(0, differenceInDays(today, dateObj));

        return {
          id: b.id,
          date: b.start_datetime,
          studentId: b.student_id,
          instructorId: b.instructor_id,
          price: b.price || 0,
          schoolId: b.school_id,
          ageDays,
        };
      });

    // Most recent first by default
    return list.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );
  }, [bookings, invoices]);

  // Add student and instructor names
  const unbilledLessons = useMemo(() => {
    if (!rawUnbilled.length) return [];

    const studentMap = new Map(
      students.map((s) => [s.id, s])
    );
    const instructorMap = new Map(
      instructors.map((i) => [i.id, i])
    );

    return rawUnbilled.map((lesson) => {
      const student = studentMap.get(lesson.studentId);
      const instructor = instructorMap.get(lesson.instructorId);

      return {
        ...lesson,
        studentName:
          student?.full_name || "Unknown student",
        instructorName:
          instructor?.full_name || "Unknown instructor",
        studentEmail: student?.email || "",
      };
    });
  }, [rawUnbilled, students, instructors]);

  const totalUnbilled = unbilledLessons.reduce(
    (sum, l) => sum + (l.price || 0),
    0
  );
  const avgUnbilledPerLesson = unbilledLessons.length
    ? totalUnbilled / unbilledLessons.length
    : 0;
  const oldestAge = unbilledLessons.length
    ? Math.max(...unbilledLessons.map((l) => l.ageDays))
    : 0;
  const largestLesson = unbilledLessons.reduce(
    (max, l) =>
      !max || l.price > max.price ? l : max,
    null
  );

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const [selectedSummaryTotal, selectedSummaryCount] =
    useMemo(() => {
      if (!selectedIds.length) return [0, 0];
      const selectedSet = new Set(selectedIds);
      const selected = unbilledLessons.filter((l) =>
        selectedSet.has(l.id)
      );
      const total = selected.reduce(
        (sum, l) => sum + (l.price || 0),
        0
      );
      return [total, selected.length];
    }, [selectedIds, unbilledLessons]);

  const displayedLessons = useMemo(() => {
    let result = [...unbilledLessons];

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((l) => {
        const name = l.studentName.toLowerCase();
        const email = l.studentEmail.toLowerCase();
        const instr = l.instructorName.toLowerCase();
        return (
          name.includes(term) ||
          email.includes(term) ||
          instr.includes(term)
        );
      });
    }

    if (ageFilter !== "all") {
      result = result.filter((l) => {
        if (ageFilter === "0_30") {
          return l.ageDays <= 30;
        }
        if (ageFilter === "30_60") {
          return l.ageDays > 30 && l.ageDays <= 60;
        }
        if (ageFilter === "60_plus") {
          return l.ageDays > 60;
        }
        return true;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortConfig.key === "date") {
        cmp =
          new Date(a.date).getTime() -
          new Date(b.date).getTime();
      } else if (sortConfig.key === "amount") {
        cmp = a.price - b.price;
      } else if (sortConfig.key === "student") {
        cmp = a.studentName.localeCompare(
          b.studentName
        );
      } else if (sortConfig.key === "age") {
        cmp = a.ageDays - b.ageDays;
      }

      return sortConfig.direction === "asc"
        ? cmp
        : -cmp;
    });

    return result;
  }, [
    unbilledLessons,
    search,
    ageFilter,
    sortConfig.key,
    sortConfig.direction,
  ]);

  const allVisibleSelected =
    displayedLessons.length > 0 &&
    displayedLessons.every((l) =>
      selectedIds.includes(l.id)
    );

  const toggleLessonSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const visibleIds = new Set(
          displayedLessons.map((l) => l.id)
        );
        return prev.filter((id) => !visibleIds.has(id));
      }
      const visibleIds = displayedLessons.map(
        (l) => l.id
      );
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  };

  const createInvoicesMutation = useMutation({
    mutationFn: async (lessonIds) => {
      const lessonsById = new Map(
        unbilledLessons.map((l) => [l.id, l])
      );
      const bookingsById = new Map(
        bookings.map((b) => [b.id, b])
      );

      const now = new Date();
      const issueDate = format(now, "yyyy-MM-dd");
      const dueDate = format(
        addDays(now, 14),
        "yyyy-MM-dd"
      );

      const invoicesToCreate = lessonIds
        .map((id, index) => {
          const lesson = lessonsById.get(id);
          const booking = bookingsById.get(id);
          if (!lesson || !booking) {
            return null;
          }
          const price = lesson.price || 0;

          return {
            school_id: booking.school_id,
            student_id: lesson.studentId,
            instructor_id: lesson.instructorId,
            booking_id: lesson.id,
            invoice_number: `DRAFT-${format(
              now,
              "yyyyMMdd"
            )}-${String(index + 1).padStart(3, "0")}`,
            issue_date: issueDate,
            due_date: dueDate,
            subtotal: price,
            tax_amount: 0,
            total_amount: price,
            amount_paid: 0,
            status: "draft",
            line_items: [
              {
                description: `Driving lesson on ${format(
                  new Date(lesson.date),
                  "d MMM yyyy"
                )}`,
                quantity: 1,
                unit_price: price,
                amount: price,
              },
            ],
            notes:
              "Draft invoice created from unbilled lessons report",
          };
        })
        .filter(Boolean);

      if (!invoicesToCreate.length) {
        throw new Error("No valid lessons to invoice");
      }

      await base44.entities.Invoice.bulkCreate(
        invoicesToCreate
      );
    },
    onSuccess: () => {
      toast.success(
        "Draft invoices created for selected lessons"
      );
      queryClient.invalidateQueries(["invoices"]);
      setSelectedIds([]);
    },
    onError: (err) => {
      toast.error(
        err?.message ||
          "Could not create draft invoices"
      );
    },
  });

  const handleExport = () => {
    if (!displayedLessons.length) {
      toast.info(
        "No unbilled lessons in the current view to export"
      );
      return;
    }

    try {
      const header = [
        "BookingId",
        "Date",
        "AgeDays",
        "StudentId",
        "StudentName",
        "StudentEmail",
        "InstructorId",
        "InstructorName",
        "Amount",
      ];

      const rows = displayedLessons.map((l) => [
        l.id,
        format(new Date(l.date), "yyyy-MM-dd"),
        l.ageDays,
        l.studentId,
        l.studentName,
        l.studentEmail,
        l.instructorId,
        l.instructorName,
        l.price,
      ]);

      const csv =
        header.join(",") +
        "\n" +
        rows
          .map((row) =>
            row
              .map((field) => {
                const val = String(field ?? "");
                if (
                  val.includes(",") ||
                  val.includes('"') ||
                  val.includes("\n")
                ) {
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
      const fileName =
        "drivee_unbilled_lessons_export.csv";
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Unbilled lessons export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export unbilled lessons");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">
            Loading bookings and invoices...
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
            Could not load unbilled revenue
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message ||
              "An unexpected error occurred while loading data."}
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

  const hasUnbilled = unbilledLessons.length > 0;
  const selectedDisabled =
    !selectedIds.length ||
    createInvoicesMutation.isPending;

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
        {/* Header and actions */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">
              Unbilled Revenue
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Completed lessons that have not yet been invoiced
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Use this view to avoid leaving revenue on the
              table.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82c4] text-white rounded-xl font-semibold hover:bg-[#2563a3] text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() =>
                createInvoicesMutation.mutate(selectedIds)
              }
              disabled={selectedDisabled}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5cb83a] text-white rounded-xl font-semibold hover:bg-[#4a9c2e] text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {createInvoicesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating draft invoices...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Create draft invoices
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#fdfbe8] rounded-2xl p-6 border border-[#f9f3c8] shadow-sm">
            <p className="text-xs font-medium text-[#b8a525] mb-1">
              Total unbilled
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {currency.format(totalUnbilled)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {unbilledLessons.length} completed lessons
              without an invoice
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-1">
              Average unbilled per lesson
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {hasUnbilled
                ? currency.format(avgUnbilledPerLesson)
                : "€0"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Helps you sense pricing and discount impact
            </p>
          </div>
          <div className="bg-[#e8f4fa] rounded-2xl p-6 border border-[#d4eaf5] shadow-sm">
            <p className="text-xs font-medium text-[#3b82c4] mb-1">
              Oldest unbilled lesson
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {hasUnbilled ? `${oldestAge} days` : "No backlog"}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Aim to keep this number low for healthy cash
              flow
            </p>
          </div>
        </div>

        {/* Selection summary */}
        {selectedSummaryCount > 0 && (
        <div className="mb-6 rounded-xl border border-[#d4eaf5] bg-[#e8f4fa] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-slate-800">
              {selectedSummaryCount} lessons selected
              for invoicing, totaling{" "}
              <span className="font-semibold">
                {currency.format(selectedSummaryTotal)}
              </span>
              .
            </p>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium text-[#3b82c4] hover:text-[#2563a3]"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-500">
              Showing {displayedLessons.length} of{" "}
              {unbilledLessons.length} unbilled lessons
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search by student or instructor"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setAgeFilter("all")}
                className={`px-3 py-1.5 rounded-full border ${
                  ageFilter === "all"
                    ? "border-[#3b82c4] bg-[#e8f4fa] text-[#3b82c4]"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                All ages
              </button>
              <button
                onClick={() => setAgeFilter("0_30")}
                className={`px-3 py-1.5 rounded-full border ${
                  ageFilter === "0_30"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                0-30 days
              </button>
              <button
                onClick={() => setAgeFilter("30_60")}
                className={`px-3 py-1.5 rounded-full border ${
                  ageFilter === "30_60"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                30-60 days
              </button>
              <button
                onClick={() => setAgeFilter("60_plus")}
                className={`px-3 py-1.5 rounded-full border ${
                  ageFilter === "60_plus"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                60+ days
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                    <span>Select</span>
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-left text-xs font-semibold text-gray-700 cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  <span className="inline-flex items-center gap-1">
                    Date
                    <span className="text-[10px]">
                      {getSortIndicator("date")}
                    </span>
                  </span>
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700">
                  Student
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700">
                  Instructor
                </th>
                <th
                  className="py-3 px-4 text-right text-xs font-semibold text-gray-700 cursor-pointer"
                  onClick={() => handleSort("amount")}
                >
                  <span className="inline-flex items-center gap-1">
                    Amount
                    <span className="text-[10px]">
                      {getSortIndicator("amount")}
                    </span>
                  </span>
                </th>
                <th
                  className="py-3 px-4 text-right text-xs font-semibold text-gray-700 cursor-pointer"
                  onClick={() => handleSort("age")}
                >
                  <span className="inline-flex items-center gap-1">
                    Age (days)
                    <span className="text-[10px]">
                      {getSortIndicator("age")}
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedLessons.map((lesson) => (
                <tr
                  key={lesson.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(
                        lesson.id
                      )}
                      onChange={() =>
                        toggleLessonSelection(
                          lesson.id
                        )
                      }
                    />
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {format(
                      new Date(lesson.date),
                      "MMM d, yyyy"
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {lesson.studentName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {lesson.studentEmail ||
                          `ID: ${lesson.studentId}`}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {lesson.instructorName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {lesson.instructorId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                    {currency.format(lesson.price)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        lesson.ageDays > 60
                          ? "bg-[#fdeeed] text-[#c9342c]"
                          : lesson.ageDays > 30
                          ? "bg-[#fdfbe8] text-[#b8a525]"
                          : "bg-[#eefbe7] text-[#4a9c2e]"
                      }`}
                    >
                      {lesson.ageDays}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!hasUnbilled && (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-gray-800 mb-1">
                All completed lessons have been invoiced
              </p>
              <p className="text-xs text-gray-500">
                As new lessons are completed, any that are
                not invoiced will appear here.
              </p>
            </div>
          )}

          {hasUnbilled &&
            displayedLessons.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  No unbilled lessons match your filters
                </p>
                <p className="text-xs text-gray-500">
                  Try adjusting the age filter or clearing
                  the search.
                </p>
              </div>
            )}
        </div>

        {/* Insight about largest lesson */}
        {largestLesson && (
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            Largest unbilled lesson is{" "}
            <span className="font-semibold">
              {currency.format(largestLesson.price)}
            </span>{" "}
            for {largestLesson.studentName} with{" "}
            {largestLesson.instructorName} on{" "}
            {format(
              new Date(largestLesson.date),
              "d MMM yyyy"
            )}
            .
          </div>
        )}
      </div>
    </div>
  );
}