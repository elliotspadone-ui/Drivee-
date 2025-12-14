import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  Wrench,
  Droplet,
  Calendar,
  AlertTriangle,
  Bell,
  CheckCircle,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  X,
  Clock,
  MapPin,
  Gauge,
  Shield,
  FileText,
  Camera,
  Upload,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Fuel,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Timer,
  Truck,
  Users,
  UserCheck,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  Receipt,
  Banknote,
  CircleDollarSign,
  Tag,
  Hash,
  Thermometer,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Cog,
  Hammer,
  Sparkles,
  Star,
  Award,
  Target,
  Flag,
  Navigation,
  Route,
  Compass,
  History,
  Archive,
  FolderOpen,
  Image,
  Paperclip,
  ExternalLink,
  Copy,
  Save,
  Send,
  Share2,
  Printer,
  QrCode,
  Scan,
  Smartphone,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, addDays, subDays, isAfter, isBefore } from "date-fns";

const MAINTENANCE_TYPES = [
  { value: "oil_change", label: "Oil Change", icon: Droplet },
  { value: "tire_rotation", label: "Tire Rotation", icon: RefreshCw },
  { value: "tire_replacement", label: "Tire Replacement", icon: Target },
  { value: "brake_check", label: "Brake Check", icon: AlertCircle },
  { value: "brake_replacement", label: "Brake Replacement", icon: Shield },
  { value: "inspection", label: "Inspection", icon: ClipboardCheck },
  { value: "mot", label: "MOT Test", icon: FileText },
  { value: "service", label: "Full Service", icon: Wrench },
  { value: "repair", label: "Repair", icon: Hammer },
  { value: "bodywork", label: "Bodywork", icon: Car },
  { value: "electrical", label: "Electrical", icon: Zap },
  { value: "clutch", label: "Clutch", icon: Cog },
  { value: "transmission", label: "Transmission", icon: Settings },
  { value: "suspension", label: "Suspension", icon: Activity },
  { value: "exhaust", label: "Exhaust", icon: Thermometer },
  { value: "air_conditioning", label: "A/C Service", icon: Thermometer },
  { value: "battery", label: "Battery", icon: Battery },
  { value: "other", label: "Other", icon: MoreVertical },
];

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "text-blue-700", bgColor: "bg-blue-50" },
  in_progress: { label: "In Progress", color: "text-amber-700", bgColor: "bg-amber-50" },
  completed: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  cancelled: { label: "Cancelled", color: "text-zinc-500", bgColor: "bg-zinc-100" },
};

const Input = React.memo(({ value, onChange, type = "text", placeholder, className = "", min, max, step, required, disabled }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    min={min}
    max={max}
    step={step}
    required={required}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-zinc-50 disabled:cursor-not-allowed transition ${className}`}
  />
));

Input.displayName = "Input";

const Select = React.memo(({ value, onChange, options, placeholder, className = "", required }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    required={required}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition ${className}`}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
));

Select.displayName = "Select";

const Textarea = React.memo(({ value, onChange, placeholder, rows = 3, className = "" }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition ${className}`}
  />
));

Textarea.displayName = "Textarea";

const FormField = React.memo(({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
));

FormField.displayName = "FormField";

const StatCard = React.memo(({ icon, label, value, subValue, trend, color }) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
      {trend !== undefined && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
    {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
  </div>
));

StatCard.displayName = "StatCard";

const VehicleCard = React.memo(({ vehicle, instructor, maintenanceCount, onSelect, onMaintenance, onFuel, onEdit, index }) => {
  const hasUpcomingMot = vehicle.mot_expiry && differenceInDays(parseISO(vehicle.mot_expiry), new Date()) <= 30;
  const hasUpcomingInsurance = vehicle.insurance_expiry && differenceInDays(parseISO(vehicle.insurance_expiry), new Date()) <= 30;
  const hasUpcomingService = vehicle.next_service_due && differenceInDays(parseISO(vehicle.next_service_due), new Date()) <= 14;

  const alerts = [hasUpcomingMot, hasUpcomingInsurance, hasUpcomingService].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Car className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">
                {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-zinc-500 font-mono">{vehicle.license_plate}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                vehicle.is_available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {vehicle.is_available ? "Available" : "In Use"}
            </span>
            {alerts > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                {alerts} alert{alerts > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500 mb-1">Transmission</p>
            <p className="text-sm font-semibold text-zinc-900 capitalize">{vehicle.transmission}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500 mb-1">Fuel Type</p>
            <p className="text-sm font-semibold text-zinc-900 capitalize">{vehicle.fuel_type}</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500 mb-1">Mileage</p>
            <p className="text-sm font-semibold text-zinc-900">{vehicle.mileage?.toLocaleString()} km</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500 mb-1">Category</p>
            <p className="text-sm font-semibold text-zinc-900">{vehicle.category}</p>
          </div>
        </div>

        {instructor && (
          <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-indigo-50">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-indigo-600">Assigned to</p>
              <p className="text-sm font-medium text-indigo-700">{instructor.full_name}</p>
            </div>
          </div>
        )}

        {(hasUpcomingMot || hasUpcomingInsurance || hasUpcomingService) && (
          <div className="space-y-2 mb-4">
            {hasUpcomingMot && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>MOT expires {format(parseISO(vehicle.mot_expiry), "MMM d, yyyy")}</span>
              </div>
            )}
            {hasUpcomingInsurance && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
                <Shield className="w-4 h-4" />
                <span>Insurance expires {format(parseISO(vehicle.insurance_expiry), "MMM d, yyyy")}</span>
              </div>
            )}
            {hasUpcomingService && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700 text-xs">
                <Wrench className="w-4 h-4" />
                <span>Service due {format(parseISO(vehicle.next_service_due), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100 p-3 bg-zinc-50 flex gap-2">
        <button
          onClick={onMaintenance}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
        >
          <Wrench className="w-4 h-4" />
          Maintenance
        </button>
        <button
          onClick={onFuel}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
        >
          <Droplet className="w-4 h-4" />
          Fuel
        </button>
        <button
          onClick={onEdit}
          className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});

VehicleCard.displayName = "VehicleCard";

const MaintenanceCard = React.memo(({ maintenance, vehicle, onComplete, onEdit, index }) => {
  const isOverdue =
    maintenance.status === "scheduled" && isBefore(parseISO(maintenance.scheduled_date), new Date());
  const typeConfig = MAINTENANCE_TYPES.find((t) => t.value === maintenance.maintenance_type);
  const statusConfig = STATUS_CONFIG[maintenance.status];
  const Icon = typeConfig?.icon || Wrench;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden ${
        isOverdue ? "border-red-200" : "border-zinc-200"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isOverdue ? "bg-red-100" : "bg-indigo-100"
              }`}
            >
              <Icon className={`w-6 h-6 ${isOverdue ? "text-red-600" : "text-indigo-600"}`} />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">{typeConfig?.label || "Maintenance"}</h3>
              <p className="text-sm text-zinc-500">
                {vehicle?.make} {vehicle?.model} • {vehicle?.license_plate}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
              {isOverdue ? "Overdue" : statusConfig.label}
            </span>
            {maintenance.cost && maintenance.cost > 0 && (
              <span className="text-sm font-semibold text-zinc-900">€{maintenance.cost.toFixed(2)}</span>
            )}
          </div>
        </div>

        {maintenance.description && (
          <p className="text-sm text-zinc-600 mb-4">{maintenance.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {maintenance.status === "completed" && maintenance.completed_date
                ? format(parseISO(maintenance.completed_date), "MMM d, yyyy")
                : format(parseISO(maintenance.scheduled_date), "MMM d, yyyy")}
            </span>
          </div>
          {maintenance.vendor && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{maintenance.vendor}</span>
            </div>
          )}
          {maintenance.mileage_at_service && (
            <div className="flex items-center gap-1">
              <Gauge className="w-4 h-4" />
              <span>{maintenance.mileage_at_service.toLocaleString()} km</span>
            </div>
          )}
        </div>
      </div>

      {maintenance.status === "scheduled" && (
        <div className="border-t border-zinc-100 p-3 bg-zinc-50 flex gap-2">
          <button
            onClick={onComplete}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Complete
          </button>
          <button
            onClick={onEdit}
            className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
});

MaintenanceCard.displayName = "MaintenanceCard";

const FuelLogCard = React.memo(({ log, vehicle, previousLog, index }) => {
  const efficiency = previousLog
    ? ((log.odometer_reading - previousLog.odometer_reading) / log.fuel_amount_liters).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Droplet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">
              {vehicle?.make} {vehicle?.model}
            </h3>
            <p className="text-sm text-zinc-500">{vehicle?.license_plate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-zinc-900">€{log.fuel_cost.toFixed(2)}</p>
          <p className="text-sm text-zinc-500">{format(parseISO(log.date), "MMM d, yyyy")}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl bg-zinc-50 p-3 text-center">
          <p className="text-lg font-bold text-zinc-900">{log.fuel_amount_liters.toFixed(1)}L</p>
          <p className="text-xs text-zinc-500">Volume</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 text-center">
          <p className="text-lg font-bold text-zinc-900">
            €{(log.fuel_cost / log.fuel_amount_liters).toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">Per Liter</p>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3 text-center">
          <p className="text-lg font-bold text-zinc-900">{log.odometer_reading.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">Odometer</p>
        </div>
      </div>

      {efficiency && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Fuel Efficiency</span>
          </div>
          <span className="text-sm font-bold text-emerald-700">{efficiency} km/L</span>
        </div>
      )}

      {log.fuel_station && (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
          <MapPin className="w-4 h-4" />
          <span>{log.fuel_station}</span>
        </div>
      )}
    </motion.div>
  );
});

FuelLogCard.displayName = "FuelLogCard";

const Modal = React.memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 transition">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

Modal.displayName = "Modal";

export default function FleetManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("vehicles");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [vehicleFormData, setVehicleFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    license_plate: "",
    vin: "",
    color: "",
    transmission: "manual",
    fuel_type: "petrol",
    category: "B",
    mileage: 0,
    insurance_expiry: "",
    mot_expiry: "",
    tax_expiry: "",
    assigned_instructor_id: "",
    notes: "",
  });

  const [maintenanceFormData, setMaintenanceFormData] = useState({
    maintenance_type: "service",
    description: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd"),
    cost: 0,
    vendor: "",
    notes: "",
  });

  const [fuelFormData, setFuelFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    fuel_type: "petrol",
    fuel_amount_liters: 0,
    fuel_cost: 0,
    odometer_reading: 0,
    fuel_station: "",
    payment_method: "card",
    notes: "",
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => base44.entities.VehicleMaintenance.list("-scheduled_date"),
  });

  const { data: fuelLogs = [] } = useQuery({
    queryKey: ["fuelLogs"],
    queryFn: () => base44.entities.FuelLog.list("-date"),
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["instructors"],
    queryFn: () => base44.entities.Instructor.list(),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle added successfully!");
      setShowVehicleForm(false);
      resetVehicleForm();
    },
    onError: () => {
      toast.error("Failed to add vehicle");
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle updated!");
      setShowVehicleForm(false);
      setEditingVehicle(null);
      resetVehicleForm();
    },
    onError: () => {
      toast.error("Failed to update vehicle");
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle deleted");
    },
    onError: () => {
      toast.error("Failed to delete vehicle");
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: (data) => base44.entities.VehicleMaintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance scheduled!");
      setShowMaintenanceForm(false);
      resetMaintenanceForm();
    },
    onError: () => {
      toast.error("Failed to schedule maintenance");
    },
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VehicleMaintenance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      toast.success("Maintenance updated!");
    },
    onError: () => {
      toast.error("Failed to update maintenance");
    },
  });

  const createFuelLogMutation = useMutation({
    mutationFn: (data) => base44.entities.FuelLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuelLogs"] });
      toast.success("Fuel log added!");
      setShowFuelForm(false);
      resetFuelForm();
    },
    onError: () => {
      toast.error("Failed to add fuel log");
    },
  });

  const resetVehicleForm = useCallback(() => {
    setVehicleFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      license_plate: "",
      vin: "",
      color: "",
      transmission: "manual",
      fuel_type: "petrol",
      category: "B",
      mileage: 0,
      insurance_expiry: "",
      mot_expiry: "",
      tax_expiry: "",
      assigned_instructor_id: "",
      notes: "",
    });
  }, []);

  const resetMaintenanceForm = useCallback(() => {
    setMaintenanceFormData({
      maintenance_type: "service",
      description: "",
      scheduled_date: format(new Date(), "yyyy-MM-dd"),
      cost: 0,
      vendor: "",
      notes: "",
    });
  }, []);

  const resetFuelForm = useCallback(() => {
    setFuelFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      fuel_type: "petrol",
      fuel_amount_liters: 0,
      fuel_cost: 0,
      odometer_reading: 0,
      fuel_station: "",
      payment_method: "card",
      notes: "",
    });
  }, []);

  const handleVehicleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const data = {
        ...vehicleFormData,
        is_available: true,
        is_active: true,
      };

      if (editingVehicle) {
        updateVehicleMutation.mutate({ id: editingVehicle.id, data });
      } else {
        createVehicleMutation.mutate(data);
      }
    },
    [vehicleFormData, editingVehicle, createVehicleMutation, updateVehicleMutation]
  );

  const handleMaintenanceSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (!selectedVehicle) return;

      createMaintenanceMutation.mutate({
        ...maintenanceFormData,
        vehicle_id: selectedVehicle.id,
        school_id: selectedVehicle.school_id,
        status: "scheduled",
      });
    },
    [maintenanceFormData, selectedVehicle, createMaintenanceMutation]
  );

  const handleFuelSubmit = useCallback(
    (e) => {
      e.preventDefault();

      if (!selectedVehicle) return;

      createFuelLogMutation.mutate({
        ...fuelFormData,
        vehicle_id: selectedVehicle.id,
        school_id: selectedVehicle.school_id,
      });

      if (fuelFormData.odometer_reading > selectedVehicle.mileage) {
        updateVehicleMutation.mutate({
          id: selectedVehicle.id,
          data: { mileage: fuelFormData.odometer_reading },
        });
      }
    },
    [fuelFormData, selectedVehicle, createFuelLogMutation, updateVehicleMutation]
  );

  const handleCompleteMaintenance = useCallback(
    (maintenanceId) => {
      updateMaintenanceMutation.mutate({
        id: maintenanceId,
        data: {
          status: "completed",
          completed_date: new Date().toISOString(),
        },
      });
    },
    [updateMaintenanceMutation]
  );

  const handleEditVehicle = useCallback((vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year || new Date().getFullYear(),
      license_plate: vehicle.license_plate,
      vin: vehicle.vin || "",
      color: vehicle.color || "",
      transmission: vehicle.transmission,
      fuel_type: vehicle.fuel_type,
      category: vehicle.category,
      mileage: vehicle.mileage,
      insurance_expiry: vehicle.insurance_expiry || "",
      mot_expiry: vehicle.mot_expiry || "",
      tax_expiry: vehicle.tax_expiry || "",
      assigned_instructor_id: vehicle.assigned_instructor_id || "",
      notes: vehicle.notes || "",
    });
    setShowVehicleForm(true);
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.license_plate.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "available" && v.is_available) ||
        (filterStatus === "in_use" && !v.is_available);
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, filterStatus]);

  const overdueMaintenance = useMemo(
    () =>
      maintenance.filter(
        (m) => m.status === "scheduled" && isBefore(parseISO(m.scheduled_date), new Date())
      ),
    [maintenance]
  );

  const upcomingMaintenance = useMemo(
    () =>
      maintenance.filter(
        (m) =>
          m.status === "scheduled" &&
          isAfter(parseISO(m.scheduled_date), new Date()) &&
          differenceInDays(parseISO(m.scheduled_date), new Date()) <= 14
      ),
    [maintenance]
  );

  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.is_available).length;
    const totalMileage = vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0);
    const totalFuelCost = fuelLogs.reduce((sum, l) => sum + (l.fuel_cost || 0), 0);
    const totalMaintenanceCost = maintenance
      .filter((m) => m.status === "completed")
      .reduce((sum, m) => sum + (m.cost || 0), 0);

    return {
      totalVehicles,
      availableVehicles,
      totalMileage,
      totalFuelCost,
      totalMaintenanceCost,
      overdueCount: overdueMaintenance.length,
    };
  }, [vehicles, fuelLogs, maintenance, overdueMaintenance]);

  if (loadingVehicles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600 font-medium">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Fleet Management</h1>
          <p className="text-zinc-600 mt-1">Manage vehicles, maintenance, and fuel logs</p>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            resetVehicleForm();
            setShowVehicleForm(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle
        </button>
      </motion.header>

      {overdueMaintenance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Overdue Maintenance</p>
            <p className="text-sm text-red-700">
              {overdueMaintenance.length} vehicle{overdueMaintenance.length > 1 ? "s" : ""} need
              immediate attention
            </p>
          </div>
          <button
            onClick={() => setActiveTab("maintenance")}
            className="ml-auto px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            View Details
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Car className="w-5 h-5 text-indigo-600" />}
          label="Total Vehicles"
          value={stats.totalVehicles}
          color="bg-indigo-50"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          label="Available"
          value={stats.availableVehicles}
          subValue={`${((stats.availableVehicles / stats.totalVehicles) * 100 || 0).toFixed(0)}% of fleet`}
          color="bg-emerald-50"
        />
        <StatCard
          icon={<Gauge className="w-5 h-5 text-blue-600" />}
          label="Total Mileage"
          value={`${(stats.totalMileage / 1000).toFixed(0)}k km`}
          color="bg-blue-50"
        />
        <StatCard
          icon={<Droplet className="w-5 h-5 text-cyan-600" />}
          label="Fuel Costs"
          value={`€${stats.totalFuelCost.toFixed(0)}`}
          color="bg-cyan-50"
        />
        <StatCard
          icon={<Wrench className="w-5 h-5 text-amber-600" />}
          label="Maintenance"
          value={`€${stats.totalMaintenanceCost.toFixed(0)}`}
          color="bg-amber-50"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="Overdue"
          value={stats.overdueCount}
          color="bg-red-50"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-2">
        <div className="flex flex-wrap gap-2">
          {["vehicles", "maintenance", "fuel", "analytics"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "vehicles" && (
          <motion.div
            key="vehicles"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                {["all", "available", "in_use"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
                      filterStatus === status
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {filteredVehicles.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <Car className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-600 mb-4">
                  {vehicles.length === 0
                    ? "No vehicles yet. Add your first vehicle!"
                    : "No vehicles match your search."}
                </p>
                {vehicles.length === 0 && (
                  <button
                    onClick={() => setShowVehicleForm(true)}
                    className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    Add Vehicle
                  </button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle, index) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    instructor={instructors.find((i) => i.id === vehicle.assigned_instructor_id)}
                    maintenanceCount={maintenance.filter((m) => m.vehicle_id === vehicle.id).length}
                    onSelect={() => setSelectedVehicle(vehicle)}
                    onMaintenance={() => {
                      setSelectedVehicle(vehicle);
                      setShowMaintenanceForm(true);
                    }}
                    onFuel={() => {
                      setSelectedVehicle(vehicle);
                      setFuelFormData((p) => ({ ...p, odometer_reading: vehicle.mileage }));
                      setShowFuelForm(true);
                    }}
                    onEdit={() => handleEditVehicle(vehicle)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "maintenance" && (
          <motion.div
            key="maintenance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {overdueMaintenance.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue ({overdueMaintenance.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {overdueMaintenance.map((m, index) => (
                    <MaintenanceCard
                      key={m.id}
                      maintenance={m}
                      vehicle={vehicles.find((v) => v.id === m.vehicle_id)}
                      onComplete={() => handleCompleteMaintenance(m.id)}
                      onEdit={() => {}}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingMaintenance.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming ({upcomingMaintenance.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {upcomingMaintenance.map((m, index) => (
                    <MaintenanceCard
                      key={m.id}
                      maintenance={m}
                      vehicle={vehicles.find((v) => v.id === m.vehicle_id)}
                      onComplete={() => handleCompleteMaintenance(m.id)}
                      onEdit={() => {}}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-4">All Maintenance Records</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {maintenance.map((m, index) => (
                  <MaintenanceCard
                    key={m.id}
                    maintenance={m}
                    vehicle={vehicles.find((v) => v.id === m.vehicle_id)}
                    onComplete={() => handleCompleteMaintenance(m.id)}
                    onEdit={() => {}}
                    index={index}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "fuel" && (
          <motion.div
            key="fuel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {fuelLogs.map((log, index) => {
              const vehicleLogs = fuelLogs
                .filter((l) => l.vehicle_id === log.vehicle_id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const currentIndex = vehicleLogs.findIndex((l) => l.id === log.id);
              const previousLog = vehicleLogs[currentIndex + 1];

              return (
                <FuelLogCard
                  key={log.id}
                  log={log}
                  vehicle={vehicles.find((v) => v.id === log.vehicle_id)}
                  previousLog={previousLog}
                  index={index}
                />
              );
            })}
          </motion.div>
        )}

        {activeTab === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900 mb-6">Fleet Overview</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                    <Car className="w-10 h-10 text-indigo-600" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{stats.totalVehicles}</p>
                  <p className="text-sm text-zinc-500">Total Vehicles</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-10 h-10 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {((stats.availableVehicles / stats.totalVehicles) * 100 || 0).toFixed(0)}%
                  </p>
                  <p className="text-sm text-zinc-500">Availability Rate</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <Gauge className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    {(stats.totalMileage / stats.totalVehicles / 1000 || 0).toFixed(0)}k
                  </p>
                  <p className="text-sm text-zinc-500">Avg Mileage/Vehicle</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-10 h-10 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">
                    €{((stats.totalFuelCost + stats.totalMaintenanceCost) / stats.totalVehicles || 0).toFixed(0)}
                  </p>
                  <p className="text-sm text-zinc-500">Cost/Vehicle</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">Cost Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-zinc-700">Fuel</span>
                    </div>
                    <span className="font-semibold">€{stats.totalFuelCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-zinc-700">Maintenance</span>
                    </div>
                    <span className="font-semibold">€{stats.totalMaintenanceCost.toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                    <span className="font-medium text-zinc-900">Total</span>
                    <span className="font-bold text-lg">
                      €{(stats.totalFuelCost + stats.totalMaintenanceCost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 mb-4">Vehicle Status</h3>
                <div className="space-y-4">
                  {vehicles.slice(0, 5).map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Car className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 text-sm">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-zinc-500">{vehicle.license_plate}</p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.is_available
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {vehicle.is_available ? "Available" : "In Use"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showVehicleForm}
        onClose={() => {
          setShowVehicleForm(false);
          setEditingVehicle(null);
          resetVehicleForm();
        }}
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
      >
        <form onSubmit={handleVehicleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Make" required>
              <Input
                value={vehicleFormData.make}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, make: e.target.value }))}
                placeholder="e.g., Ford"
                required
              />
            </FormField>
            <FormField label="Model" required>
              <Input
                value={vehicleFormData.model}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, model: e.target.value }))}
                placeholder="e.g., Fiesta"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Year">
              <Input
                type="number"
                value={vehicleFormData.year}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, year: parseInt(e.target.value) }))}
                min={1990}
                max={new Date().getFullYear() + 1}
              />
            </FormField>
            <FormField label="License Plate" required>
              <Input
                value={vehicleFormData.license_plate}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, license_plate: e.target.value.toUpperCase() }))}
                placeholder="e.g., AB12 CDE"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Transmission" required>
              <Select
                value={vehicleFormData.transmission}
                onChange={(value) => setVehicleFormData((p) => ({ ...p, transmission: value }))}
                options={[
                  { value: "manual", label: "Manual" },
                  { value: "automatic", label: "Automatic" },
                ]}
              />
            </FormField>
            <FormField label="Fuel Type" required>
              <Select
                value={vehicleFormData.fuel_type}
                onChange={(value) => setVehicleFormData((p) => ({ ...p, fuel_type: value }))}
                options={[
                  { value: "petrol", label: "Petrol" },
                  { value: "diesel", label: "Diesel" },
                  { value: "electric", label: "Electric" },
                  { value: "hybrid", label: "Hybrid" },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <Select
                value={vehicleFormData.category}
                onChange={(value) => setVehicleFormData((p) => ({ ...p, category: value }))}
                options={[
                  { value: "B", label: "Category B" },
                  { value: "B+E", label: "Category B+E" },
                  { value: "C", label: "Category C" },
                  { value: "D", label: "Category D" },
                ]}
              />
            </FormField>
            <FormField label="Current Mileage (km)">
              <Input
                type="number"
                value={vehicleFormData.mileage}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, mileage: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="MOT Expiry">
              <Input
                type="date"
                value={vehicleFormData.mot_expiry}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, mot_expiry: e.target.value }))}
              />
            </FormField>
            <FormField label="Insurance Expiry">
              <Input
                type="date"
                value={vehicleFormData.insurance_expiry}
                onChange={(e) => setVehicleFormData((p) => ({ ...p, insurance_expiry: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Assigned Instructor">
            <Select
              value={vehicleFormData.assigned_instructor_id}
              onChange={(value) => setVehicleFormData((p) => ({ ...p, assigned_instructor_id: value }))}
              options={[
                { value: "", label: "Not assigned" },
                ...instructors.map((i) => ({ value: i.id, label: i.full_name })),
              ]}
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              value={vehicleFormData.notes}
              onChange={(e) => setVehicleFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </FormField>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {createVehicleMutation.isPending || updateVehicleMutation.isPending
                ? "Saving..."
                : editingVehicle
                ? "Update Vehicle"
                : "Add Vehicle"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowVehicleForm(false);
                setEditingVehicle(null);
                resetVehicleForm();
              }}
              className="px-6 py-3 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showMaintenanceForm}
        onClose={() => {
          setShowMaintenanceForm(false);
          resetMaintenanceForm();
        }}
        title="Schedule Maintenance"
      >
        {selectedVehicle && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-50 flex items-center gap-3">
            <Car className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="font-semibold text-zinc-900">
                {selectedVehicle.make} {selectedVehicle.model}
              </p>
              <p className="text-sm text-zinc-500">{selectedVehicle.license_plate}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleMaintenanceSubmit} className="space-y-5">
          <FormField label="Maintenance Type" required>
            <Select
              value={maintenanceFormData.maintenance_type}
              onChange={(value) => setMaintenanceFormData((p) => ({ ...p, maintenance_type: value }))}
              options={MAINTENANCE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              required
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={maintenanceFormData.description}
              onChange={(e) => setMaintenanceFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Details about the maintenance..."
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scheduled Date" required>
              <Input
                type="date"
                value={maintenanceFormData.scheduled_date}
                onChange={(e) => setMaintenanceFormData((p) => ({ ...p, scheduled_date: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Estimated Cost (€)">
              <Input
                type="number"
                value={maintenanceFormData.cost || ""}
                onChange={(e) => setMaintenanceFormData((p) => ({ ...p, cost: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min={0}
                placeholder="0.00"
              />
            </FormField>
          </div>

          <FormField label="Vendor/Garage">
            <Input
              value={maintenanceFormData.vendor}
              onChange={(e) => setMaintenanceFormData((p) => ({ ...p, vendor: e.target.value }))}
              placeholder="Garage name or location"
            />
          </FormField>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMaintenanceMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {createMaintenanceMutation.isPending ? "Scheduling..." : "Schedule Maintenance"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMaintenanceForm(false);
                resetMaintenanceForm();
              }}
              className="px-6 py-3 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showFuelForm}
        onClose={() => {
          setShowFuelForm(false);
          resetFuelForm();
        }}
        title="Add Fuel Log"
      >
        {selectedVehicle && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-50 flex items-center gap-3">
            <Car className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="font-semibold text-zinc-900">
                {selectedVehicle.make} {selectedVehicle.model}
              </p>
              <p className="text-sm text-zinc-500">{selectedVehicle.license_plate}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleFuelSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={fuelFormData.date}
                onChange={(e) => setFuelFormData((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Fuel Type" required>
              <Select
                value={fuelFormData.fuel_type}
                onChange={(value) => setFuelFormData((p) => ({ ...p, fuel_type: value }))}
                options={[
                  { value: "petrol", label: "Petrol" },
                  { value: "diesel", label: "Diesel" },
                  { value: "electric", label: "Electric" },
                ]}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (Liters)" required>
              <Input
                type="number"
                value={fuelFormData.fuel_amount_liters || ""}
                onChange={(e) => setFuelFormData((p) => ({ ...p, fuel_amount_liters: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min={0}
                placeholder="0.00"
                required
              />
            </FormField>
            <FormField label="Total Cost (€)" required>
              <Input
                type="number"
                value={fuelFormData.fuel_cost || ""}
                onChange={(e) => setFuelFormData((p) => ({ ...p, fuel_cost: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                min={0}
                placeholder="0.00"
                required
              />
            </FormField>
          </div>

          <FormField label="Odometer Reading (km)" required>
            <Input
              type="number"
              value={fuelFormData.odometer_reading || ""}
              onChange={(e) => setFuelFormData((p) => ({ ...p, odometer_reading: parseInt(e.target.value) || 0 }))}
              min={selectedVehicle?.mileage || 0}
              placeholder="Current odometer"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fuel Station">
              <Input
                value={fuelFormData.fuel_station}
                onChange={(e) => setFuelFormData((p) => ({ ...p, fuel_station: e.target.value }))}
                placeholder="Station name"
              />
            </FormField>
            <FormField label="Payment Method">
              <Select
                value={fuelFormData.payment_method}
                onChange={(value) => setFuelFormData((p) => ({ ...p, payment_method: value }))}
                options={[
                  { value: "card", label: "Card" },
                  { value: "cash", label: "Cash" },
                  { value: "fuel_card", label: "Fuel Card" },
                ]}
              />
            </FormField>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createFuelLogMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {createFuelLogMutation.isPending ? "Adding..." : "Add Fuel Log"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFuelForm(false);
                resetFuelForm();
              }}
              className="px-6 py-3 rounded-xl border border-zinc-200 font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}