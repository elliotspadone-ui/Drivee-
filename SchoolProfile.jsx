import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Star,
  Car,
  Users,
  Award,
  Check,
  Shield,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ExternalLink,
  Heart,
  Clock,
  Calendar,
  Globe,
  Zap,
  MessageCircle,
  Share2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  CheckCircle,
  X,
  Image as ImageIcon,
  SlidersHorizontal,
  Play,
  Pause,
  ThumbsUp,
  Search,
  Target,
  TrendingUp,
  Timer,
  BadgeCheck,
  Quote,
  HelpCircle,
  Plus,
  Minus,
  Flame,
  Eye,
  Coffee,
  Smile,
  BookOpen,
  Navigation,
  CircleCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow, format } from "date-fns";
import RequireStudentAuth from "@/components/auth/RequireStudentAuth";

// ============================================================================
// CONSTANTS & DESIGN TOKENS
// ============================================================================

const PLACEHOLDER_HERO =
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&auto=format";

const LIFESTYLE_IMAGES = [
  "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format",
  "https://images.unsplash.com/photo-1593786326112-12b0abfa4d68?w=800&auto=format",
  "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800&auto=format",
];

const SECTION_OFFSET_PX = 96;

// Design tokens for consistent styling
const tokens = {
  primary: {
    50: "#f0f7ff",
    100: "#e0efff",
    200: "#b8dcff",
    500: "#0066cc",
    600: "#0052a3",
    700: "#003d7a",
    900: "#001f3f",
  },
  accent: {
    coral: "#ff6b6b",
    mint: "#4ecdc4",
    amber: "#fbbf24",
    violet: "#8b5cf6",
  },
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

// Teaching style options
const TEACHING_STYLES = [
  { id: "patient", label: "Patient & Calm", icon: Coffee, color: "emerald" },
  { id: "encouraging", label: "Encouraging", icon: Smile, color: "amber" },
  { id: "structured", label: "Structured", icon: BookOpen, color: "blue" },
  { id: "direct", label: "Direct & Efficient", icon: Target, color: "purple" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SchoolProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const schoolId = new URLSearchParams(location.search).get("id");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const { data, isLoading, error, queries } = useSchoolProfileData(schoolId);
  const { school, instructors, vehicles, reviews, packages } = data || {};

  const activeInstructors = useMemo(
    () => (instructors || []).filter((i) => i.is_active !== false),
    [instructors]
  );

  const stats = useMemo(
    () => computeStats(school, packages, reviews, activeInstructors),
    [school, packages, reviews, activeInstructors]
  );

  // Reordered sections based on user decision journey
  const sections = useMemo(() => {
    const items = [
      { id: "overview", label: "Overview" },
      { id: "reviews", label: "Reviews" },
      { id: "instructors", label: "Instructors" },
    ];

    if (packages?.length) items.push({ id: "packages", label: "Packages" });
    items.push({ id: "included", label: "What's Included" });
    if (vehicles?.length) items.push({ id: "vehicles", label: "Vehicles" });
    items.push({ id: "location", label: "Location" });
    items.push({ id: "faq", label: "FAQ" });

    return items;
  }, [packages?.length, vehicles?.length]);

  const handleBook = useCallback(
    (options = {}) => {
      navigate(createPageUrl("BookLesson"), {
        state: {
          schoolId,
          schoolName: school?.name,
          preferredPackageId: options.packageId || null,
          preferredInstructorId: options.instructorId || null,
          source: "school-profile",
        },
      });
    },
    [navigate, schoolId, school]
  );

  const handleBack = useCallback(() => {
    navigate(createPageUrl("Marketplace"));
  }, [navigate]);

  const handleQuizComplete = useCallback((result) => {
    setQuizResult(result);
    setShowQuiz(false);
  }, []);

  if (isLoading) return <LoadingSkeleton />;

  if (!schoolId || error || !school) {
    return (
      <ErrorState
        title={!schoolId ? "No school selected" : "School not found"}
        message={
          !schoolId
            ? "Select a school from the marketplace to view their profile."
            : "This school may have been removed or the link is incorrect."
        }
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 antialiased">
      {/* Global Styles */}
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
        
        .shadow-premium-xl {
          box-shadow: 
            0 0 0 1px rgba(0, 0, 0, 0.02),
            0 4px 8px rgba(0, 0, 0, 0.03),
            0 16px 32px rgba(0, 0, 0, 0.05),
            0 32px 64px rgba(0, 0, 0, 0.07);
        }
        
        .cta-gradient {
          background: linear-gradient(135deg, #3b82c4 0%, #2563a3 100%);
        }
        
        .cta-gradient:hover {
          background: linear-gradient(135deg, #2563a3 0%, #1e4f8a 100%);
        }
        
        .accent-gradient {
          background: linear-gradient(135deg, #3b82c4 0%, #a9d5ed 50%, #6c376f 100%);
        }
        
        .glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #3b82c4 0%, #a9d5ed 50%, #6c376f 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Top Navigation */}
      <TopBar school={school} onBack={handleBack} />

      {/* Hero Section - Full Bleed */}
      <HeroSection school={school} stats={stats} reviews={reviews} />

      {/* Trust Bar - Quick wins */}
      <TrustBar stats={stats} school={school} />

      {/* Sticky Section Nav */}
      <SectionNav items={sections} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-12">
          {/* Left Column */}
          <div className="space-y-12">
            {/* Overview with Why Choose Us */}
            <section id="overview" className="scroll-mt-28">
              <WhyChooseUs school={school} stats={stats} />
              <div className="mt-8">
                <CategoryRatings reviews={reviews} />
              </div>
            </section>

            {/* Reviews - Moved up for trust */}
            <section id="reviews" className="scroll-mt-28">
              <ReviewsSection
                reviews={reviews}
                stats={stats}
                isFetching={queries.reviews.isFetching}
              />
            </section>

            {/* Instructors with enhanced info */}
            <section id="instructors" className="scroll-mt-28">
              <InstructorsSection
                instructors={activeInstructors}
                isFetching={queries.instructors.isFetching}
                onViewProfile={(id) =>
                  navigate(`${createPageUrl("InstructorProfile")}?id=${id}`)
                }
                onBook={(instructorId) => handleBook({ instructorId })}
              />
            </section>

            {/* Packages with Quiz */}
            {packages?.length > 0 && (
              <section id="packages" className="scroll-mt-28">
                <PackagesSection
                  packages={packages}
                  stats={stats}
                  isFetching={queries.packages.isFetching}
                  onSelect={(pkg) => handleBook({ packageId: pkg.id })}
                  onOpenQuiz={() => setShowQuiz(true)}
                  quizResult={quizResult}
                />
              </section>
            )}

            {/* What's Included */}
            <section id="included" className="scroll-mt-28">
              <WhatsIncluded school={school} />
            </section>

            {/* Vehicles */}
            {vehicles?.length > 0 && (
              <section id="vehicles" className="scroll-mt-28">
                <VehiclesSection vehicles={vehicles} />
              </section>
            )}

            {/* Location */}
            <section id="location" className="scroll-mt-28">
              <LocationSection school={school} />
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-28 pb-32 lg:pb-8">
              <FAQSection school={school} />
            </section>
          </div>

          {/* Right Column - Booking Sidebar (Desktop) */}
          <div className="hidden lg:block">
            <BookingSidebar
              school={school}
              stats={stats}
              onBook={handleBook}
              schoolId={schoolId}
              packages={packages}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <MobileBookingFAB
        stats={stats}
        onBook={handleBook}
        schoolId={schoolId}
        schoolName={school?.name}
      />

      {/* Quiz Modal */}
      <AnimatePresence>
        {showQuiz && (
          <PackageQuizModal
            packages={packages}
            onClose={() => setShowQuiz(false)}
            onComplete={handleQuizComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// DATA FETCHING
// ============================================================================

function useSchoolProfileData(schoolId) {
  const enabled = Boolean(schoolId);

  const schoolQuery = useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      const result = await base44.entities.School.filter({ id: schoolId });
      return result[0] || null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const instructorsQuery = useQuery({
    queryKey: ["schoolInstructors", schoolId],
    queryFn: () => base44.entities.Instructor.filter({ school_id: schoolId }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["schoolVehicles", schoolId],
    queryFn: () => base44.entities.Vehicle.filter({ school_id: schoolId }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const reviewsQuery = useQuery({
    queryKey: ["schoolReviews", schoolId],
    queryFn: () => base44.entities.Review.filter({ school_id: schoolId }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const packagesQuery = useQuery({
    queryKey: ["schoolPackages", schoolId],
    queryFn: () => base44.entities.Package.filter({ school_id: schoolId, is_active: true }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: {
      school: schoolQuery.data,
      instructors: instructorsQuery.data || [],
      vehicles: vehiclesQuery.data || [],
      reviews: reviewsQuery.data || [],
      packages: packagesQuery.data || [],
    },
    isLoading: schoolQuery.isLoading,
    error: schoolQuery.error,
    queries: {
      school: schoolQuery,
      instructors: instructorsQuery,
      vehicles: vehiclesQuery,
      reviews: reviewsQuery,
      packages: packagesQuery,
    },
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatEUR(amount, digits = 0) {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "€0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: digits,
  }).format(n);
}

function safeNum(v, fallback) {
  return Number.isFinite(Number(v)) ? Number(v) : fallback;
}

function computeStats(school, packages, reviews, instructors) {
  const lessonPrices = (packages || [])
    .map((p) => {
      const total = safeNum(p.total_price, null);
      const n = safeNum(p.number_of_lessons, null);
      if (Number.isFinite(total) && Number.isFinite(n) && n > 0) return total / n;
      return safeNum(p.price_per_lesson, null);
    })
    .filter((p) => Number.isFinite(p) && p > 0);

  const minLessonPrice =
    lessonPrices.length > 0
      ? Math.min(...lessonPrices)
      : safeNum(school?.base_price, 45);

  const packageTotals = (packages || [])
    .map((p) => safeNum(p.total_price, null))
    .filter((p) => Number.isFinite(p) && p > 0);

  const minPackageTotal = packageTotals.length > 0 ? Math.min(...packageTotals) : null;

  let avgRating = safeNum(school?.rating, 4.8);
  let reviewCount = safeNum(school?.total_reviews, 0);

  if (reviews && reviews.length > 0) {
    const valid = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0);
    if (valid.length > 0) {
      avgRating = valid.reduce((sum, r) => sum + r.rating, 0) / valid.length;
    }
    reviewCount = reviews.length;
  }

  const passRate = safeNum(school?.pass_rate, 0.92);
  const totalStudents = safeNum(school?.total_students, 1200);
  const yearsActive = safeNum(school?.years_active, 5);
  const instructorCount = instructors?.length ?? 0;

  // Calculate category ratings from reviews
  const categoryRatings = {
    teaching: avgRating,
    punctuality: Math.min(5, avgRating + 0.1),
    vehicle: Math.min(5, avgRating + 0.05),
    value: Math.max(4, avgRating - 0.2),
    communication: avgRating,
  };

  // Calculate recent bookings (simulated)
  const recentBookings = Math.floor(Math.random() * 8) + 3;

  return {
    minLessonPrice,
    minPackageTotal,
    avgRating,
    reviewCount,
    passRate,
    passRateFormatted: `${Math.round(passRate * 100)}%`,
    totalStudents,
    yearsActive,
    instructorCount,
    categoryRatings,
    recentBookings,
  };
}

function useScrollSpy(sectionIds = [], offset = SECTION_OFFSET_PX) {
  const [active, setActive] = useState(sectionIds[0] || "");

  useEffect(() => {
    if (!sectionIds.length) return;

    const handler = () => {
      const y = window.scrollY + offset;
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= y) current = id;
      }

      setActive(current);
    };

    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [sectionIds, offset]);

  return active;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - SECTION_OFFSET_PX;
  window.scrollTo({ top: y, behavior: "smooth" });
}

// ============================================================================
// SCROLL PROGRESS INDICATOR
// ============================================================================

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066cc] to-[#4ecdc4] origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

// ============================================================================
// TOP BAR
// ============================================================================

function TopBar({ school, onBack }) {
  const [saved, setSaved] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSave = () => {
    setSaved(!saved);
    if (!saved) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 600);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: school.name,
          text: `Check out ${school.name} on Drivee`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/50 shadow-premium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="hidden sm:inline">Back to schools</span>
        </button>

        {/* Breadcrumb - Desktop */}
        <nav className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Schools</span>
          <ChevronRight className="w-4 h-4" />
          <span className="hover:text-gray-700 cursor-pointer">{school.city || "Amsterdam"}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{school.name}</span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
            <AnimatePresence>
              {showCopied && (
                <motion.span
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg"
                >
                  Link copied!
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={handleSave}
            className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
            aria-label={saved ? "Remove from saved" : "Save school"}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={saved ? "saved" : "unsaved"}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    saved ? "fill-[#ff6b6b] text-[#ff6b6b]" : "text-gray-600"
                  }`}
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Confetti effect */}
            <AnimatePresence>
              {showConfetti && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ["#ff6b6b", "#4ecdc4", "#fbbf24", "#8b5cf6"][i % 4],
                        top: "50%",
                        left: "50%",
                      }}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: [0, (Math.random() - 0.5) * 60],
                        y: [0, (Math.random() - 0.5) * 60],
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// SECTION NAV
// ============================================================================

function SectionNav({ items }) {
  const ids = items.map((i) => i.id);
  const active = useScrollSpy(ids);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Scroll active item into view
    const activeEl = scrollRef.current?.querySelector(`[data-section="${active}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [active]);

  return (
    <div className="sticky top-16 z-40 glass border-b border-slate-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto py-3 no-scrollbar"
        >
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                data-section={item.id}
                onClick={() => scrollToSection(item.id)}
                className={[
                  "relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95",
                  isActive
                    ? "text-[#0066cc]"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                ].join(" ")}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute inset-0 bg-[#0066cc]/10 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HERO SECTION - FULL BLEED WITH EMOTIONAL IMPACT
// ============================================================================

function HeroSection({ school, stats, reviews }) {
  const [showPhotos, setShowPhotos] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const images = useMemo(() => {
    const list = [
      school.cover_image_url,
      school.hero_image_url,
      ...(school.gallery_urls || []),
      ...(school.photos || []),
    ].filter(Boolean);

    return list.length ? list : [PLACEHOLDER_HERO, ...LIFESTYLE_IMAGES];
  }, [school]);

  // Find a success story from reviews
  const successStory = useMemo(() => {
    const passedReviews = (reviews || []).filter(
      (r) => r.rating >= 4 && (r.comment || "").toLowerCase().includes("pass")
    );
    return passedReviews[0] || null;
  }, [reviews]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);

  return (
    <section className="relative">
      {/* Full-bleed gallery container */}
      <div className="relative h-[50vh] sm:h-[55vh] lg:h-[65vh] overflow-hidden">
        {/* Main image carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <img
              src={images[currentSlide]}
              alt={`${school.name} - photo ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Carousel controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all active:scale-95 z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center transition-all active:scale-95 z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide indicators */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.slice(0, 5).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentSlide
                      ? "bg-white w-6"
                      : "bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* View all photos button */}
        <button
          onClick={() => setShowPhotos(true)}
          className="absolute bottom-24 right-4 sm:right-6 px-4 py-2.5 rounded-full bg-white/95 hover:bg-white text-gray-900 text-sm font-semibold shadow-lg transition-all active:scale-95 flex items-center gap-2 z-10"
        >
          <ImageIcon className="w-4 h-4" />
          <span>{images.length} photos</span>
        </button>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              {/* School info */}
              <div className="text-white">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified School
                  </span>
                  {stats.passRate >= 0.9 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4ecdc4]/30 backdrop-blur-md text-white text-xs font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      {stats.passRateFormatted} Pass Rate
                    </span>
                  )}
                  {stats.recentBookings > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff6b6b]/30 backdrop-blur-md text-white text-xs font-semibold animate-pulse-soft">
                      <Flame className="w-3.5 h-3.5" />
                      {stats.recentBookings} booked this week
                    </span>
                  )}
                </div>

                {/* School name */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 drop-shadow-lg tracking-tight">
                  {school.name}
                </h1>

                {/* Quick info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/90">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">{stats.avgRating.toFixed(2)}</span>
                    <span className="text-white/70">({stats.reviewCount} reviews)</span>
                  </div>
                  {school.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{school.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    <span>{stats.totalStudents.toLocaleString()}+ students</span>
                  </div>
                </div>
              </div>

              {/* Price card - Mobile/Tablet */}
              <div className="lg:hidden bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-elevated">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-gray-600">From</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">{formatEUR(stats.minLessonPrice)}</span>
                      <span className="text-gray-500">/ lesson</span>
                    </div>
                  </div>
                  <button
                    onClick={() => scrollToSection("packages")}
                    className="px-5 py-3 bg-[#0066cc] hover:bg-[#0052a3] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-[#0066cc]/30"
                  >
                    View packages
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success story spotlight */}
        {successStory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute top-4 right-4 max-w-xs bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-elevated hidden lg:block"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4ecdc4] to-[#0066cc] flex items-center justify-center flex-shrink-0">
                <Quote className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                  "{successStory.comment}"
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= successStory.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-1">Passed first time!</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Photo modal */}
      <AnimatePresence>
        {showPhotos && (
          <PhotoModal
            title={school.name}
            images={images}
            onClose={() => setShowPhotos(false)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================================================
// TRUST BAR - QUICK WINS
// ============================================================================

function TrustBar({ stats, school }) {
  const trustItems = [
    {
      icon: Award,
      text: `${stats.passRateFormatted} pass on first try`,
      highlight: true,
    },
    {
      icon: Calendar,
      text: "Same-week availability",
    },
    {
      icon: Navigation,
      text: "Free pickup from home/work",
    },
    {
      icon: Shield,
      text: "Free cancellation 24h before",
    },
  ];

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center gap-6 overflow-x-auto no-scrollbar">
          {trustItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 whitespace-nowrap text-sm ${
                item.highlight ? "text-[#0066cc] font-semibold" : "text-gray-600"
              }`}
            >
              <item.icon className={`w-4 h-4 ${item.highlight ? "text-[#4ecdc4]" : ""}`} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PHOTO MODAL
// ============================================================================

function PhotoModal({ title, images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % images.length);
      if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, images.length]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full h-full flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white z-10">
          <div className="font-semibold">{title}</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70">{currentIndex + 1} / {images.length}</span>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
            className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="p-4">
          <div className="flex gap-2 justify-center overflow-x-auto no-scrollbar">
            {images.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                  idx === currentIndex
                    ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                    : "opacity-50 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// WHY CHOOSE US SECTION
// ============================================================================

function WhyChooseUs({ school, stats }) {
  const differentiators = [
    {
      icon: Award,
      title: `${stats.passRateFormatted} First-Time Pass Rate`,
      description: "Our students consistently outperform the national average",
      color: "emerald",
    },
    {
      icon: Users,
      title: "Expert Instructors",
      description: `${stats.instructorCount} certified instructors with an average of 8+ years experience`,
      color: "blue",
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "Book lessons 7 days a week, from early morning to evening",
      color: "violet",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Why choose {school.name}
        </h2>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <Eye className="w-4 h-4" />
          <span>{Math.floor(Math.random() * 50) + 20} viewing now</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {differentiators.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="group relative bg-white rounded-2xl border border-gray-200 p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                item.color === "emerald"
                  ? "bg-emerald-50 text-emerald-600"
                  : item.color === "blue"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-violet-50 text-violet-600"
              }`}
            >
              <item.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </motion.div>
        ))}
      </div>

      {/* About text */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-card">
        <h3 className="font-bold text-gray-900 mb-3">About the school</h3>
        <p className="text-gray-600 leading-relaxed">
          {school.description ||
            `${school.name} has been helping students become confident drivers for ${stats.yearsActive} years. Our personalized approach combines modern teaching techniques with patient, supportive instruction. Whether you're a complete beginner or looking to refresh your skills, we tailor each lesson to your unique needs and learning pace.`}
        </p>

        {school.languages?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Languages:</span>
              <span className="font-medium text-gray-700">{school.languages.join(", ")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY RATINGS - AIRBNB STYLE
// ============================================================================

function CategoryRatings({ reviews }) {
  const categories = useMemo(() => {
    // In a real app, these would be calculated from reviews
    const baseRating = reviews?.length
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 4.8;

    return [
      { name: "Teaching Quality", rating: Math.min(5, baseRating + 0.1), icon: GraduationCap },
      { name: "Punctuality", rating: Math.min(5, baseRating + 0.05), icon: Clock },
      { name: "Vehicle Condition", rating: Math.min(5, baseRating + 0.15), icon: Car },
      { name: "Value for Money", rating: Math.max(4, baseRating - 0.1), icon: TrendingUp },
      { name: "Communication", rating: baseRating, icon: MessageCircle },
      { name: "Flexibility", rating: Math.min(5, baseRating + 0.08), icon: Calendar },
    ];
  }, [reviews]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card">
      <h3 className="font-bold text-gray-900 mb-4">Ratings by category</h3>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <cat.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{cat.name}</span>
                <span className="text-sm font-semibold text-gray-900">{cat.rating.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gray-900 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(cat.rating / 5) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// REVIEWS SECTION - ENHANCED
// ============================================================================

function ReviewsSection({ reviews, stats, isFetching }) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | 5star | passed | photos
  const [helpfulReviews, setHelpfulReviews] = useState(new Set());

  const filteredReviews = useMemo(() => {
    let result = [...(reviews || [])];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((r) =>
        (r.comment || "").toLowerCase().includes(query)
      );
    }

    // Rating filter
    if (filter === "5star") {
      result = result.filter((r) => r.rating === 5);
    } else if (filter === "passed") {
      result = result.filter((r) =>
        (r.comment || "").toLowerCase().includes("pass")
      );
    }

    // Sort by newest
    result.sort((a, b) => {
      const da = a.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b.created_date ? new Date(b.created_date).getTime() : 0;
      return db - da;
    });

    return result;
  }, [reviews, searchQuery, filter]);

  const displayed = showAll ? filteredReviews : filteredReviews.slice(0, 4);

  // Find highlighted review (most helpful)
  const highlightedReview = useMemo(() => {
    const withComments = (reviews || []).filter(
      (r) => (r.comment || "").length > 50 && r.rating >= 4
    );
    return withComments[0] || null;
  }, [reviews]);

  const handleHelpful = (reviewId) => {
    setHelpfulReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  if (!reviews?.length) {
    return (
      <section>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
          Reviews
        </h2>
        <EmptyState
          icon={MessageCircle}
          title="No reviews yet"
          description="Be the first to leave a review after your lesson."
        />
      </section>
    );
  }

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => Math.floor(r.rating) === rating).length;
    return { rating, count, percentage: (count / reviews.length) * 100 };
  });

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Reviews
        </h2>
        {isFetching && (
          <span className="text-sm text-gray-400">Updating...</span>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card mb-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Overall rating */}
          <div className="text-center lg:text-left lg:pr-8 lg:border-r border-gray-100">
            <div className="font-display text-6xl font-bold text-gray-900 mb-2">
              {stats.avgRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.avgRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200 fill-gray-200"
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500">{stats.reviewCount} reviews</div>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-2">
            {distribution.map((item) => (
              <button
                key={item.rating}
                onClick={() => setFilter(item.rating === 5 ? "5star" : "all")}
                className="w-full flex items-center gap-3 text-sm group hover:bg-gray-50 rounded-lg p-1 -ml-1 transition-colors"
              >
                <span className="w-4 text-gray-600 font-medium">{item.rating}</span>
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-yellow-400 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="w-8 text-gray-400 text-right">{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews (e.g., 'nervous', 'automatic')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 focus:border-[#0066cc] transition-all"
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-2">
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </FilterChip>
              <FilterChip
                active={filter === "5star"}
                onClick={() => setFilter("5star")}
              >
                5 stars
              </FilterChip>
              <FilterChip
                active={filter === "passed"}
                onClick={() => setFilter("passed")}
              >
                <CircleCheck className="w-3.5 h-3.5" />
                Passed
              </FilterChip>
            </div>
          </div>

          {searchQuery || filter !== "all" ? (
            <div className="mt-3 text-sm text-gray-500">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </div>
          ) : null}
        </div>
      </div>

      {/* Highlighted review */}
      {highlightedReview && !searchQuery && filter === "all" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#0066cc]/5 to-[#4ecdc4]/5 rounded-2xl border border-[#0066cc]/20 p-6 mb-4"
        >
          <div className="flex items-center gap-2 text-[#0066cc] text-sm font-semibold mb-3">
            <Sparkles className="w-4 h-4" />
            Most helpful review
          </div>
          <p className="text-gray-700 leading-relaxed mb-3">"{highlightedReview.comment}"</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= highlightedReview.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
              {highlightedReview.passed_first_time && (
                <span className="ml-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✓ Passed first time
                </span>
              )}
            </div>
            {highlightedReview.created_date && (
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(highlightedReview.created_date), { addSuffix: true })}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {/* Review list */}
      <div className="space-y-4">
        {displayed.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card hover:shadow-card-hover transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066cc] to-[#4ecdc4] flex items-center justify-center text-white font-semibold text-sm">
                  {review.reviewer_name?.charAt(0) || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {review.reviewer_name || "Student"}
                    </span>
                    {review.verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#0066cc] font-medium">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {review.created_date && (
                      <span>
                        {formatDistanceToNow(new Date(review.created_date), { addSuffix: true })}
                      </span>
                    )}
                    {review.package_name && (
                      <>
                        <span>•</span>
                        <span>{review.package_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= (review.rating || 0)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Outcome tag */}
            {(review.passed_first_time ||
              (review.comment || "").toLowerCase().includes("pass")) && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Passed {review.passed_first_time ? "first time" : "exam"}
                </span>
              </div>
            )}

            <p className="text-gray-600 leading-relaxed">
              {(review.comment || "").trim() || "No written comment."}
            </p>

            {/* Helpful button */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => handleHelpful(review.id)}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  helpfulReviews.has(review.id)
                    ? "text-[#0066cc] font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ThumbsUp
                  className={`w-4 h-4 ${
                    helpfulReviews.has(review.id) ? "fill-current" : ""
                  }`}
                />
                <span>
                  {helpfulReviews.has(review.id) ? "Helpful" : "Was this helpful?"}
                </span>
                {review.helpful_count > 0 && (
                  <span className="text-gray-400">
                    ({review.helpful_count + (helpfulReviews.has(review.id) ? 1 : 0)})
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredReviews.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-3.5 text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        >
          {showAll ? "Show less" : `Show all ${filteredReviews.length} reviews`}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </section>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// INSTRUCTORS SECTION - ENHANCED
// ============================================================================

function InstructorsSection({ instructors, onViewProfile, onBook, isFetching }) {
  const [showAll, setShowAll] = useState(false);

  if (!instructors?.length) {
    return (
      <section>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
          Meet your instructors
        </h2>
        <EmptyState
          icon={Users}
          title="Instructor matched on booking"
          description="Book a lesson and we'll match you with the best available instructor based on your preferences."
        />
      </section>
    );
  }

  const displayed = showAll ? instructors : instructors.slice(0, 3);

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Meet your instructors
          </h2>
          <p className="text-gray-500 mt-1">{instructors.length} available to book</p>
        </div>
        {isFetching && (
          <span className="text-sm text-gray-400">Updating...</span>
        )}
      </div>

      <div className="space-y-4">
        {displayed.map((instructor, index) => (
          <InstructorCard
            key={instructor.id}
            instructor={instructor}
            index={index}
            onViewProfile={onViewProfile}
            onBook={onBook}
          />
        ))}
      </div>

      {instructors.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-3.5 text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center justify-center gap-2 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
        >
          {showAll ? "Show less" : `Show all ${instructors.length} instructors`}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </section>
  );
}

function InstructorCard({ instructor, index, onViewProfile, onBook }) {
  const [showVideo, setShowVideo] = useState(false);

  // Simulated availability
  const nextAvailable = useMemo(() => {
    const options = ["Tomorrow 9:00 AM", "Today 4:00 PM", "Wed 10:30 AM", "Thu 2:00 PM"];
    return options[index % options.length];
  }, [index]);

  // Teaching style (would come from data in real app)
  const teachingStyle = TEACHING_STYLES[index % TEACHING_STYLES.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card hover:shadow-card-hover transition-all"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Avatar with video play button */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0066cc] to-[#4ecdc4] flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
            {instructor.photo_url ? (
              <img
                src={instructor.photo_url}
                alt={instructor.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              instructor.full_name?.charAt(0) || "?"
            )}
          </div>
          {instructor.intro_video_url && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Play className="w-4 h-4 text-[#0066cc] ml-0.5" />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {instructor.full_name || "Instructor"}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{safeNum(instructor.years_experience, 3)}+ years experience</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium text-gray-700">
                    {Number.isFinite(instructor.rating) ? instructor.rating.toFixed(1) : "5.0"}
                  </span>
                </div>
              </div>
            </div>

            {/* Availability badge */}
            <div className="hidden sm:block text-right">
              <div className="text-xs text-gray-500 mb-1">Next available</div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                <Zap className="w-3.5 h-3.5" />
                {nextAvailable}
              </div>
            </div>
          </div>

          {/* Teaching style */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                teachingStyle.color === "emerald"
                  ? "bg-emerald-50 text-emerald-700"
                  : teachingStyle.color === "amber"
                  ? "bg-amber-50 text-amber-700"
                  : teachingStyle.color === "blue"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-violet-50 text-violet-700"
              }`}
            >
              <teachingStyle.icon className="w-3.5 h-3.5" />
              {teachingStyle.label}
            </span>

            {instructor.languages?.slice(0, 2).map((lang) => (
              <span
                key={lang}
                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
              >
                {lang}
              </span>
            ))}

            {instructor.specializations?.slice(0, 1).map((spec) => (
              <span
                key={spec}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Student quote */}
          {instructor.featured_review && (
            <p className="text-sm text-gray-600 italic mb-3 line-clamp-2">
              "{instructor.featured_review}"
            </p>
          )}

          {/* Match indicator */}
          {instructor.good_for_beginners && (
            <div className="flex items-center gap-2 text-sm text-[#0066cc] mb-3">
              <Target className="w-4 h-4" />
              <span className="font-medium">Great for nervous beginners</span>
            </div>
          )}

          {/* Mobile availability */}
          <div className="sm:hidden mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />
              Next: {nextAvailable}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onViewProfile(instructor.id)}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              View profile
            </button>
            <button
              onClick={() => onBook(instructor.id)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#0066cc] hover:bg-[#0052a3] rounded-xl transition-colors"
            >
              Book with {instructor.full_name?.split(" ")[0] || "them"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PACKAGES SECTION - WITH QUIZ AND COMPARISON
// ============================================================================

function PackagesSection({ packages, stats, isFetching, onSelect, onOpenQuiz, quizResult }) {
  const [viewMode, setViewMode] = useState("cards"); // cards | compare
  const sortedPackages = [...packages].sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
  const popularIndex = sortedPackages.length > 1 ? 1 : 0;

  // Find recommended package from quiz
  const recommendedId = quizResult?.recommendedPackageId;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Choose your package
          </h2>
          <p className="text-gray-500 mt-1">
            Single lessons from {formatEUR(stats.minLessonPrice)} or save with a bundle
          </p>
        </div>

        <div className="flex gap-2">
          {/* Quiz button */}
          <button
            onClick={onOpenQuiz}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0066cc]/10 to-[#4ecdc4]/10 text-[#0066cc] hover:from-[#0066cc]/20 hover:to-[#4ecdc4]/20 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            Which package is right for me?
          </button>

          {/* View toggle */}
          <div className="hidden sm:flex rounded-xl border border-gray-200 p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("compare")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "compare"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Quiz result banner */}
      {quizResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#4ecdc4]/10 to-[#0066cc]/10 border border-[#0066cc]/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0066cc] flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Based on your answers</div>
              <div className="text-sm text-gray-600">
                We recommend the <span className="font-medium text-[#0066cc]">{quizResult.packageName}</span> package
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {viewMode === "cards" ? (
        <div className="space-y-4">
          {sortedPackages.map((pkg, index) => {
            const isPopular = index === popularIndex;
            const isRecommended = pkg.id === recommendedId;

            return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={index}
                isPopular={isPopular}
                isRecommended={isRecommended}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      ) : (
        <PackageComparisonTable packages={sortedPackages} onSelect={onSelect} />
      )}
    </section>
  );
}

function PackageCard({ pkg, index, isPopular, isRecommended, onSelect }) {
  const total = safeNum(pkg.total_price, null);
  const lessons = safeNum(pkg.number_of_lessons, null);
  const pricePerLesson =
    Number.isFinite(total) && Number.isFinite(lessons) && lessons > 0
      ? total / lessons
      : null;

  const savings =
    Number.isFinite(pkg.discount_percentage) && pkg.discount_percentage > 0
      ? pkg.discount_percentage
      : null;

  // Simulated stats
  const passRate = 85 + Math.min(index * 4, 10);
  const avgMonths = 2 + index * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05 }}
      className={`relative bg-white rounded-2xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-card-hover ${
        isRecommended
          ? "border-[#4ecdc4] shadow-lg shadow-[#4ecdc4]/20"
          : isPopular
          ? "border-[#0066cc] shadow-lg shadow-[#0066cc]/10"
          : "border-gray-200"
      }`}
    >
      {/* Badge */}
      {(isRecommended || isPopular) && (
        <div
          className={`absolute -top-3 left-5 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            isRecommended
              ? "bg-[#4ecdc4] text-white"
              : "bg-[#0066cc] text-white"
          }`}
        >
          {isRecommended ? (
            <>
              <Target className="w-3 h-3" />
              Recommended for you
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Most popular
            </>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg mb-1">{pkg.name}</h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
            {pkg.number_of_lessons && (
              <span className="font-medium">{pkg.number_of_lessons} lessons</span>
            )}
            {pkg.duration_per_lesson && (
              <span>• {pkg.duration_per_lesson} min each</span>
            )}
            {pricePerLesson && (
              <span className="text-emerald-600 font-semibold">
                • {formatEUR(pricePerLesson, 2)}/lesson
              </span>
            )}
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-2 mb-3">
            {pkg.includes_theory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                <Check className="w-3 h-3" />
                Theory included
              </span>
            )}
            {pkg.includes_exam_car && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                <Car className="w-3 h-3" />
                Exam car
              </span>
            )}
            {pkg.flexible_pickup && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">
                <MapPin className="w-3 h-3" />
                Free pickup
              </span>
            )}
          </div>

          {/* Student stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>{passRate}% pass rate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-blue-500" />
              <span>~{avgMonths.toFixed(1)} months avg</span>
            </div>
          </div>
        </div>

        {/* Price and CTA */}
        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-4">
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-gray-900">
              {formatEUR(pkg.total_price)}
            </div>
            {savings && (
              <div className="text-sm font-semibold text-emerald-600">
                Save {savings}%
              </div>
            )}
          </div>
          <button
            onClick={() => onSelect(pkg)}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              isRecommended
                ? "bg-[#4ecdc4] hover:bg-[#3dbdb5] text-white shadow-lg shadow-[#4ecdc4]/30"
                : isPopular
                ? "bg-[#0066cc] hover:bg-[#0052a3] text-white shadow-lg shadow-[#0066cc]/30"
                : "bg-gray-900 hover:bg-gray-800 text-white"
            }`}
          >
            Select package
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PackageComparisonTable({ packages, onSelect }) {
  const features = [
    { key: "number_of_lessons", label: "Number of lessons" },
    { key: "duration_per_lesson", label: "Lesson duration", suffix: " min" },
    { key: "total_price", label: "Total price", format: formatEUR },
    { key: "price_per_lesson", label: "Price per lesson", format: (v, pkg) => {
      const total = safeNum(pkg.total_price, null);
      const n = safeNum(pkg.number_of_lessons, null);
      if (total && n) return formatEUR(total / n, 2);
      return "—";
    }},
    { key: "includes_theory", label: "Theory included", boolean: true },
    { key: "includes_exam_car", label: "Exam car included", boolean: true },
    { key: "flexible_pickup", label: "Free pickup", boolean: true },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-4 text-sm font-medium text-gray-500">Feature</th>
            {packages.map((pkg, idx) => (
              <th key={pkg.id} className="p-4 text-center">
                <div className="font-bold text-gray-900">{pkg.name}</div>
                {idx === 1 && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-[#0066cc] text-white rounded-full">
                    Popular
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => (
            <tr key={feature.key} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
              <td className="p-4 text-sm text-gray-600">{feature.label}</td>
              {packages.map((pkg) => {
                let value = pkg[feature.key];

                if (feature.format) {
                  value = feature.format(value, pkg);
                } else if (feature.boolean) {
                  value = value ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mx-auto" />
                  );
                } else if (feature.suffix) {
                  value = value ? `${value}${feature.suffix}` : "—";
                }

                return (
                  <td key={pkg.id} className="p-4 text-center text-sm font-medium text-gray-900">
                    {value || "—"}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-gray-200">
            <td className="p-4"></td>
            {packages.map((pkg, idx) => (
              <td key={pkg.id} className="p-4 text-center">
                <button
                  onClick={() => onSelect(pkg)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    idx === 1
                      ? "bg-[#0066cc] text-white hover:bg-[#0052a3]"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  Select
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// PACKAGE QUIZ MODAL
// ============================================================================

function PackageQuizModal({ packages, onClose, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const questions = [
    {
      id: "experience",
      question: "What's your driving experience?",
      options: [
        { value: "none", label: "Complete beginner", icon: BookOpen },
        { value: "some", label: "Had a few lessons before", icon: Car },
        { value: "refresher", label: "Licensed but need practice", icon: Target },
      ],
    },
    {
      id: "timeline",
      question: "When do you want to pass your test?",
      options: [
        { value: "asap", label: "As soon as possible", icon: Zap },
        { value: "3months", label: "Within 3 months", icon: Calendar },
        { value: "flexible", label: "No rush, flexible", icon: Coffee },
      ],
    },
    {
      id: "budget",
      question: "What's your budget priority?",
      options: [
        { value: "value", label: "Best value for money", icon: TrendingUp },
        { value: "comprehensive", label: "Most comprehensive package", icon: Award },
        { value: "minimal", label: "Just the basics", icon: Target },
      ],
    },
  ];

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;

  const handleAnswer = (value) => {
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);

    if (isLastStep) {
      // Calculate recommendation
      const sortedPackages = [...packages].sort(
        (a, b) => (a.total_price || 0) - (b.total_price || 0)
      );

      let recommendedIndex = 1; // Default to middle/popular

      if (newAnswers.experience === "none" || newAnswers.budget === "comprehensive") {
        recommendedIndex = Math.min(sortedPackages.length - 1, 2);
      } else if (newAnswers.budget === "minimal" || newAnswers.experience === "refresher") {
        recommendedIndex = 0;
      }

      const recommended = sortedPackages[recommendedIndex];

      onComplete({
        answers: newAnswers,
        recommendedPackageId: recommended?.id,
        packageName: recommended?.name,
      });
    } else {
      setStep(step + 1);
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-elevated overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0066cc] to-[#4ecdc4]"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="text-sm text-gray-500">
            Question {step + 1} of {questions.length}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Question */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-extrabold text-slate-900 mb-6">
                {currentQuestion.question}
              </h3>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#0066cc] hover:bg-[#0066cc]/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-[#0066cc]/10 flex items-center justify-center transition-colors">
                      <option.icon className="w-6 h-6 text-gray-600 group-hover:text-[#0066cc] transition-colors" />
                    </div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Back button */}
        {step > 0 && (
          <div className="px-6 pb-6">
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// WHAT'S INCLUDED SECTION
// ============================================================================

function WhatsIncluded({ school }) {
  const included = [
    {
      icon: Car,
      title: "Modern dual-control vehicles",
      description: "Learn in safe, well-maintained cars with dual controls",
    },
    {
      icon: Navigation,
      title: "Free pickup service",
      description: "We pick you up from home, work, or school",
    },
    {
      icon: Shield,
      title: "Fully insured lessons",
      description: "All lessons are fully insured for your peace of mind",
    },
    {
      icon: Calendar,
      title: "Flexible scheduling",
      description: "Book lessons that fit your schedule, 7 days a week",
    },
    {
      icon: BookOpen,
      title: "Theory test support",
      description: "Access to theory practice tests and study materials",
    },
    {
      icon: Award,
      title: "Certified instructors",
      description: "All instructors are certified and background-checked",
    },
  ];

  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
        What's included
      </h2>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card">
        <div className="grid sm:grid-cols-2 gap-6">
          {included.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0066cc]/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-[#0066cc]" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-0.5">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// VEHICLES SECTION
// ============================================================================

function VehiclesSection({ vehicles }) {
  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
        Our vehicles
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        {vehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card hover:shadow-card-hover transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Car className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {vehicle.transmission && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium capitalize">
                      {vehicle.transmission}
                    </span>
                  )}
                  {vehicle.year && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                      {vehicle.year}
                    </span>
                  )}
                  {vehicle.is_electric && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Electric
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// LOCATION SECTION
// ============================================================================

function LocationSection({ school }) {
  const serviceAreas = school.service_areas || [
    `${school.city} Centrum`,
    `${school.city} West`,
    `${school.city} Zuid`,
    `${school.city} Oost`,
  ];

  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
        Location & service area
      </h2>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
        {/* Map placeholder */}
        <div className="h-48 bg-gradient-to-br from-[#0066cc]/10 to-[#4ecdc4]/10 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-[#0066cc] mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {school.address || `${school.city}, Netherlands`}
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Address */}
          {school.address && (
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900">{school.address}</div>
                <div className="text-sm text-gray-500">
                  {[school.postal_code, school.city].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* Service areas */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Serves areas</h4>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Contact buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            {school.phone && (
              <a
                href={`tel:${school.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {school.email && (
              <a
                href={`mailto:${school.email}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
            {school.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ SECTION
// ============================================================================

function FAQSection({ school }) {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How do I book my first lesson?",
      answer:
        "Simply click the 'Book a lesson' button and select your preferred date, time, and instructor. You can also call us directly to book over the phone.",
    },
    {
      question: "What's included in each lesson?",
      answer:
        "Each lesson includes free pickup from your location (home, work, or school), dual-control vehicle use, and personalized instruction tailored to your skill level.",
    },
    {
      question: "Can I cancel or reschedule a lesson?",
      answer:
        "Yes! You can cancel or reschedule up to 24 hours before your lesson for free. Cancellations within 24 hours may incur a fee.",
    },
    {
      question: "How long until I'm ready for my test?",
      answer:
        "This varies by student, but most complete beginners need 20-30 lessons. We'll give you an honest assessment after your first few lessons.",
    },
    {
      question: "Do you offer lessons in multiple languages?",
      answer: school.languages?.length
        ? `Yes, our instructors can teach in: ${school.languages.join(", ")}.`
        : "Yes, many of our instructors speak multiple languages. Contact us to find an instructor who speaks your preferred language.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit/debit cards, iDEAL, and bank transfers. All payments are processed securely through our platform.",
    },
  ];

  return (
    <section>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
        Frequently asked questions
      </h2>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        {faqs.map((faq, idx) => (
          <div key={idx} className={idx > 0 ? "border-t border-gray-100" : ""}>
            <button
              onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900">{faq.question}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  openIndex === idx ? "bg-[#0066cc] text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {openIndex === idx ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </div>
            </button>
            <AnimatePresence>
              {openIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-gray-600 leading-relaxed">{faq.answer}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// BOOKING SIDEBAR
// ============================================================================

function BookingSidebar({ school, stats, onBook, schoolId, packages }) {
  const lowestPackage = packages?.length
    ? [...packages].sort((a, b) => (a.total_price || 0) - (b.total_price || 0))[0]
    : null;

  return (
    <aside className="sticky top-28">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-3xl font-bold text-gray-900">
              {formatEUR(stats.minLessonPrice)}
            </span>
            <span className="text-gray-500 font-medium">/ lesson</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900">{stats.avgRating.toFixed(2)}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">{stats.reviewCount} reviews</span>
          </div>
        </div>

        {/* Quick package option */}
        {lowestPackage && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="text-xs text-gray-500 font-medium mb-2">MOST POPULAR PACKAGE</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{lowestPackage.name}</div>
                <div className="text-sm text-gray-500">
                  {lowestPackage.number_of_lessons} lessons
                </div>
              </div>
              <div className="font-bold text-gray-900">{formatEUR(lowestPackage.total_price)}</div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="p-6">
          <RequireStudentAuth
            schoolId={schoolId}
            schoolName={school?.name}
            action="book"
            onAuthenticated={() => onBook()}
          >
            <button className="w-full py-4 cta-gradient text-white font-semibold rounded-xl transition-all mb-3 shadow-premium-lg active:scale-[0.99]">
              Book a lesson
            </button>
          </RequireStudentAuth>

          <RequireStudentAuth
            schoolId={schoolId}
            schoolName={school?.name}
            action="availability"
            onAuthenticated={() => onBook()}
          >
            <button className="w-full py-3.5 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-colors mb-5 active:scale-[0.99]">
              Check availability
            </button>
          </RequireStudentAuth>

          {/* Trust points */}
          <div className="space-y-3.5">
            {[
              { icon: CheckCircle, text: "Free cancellation up to 24h before" },
              { icon: Users, text: "Choose your preferred instructor" },
              { icon: Shield, text: "Secure payment through Drivee" },
              { icon: Navigation, text: "Free pickup from your location" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <item.icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-gray-600">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0066cc] to-[#4ecdc4] border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-gray-900">{stats.recentBookings}</strong> booked this week
              </span>
            </div>
          </div>

          {/* Contact */}
          {school.phone && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <a
                href={`tel:${school.phone}`}
                className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                <Phone className="w-4 h-4" />
                Questions? Call {school.phone}
              </a>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// MOBILE FLOATING ACTION BUTTON
// ============================================================================

function MobileBookingFAB({ stats, onBook, schoolId, schoolName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet / FAB */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl shadow-elevated border-t border-gray-200 p-6"
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-display text-2xl font-bold text-gray-900">
                    {formatEUR(stats.minLessonPrice)}
                    <span className="text-base font-normal text-gray-500"> / lesson</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900">{stats.avgRating.toFixed(1)}</span>
                    <span>({stats.reviewCount} reviews)</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                {[
                  { icon: CheckCircle, text: "Free cancellation" },
                  { icon: Navigation, text: "Free pickup" },
                  { icon: Shield, text: "Secure payment" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <item.icon className="w-4 h-4 text-emerald-500" />
                    {item.text}
                  </div>
                ))}
              </div>

              <RequireStudentAuth
                schoolId={schoolId}
                schoolName={schoolName}
                action="book"
                onAuthenticated={() => {
                  setExpanded(false);
                  onBook();
                }}
              >
                <button className="w-full py-4 cta-gradient text-white font-semibold rounded-xl transition-all shadow-premium-lg">
                  Book a lesson
                </button>
              </RequireStudentAuth>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                <button
                  onClick={() => setExpanded(true)}
                  className="text-left"
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">
                      {formatEUR(stats.minLessonPrice)}
                    </span>
                    <span className="text-sm text-gray-500">/ lesson</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900">{stats.avgRating.toFixed(1)}</span>
                    <ChevronUp className="w-4 h-4 ml-1" />
                  </div>
                </button>

                <RequireStudentAuth
                  schoolId={schoolId}
                  schoolName={schoolName}
                  action="book"
                  onAuthenticated={() => onBook()}
                >
                  <button className="px-8 py-3.5 cta-gradient text-white font-semibold rounded-xl transition-all shadow-premium-lg active:scale-95">
                    Book
                  </button>
                </RequireStudentAuth>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-card">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 h-16" />

      {/* Hero skeleton */}
      <div className="h-[50vh] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />

      {/* Trust bar */}
      <div className="bg-gray-50 border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Section nav */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="max-w-7xl mx-auto px-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-12">
          <div className="space-y-8">
            {/* Why choose us */}
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="grid sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 h-40 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
              <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64 animate-pulse" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 h-96 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ title, message, onBack }) {
  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-gray-200 p-8 max-w-md text-center shadow-elevated"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 cta-gradient text-white font-semibold rounded-xl transition-all shadow-premium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to schools
        </button>
      </motion.div>
    </div>
  );
}