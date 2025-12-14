import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SEOHead from "@/components/common/SEOHead";
import { motion, useInView } from "framer-motion";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Award,
  Target,
  FileText,
  Brain,
  Sparkles,
  ArrowRight,
  Star,
  Users,
  Shield,
  Calendar,
  Zap,
  ChevronRight,
  Play,
  Trophy,
  TrendingUp,
  Menu,
  X,
  Globe,
  Briefcase,
  GraduationCap,
  BarChart3,
  Lightbulb,
  Timer,
  BadgeCheck,
  Gift,
  Percent
} from "lucide-react";
import VeeMascot from "@/components/common/VeeMascot";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b056345d5788acbd4e732/8bd9d7a47_ChatGPTImageNov29202511_47_17PM.png";

const easing = {
  premium: [0.22, 1, 0.36, 1],
  smooth: [0.4, 0, 0.2, 1],
};

const STATS = [
  { value: "1,500+", label: "Exam-Ready Questions", icon: Brain },
  { value: "135", label: "Course Sheets", icon: FileText },
  { value: "98%", label: "Pass Rate", icon: Trophy },
  { value: "Free", label: "Full Access", icon: Gift },
];

const FEATURES = [
  {
    icon: Brain,
    title: "1,500+ Exam Questions",
    description: "Practice with the most up-to-date 2025 theory test questions, covering all topics you'll face on exam day.",
    color: "from-[#3b82c4] to-[#2563a3]",
    bgColor: "bg-[#e8f4fa]",
  },
  {
    icon: FileText,
    title: "135 Course Sheets",
    description: "Clear, easy-to-remember summaries that break down complex rules into simple, digestible content.",
    color: "from-[#5cb83a] to-[#4a9c2e]",
    bgColor: "bg-[#eefbe7]",
  },
  {
    icon: Target,
    title: "Full Mock Exams",
    description: "Simulate the real test experience with timed exams and detailed corrections to track your progress.",
    color: "from-[#e7a83e] to-[#d4922f]",
    bgColor: "bg-[#fef7e8]",
  },
  {
    icon: Calendar,
    title: "Book Your Exam Slot",
    description: "Get step-by-step guidance to book your official theory test quickly and confidently.",
    color: "from-[#9c5fb5] to-[#7c4a91]",
    bgColor: "bg-[#f5eef8]",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Create your free account",
    description: "Sign up in seconds with just your email – no payment required.",
    icon: Users,
  },
  {
    step: 2,
    title: "Start learning immediately",
    description: "Access all 1,500+ questions and 135 course sheets right away.",
    icon: BookOpen,
  },
  {
    step: 3,
    title: "Track your progress",
    description: "See your improvement with detailed stats and mock exam scores.",
    icon: BarChart3,
  },
  {
    step: 4,
    title: "Pass with confidence",
    description: "Walk into your exam fully prepared – and get 10% off your first lesson!",
    icon: Award,
  },
];

const TESTIMONIALS = [
  {
    name: "Emma L.",
    location: "Paris",
    text: "I passed my theory test on the first try thanks to Drivee! The mock exams were exactly like the real thing.",
    rating: 5,
    avatar: "E",
  },
  {
    name: "Lucas M.",
    location: "Lyon",
    text: "The course sheets made everything so easy to understand. I went from confused to confident in just 2 weeks.",
    rating: 5,
    avatar: "L",
  },
  {
    name: "Sarah K.",
    location: "Marseille",
    text: "Free access to all this content? I couldn't believe it. Drivee is a game changer for new drivers.",
    rating: 5,
    avatar: "S",
  },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: easing.premium }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: easing.premium }
  }
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const AnimatedSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: easing.premium, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const AnimatedCounter = ({ value, duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  useEffect(() => {
    if (!isInView) return;
    const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    const steps = 40;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration * 1000 / steps);
    return () => clearInterval(timer);
  }, [isInView, value, duration]);
  
  const suffix = value.replace(/[0-9,]/g, '');
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TheoryTestPrep() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCTA = () => {
    // Navigate to StudentAuth with redirect to theory training after signup
    navigate(`${createPageUrl("StudentAuth")}?redirect=TheoryLearning&source=theory-prep`);
  };

  return (
    <div className="min-h-screen bg-white antialiased">
      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * {
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
        
        .hero-gradient {
          background: 
            radial-gradient(ellipse 120% 100% at 50% -30%, rgba(169, 213, 237, 0.4) 0%, transparent 55%),
            radial-gradient(ellipse 80% 60% at 100% 20%, rgba(59, 130, 196, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 0% 80%, rgba(129, 218, 90, 0.1) 0%, transparent 50%),
            linear-gradient(180deg, #f0f7fc 0%, #ffffff 100%);
        }
        
        .glass {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>

      {/* ================================================================ */}
      {/* NAVBAR */}
      {/* ================================================================ */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: easing.premium }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'glass border-b border-slate-200/50 shadow-premium' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to={createPageUrl("Landing")} className="flex items-center">
              <motion.img 
                whileHover={{ scale: 1.02 }}
                src={LOGO_URL} 
                alt="DRIVEE" 
                className="h-16 lg:h-20 object-contain" 
              />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link 
                to={createPageUrl("TheoryTestPrep")} 
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#3b82c4] hover:text-[#2563a3] hover:bg-[#e8f4fa] rounded-xl transition-all duration-200"
              >
                <GraduationCap className="w-4 h-4" />
                Theory Test Prep
              </Link>
              <Link 
                to={createPageUrl("BusinessSolutions")} 
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200"
              >
                <Briefcase className="w-4 h-4" />
                For Schools
              </Link>
              <Link 
                to={createPageUrl("SchoolLogin")} 
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200"
              >
                Sign In
              </Link>
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-all duration-200">
                <Globe className="w-4 h-4" />
                EN
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCTA}
                className="ml-2 px-6 py-2.5 cta-gradient text-white text-sm font-semibold rounded-xl shadow-premium hover:shadow-premium-lg transition-all duration-300"
              >
                Get Started
              </motion.button>
            </div>
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: easing.premium }}
            className="fixed inset-0 z-40 bg-white pt-20 md:hidden overflow-y-auto"
          >
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="p-6 space-y-2"
            >
              <motion.div variants={fadeUpVariant}>
                <Link 
                  to={createPageUrl("BusinessSolutions")} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-slate-600" />
                  </div>
                  For Schools
                </Link>
              </motion.div>
              <motion.div variants={fadeUpVariant}>
                <Link 
                  to={createPageUrl("SchoolLogin")} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  Sign In
                </Link>
              </motion.div>
              <motion.div variants={fadeUpVariant}>
                <button 
                  className="flex items-center gap-3 w-full p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🌍</span>
                  </div>
                  Change Region
                </button>
              </motion.div>
              <motion.div variants={fadeUpVariant} className="pt-4">
                <button 
                  onClick={() => { handleCTA(); setMobileMenuOpen(false); }}
                  className="w-full py-4 cta-gradient text-white font-bold rounded-2xl text-lg shadow-premium-lg"
                >
                  Get Started
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </motion.nav>

      {/* ================================================================ */}
      {/* HERO SECTION */}
      {/* ================================================================ */}
      <section className="hero-gradient pt-24 lg:pt-32 pb-16 lg:pb-24 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#a9d5ed]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-56 h-56 bg-[#81da5a]/15 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: easing.premium }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#d4eaf5] text-sm font-semibold text-[#3b82c4] mb-6 shadow-premium">
                <Sparkles className="w-4 h-4" />
                <span>2025 Theory Test Ready</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Pass your theory test{" "}
                <span className="text-[#3b82c4]">on the first try</span>
              </h1>

              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                Get unlimited access to <strong>1,500+ exam questions</strong>, <strong>135 course sheets</strong>, 
                and <strong>full mock exams</strong> – completely free. Start learning today and drive tomorrow.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCTA}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 cta-gradient text-white text-lg font-bold rounded-2xl shadow-lg shadow-[#3b82c4]/25 transition-all"
                >
                  Start Learning Free
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <Link
                  to={createPageUrl("Marketplace")}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 text-lg font-semibold rounded-2xl hover:border-[#a9d5ed] hover:text-[#3b82c4] transition-all"
                >
                  <Play className="w-5 h-5" />
                  See How It Works
                </Link>
              </div>

              {/* Bonus offer */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#eefbe7] to-white rounded-2xl border border-[#c8edb8] shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5cb83a] to-[#4a9c2e] flex items-center justify-center flex-shrink-0 shadow-md">
                  <Percent className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Pass your theory? Get 10% off on us! 
                    <Trophy className="w-5 h-5 text-[#e7a83e]" />
                  </p>
                  <p className="text-sm text-slate-600">We'll celebrate your success with a discount on your first driving lesson!</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Visual */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: easing.premium }}
              className="relative"
            >
              {/* Main card */}
              <div className="relative bg-white rounded-3xl shadow-premium-lg border border-[#d4eaf5]/50 p-6 lg:p-8">
                {/* Mascot */}
                <div className="absolute -top-8 -right-4 lg:-right-8">
                  <VeeMascot size="lg" mood="celebrate" animate />
                </div>

                {/* Mock exam preview */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82c4] to-[#2563a3] flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Mock Exam Preview</p>
                      <p className="text-xs text-slate-500">Question 12 of 40</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#5cb83a]">
                      <Timer className="w-4 h-4" />
                      18:42
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 mb-4">
                    <p className="text-sm font-medium text-slate-800 mb-4">
                      When approaching a pedestrian crossing, you should:
                    </p>
                    <div className="space-y-2">
                      {["Speed up to clear it quickly", "Slow down and be prepared to stop", "Honk to warn pedestrians", "Maintain your current speed"].map((option, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            idx === 1 
                              ? "border-[#5cb83a] bg-[#eefbe7]" 
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            idx === 1 ? "border-[#5cb83a] bg-[#5cb83a]" : "border-slate-300"
                          }`}>
                            {idx === 1 && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm ${idx === 1 ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#a9d5ed] to-[#3b82c4] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                            {["E", "L", "S", "M"][i]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">12,000+ students passed</span>
                    </div>
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="bg-gradient-to-r from-[#e8f4fa] to-white rounded-xl p-4 border border-[#d4eaf5]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Your Progress</span>
                    <span className="text-sm font-bold text-[#3b82c4]">78%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "78%" }}
                      transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#3b82c4] to-[#5cb83a] rounded-full"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">You're ready for the exam! 🎉</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* STATS BAR */}
      {/* ================================================================ */}
      <section className="py-8 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#e8f4fa] mb-3">
                  <stat.icon className="w-6 h-6 text-[#3b82c4]" />
                </div>
                <p className="text-2xl lg:text-3xl font-extrabold text-slate-900">
                  <AnimatedCounter value={stat.value} />
                </p>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURES SECTION */}
      {/* ================================================================ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f4fa] text-sm font-semibold text-[#3b82c4] mb-4">
              <BookOpen className="w-4 h-4" />
              Everything You Need
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-4">
              Complete theory training, <span className="text-[#3b82c4]">100% free</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We believe everyone deserves access to quality driving education. 
              That's why all our theory materials are completely free.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {FEATURES.map((feature, idx) => (
              <AnimatedSection key={feature.title} delay={idx * 0.1}>
                <div className="group h-full bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 hover:border-[#a9d5ed] shadow-premium hover:shadow-premium-lg transition-all">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.bgColor} mb-5`}>
                    <feature.icon className={`w-7 h-7 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} style={{ color: feature.color.includes('3b82c4') ? '#3b82c4' : feature.color.includes('5cb83a') ? '#5cb83a' : feature.color.includes('e7a83e') ? '#e7a83e' : '#9c5fb5' }} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS */}
      {/* ================================================================ */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eefbe7] text-sm font-semibold text-[#5cb83a] mb-4">
              <Zap className="w-4 h-4" />
              Quick Start
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-4">
              Get started in <span className="text-[#5cb83a]">4 simple steps</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From sign-up to passing your theory test – we've made it as simple as possible.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, idx) => (
              <AnimatedSection key={step.step} delay={idx * 0.1}>
                <div className="relative text-center p-6">
                  {/* Connector line */}
                  {idx < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#a9d5ed] to-transparent" />
                  )}
                  
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e8f4fa] to-[#d4eaf5] mb-5">
                    <step.icon className="w-7 h-7 text-[#3b82c4]" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#3b82c4] text-white text-sm font-bold flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* TESTIMONIALS */}
      {/* ================================================================ */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fef7e8] text-sm font-semibold text-[#e7a83e] mb-4">
              <Star className="w-4 h-4" />
              Success Stories
            </span>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-4">
              Join 12,000+ students who <span className="text-[#e7a83e]">passed</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {TESTIMONIALS.map((testimonial, idx) => (
              <AnimatedSection key={testimonial.name} delay={idx * 0.1}>
                <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-premium h-full">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-[#e7a83e] fill-[#e7a83e]" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3b82c4] to-[#2563a3] flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{testimonial.name}</p>
                      <p className="text-sm text-slate-500">{testimonial.location}</p>
                    </div>
                    <BadgeCheck className="w-5 h-5 text-[#5cb83a] ml-auto" />
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA */}
      {/* ================================================================ */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-[#3b82c4] via-[#2563a3] to-[#1e4f8a] relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#81da5a]/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-sm font-semibold text-white/90 mb-6 backdrop-blur-sm">
              <Gift className="w-4 h-4" />
              Limited Time Offer
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
              Create your account today to unlock all theory training tools for free
            </h2>
            
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              And when you pass your theory test, we'll celebrate with you! Get <strong className="text-[#81da5a]">10% off your first driving lesson on us</strong> as our congratulations gift. 
              No credit card required – just your email.
            </p>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCTA}
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white text-[#3b82c4] text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
            >
              Start Learning Free Now
              <ArrowRight className="w-5 h-5" />
            </motion.button>

            <p className="mt-6 text-sm text-white/60 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              No payment required • Instant access • Cancel anytime
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER */}
      {/* ================================================================ */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src={LOGO_URL} alt="DRIVEE" className="h-12 object-contain brightness-0 invert" />
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link to={createPageUrl("Landing")} className="hover:text-white transition-colors">Home</Link>
              <Link to={createPageUrl("Marketplace")} className="hover:text-white transition-colors">Find Schools</Link>
              <Link to={createPageUrl("BusinessSolutions")} className="hover:text-white transition-colors">For Schools</Link>
            </div>
            <p className="text-sm text-slate-500">© 2025 Drivee. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}