import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function Aging() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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
    error: studentsErrorObj,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const isLoading = loadingInvoices || loadingStudents;
  const isError = invoicesError || studentsError;
  const error = invoicesErrorObj || studentsErrorObj || null;

  const agingReport = useMemo(() => {
    if (!invoices.length) {
      return {
        buckets: { "0-30": [], "31-60": [], "61-90": [], "90+": [] },
        totals: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
        grandTotal: 0,
        totalOverdue: 0,
      };
    }

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const today = new Date();

    const buckets = {
      "0-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };

    invoices.forEach((inv) => {
      if (!inv || inv.status === "paid" || !inv.due_date) {
        return;
      }

      const dueDate = new Date(inv.due_date);
      if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
        return;
      }

      if (dueDate >= today) {
        return;
      }

      const daysOverdue = differenceInDays(today, dueDate);
      const amountDue = (inv.total_amount || 0) - (inv.amount_paid || 0);
      if (amountDue <= 0) {
        return;
      }

      const student = inv.student_id ? studentMap.get(inv.student_id) : null;
      const enrichedInvoice = {
        ...inv,
        daysOverdue,
        amountDue,
        studentName: student?.full_name || "Unknown student",
        studentEmail: student?.email || "",
      };

      if (daysOverdue <= 30) {
        buckets["0-30"].push(enrichedInvoice);
      } else if (daysOverdue <= 60) {
        buckets["31-60"].push(enrichedInvoice);
      } else if (daysOverdue <= 90) {
        buckets["61-90"].push(enrichedInvoice);
      } else {
        buckets["90+"].push(enrichedInvoice);
      }
    });

    const totals = {
      "0-30": buckets["0-30"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "31-60": buckets["31-60"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "61-90": buckets["61-90"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "90+": buckets["90+"].reduce((sum, inv) => sum + inv.amountDue, 0),
    };

    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const totalOverdue =
      buckets["0-30"].length +
      buckets["31-60"].length +
      buckets["61-90"].length +
      buckets["90+"].length;

    return { buckets, totals, grandTotal, totalOverdue };
  }, [invoices, students]);

  const matchesSearch = (inv) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(term)) ||
      (inv.studentName && inv.studentName.toLowerCase().includes(term)) ||
      (inv.studentEmail && inv.studentEmail.toLowerCase().includes(term))
    );
  };

  const filteredBuckets = useMemo(() => {
    const result = {
      "0-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };

    Object.entries(agingReport.buckets).forEach(([bucket, list]) => {
      const filtered = list
        .slice()
        .sort((a, b) => b.amountDue - a.amountDue)
        .filter(matchesSearch);
      result[bucket] = filtered;
    });

    return result;
  }, [agingReport.buckets, search]);

  const filteredTotals = useMemo(() => {
    return {
      "0-30": filteredBuckets["0-30"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "31-60": filteredBuckets["31-60"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "61-90": filteredBuckets["61-90"].reduce((sum, inv) => sum + inv.amountDue, 0),
      "90+": filteredBuckets["90+"].reduce((sum, inv) => sum + inv.amountDue, 0),
    };
  }, [filteredBuckets]);

  const filteredGrandTotal = Object.values(filteredTotals).reduce((sum, val) => sum + val, 0);
  const hasOverdue = agingReport.grandTotal > 0;

  const share90Plus =
    agingReport.grandTotal > 0
      ? (agingReport.totals["90+"] / agingReport.grandTotal) * 100
      : 0;

  const handleExport = () => {
    const flat = [
      ...filteredBuckets["0-30"],
      ...filteredBuckets["31-60"],
      ...filteredBuckets["61-90"],
      ...filteredBuckets["90+"],
    ];

    if (!flat.length) {
      toast.info("No overdue invoices in the current view to export");
      return;
    }

    try {
      const header = [
        "InvoiceNumber",
        "StudentName",
        "StudentEmail",
        "DueDate",
        "DaysOverdue",
        "AmountDue",
        "Status",
        "Bucket",
      ];

      const rows = flat.map((inv) => {
        const bucket = (() => {
          if (inv.daysOverdue <= 30) return "0-30";
          if (inv.daysOverdue <= 60) return "31-60";
          if (inv.daysOverdue <= 90) return "61-90";
          return "90+";
        })();

        return [
          inv.invoice_number || "",
          inv.studentName || "",
          inv.studentEmail || "",
          inv.due_date || "",
          inv.daysOverdue,
          inv.amountDue,
          inv.status || "",
          bucket,
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

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = "drivee_aging_report.csv";
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Aging report export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export aging report");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">Loading accounts receivable aging...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-red-100 rounded-xl p-6 max-w-md w-full">
          <p className="text-lg font-semibold text-red-700 mb-2">
            Could not load aging report
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message || "An unexpected error occurred while loading invoices or students."}
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Accounts Receivable Aging</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Outstanding invoices grouped by how long they have been overdue
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This helps you focus collection efforts where risk is highest.
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

        {/* Summary */}
        {hasOverdue ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#fdeeed] rounded-xl p-6 border border-[#f9d4d2]">
                <p className="text-xs font-medium text-[#c9342c] mb-1">Total outstanding</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currencyFormatter.format(agingReport.grandTotal)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {agingReport.totalOverdue} overdue invoice
                  {agingReport.totalOverdue !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="bg-[#fdfbe8] rounded-xl p-6 border border-[#f9f3c8]">
                <p className="text-xs font-medium text-[#b8a525] mb-1">90+ days share</p>
                <p className="text-3xl font-bold text-gray-900">
                  {share90Plus.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Portion of outstanding value in the riskiest bucket
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-1">Filtered total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currencyFormatter.format(filteredGrandTotal)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  After applying the search filter below
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div className="text-xs text-slate-500">
                Showing invoices by aging bucket. Filter by student or invoice number to narrow down.
              </div>
              <div className="w-full md:w-72">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student or invoice..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Bucket cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {Object.entries(agingReport.totals).map(([bucket, total]) => {
                const count = agingReport.buckets[bucket].length;
                const filteredTotal = filteredTotals[bucket] || 0;
                const colorClasses =
                  bucket === "90+"
                    ? "bg-[#fdeeed] border-[#f9d4d2]"
                    : bucket === "61-90"
                    ? "bg-[#fdfbe8] border-[#f9f3c8]"
                    : bucket === "31-60"
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-gray-50 border-gray-200";

                return (
                  <div
                    key={bucket}
                    className={`${colorClasses} rounded-2xl p-4 border shadow-sm`}
                  >
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      {bucket} days overdue
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {currencyFormatter.format(total)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {count} invoice{count !== 1 ? "s" : ""} total
                    </p>
                    {search.trim() && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {currencyFormatter.format(filteredTotal)} in view after filter
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed tables per bucket */}
            {Object.entries(filteredBuckets).map(([bucket, invoiceList]) => {
              if (!invoiceList.length) return null;

              const bucketTitle =
                bucket === "0-30"
                  ? "0 to 30 days overdue"
                  : bucket === "31-60"
                  ? "31 to 60 days overdue"
                  : bucket === "61-90"
                  ? "61 to 90 days overdue"
                  : "90+ days overdue";

              return (
                <div key={bucket} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    {bucketTitle}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                            Invoice #
                          </th>
                          <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                            Student
                          </th>
                          <th className="text-left py-2 px-4 text-xs font-semibold text-gray-700">
                            Due date
                          </th>
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                            Days overdue
                          </th>
                          <th className="text-right py-2 px-4 text-xs font-semibold text-gray-700">
                            Amount due
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceList.map((inv) => (
                          <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-4 text-sm">
                              {inv.invoice_number || "N/A"}
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {inv.studentName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {inv.studentEmail || `ID: ${inv.student_id}`}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              {inv.due_date
                                ? format(new Date(inv.due_date), "MMM d, yyyy")
                                : "-"}
                            </td>
                            <td className="py-2 px-4 text-sm text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  inv.daysOverdue > 90
                                    ? "bg-[#fdeeed] text-[#c9342c]"
                                    : inv.daysOverdue > 60
                                    ? "bg-[#fdfbe8] text-[#b8a525]"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {inv.daysOverdue}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-sm text-right font-semibold">
                              {currencyFormatter.format(inv.amountDue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="bg-[#eefbe7] rounded-xl p-6 border border-[#d4f4c3]">
            <p className="text-sm font-medium text-[#4a9c2e] mb-1">
              No overdue invoices
            </p>
            <p className="text-sm text-gray-700">
              All invoices are either paid or not yet due. As invoices become overdue, they
              will appear here grouped by aging bucket.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}