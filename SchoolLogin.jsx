import React, { useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { getDefaultRoute } from "@/components/utils/routing";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Building2,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowRight,
  Globe,
  ChevronDown,
  Star,
  KeyRound,
  Sparkles,
  UserCircle,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  getLocaleById, 
  getCountryOptions, 
  SUPPORTED_LANGUAGES,
  getSavedLocalePreference,
  detectBrowserLocale 
} from "@/components/utils/localisation";
import { useTranslation, changeLanguage } from "@/components/utils/i18n";
import VeeMascot from "@/components/common/VeeMascot";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/8bd9d7a47_ChatGPTImageNov29202511_47_17PM.png";

const easing = [0.22, 1, 0.36, 1];

// Compact input component - using CSS :focus-within instead of useState to avoid hook ordering issues
const CompactInput = ({ id, label, type, value, onChange, placeholder, icon: Icon, error, autoComplete, rightElement }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3b82c4] to-[#a9d5ed] rounded-xl opacity-0 blur transition-opacity duration-200 group-focus-within:opacity-25 group-hover:opacity-10" />
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors text-slate-400 group-focus-within:text-[#3b82c4]" />
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className={`w-full h-11 px-3 rounded-xl border-2 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal transition-all outline-none focus:border-[#3b82c4] focus:ring-2 focus:ring-[#e8f4fa] ${
              Icon ? "pl-10" : ""
            } ${rightElement ? "pr-10" : ""} ${
              error
                ? "border-rose-300 focus:border-rose-500"
                : "border-slate-200 hover:border-slate-300"
            }`}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Vee speech bubble component
const VeeSpeechBubble = ({ message, mood = "happy" }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: 0.3, duration: 0.4, ease: easing }}
    className="flex items-end gap-3"
  >
    <div className="relative">
      <VeeMascot size="md" mood={mood} animate={true} />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -top-1 -right-1 w-3 h-3 bg-[#81da5a] rounded-full border-2 border-white"
      />
    </div>
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="relative bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-slate-100 max-w-[200px]"
    >
      <p className="text-sm text-slate-700 font-medium leading-snug">{message}</p>
      <div className="absolute -left-2 bottom-3 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent" />
    </motion.div>
  </motion.div>
);

// Animated stat
const QuickStat = ({ value, label }) => (
  <div className="text-center">
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-white/70 font-medium">{label}</p>
  </div>
);

export default function SchoolLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  // All useState hooks must be called unconditionally and in the same order
  const [mode, setMode] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formData, setFormData] = useState(() => {
    // Initialize locale on first render only
    let initialLocale;
    const localeParam = searchParams.get("locale");
    if (localeParam) {
      initialLocale = getLocaleById(localeParam);
    } else {
      const saved = getSavedLocalePreference();
      if (saved) {
        initialLocale = getLocaleById(saved);
      } else {
        initialLocale = detectBrowserLocale();
      }
    }
    changeLanguage(initialLocale.languageCode);
    
    return {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phone: "",
      schoolName: "",
      operatingCountry: initialLocale.countryCode,
      preferredLanguage: initialLocale.languageCode,
      acceptTerms: false,
      rememberMe: false,
    };
  });
  const [errors, setErrors] = useState({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const countryOptions = useMemo(() => getCountryOptions(), []);

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (mode !== "forgot-password") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (mode === "register" && formData.password.length < 8) {
        newErrors.password = "Minimum 8 characters";
      }
    }

    if (mode === "register") {
      if (!formData.fullName) newErrors.fullName = "Required";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
      if (!formData.acceptTerms) newErrors.acceptTerms = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode]);

  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Determine redirect path
      let redirectPath = searchParams.get("redirect");
      if (!redirectPath) {
        // Will be determined after authentication based on user role
        redirectPath = "Dashboard";
      }
      
      // Build full redirect URL
      const fullRedirectUrl = window.location.origin + createPageUrl(redirectPath);
      
      // Redirect to Base44 login page with return URL
      base44.auth.redirectToLogin(fullRedirectUrl);
      
      // Set success state (user will be redirected)
      setLoginSuccess(true);
    } catch (error) {
      const message = error?.message || "Login failed. Please try again.";
      setErrors({ general: message });
      setIsLoading(false);
    }
  }, [validateForm, searchParams, navigate]);

  const handleDemoNavigate = useCallback((pageName) => {
    navigate(createPageUrl(pageName));
  }, [navigate]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Register user through Base44 auth
      await base44.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        role: "admin" // Default to admin for school owners
      });

      // Create school entity with required fields
      const school = await base44.entities.School.create({
        name: formData.schoolName || `${formData.fullName}'s Driving School`,
        email: formData.email,
        phone: formData.phone,
        address: "To be completed",
        city: "To be completed",
        operating_country: formData.operatingCountry,
        is_active: true
      });

      // Update user with preferences
      await base44.auth.updateMe({
        preferredLanguage: formData.preferredLanguage,
        school_id: school.id
      });

      toast.success("Account created! Please check your email to verify.");
      setMode("login");
      setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
    } catch (error) {
      const message = error?.message || "Registration failed. Email may already be in use.";
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  }, [validateForm, formData]);

  const handleForgotPassword = useCallback(async () => {
    if (!formData.email || !validateEmail(formData.email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.sendPasswordResetEmail(formData.email);
      setResetEmailSent(true);
      toast.success("Reset link sent to your email!");
    } catch (error) {
      setErrors({ general: "Failed to send reset email. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }, [formData.email]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else if (mode === "register") handleRegister();
    else handleForgotPassword();
  }, [mode, handleLogin, handleRegister, handleForgotPassword]);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setErrors({});
    setResetEmailSent(false);
    setLoginSuccess(false);
  }, []);

  // Dynamic Vee messages
  const veeMessage = useMemo(() => {
    if (loginSuccess) return { text: "Welcome back! 🎉 Taking you to your dashboard...", mood: "celebrate" };
    if (resetEmailSent) return { text: "Check your inbox! I've sent you a reset link 📧", mood: "happy" };
    if (mode === "login") return { text: "Hey there! 👋 Ready to manage your driving school?", mood: "wave" };
    if (mode === "register") return { text: "Excited to have you! Let's get you set up 🚀", mood: "happy" };
    if (mode === "forgot-password") return { text: "No worries! I'll help you get back in 🔐", mood: "happy" };
    return { text: "Welcome to DRIVEE!", mood: "happy" };
  }, [mode, loginSuccess, resetEmailSent]);

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        html, body, #root { height: 100%; overflow: hidden; }
      `}</style>

      {/* Left Panel - Brand */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] bg-gradient-to-br from-slate-900 via-[#2563a3] to-[#3b82c4] p-8 flex-col relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#a9d5ed]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#3b82c4]/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Top - Logo & Back */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to={createPageUrl("Landing")}>
            <motion.img
              whileHover={{ scale: 1.03 }}
              src={LOGO_URL}
              alt="DRIVEE"
              className="h-20 w-auto"
            />
          </Link>
          <Link 
            to={createPageUrl("Landing")} 
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
        </div>

        {/* Middle - Hero + Vee */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easing }}
          >
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white mb-3 leading-tight">
              The smartest way to
              <br />
              <span className="bg-gradient-to-r from-[#a9d5ed] via-[#3b82c4] to-[#6c376f] bg-clip-text text-transparent">
                run your driving school
              </span>
            </h1>
            <p className="text-base text-white/70 mb-6 max-w-sm leading-relaxed">
              Join 1,200+ schools saving 20 hours per week with AI-powered scheduling and management.
            </p>

            {/* Feature tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {["AI Scheduling", "Student App", "Analytics", "Payments"].map((tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-semibold text-white/90 border border-white/10"
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Vee with speech bubble */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <VeeSpeechBubble message={veeMessage.text} mood={veeMessage.mood} />
          </motion.div>
        </div>

        {/* Bottom - Stats & Testimonial */}
        <div className="relative z-10 space-y-4">
          {/* Quick stats */}
          <div className="flex items-center justify-between px-2">
            <QuickStat value="1,200+" label="Schools" />
            <div className="w-px h-8 bg-white/20" />
            <QuickStat value="50K+" label="Students" />
            <div className="w-px h-8 bg-white/20" />
            <QuickStat value="98%" label="Satisfaction" />
          </div>

          {/* Mini testimonial */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#3b82c4] to-[#2563a3] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                SM
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-white/80 truncate">"Bookings up 40%, admin time down 50%"</p>
                <p className="text-xs text-white/50">Sarah M. • Premier Driving</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <Link to={createPageUrl("Landing")}>
              <img src={LOGO_URL} alt="DRIVEE" className="h-8" />
            </Link>
            <Link to={createPageUrl("Landing")} className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </div>

          {/* Mobile Vee */}
          <div className="lg:hidden mb-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <VeeMascot size="sm" mood={veeMessage.mood} animate={true} />
              <p className="text-sm text-slate-600 font-medium flex-1">{veeMessage.text}</p>
            </div>
          </div>

          {/* Success State */}
          <AnimatePresence mode="wait">
            {loginSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 bg-gradient-to-br from-[#81da5a] to-[#5cb83a] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back!</h2>
                <p className="text-slate-500 text-sm">Redirecting to dashboard...</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6"
              >
                {/* Header */}
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    {mode === "login" && "Sign in"}
                    {mode === "register" && "Create account"}
                    {mode === "forgot-password" && "Reset password"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {mode === "login" && "Enter your credentials to continue"}
                    {mode === "register" && "Start your free 30-day trial"}
                    {mode === "forgot-password" && "We'll email you a reset link"}
                  </p>
                </div>

                {/* Error */}
                {errors.general && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <p className="text-sm text-rose-700 font-medium">{errors.general}</p>
                  </div>
                )}

                {/* Reset email sent */}
                {mode === "forgot-password" && resetEmailSent ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-[#eefbe7] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-7 h-7 text-[#5cb83a]" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">Check your inbox</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Reset link sent to <strong>{formData.email}</strong>
                    </p>
                    <button onClick={() => switchMode("login")} className="text-[#3b82c4] hover:text-[#2563a3] text-sm font-semibold">
                      ← Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Register fields */}
                    {mode === "register" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <CompactInput
                            id="fullName"
                            label="Full Name"
                            type="text"
                            value={formData.fullName}
                            onChange={(v) => updateFormData("fullName", v)}
                            placeholder="John Doe"
                            icon={User}
                            error={errors.fullName}
                            autoComplete="name"
                          />
                          <CompactInput
                            id="phone"
                            label="Phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(v) => updateFormData("phone", v)}
                            placeholder="+44..."
                            icon={Phone}
                            error={errors.phone}
                            autoComplete="tel"
                          />
                        </div>

                        <CompactInput
                          id="schoolName"
                          label="School Name"
                          type="text"
                          value={formData.schoolName}
                          onChange={(v) => updateFormData("schoolName", v)}
                          placeholder="ABC Driving School"
                          icon={Building2}
                          autoComplete="organization"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Country</label>
                            <div className="relative">
                              <select
                                value={formData.operatingCountry}
                                onChange={(e) => updateFormData("operatingCountry", e.target.value)}
                                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 appearance-none bg-white text-sm font-medium outline-none transition-all"
                              >
                                {countryOptions.map((c) => (
                                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Language</label>
                            <div className="relative">
                              <select
                                value={formData.preferredLanguage}
                                onChange={(e) => {
                                  updateFormData("preferredLanguage", e.target.value);
                                  changeLanguage(e.target.value);
                                }}
                                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 appearance-none bg-white text-sm font-medium outline-none transition-all"
                              >
                                {SUPPORTED_LANGUAGES.map((l) => (
                                  <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Email */}
                    <CompactInput
                      id="email"
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(v) => updateFormData("email", v)}
                      placeholder="you@example.com"
                      icon={Mail}
                      error={errors.email}
                      autoComplete="email"
                    />

                    {/* Password */}
                    {mode !== "forgot-password" && (
                      <CompactInput
                        id="password"
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(v) => updateFormData("password", v)}
                        placeholder="••••••••"
                        icon={Lock}
                        error={errors.password}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        rightElement={
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-slate-100 rounded transition">
                            {showPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                          </button>
                        }
                      />
                    )}

                    {/* Confirm password */}
                    {mode === "register" && (
                      <CompactInput
                        id="confirmPassword"
                        label="Confirm Password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(v) => updateFormData("confirmPassword", v)}
                        placeholder="••••••••"
                        icon={KeyRound}
                        error={errors.confirmPassword}
                        autoComplete="new-password"
                        rightElement={
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1 hover:bg-slate-100 rounded transition">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                          </button>
                        }
                      />
                    )}

                    {/* Login options */}
                    {mode === "login" && (
                      <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.rememberMe}
                            onChange={(e) => updateFormData("rememberMe", e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
                            />
                            <span className="text-slate-600 font-medium">Remember me</span>
                            </label>
                            <button type="button" onClick={() => switchMode("forgot-password")} className="text-[#3b82c4] hover:text-[#2563a3] font-semibold">
                            Forgot password?
                            </button>
                      </div>
                    )}

                    {/* Register terms */}
                    {mode === "register" && (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.acceptTerms}
                          onChange={(e) => updateFormData("acceptTerms", e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#3b82c4] focus:ring-[#a9d5ed]"
                        />
                        <span className="text-xs text-slate-600 leading-relaxed">
                          I agree to the <a href="#" className="text-[#3b82c4] font-semibold hover:underline">Terms</a> and <a href="#" className="text-[#3b82c4] font-semibold hover:underline">Privacy Policy</a>
                        </span>
                      </label>
                    )}

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {mode === "login" && "Sign in"}
                          {mode === "register" && "Create account"}
                          {mode === "forgot-password" && "Send reset link"}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>
                )}

                {/* Social login - login mode only */}
                {mode === "login" && !resetEmailSent && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-white text-xs text-slate-400 font-medium uppercase">or</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => toast.info("Google login coming soon!")}
                        className="h-10 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 transition-all"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info("Microsoft login coming soon!")}
                        className="h-10 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 transition-all"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#F25022" d="M1 1h10v10H1z" />
                          <path fill="#00A4EF" d="M1 13h10v10H1z" />
                          <path fill="#7FBA00" d="M13 1h10v10H13z" />
                          <path fill="#FFB900" d="M13 13h10v10H13z" />
                        </svg>
                        Microsoft
                      </button>
                    </div>
                  </>
                )}

                {/* Demo Login Buttons */}
                {mode === "login" && !resetEmailSent && (
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                      Demo Access
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoNavigate("AdminDashboard")}
                        className="py-2.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-blue-200"
                      >
                        <Shield className="w-4 h-4" />
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoNavigate("InstructorDashboard")}
                        className="py-2.5 rounded-xl bg-green-100 hover:bg-green-200 text-green-900 font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-green-200"
                      >
                        <UserCircle className="w-4 h-4" />
                        Instructor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoNavigate("StudentDashboard")}
                        className="py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-purple-200"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Student
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode switch */}
                <div className="mt-4 text-center text-sm">
                  {mode === "login" && (
                    <p className="text-slate-600">
                      No account?{" "}
                      <button onClick={() => switchMode("register")} className="text-[#3b82c4] hover:text-[#2563a3] font-bold">
                        Start free trial
                      </button>
                    </p>
                  )}
                  {mode === "register" && (
                    <p className="text-slate-600">
                      Have an account?{" "}
                      <button onClick={() => switchMode("login")} className="text-[#3b82c4] hover:text-[#2563a3] font-bold">
                        Sign in
                      </button>
                    </p>
                  )}
                  {mode === "forgot-password" && !resetEmailSent && (
                    <p className="text-slate-600">
                      Remember it?{" "}
                      <button onClick={() => switchMode("login")} className="text-[#3b82c4] hover:text-[#2563a3] font-bold">
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-[#5cb83a]" />
            <span>256-bit SSL • GDPR • SOC 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}