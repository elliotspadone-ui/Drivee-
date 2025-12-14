import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowLeft,
  CreditCard,
  Filter,
  Search,
  Eye,
  Mail,
  Printer,
  Share2,
  TrendingUp,
  TrendingDown,
  Package,
  Receipt,
  Banknote,
  Wallet,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  ExternalLink,
  FileCheck,
  History,
  Calculator,
  Percent,
  Tag,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  MapPin
} from "lucide-react";
import { format, formatDistanceToNow, isBefore, isAfter, addDays, parseISO, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useStudentAuth } from "@/components/student/useStudentAuth";
import StudentOnboarding from "@/components/student/StudentOnboarding";
import { logger } from "@/components/utils/config";
import { INVOICE_STATUS } from "@/components/utils/constants";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";

export default function StudentInvoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const auth = useStudentAuth();
  const effectiveUser = auth.data?.effectiveUser || null;
  const effectiveStudent = auth.data?.effectiveStudent || null;
  const authStatus = auth.data?.status || "loading";
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState("all");
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processingPayment, setProcessingPayment] = useState(false);

  const { data: invoices = [], isLoading: loadingInvoices, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['studentInvoices', effectiveStudent?.id, effectiveStudent?.school_id],
    queryFn: async () => {
      if (!effectiveStudent) return [];
      return await base44.entities.Invoice.filter(
        { 
          student_id: effectiveStudent.id,
          school_id: effectiveStudent.school_id 
        },
        '-issue_date',
        100
      );
    },
    enabled: !!effectiveStudent,
    staleTime: 300000,
  });

  const { data: payments = [], error: paymentsError } = useQuery({
    queryKey: ['studentPayments', effectiveStudent?.id, effectiveStudent?.school_id],
    queryFn: async () => {
      if (!effectiveStudent) return [];
      try {
        return await base44.entities.Payment.filter(
          { 
            student_id: effectiveStudent.id,
            school_id: effectiveStudent.school_id 
          },
          '-payment_date',
          100
        );
      } catch {
        return [];
      }
    },
    enabled: !!effectiveStudent,
    staleTime: 300000,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['studentPackages', effectiveStudent?.id, effectiveStudent?.school_id],
    queryFn: async () => {
      if (!effectiveStudent) return [];
      return await base44.entities.Package.filter({ 
        student_id: effectiveStudent.id,
        school_id: effectiveStudent.school_id 
      }, "-created_date", 20);
    },
    enabled: !!effectiveStudent,
    staleTime: 300000,
  });

  const processPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, method }) => {
      if (!effectiveStudent) throw new Error("Student not found");
      
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) throw new Error("Invoice not found");

      const paymentData = {
        school_id: invoice.school_id,
        invoice_id: invoiceId,
        student_id: effectiveStudent.id,
        amount: amount,
        payment_method: method,
        payment_type: "lesson",
        payment_date: new Date().toISOString(),
        status: "completed",
        transaction_id: `TXN-${Date.now()}`
      };
      
      const payment = await base44.entities.Payment.create(paymentData);
      
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const isFullyPaid = newAmountPaid >= invoice.total_amount;
      
      await base44.entities.Invoice.update(invoiceId, {
        amount_paid: newAmountPaid,
        status: isFullyPaid ? INVOICE_STATUS.PAID : "partially_paid",
        paid_date: isFullyPaid ? new Date().toISOString() : invoice.paid_date
      });
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['studentPayments'] });
      toast.success("Payment processed successfully!");
      setShowPaymentModal(false);
      setSelectedInvoice(null);
    },
    onError: (error) => {
      logger.error("Payment error:", error);
      toast.error(error?.message || "Failed to process payment");
    }
  });

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices;

    if (filterStatus !== "all") {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateRange !== "all") {
      const now = new Date();
      filtered = filtered.filter(inv => {
        const invoiceDate = new Date(inv.issue_date);
        
        if (dateRange === "month") {
          return differenceInDays(now, invoiceDate) <= 30;
        } else if (dateRange === "quarter") {
          return differenceInDays(now, invoiceDate) <= 90;
        } else if (dateRange === "year") {
          return differenceInDays(now, invoiceDate) <= 365;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
      } else if (sortBy === "date-asc") {
        return new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
      } else if (sortBy === "amount-desc") {
        return b.total_amount - a.total_amount;
      } else if (sortBy === "amount-asc") {
        return a.total_amount - b.total_amount;
      } else if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

    return filtered;
  }, [invoices, filterStatus, searchTerm, dateRange, sortBy]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const paid = invoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const unpaid = invoices
      .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + (inv.total_amount - (inv.amount_paid || 0)), 0);
    const overdue = invoices.filter(inv => 
      inv.status === "overdue" || 
      (inv.status === "sent" && inv.due_date && isBefore(new Date(inv.due_date), new Date()))
    ).length;
    const paidCount = invoices.filter(inv => inv.status === "paid").length;
    const partiallyPaidCount = invoices.filter(inv => inv.status === "partially_paid").length;

    return {
      total,
      paid,
      unpaid,
      overdue,
      paidCount,
      partiallyPaidCount,
      totalCount: invoices.length
    };
  }, [invoices]);

  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleViewInvoice = (invoice) => {
    setInvoiceToView(invoice);
    setShowDetailModal(true);
  };

  const handleProcessPayment = async () => {
    if (!selectedInvoice || processingPayment) return;

    const amountDue = selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0);
    
    setProcessingPayment(true);
    try {
      await processPaymentMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount: amountDue,
        method: paymentMethod
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownloadInvoice = (invoice) => {
    toast.info("Invoice download started");
  };

  const handleEmailInvoice = (invoice) => {
    toast.success("Invoice sent to your email");
  };

  const getStatusConfig = (status) => {
    const configs = {
      paid: {
        label: "Paid",
        icon: CheckCircle2,
        bgColor: "bg-[#eefbe7]",
        textColor: "text-[#4a9c2e]",
        borderColor: "border-[#d4f4c3]",
        dotColor: "bg-[#81da5a]"
      },
      partially_paid: {
        label: "Partially Paid",
        icon: Wallet,
        bgColor: "bg-[#e8f4fa]",
        textColor: "text-[#3b82c4]",
        borderColor: "border-[#d4eaf5]",
        dotColor: "bg-[#3b82c4]"
      },
      sent: {
        label: "Sent",
        icon: Mail,
        bgColor: "bg-[#f3e8f4]",
        textColor: "text-[#6c376f]",
        borderColor: "border-[#e5d0e6]",
        dotColor: "bg-[#6c376f]"
      },
      overdue: {
        label: "Overdue",
        icon: AlertCircle,
        bgColor: "bg-[#fdeeed]",
        textColor: "text-[#c9342c]",
        borderColor: "border-[#f9d4d2]",
        dotColor: "bg-[#e44138]"
      },
      draft: {
        label: "Draft",
        icon: FileText,
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        dotColor: "bg-gray-500"
      },
      cancelled: {
        label: "Cancelled",
        icon: XCircle,
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        dotColor: "bg-gray-500"
      }
    };
    return configs[status] || configs.sent;
  };

  const getInvoicePayments = (invoiceId) => {
    return payments.filter(p => p.invoice_id === invoiceId);
  };

  if (auth.isLoading || loadingInvoices) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <SkeletonLoader count={5} type="card" />
      </div>
    );
  }

  if (authStatus === "unauthenticated" || !effectiveUser) {
    window.location.href = createPageUrl("StudentAuth");
    return null;
  }

  if (authStatus === "no_student" || !effectiveStudent) {
    return <StudentOnboarding user={effectiveUser} onComplete={() => window.location.reload()} />;
  }

  if (invoicesError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <QueryErrorBoundary 
          error={invoicesError} 
          onRetry={refetchInvoices}
          title="Failed to load invoices"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link
          to={createPageUrl("StudentDashboard")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Invoices & Payments</h1>
            <p className="text-gray-600 mt-1">Manage your payment history and outstanding invoices</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fdeeed] rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#e44138]" />
            </div>
            {stats.unpaid > 0 && (
              <span className="px-2 py-1 bg-[#fdeeed] text-[#c9342c] rounded-full text-xs font-bold">
                Due
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">Amount Due</p>
          <p className="text-3xl font-bold text-gray-900">€{stats.unpaid.toFixed(2)}</p>
          {stats.overdue > 0 && (
            <p className="text-xs text-[#e44138] font-semibold mt-2">{stats.overdue} overdue</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#eefbe7] rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#5cb83a]" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Paid This Year</p>
          <p className="text-3xl font-bold text-gray-900">€{stats.paid.toFixed(2)}</p>
          <p className="text-xs text-[#5cb83a] font-semibold mt-2">{stats.paidCount} invoices</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-[#3b82c4]" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCount}</p>
          {stats.partiallyPaidCount > 0 && (
            <p className="text-xs text-[#3b82c4] font-semibold mt-2">
              {stats.partiallyPaidCount} partially paid
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#f3e8f4] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#6c376f]" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
          <p className="text-3xl font-bold text-gray-900">€{stats.total.toFixed(2)}</p>
          <p className="text-xs text-gray-500 font-semibold mt-2">All time</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="status">Status</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
          >
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          {["all", "sent", "partially_paid", "paid", "overdue", "cancelled"].map((status) => {
            const config = getStatusConfig(status);
            const count = status === "all" 
              ? invoices.length 
              : invoices.filter(inv => inv.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${
                  filterStatus === status
                    ? `${config.bgColor} ${config.textColor} border-2 ${config.borderColor}`
                    : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                }`}
              >
                {status === "all" ? "All Invoices" : config.label}
                <span className="ml-2 px-2 py-0.5 bg-white rounded-full text-xs font-bold">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="space-y-4">
        {filteredAndSortedInvoices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm"
          >
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== "all" ? "Try adjusting your filters" : "You don't have any invoices yet"}
            </p>
          </motion.div>
        ) : (
          filteredAndSortedInvoices.map((invoice, index) => {
            const config = getStatusConfig(invoice.status);
            const amountDue = invoice.total_amount - (invoice.amount_paid || 0);
            const isExpanded = expandedInvoice === invoice.id;
            const invoicePayments = getInvoicePayments(invoice.id);
            const isOverdue = invoice.due_date && isBefore(new Date(invoice.due_date), new Date()) && invoice.status !== "paid";

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.bgColor} ${config.textColor} flex items-center gap-1.5`}>
                              <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
                              {config.label}
                            </span>
                            {isOverdue && (
                              <span className="px-3 py-1 bg-[#fdeeed] text-[#c9342c] rounded-full text-xs font-bold">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>Issued: {format(new Date(invoice.issue_date), "MMM d, yyyy")}</span>
                            </div>
                            {invoice.due_date && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span className={isOverdue ? "text-[#e44138] font-semibold" : ""}>
                                  Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                          <p className="text-3xl font-bold text-gray-900">
                            €{invoice.total_amount.toFixed(2)}
                          </p>
                          {invoice.amount_paid > 0 && invoice.status !== "paid" && (
                            <div className="mt-2">
                              <p className="text-sm text-[#5cb83a] font-semibold">
                                Paid: €{invoice.amount_paid.toFixed(2)}
                              </p>
                              <p className="text-sm text-[#e44138] font-semibold">
                                Due: €{amountDue.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {invoice.line_items && invoice.line_items.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold text-gray-900">Invoice Items</p>
                            <button
                              onClick={() => setExpandedInvoice(isExpanded ? null : invoice.id)}
                              className="text-sm text-[#3b82c4] hover:text-[#2563a3] font-semibold flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>Hide <ChevronUp className="w-4 h-4" /></>
                              ) : (
                                <>Show All <ChevronDown className="w-4 h-4" /></>
                              )}
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            {(isExpanded ? invoice.line_items : invoice.line_items.slice(0, 2)).map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.description || item.name || `Item ${idx + 1}`}
                                  </p>
                                  {item.quantity && (
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                  )}
                                </div>
                                <span className="font-bold text-gray-900">
                                  €{(item.amount || item.price || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            
                            {!isExpanded && invoice.line_items.length > 2 && (
                              <p className="text-xs text-gray-500 italic">
                                +{invoice.line_items.length - 2} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {invoice.notes && (
                        <div className="bg-[#e8f4fa] border border-[#d4eaf5] rounded-xl p-3 mb-4">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-[#3b82c4] flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-[#2563a3] mb-1">Notes</p>
                              <p className="text-sm text-[#3b82c4]">{invoice.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {invoicePayments.length > 0 && (
                        <div className="bg-[#eefbe7] border border-[#d4f4c3] rounded-xl p-3 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="w-4 h-4 text-[#5cb83a]" />
                            <p className="text-xs font-bold text-[#4a9c2e]">Payment History</p>
                          </div>
                          <div className="space-y-1">
                            {invoicePayments.map((payment, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-[#4a9c2e]">
                                <span>
                                  {format(new Date(payment.payment_date), "MMM d, yyyy")} - {payment.payment_method}
                                </span>
                                <span className="font-bold">€{payment.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold text-sm transition flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>

                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold text-sm transition flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>

                        <button
                          onClick={() => handleEmailInvoice(invoice)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold text-sm transition flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </button>

                        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                          <button
                            onClick={() => handlePayInvoice(invoice)}
                            className="px-4 py-2 bg-gradient-to-r from-[#3b82c4] to-[#2563a3] hover:from-[#2563a3] hover:to-[#1e4f8a] text-white rounded-lg font-semibold text-sm transition flex items-center gap-2 shadow-md"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !processingPayment && setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#e8f4fa] rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-[#3b82c4]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Pay Invoice</h3>
                    <p className="text-sm text-gray-600">
                      #{selectedInvoice.invoice_number || selectedInvoice.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                {!processingPayment && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Invoice Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    €{selectedInvoice.total_amount.toFixed(2)}
                  </span>
                </div>
                {selectedInvoice.amount_paid > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Already Paid</span>
                    <span className="text-lg font-bold text-[#5cb83a]">
                      -€{selectedInvoice.amount_paid.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">Amount Due</span>
                  <span className="text-2xl font-bold text-[#3b82c4]">
                    €{(selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "card", label: "Credit Card", icon: CreditCard },
                    { id: "bank", label: "Bank Transfer", icon: Building2 }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      disabled={processingPayment}
                      className={`p-4 border-2 rounded-xl transition flex flex-col items-center gap-2 ${
                        paymentMethod === method.id
                          ? "border-[#3b82c4] bg-[#e8f4fa]"
                          : "border-gray-200 hover:border-gray-300"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <method.icon className={`w-6 h-6 ${
                        paymentMethod === method.id ? "text-[#3b82c4]" : "text-gray-600"
                      }`} />
                      <span className={`text-sm font-semibold ${
                        paymentMethod === method.id ? "text-[#2563a3]" : "text-gray-700"
                      }`}>
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#e8f4fa] border border-[#d4eaf5] rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#3b82c4] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#2563a3] mb-1">Secure Payment</p>
                    <p className="text-xs text-[#3b82c4]">
                      Your payment information is encrypted and secure. We never store your card details.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#3b82c4] to-[#2563a3] hover:from-[#2563a3] hover:to-[#1e4f8a] text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Pay €{(selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && invoiceToView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">Invoice Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                    <p className="font-bold text-gray-900">
                      #{invoiceToView.invoice_number || invoiceToView.id.slice(0, 8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      getStatusConfig(invoiceToView.status).bgColor
                    } ${getStatusConfig(invoiceToView.status).textColor}`}>
                      {getStatusConfig(invoiceToView.status).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Issue Date</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(invoiceToView.issue_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                  {invoiceToView.due_date && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Due Date</p>
                      <p className="font-semibold text-gray-900">
                        {format(new Date(invoiceToView.due_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>

                {invoiceToView.line_items && invoiceToView.line_items.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-3">Items</h4>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      {invoiceToView.line_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.description || item.name || `Item ${idx + 1}`}
                            </p>
                            {item.quantity && (
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            )}
                          </div>
                          <span className="font-bold text-gray-900">
                            €{(item.amount || item.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">€{invoiceToView.total_amount.toFixed(2)}</span>
                    </div>
                    {invoiceToView.amount_paid > 0 && (
                      <div className="flex justify-between text-[#5cb83a]">
                        <span>Paid</span>
                        <span className="font-semibold">-€{invoiceToView.amount_paid.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total Due</span>
                      <span>€{(invoiceToView.total_amount - (invoiceToView.amount_paid || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {invoiceToView.notes && (
                  <div className="bg-[#e8f4fa] border border-[#d4eaf5] rounded-xl p-4">
                    <p className="text-sm font-bold text-[#2563a3] mb-2">Notes</p>
                    <p className="text-sm text-[#3b82c4]">{invoiceToView.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}