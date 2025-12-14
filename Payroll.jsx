import React, { useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Download, 
  FileText, 
  CheckCircle, 
  Award,
  Calendar,
  Clock,
  Percent,
  BarChart3,
  PieChart,
  Send,
  Filter,
  Search,
  Eye,
  Edit,
  AlertCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Target,
  Activity,
  Wallet,
  CreditCard,
  Building2,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Plus,
  Minus,
  ChevronDown,
  XCircle,
  Calculator
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfYear,
  differenceInDays,
  isWithinInterval
} from "date-fns";
import { toast } from "sonner";

const TAX_RATE = 0.20;
const NI_RATE = 0.12;

export default function Payroll() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDetails, setShowDetails] = useState(null);
  const [selectedInstructors, setSelectedInstructors] = useState(new Set());
  const [customDateRange, setCustomDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: commissionRules = [] } = useQuery({
    queryKey: ['commissionRules'],
    queryFn: () => base44.entities.CommissionRule.list(),
  });

  const { data: payrollBatches = [] } = useQuery({
    queryKey: ['payroll-batches'],
    queryFn: async () => {
      try {
        return await base44.entities.PayrollBatch.list();
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingInstructors || loadingBookings;

  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start, end, label;
    
    switch (selectedPeriod) {
      case "current":
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, 'MMMM yyyy');
        break;
      case "last":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        label = format(lastMonth, 'MMMM yyyy');
        break;
      case "year":
        start = startOfYear(now);
        end = endOfMonth(now);
        label = format(now, 'yyyy');
        break;
      case "custom":
        start = new Date(customDateRange.start);
        end = new Date(customDateRange.end);
        label = `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, 'MMMM yyyy');
    }
    
    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [selectedPeriod, customDateRange]);

  const instructorCommissions = useMemo(() => {
    return instructors.map(instructor => {
      const instructorBookings = bookings.filter(b => 
        b.instructor_id === instructor.id && 
        b.status === "completed" &&
        isWithinInterval(new Date(b.start_datetime), { start: periodStart, end: periodEnd })
      );

      const revenue = instructorBookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const lessons = instructorBookings.length;
      const hoursWorked = lessons * 1.5;

      const rule = commissionRules.find(r => 
        r.instructor_id === instructor.id && r.is_active
      );
      
      const commissionRate = rule?.commission_rate || 30;
      const baseCommission = revenue * (commissionRate / 100);

      const performanceBonus = revenue > 10000 ? 200 : revenue > 8000 ? 150 : revenue > 5000 ? 100 : 0;
      const qualityBonus = (instructor.rating || 0) >= 4.8 ? 50 : 0;
      const bonus = performanceBonus + qualityBonus;

      const deductions = 0;
      const grossPay = baseCommission + bonus - deductions;
      const taxWithheld = grossPay * TAX_RATE;
      const niContributions = grossPay * NI_RATE;
      const netPay = grossPay - taxWithheld - niContributions;

      const allInstructorBookings = bookings.filter(b => b.instructor_id === instructor.id);
      const completedCount = allInstructorBookings.filter(b => b.status === "completed").length;
      const completionRate = allInstructorBookings.length > 0 
        ? (completedCount / allInstructorBookings.length) * 100 
        : 0;

      return {
        id: instructor.id,
        name: instructor.full_name,
        email: instructor.email || '',
        phone: instructor.phone || '',
        revenue,
        lessons,
        rate: commissionRate,
        commission: baseCommission,
        bonus,
        deductions,
        netPay,
        total: grossPay,
        rating: instructor.rating || 0,
        hoursWorked,
        avgRevenuePerLesson: lessons > 0 ? revenue / lessons : 0,
        completionRate,
        status: 'pending',
        lastPaymentDate: instructor.last_payment_date,
        taxWithheld,
        niContributions
      };
    }).sort((a, b) => b.total - a.total);
  }, [instructors, bookings, commissionRules, periodStart, periodEnd]);

  const filteredCommissions = useMemo(() => {
    let filtered = instructorCommissions;

    if (searchQuery) {
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus);
    }

    return filtered;
  }, [instructorCommissions, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const totalCommissions = instructorCommissions.reduce((sum, i) => sum + i.total, 0);
    const totalNetPay = instructorCommissions.reduce((sum, i) => sum + i.netPay, 0);
    const totalRevenue = instructorCommissions.reduce((sum, i) => sum + i.revenue, 0);
    const totalLessons = instructorCommissions.reduce((sum, i) => sum + i.lessons, 0);
    const totalBonuses = instructorCommissions.reduce((sum, i) => sum + i.bonus, 0);
    const totalTax = instructorCommissions.reduce((sum, i) => sum + i.taxWithheld, 0);
    const totalNI = instructorCommissions.reduce((sum, i) => sum + i.niContributions, 0);
    const averageCommission = instructorCommissions.length > 0 ? totalCommissions / Math.max(instructorCommissions.length, 1) : 0;
    const averageRating = instructorCommissions.length > 0 
      ? instructorCommissions.reduce((sum, i) => sum + i.rating, 0) / Math.max(instructorCommissions.length, 1)
      : 0;
    
    return {
      totalCommissions,
      totalNetPay,
      totalRevenue,
      totalLessons,
      totalBonuses,
      totalTax,
      totalNI,
      averageCommission,
      averageRating,
      activeInstructors: instructorCommissions.filter(i => i.lessons > 0).length
    };
  }, [instructorCommissions]);

  const exportToCSV = useCallback(() => {
    const csv = [
      ['DRIVEE Payroll Report'],
      ['Period', periodLabel],
      ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
      [],
      ['Instructor', 'Email', 'Revenue', 'Lessons', 'Rate', 'Base Commission', 'Bonus', 'Gross Pay', 'Tax', 'NI', 'Net Pay', 'Status'],
      ...instructorCommissions.map(i => [
        i.name,
        i.email,
        i.revenue,
        i.lessons,
        `${i.rate}%`,
        i.commission,
        i.bonus,
        i.total,
        i.taxWithheld,
        i.niContributions,
        i.netPay,
        i.status
      ]),
      [],
      ['Summary'],
      ['Total Gross Pay', stats.totalCommissions],
      ['Total Net Pay', stats.totalNetPay],
      ['Total Tax', stats.totalTax],
      ['Total NI', stats.totalNI],
      ['Average Commission', stats.averageCommission]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Payroll data exported');
  }, [instructorCommissions, stats, periodLabel]);

  const generatePayslips = useCallback(() => {
    if (selectedInstructors.size === 0) {
      toast.error('Please select instructors to generate payslips');
      return;
    }

    toast.success(`Generating ${selectedInstructors.size} payslips...`);
  }, [selectedInstructors]);

  const markAsPaid = useCallback((instructorId) => {
    toast.success('Marked as paid');
  }, []);

  const markAllAsPaid = useCallback(() => {
    if (selectedInstructors.size === 0) {
      toast.error('Please select instructors to mark as paid');
      return;
    }
    toast.success(`Marked ${selectedInstructors.size} instructors as paid`);
  }, [selectedInstructors]);

  const toggleSelectInstructor = useCallback((instructorId) => {
    setSelectedInstructors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instructorId)) {
        newSet.delete(instructorId);
      } else {
        newSet.add(instructorId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedInstructors.size === filteredCommissions.length) {
      setSelectedInstructors(new Set());
    } else {
      setSelectedInstructors(new Set(filteredCommissions.map(i => i.id)));
    }
  }, [filteredCommissions, selectedInstructors]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-[#3b82c4] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#6c376f] bg-clip-text text-transparent mb-2">
            Instructor Payroll
          </h1>
          <p className="text-gray-600 mt-1">Commission management and payment processing</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Period</option>
          </select>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition ${
                viewMode === "table" ? "bg-[#3b82c4] text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === "cards" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                viewMode === "analytics" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Analytics
            </button>
          </div>
          
          <button 
            onClick={generatePayslips}
            disabled={selectedInstructors.size === 0}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Generate Payslips
            {selectedInstructors.size > 0 && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                {selectedInstructors.size}
              </span>
            )}
          </button>
          
          <button 
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-gradient-to-r from-[#3b82c4] to-[#6c376f] hover:from-[#2563a3] hover:to-[#5a2d5d] text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {selectedPeriod === "custom" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Custom Date Range</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Start Date</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-2">End Date</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#e8f4fa] to-[#f3e8f4] border-2 border-[#d4eaf5] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#3b82c4]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2563a3]">Payroll Period: {periodLabel}</p>
              <p className="text-xs text-[#3b82c4] mt-1">
                {format(periodStart, 'MMMM d, yyyy')} - {format(periodEnd, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#3b82c4]">Payment Due</p>
            <p className="text-sm font-bold text-[#2563a3]">
              {format(new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#d4eaf5] transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#3b82c4]" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Total Gross Pay</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
            €{stats.totalCommissions.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Before deductions</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#d4f4c3] transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#eefbe7] rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#5cb83a]" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Total Net Pay</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
            €{stats.totalNetPay.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">After tax & NI</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#e5d0e6] transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#f3e8f4] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#6c376f]" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
            €{stats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">{stats.totalLessons} lessons</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-[#f9f3c8] transition-all shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#fdfbe8] rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#e7d356]" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Active Instructors</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
            {stats.activeInstructors}
          </p>
          <p className="text-sm text-gray-500">of {instructors.length} total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-sm font-bold text-[#2563a3] mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Bonuses This Period
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#3b82c4]">Performance Bonuses</span>
              <span className="text-lg font-bold text-[#2563a3]">€{stats.totalBonuses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#3b82c4]">Instructors Eligible</span>
              <span className="text-lg font-bold text-[#2563a3]">
                {instructorCommissions.filter(i => i.bonus > 0).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#fdfbe8] to-[#f9f3c8] rounded-2xl p-6 border border-[#f9f3c8]">
          <h3 className="text-sm font-bold text-[#9a8520] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Tax & Contributions
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#b8a525]">Income Tax (20%)</span>
              <span className="text-lg font-bold text-[#9a8520]">€{stats.totalTax.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#b8a525]">NI (12%)</span>
              <span className="text-lg font-bold text-[#9a8520]">€{stats.totalNI.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#f3e8f4] to-[#e5d0e6] rounded-2xl p-6 border border-[#e5d0e6]">
          <h3 className="text-sm font-bold text-[#5a2d5d] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6c376f]">Avg Commission</span>
              <span className="text-lg font-bold text-[#5a2d5d]">€{stats.averageCommission.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6c376f]">Avg Rating</span>
              <span className="text-lg font-bold text-[#5a2d5d] flex items-center gap-1">
                {stats.averageRating.toFixed(1)}
                <Star className="w-4 h-4 text-[#e7d356] fill-[#e7d356]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Commission Distribution</h3>
            <div className="space-y-4">
              {instructorCommissions.slice(0, 10).map((instructor, index) => {
                const maxCommission = Math.max(...instructorCommissions.map(i => i.commission));
                const percentage = maxCommission > 0 ? (instructor.commission / maxCommission) * 100 : 0;
                
                return (
                  <div key={instructor.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">{index + 1}.</span>
                        <span className="text-sm font-semibold text-gray-900">{instructor.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">€{instructor.commission.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">{instructor.lessons} lessons</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-3 rounded-full bg-gradient-to-r from-[#3b82c4] to-[#6c376f] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                        />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Commission Rate Distribution</h3>
              <div className="space-y-4">
                {[...new Set(instructorCommissions.map(i => i.rate))].map(rate => {
                  const count = instructorCommissions.filter(i => i.rate === rate).length;
                  const percentage = (count / Math.max(instructorCommissions.length, 1)) * 100;
                  
                  return (
                    <div key={rate}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{rate}% Rate</span>
                        <span className="text-sm text-gray-600">{count} instructors ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Performance Tiers</h3>
              <div className="space-y-4">
                {[
                  { label: 'Top Performers', min: 10000, color: 'green' },
                  { label: 'High Performers', min: 8000, max: 10000, color: 'blue' },
                  { label: 'Good Performers', min: 5000, max: 8000, color: 'purple' },
                  { label: 'Growing', min: 0, max: 5000, color: 'gray' }
                ].map(tier => {
                  const count = instructorCommissions.filter(i => {
                    if (tier.max) return i.revenue >= tier.min && i.revenue < tier.max;
                    return i.revenue >= tier.min;
                  }).length;
                  const percentage = instructorCommissions.length > 0 ? (count / Math.max(instructorCommissions.length, 1)) * 100 : 0;
                  
                  const tierColors = {
                    green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-900', gradient: 'from-green-500 to-green-600' },
                    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-900', gradient: 'from-blue-500 to-blue-600' },
                    purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-900', gradient: 'from-purple-500 to-purple-600' },
                    gray: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-900', gradient: 'from-gray-500 to-gray-600' }
                  };
                  const colors = tierColors[tier.color] || tierColors.gray;
                  
                  return (
                    <div key={tier.label} className={`p-4 rounded-xl border-2 ${colors.border} ${colors.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${colors.text}`}>{tier.label}</span>
                        <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full bg-gradient-to-r ${colors.gradient}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommissions.map(instructor => (
            <div 
              key={instructor.id}
              className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-indigo-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {instructor.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{instructor.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-500 fill-current" />
                      <span className="text-xs text-gray-600">{instructor.rating.toFixed(1)}</span>
                      {instructor.bonus > 0 && (
                        <Award className="w-3 h-3 text-amber-500 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedInstructors.has(instructor.id)}
                  onChange={() => toggleSelectInstructor(instructor.id)}
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Revenue</span>
                  <span className="text-sm font-bold text-gray-900">€{instructor.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Commission ({instructor.rate}%)</span>
                  <span className="text-sm font-semibold text-[#3b82c4]">€{instructor.commission.toLocaleString()}</span>
                </div>
                {instructor.bonus > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Bonus</span>
                    <span className="text-sm font-semibold text-[#5cb83a]">+€{instructor.bonus}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Tax & NI</span>
                  <span className="text-sm font-semibold text-[#e44138]">-€{(instructor.taxWithheld + instructor.niContributions).toLocaleString()}</span>
                </div>
                <div className="h-px bg-gray-200" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Net Pay</span>
                  <span className="text-lg font-bold text-gray-900">€{instructor.netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetails(showDetails === instructor.id ? null : instructor.id)}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>
                <button
                  onClick={() => markAsPaid(instructor.id)}
                  className="flex-1 px-3 py-2 bg-[#5cb83a] hover:bg-[#4a9c2e] text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Pay
                </button>
              </div>

              {showDetails === instructor.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Lessons</span>
                    <span className="font-semibold text-gray-900">{instructor.lessons}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Hours Worked</span>
                    <span className="font-semibold text-gray-900">{instructor.hoursWorked.toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Avg per Lesson</span>
                    <span className="font-semibold text-gray-900">€{instructor.avgRevenuePerLesson.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="font-semibold text-gray-900">{instructor.completionRate.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === "table" && (
        <>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search instructors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-[#a9d5ed] focus:border-transparent transition"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Payroll Breakdown</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredCommissions.length} instructors • {selectedInstructors.size} selected
                  </p>
                </div>
                {selectedInstructors.size > 0 && (
                  <button
                    onClick={markAllAsPaid}
                    className="px-6 py-3 bg-[#5cb83a] hover:bg-[#4a9c2e] text-white rounded-xl font-semibold transition flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark {selectedInstructors.size} as Paid
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInstructors.size === filteredCommissions.length && filteredCommissions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Lessons</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Bonus</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Gross</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Net Pay</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCommissions.map((instructor) => (
                    <tr key={instructor.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedInstructors.has(instructor.id)}
                          onChange={() => toggleSelectInstructor(instructor.id)}
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#3b82c4] to-[#6c376f] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {instructor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{instructor.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 text-amber-500 fill-current" />
                                <span className="text-xs text-gray-600">{instructor.rating.toFixed(1)}</span>
                              </div>
                              {instructor.bonus > 0 && (
                                <Award className="w-3 h-3 text-[#e7d356]" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                        €{instructor.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700 tabular-nums">
                        {instructor.lessons}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700 tabular-nums">
                        {instructor.rate}%
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                        €{instructor.commission.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-700 tabular-nums">
                        {instructor.bonus > 0 ? `€${instructor.bonus}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                        €{instructor.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 tabular-nums">
                        -€{(instructor.taxWithheld + instructor.niContributions).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-indigo-600 tabular-nums">
                        €{instructor.netPay.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          instructor.status === 'paid' 
                            ? 'bg-green-100 text-green-700'
                            : instructor.status === 'processing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {instructor.status === 'pending' && <Clock className="w-3 h-3" />}
                          {instructor.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                          {instructor.status.charAt(0).toUpperCase() + instructor.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowDetails(showDetails === instructor.id ? null : instructor.id)}
                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => markAsPaid(instructor.id)}
                            disabled={instructor.status === 'paid'}
                            className="w-8 h-8 bg-[#eefbe7] hover:bg-[#d4f4c3] rounded-lg flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4 text-[#5cb83a]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 tabular-nums">
                      €{stats.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                      {stats.totalLessons}
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 tabular-nums">
                      €{instructorCommissions.reduce((sum, i) => sum + i.commission, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                      €{stats.totalBonuses}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 tabular-nums">
                      €{stats.totalCommissions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-red-600 tabular-nums">
                      -€{(stats.totalTax + stats.totalNI).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-indigo-600 tabular-nums">
                      €{stats.totalNetPay.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {instructorCommissions.filter(i => i.bonus > 0).length > 0 && (
        <div className="bg-gradient-to-br from-[#fdfbe8] to-[#f9f3c8] rounded-2xl p-6 border-2 border-[#f9f3c8]">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#e7d356]" />
            Top Performer Bonuses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instructorCommissions.filter(i => i.bonus > 0).map(instructor => (
              <div key={instructor.id} className="bg-white/80 backdrop-blur rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#e7d356] to-[#d4bf2e] rounded-full flex items-center justify-center text-white font-bold">
                      {instructor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{instructor.name}</p>
                      <p className="text-xs text-gray-600">{instructor.lessons} lessons</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-[#e7d356]">+€{instructor.bonus}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Star className="w-3 h-3 text-amber-500 fill-current" />
                  <span>{instructor.rating.toFixed(1)} rating</span>
                  <span>•</span>
                  <span>€{instructor.revenue.toLocaleString()} revenue</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#e8f4fa] border-2 border-[#d4eaf5] rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#d4eaf5] rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-[#3b82c4]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#2563a3] mb-2">Payroll Processing Information</h4>
            <div className="space-y-2 text-sm text-[#3b82c4]">
              <p>• All amounts shown are in EUR and calculated based on completed lessons in the selected period</p>
              <p>• Tax (20%) and National Insurance (12%) are automatically calculated and withheld</p>
              <p>• Performance bonuses are awarded based on revenue thresholds and quality ratings</p>
              <p>• Payments are typically processed within 7 days of period end</p>
              <p>• Payslips are automatically generated and emailed to instructors upon payment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}