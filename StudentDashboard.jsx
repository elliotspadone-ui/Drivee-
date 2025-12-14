import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  Clock,
  TrendingUp,
  BookOpen,
  Car,
  MapPin,
  ArrowRight,
  CheckCircle2,
  User,
  MessageSquare,
  FileText,
  AlertCircle,
  Target,
  ShieldCheck,
  Zap,
  CloudSun,
  ChevronRight,
  Award,
  Wallet,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { format, differenceInMinutes, isAfter, isBefore, addHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import LessonDetailsDrawer from "@/components/student/LessonDetailsDrawer";
import ChatInterface from "@/components/messaging/ChatInterface";
import { toast } from "sonner";
import { useTranslation } from "@/components/utils/i18n";
import VeeMascot, { VeeTip } from "@/components/common/VeeMascot";
import { useStudentAuth } from "@/components/student/useStudentAuth";
import StudentOnboarding from "@/components/student/StudentOnboarding";
import EmptyState from "@/components/common/EmptyState";

const REQUIRED_HOURS_DEFAULT = 40;
const MIN_LESSON_DURATION_HOURS = 1;

const easing = { premium: [0.22, 1, 0.36, 1] };
const slideUp = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: easing.premium } },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } },
};

const Skeleton = ({ className }) => <div className={`animate-pulse bg-zinc-100 rounded-lg ${className}`} />;

function safeNumber(n, fallback = 0) {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) ? x : fallback;
}
function formatEUR(amount) {
  const v = safeNumber(amount, 0);
  return `€${v.toFixed(0)}`;
}
function hoursFromBooking(booking) {
  const start = new Date(booking?.start_datetime);
  const end = new Date(booking?.end_datetime);
  const mins = differenceInMinutes(end, start);
  if (!Number.isFinite(mins) || mins <= 0) return MIN_LESSON_DURATION_HOURS;
  return Math.max(MIN_LESSON_DURATION_HOURS, mins / 60);
}
function sortByStartAsc(a, b) {
  return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
}
function isUpcomingConfirmed(booking) {
  if (!booking) return false;
  if (booking.status !== "confirmed") return false;
  return isAfter(new Date(booking.start_datetime), new Date());
}
function isCompleted(booking) {
  return booking?.status === "completed";
}

/* ---------------------------
   Small UI components
--------------------------- */
const SkillBar = React.memo(function SkillBar({ skill, score }) {
  const s = safeNumber(score, 0);
  const barClass =
    s >= 80 ? "bg-[#81da5a]" : s >= 50 ? "bg-[#e7d356]" : "bg-[#e44138]";
  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-1">
        <span className="text-xs font-medium text-zinc-700">{skill}</span>
        <span className="text-xs font-semibold text-zinc-900">{Math.round(s)}%</span>
      </div>
      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, s))}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`h-full rounded-full ${barClass}`}
        />
      </div>
    </div>
  );
});

const ProgressSteps = React.memo(function ProgressSteps({ student, totalHours, requiredHours, t }) {
  const steps = useMemo(
    () => [
      { name: t("studentDashboard.progress.registration"), completed: true },
      { name: t("studentDashboard.progress.theoryTest"), completed: !!student?.theory_exam_passed },
      { name: t("studentDashboard.progress.lessonHours"), completed: totalHours >= requiredHours },
      { name: t("studentDashboard.progress.preTest"), completed: !!student?.mock_test_passed },
      { name: t("studentDashboard.progress.practicalTest"), completed: !!student?.practical_exam_passed },
    ],
    [student, totalHours, requiredHours, t]
  );

  return (
    <div className="relative flex items-center justify-between w-full mt-5 mb-2">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 -z-10" />
      {steps.map((step, idx) => (
        <div key={step.name} className="flex flex-col items-center gap-2 bg-white px-1">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.07 }}
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center border-2",
              step.completed
                ? "bg-[#3b82c4] border-[#3b82c4] text-white"
                : "bg-white border-zinc-200 text-zinc-300",
            ].join(" ")}
          >
            {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-medium">{idx + 1}</span>}
          </motion.div>
          <span
            className={[
              "text-[10px] font-semibold uppercase tracking-wide text-center max-w-[78px] leading-tight",
              step.completed ? "text-[#3b82c4]" : "text-zinc-400",
            ].join(" ")}
          >
            {step.name}
          </span>
        </div>
      ))}
    </div>
  );
});

const StatWidget = React.memo(function StatWidget({ icon: Icon, label, value, subValue, color, trend }) {
  const colorMap = {
    indigo: { bg: "bg-[#e8f4fa]", text: "text-[#3b82c4]" },
    emerald: { bg: "bg-[#eefbe7]", text: "text-[#5cb83a]" },
    violet: { bg: "bg-[#f3e8f4]", text: "text-[#6c376f]" },
    rose: { bg: "bg-[#fdeeed]", text: "text-[#e44138]" },
    zinc: { bg: "bg-zinc-100", text: "text-zinc-600" },
    amber: { bg: "bg-[#fdfbe8]", text: "text-[#b8a525]" },
  };
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {trend ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#5cb83a] bg-[#eefbe7] px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" /> {trend}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        {subValue ? <p className="text-xs text-zinc-400 pt-1">{subValue}</p> : null}
      </div>
    </div>
  );
});

const NextLessonHero = React.memo(function NextLessonHero({ nextLesson, instructor, vehicle, onChat, t }) {
  if (!nextLesson) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-[#2563a3] to-[#3b82c4] p-8 text-white shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20" />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("studentDashboard.noLessons.title")}</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">{t("studentDashboard.noLessons.subtitle")}</p>
          <Link
            to={createPageUrl("BookLesson")}
            className="inline-flex items-center gap-2 bg-white text-[#3b82c4] px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition shadow-lg"
          >
            <Calendar className="w-4 h-4" /> {t("studentDashboard.bookLesson")}
          </Link>
        </div>
      </div>
    );
  }

  const start = new Date(nextLesson.start_datetime);
  const end = new Date(nextLesson.end_datetime);
  const isSoon = isBefore(start, addHours(new Date(), 24));

  return (
    <div className="rounded-3xl bg-zinc-900 text-white p-1 shadow-xl">
      <div className="rounded-[20px] border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <CloudSun className="w-24 h-24" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a9d5ed]/20 border border-[#a9d5ed]/30 text-[#a9d5ed] text-xs font-medium">
                <Zap className="w-3 h-3" /> {t("studentDashboard.nextLesson")}
              </div>
              {isSoon ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white text-xs font-semibold">
                  <Sparkles className="w-3 h-3" /> {t("studentDashboard.schedule.title")} {t("studentDashboard.nextLesson")}
                </div>
              ) : null}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              {format(start, "EEEE, MMMM do")}
            </h2>

            <div className="flex items-center gap-3 text-zinc-400 mb-6">
              <Clock className="w-5 h-5" />
              <span className="text-lg">
                {format(start, "h:mm a")} - {format(end, "h:mm a")}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 pr-5 backdrop-blur-sm border border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#3b82c4] flex items-center justify-center text-sm font-bold">
                  {instructor?.full_name?.charAt(0) || "I"}
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{t("studentDashboard.instructor")}</p>
                  <p className="font-medium">{instructor?.full_name || "Instructor"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 pr-5 backdrop-blur-sm border border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#81da5a]/20 flex items-center justify-center text-[#81da5a]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{t("studentDashboard.pickup")}</p>
                  <p className="font-medium text-sm truncate max-w-[150px]">
                    {nextLesson.pickup_location || "Home"}
                  </p>
                </div>
              </div>

              {vehicle ? (
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 pr-5 backdrop-blur-sm border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">{t("studentDashboard.schedule.practicalLesson")}</p>
                    <p className="font-medium text-sm truncate max-w-[160px]">
                      {vehicle?.name || vehicle?.model || "Vehicle"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 min-w-[220px]">
            <button
              onClick={onChat}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center justify-center gap-2 border border-white/10"
            >
              <MessageSquare className="w-4 h-4" /> {t("studentDashboard.contactInstructor")}
            </button>

            {nextLesson.meeting_link ? (
              <a
                href={nextLesson.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#3b82c4] hover:bg-[#2563a3] text-white font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-[#3b82c4]/20"
              >
                <Car className="w-4 h-4" /> {t("studentDashboard.startLesson")}
              </a>
            ) : (
              <div className="w-full py-3 px-4 rounded-xl bg-white/5 text-zinc-300 text-sm border border-white/10 text-center">
                {t("studentDashboard.startLesson")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ---------------------------
   Data hooks (cleaner, safer, faster)
--------------------------- */
function useStudentDashboardData(studentId) {
  const referenceQuery = useQuery({
    queryKey: ["studentDashboardReference"],
    queryFn: async () => {
      const [instructors, vehicles] = await Promise.all([
        base44.entities.Instructor.list(),
        base44.entities.Vehicle.list(),
      ]);

      return {
        instructorsById: new Map((instructors || []).map((i) => [i.id, i])),
        vehiclesById: new Map((vehicles || []).map((v) => [v.id, v])),
      };
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const coreQuery = useQuery({
    queryKey: ["studentDashboardCore", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const [bookings, invoices, progress] = await Promise.all([
        base44.entities.Booking.filter({ student_id: studentId }, "-start_datetime", 100),
        base44.entities.Invoice.filter({ student_id: studentId }, "-issue_date", 50),
        base44.entities.StudentCourseProgress.filter({ student_id: studentId }),
      ]);

      let studentPackages = [];
      try {
        studentPackages = await base44.entities.Package.filter({ student_id: studentId }, "-updated_date", 20);
      } catch {
        studentPackages = [];
      }

      return {
        bookings: bookings || [],
        invoices: invoices || [],
        progress: progress || [],
        packages: studentPackages || [],
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return {
    isLoading: referenceQuery.isLoading || coreQuery.isLoading,
    isError: referenceQuery.isError || coreQuery.isError,
    error: referenceQuery.error || coreQuery.error,
    instructorsById: referenceQuery.data?.instructorsById,
    vehiclesById: referenceQuery.data?.vehiclesById,
    bookings: coreQuery.data?.bookings || [],
    invoices: coreQuery.data?.invoices || [],
    packages: coreQuery.data?.packages || [],
    progress: coreQuery.data?.progress || [],
    refetch: () => {
      referenceQuery.refetch();
      coreQuery.refetch();
    },
  };
}

/* ---------------------------
   Exam Focus helpers
--------------------------- */
function buildExamFocus({ student, totalHours, requiredHours, hasUpcomingLesson, balanceDue, creditsRemaining, t }) {
  const needsTheory = !student?.theory_exam_passed;
  const needsHours = totalHours < requiredHours;
  const needsMock = !!student?.theory_exam_passed && !student?.mock_test_passed;
  const needsPractical = !!student?.mock_test_passed && !student?.practical_exam_passed;

  const stepsLeft = [needsTheory, needsHours, needsMock, needsPractical].filter(Boolean).length;

  const actions = [];

  // Prioritized actions
  if (needsTheory) {
    actions.push({
      key: "theory",
      title: t("studentDashboard.theory.title"),
      subtitle: t("studentDashboard.theory.subtitle"),
      cta: t("studentDashboard.theory.startPractice"),
      to: createPageUrl("TheoryLearning"),
      icon: BookOpen,
      color: "from-[#3b82c4] to-[#2563a3]",
    });
  }

  if (needsHours) {
    actions.push({
      key: "book",
      title: t("studentDashboard.bookLesson"),
      subtitle: `${Math.max(0, Math.ceil(requiredHours - totalHours))}h ${t("studentDashboard.stats.remaining")}`,
      cta: t("studentDashboard.bookLesson"),
      to: createPageUrl("BookLesson"),
      icon: Calendar,
      color: "from-[#81da5a] to-[#5cb83a]",
    });
  }

  if (needsMock) {
    actions.push({
      key: "mock",
      title: t("studentDashboard.progress.preTest"),
      subtitle: t("studentDashboard.competencies.title"),
      cta: t("studentDashboard.competencies.viewReport"),
      to: createPageUrl("MyLessons"),
      icon: ShieldCheck,
      color: "from-[#6c376f] to-[#3b82c4]",
    });
  }

  if (needsPractical) {
    actions.push({
      key: "practical",
      title: t("studentDashboard.progress.practicalTest"),
      subtitle: t("studentDashboard.schedule.title"),
      cta: t("studentDashboard.bookLesson"),
      to: createPageUrl("BookLesson"),
      icon: Target,
      color: "from-[#e7d356] to-[#b8a525]",
    });
  }

  // Supporting actions
  if (!hasUpcomingLesson && !needsTheory) {
    actions.push({
      key: "keepMomentum",
      title: t("studentDashboard.schedule.title"),
      subtitle: t("studentDashboard.schedule.noLessons"),
      cta: t("studentDashboard.bookLesson"),
      to: createPageUrl("BookLesson"),
      icon: Zap,
      color: "from-[#2563a3] to-[#3b82c4]",
    });
  }

  if (balanceDue > 0) {
    actions.push({
      key: "pay",
      title: t("studentDashboard.stats.outstanding"),
      subtitle: `${formatEUR(balanceDue)} ${t("studentDashboard.stats.outstanding")}`,
      cta: t("studentDashboard.quickLinks.invoices"),
      to: createPageUrl("StudentInvoices"),
      icon: CreditCard,
      color: "from-[#e44138] to-[#b12d25]",
    });
  }

  if (creditsRemaining <= 0) {
    actions.push({
      key: "topup",
      title: t("studentDashboard.quickLinks.topUp"),
      subtitle: t("studentDashboard.stats.prepaidLessons"),
      cta: t("studentDashboard.quickLinks.topUp"),
      to: createPageUrl("Packages"),
      icon: Wallet,
      color: "from-[#3b82c4] to-[#6c376f]",
    });
  }

  const headline = stepsLeft === 0 ? "All steps completed" : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} to exam-ready`;

  return {
    needsTheory,
    needsHours,
    needsMock,
    needsPractical,
    headline,
    actions: actions.slice(0, 4),
  };
}

/* ---------------------------
   Main page
--------------------------- */
export default function StudentDashboard() {
  const { t } = useTranslation();

  const auth = useStudentAuth();
  const effectiveUser = auth.data?.effectiveUser || null;
  const effectiveStudent = auth.data?.effectiveStudent || null;
  const authStatus = auth.data?.status || "loading";

  const dashboard = useStudentDashboardData(effectiveStudent?.id);

  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("studentDashboard.greeting.morning");
    if (hour < 18) return t("studentDashboard.greeting.afternoon");
    return t("studentDashboard.greeting.evening");
  }, [t]);

  const userName = effectiveUser?.first_name || effectiveUser?.full_name?.split(" ")[0] || "Student";

  const stats = useMemo(() => {
    const bookings = dashboard.bookings || [];
    const invoices = dashboard.invoices || [];
    const packages = dashboard.packages || [];

    const completed = bookings.filter(isCompleted);
    const upcoming = bookings.filter(isUpcomingConfirmed).sort(sortByStartAsc);

    const totalHoursRaw = completed.reduce((acc, b) => acc + hoursFromBooking(b), 0);
    const totalHours = Math.round(totalHoursRaw * 10) / 10;

    const requiredHours = safeNumber(effectiveStudent?.required_hours, REQUIRED_HOURS_DEFAULT);

    const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
    const balanceDue = unpaidInvoices.reduce((acc, curr) => {
      const total = safeNumber(curr.total_amount, 0);
      const paid = safeNumber(curr.amount_paid, 0);
      return acc + Math.max(0, total - paid);
    }, 0);

    // Student package detection: pick the one with remaining lessons if available
    const activePackage = (packages || []).find((p) => safeNumber(p.lessons_remaining, 0) > 0) || null;
    const creditsRemaining = safeNumber(activePackage?.lessons_remaining, 0);

    const nextLesson = upcoming[0] || null;

    return {
      totalHours,
      requiredHours,
      hoursRemaining: Math.max(0, Math.ceil(requiredHours - totalHours)),
      progressPercentage: Math.min(100, Math.round((totalHours / Math.max(1, requiredHours)) * 100)),
      nextLesson,
      balanceDue,
      creditsRemaining,
      totalLessons: completed.length,
      upcomingCount: upcoming.length,
      upcoming,
    };
  }, [dashboard.bookings, dashboard.invoices, dashboard.packages, effectiveStudent]);

  const nextInstructor = useMemo(() => {
    if (!stats.nextLesson) return null;
    return dashboard.instructorsById?.get(stats.nextLesson.instructor_id) || null;
  }, [stats.nextLesson, dashboard.instructorsById]);

  const nextVehicle = useMemo(() => {
    if (!stats.nextLesson) return null;
    return dashboard.vehiclesById?.get(stats.nextLesson.vehicle_id) || null;
  }, [stats.nextLesson, dashboard.vehiclesById]);

  const examFocus = useMemo(() => {
    return buildExamFocus({
      student: effectiveStudent,
      totalHours: stats.totalHours,
      requiredHours: stats.requiredHours,
      hasUpcomingLesson: stats.upcomingCount > 0,
      balanceDue: stats.balanceDue,
      creditsRemaining: stats.creditsRemaining,
      t,
    });
  }, [effectiveStudent, stats.totalHours, stats.requiredHours, stats.upcomingCount, stats.balanceDue, stats.creditsRemaining, t]);

  const veeTip = useMemo(() => {
  if (!effectiveStudent) return null;

  if (examFocus.needsTheory) {
    return {
      title: "Today's best move",
      message: "Do 15 minutes of theory practice. Consistency wins.",
      mood: "thinking",
    };
  }
  if (examFocus.needsHours) {
    return {
      title: "Keep momentum",
      message: "Book the next lesson now so you always have something scheduled.",
      mood: "wave",
    };
  }
  if (examFocus.needsMock) {
    return {
      title: "Mock test focus",
      message: "Review your last lessons and fix the two weakest skills this week.",
      mood: "thinking",
    };
  }
  if (examFocus.needsPractical) {
    return {
      title: "Exam mode",
      message: "Ask your instructor for an exam-style route and strict marking.",
      mood: "celebrate",
    };
  }
  return {
    title: "You are exam-ready",
    message: "Great job. Keep practicing lightly to stay sharp.",
    mood: "celebrate",
  };
  }, [effectiveStudent, examFocus.needsTheory, examFocus.needsHours, examFocus.needsMock, examFocus.needsPractical]);

  const openChat = useCallback(() => {
    if (!nextInstructor || !effectiveStudent) return;
    setShowChat(true);
  }, [nextInstructor, effectiveStudent]);

  // Handle authentication states
  if (auth.isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-12 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (authStatus === "unauthenticated" || !effectiveUser) {
    window.location.href = createPageUrl("StudentAuth");
    return null;
  }

  // User authenticated but no student record - show onboarding
  if (authStatus === "no_student" || !effectiveStudent) {
    return <StudentOnboarding user={effectiveUser} onComplete={() => window.location.reload()} />;
  }

  // Data loading
  if (dashboard.isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-12 w-32" />
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Data error with retry
  if (dashboard.isError) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-red-200 shadow-xl p-12 text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-3">Failed to Load Dashboard</h2>
          <p className="text-zinc-600 mb-8">
            {dashboard.error?.message || "An error occurred while loading your data."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => dashboard.refetch()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-semibold transition"
            >
              Try Again
            </button>
            <Link
              to={createPageUrl("StudentHelp")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-semibold transition"
            >
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Skill display: if you later store real competency data in dashboard.progress,
  // you can map it here. For now we keep your friendly defaults.
  const skillsLeft = [
    { label: t("studentDashboard.competencies.clutchControl"), score: 85 },
    { label: t("studentDashboard.competencies.steering"), score: 90 },
    { label: t("studentDashboard.competencies.gearChanging"), score: 70 },
  ];
  const skillsRight = [
    { label: t("studentDashboard.competencies.junctions"), score: 60 },
    { label: t("studentDashboard.competencies.roundabouts"), score: 45 },
    { label: t("studentDashboard.competencies.hazardPerception"), score: 80 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">
              {greeting}, {userName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-zinc-500 text-sm">
              <span>{t("studentDashboard.licenseGoal")}</span>
              <span className="w-1 h-1 bg-zinc-300 rounded-full" />
              <span className="text-[#3b82c4] font-medium">
                {stats.progressPercentage}% {t("studentDashboard.courseComplete")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to={createPageUrl("BookLesson")}>
              <button className="bg-[#3b82c4] hover:bg-[#2563a3] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm shadow-[#a9d5ed] transition flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t("studentDashboard.bookLesson")}
              </button>
            </Link>
          </div>
        </header>

        {/* Vee Tip (exam relevant) */}
        {veeTip && (
          <div className="bg-gradient-to-br from-[#e8f4fa] via-white to-white border border-[#d4eaf5] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <VeeMascot size="md" mood={veeTip.mood} animate={true} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-[#3b82c4] rounded-full animate-pulse" />
                  <p className="text-xs font-bold text-[#3b82c4] uppercase tracking-wide">{veeTip.title}</p>
                </div>
                <p className="text-sm text-zinc-700 font-medium leading-relaxed">{veeTip.message}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="px-3 py-1.5 rounded-full bg-[#3b82c4]/10 border border-[#3b82c4]/20">
                  <p className="text-xs font-bold text-[#3b82c4]">{examFocus.headline}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            <NextLessonHero
              nextLesson={stats.nextLesson}
              instructor={nextInstructor}
              vehicle={nextVehicle}
              onChat={openChat}
              t={t}
            />

            {/* Exam Focus */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#3b82c4]" />
                    Exam Focus
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Clear next steps based on where you are in the journey.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-[#e8f4fa] text-[#3b82c4] text-xs font-semibold">
                    {examFocus.headline}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {examFocus.actions.map((a) => (
                  <Link
                    key={a.key}
                    to={a.to}
                    className="group rounded-2xl border border-zinc-100 hover:border-zinc-200 bg-white hover:bg-zinc-50 transition shadow-sm hover:shadow-md p-5 flex items-start gap-4"
                  >
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${a.color} text-white shadow-sm`}>
                      <a.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900">{a.title}</p>
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{a.subtitle}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#3b82c4] group-hover:text-[#2563a3]">
                        {a.cta} <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatWidget
                icon={Clock}
                color="indigo"
                value={`${stats.totalHours}h`}
                subValue={`${stats.hoursRemaining}h ${t("studentDashboard.stats.remaining")}`}
                label={t("studentDashboard.stats.hoursDriven")}
              />
              <StatWidget
                icon={CheckCircle2}
                color="emerald"
                value={stats.totalLessons}
                label={t("studentDashboard.stats.lessonsDone")}
              />
              <StatWidget
                icon={Wallet}
                color="violet"
                value={stats.creditsRemaining}
                label={t("studentDashboard.stats.creditsLeft")}
                subValue={t("studentDashboard.stats.prepaidLessons")}
              />
              <StatWidget
                icon={AlertCircle}
                color={stats.balanceDue > 0 ? "rose" : "zinc"}
                value={formatEUR(stats.balanceDue)}
                label={t("studentDashboard.stats.outstanding")}
              />
            </div>

            {/* Competencies (relevant to passing) */}
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3b82c4]" />
                  {t("studentDashboard.competencies.title")}
                </h3>
                <Link
                  to={createPageUrl("MyLessons")}
                  className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3]"
                >
                  {t("studentDashboard.competencies.viewReport")}
                </Link>
              </div>

              <ProgressSteps
                student={effectiveStudent}
                totalHours={stats.totalHours}
                requiredHours={stats.requiredHours}
                t={t}
              />

              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 mt-8 pt-8 border-t border-zinc-100">
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
                    {t("studentDashboard.competencies.vehicleControl")}
                  </h4>
                  {skillsLeft.map((s) => (
                    <SkillBar key={s.label} skill={s.label} score={s.score} />
                  ))}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
                    {t("studentDashboard.competencies.roadProcedure")}
                  </h4>
                  {skillsRight.map((s) => (
                    <SkillBar key={s.label} skill={s.label} score={s.score} />
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#e8f4fa]">
                  <Sparkles className="w-4 h-4 text-[#3b82c4]" />
                </div>
                <div className="text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">Passing tip: </span>
                  Focus your next two lessons on the lowest skills first (often roundabouts and junctions).
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Schedule */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-zinc-900">{t("studentDashboard.schedule.title")}</h3>
                <Link to={createPageUrl("MyLessons")} className="p-1 hover:bg-zinc-100 rounded-lg transition">
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </Link>
              </div>

              <div className="divide-y divide-zinc-100">
                {stats.upcoming.slice(0, 5).map((booking) => {
                  const start = new Date(booking.start_datetime);
                  const soon = isBefore(start, addHours(new Date(), 24));
                  const instructor = dashboard.instructorsById?.get(booking.instructor_id);

                  return (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedLesson(booking)}
                      className="w-full text-left p-4 hover:bg-zinc-50 transition cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "flex flex-col items-center justify-center w-12 h-12 rounded-xl border text-[#3b82c4]",
                            soon ? "bg-[#e8f4fa] border-[#a9d5ed]" : "bg-[#e8f4fa] border-[#d4eaf5]",
                          ].join(" ")}
                        >
                          <span className="text-xs font-bold uppercase">{format(start, "MMM")}</span>
                          <span className="text-lg font-bold leading-none">{format(start, "d")}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">
                            {booking.lesson_type
                              ? String(booking.lesson_type).replaceAll("_", " ")
                              : t("studentDashboard.schedule.practicalLesson")}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {format(start, "h:mm a")} • {instructor?.full_name || "Instructor"}
                          </p>
                          {soon ? (
                            <p className="text-xs text-[#3b82c4] font-semibold mt-1">Within 24 hours</p>
                          ) : null}
                        </div>

                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500" />
                      </div>
                    </button>
                  );
                })}

                {stats.upcomingCount === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-zinc-400" />
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">{t("studentDashboard.schedule.noLessons")}</p>
                    <Link
                      to={createPageUrl("BookLesson")}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#3b82c4] hover:text-[#2563a3]"
                    >
                      {t("studentDashboard.bookLesson")}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Theory Practice CTA (exam relevant) */}
            <div className="bg-gradient-to-br from-[#3b82c4] via-[#2563a3] to-[#6c376f] rounded-2xl p-6 text-white shadow-lg shadow-[#a9d5ed]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">
                    {t("studentDashboard.theory.dailyGoal")}
                  </span>
                </div>

                <h3 className="text-lg font-bold mb-1">{t("studentDashboard.theory.title")}</h3>
                <p className="text-white/80 text-sm mb-6">{t("studentDashboard.theory.subtitle")}</p>

                <Link
                  to={createPageUrl("TheoryLearning")}
                  className="w-full py-3 bg-white text-[#3b82c4] rounded-xl text-sm font-bold flex items-center justify-center hover:bg-[#e8f4fa] transition"
                >
                  {t("studentDashboard.theory.startPractice")}
                </Link>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to={createPageUrl("StudentInvoices")}
                className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2"
              >
                <FileText className="w-6 h-6 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-700">{t("studentDashboard.quickLinks.invoices")}</span>
              </Link>

              <Link
                to={createPageUrl("StudentProfile")}
                className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2"
              >
                <User className="w-6 h-6 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-700">{t("studentDashboard.quickLinks.profile")}</span>
              </Link>

              <Link
                to={createPageUrl("Packages")}
                className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2"
              >
                <CreditCard className="w-6 h-6 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-700">{t("studentDashboard.quickLinks.topUp")}</span>
              </Link>

              <button
                onClick={() => toast.info("Certificate download started")}
                className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2"
              >
                <Award className="w-6 h-6 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-700">
                  {t("studentDashboard.quickLinks.certificates")}
                </span>
              </button>
            </div>

            {/* Instructor chat shortcut */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#e8f4fa]">
                    <MessageSquare className="w-5 h-5 text-[#3b82c4]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Need help fast?</p>
                    <p className="text-xs text-zinc-500">Message your instructor in one tap.</p>
                  </div>
                </div>
                <button
                  onClick={openChat}
                  disabled={!nextInstructor || !effectiveStudent}
                  className={[
                    "px-4 py-2 rounded-xl text-sm font-semibold transition",
                    nextInstructor ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400 cursor-not-allowed",
                  ].join(" ")}
                >
                  Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedLesson ? (
          <LessonDetailsDrawer
            booking={selectedLesson}
            instructor={dashboard.instructorsById?.get(selectedLesson.instructor_id)}
            vehicle={dashboard.vehiclesById?.get(selectedLesson.vehicle_id)}
            onClose={() => setSelectedLesson(null)}
          />
        ) : null}
      </AnimatePresence>

      {showChat && nextInstructor && effectiveStudent ? (
        <ChatInterface student={effectiveStudent} instructor={nextInstructor} onClose={() => setShowChat(false)} />
      ) : null}
    </div>
  );
}