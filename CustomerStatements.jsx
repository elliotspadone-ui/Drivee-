import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export default function CustomerStatements() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showOnlyWithBalance, setShowOnlyWithBalance] = useState(true);

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

  const isLoading = loadingStudents || loadingInvoices || loadingPayments;
  const isError = studentsError || invoicesError || paymentsError;
  const error = studentsErrorObj || invoicesErrorObj || paymentsErrorObj || null;

  const statements = useMemo(() => {
    if (!students.length) return [];

    return students.map((student) => {
      const studentInvoices = invoices.filter((inv) => inv.student_id === student.id);
      const studentPayments = payments.filter(
        (p) => p.student_id === student.id && p.status === "completed"
      );

      const totalInvoiced = studentInvoices.reduce(
        (sum, inv) => sum + (inv.total_amount || 0),
        0
      );
      const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const balance = totalInvoiced - totalPaid;

      // Last activity based on latest invoice or payment
      const invoiceDates = studentInvoices
        .map((inv) => inv.issue_date || inv.created_date || inv.due_date)
        .filter(Boolean)
        .map((d) => new Date(d));
      const paymentDates = studentPayments
        .map((p) => p.payment_date || p.created_date)
        .filter(Boolean)
        .map((d) => new Date(d));
      const allDates = [...invoiceDates, ...paymentDates].filter(
        (d) => d instanceof Date && !isNaN(d.getTime())
      );
      const lastActivity =
        allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null;

      return {
        id: student.id,
        name: student.full_name,
        email: student.email,
        totalInvoiced,
        totalPaid,
        balance,
        invoiceCount: studentInvoices.length,
        lastActivity,
      };
    });
  }, [students, invoices, payments]);

  const activeStatements = statements.filter((s) => s.invoiceCount > 0);

  const filteredStatements = useMemo(() => {
    let rows = activeStatements;

    if (showOnlyWithBalance) {
      rows = rows.filter((s) => s.balance > 0.01);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      rows = rows.filter((s) => {
        return (
          (s.name && s.name.toLowerCase().includes(term)) ||
          (s.email && s.email.toLowerCase().includes(term))
        );
      });
    }

    // Sort by largest balance first, then by name
    return rows.slice().sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [activeStatements, search, showOnlyWithBalance]);

  const totals = useMemo(() => {
    const base = activeStatements;

    const totalInvoiced = base.reduce((sum, s) => sum + s.totalInvoiced, 0);
    const totalPaid = base.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalBalance = base.reduce((sum, s) => sum + s.balance, 0);

    return { totalInvoiced, totalPaid, totalBalance };
  }, [activeStatements]);

  const visibleTotals = useMemo(() => {
    const totalInvoiced = filteredStatements.reduce((sum, s) => sum + s.totalInvoiced, 0);
    const totalPaid = filteredStatements.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalBalance = filteredStatements.reduce((sum, s) => sum + s.balance, 0);

    return { totalInvoiced, totalPaid, totalBalance };
  }, [filteredStatements]);

  const handleExport = () => {
    if (!filteredStatements.length) {
      toast.info("There are no customer statements in the current view to export");
      return;
    }

    try {
      const header = [
        "StudentName",
        "Email",
        "TotalInvoiced",
        "TotalPaid",
        "Balance",
        "InvoiceCount",
        "LastActivity",
      ];

      const rows = filteredStatements.map((s) => [
        s.name || "",
        s.email || "",
        s.totalInvoiced.toFixed(2),
        s.totalPaid.toFixed(2),
        s.balance.toFixed(2),
        s.invoiceCount,
        s.lastActivity ? s.lastActivity.toISOString() : "",
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
      const fileName = "drivee_customer_statements.csv";
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Customer statement export generated");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Could not export customer statements");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#3b82c4]" />
          <p className="text-sm text-slate-600">
            Loading customer account statements...
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
            Could not load customer statements
          </p>
          <p className="text-sm text-slate-700 mb-4">
            {error?.message || "An unexpected error occurred while loading students, invoices or payments."}
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

  const hasData = activeStatements.length > 0;
  const hasVisible = filteredStatements.length > 0;

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Customer Account Statements</h1>
            <p className="text-gray-600 mt-1 text-sm">
              High level account summary per student, showing invoiced, paid and outstanding balances.
            </p>
            {hasData && (
              <p className="text-xs text-gray-500 mt-1">
                Use filters to focus on overdue customers and export the current view for your accountant.
              </p>
            )}
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82c4] text-white rounded-xl font-semibold hover:bg-[#2563a3] text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {hasData ? (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <p className="text-xs font-medium text-slate-700 mb-1">Total invoiced</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencyFormatter.format(totals.totalInvoiced)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Across {activeStatements.length} students with invoices
                </p>
              </div>
              <div className="bg-[#eefbe7] rounded-2xl p-5 border border-[#d4f4c3] shadow-sm">
                <p className="text-xs font-medium text-[#5cb83a] mb-1">Total paid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencyFormatter.format(totals.totalPaid)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Payments recorded in Drivee
                </p>
              </div>
              <div className="bg-[#fdfbe8] rounded-2xl p-5 border border-[#f9f3c8] shadow-sm">
                <p className="text-xs font-medium text-[#b8a525] mb-1">Total outstanding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencyFormatter.format(totals.totalBalance)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sum of all student balances
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="w-full md:w-72">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student or email..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyWithBalance}
                  onChange={(e) => setShowOnlyWithBalance(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
                />
                <span>Show only students with outstanding balance</span>
              </label>
            </div>

            {/* Visible totals */}
            <div className="bg-[#e8f4fa] rounded-xl p-4 border border-[#d4eaf5] mb-4">
              <p className="text-xs font-medium text-[#3b82c4] mb-1">
                Current view summary
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <span>
                  Invoiced:{" "}
                  <strong>
                    {currencyFormatter.format(visibleTotals.totalInvoiced)}
                  </strong>
                </span>
                <span>
                  Paid:{" "}
                  <strong>
                    {currencyFormatter.format(visibleTotals.totalPaid)}
                  </strong>
                </span>
                <span>
                  Outstanding:{" "}
                  <strong>
                    {currencyFormatter.format(visibleTotals.totalBalance)}
                  </strong>
                </span>
                <span>
                  Students: <strong>{filteredStatements.length}</strong>
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                      Invoiced
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                      Paid
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                      Balance
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                      Invoices
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700">
                      Last activity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatements.map((row) => {
                    const hasBalance = row.balance > 0.01;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          hasBalance ? "bg-[#fdfbe8]" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {row.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {row.email}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                          {currencyFormatter.format(row.totalInvoiced)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-[#5cb83a] font-semibold">
                          {currencyFormatter.format(row.totalPaid)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-bold">
                          <span
                            className={
                              hasBalance ? "text-[#e44138]" : "text-gray-600"
                            }
                          >
                            {currencyFormatter.format(row.balance)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {row.invoiceCount}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">
                          {row.lastActivity
                            ? row.lastActivity.toLocaleDateString()
                            : "No activity"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!hasVisible && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm mb-2">
                    No students match the current filters
                  </p>
                  <p className="text-xs text-gray-400">
                    Try clearing the search or turning off the balance filter.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <p className="text-sm font-medium text-slate-800 mb-1">
              No student invoices yet
            </p>
            <p className="text-sm text-slate-600">
              Once you start issuing invoices, customer account statements will appear here with invoiced, paid and outstanding balances per student.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}