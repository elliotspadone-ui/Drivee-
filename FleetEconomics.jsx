import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wrench,
  Fuel,
  Loader2,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

export default function FleetEconomics() {
  const {
    data: vehicles = [],
    isLoading: vehiclesLoading,
    isError: vehiclesError,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const isLoading = vehiclesLoading || bookingsLoading;
  const hasError = vehiclesError || bookingsError;

  // Only completed bookings are used for economics
  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings]
  );

  // Determine analysis period from completed bookings
  const { analysisDays, analysisLabel } = useMemo(() => {
    if (!completedBookings.length) {
      return { analysisDays: 0, analysisLabel: "All time" };
    }

    const dates = completedBookings
      .map((b) => new Date(b.start_datetime))
      .filter((d) => !Number.isNaN(d.getTime()));

    if (!dates.length) {
      return { analysisDays: 0, analysisLabel: "All time" };
    }

    const sorted = dates.sort((a, b) => a - b);
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);

    const label =
      format(start, "MMM yyyy") === format(end, "MMM yyyy")
        ? format(start, "MMM yyyy")
        : `${format(start, "MMM yyyy")} to ${format(end, "MMM yyyy")}`;

    return { analysisDays: days, analysisLabel: label };
  }, [completedBookings]);

  // Fleet economics by vehicle
  const fleetPerformance = useMemo(() => {
    if (!vehicles.length) return [];

    const dailyCapacityHours = 8; // capacity assumption per vehicle per day
    return vehicles
      .map((vehicle) => {
        const vehicleBookings = completedBookings.filter(
          (b) => b.vehicle_id === vehicle.id
        );

        const revenue = vehicleBookings.reduce(
          (sum, b) => sum + (b.price || 0),
          0
        );
        const bookingsCount = vehicleBookings.length;

        // Total lesson hours for this vehicle
        const totalHours = vehicleBookings.reduce((sum, b) => {
          const start = new Date(b.start_datetime);
          const end = new Date(b.end_datetime);
          const diffMs = end - start;
          const hours = !Number.isNaN(diffMs) && diffMs > 0 ? diffMs / 3_600_000 : 1;
          return sum + hours;
        }, 0);

        const capacityHours =
          analysisDays > 0 ? analysisDays * dailyCapacityHours : 0;
        const utilization =
          capacityHours > 0
            ? Math.min(100, Math.round((totalHours / capacityHours) * 100))
            : 0;

        // Mock cost data (placeholder until maintenance and fuel logs exist)
        const costs = {
          fuel: Math.round(revenue * 0.045),
          maintenance: Math.round(revenue * 0.028),
          insurance: Math.round(revenue * 0.015),
          cleaning: Math.round(revenue * 0.003),
          other: Math.round(revenue * 0.002),
        };

        const totalCosts = Object.values(costs).reduce(
          (sum, val) => sum + val,
          0
        );
        const profit = revenue - totalCosts;
        const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

        return {
          id: vehicle.id,
          name: `${vehicle.make} ${vehicle.model}`,
          plate: vehicle.license_plate,
          revenue,
          costs: totalCosts,
          costBreakdown: costs,
          profit,
          profitMargin,
          utilization,
          roi,
          bookings: bookingsCount,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, completedBookings, analysisDays]);

  const totalRevenue = fleetPerformance.reduce(
    (sum, v) => sum + v.revenue,
    0
  );
  const totalCosts = fleetPerformance.reduce((sum, v) => sum + v.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgProfitMargin =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgUtilization =
    fleetPerformance.length > 0
      ? fleetPerformance.reduce((sum, v) => sum + v.utilization, 0) /
        fleetPerformance.length
      : 0;

  // Cost breakdown for all vehicles
  const totalCostBreakdown = fleetPerformance.reduce((acc, vehicle) => {
    Object.entries(vehicle.costBreakdown).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});

  const costCategories = [
    {
      name: "Fuel",
      value: totalCostBreakdown.fuel || 0,
      icon: Fuel,
      iconClass: "text-amber-600",
    },
    {
      name: "Maintenance",
      value: totalCostBreakdown.maintenance || 0,
      icon: Wrench,
      iconClass: "text-blue-600",
    },
    {
      name: "Insurance",
      value: totalCostBreakdown.insurance || 0,
      icon: AlertCircle,
      iconClass: "text-purple-600",
    },
    {
      name: "Cleaning",
      value: totalCostBreakdown.cleaning || 0,
      icon: Car,
      iconClass: "text-green-600",
    },
    {
      name: "Other",
      value: totalCostBreakdown.other || 0,
      icon: DollarSign,
      iconClass: "text-gray-600",
    },
  ];

  const fuelShare =
    totalCosts > 0 && totalCostBreakdown.fuel
      ? (totalCostBreakdown.fuel / totalCosts) * 100
      : 0;

  if (isLoading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          There was a problem loading fleet data. Please try again.
        </div>
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
          <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No vehicles yet
          </h2>
          <p className="text-sm text-gray-600">
            Add your first vehicle to start tracking fleet revenue, costs and
            utilization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fleet economics</h1>
        <p className="text-gray-600 mt-1">
          Revenue, costs and profitability by vehicle
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Analysis period: {analysisLabel} (
          {analysisDays > 0 ? `${analysisDays} days` : "no completed lessons"})
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Fleet revenue</p>
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {vehicles.length} vehicles
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Fleet costs</p>
            <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{totalCosts.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">total expenses</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">Net profit</p>
            <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            €{totalProfit.toLocaleString()}
          </p>
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 mt-2">
            <span className="text-sm font-semibold">
              {avgProfitMargin.toFixed(0)}%
            </span>
            <span className="text-xs opacity-80">margin</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600">
              Average utilization
            </p>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            {Math.round(avgUtilization)}%
          </p>
          <p className="text-sm text-gray-600 mt-2">fleet average</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Cost breakdown (all vehicles)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {costCategories.map((category, index) => {
            const percentage =
              totalCosts > 0 ? (category.value / totalCosts) * 100 : 0;
            return (
              <div key={index} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <category.icon
                    className={`w-4 h-4 ${category.iconClass}`}
                  />
                  <p className="text-xs font-medium text-gray-600">
                    {category.name}
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums mb-1">
                  €{category.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {percentage.toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vehicle Performance Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Vehicle financial performance
          </h3>
          <p className="text-sm text-gray-600 mt-1">{analysisLabel}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Costs
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Profit
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Margin
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Utilization
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fleetPerformance.map((vehicle) => {
                const isUnderUtilized = vehicle.utilization < 60;
                return (
                  <tr
                    key={vehicle.id}
                    className={`hover:bg-gray-50 transition ${
                      isUnderUtilized ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle.plate}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 tabular-nums">
                      €{vehicle.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                      €{vehicle.costs.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600 tabular-nums">
                      €{vehicle.profit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          vehicle.profitMargin >= 85
                            ? "bg-green-100 text-green-800"
                            : vehicle.profitMargin >= 70
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {vehicle.profitMargin.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right tabular-nums">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          vehicle.utilization >= 75
                            ? "bg-green-100 text-green-800"
                            : vehicle.utilization >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {vehicle.utilization}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                      {vehicle.roi.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 tabular-nums">
                  €{totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                  €{totalCosts.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right font-bold text-green-600 tabular-nums">
                  €{totalProfit.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                  {avgProfitMargin.toFixed(0)}%
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-700 tabular-nums">
                  {Math.round(avgUtilization)}%
                </td>
                <td className="px-6 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Alerts and insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fleetPerformance.filter((v) => v.utilization < 60).length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Underutilized vehicles
            </h3>
            <div className="space-y-3">
              {fleetPerformance
                .filter((v) => v.utilization < 60)
                .map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="bg-white/80 backdrop-blur rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {vehicle.name}
                      </p>
                      <span className="text-sm font-bold text-amber-600">
                        {vehicle.utilization}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Consider shifting lessons or marketing this vehicle type
                      to increase utilization.
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Fleet insights
          </h3>
          <div className="space-y-3">
            <div className="bg-white/80 backdrop-blur rounded-lg p-4">
              <p className="text-sm text-gray-900 font-medium mb-1">
                Average profit margin: {avgProfitMargin.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600">
                {avgProfitMargin > 85
                  ? "Excellent profitability across the fleet."
                  : "Good performance. Monitor high cost vehicles to protect margins."}
              </p>
            </div>

            {fleetPerformance[0] && (
              <div className="bg-white/80 backdrop-blur rounded-lg p-4">
                <p className="text-sm text-gray-900 font-medium mb-1">
                  Top performer: {fleetPerformance[0].name}
                </p>
                <p className="text-xs text-gray-600">
                  €{fleetPerformance[0].profit.toLocaleString()} profit and{" "}
                  {fleetPerformance[0].utilization}% utilization in the
                  analysis period.
                </p>
              </div>
            )}

            <div className="bg-white/80 backdrop-blur rounded-lg p-4">
              <p className="text-sm text-gray-900 font-medium mb-1">
                Fuel is {fuelShare.toFixed(0)}% of fleet costs
              </p>
              <p className="text-xs text-gray-600">
                Track fuel spend by vehicle and consider eco driving training or
                routing optimizations to reduce this share over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
