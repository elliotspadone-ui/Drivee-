import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";
import {
  DollarSign,
  CreditCard,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Receipt,
  TrendingUp,
  TrendingDown,
  FileText,
  Wallet,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const PAYMENT_STATUSES = {
  pending: { label: "Pending", color: "text-[#b8a525]", bg: "bg-[#fdfbe8]", border: "border-[#f9f3c8]", icon: Clock },
  completed: { label: "Completed", color: "text-[#5cb83a]", bg: "bg-[#eefbe7]", border: "border-[#d4f4c3]", icon: CheckCircle },
  failed: { label: "Failed", color: "text-[#e44138]", bg: "bg-[#fdeeed]", border: "border-[#f9d4d2]", icon: XCircle },
  refunded: { label: "Refunded", color: "text-zinc-600", bg: "bg-zinc-100", border: "border-zinc-200", icon: AlertCircle },
};

const PAYMENT_METHODS = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "cash", label: "Cash", icon: DollarSign },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "digital_wallet", label: "Digital Wallet", icon: Wallet },
];

export default function Payments() {
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

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

  const { data: payments = [], isLoading: loadingPayments, error: paymentsError, refetch } = useQuery({
    queryKey: ["payments", schoolId],
    queryFn: () => schoolId ? base44.entities.Payment.filter({ school_id: schoolId }, "-payment_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students", schoolId],
    queryFn: () => schoolId ? base44.entities.Student.filter({ school_id: schoolId }, "-created_date", 200) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const student = studentMap.get(p.student_id);
      const matchesSearch =
        student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesMethod = methodFilter === "all" || p.payment_method === methodFilter;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, searchTerm, statusFilter, methodFilter, studentMap]);

  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    const thisMonthPayments = payments.filter((p) => {
      if (!p.payment_date) return false;
      const date = parseISO(p.payment_date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const completedPayments = payments.filter((p) => p.status === "completed");
    const pendingPayments = payments.filter((p) => p.status === "pending");
    const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const thisMonthRevenue = thisMonthPayments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      total: payments.length,
      completed: completedPayments.length,
      pending: pendingPayments.length,
      totalRevenue,
      thisMonthRevenue,
      avgPayment: completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0,
    };
  }, [payments]);

  if (loadingAuth || loadingPayments) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <SkeletonLoader count={4} type="card" />
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
          onRetry={refetch}
          title="Failed to load payments"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent mb-1">
              Payments
            </h1>
            <p className="text-zinc-600">Track all payment transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              aria-label="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] shadow-sm transition"
            >
              <Plus className="w-5 h-5" />
              Record Payment
            </button>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Payments", value: stats.total, icon: Receipt, color: "bg-[#e8f4fa]", textColor: "text-[#3b82c4]" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "bg-[#eefbe7]", textColor: "text-[#5cb83a]" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "bg-[#fdfbe8]", textColor: "text-[#b8a525]" },
          { label: "Total Revenue", value: `€${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-[#e8f4fa]", textColor: "text-[#3b82c4]" },
          { label: "This Month", value: `€${stats.thisMonthRevenue.toLocaleString()}`, icon: Calendar, color: "bg-[#f3e8f4]", textColor: "text-[#6c376f]" },
          { label: "Avg Payment", value: `€${Math.round(stats.avgPayment)}`, icon: TrendingUp, color: "bg-[#eefbe7]", textColor: "text-[#5cb83a]" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by student name or transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            >
              <option value="all">All Status</option>
              {Object.entries(PAYMENT_STATUSES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <Receipt className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-600">No payments found</p>
          </div>
        ) : (
          filteredPayments.map((payment, index) => {
            const student = studentMap.get(payment.student_id);
            const statusConfig = PAYMENT_STATUSES[payment.status] || PAYMENT_STATUSES.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-md hover:border-zinc-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#3b82c4] to-[#a9d5ed] rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900">{student?.full_name || "Unknown Student"}</h3>
                        <p className="text-sm text-zinc-500">
                          {payment.payment_date ? format(parseISO(payment.payment_date), "MMM d, yyyy") : "No date"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-zinc-900">€{payment.amount?.toLocaleString() || 0}</p>
                      <p className="text-xs text-zinc-500 capitalize">{payment.payment_method?.replace("_", " ")}</p>
                    </div>
                    
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}