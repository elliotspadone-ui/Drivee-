import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { getEffectiveSchoolId } from "@/components/utils/schoolContext";
import QueryErrorBoundary from "@/components/common/QueryErrorBoundary";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { logger } from "@/components/utils/config";
import {
  Car,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Wrench,
  Fuel,
  Calendar,
  CreditCard,
  Shield,
  X,
  Upload,
  Download,
  RefreshCw,
  MoreVertical,
  MapPin,
  Info,
  TrendingUp,
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";

const TRANSMISSION_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

const VEHICLE_CATEGORIES = [
  { value: "B", label: "Category B (Car)" },
  { value: "A", label: "Category A (Motorcycle)" },
  { value: "C", label: "Category C (Truck)" },
  { value: "D", label: "Category D (Bus)" },
];

export default function Vehicles() {
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  const { data: vehicles = [], isLoading: loadingVehicles, error: vehiclesError, refetch } = useQuery({
    queryKey: ["vehicles", schoolId],
    queryFn: () => schoolId ? base44.entities.Vehicle.filter({ school_id: schoolId }, "-created_date", 50) : [],
    enabled: !!schoolId,
    staleTime: 300000,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", schoolId],
    queryFn: () => schoolId ? base44.entities.Booking.filter({ school_id: schoolId }, "-start_datetime", 100) : [],
    enabled: !!schoolId,
    staleTime: 60000,
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create({ ...data, school_id: schoolId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle added successfully");
      setShowForm(false);
    },
    onError: (err) => {
      logger.error("Failed to create vehicle:", err);
      toast.error("Failed to add vehicle");
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle updated successfully");
      setShowForm(false);
    },
    onError: (err) => {
      logger.error("Failed to update vehicle:", err);
      toast.error("Failed to update vehicle");
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle deleted successfully");
    },
    onError: (err) => {
      logger.error("Failed to delete vehicle:", err);
      toast.error("Failed to delete vehicle");
    },
  });

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter((v) => {
      const matchesSearch =
        v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === "available") matchesStatus = v.is_available === true;
      if (filterStatus === "unavailable") matchesStatus = v.is_available === false;
      if (filterStatus === "needs_service") {
        matchesStatus = v.next_service_date && differenceInDays(parseISO(v.next_service_date), new Date()) < 7;
      }
      
      return matchesSearch && matchesStatus;
    });
    return filtered;
  }, [vehicles, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const available = vehicles.filter((v) => v.is_available).length;
    const needsService = vehicles.filter((v) => 
      v.next_service_date && differenceInDays(parseISO(v.next_service_date), new Date()) < 7
    ).length;
    const totalBookings = bookings.filter((b) => b.status === "completed").length;
    
    return {
      total: vehicles.length,
      available,
      unavailable: vehicles.length - available,
      needsService,
      totalBookings,
    };
  }, [vehicles, bookings]);

  if (loadingAuth || loadingVehicles) {
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

  if (vehiclesError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <QueryErrorBoundary 
          error={vehiclesError} 
          onRetry={refetch}
          title="Failed to load vehicles"
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
              Fleet Management
            </h1>
            <p className="text-zinc-600">Manage your vehicles and track utilization</p>
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
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b82c4] text-white font-semibold hover:bg-[#2563a3] shadow-sm transition"
            >
              <Plus className="w-5 h-5" />
              Add Vehicle
            </button>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Vehicles", value: stats.total, icon: Car, color: "bg-[#e8f4fa]", textColor: "text-[#3b82c4]" },
          { label: "Available", value: stats.available, icon: CheckCircle, color: "bg-[#eefbe7]", textColor: "text-[#5cb83a]" },
          { label: "In Use", value: stats.unavailable, icon: Activity, color: "bg-[#fdfbe8]", textColor: "text-[#b8a525]" },
          { label: "Needs Service", value: stats.needsService, icon: Wrench, color: "bg-[#fdeeed]", textColor: "text-[#e44138]" },
          { label: "Total Bookings", value: stats.totalBookings, icon: Calendar, color: "bg-[#f3e8f4]", textColor: "text-[#6c376f]" },
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
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
              placeholder="Search by make, model, or plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed]"
          >
            <option value="all">All Vehicles</option>
            <option value="available">Available</option>
            <option value="unavailable">In Use</option>
            <option value="needs_service">Needs Service</option>
          </select>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <Car className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-600">No vehicles found</p>
            {(searchTerm || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="mt-4 text-sm text-[#3b82c4] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredVehicles.map((vehicle, index) => {
            const needsService = vehicle.next_service_date && 
              differenceInDays(parseISO(vehicle.next_service_date), new Date()) < 7;
            const insuranceExpiring = vehicle.insurance_expiry && 
              differenceInDays(parseISO(vehicle.insurance_expiry), new Date()) < 14;
            
            return (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-900">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-zinc-500 font-mono">{vehicle.license_plate}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      vehicle.is_available
                        ? "bg-[#eefbe7] text-[#5cb83a] border-[#d4f4c3]"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {vehicle.is_available ? "Available" : "In Use"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Transmission</span>
                    <span className="font-medium text-zinc-900 capitalize">{vehicle.transmission}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Category</span>
                    <span className="font-medium text-zinc-900">{vehicle.category}</span>
                  </div>
                  {vehicle.mileage && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Mileage</span>
                      <span className="font-medium text-zinc-900">{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                </div>

                {(needsService || insuranceExpiring) && (
                  <div className="mb-4 space-y-2">
                    {needsService && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-700">Service due soon</span>
                      </div>
                    )}
                    {insuranceExpiring && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <Shield className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-700">Insurance expires soon</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowDetails(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setShowForm(true);
                    }}
                    className="py-2 px-3 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
                    aria-label="Edit vehicle"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this vehicle?")) {
                        deleteVehicleMutation.mutate(vehicle.id);
                      }
                    }}
                    className="py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                    aria-label="Delete vehicle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}