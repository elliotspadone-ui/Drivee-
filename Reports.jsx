import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Download, Calendar, Users, DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

export default function Reports() {
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const reportTypes = [
    { 
      name: "Revenue Report", 
      description: "Detailed breakdown of all revenue streams",
      icon: DollarSign,
      color: "from-[#81da5a] to-[#5cb83a]",
      data: () => {
        const total = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0);
        return { metric: `€${total.toFixed(0)}`, label: "Total Revenue" };
      }
    },
    { 
      name: "Bookings Report", 
      description: "Complete overview of all lessons and schedules",
      icon: Calendar,
      color: "from-[#3b82c4] to-[#2563a3]",
      data: () => {
        return { metric: bookings.length, label: "Total Bookings" };
      }
    },
    { 
      name: "Student Activity", 
      description: "Student engagement and progress metrics",
      icon: Users,
      color: "from-[#6c376f] to-[#5a2d5d]",
      data: () => {
        const active = new Set(bookings.map(b => b.student_id)).size;
        return { metric: active, label: "Active Students" };
      }
    },
    { 
      name: "Performance Analytics", 
      description: "Instructor and school performance data",
      icon: TrendingUp,
      color: "from-[#e7d356] to-[#d4bf2e]",
      data: () => {
        const completed = bookings.filter(b => b.status === 'completed').length;
        return { metric: completed, label: "Completed Lessons" };
      }
    }
  ];

  const handleDownload = (reportName) => {
    toast.success(`Downloading ${reportName}...`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600 mt-1">Export and analyze your business data</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">Report Period</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3b82c4]/20"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {reportTypes.map((report, idx) => {
          const { metric, label } = report.data();
          return (
            <motion.div
              key={report.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${report.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <report.icon className="w-7 h-7 text-white" />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDownload(report.name)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <Download className="w-5 h-5 text-slate-500" />
                </motion.button>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{report.name}</h3>
              <p className="text-sm text-slate-600 mb-4">{report.description}</p>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{metric}</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDownload(report.name)}
                className="w-full mt-4 px-6 py-3 bg-[#3b82c4] hover:bg-[#2563a3] text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Report
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}