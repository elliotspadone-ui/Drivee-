import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  PieChart,
  BarChart3,
  TrendingDown,
  FileText,
  Package,
  Car,
  Clock,
  Target,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Filter,
  RefreshCw,
  Percent,
  GraduationCap,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Zap,
  Eye,
  MoreHorizontal,
  CalendarDays,
  UserCheck,
  CreditCard,
  Wallet,
  LineChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
} from "date-fns";
import { toast } from "sonner";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import LiveDataChart from "@/components/charts/LiveDataChart";
import { KPIComparisonCard, AnimatedCounter } from "@/components/charts/KPIComparison";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const CHART_COLORS = [
  "from-[#3b82c4] to-[#a9d5ed]",
  "from-[#81da5a] to-[#5cb83a]",
  "from-[#e7d356] to-[#d4bf2e]",
  "from-[#e44138] to-[#c9342c]",
  "from-[#6c376f] to-[#5a2d5d]",
  "from-[#a9d5ed] to-[#8bc7e8]",
];

const StatCard = React.memo(({ icon, label, value, subValue, trend, trendLabel, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? "text-[#5cb83a]" : "text-[#e44138]"
          }`}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    {trendLabel && <p className="text-xs text-zinc-400 mt-1">{trendLabel}</p>}
  </motion.div>
));

StatCard.displayName = "StatCard";

const ProgressBar = React.memo(({ value, max = 100, color = "from-[#3b82c4] to-[#a9d5ed]", size = "sm" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const heightClass = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={`${heightClass} bg-zinc-100 rounded-full overflow-hidden`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
      />
    </div>
  );
});

ProgressBar.displayName = "ProgressBar";

const MiniChart = React.memo(({ data, color = "stroke-[#3b82c4]", height = 40 }) => {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={color}
      />
    </svg>
  );
});

MiniChart.displayName = "MiniChart";

const RevenueChart = React.memo(({ data, timeRange }) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-zinc-900">Revenue Trend</h3>
          <p className="text-sm text-zinc-500">
            {timeRange === "week"
              ? "Last 7 days"
              : timeRange === "month"
              ? "This month"
              : timeRange === "quarter"
              ? "This quarter"
              : "This year"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-zinc-900 tabular-nums">
            €{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Total • €{avgRevenue.toFixed(0)} avg/day</p>
        </div>
      </div>

      <div className="h-48 flex items-end justify-between gap-1">
        {data.slice(-30).map((day, index) => {
          const height = (day.revenue / maxRevenue) * 100;
          return (
            <motion.div
              key={day.date}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 2)}%` }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              className="flex-1 bg-gradient-to-t from-[#3b82c4] to-[#a9d5ed] rounded-t-sm min-h-[4px] group relative cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                €{day.revenue.toLocaleString()}
                <br />
                {format(parseISO(day.date), "MMM d")}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-zinc-500">
        {data.length > 0 && (
          <>
            <span>{format(parseISO(data[Math.max(0, data.length - 30)].date), "MMM d")}</span>
            <span>{format(parseISO(data[data.length - 1].date), "MMM d")}</span>
          </>
        )}
      </div>
    </div>
  );
});

RevenueChart.displayName = "RevenueChart";

const PieChartComponent = React.memo(({ data, title, subtitle }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (startAngle + angle - 90) * (Math.PI / 180);

    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathD =
      angle >= 360
        ? `M 50 10 A 40 40 0 1 1 49.99 10 Z`
        : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return {
      ...item,
      percentage,
      pathD,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-zinc-900">{title}</h3>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <PieChart className="w-5 h-5 text-zinc-400" />
      </div>

      <div className="flex items-center gap-6">
        <div className="w-32 h-32 relative">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {segments.map((segment, index) => (
              <motion.path
                key={segment.label}
                d={segment.pathD}
                className={`fill-current`}
                style={{
                  fill: `url(#gradient-${index})`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              />
            ))}
            <defs>
              {segments.map((segment, index) => (
                <linearGradient key={index} id={`gradient-${index}`}>
                  <stop
                    offset="0%"
                    className={`${segment.color.split(" ")[0].replace("from-", "text-")}`}
                    stopColor="currentColor"
                  />
                  <stop
                    offset="100%"
                    className={`${segment.color.split(" ")[1].replace("to-", "text-")}`}
                    stopColor="currentColor"
                  />
                </linearGradient>
              ))}
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 tabular-nums">
                €{(total / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-zinc-500">Total</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${segment.color}`} />
                <span className="text-sm text-zinc-600 capitalize">
                  {segment.label.replace("_", " ")}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-zinc-900 tabular-nums">
                  €{segment.value.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500 ml-1">
                  ({segment.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

PieChartComponent.displayName = "PieChartComponent";

const InstructorLeaderboard = React.memo(({ instructors }) => {
  const maxRevenue = Math.max(...instructors.map((i) => i.revenue), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-zinc-900">Instructor Performance</h3>
          <p className="text-sm text-zinc-500">Top performers by revenue</p>
        </div>
        <Award className="w-5 h-5 text-amber-500" />
      </div>

      <div className="space-y-4">
        {instructors.slice(0, 5).map((instructor, index) => (
          <motion.div
            key={instructor.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-zinc-100 p-4 hover:border-zinc-200 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                    index === 0
                      ? "bg-gradient-to-br from-[#e7d356] to-[#d4bf2e]"
                      : index === 1
                      ? "bg-gradient-to-br from-zinc-300 to-zinc-400"
                      : index === 2
                      ? "bg-gradient-to-br from-[#b8a525] to-[#9a8520]"
                      : "bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed]"
                  }`}
                >
                  {index < 3 ? index + 1 : instructor.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{instructor.name}</p>
                  <p className="text-xs text-zinc-500">
                    {instructor.lessonsCompleted} lessons • {instructor.utilization}% utilization
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-zinc-900 tabular-nums">
                  €{instructor.revenue.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">€{instructor.avgLessonPrice.toFixed(0)} avg</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  {instructor.lessonsCompleted}
                </p>
                <p className="text-xs text-zinc-500">Lessons</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  {instructor.utilization}%
                </p>
                <p className="text-xs text-zinc-500">Utilization</p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2">
                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                  {instructor.cancelRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500">Cancel Rate</p>
              </div>
            </div>

            <div className="mt-3">
              <ProgressBar
                value={instructor.revenue}
                max={maxRevenue}
                color={
                  index === 0
                    ? "from-[#e7d356] to-[#d4bf2e]"
                    : "from-[#3b82c4] to-[#a9d5ed]"
                }
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

InstructorLeaderboard.displayName = "InstructorLeaderboard";

const VehicleUtilizationChart = React.memo(({ vehicles }) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-zinc-900">Fleet Utilization</h3>
          <p className="text-sm text-zinc-500">Vehicle usage statistics</p>
        </div>
        <Car className="w-5 h-5 text-zinc-400" />
      </div>

      <div className="space-y-4">
        {vehicles.slice(0, 5).map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl bg-zinc-50 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-zinc-900">{vehicle.name}</p>
                <p className="text-xs text-zinc-500">{vehicle.plate}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-zinc-900 tabular-nums">
                  {vehicle.utilization}%
                </p>
                <p className="text-xs text-zinc-500">{vehicle.lessonsCompleted} lessons</p>
              </div>
            </div>

            <ProgressBar
              value={vehicle.utilization}
              color={
                vehicle.utilization >= 70
                  ? "from-[#81da5a] to-[#5cb83a]"
                  : vehicle.utilization >= 40
                  ? "from-[#e7d356] to-[#d4bf2e]"
                  : "from-[#e44138] to-[#c9342c]"
              }
            />

            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>{vehicle.totalBookings} total bookings</span>
              <span>{vehicle.mileage.toLocaleString()} km</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

VehicleUtilizationChart.displayName = "VehicleUtilizationChart";

const StudentFunnelChart = React.memo(({ metrics }) => {
  const stages = [
    { label: "Registered", value: metrics.total, color: "from-zinc-400 to-zinc-500" },
    { label: "Active", value: metrics.active, color: "from-[#a9d5ed] to-[#8bc7e8]" },
    { label: "Theory Passed", value: metrics.theoryPassed, color: "from-[#3b82c4] to-[#2563a3]" },
    { label: "Licensed", value: metrics.licensed, color: "from-[#81da5a] to-[#5cb83a]" },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-zinc-900">Student Pipeline</h3>
          <p className="text-sm text-zinc-500">Conversion funnel</p>
        </div>
        <Target className="w-5 h-5 text-zinc-400" />
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const width = (stage.value / maxValue) * 100;
          const prevValue = index > 0 ? stages[index - 1].value : stage.value;
          const conversion = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(0) : 100;

          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-600">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                    {stage.value}
                  </span>
                  {index > 0 && (
                    <span className="text-xs text-zinc-500">({conversion}%)</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-zinc-100 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  className={`h-full bg-gradient-to-r ${stage.color} rounded-lg flex items-center justify-end px-3`}
                >
                  {width > 20 && (
                    <span className="text-xs font-medium text-white">{stage.value}</span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#5cb83a] tabular-nums">
              {metrics.conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500">Overall Conversion</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#3b82c4] tabular-nums">
              {metrics.retentionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500">Retention Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
});

StudentFunnelChart.displayName = "StudentFunnelChart";

const LessonTypePerformance = React.memo(({ templates }) => {
  const totalRevenue = templates.reduce((sum, t) => sum + t.revenue, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-zinc-900">Lesson Type Performance</h3>
          <p className="text-sm text-zinc-500">Revenue by service type</p>
        </div>
        <Package className="w-5 h-5 text-zinc-400" />
      </div>

      <div className="space-y-3">
        {templates.slice(0, 6).map((template, index) => {
          const percentage = totalRevenue > 0 ? (template.revenue / totalRevenue) * 100 : 0;

          return (
            <motion.div
              key={template.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl bg-zinc-50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{template.name}</p>
                  <p className="text-xs text-zinc-500">{template.count} completed</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-900 tabular-nums">
                    €{template.revenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500">€{template.avgPrice.toFixed(0)} avg</p>
                </div>
              </div>

              <ProgressBar
                value={percentage}
                color={CHART_COLORS[index % CHART_COLORS.length]}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

LessonTypePerformance.displayName = "LessonTypePerformance";

const KPITrend = React.memo(({ title, value, trend, data, icon, color }) => (
  <div className="rounded-xl border border-zinc-100 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
        <span className="text-sm text-zinc-600">{title}</span>
      </div>
      <div
        className={`flex items-center gap-1 text-xs font-medium ${
          trend >= 0 ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {trend >= 0 ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {Math.abs(trend).toFixed(1)}%
      </div>
    </div>
    <p className="text-xl font-bold text-zinc-900 tabular-nums mb-2">{value}</p>
    <div className="h-8">
      <MiniChart data={data} color="stroke-[#3b82c4]" height={32} />
    </div>
  </div>
));

KPITrend.displayName = "KPITrend";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month");
  const [schoolId, setSchoolId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  React.useEffect(() => {
    const loadAuth = async () => {
      try {
        const user = await base44.auth.me();
        if (!user || user.role !== "admin") {
          window.location.href = createPageUrl("Unauthorized");
          return;
        }
        const sid = await getEffectiveSchoolId(user);
        setSchoolId(sid);
      } catch (err) {
        logger.error("Failed to load auth:", err);
        window.location.href = createPageUrl("SchoolLogin");
      } finally {
        setLoadingAuth(false);
      }
    };
    loadAuth();
  }, []);

  const { data: payments = [], isLoading: loadingPayments, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["payments", schoolId],
    queryFn: () => schoolId ? base44.entities.Payment.filter({ school_id: schoolId }, "-payment_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors", schoolId],
    queryFn: () => schoolId ? base44.entities.Instructor.filter({ school_id: schoolId }, "-created_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles", schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: serviceTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["serviceTemplates", schoolId],
    queryFn: () => schoolId ? base44.entities.ServiceTemplate.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const isLoading =
    loadingAuth ||
    loadingPayments ||
    loadingBookings ||
    loadingStudents ||
    loadingInstructors ||
    loadingVehicles ||
    loadingTemplates;

  const getDateRange = useCallback(() => {
    const today = new Date();
    switch (timeRange) {
      case "week":
        return { start: startOfWeek(today), end: today };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "quarter":
        return { start: subMonths(startOfMonth(today), 2), end: endOfMonth(today) };
      case "year":
        return { start: startOfYear(today), end: today };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  }, [timeRange]);

  const getPreviousDateRange = useCallback(() => {
    const current = getDateRange();
    const days = differenceInDays(current.end, current.start);
    return {
      start: subDays(current.start, days + 1),
      end: subDays(current.start, 1),
    };
  }, [getDateRange]);

  const filterByDateRange = useCallback(
    (items, range) => {
      return items.filter((item) => {
        const dateStr = item.payment_date || item.start_datetime || item.created_date;
        if (!dateStr) return false;
        const date = parseISO(dateStr);
        return isWithinInterval(date, range);
      });
    },
    []
  );

  const revenueData = useMemo(() => {
    const currentRange = getDateRange();
    const previousRange = getPreviousDateRange();

    const currentPayments = filterByDateRange(payments, currentRange).filter(
      (p) => p.status === "completed"
    );
    const previousPayments = filterByDateRange(payments, previousRange).filter(
      (p) => p.status === "completed"
    );

    const total = currentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const previousTotal = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

    const byType = {};
    const byMethod = {};

    currentPayments.forEach((p) => {
      const type = p.payment_type || "other";
      const method = p.payment_method || "other";
      byType[type] = (byType[type] || 0) + (p.amount || 0);
      byMethod[method] = (byMethod[method] || 0) + (p.amount || 0);
    });

    const daysInRange = Math.max(differenceInDays(currentRange.end, currentRange.start), 1);
    const avgDaily = total / daysInRange;
    const projectedMonthly = avgDaily * 30;

    return {
      total,
      byType,
      byMethod,
      growth,
      previousPeriod: previousTotal,
      projectedMonthly,
    };
  }, [payments, getDateRange, getPreviousDateRange, filterByDateRange]);

  const bookingStats = useMemo(() => {
    const currentRange = getDateRange();
    const rangeBookings = filterByDateRange(bookings, currentRange);

    const completed = rangeBookings.filter((b) => b.status === "completed");
    const cancelled = rangeBookings.filter((b) => b.status === "cancelled");
    const noShow = rangeBookings.filter((b) => b.status === "no_show");

    const totalRevenue = completed.reduce((sum, b) => sum + (b.price || 0), 0);
    const avgPrice = completed.length > 0 ? totalRevenue / completed.length : 0;

    return {
      total: rangeBookings.length,
      completed: completed.length,
      cancelled: cancelled.length,
      noShow: noShow.length,
      completionRate:
        rangeBookings.length > 0 ? (completed.length / rangeBookings.length) * 100 : 0,
      cancellationRate:
        rangeBookings.length > 0 ? (cancelled.length / rangeBookings.length) * 100 : 0,
      averagePrice: avgPrice,
      totalRevenue,
    };
  }, [bookings, getDateRange, filterByDateRange]);

  const studentMetrics = useMemo(() => {
    const currentRange = getDateRange();
    const previousRange = getPreviousDateRange();

    const active = students.filter((s) => s.is_active);
    const theoryPassed = students.filter((s) => s.theory_exam_passed);
    const licensed = students.filter((s) => s.practical_exam_passed);

    const newThisMonth = students.filter((s) => {
      if (!s.created_date) return false;
      return isWithinInterval(parseISO(s.created_date), currentRange);
    });

    const previousActive = students.filter((s) => {
      if (!s.created_date) return s.is_active;
      return (
        isWithinInterval(parseISO(s.created_date), previousRange) ||
        parseISO(s.created_date) < previousRange.start
      );
    });

    const retentionRate =
      previousActive.length > 0 ? (active.length / previousActive.length) * 100 : 100;

    const avgProgress =
      students.length > 0
        ? students.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / students.length
        : 0;

    const conversionRate = students.length > 0 ? (licensed.length / students.length) * 100 : 0;

    return {
      total: students.length,
      active: active.length,
      theoryPassed: theoryPassed.length,
      licensed: licensed.length,
      newThisMonth: newThisMonth.length,
      retentionRate: Math.min(retentionRate, 100),
      avgProgress,
      conversionRate,
    };
  }, [students, getDateRange, getPreviousDateRange]);

  const instructorPerformance = useMemo(() => {
    const currentRange = getDateRange();
    const rangeBookings = filterByDateRange(bookings, currentRange);

    return instructors
      .filter((i) => i.is_active)
      .map((instructor) => {
        const instructorBookings = rangeBookings.filter((b) => b.instructor_id === instructor.id);
        const completed = instructorBookings.filter((b) => b.status === "completed");
        const cancelled = instructorBookings.filter((b) => b.status === "cancelled");

        const revenue = completed.reduce((sum, b) => sum + (b.price || 0), 0);
        const utilization =
          instructorBookings.length > 0
            ? (completed.length / instructorBookings.length) * 100
            : 0;
        const cancelRate =
          instructorBookings.length > 0
            ? (cancelled.length / instructorBookings.length) * 100
            : 0;
        const avgLessonPrice = completed.length > 0 ? revenue / completed.length : 0;

        return {
          id: instructor.id,
          name: instructor.full_name,
          lessonsCompleted: completed.length,
          revenue,
          utilization: Math.round(utilization),
          cancelRate,
          avgLessonPrice,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [instructors, bookings, getDateRange, filterByDateRange]);

  const vehicleUtilization = useMemo(() => {
    const currentRange = getDateRange();
    const rangeBookings = filterByDateRange(bookings, currentRange);

    return vehicles
      .map((vehicle) => {
        const vehicleBookings = rangeBookings.filter((b) => b.vehicle_id === vehicle.id);
        const completed = vehicleBookings.filter((b) => b.status === "completed");

        const utilization =
          vehicleBookings.length > 0 ? (completed.length / vehicleBookings.length) * 100 : 0;

        return {
          id: vehicle.id,
          name: `${vehicle.make} ${vehicle.model}`,
          plate: vehicle.license_plate,
          lessonsCompleted: completed.length,
          totalBookings: vehicleBookings.length,
          utilization: Math.round(utilization),
          mileage: vehicle.mileage || 0,
        };
      })
      .sort((a, b) => b.lessonsCompleted - a.lessonsCompleted);
  }, [vehicles, bookings, getDateRange, filterByDateRange]);

  const lessonTypeStats = useMemo(() => {
    const currentRange = getDateRange();
    const rangeBookings = filterByDateRange(bookings, currentRange);

    return serviceTemplates
      .map((template) => {
        const templateBookings = rangeBookings.filter(
          (b) => b.service_template_id === template.id
        );
        const completed = templateBookings.filter((b) => b.status === "completed");
        const revenue = completed.reduce((sum, b) => sum + (b.price || 0), 0);

        return {
          name: template.name,
          count: completed.length,
          revenue,
          avgPrice: completed.length > 0 ? revenue / completed.length : template.price,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [serviceTemplates, bookings, getDateRange, filterByDateRange]);

  const dailyRevenue = useMemo(() => {
    const currentRange = getDateRange();
    const days = eachDayOfInterval(currentRange);

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayPayments = payments.filter((p) => {
        const paymentDate = p.payment_date || p.created_date;
        return paymentDate?.startsWith(dayStr) && p.status === "completed";
      });

      const dayBookings = bookings.filter((b) => {
        return b.start_datetime?.startsWith(dayStr) && b.status === "completed";
      });

      return {
        date: dayStr,
        revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        bookings: dayBookings.length,
      };
    });
  }, [payments, bookings, getDateRange]);

  const revenueByTypeData = useMemo(
    () =>
      Object.entries(revenueData.byType)
        .map(([label, value], index) => ({
          label,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .filter((item) => item.value > 0),
    [revenueData.byType]
  );

  const revenueByMethodData = useMemo(
    () =>
      Object.entries(revenueData.byMethod)
        .map(([label, value], index) => ({
          label,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .filter((item) => item.value > 0),
    [revenueData.byMethod]
  );

  const kpiTrends = useMemo(() => {
    const last7Days = dailyRevenue.slice(-7);
    const revenueValues = last7Days.map((d) => d.revenue);
    const bookingValues = last7Days.map((d) => d.bookings);

    return {
      revenue: revenueValues,
      bookings: bookingValues,
    };
  }, [dailyRevenue]);

  const handleExport = useCallback((exportType) => {
    const dateRange = getDateRange();
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      revenue: revenueData,
      bookings: bookingStats,
      students: studentMetrics,
      instructors: instructorPerformance,
      vehicles: vehicleUtilization,
      lessonTypes: lessonTypeStats,
    };

    const exportConfig = {
      companyName: "DrivePro Driving School",
      reportTitle: "Analytics Report",
      dateRange: {
        start: format(dateRange.start, "yyyy-MM-dd"),
        end: format(dateRange.end, "yyyy-MM-dd"),
      },
      accountingBasis: "accrual",
      showAccountCodes: false,
      showPercentages: true,
      showComparison: false,
      generatedAt: new Date(),
    };

    const escapeCsv = (value) => {
      const str = String(value === null || value === undefined ? '' : value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const escapeXML = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const escapeHTML = (str) => {
      if (str === null || str === undefined) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const formatCurrencyRaw = (value) => {
      if (value === 0 || value === null || value === undefined) return "€0";
      const absValue = Math.abs(value);
      const formatted = new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(absValue);
      return value < 0 ? `(${formatted})` : formatted;
    };

    try {
      switch (exportType) {
        case "excel":
          exportToExcel(reportData, exportConfig, { escapeCsv, escapeXML });
          toast.success("Excel file exported successfully");
          break;
        case "pdf":
          exportToPDF(reportData, exportConfig, { escapeHTML, formatCurrencyRaw });
          toast.success("PDF export initiated");
          break;
        case "csv":
          exportToCSV(reportData, exportConfig, { escapeCsv });
          toast.success("CSV file exported successfully");
          break;
        case "json":
          const json = JSON.stringify(reportData, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `analytics-report-${format(new Date(), "yyyy-MM-dd")}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("JSON report exported successfully");
          break;
      }
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Failed to export report");
    }
  }, [
    timeRange,
    revenueData,
    bookingStats,
    studentMetrics,
    instructorPerformance,
    vehicleUtilization,
    lessonTypeStats,
    getDateRange,
  ]);

  const exportToCSV = (data, config, utils) => {
    const { escapeCsv } = utils;
    const csvRows = [];

    csvRows.push([escapeCsv(config.companyName)]);
    csvRows.push([escapeCsv(config.reportTitle)]);
    csvRows.push([`Period: ${format(parseISO(config.dateRange.start), "yyyy-MM-dd")} to ${format(parseISO(config.dateRange.end), "yyyy-MM-dd")}`]);
    csvRows.push([`Generated: ${format(config.generatedAt, "yyyy-MM-dd HH:mm:ss")}`]);
    csvRows.push([]);

    // Revenue Summary
    csvRows.push(["REVENUE SUMMARY"]);
    csvRows.push(["Total Revenue", data.revenue.total.toFixed(2)]);
    csvRows.push(["Growth", `${data.revenue.growth.toFixed(1)}%`]);
    csvRows.push(["Projected Monthly", data.revenue.projectedMonthly.toFixed(2)]);
    csvRows.push([]);

    // Booking Stats
    csvRows.push(["BOOKING STATISTICS"]);
    csvRows.push(["Total Bookings", data.bookings.total]);
    csvRows.push(["Completed", data.bookings.completed]);
    csvRows.push(["Cancelled", data.bookings.cancelled]);
    csvRows.push(["Completion Rate", `${data.bookings.completionRate.toFixed(1)}%`]);
    csvRows.push(["Average Price", `€${data.bookings.averagePrice.toFixed(2)}`]);
    csvRows.push([]);

    // Student Metrics
    csvRows.push(["STUDENT METRICS"]);
    csvRows.push(["Total Students", data.students.total]);
    csvRows.push(["Active Students", data.students.active]);
    csvRows.push(["New This Period", data.students.newThisMonth]);
    csvRows.push(["Theory Passed", data.students.theoryPassed]);
    csvRows.push(["Licensed", data.students.licensed]);
    csvRows.push(["Retention Rate", `${data.students.retentionRate.toFixed(1)}%`]);
    csvRows.push([]);

    // Instructor Performance
    csvRows.push(["INSTRUCTOR PERFORMANCE"]);
    csvRows.push(["Instructor", "Lessons", "Revenue", "Utilization %", "Cancel Rate %"]);
    data.instructors.forEach(instructor => {
      csvRows.push([
        escapeCsv(instructor.name),
        instructor.lessonsCompleted,
        instructor.revenue.toFixed(2),
        instructor.utilization,
        instructor.cancelRate.toFixed(1),
      ]);
    });
    csvRows.push([]);

    // Vehicle Utilization
    csvRows.push(["VEHICLE UTILIZATION"]);
    csvRows.push(["Vehicle", "Lessons", "Utilization %", "Mileage"]);
    data.vehicles.forEach(vehicle => {
      csvRows.push([
        escapeCsv(vehicle.name),
        vehicle.lessonsCompleted,
        vehicle.utilization,
        vehicle.mileage,
      ]);
    });
    csvRows.push([]);

    // Revenue by Type
    csvRows.push(["REVENUE BY TYPE"]);
    csvRows.push(["Type", "Amount", "Percentage"]);
    Object.entries(data.revenue.byType).forEach(([type, amount]) => {
      csvRows.push([
        escapeCsv(type),
        amount.toFixed(2),
        `${((amount / data.revenue.total) * 100).toFixed(1)}%`,
      ]);
    });

    const csvContent = csvRows.map(row => row.join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const fileName = `analytics-${timeRange}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (data, config, utils) => {
    const { escapeXML } = utils;
    const safeCompanyName = escapeXML(config.companyName);
    const safeReportTitle = escapeXML(config.reportTitle);

    let xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${safeCompanyName}</Author>
  <Created>${config.generatedAt.toISOString()}</Created>
  <Company>${safeCompanyName}</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="&quot;€&quot;#,##0.00"/>
  </Style>
  <Style ss:ID="Percent">
   <NumberFormat ss:Format="0.0%"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Analytics">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">${safeReportTitle}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Period: ${escapeXML(format(parseISO(config.dateRange.start), "yyyy-MM-dd"))} to ${escapeXML(format(parseISO(config.dateRange.end), "yyyy-MM-dd"))}</Data></Cell></Row>
   <Row/>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Metric</Data></Cell>
    <Cell><Data ss:Type="String">Value</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Revenue</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${data.revenue.total}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Revenue Growth</Data></Cell>
    <Cell ss:StyleID="Percent"><Data ss:Type="Number">${data.revenue.growth / 100}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Bookings</Data></Cell>
    <Cell><Data ss:Type="Number">${data.bookings.total}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Completed Lessons</Data></Cell>
    <Cell><Data ss:Type="Number">${data.bookings.completed}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Active Students</Data></Cell>
    <Cell><Data ss:Type="Number">${data.students.active}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
    const fileName = `analytics-${timeRange}-${format(new Date(), "yyyyMMdd-HHmm")}.xls`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (data, config, utils) => {
    const { escapeHTML, formatCurrencyRaw } = utils;
    const safeCompanyName = escapeHTML(config.companyName);
    const safeReportTitle = escapeHTML(config.reportTitle);

    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeReportTitle}</title>
  <style>
    @page { margin: 0.75in; size: A4 portrait; }
    @media print { body { margin: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Calibri', sans-serif; color: #1F2937; font-size: 10px; background: white; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #4F46E5; }
    .company-name { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .report-title { font-size: 16px; font-weight: 600; color: #4F46E5; margin-bottom: 8px; }
    .date-range { font-size: 12px; color: #374151; margin-bottom: 6px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1F2937; margin-bottom: 10px; padding: 8px; background: #F3F4F6; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    thead th { padding: 8px; text-align: left; font-weight: 700; background: #4F46E5; color: white; font-size: 9px; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; font-size: 10px; }
    .right { text-align: right; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 8px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="company-name">${safeCompanyName}</h1>
    <h2 class="report-title">${safeReportTitle}</h2>
    <p class="date-range">${escapeHTML(format(parseISO(config.dateRange.start), "MMMM d, yyyy"))} – ${escapeHTML(format(parseISO(config.dateRange.end), "MMMM d, yyyy"))}</p>
  </div>
  
  <div class="section">
    <div class="section-title">Revenue Summary</div>
    <table>
      <tr><td>Total Revenue</td><td class="right">${formatCurrencyRaw(data.revenue.total)}</td></tr>
      <tr><td>Revenue Growth</td><td class="right">${data.revenue.growth.toFixed(1)}%</td></tr>
      <tr><td>Projected Monthly</td><td class="right">${formatCurrencyRaw(data.revenue.projectedMonthly)}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Booking Statistics</div>
    <table>
      <tr><td>Total Bookings</td><td class="right">${data.bookings.total}</td></tr>
      <tr><td>Completed</td><td class="right">${data.bookings.completed}</td></tr>
      <tr><td>Completion Rate</td><td class="right">${data.bookings.completionRate.toFixed(1)}%</td></tr>
      <tr><td>Average Price</td><td class="right">${formatCurrencyRaw(data.bookings.averagePrice)}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Student Metrics</div>
    <table>
      <tr><td>Total Students</td><td class="right">${data.students.total}</td></tr>
      <tr><td>Active Students</td><td class="right">${data.students.active}</td></tr>
      <tr><td>Retention Rate</td><td class="right">${data.students.retentionRate.toFixed(1)}%</td></tr>
      <tr><td>Licensed</td><td class="right">${data.students.licensed}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Instructor Performance</div>
    <table>
      <thead><tr><th>Instructor</th><th class="right">Lessons</th><th class="right">Revenue</th><th class="right">Util %</th></tr></thead>
      <tbody>
        ${data.instructors.map(i => `<tr><td>${escapeHTML(i.name)}</td><td class="right">${i.lessonsCompleted}</td><td class="right">${formatCurrencyRaw(i.revenue)}</td><td class="right">${i.utilization}%</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Report ID: AN-${format(config.generatedAt, "yyyyMMddHHmmss")} | Generated by DrivePro</p>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    }, 250);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SkeletonLoader count={6} type="card" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">School Not Found</h3>
          <p className="text-gray-600">Please complete your school setup first.</p>
        </div>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={paymentsError} 
          onRetry={refetchPayments}
          title="Failed to load analytics"
        />
      </div>
    );
  }

  return (
    <>
      <ScrollProgress color="#3b82c4" height={3} />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      <ScrollFadeIn direction="up">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Analytics & Reports</h1>
          <p className="text-zinc-600 mt-1">
            Financial insights, performance metrics, and business intelligence
            </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <button
            onClick={() => handleExport("excel")}
            className="px-4 py-2.5 rounded-xl bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3] font-medium transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="px-4 py-2.5 rounded-xl bg-[#fdeeed] text-[#e44138] hover:bg-[#f9d4d2] font-medium transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-4 py-2.5 rounded-xl bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5] font-medium transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </motion.header>
      </ScrollFadeIn>

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-[#5cb83a]" />}
          label="Revenue"
          value={`€${revenueData.total.toLocaleString()}`}
          trend={revenueData.growth}
          trendLabel={`vs €${revenueData.previousPeriod.toLocaleString()} prev`}
          color="bg-[#eefbe7]"
          delay={0.05}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-[#3b82c4]" />}
          label="Lessons"
          value={bookingStats.completed}
          subValue={`${bookingStats.completionRate.toFixed(0)}% completion`}
          color="bg-[#e8f4fa]"
          delay={0.1}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-[#6c376f]" />}
          label="Active Students"
          value={studentMetrics.active}
          subValue={`${studentMetrics.newThisMonth} new this period`}
          color="bg-[#f3e8f4]"
          delay={0.15}
        />
        <StatCard
          icon={<GraduationCap className="w-5 h-5 text-[#b8a525]" />}
          label="Licensed"
          value={studentMetrics.licensed}
          subValue={`${studentMetrics.conversionRate.toFixed(1)}% conversion`}
          color="bg-[#fdfbe8]"
          delay={0.2}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-[#3b82c4]" />}
          label="Avg. Price"
          value={`€${bookingStats.averagePrice.toFixed(0)}`}
          color="bg-[#e8f4fa]"
          delay={0.25}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-[#3b82c4]" />}
          label="Projected Monthly"
          value={`€${Math.round(revenueData.projectedMonthly).toLocaleString()}`}
          color="bg-[#e8f4fa]"
          delay={0.3}
        />
      </div>
      </StaggerFadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={dailyRevenue} timeRange={timeRange} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-zinc-900 mb-4">Key Metrics Trend</h3>
          <div className="space-y-4">
            <KPITrend
              title="Daily Revenue"
              value={`€${dailyRevenue[dailyRevenue.length - 1]?.revenue.toLocaleString() || 0}`}
              trend={revenueData.growth}
              data={kpiTrends.revenue}
              icon={<DollarSign className="w-4 h-4 text-[#5cb83a]" />}
              color="bg-[#eefbe7]"
            />
            <KPITrend
              title="Daily Bookings"
              value={dailyRevenue[dailyRevenue.length - 1]?.bookings || 0}
              trend={
                bookingStats.completed > 0
                  ? ((dailyRevenue[dailyRevenue.length - 1]?.bookings || 0) /
                      (bookingStats.completed / dailyRevenue.length) -
                      1) *
                    100
                  : 0
              }
              data={kpiTrends.bookings}
              icon={<Calendar className="w-4 h-4 text-[#3b82c4]" />}
              color="bg-[#e8f4fa]"
            />
            <div className="rounded-xl bg-zinc-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-600">Completion Rate</span>
                <span className="text-lg font-bold text-zinc-900 tabular-nums">
                  {bookingStats.completionRate.toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                value={bookingStats.completionRate}
                color="from-[#81da5a] to-[#5cb83a]"
              />
            </div>
            <div className="rounded-xl bg-zinc-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-600">Cancellation Rate</span>
                <span className="text-lg font-bold text-zinc-900 tabular-nums">
                  {bookingStats.cancellationRate.toFixed(1)}%
                </span>
              </div>
              <ProgressBar
                value={bookingStats.cancellationRate}
                color="from-[#e44138] to-[#c9342c]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Revenue by Payment Type</h3>
          <p className="text-sm text-gray-600 mb-4">Breakdown of income sources</p>
          <div className="h-80">
            <Pie
              data={{
                labels: revenueByTypeData.map(d => d.label),
                datasets: [{
                  data: revenueByTypeData.map(d => d.value),
                  backgroundColor: CHART_COLORS.map(c => c.split(' ')[0].replace('from-', '')),
                  borderWidth: 2,
                  borderColor: '#ffffff'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${ctx.label}: €${ctx.parsed.toLocaleString()}`
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Revenue by Payment Method</h3>
          <p className="text-sm text-gray-600 mb-4">How customers pay</p>
          <div className="h-80">
            <Pie
              data={{
                labels: revenueByMethodData.map(d => d.label),
                datasets: [{
                  data: revenueByMethodData.map(d => d.value),
                  backgroundColor: ['#3b82c4', '#81da5a', '#e7d356', '#6c376f', '#a9d5ed'],
                  borderWidth: 2,
                  borderColor: '#ffffff'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${ctx.label}: €${ctx.parsed.toLocaleString()}`
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InstructorLeaderboard instructors={instructorPerformance} />
        <StudentFunnelChart metrics={studentMetrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleUtilizationChart vehicles={vehicleUtilization} />
        <LessonTypePerformance templates={lessonTypeStats} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-zinc-900">Business Health Overview</h3>
            <p className="text-sm text-zinc-500">Key performance indicators at a glance</p>
          </div>
          <Activity className="w-5 h-5 text-zinc-400" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="rounded-xl bg-[#eefbe7] p-4 text-center">
            <CheckCircle className="w-6 h-6 text-[#5cb83a] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#4a9c2e] tabular-nums">
              {bookingStats.completionRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#5cb83a]">Lesson Completion</p>
          </div>

          <div className="rounded-xl bg-[#e8f4fa] p-4 text-center">
            <Users className="w-6 h-6 text-[#3b82c4] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#2563a3] tabular-nums">
              {studentMetrics.retentionRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#3b82c4]">Student Retention</p>
          </div>

          <div className="rounded-xl bg-[#f3e8f4] p-4 text-center">
            <Target className="w-6 h-6 text-[#6c376f] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#5a2d5d] tabular-nums">
              {studentMetrics.conversionRate.toFixed(0)}%
            </p>
            <p className="text-xs text-[#6c376f]">License Conversion</p>
          </div>

          <div className="rounded-xl bg-[#fdfbe8] p-4 text-center">
            <Car className="w-6 h-6 text-[#b8a525] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#9a8520] tabular-nums">
              {vehicleUtilization.length > 0
                ? Math.round(
                    vehicleUtilization.reduce((sum, v) => sum + v.utilization, 0) /
                      vehicleUtilization.length
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-[#b8a525]">Fleet Utilization</p>
          </div>

          <div className="rounded-xl bg-[#e8f4fa] p-4 text-center">
            <UserCheck className="w-6 h-6 text-[#3b82c4] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#2563a3] tabular-nums">
              {instructorPerformance.length > 0
                ? Math.round(
                    instructorPerformance.reduce((sum, i) => sum + i.utilization, 0) /
                      instructorPerformance.length
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-[#3b82c4]">Instructor Utilization</p>
          </div>

          <div className="rounded-xl bg-[#fdeeed] p-4 text-center">
            <XCircle className="w-6 h-6 text-[#e44138] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[#c9342c] tabular-nums">
              {bookingStats.cancellationRate.toFixed(1)}%
            </p>
            <p className="text-xs text-[#e44138]">Cancellation Rate</p>
          </div>
        </div>
      </motion.div>
      </div>
    </>
  );
}