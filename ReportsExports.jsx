import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  TrendingUp,
  Scale,
  DollarSign,
  PieChart,
  FileText,
  Receipt,
  Shield,
  Activity,
  BarChart3,
  Users,
  CreditCard,
  Clock,
  FileCheck,
  Package,
  Building2,
  Briefcase,
  Car,
  GraduationCap,
  Target,
  Award,
  Zap,
  ChevronRight,
} from "lucide-react";

const REPORT_CARDS = [
  // Financial Statements
  {
    id: "profit-loss",
    title: "Profit & Loss",
    description: "Income statement with revenue, expenses, and net profit",
    category: "Financial Statements",
    icon: TrendingUp,
    gradient: "from-blue-500 to-cyan-600",
    route: "ProfitLoss",
    featured: true,
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity snapshot",
    category: "Financial Statements",
    icon: Scale,
    gradient: "from-indigo-500 to-blue-600",
    route: "BalanceSheet",
    featured: true,
  },
  {
    id: "cash-flow",
    title: "Cash Flow Statement",
    description: "Operating, investing, and financing cash movements",
    category: "Financial Statements",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-600",
    route: "CashFlow",
    featured: true,
  },
  {
    id: "equity",
    title: "Changes in Equity",
    description: "Equity movements and retained earnings",
    category: "Financial Statements",
    icon: PieChart,
    gradient: "from-purple-500 to-pink-600",
    route: "Equity",
  },

  // Tax & Compliance
  {
    id: "tax-summary",
    title: "VAT / Sales Tax Summary",
    description: "Tax collected, paid, and due summary",
    category: "Tax & Compliance",
    icon: Receipt,
    gradient: "from-red-500 to-rose-600",
    route: "TaxSummary",
    featured: true,
  },
  {
    id: "tax-detail",
    title: "VAT / Tax Detail",
    description: "Line-by-line tax breakdown by transaction",
    category: "Tax & Compliance",
    icon: FileText,
    gradient: "from-orange-500 to-red-600",
    route: "TaxDetail",
  },
  {
    id: "tax-liability",
    title: "Tax Liability Report",
    description: "Outstanding tax obligations and filing status",
    category: "Tax & Compliance",
    icon: FileCheck,
    gradient: "from-amber-500 to-orange-600",
    route: "TaxLiability",
  },
  {
    id: "audit-log",
    title: "Audit Log",
    description: "System activity, changes, and user actions",
    category: "Tax & Compliance",
    icon: Shield,
    gradient: "from-slate-600 to-gray-700",
    route: "AuditLog",
  },

  // Revenue & Sales
  {
    id: "revenue-breakdown",
    title: "Revenue Breakdown",
    description: "Revenue analysis by service type and package",
    category: "Revenue & Sales",
    icon: BarChart3,
    gradient: "from-green-500 to-emerald-600",
    route: "RevenueBreakdown",
    featured: true,
  },
  {
    id: "sales-by-student",
    title: "Sales by Student",
    description: "Revenue and purchase history per student",
    category: "Revenue & Sales",
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    route: "SalesByStudent",
  },
  {
    id: "unbilled",
    title: "Unbilled Revenue",
    description: "Completed lessons not yet invoiced",
    category: "Revenue & Sales",
    icon: Activity,
    gradient: "from-yellow-500 to-amber-600",
    route: "Unbilled",
  },

  // Receivables
  {
    id: "aging",
    title: "Accounts Receivable Aging",
    description: "Outstanding invoices by age bucket (30, 60, 90+ days)",
    category: "Receivables",
    icon: Clock,
    gradient: "from-rose-500 to-pink-600",
    route: "Aging",
    featured: true,
  },
  {
    id: "customer-statements",
    title: "Customer Statements",
    description: "Detailed account statements per student",
    category: "Receivables",
    icon: CreditCard,
    gradient: "from-blue-600 to-indigo-600",
    route: "CustomerStatements",
  },
  {
    id: "collections",
    title: "Collections Report",
    description: "Payment collection performance and follow-ups",
    category: "Receivables",
    icon: Target,
    gradient: "from-teal-500 to-cyan-600",
    route: "Collections",
  },

  // Expenses
  {
    id: "expenses-category",
    title: "Expense by Category",
    description: "Operating costs breakdown by category",
    category: "Expenses",
    icon: Package,
    gradient: "from-orange-600 to-red-600",
    route: "ExpensesCategory",
  },
  {
    id: "vendor-expenses",
    title: "Vendor Expense Detail",
    description: "Spending by vendor and supplier",
    category: "Expenses",
    icon: Building2,
    gradient: "from-gray-600 to-slate-700",
    route: "VendorExpenses",
  },

  // Driving School Specific
  {
    id: "instructor-commission",
    title: "Instructor Commission",
    description: "Earnings, commission rates, and payouts by instructor",
    category: "Driving School",
    icon: Briefcase,
    gradient: "from-fuchsia-500 to-pink-600",
    route: "InstructorCommission",
    featured: true,
  },
  {
    id: "instructor-performance",
    title: "Instructor Performance",
    description: "Ratings, lesson count, and student satisfaction",
    category: "Driving School",
    icon: Award,
    gradient: "from-purple-600 to-violet-700",
    route: "InstructorPerformance",
  },
  {
    id: "fleet",
    title: "Fleet Utilization",
    description: "Vehicle usage, maintenance costs, and ROI",
    category: "Driving School",
    icon: Car,
    gradient: "from-sky-500 to-blue-600",
    route: "Fleet",
    featured: true,
  },
  {
    id: "student-performance",
    title: "Student Performance",
    description: "Lesson completion rates and exam success tracking",
    category: "Driving School",
    icon: GraduationCap,
    gradient: "from-green-600 to-emerald-700",
    route: "StudentPerformance",
  },
];

const ReportCard = ({ report }) => {
  const navigate = useNavigate();
  const Icon = report.icon;

  return (
    <button
      onClick={() => navigate(createPageUrl(report.route))}
      className="group relative text-left bg-white rounded-2xl border border-gray-200 hover:border-[#d4eaf5] hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {report.featured && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3b82c4] text-white text-xs font-bold rounded-full shadow-sm">
            <Zap className="w-3 h-3" />
            Popular
          </span>
        </div>
      )}

      <div
        className={`absolute inset-0 bg-gradient-to-br ${report.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />

      <div className="relative p-6 flex flex-col gap-4">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${report.gradient} flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        <div className="flex-1 min-h-[80px]">
          <div className="mb-2">
            <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full uppercase tracking-wide">
              {report.category}
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#3b82c4] transition-colors mb-2">
            {report.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-500">View Report</span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#3b82c4] group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </button>
  );
};

export default function ReportsExports() {
  const categories = [
    "Financial Statements",
    "Tax & Compliance",
    "Revenue & Sales",
    "Receivables",
    "Expenses",
    "Driving School",
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3b82c4] via-[#6c376f] to-[#a9d5ed] rounded-3xl opacity-10" />
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent leading-tight">
              Reports & Analytics
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Accountant-approved, audit-ready financial and operational reports. Export to Excel, PDF, or CSV.
            </p>
          </div>
        </div>
      </div>

      {categories.map((category) => {
        const categoryReports = REPORT_CARDS.filter((r) => r.category === category);
        if (categoryReports.length === 0) return null;

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">{category}</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categoryReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}