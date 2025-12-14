import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const ON_TIME_DAYS = 14;

export default function Collections() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
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
    data: payments = [],
    isLoading: loadingPayments,
    isError: paymentsError,
    error: paymentsErrorObj,
  } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  const isLoading = loadingInvoices || loadingPayments;
  const isError = invoicesError || paymentsError;
  const error = invoicesErrorObj || paymentsErrorObj || null;

  const report = useMemo(() => {
    if (!invoices.length && !payments.length) {
      return {
        totalInvoiced: 0,
        totalCollected: 0,
        collectionRate: 0,
        avgDaysToCollect: 0,
        invoiceCount: 0,
        paymentCount: 0,
        onTimeRate: 0,
        paymentDetails: [],
      };
    }

    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    const periodInvoices = invoices.filter((inv) => {
      const date = new Date(inv.issue_date || inv.created_date || inv.due_date);
      if (Number.isNaN(date.getTime())) return false;
      return date >= startDate && date <= endDate;
    });

    const periodPayments = payments.filter((p) => {
      if (p.status !== "completed") return false;
      const date = new Date(p.payment_date || p.created_date);
      if (Number.isNaN(date.getTime())) return false;
      return date >= startDate && date <= endDate;
    });

    const totalInvoiced = periodInvoices.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0
    );
    const totalCollected = periodPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const collectionRate =
      totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    const paymentDetails = periodPayments.map((p) => {
      const invoice =
        (p.invoice_id &&
          invoices.find((inv) => inv.id === p.invoice_id)) ||
        null;
      const invoiceDate = invoice
        ? new Date(
            invoice.issue_date || invoice.created_date || invoice.due_date
          )
        : null;
      const paymentDate = new Date(p.payment_date || p.created_date);
      let daysToCollect = null;

      if (
        invoiceDate &&
        !Number.isNaN(invoiceDate.getTime()) &&
        !Number.isNaN(paymentDate.getTime())
      ) {
        const d = differenceInDays(paymentDate, invoiceDate);
        daysToCollect = d < 0 ? 0 : d;
      }

      return {
        paymentId: p.id,
        invoiceId: invoice?.id || null,
        invoiceNumber: invoice?.invoice_number || "",
        studentId: invoice?.student_id || p.student_id || "",
        amount: p.amount || 0,
        paymentMethod: p.payment_method || "Unknown",
        paymentDate,
        daysToCollect,
      };
    });

    const daysSamples = paymentDetails
      .map((d) => d.daysToCollect)
      .filter((d) => typeof d === "number");
    const avgDaysToCollect =
      daysSamples.length > 0
        ? daysSamples.reduce((sum, d) => sum + d, 0) / daysSamples.length
        : 0;

    const onTimePayments = daysSamples.filter(
      (d) => d !== null && d <= ON_TIME_DAYS
    );
    const onTimeRate =
      daysSamples.length > 0
        ? (onTimePayments.length / daysSamples.length) * 100
        : 0;

    return {
      totalInvoiced,
      totalCollected,
      collectionRate,
      avgDaysToCollect,
      invoiceCount: periodInvoices.length,
      paymentCount: periodPayments.length,
      onTimeRate,
      paymentDetails,
    };
  }, [invoices, payments, dateRange]);

  const handleExport = () => {
    if (!report.paymentDetails.length) {
      toast.info("There are no payments in this period to export");
      return;
    }

    try {
      const header = [
        "InvoiceNumber",
        "InvoiceId",
        "StudentId",
        "PaymentId",
        "PaymentDate",
        "Amount",
        "PaymentMethod",
        "DaysToCollect",
      ];

      const rows = report.paymentDetails.map((d) => [
        d.invoiceNumber || "",
        d.invoiceId || "",
        d.studentId || "",
        d.paymentId || "",
        d.paymentDate ? d.paymentDate.toISOString() : "",
        (d.amount || 0).toFixed(2),
        d.paymentMethod || "",
        d.daysToCollect !== null && d.daysToCollect !== undefined
          ? d.daysToCollect
          : "",
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
      const fileName = "drivee_collections_report.csv";
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Collections report export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export collections report");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">
            Loading collections performance...
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
            Could not load collections report
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message ||
              "An unexpected error occurred while loading invoices or payments."}
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

  const hasActivity =
    report.invoiceCount > 0 || report.paymentCount > 0;

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
              Collections Report
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              How quickly and reliably your driving school turns invoices into cash.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Use this view with your aging and statements pages to monitor working capital.
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

        {hasActivity ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-[#e8f4fa] rounded-2xl p-6 border border-[#d4eaf5] shadow-sm">
                <p className="text-sm font-medium text-[#3b82c4] mb-2">
                  Total Invoiced
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencyFormatter.format(report.totalInvoiced)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {report.invoiceCount} invoice
                  {report.invoiceCount === 1 ? "" : "s"} in this period
                </p>
              </div>
              <div className="bg-[#eefbe7] rounded-2xl p-6 border border-[#d4f4c3] shadow-sm">
                <p className="text-sm font-medium text-[#5cb83a] mb-2">
                  Total Collected
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencyFormatter.format(report.totalCollected)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {report.paymentCount} payment
                  {report.paymentCount === 1 ? "" : "s"} in this period
                </p>
              </div>
              <div className="bg-[#f3e8f4] rounded-2xl p-6 border border-[#e5d0e6] shadow-sm">
                <p className="text-sm font-medium text-[#6c376f] mb-2">
                  Collection Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {report.collectionRate.toFixed(1)}%
                </p>
                <div className="mt-2 h-2 w-full bg-[#e5d0e6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6c376f] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, report.collectionRate)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">
                  Collected cash relative to invoices issued in this period
                </p>
              </div>
              <div className="bg-[#fdfbe8] rounded-2xl p-6 border border-[#f9f3c8] shadow-sm">
                <p className="text-sm font-medium text-[#e7d356] mb-2">
                  Avg Days to Collect
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {report.avgDaysToCollect.toFixed(0)}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    days
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {report.onTimeRate.toFixed(0)}% of payments received within{" "}
                  {ON_TIME_DAYS} days
                </p>
              </div>
            </div>

            {/* Recent payments with days to collect */}
            <div className="mt-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Payments and collection delays
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                A sample of payments in this period with the number of days
                between invoice issue and payment.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">
                        Invoice
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">
                        Student ID
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">
                        Payment date
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                        Method
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                        Days to collect
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.paymentDetails.length > 0 ? (
                      report.paymentDetails
                        .slice()
                        .sort((a, b) => {
                          const da = a.daysToCollect ?? 0;
                          const db = b.daysToCollect ?? 0;
                          return db - da;
                        })
                        .slice(0, 20)
                        .map((p) => {
                          const isSlow =
                            typeof p.daysToCollect === "number" &&
                            p.daysToCollect > ON_TIME_DAYS;
                          return (
                            <tr
                              key={p.paymentId}
                              className={`border-b border-gray-100 hover:bg-gray-50 ${
                                isSlow ? "bg-[#fdfbe8]" : ""
                              }`}
                            >
                              <td className="py-3 px-4 text-sm">
                                {p.invoiceNumber || "No invoice number"}
                              </td>
                              <td className="py-3 px-4 text-sm font-mono text-xs">
                                {p.studentId || "N/A"}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {p.paymentDate
                                  ? p.paymentDate.toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-semibold">
                                {currencyFormatter.format(p.amount || 0)}
                              </td>
                              <td className="py-3 px-4 text-sm text-right text-gray-600 capitalize">
                                {p.paymentMethod}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                {p.daysToCollect !== null &&
                                p.daysToCollect !== undefined
                                  ? p.daysToCollect
                                  : "N/A"}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 px-4 text-center text-sm text-gray-500"
                        >
                          No payments in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-sm font-medium text-slate-800 mb-1">
              No invoice or payment activity in this period
            </p>
            <p className="text-sm text-slate-600">
              Adjust the date range or start issuing invoices and recording
              payments in Drivee to see your collections performance here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}