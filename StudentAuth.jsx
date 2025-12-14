import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { getDefaultRoute } from "@/components/utils/routing";
import { 
  Mail, 
  ArrowRight, 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  Phone,
  Shield,
  Calendar,
  CreditCard,
  Clock,
  Star,
  MessageSquare,
  AlertCircle,
  Info,
  Sparkles,
  Building2,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import VeeMascot from "@/components/common/VeeMascot";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/8bd9d7a47_ChatGPTImageNov29202511_47_17PM.png";

// Animation easing
const easing = {
  premium: [0.22, 1, 0.36, 1],
  smooth: [0.4, 0, 0.2, 1]
};

// Login methods
const LOGIN_METHODS = {
  EMAIL: "email",
  PHONE: "phone"
};

// Benefits shown to students
const STUDENT_BENEFITS = [
  {
    icon: Calendar,
    title: "Easy Booking",
    description: "Book and manage all your lessons in one place"
  },
  {
    icon: CreditCard,
    title: "Payment Tracking",
    description: "Keep invoices and payments organized"
  },
  {
    icon: Clock,
    title: "Calendar Sync",
    description: "Sync lessons with your phone calendar"
  },
  {
    icon: MessageSquare,
    title: "Direct Communication",
    description: "Chat with your instructor easily"
  }
];

// Social login providers
const SOCIAL_PROVIDERS = [
  {
    id: "apple",
    name: "Apple",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
    ),
    available: false
  },
  {
    id: "google",
    name: "Google",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    available: false
  },
  {
    id: "microsoft",
    name: "Microsoft",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#F25022" d="M11 3H3v8h8z" />
        <path fill="#00A4EF" d="M21 3h-8v8h8z" />
        <path fill="#7FBA00" d="M11 13H3v8h8z" />
        <path fill="#FFB900" d="M21 13h-8v8h8z" />
      </svg>
    ),
    available: false
  }
];

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate email format
 */
const validateEmail = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return { valid: false, error: "Email is required" };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate phone number (flexible for international formats)
 */
const validatePhone = (value) => {
  const cleaned = (value || "").replace(/\D/g, "");
  if (!cleaned) return { valid: false, error: "Phone number is required" };
  
  // Allow 8-15 digits (international phone numbers vary)
  if (cleaned.length < 8 || cleaned.length > 15) {
    return { valid: false, error: "Please enter a valid phone number" };
  }
  
  return { valid: true, error: null };
};

/**
 * Format phone number for display
 */
const formatPhoneDisplay = (value) => {
  const cleaned = value.replace(/\D/g, "");
  
  // French format: XX XX XX XX XX
  if (cleaned.length <= 10) {
    const match = cleaned.match(/^(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})$/);
    if (match) {
      return [match[1], match[2], match[3], match[4], match[5]]
        .filter(Boolean)
        .join(" ");
    }
  }
  
  return cleaned;
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Loading screen shown while checking authentication
 */
const AuthCheckingScreen = () => (
  <div className="student-auth-root min-h-screen flex items-center justify-center antialiased">
    <Styles />
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-3xl shadow-premium-lg px-8 py-6 flex flex-col items-center gap-4 max-w-sm mx-4"
    >
      <VeeMascot size="md" mood="wave" animate />
      <p className="text-sm font-medium text-slate-800 text-center">
        Checking your session
      </p>
      <p className="text-xs text-slate-500 text-center">
        If you already have a student account, we'll take you to your dashboard
      </p>
      <Loader2 className="w-5 h-5 text-[#3b82c4] animate-spin mt-1" />
    </motion.div>
  </div>
);

/**
 * School context banner - shows when coming from a specific school
 */
const SchoolContextBanner = ({ schoolName, schoolId }) => {
  if (!schoolName) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 px-4 py-3 bg-gradient-to-r from-[#e8f4fa] to-[#f3e8f4] rounded-xl border border-[#d4eaf5] flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-[#3b82c4]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          Booking with {schoolName}
        </p>
        <p className="text-xs text-slate-500">
          Sign in to complete your booking
        </p>
      </div>
    </motion.div>
  );
};

/**
 * Login method toggle (Email / Phone)
 */
const LoginMethodToggle = ({ method, onChange }) => (
  <div className="flex items-center gap-1 p-1.5 bg-[#e8f4fa] rounded-xl mb-5">
    <button
      type="button"
      onClick={() => onChange(LOGIN_METHODS.EMAIL)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        method === LOGIN_METHODS.EMAIL
          ? "bg-white text-[#3b82c4] shadow-sm"
          : "text-slate-500 hover:text-[#3b82c4]"
      }`}
    >
      <Mail className="w-4 h-4" />
      Email
    </button>
    <button
      type="button"
      onClick={() => onChange(LOGIN_METHODS.PHONE)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        method === LOGIN_METHODS.PHONE
          ? "bg-white text-[#3b82c4] shadow-sm"
          : "text-slate-500 hover:text-[#3b82c4]"
      }`}
    >
      <Phone className="w-4 h-4" />
      Phone
    </button>
  </div>
);

/**
 * Email input field
 */
const EmailInput = ({ value, onChange, error, disabled }) => (
  <div>
    <label
      htmlFor="email"
      className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2"
    >
      Email address
    </label>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        id="email"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
        className={`w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border-2 text-sm font-medium transition-all outline-none bg-white text-slate-900 placeholder:text-slate-400 ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            : "border-slate-200 hover:border-slate-300 focus:border-[#3b82c4] focus:ring-2 focus:ring-[#a9d5ed]/30"
        } ${disabled ? "opacity-70 cursor-not-allowed bg-slate-50" : ""}`}
      />
    </div>
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          id="email-error"
          className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

/**
 * Phone input field with country code
 */
const PhoneInput = ({ value, onChange, error, disabled, countryCode, onCountryCodeChange }) => {
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneDisplay(e.target.value);
    onChange(formatted);
  };
  
  return (
    <div>
      <label
        htmlFor="phone"
        className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2"
      >
        Phone number
      </label>
      <div className="relative flex gap-2">
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          disabled={disabled}
          className="h-11 sm:h-12 px-3 rounded-xl border-2 border-slate-200 text-sm font-medium bg-white text-slate-700 hover:border-slate-300 focus:border-[#3b82c4] focus:ring-2 focus:ring-[#a9d5ed]/30 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <option value="+33">🇫🇷 +33</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+44">🇬🇧 +44</option>
          <option value="+49">🇩🇪 +49</option>
          <option value="+34">🇪🇸 +34</option>
          <option value="+39">🇮🇹 +39</option>
          <option value="+32">🇧🇪 +32</option>
          <option value="+41">🇨🇭 +41</option>
        </select>
        
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="phone"
            type="tel"
            value={value}
            onChange={handlePhoneChange}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? "phone-error" : undefined}
            className={`w-full h-11 sm:h-12 pl-11 pr-4 rounded-xl border-2 text-sm font-medium transition-all outline-none bg-white text-slate-900 placeholder:text-slate-400 ${
              error
                ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                : "border-slate-200 hover:border-slate-300 focus:border-[#3b82c4] focus:ring-2 focus:ring-[#a9d5ed]/30"
            } ${disabled ? "opacity-70 cursor-not-allowed bg-slate-50" : ""}`}
          />
        </div>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            id="phone-error"
            className="text-[11px] text-rose-500 mt-1.5 font-medium flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
        <Info className="w-3 h-3" />
        We'll send you a verification code via SMS
      </p>
    </div>
  );
};

/**
 * Social login buttons
 */
const SocialLoginButtons = () => {
  const handleSocialLogin = (provider) => {
    if (!provider.available) {
      toast.info(`${provider.name} login is coming soon.`);
      return;
    }
    // Future: implement social login
  };
  
  return (
    <>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold">
          Or continue with
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleSocialLogin(provider)}
            className="h-10 sm:h-11 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center transition-all relative group"
            aria-label={`Sign in with ${provider.name}`}
          >
            {provider.icon}
            {!provider.available && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center">
                <Clock className="w-2.5 h-2.5 text-slate-500" />
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
};

/**
 * Benefits list shown on larger screens
 */
const BenefitsList = ({ benefits }) => (
  <div className="grid grid-cols-2 gap-3 mt-4">
    {benefits.map((benefit, idx) => (
      <motion.div
        key={benefit.title}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 + idx * 0.08, duration: 0.4 }}
        className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 border border-[#d4eaf5] hover:border-[#a9d5ed] hover:shadow-premium transition-all"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] flex items-center justify-center flex-shrink-0">
          <benefit.icon className="w-4 h-4 text-[#3b82c4]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{benefit.title}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{benefit.description}</p>
        </div>
      </motion.div>
    ))}
  </div>
);

/**
 * Success state after login initiated
 */
const LoginSuccessState = ({ method, value }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-10"
  >
    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#eefbe7] flex items-center justify-center shadow-sm">
      <CheckCircle className="w-8 h-8 text-[#5cb83a]" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">
      Check your {method === LOGIN_METHODS.EMAIL ? "inbox" : "phone"}
    </h3>
    <p className="text-sm text-slate-600 mb-5 max-w-xs mx-auto">
      {method === LOGIN_METHODS.EMAIL
        ? `We sent a magic link to ${value}`
        : `We sent a verification code to ${value}`}
    </p>
    <p className="text-xs text-slate-400">
      Didn't receive it?{" "}
      <button type="button" className="text-[#3b82c4] font-semibold hover:underline">
        Click here to resend
      </button>
    </p>
  </motion.div>
);

/**
 * Global styles component - Light theme matching Drivee brand
 */
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .student-auth-root {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      background:
        radial-gradient(ellipse 120% 100% at 50% -40%, rgba(169, 213, 237, 0.35) 0%, transparent 55%),
        radial-gradient(ellipse 80% 70% at 100% 30%, rgba(59, 130, 196, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse 70% 60% at 0% 80%, rgba(129, 218, 90, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse 50% 40% at 80% 90%, rgba(108, 55, 111, 0.08) 0%, transparent 50%),
        linear-gradient(180deg, #f0f7fc 0%, #ffffff 100%);
    }

    .student-auth-root * {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    }

    .shadow-premium {
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.02),
        0 1px 2px rgba(0, 0, 0, 0.03),
        0 4px 8px rgba(0, 0, 0, 0.04),
        0 12px 24px rgba(0, 0, 0, 0.05);
    }

    .shadow-premium-lg {
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.02),
        0 2px 4px rgba(0, 0, 0, 0.02),
        0 8px 16px rgba(0, 0, 0, 0.04),
        0 24px 48px rgba(0, 0, 0, 0.06);
    }

    .cta-gradient {
      background: linear-gradient(135deg, #3b82c4 0%, #2563a3 100%);
    }

    .cta-gradient:hover {
      background: linear-gradient(135deg, #2563a3 0%, #1e4f8a 100%);
    }

    .glass {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    
    /* Improve select styling */
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1rem;
      padding-right: 2rem;
    }
    
    /* Focus visible styles */
    input:focus-visible, select:focus-visible, button:focus-visible {
      outline: 2px solid #a9d5ed;
      outline-offset: 2px;
    }
  `}</style>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Safe redirect helper - validates against allowlist
const getSafeRedirect = (raw) => {
  const allowedPages = [
    "StudentDashboard",
    "BookLesson",
    "TheoryLearning",
    "MyLessons",
    "StudentInvoices",
    "StudentProgress",
    "StudentProfile"
  ];
  return allowedPages.includes(raw) ? raw : "StudentDashboard";
};

export default function StudentAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL parameters
  const schoolId = searchParams.get("schoolId");
  const schoolName = searchParams.get("schoolName");
  const returnTo = searchParams.get("returnTo");
  const redirectParam = searchParams.get("redirect");

  // Form state
  const [loginMethod, setLoginMethod] = useState(LOGIN_METHODS.EMAIL);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+33");
  
  // UI state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errors, setErrors] = useState({ field: "", general: "" });

  // Derived state
  const hasSchoolContext = Boolean(schoolName);
  const isBusy = isSubmitting || loginSuccess;
  const currentValue = loginMethod === LOGIN_METHODS.EMAIL ? email : phone;

  /**
   * Build the redirect URL after successful authentication
   */
  const buildRedirectUrl = useCallback(() => {
    // Priority 1: returnTo (legacy full path)
    if (returnTo) return returnTo;
    
    // Priority 2: redirect URL param
    if (redirectParam) {
      const safePage = getSafeRedirect(redirectParam);
      if (schoolId) return `${createPageUrl(safePage)}?schoolId=${schoolId}`;
      return createPageUrl(safePage);
    }
    
    // Priority 3: sessionStorage fallback
    const storedRedirect = sessionStorage.getItem("post_login_redirect");
    if (storedRedirect) {
      const safePage = getSafeRedirect(storedRedirect);
      sessionStorage.removeItem("post_login_redirect"); // Clear to prevent loops
      if (schoolId) return `${createPageUrl(safePage)}?schoolId=${schoolId}`;
      return createPageUrl(safePage);
    }
    
    // Priority 4: Default based on context
    if (schoolId) return `${createPageUrl("BookLesson")}?schoolId=${schoolId}`;
    return createPageUrl("StudentDashboard");
  }, [returnTo, redirectParam, schoolId, getSafeRedirect]);

  /**
   * Navigate to appropriate page after auth
   */
  const redirectAfterAuth = useCallback(() => {
    const url = buildRedirectUrl();
    navigate(url);
  }, [navigate, buildRedirectUrl]);

  /**
   * Check if user is already authenticated on mount
   */
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // Check actual authentication
        const user = await base44.auth.me();
        if (!isMounted) return;

        if (user) {
          // If user is student, redirect to intended destination
          if (user.role === "user") {
            redirectAfterAuth();
          } else {
            // If user is admin or instructor, redirect to their default portal
            const defaultRoute = getDefaultRoute(user);
            navigate(createPageUrl(defaultRoute));
          }
        }
      } catch {
        // Silent fail - show login screen
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [redirectAfterAuth, navigate]);

  /**
   * Clear errors when user changes input
   */
  const handleEmailChange = useCallback((value) => {
    setEmail(value);
    setErrors({ field: "", general: "" });
  }, []);

  const handlePhoneChange = useCallback((value) => {
    setPhone(value);
    setErrors({ field: "", general: "" });
  }, []);

  /**
   * Handle login method change
   */
  const handleMethodChange = useCallback((method) => {
    setLoginMethod(method);
    setErrors({ field: "", general: "" });
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ field: "", general: "" });

    // Validate based on method
    let validation;
    if (loginMethod === LOGIN_METHODS.EMAIL) {
      validation = validateEmail(email);
    } else {
      validation = validatePhone(phone);
    }

    if (!validation.valid) {
      setErrors({ field: validation.error, general: "" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the full URL for redirect after login
      const redirectPath = buildRedirectUrl();
      const fullRedirectUrl = window.location.origin + redirectPath;
      
      if (loginMethod === LOGIN_METHODS.EMAIL) {
        // Email magic link flow - pass full URL for post-auth redirect
        base44.auth.redirectToLogin(fullRedirectUrl);
        setLoginSuccess(true);
      } else {
        // Phone SMS flow (placeholder - implement based on your auth provider)
        toast.info("SMS verification is coming soon. Please use email for now.");
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.error("Login redirect failed", err);
      setLoginSuccess(false);
      setErrors({
        field: "",
        general: "We couldn't start the login flow. Please try again."
      });
      toast.error("Login failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show loading while checking auth
  if (isCheckingAuth) {
    return <AuthCheckingScreen />;
  }

  return (
    <div className="student-auth-root min-h-screen text-slate-900 flex flex-col antialiased">
      <Styles />
      
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}
      <header className="glass border-b border-slate-200/50 sticky top-0 z-40 shadow-premium">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to={createPageUrl("Landing")} className="flex items-center gap-3">
              <motion.img
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.18 }}
                src={LOGO_URL}
                alt="Drivee"
                className="h-14 md:h-16 object-contain"
              />
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to={
                  schoolId
                    ? `${createPageUrl("SchoolProfile")}?id=${schoolId}`
                    : createPageUrl("Marketplace")
                }
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-150"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(createPageUrl("SchoolLogin"))}
                className="hidden sm:inline-flex items-center justify-center px-4 sm:px-5 py-2.5 cta-gradient text-white text-xs sm:text-sm font-semibold rounded-xl shadow-premium transition-all duration-200"
              >
                For schools
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN CONTENT */}
      {/* ================================================================ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-5xl w-full grid md:grid-cols-[1fr_minmax(340px,420px)] gap-10 lg:gap-16 items-center">
          
          {/* ============================================================ */}
          {/* LEFT PANEL - Hero (Hidden on mobile) */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easing.premium }}
            className="hidden md:block"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 mb-4 shadow-premium">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#eefbe7] text-[#5cb83a]">
                <Shield className="w-3 h-3" />
              </span>
              <span className="font-medium">Secure & passwordless sign in</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              {hasSchoolContext
                ? <>Book lessons with <span className="text-[#3b82c4]">{schoolName}</span></>
                : <>Your driving journey <span className="text-[#3b82c4]">starts here</span></>}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mb-6 leading-relaxed">
              {hasSchoolContext
                ? "Sign in to complete your booking and manage all your lessons in one place."
                : "Use the same email across schools to keep all your bookings, payments and progress in one clean student space."}
            </p>

            {/* Mascot and benefits */}
            <div className="flex items-start gap-4 mb-4">
              <VeeMascot size="lg" mood="wave" animate />
              <div className="text-sm text-slate-700">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3b82c4]" />
                  What you get with your account:
                </p>
              </div>
            </div>

            {/* Benefits grid */}
            <BenefitsList benefits={STUDENT_BENEFITS} />

            {/* Trust indicators */}
            <div className="flex items-center gap-6 mt-10 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-[#5cb83a]" />
                <span className="font-medium">256-bit encryption</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Star className="w-4 h-4 text-[#e7d356]" />
                <span className="font-medium">Trusted by 10,000+ students</span>
              </div>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* RIGHT PANEL - Auth Card */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easing.premium }}
            className="bg-white rounded-3xl shadow-premium-lg border border-[#d4eaf5]/50 p-6 sm:p-8"
          >
            {/* School context banner */}
            <SchoolContextBanner schoolName={schoolName} schoolId={schoolId} />

            {/* Card header */}
            <div className="mb-6 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e8f4fa] text-[11px] font-semibold text-[#3b82c4] mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3b82c4] animate-pulse" />
                {hasSchoolContext ? "Student booking" : "Student access"}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                Sign in to Drivee
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {loginMethod === LOGIN_METHODS.EMAIL
                  ? "Enter your email to receive a secure magic link. No password needed."
                  : "Enter your phone number to receive a verification code via SMS."}
              </p>
            </div>

            {/* Show success state or form */}
            {loginSuccess ? (
              <LoginSuccessState method={loginMethod} value={currentValue} />
            ) : (
              <>
                {/* General error */}
                <AnimatePresence>
                  {errors.general && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-700 font-medium flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errors.general}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login method toggle */}
                <LoginMethodToggle
                  method={loginMethod}
                  onChange={handleMethodChange}
                />

                {/* Login form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Input field based on method */}
                  <AnimatePresence mode="wait">
                    {loginMethod === LOGIN_METHODS.EMAIL ? (
                      <motion.div
                        key="email"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <EmailInput
                          value={email}
                          onChange={handleEmailChange}
                          error={errors.field}
                          disabled={isBusy}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="phone"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PhoneInput
                          value={phone}
                          onChange={handlePhoneChange}
                          error={errors.field}
                          disabled={isBusy}
                          countryCode={countryCode}
                          onCountryCodeChange={setCountryCode}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <motion.button
                    type="submit"
                    disabled={isBusy}
                    whileHover={{ scale: isBusy ? 1 : 1.015 }}
                    whileTap={{ scale: isBusy ? 1 : 0.985 }}
                    className="w-full h-12 rounded-xl cta-gradient text-white text-sm font-bold shadow-lg shadow-[#3b82c4]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-3"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs sm:text-sm">
                          {loginMethod === LOGIN_METHODS.EMAIL
                            ? "Sending magic link..."
                            : "Sending code..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs sm:text-sm">
                          Continue with {loginMethod === LOGIN_METHODS.EMAIL ? "email" : "phone"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Social login options */}
                <SocialLoginButtons />

                {/* Demo Login */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                    Demo Access
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod(LOGIN_METHODS.EMAIL);
                      setEmail("student@demo.com");
                      toast.success("Student account loaded - click 'Continue' to sign in");
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-purple-200"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Load Demo Student
                  </button>
                </div>

                {/* Terms and privacy */}
                <div className="mt-6 text-center text-[10px] sm:text-xs text-slate-400 space-y-2">
                  <p>By continuing, you agree to our</p>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      to={createPageUrl("Terms")}
                      className="hover:text-slate-700 text-[11px] sm:text-xs font-medium transition-colors"
                    >
                      Terms of Service
                    </Link>
                    <span>•</span>
                    <Link
                      to={createPageUrl("Privacy")}
                      className="hover:text-slate-700 text-[11px] sm:text-xs font-medium transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>

      {/* ================================================================ */}
      {/* MOBILE: Bottom info (shown only on small screens) */}
      {/* ================================================================ */}
      <div className="md:hidden px-4 pb-8">
        <div className="bg-gradient-to-br from-[#e8f4fa] to-white border border-[#d4eaf5] rounded-2xl p-4 shadow-premium">
          <div className="flex items-center gap-3 mb-4">
            <VeeMascot size="sm" mood="wave" />
            <p className="text-sm font-semibold text-slate-800">
              Your student account includes:
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
            {STUDENT_BENEFITS.slice(0, 4).map((benefit) => (
              <div key={benefit.title} className="flex items-center gap-2">
                <benefit.icon className="w-4 h-4 text-[#3b82c4]" />
                <span className="font-medium">{benefit.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}