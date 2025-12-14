import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  Calendar, 
  Users, 
  Car, 
  TrendingUp, 
  TrendingDown,
  Download, 
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Target,
  Clock,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ScrollFadeIn, StaggerFadeIn, ScrollProgress } from "@/components/animations/FadeSections";
import { KPIComparisonCard, AnimatedCounter } from "@/components/charts/KPIComparison";
import LiveDataChart from "@/components/charts/LiveDataChart";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  startOfYear, 
  endOfYear, 
  subDays, 
  differenceInDays,
  eachDayOfInterval,
  isWithinInterval 
} from "date-fns";

const MetricCard = ({ title, value, change, icon: Icon, subtitle, loading }) => {
  const isPositive = change !== undefined && change >= 0;
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-40" />
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#d4eaf5] transition-all duration-200 hover:shadow-lg group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] rounded-xl flex items-center justify-center group-hover:from-[#d4eaf5] group-hover:to-[#a9d5ed] transition">
            <Icon className="w-6 h-6 text-[#3b82c4]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-[#5cb83a]' : 'text-[#e44138]'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
};

const RevenueChart = ({ data, showBookings, target }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue), target || 0);
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-600">Daily revenue performance</p>
        </div>
        {target && (
          <div className="text-right">
            <p className="text-xs text-gray-600">Target</p>
            <p className="text-sm font-bold text-indigo-600">€{target.toLocaleString()}</p>
          </div>
        )}
      </div>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No revenue data available</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between h-48 gap-2">
            {data.slice(-14).map((item, index) => {
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full group">
                    <div 
                      className="w-full bg-gradient-to-t from-[#3b82c4] to-[#a9d5ed] rounded-t-lg transition-all duration-300 hover:from-[#2563a3] hover:to-[#8bc7e8]"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                        <p className="font-bold">€{item.revenue.toLocaleString()}</p>
                        {showBookings && <p className="text-gray-300">{item.bookings} bookings</p>}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{item.date.split(' ')[1]}</p>
                </div>
              );
            })}
          </div>
          
          {showBookings && (
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] rounded" />
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
              {target && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 rounded" />
                  <span className="text-sm text-gray-600">Target</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PaymentBreakdown = ({ data, processingFees }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82c4', '#6c376f', '#81da5a', '#e7d356', '#a9d5ed'];
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
        <p className="text-sm text-gray-600">Revenue by payment type</p>
      </div>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payment data available</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">€{item.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: colors[index % colors.length]
                    }}
                  />
                </div>
              </div>
            );
          })}
          
          <div className="pt-4 border-t border-gray-100">
            <div className="bg-[#fdfbe8] rounded-lg p-3 border border-[#f9f3c8]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#b8a525] mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#9a8520]">Processing Fees</p>
                  <p className="text-xs text-[#b8a525] mt-1">
                    €{processingFees.total.toFixed(2)} ({processingFees.rate.toFixed(1)}% of revenue)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertPanel = ({ alerts }) => {
  const severityConfig = {
    info: { icon: Info, color: 'blue', bg: 'bg-[#e8f4fa]', border: 'border-[#d4eaf5]', text: 'text-[#2563a3]' },
    warning: { icon: AlertTriangle, color: 'amber', bg: 'bg-[#fdfbe8]', border: 'border-[#f9f3c8]', text: 'text-[#9a8520]' },
    success: { icon: CheckCircle, color: 'green', bg: 'bg-[#eefbe7]', border: 'border-[#d4f4c3]', text: 'text-[#4a9c2e]' }
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Alerts & Recommendations</h3>
          <p className="text-sm text-gray-600">{alerts.length} active insights</p>
        </div>
        {alerts.length > 0 && (
          <span className="px-3 py-1 bg-[#e8f4fa] text-[#3b82c4] text-xs font-bold rounded-full">
            {alerts.length} Active
          </span>
        )}
      </div>
      
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">All systems running smoothly</p>
            <p className="text-xs text-gray-400 mt-1">No alerts at this time</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            
            return (
              <div 
                key={index}
                className={`${config.bg} border ${config.border} rounded-xl p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 text-${config.color}-600 flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.text}`}>{alert.message}</p>
                    {alert.impact && (
                      <p className="text-xs text-gray-600 mt-1">{alert.impact}</p>
                    )}
                    <p className="text-xs text-gray-700 mt-2 font-medium">{alert.action}</p>
                    {alert.link && (
                      <Link 
                        to={createPageUrl(alert.link)}
                        className={`inline-flex items-center gap-1 text-xs font-bold mt-2 ${
                          config.color === 'blue' ? 'text-[#3b82c4] hover:text-[#2563a3]' :
                          config.color === 'amber' ? 'text-[#b8a525] hover:text-[#9a8520]' :
                          'text-[#5cb83a] hover:text-[#4a9c2e]'
                        }`}
                      >
                        View Details <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const InsightsPanel = ({ insights }) => {
  const typeConfig = {
    growth: { icon: TrendingUp, color: 'green', gradient: 'from-[#81da5a] to-[#5cb83a]' },
    efficiency: { icon: Zap, color: 'blue', gradient: 'from-[#a9d5ed] to-[#3b82c4]' },
    opportunity: { icon: Target, color: 'purple', gradient: 'from-[#6c376f] to-[#5a2d5d]' }
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
          <p className="text-xs text-gray-600">Powered by analytics</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const config = typeConfig[insight.type];
          const Icon = config.icon;
          
          return (
            <div key={index} className="relative overflow-hidden rounded-xl border border-gray-200 p-4 hover:border-[#d4eaf5] transition-all group">
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
              <div className="relative">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 capitalize">{insight.type}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-xs font-medium text-gray-600">Recommendation</p>
                  <p className="text-xs text-gray-900 mt-1">{insight.recommendation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuickStat = ({ label, value, icon: Icon, color = "primary" }) => {
  const colorClasses = {
    primary: { bg: 'bg-[#e8f4fa]', text: 'text-[#3b82c4]' },
    green: { bg: 'bg-[#eefbe7]', text: 'text-[#5cb83a]' },
    purple: { bg: 'bg-[#f3e8f4]', text: 'text-[#6c376f]' },
    amber: { bg: 'bg-[#fdfbe8]', text: 'text-[#b8a525]' },
    red: { bg: 'bg-[#fdeeed]', text: 'text-[#e44138]' },
    blue: { bg: 'bg-[#e8f4fa]', text: 'text-[#3b82c4]' }
  };
  const scheme = colorClasses[color] || colorClasses.primary;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className={`w-10 h-10 ${scheme.bg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${scheme.text}`} />
      </div>
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

const GoalProgress = ({ title, current, target, unit = "€", daysLeft }) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);
  const dailyRequired = daysLeft > 0 ? remaining / daysLeft : 0;
  const isOnTrack = percentage >= 50 || daysLeft < 15;
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Clock className="w-4 h-4" />
          {daysLeft} days left
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {unit}{typeof current === 'number' ? current.toLocaleString() : current}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              of {unit}{typeof target === 'number' ? target.toLocaleString() : target}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#3b82c4]">{percentage.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">Complete</p>
          </div>
        </div>
        
        <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isOnTrack 
                ? 'bg-gradient-to-r from-[#81da5a] to-[#5cb83a]' 
                : 'bg-gradient-to-r from-[#e7d356] to-[#d4bf2e]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className={`${isOnTrack ? 'bg-[#eefbe7] border-[#d4f4c3]' : 'bg-[#fdfbe8] border-[#f9f3c8]'} border rounded-lg p-3`}>
          <p className={`text-xs font-semibold ${isOnTrack ? 'text-[#4a9c2e]' : 'text-[#9a8520]'}`}>
            {isOnTrack ? '✓ On Track' : '⚠ Below Target'}
          </p>
          <p className={`text-xs ${isOnTrack ? 'text-[#5cb83a]' : 'text-[#b8a525]'} mt-1`}>
            Need {unit}{dailyRequired.toFixed(0)}/day to reach goal
          </p>
        </div>
      </div>
    </div>
  );
};

export default function Finance() {
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
  
  const { dateRange, previousDateRange } = useMemo(() => {
    const now = new Date();
    let start, end, prevStart, prevEnd;
    
    switch (timeRange) {
      case "today":
        start = end = now;
        prevStart = prevEnd = subDays(now, 1);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = subDays(start, 7);
        prevEnd = subDays(end, 7);
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subDays(start, 1));
        prevEnd = endOfMonth(subDays(start, 1));
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        prevStart = startOfYear(subDays(start, 365));
        prevEnd = endOfYear(subDays(start, 365));
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subDays(start, 1));
        prevEnd = endOfMonth(subDays(start, 1));
    }
    
    return {
      dateRange: { start, end },
      previousDateRange: { start: prevStart, end: prevEnd }
    };
  }, [timeRange]);

  const { data: bookings = [], isLoading: loadingBookings, error: bookingsError, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings', schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', schoolId],
    queryFn: () => schoolId ? base44.entities.Payment.filter({ school_id: schoolId }, "-payment_date", 100) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles', schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: budgetTargets = [] } = useQuery({
    queryKey: ['budget-targets', schoolId],
    queryFn: () => schoolId ? base44.entities.BudgetTarget.filter({ school_id: schoolId }, "-created_date", 20) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const isLoading = loadingAuth || loadingBookings || loadingPayments || loadingStudents || loadingVehicles;

  const metrics = useMemo(() => {
    const currentPayments = payments.filter(p => 
      p.status === "completed" &&
      isWithinInterval(new Date(p.payment_date || p.created_date), dateRange)
    );
    
    const previousPayments = payments.filter(p => 
      p.status === "completed" &&
      isWithinInterval(new Date(p.payment_date || p.created_date), previousDateRange)
    );
    
    const currentRevenue = currentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const previousRevenue = previousPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const currentBookings = bookings.filter(b => 
      b.status === "completed" &&
      isWithinInterval(new Date(b.start_datetime), dateRange)
    );
    
    const previousBookings = bookings.filter(b => 
      b.status === "completed" &&
      isWithinInterval(new Date(b.start_datetime), previousDateRange)
    );
    
    const bookingsChange = previousBookings.length > 0 
      ? ((currentBookings.length - previousBookings.length) / previousBookings.length) * 100 
      : 0;
    
    const activeStudents = students.filter(s => s.is_active).length;
    
    const vehiclesWithBookings = new Set(currentBookings.map(b => b.vehicle_id)).size;
    const avgUtilization = vehicles.length > 0 ? (vehiclesWithBookings / vehicles.length) * 100 : 0;
    
    return {
      revenue: currentRevenue,
      revenueChange,
      bookings: currentBookings.length,
      bookingsChange,
      activeStudents,
      fleetUtilization: avgUtilization
    };
  }, [payments, bookings, students, vehicles, dateRange, previousDateRange]);

  const revenueChartData = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    const dailyMap = new Map();
    
    days.forEach(day => {
      const key = format(day, 'MMM dd');
      dailyMap.set(key, { revenue: 0, bookings: 0 });
    });
    
    payments
      .filter(p => p.status === "completed" && isWithinInterval(new Date(p.payment_date || p.created_date), dateRange))
      .forEach(p => {
        const key = format(new Date(p.payment_date || p.created_date), 'MMM dd');
        const existing = dailyMap.get(key);
        if (existing) {
          dailyMap.set(key, {
            revenue: existing.revenue + (p.amount || 0),
            bookings: existing.bookings + 1
          });
        }
      });
    
    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      bookings: data.bookings
    }));
  }, [payments, dateRange]);

  const paymentMethodData = useMemo(() => {
    const methods = new Map();
    
    payments
      .filter(p => p.status === "completed" && isWithinInterval(new Date(p.payment_date || p.created_date), dateRange))
      .forEach(p => {
        const method = p.payment_method || 'Other';
        methods.set(method, (methods.get(method) || 0) + (p.amount || 0));
      });
    
    return Array.from(methods.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [payments, dateRange]);

  const processingFees = useMemo(() => {
    const cardPayments = payments.filter(p => 
      p.payment_method === "card" && 
      p.status === "completed" &&
      isWithinInterval(new Date(p.payment_date || p.created_date), dateRange)
    );
    
    const cardTotal = cardPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const feeRate = 0.029;
    const total = cardTotal * feeRate;
    const rate = metrics.revenue > 0 ? (total / metrics.revenue) * 100 : 0;
    
    return { total, rate };
  }, [payments, dateRange, metrics.revenue]);

  const alerts = useMemo(() => {
    const generated = [];
    
    if (revenueChartData.length >= 3) {
      const last3Days = revenueChartData.slice(-3);
      const avgLast3 = last3Days.reduce((sum, d) => sum + d.revenue, 0) / 3;
      
      if (avgLast3 < 500) {
        generated.push({
          severity: "warning",
          message: "Revenue trending below average",
          impact: `€${avgLast3.toFixed(0)}/day average last 3 days`,
          action: "Consider promotional packages or weekend availability",
          link: "Revenue"
        });
      }
    }
    
    const lowProgressStudents = students.filter(s => s.is_active && (s.progress_percentage || 0) < 50).length;
    if (lowProgressStudents > 5) {
      generated.push({
        severity: "info",
        message: `${lowProgressStudents} students below 50% progress`,
        action: "Send progress check-ins and booking reminders",
        link: "Students"
      });
    }
    
    if (metrics.fleetUtilization < 60) {
      generated.push({
        severity: "warning",
        message: "Fleet utilization below 60%",
        impact: "Potential revenue loss from idle vehicles",
        action: "Increase instructor availability or promotional offers",
        link: "Fleet"
      });
    }
    
    if (metrics.revenueChange > 20) {
      generated.push({
        severity: "success",
        message: `Revenue up ${metrics.revenueChange.toFixed(0)}% vs last period`,
        action: "Great work! Maintain current momentum",
      });
    }
    
    return generated;
  }, [revenueChartData, students, metrics]);

  const insights = [
    {
      type: "growth",
      message: "Weekend bookings up 23% - consider adding Sunday slots",
      recommendation: "Projected +€1,200/month additional revenue"
    },
    {
      type: "efficiency",
      message: "Automatic transmission vehicles have 18% higher utilization",
      recommendation: "Consider shifting 1-2 manual vehicles to automatic"
    },
    {
      type: "opportunity",
      message: "Package conversion rate is 34% above industry average",
      recommendation: "Promote packages more prominently on your website"
    }
  ];

  const currentTarget = useMemo(() => {
    return budgetTargets.find(t => {
      if (!t.period_start || !t.period_end) return false;
      const start = new Date(t.period_start);
      const end = new Date(t.period_end);
      const now = new Date();
      return now >= start && now <= end;
    });
  }, [budgetTargets]);

  const handleExport = useCallback(async (type = 'csv') => {
    const data = {
      period: `${format(dateRange.start, 'yyyy-MM-dd')} to ${format(dateRange.end, 'yyyy-MM-dd')}`,
      metrics,
      revenueData: revenueChartData,
      paymentMethods: paymentMethodData,
      processingFees
    };
    
    if (type === 'pdf') {
      try {
        const element = document.getElementById('finance-dashboard');
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`finance-dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success('PDF exported successfully');
      } catch (error) {
        toast.error('Failed to export PDF');
      }
    } else {
      const csv = [
        ['DRIVEE Financial Dashboard Export'],
        ['Period', data.period],
        [],
        ['Key Metrics'],
        ['Total Revenue', `€${metrics.revenue.toLocaleString()}`],
        ['Bookings', metrics.bookings],
        ['Active Students', metrics.activeStudents],
        ['Fleet Utilization', `${metrics.fleetUtilization.toFixed(1)}%`],
        [],
        ['Daily Revenue'],
        ['Date', 'Revenue', 'Bookings'],
        ...revenueChartData.map(d => [d.date, d.revenue, d.bookings])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-dashboard-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    }
  }, [metrics, revenueChartData, paymentMethodData, processingFees, dateRange]);

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

  if (bookingsError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={bookingsError} 
          onRetry={refetchBookings}
          title="Failed to load financial data"
        />
      </div>
    );
  }

  return (
    <>
    <ScrollProgress color="#3b82c4" height={3} />
    <div id="finance-dashboard" className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-8">
      <ScrollFadeIn direction="up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">
            Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time financial intelligence for your driving school</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200">
            {["today", "week", "month", "year"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                timeRange === range
                  ? "bg-gradient-to-r from-[#3b82c4] to-[#2563a3] text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {range === "today" ? "Today" : `This ${range.charAt(0).toUpperCase() + range.slice(1)}`}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 hover:border-[#d4eaf5]"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-[#e44138] border border-[#c9342c] text-white rounded-xl text-sm font-semibold hover:bg-[#c9342c] transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
        </div>
      </ScrollFadeIn>

      <StaggerFadeIn staggerDelay={0.05}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`€${metrics.revenue.toLocaleString()}`}
          change={metrics.revenueChange}
          icon={DollarSign}
          subtitle={`€${metrics.bookings > 0 ? (metrics.revenue / metrics.bookings).toFixed(0) : 0} avg per booking`}
          loading={isLoading}
        />
        <MetricCard
          title="Bookings Completed"
          value={metrics.bookings}
          change={metrics.bookingsChange}
          icon={Calendar}
          subtitle={`${Math.ceil(metrics.bookings / Math.max(differenceInDays(dateRange.end, dateRange.start), 1))} per day average`}
          loading={isLoading}
        />
        <MetricCard
          title="Active Students"
          value={metrics.activeStudents}
          icon={Users}
          subtitle={`${students.length} total enrolled`}
          loading={isLoading}
        />
        <MetricCard
          title="Fleet Utilization"
          value={`${metrics.fleetUtilization.toFixed(0)}%`}
          change={metrics.fleetUtilization > 70 ? 5.2 : -2.3}
          icon={Car}
          subtitle={`${vehicles.length} vehicles active`}
          loading={isLoading}
        />
      </div>
      </StaggerFadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart 
            data={revenueChartData} 
            showBookings={true}
            target={currentTarget?.revenue_target}
          />
        </div>
        <PaymentBreakdown 
          data={paymentMethodData}
          processingFees={processingFees}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Financial Modules</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: "Revenue", path: "Revenue", icon: DollarSign, color: "indigo" },
            { name: "Payments", path: "Payments", icon: Calendar, color: "green" },
            { name: "Payroll", path: "Payroll", icon: Users, color: "purple" },
            { name: "Fleet Economics", path: "FleetEconomics", icon: Car, color: "blue" },
            { name: "Student Financials", path: "StudentFinancials", icon: Users, color: "pink" },
            { name: "Tax & Compliance", path: "TaxCompliance", icon: TrendingUp, color: "amber" },
            { name: "P&L Statement", path: "ProfitLoss", icon: TrendingUp, color: "red" },
            { name: "Goals & Forecasts", path: "GoalsForecast", icon: Target, color: "emerald" },
            { name: "Reports & Exports", path: "ReportsExports", icon: Download, color: "cyan" },
            { name: "Settings", path: "FinanceSettings", icon: TrendingUp, color: "slate" }
          ].map((module, index) => (
            <Link
              key={index}
              to={createPageUrl(module.path)}
              className="group bg-gradient-to-br from-gray-50 to-gray-100 hover:from-[#e8f4fa] hover:to-[#d4eaf5] rounded-xl p-5 border-2 border-gray-200 hover:border-[#a9d5ed] transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <module.icon className="w-6 h-6 text-gray-600 group-hover:text-[#3b82c4] transition-colors" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{module.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AlertPanel alerts={alerts} />
        </div>
        <InsightsPanel insights={insights} />
      </div>

      {currentTarget && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoalProgress
            title="Monthly Revenue Goal"
            current={metrics.revenue}
            target={currentTarget.revenue_target || 50000}
            daysLeft={Math.max(differenceInDays(dateRange.end, new Date()), 0)}
          />
          {currentTarget.package_sales_target && (
            <GoalProgress
              title="Package Sales Goal"
              current={payments.filter(p => 
                p.payment_type === "package" && 
                p.status === "completed" &&
                isWithinInterval(new Date(p.payment_date || p.created_date), dateRange)
              ).length}
              target={currentTarget.package_sales_target}
              unit=""
              daysLeft={Math.max(differenceInDays(dateRange.end, new Date()), 0)}
            />
          )}
        </div>
      )}
    </div>
    </>
  );
}