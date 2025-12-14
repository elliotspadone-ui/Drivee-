import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Car,
  Calendar,
  DollarSign,
  Award,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  Search,
  RefreshCw,
  Bell,
  BarChart3,
  Target,
  Star,
  Receipt,
  UserPlus,
  Send,
  Loader2,
  Timer,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  subMonths,
  subWeeks,
  subDays,
  addDays,
  differenceInDays,
  differenceInMinutes,
  isToday,
  isTomorrow,
  isPast,
  isFuture,
  isWithinInterval,
  eachDayOfInterval,
} from "date-fns";
import { toast } from "sonner";

/* ---------------------------------------------
   Styling maps (avoid dynamic Tailwind classes)
---------------------------------------------- */
const COLOR_STYLES = {
  indigo: {
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-700",
    chipBg: "bg-indigo-50",
    chipText: "text-indigo-700",
    border: "border-indigo-200",
  },
  purple: {
    iconBg: "bg-purple-100",
    iconText: "text-purple-700",
    chipBg: "bg-purple-50",
    chipText: "text-purple-700",
    border: "border-purple-200",
  },
  green: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    border: "border-emerald-200",
  },
  pink: {
    iconBg: "bg-pink-100",
    iconText: "text-pink-700",
    chipBg: "bg-pink-50",
    chipText: "text-pink-700",
    border: "border-pink-200",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    chipBg: "bg-blue-50",
    chipText: "text-blue-700",
    border: "border-blue-200",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    border: "border-emerald-200",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-800",
    chipBg: "bg-amber-50",
    chipText: "text-amber-800",
    border: "border-amber-200",
  },
  yellow: {
    iconBg: "bg-yellow-100",
    iconText: "text-yellow-800",
    chipBg: "bg-yellow-50",
    chipText: "text-yellow-800",
    border: "border-yellow-200",
  },
  gray: {
    iconBg: "bg-gray-100",
    iconText: "text-gray-700",
    chipBg: "bg-gray-50",
    chipText: "text-gray-700",
    border: "border-gray-200",
  },
};

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const QUICK_ACTIONS = [
  { id: "new_student", label: "Add Student", icon: UserPlus, color: "indigo", link: "Students" },
  { id: "new_booking", label: "New Booking", icon: Calendar, color: "blue", link: "Bookings" },
  { id: "new_instructor", label: "Add Instructor", icon: Award, color: "purple", link: "Instructors" },
  { id: "new_vehicle", label: "Add Vehicle", icon: Car, color: "green", link: "Vehicles" },
  { id: "create_invoice", label: "Create Invoice", icon: Receipt, color: "pink", link: "Invoices" },
  { id: "send_message", label: "Send Message", icon: Send, color: "gray", link: "Messages" },
];

function safeNumber(n, fallback = 0) {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) ? x : fallback;
}

function formatEUR(amount) {
  const v = safeNumber(amount, 0);
  return `€${v.toLocaleString()}`;
}

function buildDateRanges(now) {
  return {
    today: { start: startOfDay(now), end: endOfDay(now) },
    week: { start: startOfWeek(now), end: endOfWeek(now) },
    month: { start: startOfMonth(now), end: endOfMonth(now) },
    lastWeek: { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) },
    lastMonth: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
  };
}

function renderChangeIndicator(change, small = false) {
  if (!Number.isFinite(change) || change === 0) return null;
  const isPositive = change > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const color = isPositive ? "text-emerald-700" : "text-red-700";
  const bgColor = isPositive ? "bg-emerald-50" : "bg-red-50";
  const size = small ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${bgColor} ${color} ${size} font-semibold`}>
      <Icon className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {Math.abs(change)}%
    </span>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  const dashboardQuery = useQuery({
    queryKey: ["ownerDashboardData"],
    queryFn: async () => {
      const [
        schools,
        instructors,
        students,
        vehicles,
        bookings,
        payments,
        invoices,
      ] = await Promise.all([
        base44.entities.School.list(),
        base44.entities.Instructor.list(),
        base44.entities.Student.list(),
        base44.entities.Vehicle.list(),
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.Payment.list("-payment_date", 500),
        base44.entities.Invoice.list("-created_date", 200),
      ]);

      let timeOffRequests = [];
      try {
        timeOffRequests = await base44.entities.TimeOffRequest.list("-created_date", 50);
      } catch {
        timeOffRequests = [];
      }

      return {
        schools: schools || [],
        instructors: instructors || [],
        students: students || [],
        vehicles: vehicles || [],
        bookings: bookings || [],
        payments: payments || [],
        invoices: invoices || [],
        timeOffRequests: timeOffRequests || [],
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!dashboardQuery.data?.schools?.length) return;
    if (selectedSchoolId) return;

    // If user has access to multiple schools, default to the first.
    // If only one school, lock to it.
    setSelectedSchoolId(dashboardQuery.data.schools[0]?.id || "");
  }, [dashboardQuery.data?.schools, selectedSchoolId]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ownerDashboardData"] });
    toast.success("Dashboard refreshed");
  }, [queryClient]);

  const now = useMemo(() => new Date(), []);
  const dateRanges = useMemo(() => buildDateRanges(now), [now]);

  const { start, end, prevStart, prevEnd } = useMemo(() => {
    const range = selectedPeriod === "today" ? dateRanges.today : selectedPeriod === "week" ? dateRanges.week : dateRanges.month;
    const prev = selectedPeriod === "month" ? dateRanges.lastMonth : dateRanges.lastWeek;
    return { start: range.start, end: range.end, prevStart: prev.start, prevEnd: prev.end };
  }, [selectedPeriod, dateRanges]);

  // Scope by school when possible (defensive: if no school_id field, keep global)
  const scoped = useMemo(() => {
    const data = dashboardQuery.data || {};
    const schoolId = selectedSchoolId;

    const scopeIfPossible = (arr) => {
      if (!schoolId) return arr || [];
      if (!Array.isArray(arr) || arr.length === 0) return [];
      // Only filter if at least one item has school_id, otherwise treat as global dataset
      const hasSchoolField = arr.some((x) => x && Object.prototype.hasOwnProperty.call(x, "school_id"));
      if (!hasSchoolField) return arr;
      return arr.filter((x) => x?.school_id === schoolId);
    };

    return {
      schools: data.schools || [],
      instructors: scopeIfPossible(data.instructors),
      students: scopeIfPossible(data.students),
      vehicles: scopeIfPossible(data.vehicles),
      bookings: scopeIfPossible(data.bookings),
      payments: scopeIfPossible(data.payments),
      invoices: scopeIfPossible(data.invoices),
      timeOffRequests: scopeIfPossible(data.timeOffRequests),
    };
  }, [dashboardQuery.data, selectedSchoolId]);

  const schools = scoped.schools;
  const instructors = scoped.instructors;
  const students = scoped.students;
  const vehicles = scoped.vehicles;
  const bookings = scoped.bookings;
  const payments = scoped.payments;
  const invoices = scoped.invoices;
  const timeOffRequests = scoped.timeOffRequests;

  const maps = useMemo(() => {
    const studentsById = new Map((students || []).map((s) => [s.id, s]));
    const instructorsById = new Map((instructors || []).map((i) => [i.id, i]));
    const vehiclesById = new Map((vehicles || []).map((v) => [v.id, v]));
    return { studentsById, instructorsById, vehiclesById };
  }, [students, instructors, vehicles]);

  const stats = useMemo(() => {
    const activeStudents = (students || []).filter((s) => s.is_active !== false && !s.graduated).length;
    const activeInstructors = (instructors || []).filter((i) => i.is_active !== false).length;

    const totalVehicles = (vehicles || []).length;
    const availableVehicles = (vehicles || []).filter((v) => v.is_available !== false).length;
    const unavailableVehicles = totalVehicles - availableVehicles;

    const periodBookings = (bookings || []).filter((b) => {
      const d = new Date(b.start_datetime);
      return isWithinInterval(d, { start, end });
    });

    const prevPeriodBookings = (bookings || []).filter((b) => {
      const d = new Date(b.start_datetime);
      return isWithinInterval(d, { start: prevStart, end: prevEnd });
    });

    const completedBookings = periodBookings.filter((b) => b.status === "completed").length;
    const prevCompletedBookings = prevPeriodBookings.filter((b) => b.status === "completed").length;

    const cancelledBookings = periodBookings.filter((b) => b.status === "cancelled").length;
    const noShowBookings = periodBookings.filter((b) => b.status === "no_show").length;

    const periodPayments = (payments || []).filter((p) => {
      const d = new Date(p.payment_date);
      return isWithinInterval(d, { start, end });
    });

    const prevPeriodPayments = (payments || []).filter((p) => {
      const d = new Date(p.payment_date);
      return isWithinInterval(d, { start: prevStart, end: prevEnd });
    });

    const revenue = periodPayments.reduce((sum, p) => sum + safeNumber(p.amount, 0), 0);
    const prevRevenue = prevPeriodPayments.reduce((sum, p) => sum + safeNumber(p.amount, 0), 0);

    const newStudents = (students || []).filter((s) => {
      const d = new Date(s.created_date);
      return isWithinInterval(d, { start, end });
    }).length;

    const prevNewStudents = (students || []).filter((s) => {
      const d = new Date(s.created_date);
      return isWithinInterval(d, { start: prevStart, end: prevEnd });
    }).length;

    const examReady = (students || []).filter((s) => !!s.exam_eligible && !s.graduated && s.is_active !== false).length;
    const graduated = (students || []).filter((s) => !!s.graduated).length;

    const passedTests = (students || []).filter((s) => !!s.test_passed).length;
    const totalTests = (students || []).filter((s) => !!s.test_taken).length;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const todayBookings = (bookings || []).filter((b) => isToday(new Date(b.start_datetime))).length;
    const tomorrowBookings = (bookings || []).filter((b) => isTomorrow(new Date(b.start_datetime))).length;

    const pendingTimeOff = (timeOffRequests || []).filter((t) => t.status === "pending").length;

    const outstandingBalance = (invoices || []).reduce((sum, inv) => {
      if (inv.status === "paid" || inv.status === "void") return sum;
      const total = safeNumber(inv.total_amount, 0);
      const paid = safeNumber(inv.amount_paid, 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    const overdueInvoices = (invoices || []).filter(
      (inv) => inv.status !== "paid" && inv.status !== "void" && inv.due_date && isPast(new Date(inv.due_date))
    ).length;

    const avgLessonDuration = periodBookings.length
      ? Math.round(
          periodBookings.reduce((sum, b) => {
            const mins = differenceInMinutes(new Date(b.end_datetime), new Date(b.start_datetime));
            return sum + (Number.isFinite(mins) && mins > 0 ? mins : 60);
          }, 0) / periodBookings.length
        )
      : 60;

    const totalHours = periodBookings.reduce((sum, b) => {
      const mins = differenceInMinutes(new Date(b.end_datetime), new Date(b.start_datetime));
      const hours = Number.isFinite(mins) && mins > 0 ? mins / 60 : 1;
      return sum + hours;
    }, 0);

    const periodDays = Math.max(1, differenceInDays(end, start) + 1);
    const weeksEquivalent = periodDays / 7;
    const hoursPerInstructorPerWeek = 40;
    const capacityHours = activeInstructors * hoursPerInstructorPerWeek * weeksEquivalent;
    const utilizationRate = capacityHours > 0 ? Math.min(100, Math.round((totalHours / capacityHours) * 100)) : 0;

    const calcChange = (cur, prev) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const satisfaction = 4.8; // placeholder until you store real ratings

    return {
      activeStudents,
      activeInstructors,
      totalVehicles,
      availableVehicles,
      unavailableVehicles,
      periodBookings: periodBookings.length,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      revenue,
      newStudents,
      examReady,
      graduated,
      passRate,
      satisfaction,
      todayBookings,
      tomorrowBookings,
      pendingTimeOff,
      outstandingBalance,
      overdueInvoices,
      avgLessonDuration,
      totalHours: Math.round(totalHours),
      utilizationRate,
      changes: {
        bookings: calcChange(periodBookings.length, prevPeriodBookings.length),
        completed: calcChange(completedBookings, prevCompletedBookings),
        revenue: calcChange(revenue, prevRevenue),
        students: calcChange(newStudents, prevNewStudents),
      },
    };
  }, [
    students,
    instructors,
    vehicles,
    bookings,
    payments,
    invoices,
    timeOffRequests,
    start,
    end,
    prevStart,
    prevEnd,
  ]);

  const alerts = useMemo(() => {
    const list = [];

    if (stats.pendingTimeOff > 0) {
      list.push({
        id: "timeoff",
        type: "warning",
        title: "Approve time off",
        message: `${stats.pendingTimeOff} request${stats.pendingTimeOff !== 1 ? "s" : ""} awaiting approval`,
        link: "TimeOffManagement",
        icon: ShieldCheck,
      });
    }

    if (stats.overdueInvoices > 0) {
      list.push({
        id: "overdue",
        type: "error",
        title: "Overdue invoices",
        message: `${stats.overdueInvoices} invoice${stats.overdueInvoices !== 1 ? "s" : ""} past due date`,
        link: "Invoices",
        icon: AlertCircle,
      });
    }

    if (stats.outstandingBalance > 0) {
      list.push({
        id: "balance",
        type: "info",
        title: "Money to collect",
        message: `${formatEUR(stats.outstandingBalance)} outstanding`,
        link: "Invoices",
        icon: Receipt,
      });
    }

    if (stats.unavailableVehicles > 0) {
      list.push({
        id: "vehicles",
        type: "warning",
        title: "Fleet issue",
        message: `${stats.unavailableVehicles} vehicle${stats.unavailableVehicles !== 1 ? "s" : ""} unavailable`,
        link: "Vehicles",
        icon: Wrench,
      });
    }

    if (stats.utilizationRate < 45 && stats.activeInstructors > 0) {
      list.push({
        id: "util",
        type: "info",
        title: "Low utilization",
        message: `Only ${stats.utilizationRate}% of capacity booked`,
        link: "Bookings",
        icon: Activity,
      });
    }

    return list.slice(0, 6);
  }, [stats]);

  const ownerPriorities = useMemo(() => {
    const priorities = [];

    if (stats.pendingTimeOff > 0) {
      priorities.push({
        id: "p_timeoff",
        title: "Approve time off requests",
        subtitle: "Keep the schedule stable and avoid last minute cancellations.",
        cta: "Review requests",
        link: "TimeOffManagement",
        color: "amber",
        icon: ShieldCheck,
      });
    }

    if (stats.overdueInvoices > 0 || stats.outstandingBalance > 0) {
      priorities.push({
        id: "p_cash",
        title: "Collect outstanding payments",
        subtitle: "Protect cash flow and reduce admin workload later.",
        cta: "Open invoices",
        link: "Invoices",
        color: "pink",
        icon: Receipt,
      });
    }

    if (stats.unavailableVehicles > 0) {
      priorities.push({
        id: "p_fleet",
        title: "Resolve fleet availability",
        subtitle: "More available cars means more bookable hours.",
        cta: "Manage vehicles",
        link: "Vehicles",
        color: "green",
        icon: Wrench,
      });
    }

    // If nothing urgent, surface growth actions
    if (priorities.length < 3) {
      priorities.push({
        id: "p_fill",
        title: "Fill next 7 days",
        subtitle: "Identify empty slots and push reminders to students.",
        cta: "View bookings",
        link: "Bookings",
        color: "blue",
        icon: Calendar,
      });
    }

    if (priorities.length < 3) {
      priorities.push({
        id: "p_pipeline",
        title: "Move exam-ready students to test",
        subtitle: "Shorten time to pass. It improves reviews and referrals.",
        cta: "View students",
        link: "Students",
        color: "indigo",
        icon: Target,
      });
    }

    return priorities.slice(0, 3);
  }, [stats]);

  const kpis = useMemo(() => {
    return [
      { label: "Revenue", value: formatEUR(stats.revenue), icon: DollarSign, color: "pink", change: stats.changes.revenue },
      { label: "Bookings", value: stats.periodBookings, icon: Calendar, color: "blue", change: stats.changes.bookings },
      { label: "Utilization", value: `${stats.utilizationRate}%`, icon: Activity, color: "indigo" },
      { label: "Active Students", value: stats.activeStudents, icon: Users, color: "purple", change: stats.changes.students },
      { label: "Pass Rate", value: stats.passRate ? `${stats.passRate}%` : "N/A", icon: Target, color: "amber" },
      { label: "Rating", value: `${stats.satisfaction}/5`, icon: Star, color: "yellow" },
      { label: "Fleet", value: `${stats.availableVehicles}/${stats.totalVehicles}`, icon: Car, color: "green" },
      { label: "Outstanding", value: formatEUR(stats.outstandingBalance), icon: Receipt, color: "gray" },
    ];
  }, [stats]);

  const upcomingLessons = useMemo(() => {
    const now = new Date();
    const weekAhead = addDays(now, 7);

    return (bookings || [])
      .filter((b) => {
        const d = new Date(b.start_datetime);
        if (!isFuture(d)) return false;
        if (b.status !== "confirmed" && b.status !== "pending") return false;
        return isWithinInterval(d, { start: now, end: weekAhead });
      })
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .slice(0, 8)
      .map((b) => ({
        ...b,
        student: maps.studentsById.get(b.student_id),
        instructor: maps.instructorsById.get(b.instructor_id),
      }));
  }, [bookings, maps]);

  const recentBookings = useMemo(() => {
    const list = (bookings || [])
      .slice(0, 25)
      .map((b) => ({
        ...b,
        student: maps.studentsById.get(b.student_id),
        instructor: maps.instructorsById.get(b.instructor_id),
        vehicle: maps.vehiclesById.get(b.vehicle_id),
      }));

    if (!searchQuery) return list;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((b) => {
      const studentName = (b.student?.full_name || "").toLowerCase();
      const instructorName = (b.instructor?.full_name || "").toLowerCase();
      const status = (b.status || "").toLowerCase();
      const type = (b.lesson_type || "").toLowerCase();
      return (
        studentName.includes(q) ||
        instructorName.includes(q) ||
        status.includes(q) ||
        type.includes(q)
      );
    });
  }, [bookings, maps, searchQuery]);

  const studentProgress = useMemo(() => {
    const inTraining = (students || []).filter((s) => s.is_active !== false && !s.exam_eligible && !s.graduated).length;
    const examReady = (students || []).filter((s) => s.is_active !== false && !!s.exam_eligible && !s.graduated).length;
    const graduated = (students || []).filter((s) => !!s.graduated).length;
    const inactive = (students || []).filter((s) => s.is_active === false).length;

    return { inTraining, examReady, graduated, inactive };
  }, [students]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });

    return days.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayBookings = (bookings || []).filter((b) => format(new Date(b.start_datetime), "yyyy-MM-dd") === dayKey);
      const dayPayments = (payments || []).filter((p) => format(new Date(p.payment_date), "yyyy-MM-dd") === dayKey);

      return {
        date: format(day, "MMM d"),
        bookings: dayBookings.length,
        completed: dayBookings.filter((b) => b.status === "completed").length,
        revenue: dayPayments.reduce((sum, p) => sum + safeNumber(p.amount, 0), 0),
      };
    });
  }, [bookings, payments]);

  const selectedSchool = useMemo(() => {
    if (!selectedSchoolId) return null;
    return (schools || []).find((s) => s.id === selectedSchoolId) || null;
  }, [schools, selectedSchoolId]);

  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  useEffect(() => {
    if (isError) toast.error("Could not load owner dashboard data.");
  }, [isError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {selectedSchool ? `${selectedSchool.name}` : "Your driving school"} overview and priorities
            </p>
          </div>

          <div className="flex items-center gap-2">
            {schools.length > 1 ? (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-gray-600">School</span>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="text-sm font-semibold text-gray-900 bg-transparent outline-none"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={[
                    "px-4 py-2 rounded-lg text-sm font-semibold transition",
                    selectedPeriod === p.id ? "bg-white shadow-sm text-indigo-600" : "text-gray-600 hover:text-gray-900",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={refreshData}
              className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition relative"
                title="Alerts"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {alerts.length > 0 ? (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {alerts.length}
                  </span>
                ) : null}
              </button>

              <AnimatePresence>
                {showNotifications ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Owner alerts</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="font-medium">No urgent alerts</p>
                          <p className="text-sm text-gray-400 mt-1">You are on track.</p>
                        </div>
                      ) : (
                        alerts.map((a) => (
                          <Link
                            key={a.id}
                            to={createPageUrl(a.link)}
                            className="block p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            onClick={() => setShowNotifications(false)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                                <a.icon className="w-4 h-4 text-gray-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                                <p className="text-xs text-gray-600 truncate">{a.message}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Owner priorities */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Today’s priorities</h2>
                <p className="text-sm text-gray-600">The few actions that move revenue and quality fastest.</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {ownerPriorities.map((p) => {
              const c = COLOR_STYLES[p.color] || COLOR_STYLES.gray;
              const Icon = p.icon;
              return (
                <Link
                  key={p.id}
                  to={createPageUrl(p.link)}
                  className={`rounded-2xl border ${c.border} bg-white hover:bg-gray-50 transition shadow-sm hover:shadow-md p-4`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${c.iconText}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.subtitle}</p>
                      <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
                        {p.cta} <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {kpis.map((k, idx) => {
          const c = COLOR_STYLES[k.color] || COLOR_STYLES.gray;
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + idx * 0.02 }}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
            >
              <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center mb-2`}>
                <Icon className={`w-5 h-5 ${c.iconText}`} />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                {k.change !== undefined ? renderChangeIndicator(k.change, true) : null}
              </div>
              <p className="text-xs text-gray-600">{k.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Quick actions</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {QUICK_ACTIONS.map((a) => {
              const c = COLOR_STYLES[a.color] || COLOR_STYLES.gray;
              const Icon = a.icon;
              return (
                <Link
                  key={a.id}
                  to={createPageUrl(a.link)}
                  className={`p-3 rounded-xl ${c.chipBg} hover:bg-gray-100 border ${c.border} transition flex flex-col items-center gap-2`}
                >
                  <Icon className={`w-5 h-5 ${c.iconText}`} />
                  <span className="text-xs font-semibold text-gray-700 text-center">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Activity + Student pipeline */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Overview */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Business momentum</h2>
                <p className="text-sm text-gray-600">Bookings and completions, last 14 days</p>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end gap-2">
            {chartData.map((day, idx) => {
              const maxBookings = Math.max(...chartData.map((d) => d.bookings), 1);
              const height = (day.bookings / maxBookings) * 100;
              const completedHeight = (day.completed / maxBookings) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full h-48 bg-gray-100 rounded-t-lg relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-200 transition-all" style={{ height: `${height}%` }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 transition-all" style={{ height: `${completedHeight}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 truncate w-full text-center">{day.date}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-600 rounded" />
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-200 rounded" />
              <span className="text-sm text-gray-600">Total bookings</span>
            </div>
          </div>
        </motion.div>

        {/* Student pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Student pipeline</h2>
              <p className="text-sm text-gray-600">Progress that drives pass rate and reviews</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: "In training", value: studentProgress.inTraining, color: "blue", icon: Activity },
              { label: "Exam ready", value: studentProgress.examReady, color: "amber", icon: Target },
              { label: "Graduated", value: studentProgress.graduated, color: "green", icon: CheckCircle },
              { label: "Inactive", value: studentProgress.inactive, color: "gray", icon: Users },
            ].map((item) => {
              const total = studentProgress.inTraining + studentProgress.examReady + studentProgress.graduated + studentProgress.inactive;
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;

              const bar =
                item.color === "blue"
                  ? "bg-blue-600"
                  : item.color === "amber"
                    ? "bg-amber-500"
                    : item.color === "green"
                      ? "bg-emerald-600"
                      : "bg-gray-500";

              const Icon = item.icon;

              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            to={createPageUrl("Students")}
            className="mt-4 w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
          >
            Manage students
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>

      {/* Upcoming + Top instructors */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Next 7 days</h2>
                <p className="text-sm text-gray-600">{stats.todayBookings} today, {stats.tomorrowBookings} tomorrow</p>
              </div>
            </div>
            <Link to={createPageUrl("Bookings")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingLessons.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No lessons scheduled</p>
              <p className="text-gray-400 text-sm mt-1">Consider messaging students to fill empty slots.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition">
                  <div className="text-center min-w-[62px]">
                    <p className="text-xs text-gray-500">{format(new Date(lesson.start_datetime), "MMM")}</p>
                    <p className="text-xl font-bold text-gray-900">{format(new Date(lesson.start_datetime), "d")}</p>
                    <p className="text-xs text-gray-500">{format(new Date(lesson.start_datetime), "h:mm a")}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lesson.student?.full_name || "Student"}</p>
                    <p className="text-sm text-gray-600 truncate">with {lesson.instructor?.full_name || "Instructor"}</p>
                  </div>

                  <span
                    className={[
                      "px-2 py-1 rounded-lg text-xs font-bold",
                      lesson.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800",
                    ].join(" ")}
                  >
                    {lesson.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Operations snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Operations snapshot</h2>
              <p className="text-sm text-gray-600">Capacity, cancellations, lesson quality signals</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Utilization</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.utilizationRate}%</p>
              <p className="text-sm text-gray-600 mt-1">{stats.totalHours} hours booked</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Avg lesson</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgLessonDuration} min</p>
              <p className="text-sm text-gray-600 mt-1">{stats.periodBookings} lessons</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Cancellations</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.cancelledBookings}</p>
              <p className="text-sm text-gray-600 mt-1">in selected period</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">No-shows</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.noShowBookings}</p>
              <p className="text-sm text-gray-600 mt-1">in selected period</p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">Quality lever</p>
                <p className="text-sm text-gray-700 mt-1">
                  Exam-ready students: <span className="font-semibold">{stats.examReady}</span>. Push them into mock-test style lessons to lift pass rate and reviews.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent bookings table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent bookings</h2>
              <p className="text-sm text-gray-600">Quick scan for issues and opportunities</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student, instructor, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-4">Date</th>
                <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-4">Student</th>
                <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-4">Instructor</th>
                <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-4">Type</th>
                <th className="text-left text-xs font-bold text-gray-600 uppercase py-3 px-4">Status</th>
                <th className="text-right text-xs font-bold text-gray-600 uppercase py-3 px-4">Price</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{format(new Date(b.start_datetime), "MMM d, yyyy")}</p>
                    <p className="text-sm text-gray-600">{format(new Date(b.start_datetime), "h:mm a")}</p>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-900">{b.student?.full_name || "Unknown"}</p>
                  </td>

                  <td className="py-3 px-4">
                    <p className="text-gray-700">{b.instructor?.full_name || "Unknown"}</p>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                      {(b.lesson_type || "practical").replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={[
                        "px-2 py-1 rounded-lg text-xs font-bold",
                        b.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : b.status === "confirmed"
                            ? "bg-blue-100 text-blue-700"
                            : b.status === "cancelled"
                              ? "bg-gray-100 text-gray-700"
                              : b.status === "no_show"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800",
                      ].join(" ")}
                    >
                      {b.status || "unknown"}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <p className="font-bold text-gray-900">{formatEUR(safeNumber(b.price, 0))}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
          <Link to={createPageUrl("Bookings")} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition flex items-center gap-2">
            Open bookings
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
