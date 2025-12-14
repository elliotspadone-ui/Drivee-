import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, differenceInDays, subMonths } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Download, Loader2, ArrowUpDown, AlertTriangle, Search, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";

// ============================================
// EXPORT UTILITIES
// ============================================

const escapeXml = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const generateFileName = (prefix, extension, dateRange) => {
  const dateStr = `${dateRange.start}_to_${dateRange.end}`;
  return `${prefix}_${dateStr}.${extension}`;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value || 0);
};

const formatPercent = (value) => {
  return `${(value || 0).toFixed(1)}%`;
};

// Excel Export
const exportToExcel = (report, dateRange) => {
  const rows = report.rows;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
  xml += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  
  // Styles
  xml += '<Styles>\n';
  xml += '<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>\n';
  xml += '<Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>\n';
  xml += '<Style ss:ID="Title"><Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/></Style>\n';
  xml += '<Style ss:ID="Currency"><NumberFormat ss:Format="€#,##0.00"/></Style>\n';
  xml += '<Style ss:ID="Percent"><NumberFormat ss:Format="0.0%"/></Style>\n';
  xml += '<Style ss:ID="TotalRow"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style>\n';
  xml += '<Style ss:ID="Positive"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#059669"/></Style>\n';
  xml += '<Style ss:ID="Negative"><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#DC2626"/></Style>\n';
  xml += '</Styles>\n';
  
  xml += '<Worksheet ss:Name="Fleet Report">\n<Table>\n';
  
  // Title
  xml += '<Row><Cell ss:StyleID="Title"><Data ss:Type="String">Fleet Utilization Report</Data></Cell></Row>\n';
  xml += `<Row><Cell><Data ss:Type="String">Period: ${dateRange.start} to ${dateRange.end}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}</Data></Cell></Row>\n`;
  xml += '<Row></Row>\n';
  
  // Summary Section
  xml += '<Row><Cell ss:StyleID="Header"><Data ss:Type="String">Summary</Data></Cell></Row>\n';
  xml += `<Row><Cell><Data ss:Type="String">Total Vehicles</Data></Cell><Cell><Data ss:Type="Number">${report.vehicleCount}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Total Bookings</Data></Cell><Cell><Data ss:Type="Number">${report.totalBookings}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Total Revenue</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${report.totalRevenue}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Total Maintenance</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${report.totalMaintenance}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Net Revenue</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${report.totalRevenue - report.totalMaintenance}</Data></Cell></Row>\n`;
  xml += `<Row><Cell><Data ss:Type="String">Avg Utilization</Data></Cell><Cell><Data ss:Type="String">${formatPercent(report.avgUtilization)}</Data></Cell></Row>\n`;
  xml += '<Row></Row>\n';
  
  // Headers
  xml += '<Row>';
  ["Vehicle", "Plate", "Bookings", "Revenue", "Maintenance", "Net Revenue", "Utilization"].forEach(h => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '</Row>\n';
  
  // Data rows
  rows.forEach(row => {
    const netStyle = row.netRevenue >= 0 ? "Positive" : "Negative";
    xml += '<Row>';
    xml += `<Cell><Data ss:Type="String">${escapeXml(row.name)}</Data></Cell>`;
    xml += `<Cell><Data ss:Type="String">${escapeXml(row.plate)}</Data></Cell>`;
    xml += `<Cell><Data ss:Type="Number">${row.bookings}</Data></Cell>`;
    xml += `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${row.revenue}</Data></Cell>`;
    xml += `<Cell ss:StyleID="Currency"><Data ss:Type="Number">${row.maintenanceCost}</Data></Cell>`;
    xml += `<Cell ss:StyleID="${netStyle}"><Data ss:Type="Number">${row.netRevenue}</Data></Cell>`;
    xml += `<Cell><Data ss:Type="String">${formatPercent(row.utilization)}</Data></Cell>`;
    xml += '</Row>\n';
  });
  
  // Total row
  xml += '<Row>';
  xml += '<Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>';
  xml += '<Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>';
  xml += `<Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${report.totalBookings}</Data></Cell>`;
  xml += `<Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${report.totalRevenue}</Data></Cell>`;
  xml += `<Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${report.totalMaintenance}</Data></Cell>`;
  xml += `<Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${report.totalRevenue - report.totalMaintenance}</Data></Cell>`;
  xml += `<Cell ss:StyleID="TotalRow"><Data ss:Type="String">${formatPercent(report.avgUtilization)}</Data></Cell>`;
  xml += '</Row>\n';
  
  xml += '</Table>\n</Worksheet>\n</Workbook>';
  
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateFileName("fleet_report", "xls", dateRange);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast.success("Excel report exported successfully");
};

// PDF Export
const exportToPDF = (report, dateRange) => {
  const rows = report.rows;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fleet Report</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1f2937; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #4f46e5; }
    .title { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0; }
    .subtitle { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 9px; color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .summary-card.highlight { background: #eef2ff; border-color: #c7d2fe; }
    .summary-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .summary-value { font-size: 18px; font-weight: 700; color: #1f2937; }
    .summary-value.positive { color: #059669; }
    .summary-value.negative { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 2px solid #e5e7eb; }
    th.right { text-align: right; }
    td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
    td.right { text-align: right; }
    td.positive { color: #059669; font-weight: 600; }
    td.negative { color: #dc2626; font-weight: 600; }
    tr:hover { background: #fafafa; }
    .total-row { background: #f3f4f6; font-weight: 700; }
    .total-row td { border-top: 2px solid #e5e7eb; padding: 12px 8px; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Fleet Utilization Report</h1>
      <p class="subtitle">Vehicle performance and cost analysis</p>
    </div>
    <div class="meta">
      <div><strong>Period:</strong> ${dateRange.start} to ${dateRange.end}</div>
      <div><strong>Generated:</strong> ${format(new Date(), "PPP 'at' HH:mm")}</div>
    </div>
  </div>
  
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total Vehicles</div>
      <div class="summary-value">${report.vehicleCount}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Bookings</div>
      <div class="summary-value">${report.totalBookings}</div>
    </div>
    <div class="summary-card highlight">
      <div class="summary-label">Total Revenue</div>
      <div class="summary-value">${formatCurrency(report.totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Maintenance</div>
      <div class="summary-value">${formatCurrency(report.totalMaintenance)}</div>
    </div>
    <div class="summary-card highlight">
      <div class="summary-label">Net Revenue</div>
      <div class="summary-value ${report.totalRevenue - report.totalMaintenance >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.totalRevenue - report.totalMaintenance)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Avg Utilization</div>
      <div class="summary-value">${formatPercent(report.avgUtilization)}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Vehicle</th>
        <th>Plate</th>
        <th class="right">Bookings</th>
        <th class="right">Revenue</th>
        <th class="right">Maintenance</th>
        <th class="right">Net Revenue</th>
        <th class="right">Utilization</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(row => `
        <tr>
          <td>${escapeXml(row.name)}</td>
          <td>${escapeXml(row.plate)}</td>
          <td class="right">${row.bookings}</td>
          <td class="right">${formatCurrency(row.revenue)}</td>
          <td class="right">${formatCurrency(row.maintenanceCost)}</td>
          <td class="right ${row.netRevenue >= 0 ? 'positive' : 'negative'}">${formatCurrency(row.netRevenue)}</td>
          <td class="right">${formatPercent(row.utilization)}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td><strong>TOTAL</strong></td>
        <td></td>
        <td class="right">${report.totalBookings}</td>
        <td class="right">${formatCurrency(report.totalRevenue)}</td>
        <td class="right">${formatCurrency(report.totalMaintenance)}</td>
        <td class="right ${report.totalRevenue - report.totalMaintenance >= 0 ? 'positive' : 'negative'}">${formatCurrency(report.totalRevenue - report.totalMaintenance)}</td>
        <td class="right">${formatPercent(report.avgUtilization)}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated by Drivee Fleet Management System • ${format(new Date(), "PPPP")}</p>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    toast.success("PDF report opened for printing");
  } else {
    toast.error("Please allow pop-ups to export PDF");
  }
};

// CSV Export
const exportToCSV = (report, dateRange) => {
  const rows = report.rows;
  
  const headers = ["Vehicle", "Plate", "Bookings", "Revenue", "Maintenance", "Net Revenue", "Utilization %"];
  
  const escapeCSV = (val) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  let csv = "";
  csv += `Fleet Utilization Report\n`;
  csv += `Period: ${dateRange.start} to ${dateRange.end}\n`;
  csv += `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}\n\n`;
  
  csv += `Summary\n`;
  csv += `Total Vehicles,${report.vehicleCount}\n`;
  csv += `Total Bookings,${report.totalBookings}\n`;
  csv += `Total Revenue,${report.totalRevenue.toFixed(2)}\n`;
  csv += `Total Maintenance,${report.totalMaintenance.toFixed(2)}\n`;
  csv += `Net Revenue,${(report.totalRevenue - report.totalMaintenance).toFixed(2)}\n`;
  csv += `Avg Utilization,${report.avgUtilization.toFixed(1)}%\n\n`;
  
  csv += headers.map(escapeCSV).join(",") + "\n";
  
  rows.forEach(row => {
    csv += [
      escapeCSV(row.name),
      escapeCSV(row.plate),
      row.bookings,
      row.revenue.toFixed(2),
      row.maintenanceCost.toFixed(2),
      row.netRevenue.toFixed(2),
      row.utilization.toFixed(1),
    ].join(",") + "\n";
  });
  
  csv += [
    "TOTAL",
    "",
    report.totalBookings,
    report.totalRevenue.toFixed(2),
    report.totalMaintenance.toFixed(2),
    (report.totalRevenue - report.totalMaintenance).toFixed(2),
    report.avgUtilization.toFixed(1),
  ].join(",") + "\n";
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = generateFileName("fleet_report", "csv", dateRange);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast.success("CSV report exported successfully");
};

export default function Fleet() {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState(() => ({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  }));

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  const {
    data: vehicles = [],
    isLoading: loadingVehicles,
    error: vehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles", schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const {
    data: bookings = [],
    isLoading: loadingBookings,
    error: bookingsError,
  } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 200) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const {
    data: expenses = [],
    isLoading: loadingExpenses,
    error: expensesError,
  } = useQuery({
    queryKey: ["expenses", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      try {
        return await base44.entities.Expense?.filter({ school_id: schoolId }, "-expense_date", 100) || [];
      } catch {
        return [];
      }
    },
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const isLoading = loadingAuth || loadingVehicles || loadingBookings || loadingExpenses;
  const hasError = vehiclesError || bookingsError || expensesError;

  const handleDateChange = (field, value) => {
    if (!value) return;
    const nextRange = { ...dateRange, [field]: value };

    const startDate = new Date(nextRange.start);
    const endDate = new Date(nextRange.end);

    if (startDate > endDate) {
      toast.error("Start date must be before end date.");
      return;
    }

    setDateRange(nextRange);
  };

  const handlePresetRange = (preset) => {
    const today = new Date();
    if (preset === "thisMonth") {
      setDateRange({
        start: format(startOfMonth(today), "yyyy-MM-dd"),
        end: format(endOfMonth(today), "yyyy-MM-dd"),
      });
    } else if (preset === "lastMonth") {
      const lastMonth = subMonths(today, 1);
      setDateRange({
        start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      });
    } else {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      setDateRange({
        start: format(sevenDaysAgo, "yyyy-MM-dd"),
        end: format(today, "yyyy-MM-dd"),
      });
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const report = useMemo(() => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const totalDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

    const rows = vehicles.map((vehicle) => {
      const vehicleBookings = bookings.filter((b) => {
        if (b.vehicle_id !== vehicle.id || b.status !== "completed") return false;
        const date = new Date(b.start_datetime);
        return date >= startDate && date <= endDate;
      });

      const revenue = vehicleBookings.reduce((sum, b) => sum + (b.price || 0), 0);

      const vehicleExpenses = expenses.filter((e) => {
        if (e.vehicle_id !== vehicle.id) return false;
        const date = new Date(e.expense_date || e.created_date);
        return date >= startDate && date <= endDate;
      });

      const maintenanceCost = vehicleExpenses.reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      );

      // Utilization is based on an 8 hour teaching day
      const utilization = Math.min(100, (vehicleBookings.length / (totalDays * 8)) * 100);

      return {
        id: vehicle.id,
        name: `${vehicle.make} ${vehicle.model}`,
        plate: vehicle.license_plate,
        bookings: vehicleBookings.length,
        revenue,
        maintenanceCost,
        netRevenue: revenue - maintenanceCost,
        utilization,
      };
    });

    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const totalMaintenance = rows.reduce((sum, r) => sum + r.maintenanceCost, 0);
    const totalBookings = rows.reduce((sum, r) => sum + r.bookings, 0);
    const avgUtilization = rows.length
      ? rows.reduce((sum, r) => sum + r.utilization, 0) / rows.length
      : 0;

    return {
      rows,
      totalRevenue,
      totalMaintenance,
      totalBookings,
      avgUtilization,
      vehicleCount: rows.length,
    };
  }, [vehicles, bookings, expenses, dateRange]);

  const filteredAndSortedRows = useMemo(() => {
    let rows = [...report.rows];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.plate || "").toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === bVal) return 0;
      if (sortDir === "desc") {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    return rows;
  }, [report.rows, search, sortBy, sortDir]);

  const handleExport = (type) => {
    if (!report.rows.length) {
      toast.info("No data to export for this period.");
      return;
    }

    setShowExportMenu(false);

    try {
      switch (type) {
        case "excel":
          exportToExcel(report, dateRange);
          break;
        case "pdf":
          exportToPDF(report, dateRange);
          break;
        case "csv":
          exportToCSV(report, dateRange);
          break;
        default:
          break;
      }
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Could not export report. Please try again.");
    }
  };

  if (isLoading) {
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
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">School Not Found</h3>
          <p className="text-gray-600">Please complete your school setup first.</p>
        </div>
      </div>
    );
  }

  if (vehiclesError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={vehiclesError} 
          onRetry={refetchVehicles}
          title="Failed to load fleet data"
        />
      </div>
    );
  }

  const noVehicles = !isLoading && !report.vehicleCount;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Fleet Utilization Report
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              Vehicle usage, costs and net performance for your selected period.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Utilization is estimated on an 8 hour teaching day.
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3b82c4] text-white rounded-xl text-sm font-semibold hover:bg-[#2563a3] disabled:opacity-60 disabled:cursor-not-allowed transition"
              disabled={noVehicles}
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-medium">Excel (.xls)</div>
                      <div className="text-xs text-gray-500">Full formatting</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-gray-500">Print-ready report</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-gray-500">Raw data export</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {hasError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Some data could not be loaded.</p>
              <p className="text-xs text-red-600">
                The report might be incomplete. Refresh the page if the numbers
                look off.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] focus:border-[#3b82c4]"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] focus:border-[#3b82c4]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="This month"
                isActive={
                  dateRange.start ===
                    format(startOfMonth(new Date()), "yyyy-MM-dd") &&
                  dateRange.end ===
                    format(endOfMonth(new Date()), "yyyy-MM-dd")
                }
                onClick={() => handlePresetRange("thisMonth")}
              />
              <PresetButton
                label="Last month"
                onClick={() => handlePresetRange("lastMonth")}
              />
              <PresetButton
                label="Last 7 days"
                onClick={() => handlePresetRange("last7Days")}
              />
            </div>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by vehicle or plate"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard
            label="Total fleet revenue"
            value={report.totalRevenue}
            variant="primary"
          />
          <MetricCard
            label="Total maintenance"
            value={report.totalMaintenance}
            variant="warning"
          />
          <div className="bg-[#eefbe7] rounded-xl p-4 border border-[#d4f4c3] flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#4a9c2e] mb-1 uppercase tracking-wide">
                Fleet health
              </p>
              <p className="text-sm text-gray-700">
                {report.vehicleCount ? (
                  <>
                    {report.vehicleCount} vehicles, {report.totalBookings}{" "}
                    bookings
                  </>
                ) : (
                  "No vehicles in your fleet yet"
                )}
              </p>
            </div>
            <p className="mt-3 text-sm text-gray-700">
              Avg utilization{" "}
              <span className="font-semibold">
                {report.avgUtilization.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Vehicle
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Plate
                </th>
                <SortableHeader
                  label="Bookings"
                  sortKey="bookings"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Revenue"
                  sortKey="revenue"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Maintenance"
                  sortKey="maintenanceCost"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Net"
                  sortKey="netRevenue"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="Utilization"
                  sortKey="utilization"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-xs text-gray-700">
                    {row.plate}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">
                    {row.bookings}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                    €{row.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-orange-600">
                    €{row.maintenanceCost.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-sm text-right font-semibold ${
                      row.netRevenue >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    €{row.netRevenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">
                    {row.utilization.toFixed(1)}%
                  </td>
                </tr>
              ))}

              {!filteredAndSortedRows.length && !noVehicles && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 px-4 text-center text-sm text-gray-500"
                  >
                    No vehicle activity matches your filters for this period.
                    Adjust the date range or clear the search to see more data.
                  </td>
                </tr>
              )}

              {noVehicles && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 px-4 text-center text-sm text-gray-500"
                  >
                    No vehicles found for your school yet. Add your cars to
                    start tracking utilization and profitability.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredAndSortedRows.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="py-3 px-4 text-xs font-semibold text-gray-700">
                    Totals
                  </td>
                  <td className="py-3 px-4" />
                  <td className="py-3 px-4 text-xs text-right font-semibold text-gray-700">
                    {filteredAndSortedRows.reduce(
                      (sum, row) => sum + row.bookings,
                      0
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-right font-semibold text-gray-900">
                    €
                    {filteredAndSortedRows
                      .reduce((sum, row) => sum + row.revenue, 0)
                      .toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs text-right font-semibold text-orange-700">
                    €
                    {filteredAndSortedRows
                      .reduce((sum, row) => sum + row.maintenanceCost, 0)
                      .toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs text-right font-semibold text-emerald-700">
                    €
                    {filteredAndSortedRows
                      .reduce((sum, row) => sum + row.netRevenue, 0)
                      .toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs text-right font-semibold text-gray-800">
                    {(
                      filteredAndSortedRows.reduce(
                        (sum, row) => sum + row.utilization,
                        0
                      ) / filteredAndSortedRows.length
                    ).toFixed(1)}
                    %
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        isActive
          ? "bg-[#e8f4fa] text-[#3b82c4] border-[#d4eaf5]"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({ label, value, variant = "primary" }) {
  const baseClasses = "rounded-xl p-4 border flex flex-col justify-between";
  const variants = {
    primary: "bg-[#e8f4fa] border-[#d4eaf5]",
    warning: "bg-[#fdfbe8] border-[#f9f3c8]",
  };

  const labelColor =
    variant === "primary" ? "text-[#3b82c4]" : "text-[#b8a525]";

  return (
    <div className={`${baseClasses} ${variants[variant]}`}>
      <p
        className={`text-xs font-medium mb-2 uppercase tracking-wide ${labelColor}`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900">
        €{value.toLocaleString()}
      </p>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  align = "left",
}) {
  const isActive = sortBy === sortKey;
  const alignmentClass = align === "right" ? "text-right" : "text-left";
  const justify = align === "right" ? "justify-end" : "justify-start";

  return (
    <th
      className={`${alignmentClass} py-3 px-4 text-sm font-semibold text-gray-700`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 ${justify}`}
      >
        <span>{label}</span>
        <ArrowUpDown
          className={`w-3.5 h-3.5 ${
            isActive ? "text-[#3b82c4]" : "text-gray-400"
          }`}
        />
        {isActive && (
          <span className="sr-only">
            {sortDir === "asc" ? "sorted ascending" : "sorted descending"}
          </span>
        )}
      </button>
    </th>
  );
}