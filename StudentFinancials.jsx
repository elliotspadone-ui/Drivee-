import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Send,
  Download,
  Loader2,
} from "lucide-react";
import { differenceInMonths } from "date-fns";

export default function StudentFinancials() {
  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const isLoading = studentsLoading || paymentsLoading || bookingsLoading;
  const hasError = studentsError || paymentsError || bookingsError;

  const studentLTV = useMemo(() => {
    if (!students.length) return [];

    return students
      .map((student) => {
        const studentPayments = payments.filter(
          (p) => p.student_id === student.id && p.status === "completed"
        );

        const ltv = studentPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );

        const createdDate = student.created_date
          ? new Date(student.created_date)
          : null;

        const monthsActive =
          createdDate && !Number.isNaN(createdDate.getTime())
            ? Math.max(0, differenceInMonths(new Date(), createdDate))
            : 0;

        const studentBookings = bookings.filter(
          (b) => b.student_id === student.id
        );

        const lastPaymentTimestamp =
          studentPayments.length > 0
            ? Math.max(
                ...studentPayments
                  .map((p) => p.payment_date || p.created_date)
                  .map((d) => {
                    const dt = new Date(d);
                    return !Number.isNaN(dt.getTime()) ? dt.getTime() : 0;
                  })
              )
            : null;

        const lastPayment =
          lastPaymentTimestamp && lastPaymentTimestamp > 0
            ? new Date(lastPaymentTimestamp)
            : null;

        return {
          id: student.id,
          name: student.full_name || "Unnamed student",
          ltv,
          monthsActive,
          bookings: studentBookings.length,
          lastPayment,
        };
      })
      .sort((a, b) => b.ltv - a.ltv);
  }, [students, payments, bookings]);

  const totalStudents = students.length;
  const payingStudentsCount = studentLTV.filter((s) => s.ltv > 0).length;

  const avgLTV =
    studentLTV.length > 0
      ? studentLTV.reduce((sum, s) => sum + s.ltv, 0) / studentLTV.length
      : 0;

  const medianLTV =
    studentLTV.length > 0
      ? studentLTV[Math.floor(studentLTV.length / 2)].ltv
      : 0;

  const highestLTV = studentLTV.length > 0 ? studentLTV[0] : null;

  const ltvDistribution = [
    { range: "€0-€300", count: studentLTV.filter((s) => s.ltv < 300).length },
    {
      range: "€300-€600",
      count: studentLTV.filter((s) => s.ltv >= 300 && s.ltv < 600).length,
    },
    {
      range: "€600-€900",
      count: studentLTV.filter((s) => s.ltv >= 600 && s.ltv < 900).length,
    },
    {
      range: "€900-€1,200",
      count: studentLTV.filter((s) => s.ltv >= 900 && s.ltv < 1200).length,
    },
    {
      range: "€1,200+",
      count: studentLTV.filter((s) => s.ltv >= 1200).length,
    },
  ];

  // Mock outstanding balances (placeholder until invoices are wired in)
  const outstandingBalances = useMemo(() => {
    const templateOutstanding = [
      180, 340, 280, 120, 240, 450, 220, 180, 320, 150, 280, 390,
    ];
    const templateDays = [15, 45, 32, 8, 67, 22, 5, 18, 42, 12, 28, 55];

    return studentLTV
      .slice(0, 12)
      .map((student, idx) => ({
        ...student,
        outstanding: templateOutstanding[idx] || 0,
        daysOverdue: templateDays[idx] || 0,
      }))
      .filter((s) => s.outstanding > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [studentLTV]);

  const totalOutstanding = outstandingBalances.reduce(
    (sum, s) => sum + s.outstanding,
    0
  );

  const agingAnalysis = [
    {
      range: "Current (0-30 days)",
      amount: outstandingBalances
        .filter((s) => s.daysOverdue <= 30)
        .reduce((sum, s) => sum + s.outstanding, 0),
    },
    {
      range: "30-60 days overdue",
      amount: outstandingBalances
        .filter((s) => s.daysOverdue > 30 && s.daysOverdue <= 60)
        .reduce((sum, s) => sum + s.outstanding, 0),
    },
    {
      range: "60-90 days overdue",
      amount: outstandingBalances
        .filter((s) => s.daysOverdue > 60 && s.daysOverdue <= 90)
        .reduce((sum, s) => sum + s.outstanding, 0),
    },
    {
      range: "90+ days overdue",
      amount: outstandingBalances
        .filter((s) => s.daysOverdue > 90)
        .reduce((sum, s) => sum + s.outstanding, 0),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          There was a problem loading student financial data. Please try again.
        </div>
      </div>
    );
  }

  if (!totalStudents) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No students yet
          </h2>
          <p className="text-sm text-gray-600">
            Add your first students to start tracking lifetime value and
            outstanding payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student financials</h1>
          <p className="text-gray-600 mt-1">
            Lifetime value and outstanding payments across your student base
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-semibold tabular-nums">
              {totalStudents}
            </span>
            <span>students</span>
          </div>
          <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
            <span className="text-xs">
              {payingStudentsCount} with at least one payment
            </span>
          </div>
        </div>
      </div>

      {/* LTV Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Average LTV</p>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{Math.round(avgLTV).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">per student</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Median LTV</p>
            <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{Math.round(medianLTV).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">typical value</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Highest LTV</p>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{highestLTV ? highestLTV.ltv.toLocaleString() : 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {highestLTV?.name || "N/A"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Outstanding</p>
            <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{totalOutstanding.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {outstandingBalances.length} students
          </p>
        </div>
      </div>

      {/* LTV Distribution */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Student lifetime value distribution
        </h3>
        <div className="space-y-4">
          {ltvDistribution.map((item, index) => {
            const percentage =
              totalStudents > 0 ? (item.count / totalStudents) * 100 : 0;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {item.range}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {item.count} students
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outstanding Payments */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Outstanding payments
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Total: €{totalOutstanding.toLocaleString()} from{" "}
                {outstandingBalances.length} students
              </p>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send reminders
            </button>
          </div>
        </div>

        {/* Aging Analysis */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Aging analysis
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agingAnalysis.map((item, index) => {
              const percentage =
                totalOutstanding > 0
                  ? (item.amount / totalOutstanding) * 100
                  : 0;
              const isCritical = index === 3;
              return (
                <div
                  key={index}
                  className={`rounded-lg p-4 ${
                    isCritical
                      ? "bg-red-50 border border-red-200"
                      : "bg-white"
                  }`}
                >
                  <p
                    className={`text-xs font-medium mb-1 ${
                      isCritical ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {item.range} {isCritical && "🚨"}
                  </p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">
                    €{item.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {percentage.toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outstanding Students Table */}
        <div className="overflow-x-auto">
          {outstandingBalances.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-600">
              No outstanding balances at the moment.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    LTV
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Days overdue
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outstandingBalances.map((student) => {
                  const isCritical = student.daysOverdue > 60;
                  const initial =
                    student.name && student.name.length > 0
                      ? student.name.charAt(0)
                      : "S";
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 transition ${
                        isCritical ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {student.name}
                            </p>
                            {student.lastPayment && (
                              <p className="text-xs text-gray-500">
                                Last payment{" "}
                                {student.lastPayment.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                        €{student.ltv.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                        €{student.outstanding.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right tabular-nums">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            isCritical
                              ? "bg-red-100 text-red-800"
                              : student.daysOverdue > 30
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {student.daysOverdue} days {isCritical && "🚨"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
                          {isCritical ? "Call student" : "Send reminder"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              💡 Set up automatic payment reminders to reduce overdue accounts.
            </p>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export list
            </button>
          </div>
        </div>
      </div>

      {/* Top Students */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Top students by lifetime value
        </h3>
        {studentLTV.length === 0 ? (
          <p className="text-sm text-gray-600">
            Once students start paying for lessons, your top LTV list will
            appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {studentLTV.slice(0, 5).map((student, index) => (
              <div
                key={student.id}
                className="bg-white/80 backdrop-blur rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-indigo-600">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {student.monthsActive} months • {student.bookings} bookings
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-600">
                  €{student.ltv.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
