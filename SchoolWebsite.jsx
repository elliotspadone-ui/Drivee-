import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/common/SEOHead";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Play,
  ChevronDown,
  ChevronUp,
  Users,
  Award,
  Shield,
  Car,
  GraduationCap,
  MessageSquare,
  Send,
  Menu,
  X,
  ExternalLink,
  Heart,
  ThumbsUp,
  Zap,
  Target,
  BookOpen,
  Headphones,
  Globe,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO } from "date-fns";

const getThemeStyles = (theme, primaryColor, secondaryColor) => {
  const themes = {
    modern: {
      navBg: "bg-white/95 backdrop-blur-lg border-b border-zinc-200",
      navText: "text-zinc-900",
      heroGradient: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)`,
      buttonClass: "rounded-full shadow-lg hover:shadow-xl",
      cardClass: "rounded-2xl shadow-sm hover:shadow-lg border border-zinc-100",
      sectionPadding: "py-20 lg:py-24",
      headingFont: "font-bold",
      bodyFont: "font-normal",
      accentColor: primaryColor,
    },
    elegant: {
      navBg: "bg-white border-b border-zinc-200",
      navText: "text-zinc-900",
      heroGradient: "linear-gradient(to bottom, #faf9f7, #ffffff)",
      buttonClass: "rounded-none shadow-md hover:shadow-lg",
      cardClass: "rounded-none shadow-md hover:shadow-lg border border-zinc-200",
      sectionPadding: "py-24 lg:py-32",
      headingFont: "font-serif font-semibold",
      bodyFont: "font-serif",
      accentColor: "#d97706",
    },
    bold: {
      navBg: "bg-zinc-900 border-b-4",
      navText: "text-white",
      heroGradient: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
      buttonClass: "rounded-lg shadow-2xl hover:shadow-3xl transform hover:scale-105",
      cardClass: "rounded-xl shadow-2xl hover:shadow-3xl border-4 border-zinc-800",
      sectionPadding: "py-28 lg:py-36",
      headingFont: "font-black uppercase tracking-tight",
      bodyFont: "font-bold",
      accentColor: primaryColor,
    },
    minimal: {
      navBg: "bg-white border-b border-zinc-100",
      navText: "text-zinc-900",
      heroGradient: "linear-gradient(to bottom, #ffffff, #fafafa)",
      buttonClass: "rounded-md shadow-sm hover:shadow-md",
      cardClass: "rounded-lg shadow-sm hover:shadow-md border border-zinc-100",
      sectionPadding: "py-16 lg:py-20",
      headingFont: "font-light tracking-wide",
      bodyFont: "font-light",
      accentColor: primaryColor,
    },
    professional: {
      navBg: "bg-zinc-50 border-b border-zinc-200",
      navText: "text-zinc-800",
      heroGradient: `linear-gradient(180deg, ${primaryColor}08, transparent)`,
      buttonClass: "rounded-lg shadow-md hover:shadow-lg",
      cardClass: "rounded-xl shadow-md hover:shadow-lg border border-zinc-200",
      sectionPadding: "py-20 lg:py-28",
      headingFont: "font-semibold",
      bodyFont: "font-normal",
      accentColor: primaryColor,
    },
    vibrant: {
      navBg: "bg-white/90 backdrop-blur-xl border-b border-zinc-200",
      navText: "text-zinc-900",
      heroGradient: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20, #fef3c720)`,
      buttonClass: "rounded-2xl shadow-lg hover:shadow-xl",
      cardClass: "rounded-3xl shadow-lg hover:shadow-xl border border-zinc-100",
      sectionPadding: "py-20 lg:py-28",
      headingFont: "font-extrabold",
      bodyFont: "font-medium",
      accentColor: primaryColor,
    },
  };

  return themes[theme] || themes.modern;
};

const NavigationBar = React.memo(({ school, website, styles, theme, primaryColor, secondaryColor }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#about", label: "About" },
    { href: "#services", label: "Services" },
    { href: "#instructors", label: "Instructors" },
    { href: "#testimonials", label: "Reviews" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${styles.navBg} ${
        isScrolled ? "shadow-md" : ""
      }`}
      style={theme === "bold" ? { borderColor: primaryColor } : {}}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center gap-3">
            {website.logo_url ? (
              <img
                src={website.logo_url}
                alt={school.name}
                className={`h-10 lg:h-12 w-auto ${theme === "elegant" ? "filter grayscale" : ""}`}
              />
            ) : (
              <div
                className={`h-10 w-10 lg:h-12 lg:w-12 ${
                  theme === "elegant"
                    ? "bg-amber-600"
                    : theme === "bold"
                    ? "bg-white"
                    : "rounded-xl"
                } flex items-center justify-center`}
                style={
                  theme !== "elegant" && theme !== "bold"
                    ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
                    : {}
                }
              >
                <Car
                  className={`w-5 h-5 lg:w-6 lg:h-6 ${
                    theme === "bold" ? "text-zinc-900" : "text-white"
                  }`}
                />
              </div>
            )}
            <span className={`text-lg lg:text-xl ${styles.headingFont} ${styles.navText}`}>
              {school.name}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`${styles.navText} hover:opacity-70 ${styles.bodyFont} transition-all text-sm`}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#booking"
              className={`px-6 py-2.5 ${styles.buttonClass} text-white ${styles.bodyFont} text-sm transition-all`}
              style={
                theme === "elegant"
                  ? { backgroundColor: "#d97706" }
                  : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
              }
            >
              Book Now
            </a>
          </div>

          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className={`w-6 h-6 ${styles.navText}`} />
            ) : (
              <Menu className={`w-6 h-6 ${styles.navText}`} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-zinc-200"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-zinc-700 hover:text-zinc-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#booking"
                className={`block w-full py-3 px-4 ${styles.buttonClass} text-white text-center ${styles.bodyFont}`}
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Book Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
});

NavigationBar.displayName = "NavigationBar";

const HeroSection = React.memo(({ section, school, styles, theme, primaryColor, secondaryColor }) => (
  <section
    className={`pt-24 lg:pt-32 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden min-h-[80vh] flex items-center`}
    style={{ background: styles.heroGradient }}
  >
    {section.image_url && theme !== "bold" && (
      <div className="absolute inset-0 z-0">
        <img
          src={section.image_url}
          alt="Hero"
          className={`w-full h-full object-cover ${
            theme === "elegant" ? "opacity-10" : "opacity-20"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-white" />
      </div>
    )}

    <div className="max-w-7xl mx-auto relative z-10 w-full">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    theme === "elegant"
                      ? "text-amber-500 fill-amber-500"
                      : theme === "bold"
                      ? "text-yellow-300 fill-yellow-300"
                      : "text-yellow-400 fill-yellow-400"
                  }`}
                />
              ))}
            </div>
            <span className={`${theme === "bold" ? "text-white text-lg" : "text-zinc-600"} ${styles.bodyFont}`}>
              {school.rating?.toFixed(1) || "5.0"} ({school.total_reviews || 0} reviews)
            </span>
          </div>

          <h1
            className={`${
              theme === "bold"
                ? "text-5xl lg:text-7xl text-white"
                : theme === "elegant"
                ? "text-5xl lg:text-6xl text-zinc-900"
                : "text-4xl lg:text-6xl text-zinc-900"
            } ${styles.headingFont} mb-6 leading-tight`}
          >
            {section.title || `Learn to Drive with ${school.name}`}
          </h1>

          <p
            className={`${
              theme === "bold" ? "text-xl text-white/90" : "text-lg lg:text-xl text-zinc-600"
            } ${styles.bodyFont} mb-8 max-w-xl`}
          >
            {section.content || school.description || "Professional driving instruction to help you pass your test with confidence."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={section.cta_url || "#booking"}
              className={`px-8 py-4 ${styles.buttonClass} text-white ${styles.bodyFont} text-lg transition-all inline-flex items-center justify-center gap-2`}
              style={
                theme === "elegant"
                  ? { backgroundColor: "#d97706" }
                  : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
              }
            >
              {section.cta_text || "Book Your Lesson"}
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#about"
              className={`px-8 py-4 ${
                theme === "bold"
                  ? "bg-white text-zinc-900 border-4 border-white"
                  : "bg-white border-2 border-zinc-200 text-zinc-900"
              } ${styles.buttonClass} text-lg transition-all inline-flex items-center justify-center hover:bg-zinc-50`}
            >
              Learn More
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { icon: Users, label: "Expert Instructors", value: "Certified" },
              { icon: Award, label: "Pass Rate", value: "95%+" },
              { icon: Shield, label: "Dual Controls", value: "All Cars" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={`text-center p-4 ${theme === "bold" ? "bg-white/10 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"} rounded-xl`}
              >
                <stat.icon
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: theme === "bold" ? "#fff" : primaryColor }}
                />
                <p className={`text-lg font-bold ${theme === "bold" ? "text-white" : "text-zinc-900"}`}>
                  {stat.value}
                </p>
                <p className={`text-xs ${theme === "bold" ? "text-white/70" : "text-zinc-500"}`}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {section.image_url && theme !== "bold" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className={`relative ${styles.cardClass} overflow-hidden`}>
              <img
                src={section.image_url}
                alt="Driving School"
                className="w-full h-[500px] object-cover"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  </section>
));

HeroSection.displayName = "HeroSection";

const AboutSection = React.memo(({ section, school, styles, theme, primaryColor, instructorsCount }) => (
  <section
    id="about"
    className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8 ${
      theme === "bold" ? "bg-zinc-900 text-white" : "bg-zinc-50"
    }`}
  >
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span
            className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-4 ${
              theme === "bold" ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600"
            }`}
            style={theme !== "bold" ? { backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
          >
            About Us
          </span>

          <h2
            className={`${
              theme === "bold" ? "text-4xl lg:text-5xl text-white" : "text-3xl lg:text-4xl text-zinc-900"
            } ${styles.headingFont} mb-6`}
          >
            {section.title || "Why Choose Us"}
          </h2>

          <p
            className={`text-lg ${theme === "bold" ? "text-zinc-300" : "text-zinc-600"} ${
              styles.bodyFont
            } mb-8 whitespace-pre-line`}
          >
            {section.content ||
              "We're dedicated to helping you become a safe, confident driver. Our experienced instructors use modern teaching methods to ensure you pass your test first time."}
          </p>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: `${instructorsCount}+`, label: "Instructors" },
              { value: `${school.total_reviews || 500}+`, label: "Happy Students" },
              { value: "95%", label: "Pass Rate" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className={`text-center p-4 ${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${styles.cardClass}`}
              >
                <p
                  className={`text-2xl lg:text-3xl ${styles.headingFont}`}
                  style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                >
                  {stat.value}
                </p>
                <p className={`text-sm ${theme === "bold" ? "text-zinc-400" : "text-zinc-500"}`}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {section.image_url && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`relative h-[400px] lg:h-[500px] ${styles.cardClass} overflow-hidden`}
          >
            <img src={section.image_url} alt="About" className="w-full h-full object-cover" />
          </motion.div>
        )}
      </div>
    </div>
  </section>
));

AboutSection.displayName = "AboutSection";

const PackagesSection = React.memo(({ section, packages, styles, theme, primaryColor, secondaryColor }) => (
  <section id="services" className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8`}>
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span
          className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
        >
          Packages
        </span>
        <h2 className={`text-3xl lg:text-4xl ${styles.headingFont} text-zinc-900 mb-4`}>
          {section.title || "Our Lesson Packages"}
        </h2>
        {section.subtitle && (
          <p className={`text-lg text-zinc-600 ${styles.bodyFont} max-w-2xl mx-auto`}>
            {section.subtitle}
          </p>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`${
              theme === "bold" ? "bg-zinc-900 text-white border-zinc-800" : "bg-white"
            } ${styles.cardClass} p-8 transition-all relative ${
              pkg.is_popular ? "ring-2 ring-offset-2" : ""
            }`}
            style={pkg.is_popular ? { ringColor: primaryColor } : {}}
          >
            {pkg.is_popular && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-semibold"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                Most Popular
              </span>
            )}

            <div className="text-center mb-6">
              <h3
                className={`text-xl lg:text-2xl ${styles.headingFont} ${
                  theme === "bold" ? "text-white" : "text-zinc-900"
                } mb-2`}
              >
                {pkg.name}
              </h3>
              {pkg.description && (
                <p className={`${theme === "bold" ? "text-zinc-400" : "text-zinc-500"} text-sm`}>
                  {pkg.description}
                </p>
              )}
              <div className="mt-4">
                <span
                  className={`text-4xl ${styles.headingFont}`}
                  style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                >
                  €{pkg.total_price}
                </span>
                {pkg.discount_percentage && pkg.discount_percentage > 0 && (
                  <span
                    className={`ml-2 inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      theme === "bold" ? "bg-white text-zinc-900" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Save {pkg.discount_percentage}%
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <CheckCircle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                />
                <span className={theme === "bold" ? "text-zinc-300" : "text-zinc-600"}>
                  {pkg.number_of_lessons} Lessons
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                />
                <span className={theme === "bold" ? "text-zinc-300" : "text-zinc-600"}>
                  {pkg.duration_per_lesson} min per lesson
                </span>
              </li>
              {pkg.category && (
                <li className="flex items-center gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                  />
                  <span className={theme === "bold" ? "text-zinc-300" : "text-zinc-600"}>
                    Category {pkg.category} License
                  </span>
                </li>
              )}
              {pkg.includes_theory && (
                <li className="flex items-center gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                  />
                  <span className={theme === "bold" ? "text-zinc-300" : "text-zinc-600"}>
                    Theory Course Included
                  </span>
                </li>
              )}
              {pkg.includes_exam_car && (
                <li className="flex items-center gap-3">
                  <CheckCircle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: theme === "elegant" ? "#d97706" : primaryColor }}
                  />
                  <span className={theme === "bold" ? "text-zinc-300" : "text-zinc-600"}>
                    Exam Car Included
                  </span>
                </li>
              )}
            </ul>

            <a
              href="#booking"
              className={`block w-full py-3 ${styles.buttonClass} text-white text-center ${styles.bodyFont} transition-all`}
              style={
                theme === "elegant"
                  ? { backgroundColor: "#d97706" }
                  : theme === "bold"
                  ? { backgroundColor: "#fff", color: "#000" }
                  : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
              }
            >
              Select Package
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));

PackagesSection.displayName = "PackagesSection";

const InstructorsSection = React.memo(({ section, instructors, styles, theme, primaryColor, secondaryColor }) => (
  <section
    id="instructors"
    className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8 ${
      theme === "bold" ? "bg-zinc-900 text-white" : "bg-zinc-50"
    }`}
  >
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span
          className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-4 ${
            theme === "bold" ? "bg-white/10 text-white" : ""
          }`}
          style={theme !== "bold" ? { backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
        >
          Our Team
        </span>
        <h2
          className={`text-3xl lg:text-4xl ${styles.headingFont} ${
            theme === "bold" ? "text-white" : "text-zinc-900"
          } mb-4`}
        >
          {section.title || "Meet Our Instructors"}
        </h2>
        {section.subtitle && (
          <p
            className={`text-lg ${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} ${
              styles.bodyFont
            } max-w-2xl mx-auto`}
          >
            {section.subtitle}
          </p>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {instructors.map((instructor, index) => (
          <motion.div
            key={instructor.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
              styles.cardClass
            } p-6 text-center transition-all`}
          >
            <div
              className={`w-20 h-20 mx-auto mb-4 ${
                theme === "elegant" ? "border-4 border-amber-600" : "rounded-full"
              } overflow-hidden`}
              style={
                theme !== "elegant"
                  ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
                  : {}
              }
            >
              {instructor.photo_url ? (
                <img
                  src={instructor.photo_url}
                  alt={instructor.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {instructor.full_name.charAt(0)}
                </div>
              )}
            </div>
            <h3
              className={`text-lg ${styles.headingFont} ${
                theme === "bold" ? "text-white" : "text-zinc-900"
              } mb-1`}
            >
              {instructor.full_name}
            </h3>
            <p className={`text-sm ${theme === "bold" ? "text-zinc-500" : "text-zinc-500"} mb-3`}>
              {instructor.years_experience} years experience
            </p>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    theme === "elegant"
                      ? "text-amber-500 fill-amber-500"
                      : "text-yellow-400 fill-yellow-400"
                  }`}
                />
              ))}
              <span className={`text-sm ${theme === "bold" ? "text-zinc-500" : "text-zinc-500"} ml-1`}>
                {instructor.rating?.toFixed(1) || "5.0"}
              </span>
            </div>
            {instructor.specializations && instructor.specializations.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {instructor.specializations.slice(0, 2).map((spec) => (
                  <span
                    key={spec}
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      theme === "bold" ? "bg-zinc-700 text-zinc-300" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));

InstructorsSection.displayName = "InstructorsSection";

const TestimonialsSection = React.memo(({ section, reviews, styles, theme, primaryColor }) => (
  <section id="testimonials" className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8`}>
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span
          className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-4"
          style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
        >
          Testimonials
        </span>
        <h2 className={`text-3xl lg:text-4xl ${styles.headingFont} text-zinc-900 mb-4`}>
          {section.title || "What Our Students Say"}
        </h2>
        {section.subtitle && (
          <p className={`text-lg text-zinc-600 ${styles.bodyFont} max-w-2xl mx-auto`}>
            {section.subtitle}
          </p>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.slice(0, 6).map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`${theme === "bold" ? "bg-zinc-900 text-white border-zinc-800" : "bg-white"} ${
              styles.cardClass
            } p-6`}
          >
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < review.rating
                      ? theme === "elegant"
                        ? "text-amber-500 fill-amber-500"
                        : "text-yellow-400 fill-yellow-400"
                      : "text-zinc-300"
                  }`}
                />
              ))}
            </div>
            <p
              className={`${theme === "bold" ? "text-zinc-300" : "text-zinc-600"} ${styles.bodyFont} mb-4 ${
                theme === "elegant" ? "italic" : ""
              }`}
            >
              "{review.comment}"
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
              >
                {review.student_name?.charAt(0) || "S"}
              </div>
              <div>
                <p className={`font-medium ${theme === "bold" ? "text-white" : "text-zinc-900"}`}>
                  {review.student_name || "Student"}
                </p>
                <p className={`text-xs ${theme === "bold" ? "text-zinc-500" : "text-zinc-400"}`}>
                  {format(parseISO(review.created_date), "MMM yyyy")}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));

TestimonialsSection.displayName = "TestimonialsSection";

const FAQSection = React.memo(({ section, faqs, styles, theme, primaryColor }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <section
      className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8 ${
        theme === "bold" ? "bg-zinc-900" : ""
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span
            className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-4 ${
              theme === "bold" ? "bg-white/10 text-white" : ""
            }`}
            style={theme !== "bold" ? { backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
          >
            FAQ
          </span>
          <h2
            className={`text-3xl lg:text-4xl ${styles.headingFont} ${
              theme === "bold" ? "text-white" : "text-zinc-900"
            } mb-4`}
          >
            {section.title || "Frequently Asked Questions"}
          </h2>
          {section.subtitle && (
            <p
              className={`text-lg ${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} ${styles.bodyFont}`}
            >
              {section.subtitle}
            </p>
          )}
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className={`${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
                styles.cardClass
              } overflow-hidden`}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className={`w-full p-5 text-left flex items-center justify-between ${
                  theme === "bold" ? "hover:bg-zinc-700" : "hover:bg-zinc-50"
                } transition-all`}
              >
                <span
                  className={`${styles.bodyFont} ${theme === "bold" ? "text-white" : "text-zinc-900"} font-medium`}
                >
                  {faq.question}
                </span>
                {expandedFaq === index ? (
                  <ChevronUp className={`w-5 h-5 ${theme === "bold" ? "text-zinc-400" : "text-zinc-500"}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${theme === "bold" ? "text-zinc-400" : "text-zinc-500"}`} />
                )}
              </button>
              <AnimatePresence>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <p className={`${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} ${styles.bodyFont}`}>
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

FAQSection.displayName = "FAQSection";

const BookingCTA = React.memo(({ styles, theme, primaryColor, secondaryColor }) => (
  <section
    id="booking"
    className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8`}
    style={{
      background:
        theme === "bold"
          ? "#000"
          : theme === "elegant"
          ? "#faf9f7"
          : `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)`,
    }}
  >
    <div className="max-w-4xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h2
          className={`text-3xl lg:text-4xl ${styles.headingFont} ${
            theme === "bold" ? "text-white" : "text-zinc-900"
          } mb-6`}
        >
          Ready to Start Your Driving Journey?
        </h2>
        <p
          className={`text-lg ${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} ${styles.bodyFont} mb-8`}
        >
          Book your first lesson today and take the first step towards your license
        </p>
        <Link
          to={createPageUrl("BookLesson")}
          className={`inline-flex items-center gap-3 px-10 py-5 ${styles.buttonClass} text-white ${styles.bodyFont} text-lg transition-all`}
          style={
            theme === "elegant"
              ? { backgroundColor: "#d97706" }
              : theme === "bold"
              ? { backgroundColor: "#fff", color: "#000" }
              : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
          }
        >
          <Calendar className="w-6 h-6" />
          Book Your Lesson
          <ArrowRight className="w-6 h-6" />
        </Link>
      </motion.div>
    </div>
  </section>
));

BookingCTA.displayName = "BookingCTA";

const ContactSection = React.memo(({ section, school, website, styles, theme, primaryColor }) => (
  <section
    id="contact"
    className={`${styles.sectionPadding} px-4 sm:px-6 lg:px-8 ${
      theme === "bold" ? "bg-zinc-900 text-white" : "bg-zinc-50"
    }`}
  >
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <span
            className={`inline-block px-4 py-1 rounded-full text-sm font-medium mb-4 ${
              theme === "bold" ? "bg-white/10 text-white" : ""
            }`}
            style={theme !== "bold" ? { backgroundColor: `${primaryColor}10`, color: primaryColor } : {}}
          >
            Contact
          </span>

          <h2
            className={`text-3xl lg:text-4xl ${styles.headingFont} ${
              theme === "bold" ? "text-white" : "text-zinc-900"
            } mb-6`}
          >
            {section.title || "Get In Touch"}
          </h2>

          <p
            className={`text-lg ${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} ${styles.bodyFont} mb-8`}
          >
            {section.content || "Have questions? We're here to help you start your driving journey."}
          </p>

          <div className="space-y-4">
            {school.address && (
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${
                    theme === "elegant" ? "bg-amber-100" : theme === "bold" ? "bg-zinc-800" : "bg-white"
                  } ${styles.cardClass} flex items-center justify-center flex-shrink-0`}
                >
                  <MapPin className="w-5 h-5" style={{ color: theme === "elegant" ? "#d97706" : primaryColor }} />
                </div>
                <div>
                  <p className={`font-medium ${theme === "bold" ? "text-white" : "text-zinc-900"}`}>Address</p>
                  <p className={theme === "bold" ? "text-zinc-400" : "text-zinc-600"}>
                    {school.address}
                    {school.city && `, ${school.city}`}
                  </p>
                </div>
              </div>
            )}

            {school.phone && (
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${
                    theme === "elegant" ? "bg-amber-100" : theme === "bold" ? "bg-zinc-800" : "bg-white"
                  } ${styles.cardClass} flex items-center justify-center flex-shrink-0`}
                >
                  <Phone className="w-5 h-5" style={{ color: theme === "elegant" ? "#d97706" : primaryColor }} />
                </div>
                <div>
                  <p className={`font-medium ${theme === "bold" ? "text-white" : "text-zinc-900"}`}>Phone</p>
                  <a
                    href={`tel:${school.phone}`}
                    className={`${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} hover:underline`}
                  >
                    {school.phone}
                  </a>
                </div>
              </div>
            )}

            {school.email && (
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 ${
                    theme === "elegant" ? "bg-amber-100" : theme === "bold" ? "bg-zinc-800" : "bg-white"
                  } ${styles.cardClass} flex items-center justify-center flex-shrink-0`}
                >
                  <Mail className="w-5 h-5" style={{ color: theme === "elegant" ? "#d97706" : primaryColor }} />
                </div>
                <div>
                  <p className={`font-medium ${theme === "bold" ? "text-white" : "text-zinc-900"}`}>Email</p>
                  <a
                    href={`mailto:${school.email}`}
                    className={`${theme === "bold" ? "text-zinc-400" : "text-zinc-600"} hover:underline`}
                  >
                    {school.email}
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-8">
            {website.social_facebook && (
              <a
                href={website.social_facebook}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-10 h-10 ${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
                  styles.cardClass
                } flex items-center justify-center transition-all hover:scale-110`}
              >
                <Facebook className="w-5 h-5" style={{ color: primaryColor }} />
              </a>
            )}
            {website.social_instagram && (
              <a
                href={website.social_instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-10 h-10 ${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
                  styles.cardClass
                } flex items-center justify-center transition-all hover:scale-110`}
              >
                <Instagram className="w-5 h-5" style={{ color: primaryColor }} />
              </a>
            )}
            {website.social_twitter && (
              <a
                href={website.social_twitter}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-10 h-10 ${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
                  styles.cardClass
                } flex items-center justify-center transition-all hover:scale-110`}
              >
                <Twitter className="w-5 h-5" style={{ color: primaryColor }} />
              </a>
            )}
            {website.social_youtube && (
              <a
                href={website.social_youtube}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-10 h-10 ${theme === "bold" ? "bg-zinc-800" : "bg-white"} ${
                  styles.cardClass
                } flex items-center justify-center transition-all hover:scale-110`}
              >
                <Youtube className="w-5 h-5" style={{ color: primaryColor }} />
              </a>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className={`h-[400px] lg:h-[500px] ${styles.cardClass} overflow-hidden`}>
            {school.latitude && school.longitude ? (
              <iframe
                src={`https://www.google.com/maps?q=${school.latitude},${school.longitude}&output=embed`}
                className="w-full h-full"
                loading="lazy"
                title="Location Map"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center ${
                  theme === "bold" ? "bg-zinc-800" : "bg-zinc-100"
                }`}
              >
                <div className="text-center">
                  <MapPin className={`w-12 h-12 mx-auto mb-4 ${theme === "bold" ? "text-zinc-600" : "text-zinc-300"}`} />
                  <p className={theme === "bold" ? "text-zinc-500" : "text-zinc-400"}>Map not available</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
));

ContactSection.displayName = "ContactSection";

const Footer = React.memo(({ school, styles, theme, primaryColor }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      className={`${theme === "bold" ? "bg-black border-t-4" : "bg-zinc-900"} text-white py-12 px-4 sm:px-6 lg:px-8`}
      style={theme === "bold" ? { borderColor: primaryColor } : {}}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <h3 className={`text-xl ${styles.headingFont} mb-4`}>{school.name}</h3>
            <p className="text-zinc-400 mb-4 max-w-md">
              Professional driving instruction to help you become a safe, confident driver.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-zinc-400 hover:text-white transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#services" className="text-zinc-400 hover:text-white transition">
                  Services
                </a>
              </li>
              <li>
                <a href="#instructors" className="text-zinc-400 hover:text-white transition">
                  Instructors
                </a>
              </li>
              <li>
                <a href="#contact" className="text-zinc-400 hover:text-white transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-zinc-400">
              {school.phone && <li>{school.phone}</li>}
              {school.email && <li>{school.email}</li>}
              {school.city && <li>{school.city}</li>}
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 text-center">
          <p className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} {school.name}. All rights reserved.
          </p>
          <p className="text-zinc-600 text-xs mt-2">Powered by DrivePro Platform</p>
        </div>
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white text-zinc-900 shadow-lg flex items-center justify-center hover:scale-110 transition z-50"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowUp className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
});

Footer.displayName = "Footer";

export default function SchoolWebsite() {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("school");

  const { data: school, isLoading: loadingSchool } = useQuery({
    queryKey: ["school", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const schools = await base44.entities.School.filter({ id: schoolId, is_active: true }, "-created_date", 1);
      return schools[0] || null;
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const { data: website, isLoading: loadingWebsite } = useQuery({
    queryKey: ["website", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const sites = await base44.entities.Website.filter({ school_id: schoolId }, "-created_date", 1);
      return sites[0] || null;
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["websiteSections", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await base44.entities.WebsiteSection.filter(
        { school_id: schoolId, is_visible: true },
        "order_index",
        20
      );
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ["schoolInstructors", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await base44.entities.Instructor.filter({ school_id: schoolId, is_active: true }, "-rating", 20);
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["schoolPackages", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await base44.entities.Package.filter({ school_id: schoolId, is_active: true }, "-created_date", 20);
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["schoolReviews", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      return await base44.entities.Review.filter({ school_id: schoolId, is_visible: true }, "-created_date", 50);
    },
    enabled: !!schoolId,
    staleTime: 600000,
  });

  const getSection = useCallback(
    (type) => sections.find((s) => s.section_type === type),
    [sections]
  );

  const heroSection = getSection("hero");
  const aboutSection = getSection("about");
  const servicesSection = getSection("services");
  const instructorsSection = getSection("instructors");
  const testimonialsSection = getSection("testimonials");
  const contactSection = getSection("contact");
  const faqSection = getSection("faq");

  const faqs = useMemo(
    () => (faqSection?.custom_data?.faqs) || [],
    [faqSection]
  );

  const isLoading = loadingSchool || loadingWebsite;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600">Loading website...</p>
        </div>
      </div>
    );
  }

  if (!school || !website) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-zinc-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Website Not Found</h1>
          <p className="text-zinc-600 mb-6">
            The driving school website you're looking for doesn't exist or hasn't been published yet.
          </p>
          <Link
            to={createPageUrl("Landing")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Go to Homepage
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const theme = website.theme || "modern";
  const primaryColor = website.primary_color || "#4f46e5";
  const secondaryColor = website.secondary_color || "#7c3aed";
  const styles = getThemeStyles(theme, primaryColor, secondaryColor);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`${school.name} - Driving School | DRIVEE`}
        description={school.description || `Professional driving lessons with ${school.name}. Book your lessons online and learn from certified instructors.`}
        keywords={`${school.name}, driving school, driving lessons, ${school.city || ''}, learn to drive`}
        canonical={window.location.href}
      />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        
        :root {
          --primary: ${primaryColor};
          --secondary: ${secondaryColor};
        }
        
        ${
          theme === "elegant"
            ? `
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Playfair Display', serif;
          }
        `
            : ""
        }
        
        ${website.custom_css || ""}
      `}</style>

      <NavigationBar
        school={school}
        website={website}
        styles={styles}
        theme={theme}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {heroSection && (
        <HeroSection
          section={heroSection}
          school={school}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {aboutSection && (
        <AboutSection
          section={aboutSection}
          school={school}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
          instructorsCount={instructors.length}
        />
      )}

      {servicesSection && packages.length > 0 && (
        <PackagesSection
          section={servicesSection}
          packages={packages}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {instructorsSection && instructors.length > 0 && (
        <InstructorsSection
          section={instructorsSection}
          instructors={instructors}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {testimonialsSection && reviews.length > 0 && (
        <TestimonialsSection
          section={testimonialsSection}
          reviews={reviews}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
        />
      )}

      {faqSection && faqs.length > 0 && (
        <FAQSection
          section={faqSection}
          faqs={faqs}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
        />
      )}

      <BookingCTA
        styles={styles}
        theme={theme}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      {contactSection && (
        <ContactSection
          section={contactSection}
          school={school}
          website={website}
          styles={styles}
          theme={theme}
          primaryColor={primaryColor}
        />
      )}

      <Footer school={school} styles={styles} theme={theme} primaryColor={primaryColor} />
    </div>
  );
}