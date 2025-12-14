import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SEOHead from "@/components/common/SEOHead";
import {
  Calendar, Users, Car, CreditCard, BarChart3, Bell, Package, Star, FileText,
  TrendingUp, Check, ArrowRight, Play, Shield, Clock, Zap, Target, Award,
  ChevronRight, CheckCircle, DollarSign, Globe, Smartphone, MessageSquare,
  Settings, Database, Lock, TrendingDown, Phone, Upload, Briefcase, Building2,
  UserCheck, X, Menu, Sparkles, Rocket, ChevronDown, GraduationCap, Search,
  ClipboardCheck, Quote, ArrowUpRight, AlertCircle, Headphones
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/8bd9d7a47_ChatGPTImageNov29202511_47_17PM.png";

// Premium easing curves
const easing = {
  premium: [0.22, 1, 0.36, 1],
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easing.premium } }
};

const scaleInVariant = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: easing.premium } }
};

const AnimatedCounter = ({ value, suffix = "", duration = 2000 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
    if (isNaN(numericValue)) { setDisplayValue(value); return; }
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(numericValue * easeProgress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value, duration]);
  
  return <span ref={ref} className="tabular-nums">{typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}{suffix}</span>;
};

const AnimatedSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }} transition={{ duration: 0.8, ease: easing.premium, delay }} className={className}>
      {children}
    </motion.section>
  );
};

export default function BusinessSolutions() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveFeature(prev => (prev + 1) % features.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: Calendar, title: "Smart Scheduling & Calendar", description: "AI-powered scheduling that eliminates double bookings and optimizes instructor availability automatically.", color: "from-[#3b82c4] to-[#a9d5ed]", benefits: ["Automatic conflict detection", "Drag-and-drop calendar", "Multi-calendar sync", "SMS & email reminders"] },
    { icon: CreditCard, title: "Payments & Financial Management", description: "Accept payments online, generate invoices automatically, and track every penny.", color: "from-[#81da5a] to-[#5cb83a]", benefits: ["Multiple payment methods", "Automated invoicing", "Commission tracking", "Tax reporting"] },
    { icon: Users, title: "Student & Progress Management", description: "Track every student's journey from first lesson to license with comprehensive analytics.", color: "from-[#6c376f] to-[#5a2d5d]", benefits: ["Digital profiles", "Progress tracking", "Theory test prep", "Student portal"] },
    { icon: Car, title: "Fleet & Vehicle Management", description: "Monitor your entire fleet with maintenance schedules, fuel tracking, and utilization analytics.", color: "from-[#e7d356] to-[#d4bf2e]", benefits: ["Vehicle tracking", "Maintenance reminders", "Fuel monitoring", "Utilization reports"] },
    { icon: UserCheck, title: "Instructor Management & Payroll", description: "Manage your team with automated scheduling, performance tracking, and commission payouts.", color: "from-[#3b82c4] to-[#2563a3]", benefits: ["Scheduling & availability", "Performance analytics", "Commission calculations", "Team communication"] },
    { icon: BarChart3, title: "Analytics & Business Intelligence", description: "Make data-driven decisions with comprehensive reports and customizable dashboards.", color: "from-[#e44138] to-[#c9342c]", benefits: ["Real-time dashboards", "Revenue analysis", "Custom reports", "Export to Excel/PDF"] },
  ];

  const roles = [
    { title: "For School Owners", benefits: ["Complete operational visibility", "Reduce admin overhead by 70%", "Multi-location management", "Real-time P&L insights", "Automated compliance", "White-label options"], icon: TrendingUp, gradient: "from-[#3b82c4] to-[#2563a3]" },
    { title: "For Instructors", benefits: ["Mobile-first schedule management", "One-tap lesson completion", "Automated expense tracking", "Student history at your fingertips", "Instant payment notifications", "Professional profile"], icon: Users, gradient: "from-[#6c376f] to-[#5a2d5d]" },
    { title: "For Students", benefits: ["Book lessons instantly", "Real-time progress tracking", "Theory test materials", "Automated reminders", "Digital certificates", "Direct messaging"], icon: Star, gradient: "from-[#81da5a] to-[#5cb83a]" }
  ];

  const testimonials = [
    { 
      quote: "Before DRIVEE, I was spending 3 hours every evening juggling spreadsheets and answering booking calls. Now students book themselves online and I actually have my evenings back.", 
      author: "Sarah Chen", 
      role: "Owner, Metro Driving School", 
      location: "London, UK", 
      avatar: "SC", 
      metric: "12 instructors", 
      growth: "3hrs saved/day", 
      gradient: "from-[#3b82c4] to-[#2563a3]" 
    },
    { 
      quote: "We used to lose €2,000+ monthly from no-shows and last-minute cancellations. The automated reminders and deposit system cut that by 85%. Paid for itself in week one.", 
      author: "Marcus Weber", 
      role: "Director, Weber Fahrschule", 
      location: "Berlin, Germany", 
      avatar: "MW", 
      metric: "€2K+ saved/mo", 
      growth: "-85% no-shows", 
      gradient: "from-[#81da5a] to-[#5cb83a]" 
    },
    { 
      quote: "My instructors were skeptical at first, but once they saw how easy it was to log lessons from their phone between appointments, they became the biggest advocates.", 
      author: "Elena Rodriguez", 
      role: "Founder, City Driving Academy", 
      location: "Madrid, Spain", 
      avatar: "ER", 
      metric: "8 instructors", 
      growth: "Team adoption: 100%", 
      gradient: "from-[#6c376f] to-[#5a2d5d]" 
    },
  ];

  const plans = [
    { 
      name: "SOLO", 
      price: billingCycle === "monthly" ? "29" : "290", 
      description: "Perfect for independent instructors running their own business.", 
      tagline: "1 instructor",
      features: [
        "Online booking system (24/7)",
        "Student mobile app",
        "Digital lesson logbook",
        "Automated SMS & email reminders",
        "Basic progress tracking",
        "Document management",
        "Theory test prep materials",
        "Automated invoicing",
        "Up to 2 vehicles"
      ], 
      cta: "Start Free Trial", 
      popular: false, 
      savings: billingCycle === "annual" ? "Save €58/year" : undefined,
      hook: "Everything you need to run your business professionally—for less than the cost of a tank of petrol."
    },
    { 
      name: "TEAM", 
      price: billingCycle === "monthly" ? "79" : "790", 
      description: "For growing schools ready to eliminate admin headaches.", 
      tagline: "Up to 5 instructors",
      features: [
        "Everything in SOLO, plus:",
        "Multi-instructor scheduling",
        "AI conflict detection",
        "Instructor performance dashboards",
        "Student satisfaction surveys",
        "Lesson package discounts",
        "Recurring bookings",
        "Refund management",
        "Priority email support"
      ], 
      cta: "Start Free Trial", 
      popular: true, 
      savings: billingCycle === "annual" ? "Save €158/year" : undefined,
      hook: "Stop chasing payments and juggling schedules. Let DRIVEE handle the admin so you can focus on teaching."
    },
    { 
      name: "FLEET", 
      price: billingCycle === "monthly" ? "149" : "1,490", 
      description: "Built for established schools with employed or freelance instructors.", 
      tagline: "Up to 15 instructors",
      features: [
        "Everything in TEAM, plus:",
        "Payroll & hours tracking",
        "Freelancer auto-invoicing",
        "Commission split management",
        "Fleet maintenance alerts",
        "Vehicle utilization analytics",
        "AI booking assistant",
        "Custom reporting",
        "Priority phone support"
      ], 
      cta: "Start Free Trial", 
      popular: false, 
      savings: billingCycle === "annual" ? "Save €298/year" : undefined,
      hook: "Managing employed and freelance instructors? Calculate commissions in one click. No more Excel nightmares."
    },
    { 
      name: "ENTERPRISE", 
      price: "Custom", 
      description: "For multi-location operations and franchise networks.", 
      tagline: "Unlimited",
      features: [
        "Everything in FLEET, plus:",
        "Multi-location management",
        "White-label branding",
        "API access & integrations",
        "Dedicated account manager",
        "Custom onboarding",
        "Direct phone support line",
        "SLA guarantee"
      ], 
      cta: "Contact Sales", 
      popular: false,
      hook: "London, Manchester, Birmingham—one dashboard. Your brand, your platform."
    }
  ];

  const metrics = [
    { value: "40%", label: "Revenue Increase", sublabel: "average in first 6 months", icon: TrendingUp, color: "text-[#5cb83a]", bg: "bg-[#eefbe7]", ring: "ring-[#d4f4c3]" },
    { value: "60%", label: "Fewer No-Shows", sublabel: "with automated reminders", icon: Bell, color: "text-[#3b82c4]", bg: "bg-[#e8f4fa]", ring: "ring-[#d4eaf5]" },
    { value: "20+", label: "Hours Saved", sublabel: "every week on admin", icon: Clock, color: "text-[#6c376f]", bg: "bg-[#f3e8f4]", ring: "ring-[#e5d0e6]" },
    { value: "95%", label: "Customer Satisfaction", sublabel: "from our school partners", icon: Star, color: "text-[#e7d356]", bg: "bg-[#fdfbe8]", ring: "ring-[#f9f3c8]" }
  ];

  const painPoints = [
    { 
      problem: "Endless phone calls for bookings", 
      solution: "Students book themselves online 24/7", 
      icon: Phone,
      stat: "90% fewer calls"
    },
    { 
      problem: "No-shows killing your revenue", 
      solution: "Automated reminders + deposit protection", 
      icon: AlertCircle,
      stat: "-60% no-shows"
    },
    { 
      problem: "Chasing students for payments", 
      solution: "Upfront online payments before lessons", 
      icon: CreditCard,
      stat: "Get paid faster"
    },
    { 
      problem: "Spreadsheet chaos for scheduling", 
      solution: "One calendar, auto-synced for everyone", 
      icon: Calendar,
      stat: "Zero double-bookings"
    },
    { 
      problem: "Hours spent on invoices & admin", 
      solution: "One-click invoicing & automated reports", 
      icon: FileText,
      stat: "20+ hrs saved/week"
    },
    { 
      problem: "No visibility into your business", 
      solution: "Real-time dashboards & analytics", 
      icon: BarChart3,
      stat: "Know your numbers"
    }
  ];

  const steps = [
    { number: "1", title: "Import Your Data", description: "We'll migrate your existing student records, schedules, and vehicle info. Coming from another system? We handle the switch for free.", icon: Upload, time: "15 min" },
    { number: "2", title: "Customize Your Setup", description: "Set your pricing, availability, booking rules, and add your branding. Our setup wizard walks you through everything.", icon: Settings, time: "20 min" },
    { number: "3", title: "Go Live & Start Booking", description: "Share your booking link with students. They book, pay, and receive automatic reminders. You teach. That's it.", icon: Rocket, time: "Instant" }
  ];

  const faqs = [
    { 
      question: "How long does it take to get started?", 
      answer: "Most driving schools are up and running within an hour. Our guided setup walks you through everything step by step. If you're migrating from another system, our team handles the data transfer—usually completed within 24-48 hours." 
    },
    { 
      question: "Can I try DRIVEE before committing?", 
      answer: "Absolutely. You get a full 30-day free trial with complete access to all features. No credit card required to start. Only pay if you decide DRIVEE is right for your school." 
    },
    { 
      question: "What if I'm currently using another booking system?", 
      answer: "We offer free migration assistance. Our team will export your student data, lesson history, and schedules from your current system and import everything into DRIVEE. Zero downtime, zero hassle." 
    },
    { 
      question: "How do students book and pay?", 
      answer: "Students get their own app and a web booking portal. They can see your real-time availability, book lessons instantly, and pay online via card, bank transfer, Apple Pay, or Google Pay. You can also require deposits to protect against no-shows." 
    },
    { 
      question: "Is my data secure?", 
      answer: "Security is our top priority. We use bank-level 256-bit encryption, automated daily backups, and are fully GDPR compliant. Your data is stored on secure EU servers and never shared with third parties." 
    },
    { 
      question: "What if DRIVEE doesn't work for my school?", 
      answer: "We offer a 30-day money-back guarantee, no questions asked. Plus, you can export all your data at any time—you're never locked in." 
    },
    { 
      question: "Do my instructors need to be tech-savvy?", 
      answer: "Not at all. Our mobile app is designed to be as simple as sending a text message. Most instructors are comfortable within their first day. We also provide free training calls if anyone needs extra help." 
    },
    { 
      question: "Can students access theory test preparation?", 
      answer: "Yes! All plans include theory test prep materials with practice questions, mock tests, and progress tracking. Students can study directly in the app between lessons." 
    }
  ];

  const handleStartTrial = () => navigate(createPageUrl("SchoolLogin"));
  const handleScheduleDemo = () => window.location.href = "mailto:sales@drivee.eu?subject=Schedule Demo";

  useEffect(() => {
    document.title = "DRIVEE for Schools - Complete Driving School Management Software";
  }, []);

  return (
    <div className="min-h-screen bg-white antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
        .hero-gradient {
          background: radial-gradient(ellipse 100% 80% at 50% -30%, rgba(169, 213, 237, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 100% 40%, rgba(59, 130, 196, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 0% 70%, rgba(129, 218, 90, 0.08) 0%, transparent 50%),
            linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
        }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .shadow-premium { box-shadow: 0 0 0 1px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03), 0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.05); }
        .shadow-premium-lg { box-shadow: 0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.04), 0 24px 48px rgba(0,0,0,0.06); }
        .shadow-premium-xl { box-shadow: 0 0 0 1px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03), 0 16px 32px rgba(0,0,0,0.05), 0 32px 64px rgba(0,0,0,0.07); }
        .cta-gradient { background: linear-gradient(135deg, #3b82c4 0%, #2563a3 100%); }
        .cta-gradient:hover { background: linear-gradient(135deg, #2563a3 0%, #1e4f8a 100%); }
        .accent-gradient { background: linear-gradient(135deg, #3b82c4 0%, #a9d5ed 50%, #6c376f 100%); }
        .glass { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .text-gradient { background: linear-gradient(135deg, #3b82c4 0%, #a9d5ed 50%, #6c376f 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      `}</style>

      {/* Navbar */}
      <motion.nav initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: easing.premium }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'glass border-b border-slate-200/50 shadow-premium' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to={createPageUrl("Landing")} className="flex items-center">
              <motion.img whileHover={{ scale: 1.02 }} src={LOGO_URL} alt="DRIVEE" className="h-20 object-contain" />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link to={createPageUrl("TheoryTestPrep")} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#3b82c4] hover:text-[#2563a3] hover:bg-[#e8f4fa] rounded-xl transition-all">
                <GraduationCap className="w-4 h-4" />Theory Test Prep
              </Link>
              <Link to={createPageUrl("Marketplace")} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all">
                <Search className="w-4 h-4" />Find Schools
              </Link>
              <Link to={createPageUrl("SchoolLogin")} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all">Sign In</Link>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStartTrial}
                className="ml-2 px-6 py-2.5 cta-gradient text-white text-sm font-semibold rounded-xl shadow-premium hover:shadow-premium-lg transition-all">
                Start Free Trial
              </motion.button>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2.5 hover:bg-slate-100 rounded-xl">
              {mobileMenuOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 bg-white pt-20 md:hidden overflow-y-auto">
            <div className="p-6 space-y-2">
              <Link to={createPageUrl("SchoolLogin")} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Users className="w-5 h-5 text-slate-600" /></div>Sign In
              </Link>
              <button onClick={() => { handleStartTrial(); setMobileMenuOpen(false); }} className="w-full py-4 cta-gradient text-white font-bold rounded-2xl text-lg shadow-premium-lg">Get Started</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen hero-gradient overflow-hidden pt-20 lg:pt-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }} className="absolute top-20 left-10 w-96 h-96 bg-[#a9d5ed]/20 rounded-full blur-3xl" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.3 }} className="absolute bottom-40 right-10 w-[500px] h-[500px] bg-[#3b82c4]/15 rounded-full blur-3xl" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: 0.6 }} className="absolute top-1/2 left-1/3 w-80 h-80 bg-[#81da5a]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 mb-8 shadow-premium">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#81da5a] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#5cb83a]"></span></span>
              <span>Trusted by 1,200+ driving schools</span><span className="w-px h-4 bg-slate-200" /><span>98% would recommend</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 mb-6 leading-[1.05] tracking-tight">
              Stop Chasing Bookings.<br /><span className="text-gradient">Start Growing Your School.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
              className="text-lg md:text-xl lg:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              The all-in-one platform that handles scheduling, payments, and student management—so you can focus on what you do best: teaching people to drive.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStartTrial}
                className="px-8 py-4 cta-gradient text-white rounded-2xl text-lg font-bold shadow-premium-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group">
                Start Your Free 30-Day Trial<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowVideoModal(true)}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl text-lg font-bold hover:border-slate-300 hover:shadow-premium-lg transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />Watch 2-Min Demo
              </motion.button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap justify-center gap-6 text-sm">
              {[{ icon: CheckCircle, text: "No credit card required" }, { icon: Clock, text: "Setup in under an hour" }, { icon: Shield, text: "Cancel anytime" }].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.1 }} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#eefbe7] flex items-center justify-center"><item.icon className="w-4 h-4 text-[#5cb83a]" /></div>
                  <span className="text-slate-600 font-medium">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Video Preview */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="relative max-w-5xl mx-auto">
            <div className="bg-white rounded-[32px] shadow-premium-xl border border-slate-200/50 p-3 md:p-4 overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[#e8f4fa] via-[#d4eaf5] to-[#f3e8f4] rounded-[24px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,196,0.1),transparent_70%)]" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="relative text-center z-10">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setShowVideoModal(true)}
                    className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-premium-xl mb-4 mx-auto group">
                    <div className="absolute inset-0 rounded-full accent-gradient opacity-20 group-hover:opacity-30 transition-opacity" />
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-[#3b82c4] ml-1" />
                  </motion.button>
                  <p className="text-slate-900 font-bold text-lg">See How DRIVEE Works</p>
                  <p className="text-slate-500 text-sm mt-1">Watch a quick 2-minute overview</p>
                </motion.div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, x: -30, y: 20 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 1, duration: 0.7 }}
              className="absolute -left-8 top-1/4 bg-white rounded-2xl p-4 shadow-premium-lg hidden lg:block" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#eefbe7] rounded-xl flex items-center justify-center"><Bell className="w-6 h-6 text-[#5cb83a]" /></div>
                <div><p className="text-xs text-slate-500 font-medium">No-Show Rate</p><p className="text-sm font-bold text-slate-900">↓ 60% reduction</p></div>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 30, y: 20 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 1.2, duration: 0.7 }}
              className="absolute -right-8 top-1/3 bg-white rounded-2xl p-4 shadow-premium-lg hidden lg:block" style={{ animation: 'float-delayed 6s ease-in-out infinite', animationDelay: '1s' }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#f3e8f4] rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-[#6c376f]" /></div>
                <div><p className="text-xs text-slate-500 font-medium">Admin Time Saved</p><p className="text-sm font-bold text-slate-900">20+ hrs/week</p></div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 100" fill="none" preserveAspectRatio="none" className="w-full h-16 md:h-24">
            <path d="M0 100L48 91.7C96 83.3 192 66.7 288 58.3C384 50 480 50 576 55C672 60 768 70 864 75C960 80 1056 76.7 1152 71.7C1248 66.7 1344 60 1392 56.7L1440 53.3V100H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Social Proof / Logos Section */}
      <AnimatedSection className="py-12 md:py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-xs md:text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
            Trusted by driving schools across Europe
          </motion.p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {["Metro Driving School", "Weber Fahrschule", "City Driving", "EuroDrive Academy", "DriveRight UK"].map((name, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-slate-400 font-bold text-lg">
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center"><Car className="w-4 h-4" /></div>
                {name}
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Pain Points Section - What Problems We Solve */}
      <AnimatedSection className="py-20 md:py-28 bg-slate-50/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-bold text-[#e44138] uppercase tracking-[0.2em] mb-4">
              Sound Familiar?
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Running a driving school shouldn't feel like a second job
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
              We built DRIVEE because we were tired of seeing great instructors burn out on admin work. Here's what we fix:
            </motion.p>
          </div>

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((item, i) => (
              <motion.div key={i} variants={fadeUpVariant} whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-premium border border-slate-100 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-[#fef2f2] rounded-xl flex items-center justify-center group-hover:bg-[#eefbe7] transition-colors">
                    <item.icon className="w-6 h-6 text-[#e44138] group-hover:text-[#5cb83a] transition-colors" />
                  </div>
                  <span className="px-3 py-1 bg-[#eefbe7] text-[#4a9c2e] text-xs font-bold rounded-full">{item.stat}</span>
                </div>
                <p className="text-slate-400 text-sm line-through mb-2">{item.problem}</p>
                <p className="text-slate-900 font-semibold">{item.solution}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* How It Works - 3 Steps */}
      <AnimatedSection className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-bold text-[#3b82c4] uppercase tracking-[0.2em] mb-4">
              Getting Started
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Up and running in under an hour
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto">
              No IT department needed. No complicated setup. If you can send an email, you can use DRIVEE.
            </motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }} className="relative text-center">
                {i < steps.length - 1 && <div className="hidden md:block absolute top-16 left-[calc(50%+4rem)] w-[calc(100%-8rem)] h-0.5"><div className="w-full h-full bg-gradient-to-r from-[#d4eaf5] via-[#a9d5ed] to-transparent rounded-full" /></div>}
                <div className="relative inline-block mb-6">
                  <motion.div whileHover={{ scale: 1.05, rotate: 3 }} className="w-24 h-24 bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] rounded-[28px] flex items-center justify-center mx-auto border border-[#d4eaf5] shadow-premium-lg">
                    <step.icon className="w-10 h-10 text-[#3b82c4]" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 accent-gradient text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg">{i + 1}</div>
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-[#81da5a] text-white text-xs font-bold rounded-full shadow">{step.time}</div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Pricing Section */}
      <AnimatedSection id="pricing" className="py-20 md:py-28 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-bold text-[#3b82c4] uppercase tracking-[0.2em] mb-4">Pricing</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Simple, transparent pricing</motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-slate-600 mb-4 max-w-2xl mx-auto">
              Choose the plan that fits your school. No hidden fees. No contracts. Cancel anytime.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }} className="text-sm text-slate-500 mb-8">
              All plans include a 30-day free trial. No credit card required to start.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-premium border border-slate-200">
              <button onClick={() => setBillingCycle("monthly")} className={`px-6 py-3 rounded-xl font-semibold transition-all ${billingCycle === "monthly" ? "cta-gradient text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>Monthly</button>
              <button onClick={() => setBillingCycle("annual")} className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${billingCycle === "annual" ? "cta-gradient text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
                Annual<span className="px-2 py-0.5 bg-[#eefbe7] text-[#4a9c2e] rounded-full text-xs font-bold">Save 17%</span>
              </button>
            </motion.div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {plans.map((plan, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.08, duration: 0.6, ease: easing.premium }} 
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`rounded-3xl p-6 md:p-7 transition-all duration-300 ${
                  plan.popular 
                    ? "bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-900 text-white shadow-premium-xl lg:scale-[1.05] border-2 border-[#a9d5ed]/60 relative ring-4 ring-[#a9d5ed]/10" 
                    : "bg-white shadow-premium border-2 border-slate-200 hover:border-[#a9d5ed]/30 hover:shadow-premium-lg"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#81da5a] to-[#5cb83a] rounded-full text-xs font-bold text-white shadow-lg">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      MOST POPULAR
                    </div>
                  </motion.div>
                )}

                {/* Header */}
                <div className="mb-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4 ${
                    plan.popular 
                      ? "bg-white/20 text-white backdrop-blur-sm" 
                      : "bg-gradient-to-r from-[#e8f4fa] to-[#d4eaf5] text-[#3b82c4]"
                  }`}>
                    <Users className="w-3.5 h-3.5" />
                    {plan.tagline}
                  </div>
                  <h3 className={`text-2xl md:text-3xl font-extrabold mb-3 tracking-tight ${
                    plan.popular ? "text-white" : "text-slate-900"
                  }`}>
                    {plan.name}
                  </h3>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  {plan.price === "Custom" ? (
                    <div className="text-center py-3">
                      <span className={`text-3xl font-extrabold ${plan.popular ? "text-white" : "text-slate-900"}`}>
                        Custom Pricing
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className={`text-5xl md:text-6xl font-extrabold tracking-tight ${
                        plan.popular ? "text-white" : "text-slate-900"
                      }`}>
                        €{plan.price}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-base font-semibold ${
                          plan.popular ? "text-slate-300" : "text-slate-500"
                        }`}>
                          /{billingCycle === "monthly" ? "month" : "year"}
                        </span>
                      </div>
                    </div>
                  )}
                  {plan.savings && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-gradient-to-r from-[#81da5a] to-[#5cb83a] rounded-full"
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-white" />
                      <span className="text-xs font-bold text-white">{plan.savings}</span>
                    </motion.div>
                  )}
                </div>

                {/* Hook / Value Prop */}
                <div className={`p-4 rounded-xl mb-6 border ${
                  plan.popular 
                    ? "bg-white/5 border-white/10" 
                    : "bg-gradient-to-br from-[#e8f4fa] to-white border-[#d4eaf5]"
                }`}>
                  <p className={`text-sm font-medium leading-relaxed ${
                    plan.popular ? "text-white/90" : "text-slate-700"
                  }`}>
                    {plan.hook}
                  </p>
                </div>

                {/* Description */}
                <p className={`text-sm mb-6 ${
                  plan.popular ? "text-slate-300" : "text-slate-600"
                }`}>
                  {plan.description}
                </p>

                {/* Features */}
                <div className="mb-8">
                  <ul className="space-y-2.5">
                    {plan.features.map((f, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + idx * 0.03 }}
                        className={`flex items-start gap-2.5 text-sm ${
                          f.startsWith("Everything") 
                            ? `font-bold mt-4 pt-4 border-t-2 ${
                                plan.popular ? "border-white/20 text-white" : "border-slate-200 text-slate-900"
                              }` 
                            : plan.popular ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        {!f.startsWith("Everything") && (
                          <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            plan.popular ? "text-[#81da5a]" : "text-[#5cb83a]"
                          }`} />
                        )}
                        <span className={f.startsWith("Everything") ? "text-xs uppercase tracking-wide" : ""}>
                          {f}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }} 
                  onClick={plan.cta === "Contact Sales" ? handleScheduleDemo : handleStartTrial}
                  className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 group ${
                    plan.popular 
                      ? "bg-white text-slate-900 hover:bg-slate-100 shadow-premium-lg" 
                      : "cta-gradient text-white shadow-premium hover:shadow-premium-lg"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            ))}
          </div>
          
          {/* Migration Offer */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easing.premium }}
            className="mt-16 lg:mt-20 max-w-4xl mx-auto"
          >
            <div className="relative bg-gradient-to-br from-[#eefbe7] via-white to-[#e8f4fa] rounded-[32px] p-8 md:p-12 border-3 border-[#81da5a] shadow-premium-xl overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#81da5a]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#3b82c4]/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#81da5a] to-[#5cb83a] rounded-full text-white text-sm font-bold mb-6 shadow-lg"
                  >
                    <Rocket className="w-5 h-5" />
                    SWITCHING FROM ANOTHER SYSTEM?
                  </motion.div>
                  <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    We'll handle your migration—free.
                  </h3>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Using spreadsheets, another booking system, or pen and paper? We'll import your student records, lesson history, and schedules at no extra cost. Zero downtime. Zero hassle.
                  </p>
                </div>

                {/* Benefits */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: Upload, title: "Free data import", desc: "We migrate everything for you" },
                    { icon: Headphones, title: "Personal onboarding call", desc: "We'll walk you through setup" },
                    { icon: Shield, title: "30-day money-back", desc: "Not happy? Full refund, no questions" }
                  ].map((benefit, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center"
                    >
                      <div className="w-10 h-10 bg-[#e8f4fa] rounded-xl flex items-center justify-center mx-auto mb-3">
                        <benefit.icon className="w-5 h-5 text-[#3b82c4]" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{benefit.title}</h4>
                      <p className="text-xs text-slate-600">{benefit.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="text-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStartTrial}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl text-lg font-bold shadow-premium-xl hover:shadow-2xl transition-all"
                  >
                    Start Your Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Testimonials Section */}
      <AnimatedSection className="py-20 md:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-bold text-[#3b82c4] uppercase tracking-[0.2em] mb-4">From Real Driving Schools</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Hear from instructors like you</motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-slate-600">Real stories from schools that made the switch</motion.p>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={fadeUpVariant} whileHover={{ y: -4 }} className="bg-white rounded-3xl p-7 shadow-premium hover:shadow-premium-lg transition-all border border-slate-100 relative">
                <div className="absolute top-6 right-6 w-10 h-10 bg-[#e8f4fa] rounded-full flex items-center justify-center"><Quote className="w-5 h-5 text-[#a9d5ed]" /></div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-0.5">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                  <div className="px-3 py-1 bg-[#eefbe7] rounded-full"><span className="text-xs font-bold text-[#4a9c2e]">{t.growth}</span></div>
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed text-sm">"{t.quote}"</p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${t.gradient} rounded-full flex items-center justify-center shadow-lg`}><span className="text-white font-bold text-sm">{t.avatar}</span></div>
                    <div>
                      <p className="font-bold text-slate-900">{t.author}</p>
                      <p className="text-sm text-slate-500">{t.role}</p>
                      <p className="text-xs text-slate-400">{t.location}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* FAQ Section */}
      <AnimatedSection className="py-20 md:py-28 bg-slate-50/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-xs font-bold text-[#3b82c4] uppercase tracking-[0.2em] mb-4">FAQ</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Common Questions</motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-slate-600">Everything you need to know about getting started</motion.p>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUpVariant} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full px-7 py-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                  <h3 className="font-bold text-slate-900 pr-4 text-base md:text-lg">{faq.question}</h3>
                  <motion.div animate={{ rotate: expandedFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center"><ChevronDown className="w-5 h-5 text-slate-500" /></motion.div>
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div className="px-7 pb-6 text-slate-600 leading-relaxed border-t border-slate-200 pt-4">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12 text-center">
            <p className="text-slate-600 font-medium mb-5">Still have questions? We're here to help.</p>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleScheduleDemo}
              className="inline-flex items-center gap-2 px-7 py-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-800 hover:border-slate-300 hover:shadow-premium-lg transition-all">
              <MessageSquare className="w-5 h-5" />Chat With Our Team
            </motion.button>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Final CTA Section */}
      <AnimatedSection className="py-24 md:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#a9d5ed]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#3b82c4]/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#a9d5ed]/5 to-[#6c376f]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <Car className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Ready to take back your evenings?</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-xl text-white/80 mb-10 leading-relaxed max-w-2xl mx-auto">Join 1,200+ driving schools who've already made the switch.<br />Start your free 30-day trial today—setup takes less than an hour.</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStartTrial}
              className="px-10 py-5 bg-white text-slate-900 rounded-2xl text-lg font-bold shadow-premium-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group">
              Start Your Free Trial<ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleScheduleDemo}
              className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white border-2 border-white/20 rounded-2xl text-lg font-bold hover:bg-white/20 transition-all">
              Book a Demo Call
            </motion.button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-6 text-sm">
            {["30-day free trial", "No credit card required", "Free data migration", "Cancel anytime"].map((item, i) => (
              <div key={i} className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#81da5a]" /><span className="font-medium text-white/80">{item}</span></div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="py-20 md:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-1">
              <Link to={createPageUrl("Landing")}><img src={LOGO_URL} alt="DRIVEE" className="h-12 w-auto brightness-0 invert mb-6" /></Link>
              <p className="text-slate-400 text-sm leading-relaxed">The complete platform for modern driving schools. Scheduling, payments, and student management—all in one place.</p>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-6 text-slate-300 uppercase tracking-wider">Product</h3>
              <ul className="space-y-4 text-sm">
                <li><a href="#pricing" className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Pricing<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                <li><button onClick={handleScheduleDemo} className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Book a Demo<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Features<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-6 text-slate-300 uppercase tracking-wider">Company</h3>
              <ul className="space-y-4 text-sm">
                <li><Link to={createPageUrl("Landing")} className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">About Us<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Contact<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Careers<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-6 text-slate-300 uppercase tracking-wider">Legal</h3>
              <ul className="space-y-4 text-sm">
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Privacy Policy<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">Terms of Service<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
                <li><button className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group">GDPR Compliance<ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-sm font-medium">© 2025 DRIVEE. All rights reserved. Built with ❤️ for driving instructors.</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVideoModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl">
              <div className="p-4 flex items-center justify-between border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">See DRIVEE in Action</h3>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowVideoModal(false)} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-slate-600" />
                </motion.button>
              </div>
              <div className="aspect-video bg-gradient-to-br from-[#e8f4fa] via-[#d4eaf5] to-[#f3e8f4] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-premium-lg mx-auto mb-4"><Play className="w-10 h-10 text-[#3b82c4] ml-1" /></div>
                  <p className="text-slate-700 font-bold text-lg">Demo Video</p>
                  <p className="text-slate-500 text-sm mt-1">2-minute product walkthrough</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}