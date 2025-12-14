import React, { useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  Clock,
  Bell,
  FileText,
  Users,
  UserCheck,
  TrendingUp,
  Car,
  Building2,
  ShoppingCart,
  Globe,
  Megaphone,
  CreditCard,
  DollarSign,
  ClipboardCheck,
  BookOpen,
  Gauge,
  MessageSquare,
  FolderOpen,
  Gift,
  Smartphone,
  Mail,
  Tag,
  BarChart3,
  Package,
  FileSignature,
  MapPin,
  CheckCircle,
  AlertCircle,
  Repeat,
  History,
  Zap,
  TrendingDown,
  Settings,
  Target,
  Award,
  Phone,
  Play,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Shield,
  Headphones,
  Lock,
  Rocket,
  Sparkles,
  Check,
  X,
  Info,
  ExternalLink,
  Download,
  Video,
  Layers,
  Cpu,
  Cloud,
  Database,
  Wifi,
  Monitor,
  Tablet,
  RefreshCw,
  PieChart,
  Activity,
  MousePointer,
  Share2,
  Heart,
  ThumbsUp,
  Crown,
  Gem,
  Flame,
  Trophy,
  Medal,
  Lightbulb,
  Compass,
  Navigation,
  Route,
  Timer,
  Hourglass,
  CalendarDays,
  CalendarCheck,
  UserPlus,
  UserMinus,
  UsersRound,
  GraduationCap,
  School,
  BookMarked,
  FileCheck,
  FilePlus,
  FileSearch,
  Wallet,
  Receipt,
  Banknote,
  CircleDollarSign,
  PiggyBank,
  LineChart,
  AreaChart,
  Percent,
  BadgePercent,
  Ticket,
  QrCode,
  ScanLine,
  Fingerprint,
  Key,
  LockKeyhole,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CircleAlert,
  BadgeCheck,
  BadgeInfo,
  BellRing,
  BellOff,
  MessageCircle,
  MessagesSquare,
  AtSign,
  Send,
  Inbox,
  Archive,
  Trash2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  LayoutGrid,
  LayoutList,
  Maximize2,
  Minimize2,
  Move,
  Grip,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Minus,
  Edit,
  Copy,
  Clipboard,
  ClipboardCopy,
  ClipboardList,
  Image,
  Camera,
  Mic,
  Volume2,
  VolumeX,
  Printer,
  Save,
  Upload,
  Link as LinkIcon,
  Unlink,
  Paperclip,
  Pin,
  PinOff,
  Bookmark,
  BookmarkPlus,
  Flag,
  Hash,
  Asterisk,
  Command,
  Option,
  Power,
  PowerOff,
  ToggleLeft,
  ToggleRight,
  SunMoon,
  Palette,
  Brush,
  Paintbrush,
  Droplet,
  Shapes,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Diamond,
  Gem as GemIcon,
  Sparkle,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SECTIONS = [
  {
    id: "scheduling",
    title: "Smart Scheduling & Booking",
    description: "Streamline your booking process with intelligent automation",
    gradient: "from-indigo-600 to-violet-600",
    categories: [
      {
        title: "Intelligent Calendar Management",
        icon: Calendar,
        description: "AI-powered scheduling that maximizes efficiency",
        features: [
          { icon: Clock, text: "Flexible lesson duration settings", description: "30, 45, 60, 90, or 120 minute sessions" },
          { icon: Bell, text: "Multi-channel reminders", description: "SMS, email, push, and WhatsApp notifications", badge: "Popular" },
          { icon: Settings, text: "Smart cancellation policies", description: "Automated enforcement and fee collection" },
          { icon: History, text: "Complete audit trail", description: "Track all booking modifications" },
          { icon: Users, text: "Group lesson coordination", description: "Manage theory classes and workshops" },
          { icon: Phone, text: "Caller ID integration", description: "Instant student recognition" },
          { icon: ClipboardCheck, text: "Intelligent waitlists", description: "Auto-fill cancelled slots" },
          { icon: Zap, text: "Conflict detection", description: "Prevent double-bookings automatically", badge: "New" },
        ],
      },
      {
        title: "24/7 Online Booking Portal",
        icon: Globe,
        description: "Let students book anytime, anywhere",
        features: [
          { icon: Calendar, text: "Customizable availability", description: "Set working hours per instructor" },
          { icon: UserCheck, text: "Real-time availability sync", description: "Instant updates across all channels" },
          { icon: Repeat, text: "Self-service rescheduling", description: "Students manage their own bookings" },
          { icon: Bell, text: "Automated confirmations", description: "Instant booking notifications" },
          { icon: BookOpen, text: "Multi-service booking", description: "Theory, practical, tests, and more" },
          { icon: Globe, text: "Website widget", description: "Embed booking on your site", badge: "Easy Setup" },
          { icon: Smartphone, text: "Mobile-optimized", description: "Perfect on any device" },
          { icon: Lock, text: "Secure payments", description: "PCI-compliant transactions" },
        ],
      },
      {
        title: "Route & Location Planning",
        icon: MapPin,
        description: "Optimize pickup locations and driving routes",
        features: [
          { icon: Navigation, text: "Pickup point management", description: "Save favorite locations per student" },
          { icon: Route, text: "Route optimization", description: "Plan efficient lesson routes" },
          { icon: MapPin, text: "Test center mapping", description: "Know all local test routes" },
          { icon: Clock, text: "Travel time estimation", description: "Account for commute between lessons" },
          { icon: Compass, text: "Area coverage zones", description: "Define service boundaries" },
        ],
      },
    ],
  },
  {
    id: "management",
    title: "Complete School Management",
    description: "Everything you need to run your driving school efficiently",
    gradient: "from-violet-600 to-fuchsia-600",
    categories: [
      {
        title: "Student Management",
        icon: Users,
        description: "Comprehensive student lifecycle tracking",
        features: [
          { icon: UserCheck, text: "Rich student profiles", description: "All information in one place" },
          { icon: TrendingUp, text: "Progress visualization", description: "Track theory, simulator, and road progress", badge: "Visual" },
          { icon: Clock, text: "Hours tracking", description: "Monitor required vs completed hours" },
          { icon: Target, text: "Test readiness scoring", description: "AI-powered exam predictions" },
          { icon: FolderOpen, text: "Document management", description: "IDs, medicals, certificates" },
          { icon: FileSignature, text: "Digital signatures", description: "Paperless contract signing" },
          { icon: FileText, text: "Custom forms", description: "Build your own intake forms" },
          { icon: GraduationCap, text: "Achievement badges", description: "Gamify the learning experience", badge: "Engaging" },
        ],
      },
      {
        title: "Instructor Management",
        icon: UserCheck,
        description: "Empower your teaching team",
        features: [
          { icon: Calendar, text: "Shift scheduling", description: "Easy drag-and-drop planning" },
          { icon: Clock, text: "Time tracking", description: "Automated work hours logging" },
          { icon: BarChart3, text: "Performance analytics", description: "Pass rates, reviews, productivity" },
          { icon: Settings, text: "Role-based access", description: "Granular permission controls" },
          { icon: MapPin, text: "Availability mapping", description: "See coverage at a glance" },
          { icon: AlertCircle, text: "Absence management", description: "Handle sick days and holidays" },
          { icon: Award, text: "Instructor ratings", description: "Student feedback system" },
          { icon: Wallet, text: "Commission tracking", description: "Automated pay calculations", badge: "Time-saver" },
        ],
      },
      {
        title: "Financial Dashboard",
        icon: DollarSign,
        description: "Complete financial visibility",
        features: [
          { icon: FileText, text: "Automated reporting", description: "Daily, weekly, monthly summaries" },
          { icon: TrendingUp, text: "Revenue analytics", description: "By instructor, service, time period" },
          { icon: BarChart3, text: "KPI dashboard", description: "Real-time business metrics", badge: "Insights" },
          { icon: Award, text: "Success tracking", description: "Pass rate statistics" },
          { icon: Target, text: "Goal setting", description: "Monthly and yearly targets" },
          { icon: FileText, text: "Invoice automation", description: "Generate and send automatically" },
          { icon: PieChart, text: "Expense tracking", description: "Monitor business costs" },
          { icon: LineChart, text: "Forecasting", description: "Predict future revenue" },
        ],
      },
      {
        title: "Fleet Management",
        icon: Car,
        description: "Keep your vehicles road-ready",
        features: [
          { icon: Calendar, text: "Vehicle scheduling", description: "Assign cars to lessons" },
          { icon: Bell, text: "Maintenance alerts", description: "Never miss a service" },
          { icon: AlertCircle, text: "Insurance tracking", description: "Renewal reminders" },
          { icon: Gauge, text: "Mileage logging", description: "Track vehicle usage" },
          { icon: TrendingDown, text: "Fuel management", description: "Monitor consumption" },
          { icon: UserCheck, text: "Driver assignments", description: "Link vehicles to instructors" },
          { icon: FileText, text: "Inspection checklists", description: "Daily vehicle checks", badge: "Safety" },
          { icon: ClipboardCheck, text: "Incident reporting", description: "Log and track issues" },
        ],
      },
      {
        title: "Multi-Location Support",
        icon: Building2,
        description: "Scale across multiple branches",
        features: [
          { icon: Database, text: "Centralized data", description: "One source of truth" },
          { icon: Package, text: "Inventory sharing", description: "Equipment across locations" },
          { icon: Users, text: "Student portability", description: "Book at any branch" },
          { icon: BarChart3, text: "Consolidated reporting", description: "Compare branch performance" },
          { icon: Gift, text: "Unified marketing", description: "Campaigns across all locations" },
          { icon: Settings, text: "Location-specific settings", description: "Customize per branch" },
        ],
      },
    ],
  },
  {
    id: "revenue",
    title: "Revenue Growth Tools",
    description: "Maximize your earning potential",
    gradient: "from-fuchsia-600 to-rose-600",
    categories: [
      {
        title: "Online Sales Platform",
        icon: ShoppingCart,
        description: "Sell lessons and packages 24/7",
        features: [
          { icon: Gift, text: "Digital gift cards", description: "Perfect for holidays and birthdays", badge: "Revenue+" },
          { icon: Package, text: "Package builder", description: "Create custom lesson bundles" },
          { icon: Repeat, text: "Subscription plans", description: "Recurring revenue streams" },
          { icon: ShoppingCart, text: "E-commerce store", description: "Sell learning materials" },
          { icon: Globe, text: "Platform integrations", description: "Shopify, WooCommerce, more" },
          { icon: Percent, text: "Discount codes", description: "Create promotions easily" },
          { icon: Timer, text: "Flash sales", description: "Time-limited offers" },
          { icon: CreditCard, text: "Multiple payment methods", description: "Cards, PayPal, Apple Pay" },
        ],
      },
      {
        title: "Digital Presence",
        icon: TrendingUp,
        description: "Get found by more students",
        features: [
          { icon: Globe, text: "SEO-optimized website", description: "Rank higher on Google", badge: "Essential" },
          { icon: CheckCircle, text: "Google integration", description: "Reserve with Google button" },
          { icon: MapPin, text: "Local SEO", description: "Dominate local search results" },
          { icon: Settings, text: "Website builder", description: "No coding required" },
          { icon: UserCheck, text: "Instructor profiles", description: "Showcase your team" },
          { icon: Star, text: "Review management", description: "Collect and display testimonials" },
          { icon: Share2, text: "Social media links", description: "Connect all platforms" },
        ],
      },
      {
        title: "Marketing Automation",
        icon: Megaphone,
        description: "Grow your student base on autopilot",
        features: [
          { icon: Smartphone, text: "SMS campaigns", description: "High open rates", badge: "Effective" },
          { icon: Mail, text: "Email marketing", description: "Beautiful templates included" },
          { icon: Tag, text: "Promo codes", description: "Track campaign performance" },
          { icon: Gift, text: "Referral program", description: "Turn students into ambassadors" },
          { icon: Users, text: "Student referrals", description: "Reward both parties" },
          { icon: Bell, text: "Re-engagement", description: "Win back inactive students" },
          { icon: Target, text: "Targeted campaigns", description: "Segment your audience" },
          { icon: BarChart3, text: "Campaign analytics", description: "Measure ROI" },
        ],
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & Billing",
    description: "Streamlined financial operations",
    gradient: "from-rose-600 to-orange-600",
    categories: [
      {
        title: "Point of Sale",
        icon: CreditCard,
        description: "Accept payments anywhere",
        features: [
          { icon: CreditCard, text: "Card terminal", description: "Chip, tap, and swipe" },
          { icon: Globe, text: "Online payments", description: "Secure checkout" },
          { icon: Repeat, text: "Refund processing", description: "Easy reversals" },
          { icon: Package, text: "Inventory tracking", description: "For physical products" },
          { icon: Receipt, text: "Digital receipts", description: "Email or SMS" },
          { icon: QrCode, text: "QR code payments", description: "Contactless convenience", badge: "Modern" },
        ],
      },
      {
        title: "Billing Management",
        icon: DollarSign,
        description: "Flexible payment options",
        features: [
          { icon: CheckCircle, text: "Split payments", description: "Pay in installments" },
          { icon: Repeat, text: "Auto-billing", description: "Recurring charges" },
          { icon: Package, text: "Credit system", description: "Prepaid lesson credits" },
          { icon: Settings, text: "Payment rules", description: "Enforce policies" },
          { icon: Gift, text: "Gift card redemption", description: "Easy application" },
          { icon: FileText, text: "Statement generation", description: "For students and tax" },
          { icon: AlertCircle, text: "Payment reminders", description: "Reduce outstanding balances" },
          { icon: Shield, text: "Fraud protection", description: "Secure transactions", badge: "Secure" },
        ],
      },
    ],
  },
  {
    id: "specialized",
    title: "Driving School Essentials",
    description: "Features built specifically for driving instruction",
    gradient: "from-orange-600 to-amber-600",
    categories: [
      {
        title: "Exam Coordination",
        icon: ClipboardCheck,
        description: "Manage the path to licensing",
        features: [
          { icon: Calendar, text: "Test scheduling", description: "Book and track exam dates" },
          { icon: Target, text: "Eligibility tracking", description: "Hours and requirements" },
          { icon: Bell, text: "Deadline alerts", description: "Never miss important dates" },
          { icon: FileText, text: "Test reports", description: "Record outcomes and feedback" },
          { icon: TrendingUp, text: "Pass rate analytics", description: "Track success metrics", badge: "Insights" },
          { icon: Award, text: "Certification tracking", description: "License categories" },
        ],
      },
      {
        title: "Theory Classes",
        icon: BookOpen,
        description: "Organize classroom learning",
        features: [
          { icon: Users, text: "Class management", description: "Schedule group sessions" },
          { icon: CheckCircle, text: "Attendance tracking", description: "Digital sign-in" },
          { icon: Bell, text: "Class reminders", description: "Reduce no-shows" },
          { icon: Video, text: "Online classes", description: "Virtual learning option", badge: "Hybrid" },
          { icon: FileText, text: "Study materials", description: "Share resources" },
          { icon: ClipboardCheck, text: "Quiz integration", description: "Test knowledge" },
        ],
      },
      {
        title: "Simulator Training",
        icon: Gauge,
        description: "Integrate simulation sessions",
        features: [
          { icon: Calendar, text: "Slot booking", description: "Reserve simulator time" },
          { icon: Clock, text: "Session tracking", description: "Log simulator hours" },
          { icon: Zap, text: "Progress sync", description: "Connect to student profile" },
          { icon: BarChart3, text: "Performance data", description: "Analyze simulator results" },
          { icon: Target, text: "Scenario tracking", description: "Mark completed exercises" },
        ],
      },
      {
        title: "Communication Hub",
        icon: MessageSquare,
        description: "Stay connected with students",
        features: [
          { icon: MessageSquare, text: "In-app messaging", description: "Direct instructor chat" },
          { icon: Mail, text: "Automated emails", description: "Welcome sequences" },
          { icon: Smartphone, text: "SMS notifications", description: "Instant updates" },
          { icon: Bell, text: "Push notifications", description: "Mobile app alerts" },
          { icon: MessagesSquare, text: "Broadcast messages", description: "Reach all students" },
          { icon: AtSign, text: "Template library", description: "Pre-built messages", badge: "Time-saver" },
        ],
      },
      {
        title: "Document Center",
        icon: FolderOpen,
        description: "Paperless document management",
        features: [
          { icon: FolderOpen, text: "Cloud storage", description: "Secure file management" },
          { icon: FileSignature, text: "E-signatures", description: "Sign contracts digitally" },
          { icon: FileText, text: "Template builder", description: "Create custom forms" },
          { icon: Shield, text: "Compliance tracking", description: "Meet regulations" },
          { icon: Download, text: "Bulk export", description: "Download all documents" },
          { icon: Search, text: "Smart search", description: "Find files instantly" },
        ],
      },
    ],
  },
];

const TESTIMONIALS = [
  {
    quote: "This software transformed how we run our driving school. Bookings are up 40% and admin time is cut in half.",
    author: "Sarah Mitchell",
    role: "Owner",
    company: "Premier Driving Academy",
    rating: 5,
  },
  {
    quote: "The automated reminders alone have reduced our no-show rate by 70%. The ROI was immediate.",
    author: "Michael Chen",
    role: "Operations Manager",
    company: "City Driving School",
    rating: 5,
  },
  {
    quote: "Finally, a system that understands driving schools. The exam tracking and progress features are exactly what we needed.",
    author: "Emma Rodriguez",
    role: "Lead Instructor",
    company: "Safe Roads Training",
    rating: 5,
  },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: 49,
    period: "month",
    description: "Perfect for solo instructors",
    features: [
      "1 instructor account",
      "Up to 50 active students",
      "Online booking portal",
      "SMS & email reminders",
      "Basic reporting",
      "Mobile app access",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: 99,
    period: "month",
    description: "For growing driving schools",
    features: [
      "Up to 5 instructor accounts",
      "Unlimited students",
      "Advanced scheduling",
      "Payment processing",
      "Marketing tools",
      "Custom branding",
      "Priority support",
    ],
    highlighted: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: 199,
    period: "month",
    description: "For multi-location operations",
    features: [
      "Unlimited instructors",
      "Multi-branch support",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Training & onboarding",
    ],
    cta: "Contact Sales",
  },
];

const FAQS = [
  {
    question: "How long does it take to set up?",
    answer: "Most driving schools are up and running within 24 hours. Our onboarding team will help you import your existing data and configure the system to match your workflow.",
  },
  {
    question: "Can I migrate from my current system?",
    answer: "Yes! We offer free data migration from all major driving school software platforms. Our team handles the entire process to ensure a smooth transition.",
  },
  {
    question: "Is there a mobile app?",
    answer: "Yes, both instructors and students get access to our mobile apps for iOS and Android. Instructors can manage their schedule and students can book lessons on the go.",
  },
  {
    question: "What payment methods do you support?",
    answer: "We support all major credit cards, debit cards, PayPal, Apple Pay, Google Pay, and bank transfers. You can also set up payment plans and accept cash payments.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use bank-level encryption, are GDPR compliant, and undergo regular security audits. Your data is backed up daily and stored in secure data centers.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, there are no long-term contracts. You can cancel your subscription at any time. If you cancel, you'll retain access until the end of your billing period.",
  },
];

const FeatureCard = React.memo(({ feature, gradient, index }) => (
  <motion.li
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.03 }}
    className="flex items-start gap-3 group py-2"
  >
    <div
      className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10 flex items-center justify-center opacity-60 group-hover:opacity-100 transition`}
    >
      <feature.icon className="w-4 h-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-900 group-hover:text-indigo-600 transition">
          {feature.text}
        </span>
        {feature.badge && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
            {feature.badge}
          </span>
        )}
      </div>
      {feature.description && (
        <p className="text-sm text-zinc-500 mt-0.5">{feature.description}</p>
      )}
    </div>
  </motion.li>
));

FeatureCard.displayName = "FeatureCard";

const CategoryCard = React.memo(({ category, gradient, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm hover:shadow-lg transition-all overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-50 transition"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
          >
            <category.icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{category.title}</h3>
            {category.description && (
              <p className="text-sm text-zinc-500">{category.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">
            {category.features.length} features
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="px-6 pb-6 space-y-1">
              {category.features.map((feature, featureIndex) => (
                <FeatureCard
                  key={featureIndex}
                  feature={feature}
                  gradient={gradient}
                  index={featureIndex}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

CategoryCard.displayName = "CategoryCard";

const SectionBlock = React.memo(({ section, index }) => (
  <motion.section
    id={section.id}
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.1 }}
    className="py-16 lg:py-24"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12"
      >
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-white text-xl lg:text-2xl font-bold mb-4 bg-gradient-to-r ${section.gradient} shadow-lg`}
        >
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
            {index + 1}
          </span>
          {section.title}
        </div>
        {section.description && (
          <p className="text-lg text-zinc-600 max-w-2xl">{section.description}</p>
        )}
      </motion.div>

      <div
        className={`grid gap-6 ${
          section.categories.length === 1
            ? "md:grid-cols-1 max-w-2xl"
            : section.categories.length === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {section.categories.map((category, catIndex) => (
          <CategoryCard
            key={catIndex}
            category={category}
            gradient={section.gradient}
            index={catIndex}
          />
        ))}
      </div>
    </div>
  </motion.section>
));

SectionBlock.displayName = "SectionBlock";

const TestimonialCard = React.memo(({ testimonial, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
  >
    <div className="flex items-center gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < testimonial.rating ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"
          }`}
        />
      ))}
    </div>
    <p className="text-zinc-700 mb-6 italic">"{testimonial.quote}"</p>
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
        {testimonial.author.charAt(0)}
      </div>
      <div>
        <p className="font-semibold text-zinc-900">{testimonial.author}</p>
        <p className="text-sm text-zinc-500">
          {testimonial.role}, {testimonial.company}
        </p>
      </div>
    </div>
  </motion.div>
));

TestimonialCard.displayName = "TestimonialCard";

const PricingCard = React.memo(({ tier, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1 }}
    className={`rounded-2xl border p-8 ${
      tier.highlighted
        ? "border-indigo-600 bg-white shadow-xl ring-2 ring-indigo-600 relative"
        : "border-zinc-200 bg-white shadow-sm"
    }`}
  >
    {tier.badge && (
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-full">
        {tier.badge}
      </span>
    )}

    <div className="text-center mb-6">
      <h3 className="text-xl font-bold text-zinc-900 mb-2">{tier.name}</h3>
      <p className="text-sm text-zinc-500 mb-4">{tier.description}</p>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl font-bold text-zinc-900">€{tier.price}</span>
        <span className="text-zinc-500">/{tier.period}</span>
      </div>
    </div>

    <ul className="space-y-3 mb-8">
      {tier.features.map((feature, i) => (
        <li key={i} className="flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span className="text-zinc-700">{feature}</span>
        </li>
      ))}
    </ul>

    <button
      className={`w-full py-3 rounded-xl font-semibold transition ${
        tier.highlighted
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "border-2 border-zinc-200 text-zinc-900 hover:bg-zinc-50"
      }`}
    >
      {tier.cta}
    </button>
  </motion.div>
));

PricingCard.displayName = "PricingCard";

const FAQItem = React.memo(({ faq, isOpen, onToggle, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05 }}
    className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-50 transition"
    >
      <span className="font-medium text-zinc-900 pr-4">{faq.question}</span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-zinc-400 flex-shrink-0" />
      ) : (
        <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
      )}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <p className="px-5 pb-5 text-zinc-600">{faq.answer}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
));

FAQItem.displayName = "FAQItem";

const TableOfContents = React.memo(({ sections, activeSection }) => (
  <nav className="hidden xl:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-zinc-200 shadow-lg p-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
        Jump to
      </p>
      <ul className="space-y-1">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                activeSection === section.id
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                  activeSection === section.id
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {index + 1}
              </span>
              <span className="truncate max-w-[150px]">
                {section.title.replace(/^\d+\.\s*/, "")}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </nav>
));

TableOfContents.displayName = "TableOfContents";

export default function Features() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFaqToggle = useCallback((index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <TableOfContents sections={SECTIONS} activeSection={activeSection} />

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 py-20 lg:py-32">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Complete Driving School Management
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Everything You Need to
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
                Run Your Driving School
              </span>
            </h1>

            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10">
              From scheduling and payments to student tracking and marketing—our all-in-one
              platform helps driving schools save time, grow revenue, and deliver exceptional
              instruction.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={createPageUrl("SchoolLogin")}
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-zinc-100 transition shadow-lg flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#scheduling"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg hover:bg-white/20 transition flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </a>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12">
              {[
                { icon: Shield, text: "14-day free trial" },
                { icon: CreditCard, text: "No credit card required" },
                { icon: Headphones, text: "24/7 support" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/80">
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "2,500+", label: "Driving Schools" },
              { value: "50,000+", label: "Instructors" },
              { value: "1M+", label: "Lessons Booked" },
              { value: "4.9/5", label: "Customer Rating" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <p className="text-3xl lg:text-4xl font-black text-zinc-900">{stat.value}</p>
                <p className="text-zinc-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.map((section, index) => (
        <div
          key={section.id}
          className={index % 2 === 0 ? "bg-zinc-50" : "bg-white"}
        >
          <SectionBlock section={section} index={index} />
        </div>
      ))}

      <section className="py-20 lg:py-28 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-4">
              Trusted by Driving Schools Worldwide
            </h2>
            <p className="text-lg text-zinc-600">
              See what our customers have to say
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <TestimonialCard key={index} testimonial={testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-zinc-600">
              Start free, upgrade when you're ready
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier, index) => (
              <PricingCard key={index} tier={tier} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-zinc-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-zinc-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-zinc-600">
              Everything you need to know
            </p>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                isOpen={openFaqIndex === index}
                onToggle={() => handleFaqToggle(index)}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Driving School?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of driving schools already using our platform to streamline
              operations, grow revenue, and deliver exceptional instruction.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={createPageUrl("SchoolLogin")}
                className="px-10 py-5 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-zinc-100 transition shadow-xl flex items-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                Start Your Free Trial
              </Link>
              <a
                href="mailto:sales@drivepro.app"
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg hover:bg-white/20 transition flex items-center gap-2"
              >
                <Headphones className="w-5 h-5" />
                Talk to Sales
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}