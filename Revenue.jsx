import React, { useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Package,
  DollarSign,
  Download,
  FileText,
  Calendar,
  Award,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  Percent,
  CreditCard,
  Wallet,
  TrendingUp as Growth,
  Activity,
  FileSpreadsheet,
  FileDown,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts";



// ============================================
// CONSTANTS
// ============================================

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#10b981",
];

const REVENUE_SOURCES_CONFIG = {
  lesson: { label: "Individual Lessons", color: "#6366f1" },
  package: { label: "Packages", color: "#8b5cf6" },
  exam_fee: { label: "Test Fees", color: "#ec4899" },
  material: { label: "Materials", color: "#f59e0b" },
  registration: { label: "Registration", color: "#10b981" },
  other: { label: "Other", color: "#6b7280" },
};

const PERIOD_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
];

const BREAKDOWN_OPTIONS = [
  { value: "source", label: "By Source" },
  { value: "instructor", label: "By Instructor" },
  { value: "vehicle", label: "By Vehicle" },
  { value: "category", label: "By License Category" },
  { value: "trend", label: "Revenue Trend" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyCompact = (amount) => {
  if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `€${(amount / 1000).toFixed(1)}K`;
  return `€${amount.toFixed(0)}`;
};

const formatPercentage = (value) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case "week": {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1);
      return { start: weekStart, end: now };
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    case "quarter": {
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      return { start: quarterStart, end: now };
    }
    case "year": {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    }
    default:
      return { start: today, end: now };
  }
};

const isWithinRange = (dateStr, range) => {
  const date = new Date(dateStr);
  return date >= range.start && date <= range.end;
};

// ============================================
// METRIC CARD COMPONENT
// ============================================

const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  iconBgClass = "from-indigo-50 to-purple-50",
  loading = false,
}) {
  const isPositive = trend !== undefined && trend >= 0;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-8 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`w-12 h-12 bg-gradient-to-br ${iconBgClass} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">
        {typeof value === "number" ? formatCurrency(value) : value}
      </p>
      {(trend !== undefined || subtitle) && (
        <div className="flex items-center gap-2 mt-3">
          {trend !== undefined && (
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
              isPositive ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-[#fdeeed] text-[#e44138]"
            }`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="text-sm font-semibold">{formatPercentage(trend)}</span>
            </div>
          )}
          {(trendLabel || subtitle) && (
            <span className="text-sm text-gray-500">{trendLabel || subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================
// REVENUE BREAKDOWN CHART
// ============================================

const RevenueBreakdownChart = memo(function RevenueBreakdownChart({
  data,
  title,
  subtitle,
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-lg font-bold text-indigo-600">{formatCurrency(item.value)}</p>
          <p className="text-sm text-gray-500">{item.percentage?.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-8">
        <div className="relative w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyCompact(total)}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                <span className="text-xs text-gray-500 ml-2">({item.percentage?.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// REVENUE TREND CHART
// ============================================

const RevenueTrendChart = memo(function RevenueTrendChart({
  data,
  title,
  subtitle,
}) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="font-medium text-gray-600 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-gray-700">{entry.name}:</span>
              <span className="text-sm font-semibold text-gray-900">
                {entry.name === "Bookings" ? entry.value : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="period" stroke="#9ca3af" style={{ fontSize: "12px" }} tickLine={false} />
          <YAxis
            yAxisId="left"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => formatCurrencyCompact(value)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            name="Revenue"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="bookings"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: "#10b981", r: 4 }}
            name="Bookings"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================
// BAR CHART COMPONENT
// ============================================

const RevenueBarChart = memo(function RevenueBarChart({
  data,
  title,
  subtitle,
  dataKey = "revenue",
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data.slice(0, 10)}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} tickFormatter={(value) => `€${value}`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value) => [formatCurrency(value), "Revenue"]}
          />
          <Bar dataKey={dataKey} fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// ============================================
// INSTRUCTOR PERFORMANCE TABLE
// ============================================

const InstructorPerformanceTable = memo(function InstructorPerformanceTable({
  data,
  teamAverage,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Instructor Performance Ranking</h3>
            <p className="text-sm text-gray-600 mt-1">Team average: {formatCurrency(teamAverage)}</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Instructor</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Revenue</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Lessons</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Avg/Lesson</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Students</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pass Rate</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">vs Team Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((instructor, index) => {
              const vsAverage = teamAverage > 0 ? ((instructor.revenue / teamAverage - 1) * 100) : 0;
              const isAboveAverage = vsAverage > 0;

              return (
                <tr key={instructor.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                      index === 0 ? "bg-yellow-100 text-yellow-700" :
                      index === 1 ? "bg-gray-200 text-gray-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82c4] to-[#6c376f] flex items-center justify-center text-white font-semibold">
                        {instructor.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{instructor.name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < Math.round(instructor.rating) ? "text-yellow-400" : "text-gray-300"}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(instructor.revenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">{instructor.lessons}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                    {formatCurrency(instructor.avgPerLesson)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">{instructor.studentCount}</td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      instructor.passRate >= 90 ? "bg-[#eefbe7] text-[#4a9c2e]" :
                      instructor.passRate >= 80 ? "bg-[#fdfbe8] text-[#b8a525]" :
                      "bg-[#fdeeed] text-[#c9342c]"
                    }`}>
                      {instructor.passRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right tabular-nums">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      isAboveAverage ? "bg-[#eefbe7] text-[#5cb83a]" : "bg-gray-100 text-gray-600"
                    }`}>
                      {isAboveAverage ? "+" : ""}{vsAverage.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-gray-900" colSpan={2}>Team Average</td>
              <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 tabular-nums">
                {formatCurrency(teamAverage)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                {data.length > 0 ? Math.round(data.reduce((sum, i) => sum + i.lessons, 0) / data.length) : 0}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                {formatCurrency(data.length > 0 ? data.reduce((sum, i) => sum + i.avgPerLesson, 0) / data.length : 0)}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                {data.length > 0 ? Math.round(data.reduce((sum, i) => sum + i.studentCount, 0) / data.length) : 0}
              </td>
              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                {(data.length > 0 ? data.reduce((sum, i) => sum + i.passRate, 0) / data.length : 0).toFixed(0)}%
              </td>
              <td className="px-6 py-4">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});

// ============================================
// INSIGHTS PANEL
// ============================================

const InsightsPanel = memo(function InsightsPanel({ insights }) {
  const getIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircle className="w-5 h-5 text-[#5cb83a]" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-[#e7d356]" />;
      case "opportunity": return <Lightbulb className="w-5 h-5 text-[#6c376f]" />;
      default: return <Info className="w-5 h-5 text-[#3b82c4]" />;
    }
  };

  const getBgClass = (type) => {
    switch (type) {
      case "success": return "bg-[#eefbe7] border-[#d4f4c3]";
      case "warning": return "bg-[#fdfbe8] border-[#f9f3c8]";
      case "opportunity": return "bg-[#f3e8f4] border-[#e5d0e6]";
      default: return "bg-[#e8f4fa] border-[#d4eaf5]";
    }
  };

  if (insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#e8f4fa] to-[#f3e8f4] rounded-2xl p-6 border border-[#d4eaf5]">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-[#3b82c4]" />
        <h3 className="text-lg font-bold text-gray-900">💡 Revenue Insights</h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className={`rounded-xl p-4 border ${getBgClass(insight.type)} transition-all hover:shadow-md`}>
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{insight.title}</p>
                  {insight.value && (
                    <span className="text-sm font-bold text-[#3b82c4]">{insight.value}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.action && (
                  <button className="text-sm font-medium text-[#3b82c4] hover:text-[#2563a3] mt-2 flex items-center gap-1">
                    {insight.action}
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN REVENUE COMPONENT
// ============================================

export default function Revenue() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("month");
  const [breakdown, setBreakdown] = useState("source");

  // Data fetching
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: () => base44.entities.Package.list(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const isLoading = bookingsLoading || paymentsLoading;
  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Revenue metrics calculation
  const metrics = useMemo(() => {
    const completedPayments = payments.filter((p) => p.status === "completed");
    const completedBookings = bookings.filter((b) => b.status === "completed");

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const previousPeriodRevenue = totalRevenue * 0.88; // Mock previous period
    const growth = calculateGrowth(totalRevenue, previousPeriodRevenue);

    const packageRevenue = completedPayments
      .filter((p) => p.payment_type === "package")
      .reduce((sum, p) => sum + p.amount, 0);

    const avgPerBooking = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    const uniqueStudents = new Set(completedPayments.map((p) => p.student_id)).size;
    const avgPerStudent = uniqueStudents > 0 ? totalRevenue / uniqueStudents : 0;

    return {
      totalRevenue,
      growth,
      totalBookings: completedBookings.length,
      avgPerBooking,
      avgPerStudent,
      packageRevenue,
      packagesSold: completedPayments.filter((p) => p.payment_type === "package").length,
      activeStudents: uniqueStudents,
    };
  }, [payments, bookings]);

  // Revenue by source
  const revenueBySource = useMemo(() => {
    const bySource = {};

    payments.filter((p) => p.status === "completed").forEach((p) => {
      const type = p.payment_type || "other";
      bySource[type] = (bySource[type] || 0) + p.amount;
    });

    const total = Object.values(bySource).reduce((sum, val) => sum + val, 0);

    return Object.entries(REVENUE_SOURCES_CONFIG)
      .map(([key, config]) => ({
        name: config.label,
        value: bySource[key] || 0,
        percentage: total > 0 ? ((bySource[key] || 0) / total) * 100 : 0,
        trend: Math.random() * 20 - 5, // Mock trend
        color: config.color,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [payments]);

  // Revenue by instructor
  const revenueByInstructor = useMemo(() => {
    const byInstructor = {};

    bookings.filter((b) => b.status === "completed").forEach((b) => {
      if (!byInstructor[b.instructor_id]) {
        byInstructor[b.instructor_id] = { revenue: 0, lessons: 0, studentIds: new Set() };
      }
      byInstructor[b.instructor_id].revenue += b.price || 0;
      byInstructor[b.instructor_id].lessons += 1;
      if (b.student_id) byInstructor[b.instructor_id].studentIds.add(b.student_id);
    });

    return instructors
      .filter((i) => i.status !== "inactive")
      .map((instructor) => {
        const data = byInstructor[instructor.id] || { revenue: 0, lessons: 0, studentIds: new Set() };
        return {
          id: instructor.id,
          name: instructor.full_name,
          revenue: data.revenue,
          lessons: data.lessons,
          avgPerLesson: data.lessons > 0 ? data.revenue / data.lessons : 0,
          passRate: instructor.rating ? instructor.rating * 20 : 85,
          studentCount: data.studentIds.size,
          rating: instructor.rating || 4,
          trend: Math.random() * 20 - 5,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [bookings, instructors]);

  // Revenue by vehicle
  const revenueByVehicle = useMemo(() => {
    const byVehicle = {};

    bookings.filter((b) => b.status === "completed").forEach((b) => {
      if (!byVehicle[b.vehicle_id]) {
        byVehicle[b.vehicle_id] = { revenue: 0, lessons: 0 };
      }
      byVehicle[b.vehicle_id].revenue += b.price || 0;
      byVehicle[b.vehicle_id].lessons += 1;
    });

    return vehicles
      .filter((v) => v.status !== "retired")
      .map((vehicle) => {
        const data = byVehicle[vehicle.id] || { revenue: 0, lessons: 0 };
        return {
          id: vehicle.id,
          name: `${vehicle.make} ${vehicle.model}`,
          revenue: data.revenue,
          lessons: data.lessons,
          utilization: Math.min(100, data.lessons * 2),
          transmission: vehicle.transmission || "manual",
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [bookings, vehicles]);

  // Revenue by category
  const revenueByCategory = useMemo(() => {
    const byCategory = {};

    bookings.filter((b) => b.status === "completed").forEach((b) => {
      const category = b.license_category || "B";
      if (!byCategory[category]) {
        byCategory[category] = { revenue: 0, studentIds: new Set() };
      }
      byCategory[category].revenue += b.price || 0;
      if (b.student_id) byCategory[category].studentIds.add(b.student_id);
    });

    const total = Object.values(byCategory).reduce((sum, d) => sum + d.revenue, 0);

    return Object.entries(byCategory)
      .map(([category, data]) => ({
        name: `Category ${category}`,
        value: data.revenue,
        percentage: total > 0 ? (data.revenue / total) * 100 : 0,
        studentCount: data.studentIds.size,
      }))
      .sort((a, b) => b.value - a.value);
  }, [bookings]);

  // Revenue by period (trend data)
  const revenueByPeriod = useMemo(() => {
    const periods = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return periods.slice(0, 6).map((month, i) => ({
      period: month,
      revenue: 15000 + Math.random() * 10000,
      bookings: 50 + Math.floor(Math.random() * 30),
      avgTicket: 45 + Math.random() * 15,
    }));
  }, []);

  // Team average for instructor comparison
  const teamAverage = useMemo(() => {
    if (revenueByInstructor.length === 0) return 0;
    return revenueByInstructor.reduce((sum, i) => sum + i.revenue, 0) / revenueByInstructor.length;
  }, [revenueByInstructor]);

  // Generate insights
  const insights = useMemo(() => {
    const result = [];

    if (metrics.growth > 10) {
      result.push({
        type: "success",
        title: "Strong Revenue Growth",
        description: `Revenue grew ${metrics.growth.toFixed(1)}% compared to the previous period.`,
        value: `+${metrics.growth.toFixed(1)}%`,
      });
    } else if (metrics.growth < -5) {
      result.push({
        type: "warning",
        title: "Revenue Declining",
        description: `Revenue decreased ${Math.abs(metrics.growth).toFixed(1)}% compared to the previous period.`,
        action: "Review pricing and marketing strategies",
      });
    }

    if (revenueByInstructor.length > 0) {
      const top = revenueByInstructor[0];
      if (top.revenue > teamAverage * 1.3) {
        result.push({
          type: "success",
          title: `Top Performer: ${top.name}`,
          description: `Outperforming team average by ${((top.revenue / teamAverage - 1) * 100).toFixed(0)}%`,
          value: formatCurrency(top.revenue),
        });
      }
    }

    const packageSource = revenueBySource.find((s) => s.name === "Packages");
    if (packageSource && packageSource.percentage < 30) {
      result.push({
        type: "opportunity",
        title: "Package Sales Opportunity",
        description: `Packages represent only ${packageSource.percentage.toFixed(1)}% of revenue. Consider promoting package deals.`,
        action: "Create promotional offers",
      });
    }

    if (revenueByCategory.length > 0 && revenueByCategory[0].percentage > 80) {
      result.push({
        type: "info",
        title: "Revenue Concentration",
        description: `${revenueByCategory[0].percentage.toFixed(0)}% of revenue comes from ${revenueByCategory[0].name}.`,
        action: "Consider expanding to other categories",
      });
    }

    return result;
  }, [metrics, revenueBySource, revenueByInstructor, revenueByCategory, teamAverage]);

  // Export handlers
  const handleExport = useCallback((exportType) => {
    toast.info(`Exporting as ${exportType.toUpperCase()}...`);

    const data = revenueByInstructor.map((i) => ({
      Instructor: i.name,
      Revenue: i.revenue,
      Lessons: i.lessons,
      "Avg/Lesson": i.avgPerLesson,
      "Pass Rate": `${i.passRate}%`,
    }));

    if (exportType === "csv") {
        const csvContent = [
          Object.keys(data[0] || {}).join(","),
          ...data.map((row) => Object.values(row).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `revenue_report_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV export complete!");
    } else if (exportType === 'pdf') {
        toast.info("PDF export is not yet available.");
    } else if (exportType === 'excel') {
        toast.info("Excel export is not yet available.");
    }
  }, [revenueByInstructor]);

  // Determine current chart data based on breakdown selection
  const currentChartData = useMemo(() => {
    switch (breakdown) {
      case "instructor":
        return revenueByInstructor.slice(0, 10);
      case "vehicle":
        return revenueByVehicle.slice(0, 10);
      default:
        return revenueBySource;
    }
  }, [breakdown, revenueByInstructor, revenueByVehicle, revenueBySource]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(createPageUrl("Finance"))}
              className="p-2 hover:bg-zinc-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Revenue Analytics</h1>
              <p className="text-zinc-600">
                Deep dive into your revenue streams and performance metrics
              </p>
            </div>
          </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] cursor-pointer"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={breakdown}
            onChange={(e) => setBreakdown(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] cursor-pointer"
          >
            {BREAKDOWN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <div className="h-6 w-px bg-zinc-200 mx-1" />

          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#eefbe7] text-[#5cb83a] hover:bg-[#d4f4c3] transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#fdeeed] text-[#e44138] hover:bg-[#f9d4d2] transition"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#e8f4fa] text-[#3b82c4] hover:bg-[#d4eaf5] transition"
          >
            <FileDown className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          trend={metrics.growth}
          trendLabel="vs last period"
          icon={<DollarSign className="w-6 h-6 text-[#5cb83a]" />}
          iconBgClass="from-[#eefbe7] to-[#d4f4c3]"
          loading={isLoading}
        />

        <MetricCard
          title="Avg per Lesson"
          value={metrics.avgPerBooking}
          subtitle={`${metrics.totalBookings} completed lessons`}
          icon={<Target className="w-6 h-6 text-[#3b82c4]" />}
          iconBgClass="from-[#e8f4fa] to-[#d4eaf5]"
          loading={isLoading}
        />

        <MetricCard
          title="Top Instructor"
          value={revenueByInstructor[0]?.name || "N/A"}
          subtitle={revenueByInstructor[0] ? `${formatCurrency(revenueByInstructor[0].revenue)} • ${revenueByInstructor[0].lessons} lessons` : ""}
          icon={<Users className="w-6 h-6 text-[#6c376f]" />}
          iconBgClass="from-[#f3e8f4] to-[#e5d0e6]"
          loading={isLoading}
        />

        <MetricCard
          title="Packages Sold"
          value={metrics.packagesSold.toString()}
          subtitle={`${formatCurrency(metrics.packageRevenue)} total value`}
          icon={<Package className="w-6 h-6 text-[#e7d356]" />}
          iconBgClass="from-[#fdfbe8] to-[#f9f3c8]"
          loading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Active Students</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.activeStudents}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Avg per Student</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.avgPerStudent)}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Active Vehicles</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{vehicles.filter((v) => v.status !== "retired").length}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Active Instructors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{instructors.filter((i) => i.status !== "inactive").length}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - 2 columns */}
        <div className="lg:col-span-2">
          {breakdown === "source" && (
            <RevenueBreakdownChart
              data={revenueBySource}
              title="Revenue by Source"
              subtitle="Breakdown of all revenue streams"
            />
          )}

          {breakdown === "instructor" && (
            <RevenueBarChart
              data={revenueByInstructor}
              title="Revenue by Instructor"
              subtitle="Top performing instructors by revenue"
            />
          )}

          {breakdown === "vehicle" && (
            <RevenueBarChart
              data={revenueByVehicle}
              title="Revenue by Vehicle"
              subtitle="Fleet performance breakdown"
            />
          )}

          {breakdown === "category" && (
            <RevenueBreakdownChart
              data={revenueByCategory.map((c, i) => ({
                ...c,
                color: CHART_COLORS[i % CHART_COLORS.length],
                trend: 0,
              }))}
              title="Revenue by License Category"
              subtitle="Distribution across license types"
            />
          )}

          {breakdown === "trend" && (
            <RevenueTrendChart
              data={revenueByPeriod}
              title="Revenue Trend"
              subtitle="Monthly revenue and booking trends"
            />
          )}
        </div>

        {/* Insights Panel - 1 column */}
        <div>
          <InsightsPanel insights={insights} />
        </div>
      </div>

      {/* Revenue Trend Chart (always visible) */}
      {breakdown !== "trend" && (
        <RevenueTrendChart
          data={revenueByPeriod}
          title="Revenue Over Time"
          subtitle="Track your revenue growth and booking patterns"
        />
      )}

      {/* Instructor Performance Table */}
      {breakdown === "instructor" && revenueByInstructor.length > 0 && (
        <InstructorPerformanceTable data={revenueByInstructor} teamAverage={teamAverage} />
      )}

      {/* Category Breakdown (when not main view) */}
      {breakdown !== "category" && revenueByCategory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueBreakdownChart
            data={revenueByCategory.map((c, i) => ({
              ...c,
              color: CHART_COLORS[i % CHART_COLORS.length],
              trend: 0,
            }))}
            title="Revenue by License Category"
            subtitle="See which license types generate the most revenue"
          />

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e8f4fa] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#3b82c4]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Highest Revenue Day</p>
                    <p className="font-semibold text-gray-900">Monday</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#3b82c4]">{formatCurrency(2450)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#eefbe7] rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#5cb83a]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Best Selling Package</p>
                    <p className="font-semibold text-gray-900">Complete B License</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#5cb83a]">{packages.length} sold</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f3e8f4] rounded-lg flex items-center justify-center">
                    <Percent className="w-5 h-5 text-[#6c376f]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Success Rate</p>
                    <p className="font-semibold text-gray-900">98.5%</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#6c376f]">Excellent</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#fdfbe8] rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#e7d356]" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preferred Payment</p>
                    <p className="font-semibold text-gray-900">Card (65%)</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#e7d356]">Digital first</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}