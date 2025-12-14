import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import {
  Settings as SettingsIcon,
  Building2,
  Globe,
  Bell,
  CreditCard,
  Save,
  BookOpen,
  Users,
  Lock,
  Mail,
  Smartphone,
  Shield,
  Clock,
  Calendar,
  DollarSign,
  Palette,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Plus,
  Edit,
  Copy,
  ExternalLink,
  Key,
  Database,
  Server,
  Zap,
  Activity,
  BarChart3,
  MapPin,
  Phone,
  Image,
  Link2,
  Tag,
  Hash,
  Percent,
  Timer,
  Car,
  GraduationCap,
  HelpCircle,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  MoreVertical,
  Sun,
  Moon,
  Monitor,
  Flag,
  Sparkles,
  TrendingUp,
  Award,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  Search,
  Filter,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Layers,
  Target,
  Fingerprint,
  Share2,
  FileCode,
  Webhook,
  TestTube,
  CircleDot,
  AlertTriangle,
  BadgeCheck,
  Crown,
  Rocket,
  Gift,
  Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCountryConfig, getCountryOptions, shouldShowAnts } from "@/components/utils/localisation";
import { useTranslation } from "@/components/utils/i18n";
import { APP_CONFIG } from "@/components/utils/config";
import { Link } from "react-router-dom";

// Premium easing
const easing = [0.22, 1, 0.36, 1];

// Tab configuration
const TABS_CONFIG = [
  { id: "general", icon: Building2, color: "indigo" },
  { id: "booking", icon: Calendar, color: "blue" },
  { id: "payments", icon: CreditCard, color: "emerald" },
  { id: "notifications", icon: Bell, color: "amber" },
  { id: "modules", icon: Layers, color: "violet" },
  { id: "branding", icon: Palette, color: "pink" },
  { id: "integrations", icon: Zap, color: "orange" },
  { id: "security", icon: Shield, color: "slate" },
  { id: "billing", icon: Crown, color: "yellow" },
];

// Default settings
const DEFAULT_BOOKING_SETTINGS = {
  min_notice_hours: 24,
  max_advance_days: 30,
  cancellation_hours: 24,
  default_lesson_duration: 60,
  allow_online_booking: true,
  require_payment_upfront: false,
  buffer_between_lessons: 15,
  auto_confirm_bookings: false,
  allow_recurring_bookings: true,
  max_bookings_per_day: 10,
  show_instructor_preference: true,
  allow_package_booking: true,
};

const DEFAULT_PAYMENT_SETTINGS = {
  accept_cash: true,
  accept_card: true,
  accept_bank_transfer: true,
  payment_terms_days: 14,
  late_fee_percentage: 5,
  tax_rate: 20,
  stripe_enabled: false,
  auto_invoice: true,
  send_payment_reminders: true,
  reminder_days_before: 3,
  partial_payments: true,
  minimum_deposit_percent: 25,
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  email_booking_confirmation: true,
  email_booking_reminder: true,
  email_booking_cancellation: true,
  email_payment_received: true,
  email_payment_reminder: true,
  email_lesson_report: false,
  email_weekly_summary: true,
  sms_booking_confirmation: false,
  sms_booking_reminder: true,
  sms_booking_cancellation: true,
  sms_lesson_starting: true,
  reminder_hours_before: 24,
  sms_reminder_hours_before: 2,
  push_notifications: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

const DEFAULT_MODULE_SETTINGS = {
  enable_marketplace: true,
  enable_elearning: true,
  enable_notifications: true,
  enable_online_payments: true,
  enable_student_portal: true,
  enable_instructor_app: true,
  enable_fleet_management: false,
  enable_reporting: true,
  enable_crm: true,
  enable_referrals: false,
  enable_gift_cards: false,
  enable_waitlist: true,
};

const DEFAULT_BRANDING = {
  primary_color: "#4F46E5",
  secondary_color: "#7C3AED",
  accent_color: "#10B981",
  email_signature: "",
  booking_page_message: "Book your driving lesson today!",
  logo_url: "",
  favicon_url: "",
  custom_domain: "",
  show_powered_by: true,
};

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ==================== COMPONENTS ====================

// Premium Toggle Switch
const ToggleSwitch = ({ checked, onChange, disabled, size = "md" }) => {
  const sizes = {
    sm: { track: "h-5 w-9", thumb: "h-3.5 w-3.5", translate: "translate-x-4" },
    md: { track: "h-6 w-11", thumb: "h-4 w-4", translate: "translate-x-5" },
    lg: { track: "h-7 w-14", thumb: "h-5 w-5", translate: "translate-x-7" },
  };
  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex ${s.track} items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] focus:ring-offset-2 ${
        checked 
          ? "bg-gradient-to-r from-[#3b82c4] to-[#6c376f]" 
          : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`inline-block ${s.thumb} transform rounded-full bg-white shadow-md ${
          checked ? s.translate : "translate-x-1"
        }`}
      />
    </button>
  );
};

// Setting Card with expandable content - defined outside main component to prevent hook ordering issues
const SettingCardInner = ({ 
  icon: Icon, 
  iconColor = "indigo",
  title, 
  description, 
  badge,
  badgeColor = "emerald",
  children, 
  action,
  expandable = false,
  defaultExpanded = true,
  status,
  onStatusChange,
  expanded,
  onToggleExpanded
}) => {
  const colorMap = {
    indigo: "bg-indigo-100 text-indigo-600",
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    violet: "bg-violet-100 text-violet-600",
    pink: "bg-pink-100 text-pink-600",
    orange: "bg-orange-100 text-orange-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-600",
  };

  const badgeColorMap = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    violet: "bg-violet-100 text-violet-700",
  };

  const isExpanded = expandable ? expanded : true;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div 
        className={`flex items-start gap-4 p-5 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && onToggleExpanded && onToggleExpanded()}
      >
        <div className={`w-11 h-11 rounded-xl ${colorMap[iconColor]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColorMap[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {status !== undefined && onStatusChange && (
            <ToggleSwitch checked={status} onChange={onStatusChange} />
          )}
          {action}
          {expandable && (
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>
      </div>
      
      {isExpanded && children && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-slate-100 pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper component that manages its own state
const SettingCard = (props) => {
  const [expanded, setExpanded] = React.useState(props.defaultExpanded !== false);
  
  return (
    <SettingCardInner
      {...props}
      expanded={expanded}
      onToggleExpanded={() => setExpanded(e => !e)}
    />
  );
};

// Compact setting row
const SettingRow = ({ icon: Icon, label, description, children, highlight = false }) => (
  <div className={`flex items-center justify-between gap-4 p-4 rounded-xl transition-colors ${
    highlight ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 hover:bg-slate-100'
  }`}>
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          highlight ? 'bg-indigo-100' : 'bg-white border border-slate-200'
        }`}>
          <Icon className={`w-4 h-4 ${highlight ? 'text-indigo-600' : 'text-slate-500'}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium text-slate-800 text-sm">{label}</p>
        {description && <p className="text-xs text-slate-500 truncate">{description}</p>}
      </div>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// Form Input with label
const FormInput = ({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  icon: Icon, 
  suffix, 
  helpText,
  error,
  required
}) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className={`w-full h-11 px-4 rounded-xl border-2 text-sm font-medium transition-all outline-none ${
          Icon ? "pl-10" : ""
        } ${suffix ? "pr-14" : ""} ${
          error 
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100" 
            : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        }`}
        placeholder={placeholder}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium bg-slate-100 px-2 py-0.5 rounded">
          {suffix}
        </div>
      )}
    </div>
    {helpText && <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>}
    {error && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

// Select Input
const SelectInput = ({ label, value, onChange, options, helpText }) => (
  <div>
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 appearance-none bg-white text-sm font-medium outline-none transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
    {helpText && <p className="text-xs text-slate-500 mt-1.5">{helpText}</p>}
  </div>
);

// Section Header
const SectionHeader = ({ title, description, action, icon: Icon }) => (
  <div className="flex items-start justify-between mb-5">
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
      )}
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Save Button
const SaveButton = ({ onClick, loading, disabled, hasChanges }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={loading || disabled}
    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
      hasChanges 
        ? "bg-gradient-to-r from-[#3b82c4] to-[#6c376f] hover:from-[#2563a3] hover:to-[#5a2d5d] text-white shadow-sm" 
        : "bg-slate-100 text-slate-400 cursor-not-allowed"
    }`}
  >
    {loading ? (
      <RefreshCw className="w-4 h-4 animate-spin" />
    ) : (
      <Save className="w-4 h-4" />
    )}
    {loading ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
  </motion.button>
);

// Quick Stats Card
const QuickStat = ({ icon: Icon, label, value, trend, color = "indigo" }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-bold text-slate-900">{value}</p>
          {trend && (
            <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Integration Card
const IntegrationCard = ({ 
  name, 
  description, 
  logo, 
  logoColor, 
  connected, 
  onConnect, 
  onDisconnect,
  comingSoon,
  popular 
}) => (
  <div className={`p-4 rounded-xl border-2 transition-all ${
    connected ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'
  }`}>
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl ${logoColor} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-lg">{logo}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900">{name}</h4>
          {popular && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">POPULAR</span>
          )}
          {connected && (
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> CONNECTED
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">
        {comingSoon ? (
          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg">Coming Soon</span>
        ) : connected ? (
          <button 
            onClick={onDisconnect}
            className="px-3 py-1.5 border-2 border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
          >
            Disconnect
          </button>
        ) : (
          <button 
            onClick={onConnect}
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  </div>
);

// Module Card
const ModuleCard = ({ 
  icon: Icon, 
  name, 
  description, 
  enabled, 
  onToggle, 
  features,
  premium,
  isNew 
}) => (
  <div className={`p-5 rounded-2xl border-2 transition-all ${
    enabled 
      ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-violet-50/50' 
      : 'border-slate-200 bg-white hover:border-slate-300'
  }`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        enabled ? 'bg-indigo-100' : 'bg-slate-100'
      }`}>
        <Icon className={`w-6 h-6 ${enabled ? 'text-indigo-600' : 'text-slate-400'}`} />
      </div>
      <div className="flex items-center gap-2">
        {isNew && (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">NEW</span>
        )}
        {premium && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded flex items-center gap-1">
            <Crown className="w-3 h-3" /> PRO
          </span>
        )}
        <ToggleSwitch checked={enabled} onChange={onToggle} size="sm" />
      </div>
    </div>
    <h4 className={`font-semibold ${enabled ? 'text-slate-900' : 'text-slate-600'}`}>{name}</h4>
    <p className="text-sm text-slate-500 mt-1">{description}</p>
    {features && enabled && (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          {features.map((f, i) => (
            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Business Hours Editor
const BusinessHoursEditor = ({ hours, onChange }) => {
  const updateDay = (day, field, value) => {
    onChange({
      ...hours,
      [day]: { ...hours[day], [field]: value }
    });
  };

  const copyToAll = (sourceDay) => {
    const sourceHours = hours[sourceDay];
    const updated = {};
    DAYS_OF_WEEK.forEach(day => {
      updated[day] = { ...sourceHours };
    });
    onChange(updated);
    toast.success(`Copied ${sourceDay}'s hours to all days`);
  };

  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map((day) => (
        <div
          key={day}
          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
            hours[day]?.closed ? "bg-slate-50" : "bg-white border border-slate-200"
          }`}
        >
          <span className="w-24 font-semibold text-slate-700 capitalize text-sm">{day}</span>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!hours[day]?.closed}
              onChange={(e) => updateDay(day, "closed", !e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-600">Open</span>
          </label>

          {!hours[day]?.closed ? (
            <>
              <input
                type="time"
                value={hours[day]?.open || "09:00"}
                onChange={(e) => updateDay(day, "open", e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="time"
                value={hours[day]?.close || "18:00"}
                onChange={(e) => updateDay(day, "close", e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => copyToAll(day)}
                className="ml-auto p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                title="Copy to all days"
              >
                <Copy className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-400 italic">Closed</span>
          )}
        </div>
      ))}
    </div>
  );
};

// Color Picker
const ColorPicker = ({ label, value, onChange, presets = [] }) => {
  const defaultPresets = ["#4F46E5", "#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#1E293B"];
  const colors = presets.length > 0 ? presets : defaultPresets;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 p-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onChange(color)}
                className={`w-8 h-8 rounded-lg transition-all ${
                  value === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-mono"
            placeholder="#4F46E5"
          />
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export default function Settings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Settings state
  const [schoolSettings, setSchoolSettings] = useState({
    name: "", email: "", phone: "", address: "", city: "", country: "",
    postal_code: "", website: "", tax_id: "", currency: "EUR",
    timezone: "Europe/London", description: "", operating_country: "FR",
  });
  const [bookingSettings, setBookingSettings] = useState(DEFAULT_BOOKING_SETTINGS);
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [moduleSettings, setModuleSettings] = useState(DEFAULT_MODULE_SETTINGS);
  const [brandingSettings, setBrandingSettings] = useState(DEFAULT_BRANDING);
  const [businessHours, setBusinessHours] = useState({});

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  // Fetch schools
  const { data: schools = [], isLoading: loadingSchools } = useQuery({
    queryKey: ["schools"],
    queryFn: () => base44.entities.School.list(),
  });

  const currentSchool = schools[0];

  // Initialize from school data
  useEffect(() => {
    if (currentSchool) {
      setSchoolSettings({
        name: currentSchool.name || "",
        email: currentSchool.email || "",
        phone: currentSchool.phone || "",
        address: currentSchool.address || "",
        city: currentSchool.city || "",
        country: currentSchool.country || "",
        postal_code: currentSchool.postal_code || "",
        website: currentSchool.website || "",
        tax_id: currentSchool.tax_id || "",
        currency: currentSchool.currency || "EUR",
        timezone: currentSchool.timezone || "Europe/London",
        description: currentSchool.description || "",
        operating_country: currentSchool.operating_country || "FR",
      });

      if (currentSchool.booking_settings) {
        setBookingSettings({ ...DEFAULT_BOOKING_SETTINGS, ...currentSchool.booking_settings });
      }
      if (currentSchool.payment_settings) {
        setPaymentSettings({ ...DEFAULT_PAYMENT_SETTINGS, ...currentSchool.payment_settings });
      }
      if (currentSchool.branding) {
        setBrandingSettings({ ...DEFAULT_BRANDING, ...currentSchool.branding });
      }
      if (currentSchool.business_hours) {
        setBusinessHours(currentSchool.business_hours);
      } else {
        const defaultHours = {};
        DAYS_OF_WEEK.forEach((day) => {
          defaultHours[day] = { open: "09:00", close: "18:00", closed: day === "sunday" };
        });
        setBusinessHours(defaultHours);
      }
    }
  }, [currentSchool]);

  // Update mutation
  const updateSchoolMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentSchool?.id) throw new Error("No school found");
      return base44.entities.School.update(currentSchool.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  // Save handlers
  const handleSave = useCallback(async (data) => {
    setIsSaving(true);
    try {
      await updateSchoolMutation.mutateAsync(data);
    } finally {
      setIsSaving(false);
    }
  }, [updateSchoolMutation]);

  // Mark changes
  const markChanged = useCallback(() => setHasChanges(true), []);

  // Build tabs with translations
  const TABS = useMemo(() => TABS_CONFIG.map(tab => ({
    ...tab,
    label: t(`settings.tabs.${tab.id}`) || tab.id.charAt(0).toUpperCase() + tab.id.slice(1),
  })), [t]);

  if (loadingSchools) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3b82c4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b82c4] to-[#6c376f] flex items-center justify-center shadow-sm">
              <SettingsIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] bg-clip-text text-transparent">Settings</h1>
              <p className="text-slate-500">Manage your school configuration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <>
                <div className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Version</p>
                  <p className="text-sm font-bold text-slate-900">{APP_CONFIG.APP_VERSION}</p>
                </div>
                <Link
                  to={createPageUrl("ProductionStatus")}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Production Status
                </Link>
              </>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#a9d5ed] focus:border-[#3b82c4]"
              />
            </div>
            <SaveButton onClick={() => handleSave({ ...schoolSettings, business_hours: businessHours })} loading={isSaving} hasChanges={hasChanges} />
          </div>
        </motion.header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.nav
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-56 flex-shrink-0"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sticky top-6">
              <div className="space-y-1">
                {TABS.map((tab) => {
                  const colorMap = {
                    indigo: "bg-[#e8f4fa] text-[#3b82c4] border-[#d4eaf5]",
                    blue: "bg-blue-50 text-blue-700 border-blue-200",
                    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    amber: "bg-amber-50 text-amber-700 border-amber-200",
                    violet: "bg-violet-50 text-violet-700 border-violet-200",
                    pink: "bg-pink-50 text-pink-700 border-pink-200",
                    orange: "bg-orange-50 text-orange-700 border-orange-200",
                    slate: "bg-slate-100 text-slate-700 border-slate-200",
                    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
                  };
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all ${
                        isActive
                          ? `${colorMap[tab.color]} border`
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 ${isActive ? '' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.nav>

          {/* Main Content */}
          <motion.main
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-w-0 space-y-6 pb-24 lg:pb-8"
          >
            <AnimatePresence mode="wait">
              {/* GENERAL TAB */}
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  {/* Operating Country - Highlighted */}
                  <SettingCard
                    icon={Flag}
                    iconColor="indigo"
                    title="Operating Location"
                    description="Your primary country determines tax rules, currency, and regional features"
                    badge="Important"
                    badgeColor="amber"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectInput
                        label="Operating Country"
                        value={schoolSettings.operating_country}
                        onChange={(v) => {
                          const config = getCountryConfig(v);
                          setSchoolSettings(p => ({ ...p, operating_country: v, currency: config.currency }));
                          markChanged();
                        }}
                        options={getCountryOptions().map(c => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
                      />
                      <SelectInput
                        label="Currency"
                        value={schoolSettings.currency}
                        onChange={(v) => { setSchoolSettings(p => ({ ...p, currency: v })); markChanged(); }}
                        options={[
                          { value: "EUR", label: "EUR (€)" },
                          { value: "GBP", label: "GBP (£)" },
                          { value: "USD", label: "USD ($)" },
                        ]}
                      />
                    </div>
                    
                    {/* Country-specific features */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-slate-800 text-sm">
                          {getCountryConfig(schoolSettings.operating_country).name} Features
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getCountryConfig(schoolSettings.operating_country).usesVat && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg">
                            VAT {(getCountryConfig(schoolSettings.operating_country).defaultVatRate * 100)}%
                          </span>
                        )}
                        {shouldShowAnts(schoolSettings.operating_country) && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                            ANTS Integration
                          </span>
                        )}
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                          {getCountryConfig(schoolSettings.operating_country).currency} Currency
                        </span>
                      </div>
                    </div>
                  </SettingCard>

                  {/* School Information */}
                  <SettingCard
                    icon={Building2}
                    iconColor="blue"
                    title="School Information"
                    description="Basic details about your driving school"
                    expandable
                    defaultExpanded={true}
                  >
                    <div className="space-y-4">
                      <FormInput
                        label="School Name"
                        value={schoolSettings.name}
                        onChange={(v) => { setSchoolSettings(p => ({ ...p, name: v })); markChanged(); }}
                        placeholder="ABC Driving School"
                        icon={Building2}
                        required
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                          label="Email"
                          type="email"
                          value={schoolSettings.email}
                          onChange={(v) => { setSchoolSettings(p => ({ ...p, email: v })); markChanged(); }}
                          placeholder="contact@school.com"
                          icon={Mail}
                        />
                        <FormInput
                          label="Phone"
                          type="tel"
                          value={schoolSettings.phone}
                          onChange={(v) => { setSchoolSettings(p => ({ ...p, phone: v })); markChanged(); }}
                          placeholder="+44 123 456 7890"
                          icon={Phone}
                        />
                      </div>

                      <FormInput
                        label="Website"
                        type="url"
                        value={schoolSettings.website}
                        onChange={(v) => { setSchoolSettings(p => ({ ...p, website: v })); markChanged(); }}
                        placeholder="https://www.yourschool.com"
                        icon={Globe}
                      />

                      <FormInput
                        label="Address"
                        value={schoolSettings.address}
                        onChange={(v) => { setSchoolSettings(p => ({ ...p, address: v })); markChanged(); }}
                        placeholder="123 Main Street"
                        icon={MapPin}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInput
                          label="City"
                          value={schoolSettings.city}
                          onChange={(v) => { setSchoolSettings(p => ({ ...p, city: v })); markChanged(); }}
                          placeholder="London"
                        />
                        <FormInput
                          label="Postal Code"
                          value={schoolSettings.postal_code}
                          onChange={(v) => { setSchoolSettings(p => ({ ...p, postal_code: v })); markChanged(); }}
                          placeholder="SW1A 1AA"
                        />
                        <FormInput
                          label="Tax ID / VAT"
                          value={schoolSettings.tax_id}
                          onChange={(v) => { setSchoolSettings(p => ({ ...p, tax_id: v })); markChanged(); }}
                          placeholder="GB123456789"
                          icon={Hash}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                        <textarea
                          value={schoolSettings.description}
                          onChange={(e) => { setSchoolSettings(p => ({ ...p, description: e.target.value })); markChanged(); }}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none text-sm outline-none transition-all"
                          placeholder="Tell students about your driving school..."
                        />
                      </div>
                    </div>
                  </SettingCard>

                  {/* Business Hours */}
                  <SettingCard
                    icon={Clock}
                    iconColor="emerald"
                    title="Business Hours"
                    description="Set your operating hours for each day of the week"
                    expandable
                    defaultExpanded={false}
                  >
                    <BusinessHoursEditor 
                      hours={businessHours} 
                      onChange={(h) => { setBusinessHours(h); markChanged(); }} 
                    />
                  </SettingCard>
                </motion.div>
              )}

              {/* BOOKING TAB */}
              {activeTab === "booking" && (
                <motion.div
                  key="booking"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <SettingCard
                    icon={Calendar}
                    iconColor="blue"
                    title="Online Booking"
                    description="Allow students to book lessons through your website and app"
                    status={bookingSettings.allow_online_booking}
                    onStatusChange={(v) => { setBookingSettings(p => ({ ...p, allow_online_booking: v })); markChanged(); }}
                  >
                    <div className="space-y-3">
                      <SettingRow
                        icon={CheckCircle}
                        label="Auto-confirm bookings"
                        description="Automatically confirm without manual approval"
                      >
                        <ToggleSwitch
                          checked={bookingSettings.auto_confirm_bookings}
                          onChange={(v) => { setBookingSettings(p => ({ ...p, auto_confirm_bookings: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>

                      <SettingRow
                        icon={RotateCcw}
                        label="Allow recurring bookings"
                        description="Students can book weekly recurring lessons"
                      >
                        <ToggleSwitch
                          checked={bookingSettings.allow_recurring_bookings}
                          onChange={(v) => { setBookingSettings(p => ({ ...p, allow_recurring_bookings: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>

                      <SettingRow
                        icon={Users}
                        label="Show instructor preference"
                        description="Let students choose their preferred instructor"
                      >
                        <ToggleSwitch
                          checked={bookingSettings.show_instructor_preference}
                          onChange={(v) => { setBookingSettings(p => ({ ...p, show_instructor_preference: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Timer}
                    iconColor="amber"
                    title="Booking Rules"
                    description="Configure timing constraints for bookings"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Minimum Notice"
                        type="number"
                        value={bookingSettings.min_notice_hours}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, min_notice_hours: v })); markChanged(); }}
                        suffix="hours"
                        helpText="How far in advance bookings must be made"
                      />
                      <FormInput
                        label="Maximum Advance"
                        type="number"
                        value={bookingSettings.max_advance_days}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, max_advance_days: v })); markChanged(); }}
                        suffix="days"
                        helpText="How far ahead students can book"
                      />
                      <FormInput
                        label="Cancellation Notice"
                        type="number"
                        value={bookingSettings.cancellation_hours}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, cancellation_hours: v })); markChanged(); }}
                        suffix="hours"
                        helpText="Minimum notice for free cancellation"
                      />
                      <FormInput
                        label="Default Duration"
                        type="number"
                        value={bookingSettings.default_lesson_duration}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, default_lesson_duration: v })); markChanged(); }}
                        suffix="mins"
                        helpText="Standard lesson length"
                      />
                      <FormInput
                        label="Buffer Time"
                        type="number"
                        value={bookingSettings.buffer_between_lessons}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, buffer_between_lessons: v })); markChanged(); }}
                        suffix="mins"
                        helpText="Gap between consecutive lessons"
                      />
                      <FormInput
                        label="Max Per Day"
                        type="number"
                        value={bookingSettings.max_bookings_per_day}
                        onChange={(v) => { setBookingSettings(p => ({ ...p, max_bookings_per_day: v })); markChanged(); }}
                        suffix="lessons"
                        helpText="Maximum bookings per student per day"
                      />
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={MapPin}
                    iconColor="violet"
                    title="Pickup & Drop-off Options"
                    description="Configure custom location services for students"
                  >
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-600 mb-3">
                          By default, all lessons start and end at your school address. You can offer custom pickup/drop-off locations for an additional fee.
                        </p>
                      </div>
                      
                      <SettingRow
                        icon={MapPin}
                        label="Offer Custom Pickup"
                        description="Allow students to be picked up from their location"
                      >
                        <ToggleSwitch
                          checked={currentSchool?.offers_custom_pickup || false}
                          onChange={(v) => { 
                            handleSave({ offers_custom_pickup: v }); 
                          }}
                          size="sm"
                        />
                      </SettingRow>

                      {currentSchool?.offers_custom_pickup && (
                        <div className="ml-12">
                          <FormInput
                            label="Custom Pickup Fee"
                            type="number"
                            value={currentSchool?.custom_pickup_fee || 0}
                            onChange={(v) => { handleSave({ custom_pickup_fee: v }); }}
                            suffix="€"
                            helpText="Extra charge for custom pickup location"
                          />
                        </div>
                      )}

                      <SettingRow
                        icon={MapPin}
                        label="Offer Custom Drop-off"
                        description="Allow students to be dropped off at their location"
                      >
                        <ToggleSwitch
                          checked={currentSchool?.offers_custom_dropoff || false}
                          onChange={(v) => { 
                            handleSave({ offers_custom_dropoff: v }); 
                          }}
                          size="sm"
                        />
                      </SettingRow>

                      {currentSchool?.offers_custom_dropoff && (
                        <div className="ml-12">
                          <FormInput
                            label="Custom Drop-off Fee"
                            type="number"
                            value={currentSchool?.custom_dropoff_fee || 0}
                            onChange={(v) => { handleSave({ custom_dropoff_fee: v }); }}
                            suffix="€"
                            helpText="Extra charge for custom drop-off location"
                          />
                        </div>
                      )}
                    </div>
                  </SettingCard>
                </motion.div>
              )}

              {/* PAYMENTS TAB */}
              {activeTab === "payments" && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <SettingCard
                    icon={CreditCard}
                    iconColor="emerald"
                    title="Payment Methods"
                    description="Configure how students can pay for lessons"
                  >
                    <div className="space-y-3">
                      <SettingRow icon={DollarSign} label="Accept Cash" description="In-person cash payments">
                        <ToggleSwitch
                          checked={paymentSettings.accept_cash}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, accept_cash: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                      <SettingRow icon={CreditCard} label="Accept Card" description="Credit/debit card payments">
                        <ToggleSwitch
                          checked={paymentSettings.accept_card}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, accept_card: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                      <SettingRow icon={Building2} label="Bank Transfer" description="Direct bank transfers">
                        <ToggleSwitch
                          checked={paymentSettings.accept_bank_transfer}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, accept_bank_transfer: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={FileText}
                    iconColor="blue"
                    title="Invoicing & Billing"
                    description="Automated invoice generation and payment reminders"
                  >
                    <div className="space-y-3 mb-4">
                      <SettingRow icon={FileText} label="Auto-generate invoices" description="Create invoices automatically for bookings">
                        <ToggleSwitch
                          checked={paymentSettings.auto_invoice}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, auto_invoice: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                      <SettingRow icon={Bell} label="Payment reminders" description="Send reminders for unpaid invoices">
                        <ToggleSwitch
                          checked={paymentSettings.send_payment_reminders}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, send_payment_reminders: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                      <SettingRow icon={Percent} label="Allow partial payments" description="Students can pay in installments">
                        <ToggleSwitch
                          checked={paymentSettings.partial_payments}
                          onChange={(v) => { setPaymentSettings(p => ({ ...p, partial_payments: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Payment Terms"
                        type="number"
                        value={paymentSettings.payment_terms_days}
                        onChange={(v) => { setPaymentSettings(p => ({ ...p, payment_terms_days: v })); markChanged(); }}
                        suffix="days"
                      />
                      <FormInput
                        label="Late Fee"
                        type="number"
                        value={paymentSettings.late_fee_percentage}
                        onChange={(v) => { setPaymentSettings(p => ({ ...p, late_fee_percentage: v })); markChanged(); }}
                        suffix="%"
                      />
                      <FormInput
                        label="Tax Rate"
                        type="number"
                        value={paymentSettings.tax_rate}
                        onChange={(v) => { setPaymentSettings(p => ({ ...p, tax_rate: v })); markChanged(); }}
                        suffix="%"
                      />
                    </div>
                  </SettingCard>
                </motion.div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <SettingCard
                    icon={Mail}
                    iconColor="blue"
                    title="Email Notifications"
                    description="Configure automatic email alerts"
                    expandable
                    defaultExpanded={true}
                  >
                    <div className="space-y-3">
                      {[
                        { key: 'email_booking_confirmation', label: 'Booking Confirmation', desc: 'When a booking is made' },
                        { key: 'email_booking_reminder', label: 'Lesson Reminder', desc: 'Before upcoming lessons' },
                        { key: 'email_booking_cancellation', label: 'Cancellation Notice', desc: 'When a booking is cancelled' },
                        { key: 'email_payment_received', label: 'Payment Receipt', desc: 'When payment is received' },
                        { key: 'email_payment_reminder', label: 'Payment Reminder', desc: 'For outstanding invoices' },
                        { key: 'email_lesson_report', label: 'Lesson Report', desc: 'Summary after each lesson' },
                        { key: 'email_weekly_summary', label: 'Weekly Summary', desc: 'Weekly progress digest' },
                      ].map(item => (
                        <SettingRow key={item.key} label={item.label} description={item.desc}>
                          <ToggleSwitch
                            checked={notificationSettings[item.key]}
                            onChange={(v) => { setNotificationSettings(p => ({ ...p, [item.key]: v })); markChanged(); }}
                            size="sm"
                          />
                        </SettingRow>
                      ))}
                    </div>
                    <div className="mt-4">
                      <FormInput
                        label="Email Reminder Timing"
                        type="number"
                        value={notificationSettings.reminder_hours_before}
                        onChange={(v) => { setNotificationSettings(p => ({ ...p, reminder_hours_before: v })); markChanged(); }}
                        suffix="hours before"
                      />
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Smartphone}
                    iconColor="emerald"
                    title="SMS Notifications"
                    description="Text message alerts (additional charges apply)"
                    badge="Premium"
                    badgeColor="violet"
                    expandable
                    defaultExpanded={false}
                  >
                    <div className="space-y-3">
                      {[
                        { key: 'sms_booking_confirmation', label: 'Booking Confirmation', desc: 'SMS when booked' },
                        { key: 'sms_booking_reminder', label: 'Lesson Reminder', desc: 'SMS before lessons' },
                        { key: 'sms_booking_cancellation', label: 'Cancellation Alert', desc: 'SMS on cancellation' },
                        { key: 'sms_lesson_starting', label: 'Lesson Starting', desc: 'SMS when lesson is about to start' },
                      ].map(item => (
                        <SettingRow key={item.key} label={item.label} description={item.desc}>
                          <ToggleSwitch
                            checked={notificationSettings[item.key]}
                            onChange={(v) => { setNotificationSettings(p => ({ ...p, [item.key]: v })); markChanged(); }}
                            size="sm"
                          />
                        </SettingRow>
                      ))}
                    </div>
                    <div className="mt-4">
                      <FormInput
                        label="SMS Reminder Timing"
                        type="number"
                        value={notificationSettings.sms_reminder_hours_before}
                        onChange={(v) => { setNotificationSettings(p => ({ ...p, sms_reminder_hours_before: v })); markChanged(); }}
                        suffix="hours before"
                      />
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Bell}
                    iconColor="amber"
                    title="Quiet Hours"
                    description="Don't send notifications during these hours"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                        <input
                          type="time"
                          value={notificationSettings.quiet_hours_start}
                          onChange={(e) => { setNotificationSettings(p => ({ ...p, quiet_hours_start: e.target.value })); markChanged(); }}
                          className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                        <input
                          type="time"
                          value={notificationSettings.quiet_hours_end}
                          onChange={(e) => { setNotificationSettings(p => ({ ...p, quiet_hours_end: e.target.value })); markChanged(); }}
                          className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>
                  </SettingCard>
                </motion.div>
              )}

              {/* MODULES TAB */}
              {activeTab === "modules" && (
                <motion.div
                  key="modules"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Platform Modules</h2>
                    <p className="text-slate-500 text-sm">Enable or disable features for your school</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ModuleCard
                      icon={Globe}
                      name="Marketplace Visibility"
                      description="Get discovered by students searching for driving schools"
                      enabled={moduleSettings.enable_marketplace}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_marketplace: v })); markChanged(); }}
                      features={["Search listing", "Reviews", "Instant booking"]}
                    />
                    <ModuleCard
                      icon={BookOpen}
                      name="E-Learning"
                      description="Offer theory courses, videos, and practice tests"
                      enabled={moduleSettings.enable_elearning}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_elearning: v })); markChanged(); }}
                      features={["Video lessons", "Mock tests", "Progress tracking"]}
                    />
                    <ModuleCard
                      icon={Users}
                      name="Student Portal"
                      description="Self-service portal for students to manage bookings"
                      enabled={moduleSettings.enable_student_portal}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_student_portal: v })); markChanged(); }}
                      features={["Book lessons", "View progress", "Manage payments"]}
                    />
                    <ModuleCard
                      icon={Smartphone}
                      name="Instructor App"
                      description="Mobile app for instructors to manage schedules"
                      enabled={moduleSettings.enable_instructor_app}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_instructor_app: v })); markChanged(); }}
                      features={["Schedule view", "Student info", "Lesson notes"]}
                    />
                    <ModuleCard
                      icon={Car}
                      name="Fleet Management"
                      description="Track vehicles, maintenance, and assignments"
                      enabled={moduleSettings.enable_fleet_management}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_fleet_management: v })); markChanged(); }}
                      features={["Vehicle tracking", "Maintenance logs", "Fuel costs"]}
                      premium
                    />
                    <ModuleCard
                      icon={BarChart3}
                      name="Advanced Analytics"
                      description="Detailed business insights and reports"
                      enabled={moduleSettings.enable_reporting}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_reporting: v })); markChanged(); }}
                      features={["Revenue reports", "Student metrics", "Forecasting"]}
                    />
                    <ModuleCard
                      icon={Target}
                      name="CRM & Marketing"
                      description="Manage leads and marketing campaigns"
                      enabled={moduleSettings.enable_crm}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_crm: v })); markChanged(); }}
                      features={["Lead tracking", "Email campaigns", "Conversion analytics"]}
                      isNew
                    />
                    <ModuleCard
                      icon={Gift}
                      name="Referral Program"
                      description="Reward students for referrals"
                      enabled={moduleSettings.enable_referrals}
                      onToggle={(v) => { setModuleSettings(p => ({ ...p, enable_referrals: v })); markChanged(); }}
                      features={["Referral codes", "Reward tracking", "Automated payouts"]}
                      premium
                      isNew
                    />
                  </div>
                </motion.div>
              )}

              {/* BRANDING TAB */}
              {activeTab === "branding" && (
                <motion.div
                  key="branding"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <SettingCard
                    icon={Palette}
                    iconColor="pink"
                    title="Brand Colors"
                    description="Customize colors across your booking pages and emails"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <ColorPicker
                        label="Primary Color"
                        value={brandingSettings.primary_color}
                        onChange={(v) => { setBrandingSettings(p => ({ ...p, primary_color: v })); markChanged(); }}
                      />
                      <ColorPicker
                        label="Secondary Color"
                        value={brandingSettings.secondary_color}
                        onChange={(v) => { setBrandingSettings(p => ({ ...p, secondary_color: v })); markChanged(); }}
                      />
                      <ColorPicker
                        label="Accent Color"
                        value={brandingSettings.accent_color}
                        onChange={(v) => { setBrandingSettings(p => ({ ...p, accent_color: v })); markChanged(); }}
                      />
                    </div>

                    {/* Preview */}
                    <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Preview</p>
                      <div className="flex items-center gap-3">
                        <button style={{ backgroundColor: brandingSettings.primary_color }} className="px-4 py-2 rounded-lg text-white font-medium text-sm">
                          Primary Button
                        </button>
                        <button style={{ backgroundColor: brandingSettings.secondary_color }} className="px-4 py-2 rounded-lg text-white font-medium text-sm">
                          Secondary
                        </button>
                        <button style={{ backgroundColor: brandingSettings.accent_color }} className="px-4 py-2 rounded-lg text-white font-medium text-sm">
                          Accent
                        </button>
                      </div>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Globe}
                    iconColor="blue"
                    title="Booking Page"
                    description="Customize your public booking page"
                  >
                    <div className="space-y-4">
                      <FormInput
                        label="Custom Domain"
                        value={brandingSettings.custom_domain}
                        onChange={(v) => { setBrandingSettings(p => ({ ...p, custom_domain: v })); markChanged(); }}
                        placeholder="bookings.yourschool.com"
                        icon={Link2}
                        helpText="Point your domain to our servers for white-label booking"
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Welcome Message</label>
                        <textarea
                          value={brandingSettings.booking_page_message}
                          onChange={(e) => { setBrandingSettings(p => ({ ...p, booking_page_message: e.target.value })); markChanged(); }}
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none text-sm outline-none transition-all"
                          placeholder="Welcome message shown on your booking page..."
                        />
                      </div>
                      <SettingRow label="Show 'Powered by DRIVEE'" description="Display DRIVEE branding on your pages">
                        <ToggleSwitch
                          checked={brandingSettings.show_powered_by}
                          onChange={(v) => { setBrandingSettings(p => ({ ...p, show_powered_by: v })); markChanged(); }}
                          size="sm"
                        />
                      </SettingRow>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Mail}
                    iconColor="amber"
                    title="Email Signature"
                    description="Custom signature for automated emails"
                  >
                    <textarea
                      value={brandingSettings.email_signature}
                      onChange={(e) => { setBrandingSettings(p => ({ ...p, email_signature: e.target.value })); markChanged(); }}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none text-sm font-mono outline-none transition-all"
                      placeholder="Best regards,&#10;Your School Name&#10;Phone: +44 123 456 7890"
                    />
                  </SettingCard>
                </motion.div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeTab === "integrations" && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900">Integrations</h2>
                    <p className="text-slate-500 text-sm">Connect third-party services to enhance your workflow</p>
                  </div>

                  <div className="space-y-4">
                    <IntegrationCard
                      name="Stripe"
                      description="Accept online card payments securely"
                      logo="S"
                      logoColor="bg-[#635BFF]"
                      connected={false}
                      onConnect={() => toast.info("Stripe connection coming soon!")}
                      popular
                    />
                    <IntegrationCard
                      name="Google Calendar"
                      description="Sync schedules with Google Calendar"
                      logo="G"
                      logoColor="bg-[#4285F4]"
                      connected={true}
                      onDisconnect={() => toast.info("Calendar disconnected")}
                    />
                    <IntegrationCard
                      name="Twilio SMS"
                      description="Send SMS notifications to students"
                      logo="T"
                      logoColor="bg-[#F22F46]"
                      connected={false}
                      onConnect={() => toast.info("Twilio setup coming soon!")}
                    />
                    <IntegrationCard
                      name="WhatsApp Business"
                      description="Send messages via WhatsApp"
                      logo="W"
                      logoColor="bg-[#25D366]"
                      comingSoon
                    />
                    <IntegrationCard
                      name="Zapier"
                      description="Connect to 5000+ apps"
                      logo="Z"
                      logoColor="bg-[#FF4A00]"
                      comingSoon
                    />
                  </div>

                  {/* API Access */}
                  <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">API Access</h3>
                        <p className="text-sm text-slate-500 mt-1">Build custom integrations with our REST API</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition">
                            View Documentation
                          </button>
                          <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-white transition">
                            Generate API Key
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <SettingCard
                    icon={Lock}
                    iconColor="slate"
                    title="Account Security"
                    description="Protect your account with additional security measures"
                  >
                    <div className="space-y-3">
                      <SettingRow icon={Fingerprint} label="Two-Factor Authentication" description="Add an extra layer of security">
                        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
                          Enable 2FA
                        </button>
                      </SettingRow>
                      <SettingRow icon={Key} label="Change Password" description="Update your account password">
                        <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition">
                          Update
                        </button>
                      </SettingRow>
                      <SettingRow icon={Activity} label="Login Activity" description="View recent sign-in history">
                        <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition">
                          View
                        </button>
                      </SettingRow>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={Database}
                    iconColor="blue"
                    title="Data & Privacy"
                    description="Manage your data and export options"
                  >
                    <div className="space-y-3">
                      <SettingRow icon={Download} label="Export All Data" description="Download your complete data archive">
                        <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition">
                          Export
                        </button>
                      </SettingRow>
                      <SettingRow icon={Server} label="Data Retention" description="How long we keep your data">
                        <select className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option>1 year</option>
                          <option>2 years</option>
                          <option>5 years</option>
                          <option>Forever</option>
                        </select>
                      </SettingRow>
                    </div>
                  </SettingCard>

                  <SettingCard
                    icon={AlertTriangle}
                    iconColor="red"
                    title="Danger Zone"
                    description="Irreversible actions"
                    expandable
                    defaultExpanded={false}
                  >
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-start gap-3">
                        <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900">Delete Account</h4>
                          <p className="text-sm text-red-700 mt-0.5">Permanently delete your account and all data. This cannot be undone.</p>
                          <button className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition">
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </SettingCard>
                </motion.div>
              )}

              {/* BILLING TAB */}
              {activeTab === "billing" && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  {/* Current Plan */}
                  <div className="rounded-2xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5" />
                            <span className="text-sm font-semibold text-indigo-200">Current Plan</span>
                          </div>
                          <h2 className="text-3xl font-bold">Professional</h2>
                          <p className="text-indigo-200 mt-1">Unlimited students, instructors, and all modules</p>
                        </div>
                        <div className="text-right">
                          <p className="text-4xl font-bold">€99</p>
                          <p className="text-indigo-200">/month</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-sm">Active • Renews January 17, 2026</span>
                      </div>
                    </div>
                    <div className="bg-white p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <QuickStat icon={Users} label="Students" value="Unlimited" color="indigo" />
                        <QuickStat icon={Users} label="Instructors" value="Unlimited" color="emerald" />
                        <QuickStat icon={Layers} label="Modules" value="All" color="amber" />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <SettingCard
                    icon={CreditCard}
                    iconColor="emerald"
                    title="Payment Method"
                    description="Manage your billing details"
                  >
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-14 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">VISA</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">•••• •••• •••• 4242</p>
                        <p className="text-sm text-slate-500">Expires 12/2025</p>
                      </div>
                      <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-white transition">
                        Update
                      </button>
                    </div>
                  </SettingCard>

                  {/* Billing History */}
                  <SettingCard
                    icon={FileText}
                    iconColor="blue"
                    title="Billing History"
                    description="View and download past invoices"
                    expandable
                    defaultExpanded={false}
                  >
                    <div className="space-y-2">
                      {[
                        { date: "Dec 17, 2024", amount: "€99.00", status: "Paid" },
                        { date: "Nov 17, 2024", amount: "€99.00", status: "Paid" },
                        { date: "Oct 17, 2024", amount: "€99.00", status: "Paid" },
                      ].map((invoice, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                          <div>
                            <p className="font-medium text-slate-900">{invoice.date}</p>
                            <p className="text-sm text-slate-500">{invoice.amount}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                              {invoice.status}
                            </span>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SettingCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        </div>
      </div>
    </div>
  );
}