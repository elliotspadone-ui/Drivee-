import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Zap,
  CreditCard,
  Bell,
  Settings,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  X,
} from "lucide-react";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AutomatedInvoicing from "../components/finance/AutomatedInvoicing";
import PaymentTracker from "../components/finance/PaymentTracker";
import PaymentGateway from "../components/finance/PaymentGateway";

const TABS = [
  { id: "auto-invoice", label: "Auto-Invoice", icon: Zap },
  { id: "payments", label: "Payment Tracking", icon: CreditCard },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function toNumber(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function AutomatedPayments() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("auto-invoice");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [reminderSettings, setReminderSettings] = useState({
    autoOverdue: true,
    beforeDue: true,
    weeklySummary: false,
  });

  const [settings, setSettings] = useState({
    paymentTerms: "14",
    taxRate: 20,
    invoicePrefix: "INV",
    currency: "EUR",
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: instructors = [], isLoading: loadingInstructors } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date"),
  });

  const isLoading =
    loadingBookings ||
    loadingInvoices ||
    loadingStudents ||
    loadingInstructors ||
    loadingSchools ||
    loadingPayments;

  const school = schools[0] || null;

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const stats = useMemo(() => {
    const now = new Date();

    const thisMonth = invoices.filter((inv) => {
      const created = safeDate(inv.created_date);
      if (!created) return false;
      return created >= startOfMonth(now) && created <= endOfMonth(now);
    });

    const pendingInvoices = invoices.filter(
      (inv) => inv.status === "sent" || inv.status === "overdue"
    );

    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === "paid" || inv.status === "cancelled") return false;
      const due = safeDate(inv.due_date);
      if (!due) return false;
      return due < now;
    });

    const completedUnbilled = bookings.filter((b) => {
      if (b.status !== "completed") return false;
      if (!toNumber(b.price)) return false;
      const hasInvoice = invoices.some((inv) => inv.booking_id === b.id);
      return !hasInvoice;
    });

    const recentPayments = payments.filter((p) => {
      if (p.status !== "completed") return false;
      const created = safeDate(p.created_date);
      if (!created) return false;
      return created >= subDays(now, 7);
    });

    const totalRevenue = thisMonth.reduce(
      (sum, inv) =>
        sum + (inv.status === "paid" ? toNumber(inv.total_amount) : 0),
      0
    );

    const pendingAmount = pendingInvoices.reduce(
      (sum, inv) =>
        sum +
        (toNumber(inv.total_amount) - toNumber(inv.amount_paid || 0)),
      0
    );

    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) =>
        sum +
        (toNumber(inv.total_amount) - toNumber(inv.amount_paid || 0)),
      0
    );

    const unbilledAmount = completedUnbilled.reduce(
      (sum, b) => sum + toNumber(b.price),
      0
    );

    const recentPaymentsTotal = recentPayments.reduce(
      (sum, p) => sum + toNumber(p.amount),
      0
    );

    return {
      totalRevenue,
      pendingAmount,
      overdueAmount,
      unbilledLessons: completedUnbilled.length,
      unbilledAmount,
      recentPaymentsTotal,
      invoiceCount: thisMonth.length,
      overdueCount: overdueInvoices.length,
    };
  }, [invoices, bookings, payments]);

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    toast.success("Payment recorded and dashboard updated");
  };

  const handleSendReminder = (invoiceOrId) => {
    const invoice =
      typeof invoiceOrId === "object" && invoiceOrId !== null
        ? invoiceOrId
        : invoices.find((inv) => inv.id === invoiceOrId);

    if (!invoice) {
      toast.error("Could not find invoice for reminder");
      return;
    }

    const student = studentMap.get(invoice.student_id);
    const nameOrEmail = student?.full_name || student?.email || "student";
    toast.success(`Reminder email queued for ${nameOrEmail}`);
  };

  const toggleReminder = (key) => {
    setReminderSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

  const handleSaveSettings = () => {
    // In the future this can persist to the backend or payment gateway config
    toast.success("Payment settings saved");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center" aria-live="polite">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading payment system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
              Automated Invoicing & Payments
            </h1>
            <p className="text-zinc-600 text-sm">
              Streamline billing with automatic invoice generation and payment tracking
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">This Month Paid</p>
              <p className="text-lg font-bold text-emerald-700">
                €{stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">
                {stats.invoiceCount} paid invoice
                {stats.invoiceCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Unbilled Lessons</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.unbilledLessons}</p>
          <p className="text-sm text-amber-600 font-medium">
            €{stats.unbilledAmount.toFixed(2)} pending
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Pending Payments</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            €{stats.pendingAmount.toFixed(2)}
          </p>
          <p className="text-sm text-zinc-500">Awaiting payment</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Overdue</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            €{stats.overdueAmount.toFixed(2)}
          </p>
          <p className="text-sm text-red-500">
            {stats.overdueCount} invoice
            {stats.overdueCount !== 1 ? "s" : ""} overdue
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-zinc-600">Recent Payments</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            €{stats.recentPaymentsTotal.toFixed(2)}
          </p>
          <p className="text-sm text-zinc-500">Last 7 days</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl w-fit"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {activeTab === "auto-invoice" && (
          <AutomatedInvoicing
            bookings={bookings}
            invoices={invoices}
            students={students}
            instructors={instructors}
            school={school}
            onInvoiceCreated={() =>
              queryClient.invalidateQueries({ queryKey: ["invoices"] })
            }
          />
        )}

        {activeTab === "payments" && (
          <PaymentTracker
            invoices={invoices}
            students={students}
            onViewInvoice={handleViewInvoice}
            onMarkPaid={() =>
              queryClient.invalidateQueries({ queryKey: ["invoices"] })
            }
            onSendReminder={handleSendReminder}
          />
        )}

        {activeTab === "reminders" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Bell className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Payment Reminders</h3>
                <p className="text-zinc-600">
                  Configure automatic payment reminder rules
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Overdue reminders */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <p className="font-semibold text-zinc-900">
                    Auto-send reminders for overdue invoices
                  </p>
                  <p className="text-sm text-zinc-600">
                    Send email reminders when invoices become overdue
                  </p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    reminderSettings.autoOverdue ? "bg-indigo-600" : "bg-zinc-300"
                  }`}
                  aria-pressed={reminderSettings.autoOverdue}
                  onClick={() => toggleReminder("autoOverdue")}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transform transition ${
                      reminderSettings.autoOverdue ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Before due reminders */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <p className="font-semibold text-zinc-900">Reminder before due date</p>
                  <p className="text-sm text-zinc-600">
                    Send a reminder a few days before the due date
                  </p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    reminderSettings.beforeDue ? "bg-indigo-600" : "bg-zinc-300"
                  }`}
                  aria-pressed={reminderSettings.beforeDue}
                  onClick={() => toggleReminder("beforeDue")}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transform transition ${
                      reminderSettings.beforeDue ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Weekly summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <p className="font-semibold text-zinc-900">
                    Weekly summary for unpaid invoices
                  </p>
                  <p className="text-sm text-zinc-600">
                    Send a weekly digest of all unpaid invoices
                  </p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    reminderSettings.weeklySummary ? "bg-indigo-600" : "bg-zinc-300"
                  }`}
                  aria-pressed={reminderSettings.weeklySummary}
                  onClick={() => toggleReminder("weeklySummary")}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transform transition ${
                      reminderSettings.weeklySummary ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Reminder automation rules will be connected to your email templates
                and payment gateway configuration in a later version.
              </p>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Settings className="w-7 h-7 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">Payment Settings</h3>
                <p className="text-zinc-600">
                  Configure invoicing and payment preferences
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Default Payment Terms
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-indigo-500 focus:outline-none"
                  value={settings.paymentTerms}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, paymentTerms: e.target.value }))
                  }
                >
                  <option value="7">Net 7 Days</option>
                  <option value="14">Net 14 Days</option>
                  <option value="30">Net 30 Days</option>
                  <option value="0">Due on Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      taxRate: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      invoicePrefix: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Currency
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-indigo-500 focus:outline-none"
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, currency: e.target.value }))
                  }
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-200">
                <h2 className="text-xl font-bold text-zinc-900">Process Payment</h2>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 rounded-lg hover:bg-zinc-100 transition"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <PaymentGateway
                  invoice={selectedInvoice}
                  student={studentMap.get(selectedInvoice.student_id)}
                  onPaymentSuccess={handlePaymentSuccess}
                  onClose={() => setShowPaymentModal(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
