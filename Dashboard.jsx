import React, { useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation } from "@/components/utils/i18n";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import SchoolOnboarding from "@/components/admin/SchoolOnboarding";
import { logger } from "@/components/utils/config";
import {
  Users,
  Car,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  UserCheck,
  FileText,
  Bell,
  BarChart3,
  PieChart,
  MapPin,
  Phone,
  Mail,
  Star,
  Zap,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  GraduationCap,
  Fuel,
  Wrench,
  CreditCard,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
import VeeMascot, { VeeTip, VeeWelcome } from "@/components/common/VeeMascot";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import { KPIComparisonCard, AnimatedCounter } from "@/components/charts/KPIComparison";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subMonths,
  differenceInDays,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";

const StatCard = React.memo(({ icon, label, value, change, trend, color, link, delay = 0 }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 300, damping: 25 } }}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up"
                ? "text-emerald-600"
                : trend === "down"
                ? "text-red-600"
                : "text-zinc-500"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === "down" ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            {change > 0 ? "+" : ""}
            {change}%
          </div>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
    </motion.div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
});

StatCard.displayName = "StatCard";

const AlertCard = React.memo(({ type, title, description, action, icon }) => {
  const typeStyles = {
    warning: "border-[#f9f3c8] bg-[#fdfbe8]",
    error: "border-[#f9d4d2] bg-[#fdeeed]",
    success: "border-[#d4f4c3] bg-[#eefbe7]",
    info: "border-[#d4eaf5] bg-[#e8f4fa]",
  };

  const iconColors = {
    warning: "text-[#b8a525]",
    error: "text-[#e44138]",
    success: "text-[#5cb83a]",
    info: "text-[#3b82c4]",
  };

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${typeStyles[type]}`}>
      <div className={`flex-shrink-0 mt-0.5 ${iconColors[type]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{description}</p>
        {action && (
          <Link
            to={action.link}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#3b82c4] hover:text-[#2563a3] mt-2"
          >
            {action.label}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
});

AlertCard.displayName = "AlertCard";

const QuickActionButton = React.memo(({ icon, label, description, link, color }) => (
  <Link
    to={link}
    className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 hover:bg-zinc-100 hover:border-zinc-200 transition group"
  >
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-zinc-900">{label}</p>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
    </div>
    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
  </Link>
));

QuickActionButton.displayName = "QuickActionButton";

const BookingListItem = React.memo(({ booking, student, instructor, index }) => {
  const bookingDate = parseISO(booking.start_datetime);
  const isTodayBooking = isToday(bookingDate);
  const isTomorrowBooking = isTomorrow(bookingDate);

  const statusStyles = {
    confirmed: "bg-[#eefbe7] text-[#5cb83a] border-[#d4f4c3]",
    pending: "bg-[#fdfbe8] text-[#b8a525] border-[#f9f3c8]",
    completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
    cancelled: "bg-[#fdeeed] text-[#c9342c] border-[#f9d4d2]",
    no_show: "bg-[#fdeeed] text-[#c9342c] border-[#f9d4d2]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className={`flex items-center gap-4 rounded-xl border p-4 transition ${
        isTodayBooking
          ? "border-[#a9d5ed] bg-[#e8f4fa]/50"
          : "border-zinc-100 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-200"
      }`}
    >
      <div
        className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg ${
          isTodayBooking ? "bg-[#d4eaf5]" : "bg-white border border-zinc-200"
        }`}
      >
        <span className="text-xs font-medium text-zinc-500">{format(bookingDate, "MMM")}</span>
        <span className="text-lg font-bold text-zinc-900">{format(bookingDate, "d")}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-zinc-900 truncate">
            {student?.full_name || "Unknown Student"}
          </p>
          {isTodayBooking && (
            <span className="text-xs font-medium text-[#3b82c4] bg-[#e8f4fa] px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
          {isTomorrowBooking && (
            <span className="text-xs font-medium text-[#6c376f] bg-[#f3e8f4] px-2 py-0.5 rounded-full">
              Tomorrow
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(bookingDate, "h:mm a")}
          </span>
          {instructor && (
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              {instructor.full_name}
            </span>
          )}
          {booking.lesson_type && (
            <span className="flex items-center gap-1 capitalize">
              <BookOpen className="w-3 h-3" />
              {booking.lesson_type.replace("_", " ")}
            </span>
          )}
        </div>
      </div>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border capitalize ${
          statusStyles[booking.status] || statusStyles.pending
          }`}
          >
          {booking.status.replace("_", " ")}
          </span>
    </motion.div>
  );
});

BookingListItem.displayName = "BookingListItem";

const WeekOverviewChart = React.memo(({ weekSchedule }) => {
  const maxBookings = Math.max(...weekSchedule.map((d) => d.bookings), 1);

  return (
    <div className="space-y-3">
      {weekSchedule.map((day, index) => (
        <div
          key={index}
          className={`rounded-xl border p-4 transition ${
            day.isToday
              ? "border-[#a9d5ed] bg-[#e8f4fa]/50"
              : "border-zinc-100 bg-zinc-50 hover:bg-zinc-100"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p
                className={`text-sm font-semibold ${
                  day.isToday ? "text-[#3b82c4]" : "text-zinc-900"
                }`}
              >
                {format(day.date, "EEEE")}
              </p>
              {day.isToday && (
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                {day.bookings} {day.bookings === 1 ? "lesson" : "lessons"}
              </p>
              <p className="text-xs text-zinc-600 tabular-nums">€{day.revenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden border border-zinc-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(day.bookings / maxBookings) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`h-full rounded-full ${
                day.isToday
                  ? "bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed]"
                  : "bg-gradient-to-r from-[#a9d5ed] to-[#d4eaf5]"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

WeekOverviewChart.displayName = "WeekOverviewChart";

const TopPerformersCard = React.memo(({ instructors }) => {
  const topInstructors = [...instructors]
    .filter((i) => i.is_active && i.total_lessons)
    .sort((a, b) => (b.total_lessons || 0) - (a.total_lessons || 0))
    .slice(0, 3);

  if (topInstructors.length === 0) return null;

  return (
    <div className="space-y-3">
      {topInstructors.map((instructor, index) => (
        <div
          key={instructor.id}
          className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3"
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
              index === 0
                ? "bg-amber-100 text-amber-700"
                : index === 1
                ? "bg-zinc-200 text-zinc-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{instructor.full_name}</p>
            <p className="text-xs text-zinc-500">{instructor.total_lessons || 0} lessons</p>
          </div>
          {instructor.rating && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Star className="w-3 h-3 fill-amber-400" />
              {instructor.rating.toFixed(1)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

TopPerformersCard.displayName = "TopPerformersCard";

const VehicleStatusCard = React.memo(({ vehicles }) => {
  const vehiclesNeedingAttention = vehicles.filter((v) => {
    const needsService =
      v.next_service_date && differenceInDays(parseISO(v.next_service_date), new Date()) < 7;
    const lowFuel = v.fuel_level !== undefined && v.fuel_level < 25;
    const insuranceExpiring =
      v.insurance_expiry && differenceInDays(parseISO(v.insurance_expiry), new Date()) < 14;
    return needsService || lowFuel || insuranceExpiring;
  });

  if (vehiclesNeedingAttention.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-zinc-900">All Vehicles Ready</p>
          <p className="text-xs text-zinc-600">No maintenance or issues pending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {vehiclesNeedingAttention.slice(0, 3).map((vehicle) => {
        const needsService =
          vehicle.next_service_date &&
          differenceInDays(parseISO(vehicle.next_service_date), new Date()) < 7;
        const lowFuel = vehicle.fuel_level !== undefined && vehicle.fuel_level < 25;

        return (
          <div
            key={vehicle.id}
            className="rounded-xl border border-amber-100 bg-amber-50 p-3 flex items-center gap-3"
          >
            <Car className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {vehicle.make} {vehicle.model}
              </p>
              <p className="text-xs text-zinc-600">
                {lowFuel && `Low fuel (${vehicle.fuel_level}%)`}
                {needsService && !lowFuel && "Service due soon"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

VehicleStatusCard.displayName = "VehicleStatusCard";

export default function Dashboard() {
  const { t } = useTranslation();
  const today = new Date();
  const lastMonth = subMonths(today, 1);
  const [schoolId, setSchoolId] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loadingAuth, setLoadingAuth] = React.useState(true);

  React.useEffect(() => {
    const loadAuth = async () => {
      try {
        const user = await base44.auth.me();
        
        if (!user) {
          window.location.href = createPageUrl("SchoolLogin");
          return;
        }
        
        if (user.role !== "admin") {
          logger.warn("Non-admin user attempted to access Dashboard");
          window.location.href = createPageUrl("Unauthorized");
          return;
        }
        
        setCurrentUser(user);
        const sid = await getEffectiveSchoolId(user);
        setSchoolId(sid);
      } catch (err) {
        logger.error("Failed to load user:", err);
        window.location.href = createPageUrl("SchoolLogin");
      } finally {
        setLoadingAuth(false);
      }
    };
    loadAuth();
  }, []);

  const { data: students = [], isLoading: loadingStudents, error: studentsError, refetch: refetchStudents } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: instructors = [], isLoading: loadingInstructors, error: instructorsError } = useQuery({
    queryKey: ["instructors", schoolId],
    queryFn: () => schoolId ? base44.entities.Instructor.filter({ school_id: schoolId }, "-created_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: vehicles = [], isLoading: loadingVehicles, error: vehiclesError } = useQuery({
    queryKey: ["vehicles", schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: payments = [], isLoading: loadingPayments, error: paymentsError } = useQuery({
    queryKey: ["payments", schoolId],
    queryFn: () => schoolId ? base44.entities.Payment.filter({ school_id: schoolId }, "-payment_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: invoices = [], error: invoicesError } = useQuery({
    queryKey: ["invoices", schoolId],
    queryFn: () => schoolId ? base44.entities.Invoice.filter({ school_id: schoolId }, "-issue_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const isLoading =
    loadingAuth || loadingStudents || loadingInstructors || loadingVehicles || loadingBookings || loadingPayments;

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const instructorMap = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-7xl w-full px-4 space-y-6">
          <SkeletonLoader count={6} type="card" />
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = createPageUrl("Unauthorized");
    return null;
  }

  if (!schoolId) {
    return <SchoolOnboarding user={currentUser} onComplete={() => window.location.reload()} />;
  }

  // Error states
  if (studentsError || instructorsError || vehiclesError || bookingsError || paymentsError || invoicesError) {
    const firstError = studentsError || instructorsError || vehiclesError || bookingsError || paymentsError || invoicesError;
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={firstError} 
          onRetry={refetchBookings || refetchStudents}
          title="Failed to load dashboard data"
        />
      </div>
    );
  }

  const metrics = useMemo(() => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    const thisMonthPayments = payments.filter((p) => {
      const date = parseISO(p.payment_date);
      return date >= monthStart && date <= monthEnd && p.status === "completed";
    });

    const lastMonthPayments = payments.filter((p) => {
      const date = parseISO(p.payment_date);
      return date >= lastMonthStart && date <= lastMonthEnd && p.status === "completed";
    });

    const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const revenueChange =
      lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

    const thisMonthBookings = bookings.filter((b) => {
      const date = parseISO(b.start_datetime);
      return date >= monthStart && date <= monthEnd;
    });

    const lastMonthBookings = bookings.filter((b) => {
      const date = parseISO(b.start_datetime);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const bookingsChange =
      lastMonthBookings.length > 0
        ? Math.round(
            ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100
          )
        : 0;

    const activeStudents = students.filter((s) => s.is_active).length;
    const lastMonthActiveStudents = students.filter((s) => {
      const createdDate = parseISO(s.created_date);
      return s.is_active && createdDate <= lastMonthEnd;
    }).length;
    const studentsChange =
      lastMonthActiveStudents > 0
        ? Math.round(((activeStudents - lastMonthActiveStudents) / lastMonthActiveStudents) * 100)
        : 0;

    const completedBookings = thisMonthBookings.filter((b) => b.status === "completed").length;
    const completionRate =
      thisMonthBookings.length > 0
        ? Math.round((completedBookings / thisMonthBookings.length) * 100)
        : 0;

    const activeInstructors = instructors.filter((i) => i.is_active && i.rating);
    const averageRating =
      activeInstructors.length > 0
        ? activeInstructors.reduce((sum, i) => sum + (i.rating || 0), 0) / activeInstructors.length
        : 0;

    const pendingPayments = payments.filter((p) => p.status === "pending").length;
    const overdueInvoices = invoices.filter(
      (i) => i.status === "overdue" || (i.status === "sent" && parseISO(i.due_date) < today)
    ).length;

    const upcomingExams = students.filter(
      (s) => s.is_active && !s.practical_exam_passed && s.progress_percentage && s.progress_percentage >= 80
    ).length;

    const availableVehicles = vehicles.filter((v) => v.is_available).length;
    const vehicleUtilization =
      vehicles.length > 0 ? Math.round(((vehicles.length - availableVehicles) / vehicles.length) * 100) : 0;

    return {
      totalRevenue: thisMonthRevenue,
      revenueChange,
      totalBookings: thisMonthBookings.length,
      bookingsChange,
      activeStudents,
      studentsChange,
      completionRate,
      averageRating,
      pendingPayments,
      overdueInvoices,
      upcomingExams,
      vehicleUtilization,
    };
  }, [students, instructors, vehicles, bookings, payments, invoices, today, lastMonth]);

  const todayBookings = useMemo(() => {
    return bookings.filter((b) => {
      const date = parseISO(b.start_datetime);
      return date >= startOfDay(today) && date <= endOfDay(today);
    });
  }, [bookings, today]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const date = parseISO(b.start_datetime);
        return date > today && (b.status === "confirmed" || b.status === "pending");
      })
      .slice(0, 5);
  }, [bookings, today]);

  const weekSchedule = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayBookings = bookings.filter((b) => {
        const bookingDate = parseISO(b.start_datetime);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      });

      return {
        date,
        bookings: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        isToday: isToday(date),
      };
    });
  }, [bookings, today]);

  const alerts = useMemo(() => {
    const alertsList = [];

    if (metrics.overdueInvoices > 0) {
      alertsList.push({
        type: "error",
        title: `${metrics.overdueInvoices} Overdue Invoice${metrics.overdueInvoices > 1 ? "s" : ""}`,
        description: "Payment follow-up required",
        icon: <AlertCircle className="w-5 h-5" />,
        action: { label: "View Invoices", link: createPageUrl("Invoices") },
      });
    }

    if (metrics.pendingPayments > 0) {
      alertsList.push({
        type: "warning",
        title: `${metrics.pendingPayments} Pending Payment${metrics.pendingPayments > 1 ? "s" : ""}`,
        description: "Awaiting confirmation",
        icon: <CreditCard className="w-5 h-5" />,
        action: { label: "View Payments", link: createPageUrl("Payments") },
      });
    }

    if (metrics.upcomingExams > 0) {
      alertsList.push({
        type: "info",
        title: `${metrics.upcomingExams} Student${metrics.upcomingExams > 1 ? "s" : ""} Exam Ready`,
        description: "Progress over 80% - ready for practical exam",
        icon: <GraduationCap className="w-5 h-5" />,
        action: { label: "View Students", link: createPageUrl("Students") },
      });
    }

    const vehiclesNeedingService = vehicles.filter(
      (v) => v.next_service_date && differenceInDays(parseISO(v.next_service_date), today) < 7
    );
    if (vehiclesNeedingService.length > 0) {
      alertsList.push({
        type: "warning",
        title: `${vehiclesNeedingService.length} Vehicle${vehiclesNeedingService.length > 1 ? "s" : ""} Need Service`,
        description: "Scheduled maintenance due within 7 days",
        icon: <Wrench className="w-5 h-5" />,
        action: { label: "View Fleet", link: createPageUrl("Vehicles") },
      });
    }

    return alertsList;
  }, [metrics, vehicles, today]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SkeletonLoader count={8} type="card" />
      </div>
    );
  }

  return (
    <>
    <ScrollProgress color="#3b82c4" height={3} />
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      <ScrollFadeIn direction="up">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2 bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-sm text-zinc-600">
              {t('dashboard.subtitle')} •{" "}
              {format(today, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm">
              <Activity className="w-4 h-4 mr-2 text-emerald-500" />
              {t('dashboard.live')}
            </span>
            <Link
              to={createPageUrl("Reports")}
              className="inline-flex items-center rounded-lg border border-[#d4eaf5] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-[#e8f4fa] transition"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('dashboard.reports')}
            </Link>
          </div>
        </div>
      </motion.header>
      </ScrollFadeIn>

      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {alerts.map((alert, index) => (
            <AlertCard key={index} {...alert} />
          ))}
        </motion.div>
      )}

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2, transition: { type: "spring", stiffness: 300, damping: 25 } }}
          className="lg:col-span-1 rounded-2xl border border-[#d4eaf5] bg-gradient-to-br from-[#e8f4fa]/50 to-white p-6 md:p-7 shadow-sm hover:shadow-md transition"
          >
          <div className="flex items-start justify-between mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f4fa]">
              <DollarSign className="h-6 w-6 text-[#3b82c4]" />
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                metrics.revenueChange >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {metrics.revenueChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {metrics.revenueChange > 0 ? "+" : ""}
              {metrics.revenueChange}%
            </div>
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-2">
            {t('dashboard.stats.monthlyRevenue')}
          </p>
          <p className="text-4xl md:text-5xl font-semibold text-zinc-900 mb-4 tabular-nums">
            €{metrics.totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
            <span className="text-sm text-zinc-600">{format(today, "MMMM yyyy")}</span>
            <Link
              to={createPageUrl("Payments")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3b82c4] hover:text-[#2563a3] transition group"
            >
              {t('dashboard.viewDetails')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </motion.div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="h-5 w-5 text-emerald-600" />}
            label={t('dashboard.stats.todaysLessons')}
            value={todayBookings.length}
            color="bg-emerald-50"
            link={createPageUrl("Calendar")}
            delay={0.15}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-purple-600" />}
            label={t('dashboard.stats.activeStudents')}
            value={metrics.activeStudents}
            change={metrics.studentsChange}
            trend={metrics.studentsChange >= 0 ? "up" : "down"}
            color="bg-purple-50"
            link={createPageUrl("Students")}
            delay={0.2}
          />
          <StatCard
            icon={<Car className="h-5 w-5 text-blue-600" />}
            label={t('dashboard.stats.fleetAvailable')}
            value={`${vehicles.filter((v) => v.is_available).length}/${vehicles.length}`}
            color="bg-blue-50"
            link={createPageUrl("Vehicles")}
            delay={0.25}
          />
          <StatCard
            icon={<Target className="h-5 w-5 text-amber-600" />}
            label={t('dashboard.stats.completionRate')}
            value={`${metrics.completionRate}%`}
            color="bg-amber-50"
            delay={0.3}
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-indigo-600" />}
            label={t('dashboard.stats.monthlyBookings')}
            value={metrics.totalBookings}
            change={metrics.bookingsChange}
            trend={metrics.bookingsChange >= 0 ? "up" : "down"}
            color="bg-indigo-50"
            link={createPageUrl("Calendar")}
            delay={0.35}
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5 text-teal-600" />}
            label={t('dashboard.stats.activeInstructors')}
            value={instructors.filter((i) => i.is_active).length}
            color="bg-teal-50"
            link={createPageUrl("Instructors")}
            delay={0.4}
          />
          <StatCard
            icon={<Star className="h-5 w-5 text-amber-500" />}
            label={t('dashboard.stats.avgRating')}
            value={metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : "N/A"}
            color="bg-amber-50"
            delay={0.45}
          />
          <StatCard
            icon={<Receipt className="h-5 w-5 text-rose-600" />}
            label={t('dashboard.stats.pendingPayments')}
            value={metrics.pendingPayments}
            color="bg-rose-50"
            link={createPageUrl("Payments")}
            delay={0.5}
          />
        </div>
      </div>
      </StaggerFadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">{t('dashboard.quickActions.title')}</h2>
            <Zap className="w-5 h-5 text-[#e7d356]" />
          </div>
          <div className="space-y-2">
            <QuickActionButton
              icon={<Calendar className="w-5 h-5 text-indigo-600" />}
              label={t('dashboard.quickActions.scheduleLesson')}
              description={t('dashboard.quickActions.scheduleLessonDesc')}
              link={createPageUrl("Calendar")}
              color="bg-indigo-50"
            />
            <QuickActionButton
              icon={<Users className="w-5 h-5 text-purple-600" />}
              label={t('dashboard.quickActions.addStudent')}
              description={t('dashboard.quickActions.addStudentDesc')}
              link={createPageUrl("Students")}
              color="bg-purple-50"
            />
            <QuickActionButton
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
              label={t('dashboard.quickActions.recordPayment')}
              description={t('dashboard.quickActions.recordPaymentDesc')}
              link={createPageUrl("Payments")}
              color="bg-emerald-50"
            />
            <QuickActionButton
              icon={<FileText className="w-5 h-5 text-blue-600" />}
              label={t('dashboard.quickActions.createInvoice')}
              description={t('dashboard.quickActions.createInvoiceDesc')}
              link={createPageUrl("Invoices")}
              color="bg-blue-50"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">{t('dashboard.topInstructors')}</h2>
            <Award className="w-5 h-5 text-[#e7d356]" />
          </div>
          <TopPerformersCard instructors={instructors} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">{t('dashboard.fleetStatus')}</h2>
            <Car className="w-5 h-5 text-blue-500" />
          </div>
          <VehicleStatusCard vehicles={vehicles} />
          <Link
            to={createPageUrl("Vehicles")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3b82c4] hover:text-[#2563a3] transition group mt-4"
          >
            {t('dashboard.manageFleet')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">{t('dashboard.thisWeek')}</h2>
            <Link
              to={createPageUrl("Calendar")}
              className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3] transition"
            >
              {t('dashboard.viewCalendar')}
            </Link>
          </div>
          <WeekOverviewChart weekSchedule={weekSchedule} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">{t('dashboard.upcomingLessons')}</h2>
            <Link
              to={createPageUrl("Calendar")}
              className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3] transition"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-8 text-center">
                <div className="flex justify-center mb-3">
                  <VeeMascot size="lg" mood="thinking" />
                </div>
                <p className="text-sm font-semibold text-zinc-900 mb-1">{t('dashboard.noUpcomingLessons')}</p>
                <p className="text-xs text-zinc-500 mb-4">Schedule lessons to keep your calendar full</p>
                <Link
                  to={createPageUrl("Calendar")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-lg text-sm font-semibold transition-all"
                >
                  {t('dashboard.scheduleALesson')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              upcomingBookings.map((booking, index) => (
                <BookingListItem
                  key={booking.id}
                  booking={booking}
                  student={studentMap.get(booking.student_id)}
                  instructor={instructorMap.get(booking.instructor_id)}
                  index={index}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}